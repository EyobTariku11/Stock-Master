import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import '../../css/AdminUsers.css';

export default function AdminUsers() {
  const navigate = useNavigate();

  // --- 0. AUTHENTICATION & PERMISSIONS CONTEXT ---
  // FIX: Changed localStorage to sessionStorage to isolate tabs
  const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser") || "{}");
  const loggedInUserId = loggedInUser.id;
  
  // Normalize role safely
  const myRole = (loggedInUser.role || "").toLowerCase();
  
  // Define Permissions
  const isSuperAdmin = myRole.includes("super");
  const isAdmin = myRole.includes("admin") && !isSuperAdmin;

  // --- STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState("users");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);

  // Users Tab State
  const [activeUserTab, setActiveUserTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // DATA STATE
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logDateFilter, setLogDateFilter] = useState("");
  
  // --- RESPONSIVE SIDEBAR ---
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 1. FETCH USERS ---
  const fetchUsers = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const response = await fetch('https://localhost:7262/api/auth/users');
      if (!response.ok) throw new Error(`Server error`);
      const data = await response.json();
      const formattedData = data.map(user => ({
        ...user,
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"
      }));
      setUsers(formattedData);
    } catch (error) {
      if (!isBackground) console.error("Error fetching users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- 2. FETCH LOGS ---
  const fetchLogs = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLogsLoading(true);
      let url = 'https://localhost:7262/api/audit';
      if (logDateFilter) {
        url += `?date=${logDateFilter}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLogsLoading(false);
    }
  }, [logDateFilter]); 

  // --- 3. INITIAL LOAD & POLLING ---
  useEffect(() => {
    if (activeView === 'users') {
      if (activeUserTab === 'list') fetchUsers(false);
      if (activeUserTab === 'activity') fetchLogs(false);
    }
    const intervalId = setInterval(() => {
      if (activeView === 'users') {
        if (activeUserTab === 'list') fetchUsers(true);
        if (activeUserTab === 'activity') fetchLogs(true);
      }
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchUsers, fetchLogs, activeView, activeUserTab]);

  // --- ANALYTICS CALCULATIONS ---
  const reportStats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === "Active").length;
    const pending = users.filter(u => u.status === "Pending").length;
    const admins = users.filter(u => u.role === "Admin").length;
    const managers = users.filter(u => u.role === "Manager").length;
    const others = total - admins - managers;
    return { total, active, pending, admins, managers, others };
  }, [users]);

  // Gradient for Pie Chart
  const pieChartGradient = useMemo(() => {
    if (reportStats.total === 0) return 'conic-gradient(#e2e8f0 0% 100%)';
    const adminPct = (reportStats.admins / reportStats.total) * 100;
    const managerPct = (reportStats.managers / reportStats.total) * 100;
    const p1 = adminPct;
    const p2 = adminPct + managerPct;
    return `conic-gradient(var(--primary) 0% ${p1}%, #10b981 ${p1}% ${p2}%, #f59e0b ${p2}% 100%)`;
  }, [reportStats]);

  // --- PERMISSION LOGIC ---

  // 1. VISIBILITY: Who can see whom?
  const visibleUsers = users.filter(user => {
    if (user.id === loggedInUserId) return true; // Always see self
    if (isSuperAdmin) return true; // Super Admin sees all

    if (isAdmin) {
      const tRole = (user.role || "").toLowerCase();
      // Admin CANNOT see Super Admin (Security)
      if (tRole.includes("super")) return false;
      return true; 
    }
    return true; 
  });

  // 2. STATUS PERMISSION: Who can Enable/Disable/Approve?
  const canManageStatus = (targetUser) => {
    if (targetUser.id === loggedInUserId) return false; // Can't disable self

    if (isSuperAdmin) return true; // Super Admin manages all status

    if (isAdmin) {
      const tRole = (targetUser.role || "").toLowerCase();
      // Admin CANNOT manage status of other Admins or Super Admins
      if (tRole.includes("admin") || tRole.includes("super")) {
        return false;
      }
      // Admin CAN manage Manager/Viewer/User
      return true;
    }
    return false;
  };

  // 3. ROLE CHANGE PERMISSION: Who can change roles?
  const canChangeRole = (targetUser) => {
    if (targetUser.id === loggedInUserId) return false;

    // ONLY Super Admin can change roles
    if (isSuperAdmin) return true;

    // Admin CANNOT change roles (as per your request)
    return false; 
  };

  // 4. DELETE PERMISSION
  const canDeleteUser = (targetUser) => {
    if (targetUser.id === loggedInUserId) return false;
    // Only Super Admin can delete
    if (isSuperAdmin) return true;
    return false;
  };

  // --- HANDLERS ---
  const handleRoleChange = async (id, newRole) => {
    const targetUser = users.find(u => u.id === id);
    
    // Strict Permission Check
    if (!canChangeRole(targetUser)) {
        Swal.fire('Access Denied', 'Only System Admin can change roles.', 'error');
        return;
    }

    Swal.fire({
      title: 'Update Role?',
      text: `Change user role to ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Yes, Update'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`https://localhost:7262/api/auth/users/${id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
          });
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Role Updated', showConfirmButton: false, timer: 1500 });
          fetchUsers(true); 
        } catch (error) { Swal.fire('Error', 'Failed', 'error'); }
      }
    });
  };

  const handleApproveUser = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!canManageStatus(targetUser)) return;

    Swal.fire({
      title: 'Approve User?',
      text: "Activate account?",
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Approve'
    }).then((result) => {
      if (result.isConfirmed) updateUserStatus(id, "Active");
    });
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const targetUser = users.find(u => u.id === id);
    
    if (!canManageStatus(targetUser)) {
        Swal.fire('Access Denied', 'You cannot change this user status.', 'error');
        return;
    }

    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    updateUserStatus(id, newStatus);
  };

  const updateUserStatus = async (id, newStatus) => {
    try {
      await fetch(`https://localhost:7262/api/auth/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Status: ${newStatus}`, showConfirmButton: false, timer: 1500 });
      fetchUsers(true);
    } catch (error) { Swal.fire('Error', 'Failed', 'error'); }
  };

  const handleDelete = async (id) => {
    const targetUser = users.find(u => u.id === id);
    
    if (!canDeleteUser(targetUser)) {
        Swal.fire('Access Denied', 'Only System Admin can delete users.', 'error');
        return;
    }

    Swal.fire({
      title: 'Delete User?', text: "Irreversible.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`https://localhost:7262/api/auth/users/${id}`, { method: 'DELETE' });
          Swal.fire('Deleted!', 'User removed.', 'success');
          fetchUsers(true);
        } catch (error) { Swal.fire('Error', 'Failed', 'error'); }
      }
    });
  };

  const handleLogout = () => {
    // FIX: Changed localStorage to sessionStorage
    sessionStorage.removeItem("loggedInUser");
    if (window._statusCheckInterval) {
      clearInterval(window._statusCheckInterval);
      window._statusCheckInterval = null;
    }
    navigate("/login", { replace: true });
  };

  const handleDownloadExcel = () => {
    const usersData = users.map(u => ({ ID: u.id, Name: u.name, Email: u.email, Role: u.role, Status: u.status, LastLogin: u.lastLogin }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersData), "User List");
    XLSX.writeFile(wb, "StockMaster_Users.xlsx");
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Excel downloaded!' });
  };

  // --- HELPER FOR LOGS UI ---
  const getLogIcon = (action) => {
    if (action.includes('Login')) return '🔑';
    if (action.includes('Created') || action.includes('Register')) return '✨';
    if (action.includes('Sale')) return '💰';
    if (action.includes('Stock')) return '📦';
    if (action.includes('Product')) return '🏷️';
    if (action.includes('Report')) return '📄';
    if (action.includes('Payment')) return '💵';
    if (action.includes('Delete')) return '🗑️';
    if (action.includes('Role')) return '🛡️';
    if (action.includes('Status')) return '⚡';
    if (action.includes('Password')) return '🔒';
    return '📝';
  };

  const getLogColor = (action) => {
    if (action.includes('Sale') || action.includes('Payment')) return '#10b981';
    if (action.includes('Stock') || action.includes('Product')) return '#3b82f6';
    if (action.includes('Login')) return '#6366f1';
    if (action.includes('Delete')) return '#ef4444';
    if (action.includes('Role')) return '#8b5cf6';
    if (action.includes('Report')) return '#f59e0b';
    return '#64748b';
  };

  // --- PREPARE DATA FOR RENDER ---
  const filteredUsers = visibleUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="dashboard-container">
      {/* --- INLINE STYLES FOR ACTIVITY FEED --- */}
      <style>{`
        .activity-header-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .activity-title { font-size: 1.5rem; color: #1e293b; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
        .date-filter-box { display: flex; align-items: center; gap: 12px; background: #ffffff; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 50px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s ease; }
        .date-filter-box:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .date-filter-box span { font-size: 0.9rem; color: #64748b; font-weight: 600; }
        .date-filter-box input { border: none; outline: none; font-family: inherit; color: #334155; font-weight: 500; }
        .activity-timeline { display: flex; flex-direction: column; gap: 0; padding-bottom: 20px; position: relative; }
        .timeline-item { display: flex; gap: 20px; position: relative; padding-bottom: 35px; }
        .timeline-item:last-child { padding-bottom: 0; }
        .timeline-item::before { content: ''; position: absolute; left: 24px; top: 50px; bottom: 0; width: 2px; background: #e2e8f0; z-index: 0; }
        .timeline-item:last-child::before { display: none; }
        .timeline-icon-box { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; background: white; border: 3px solid #f8fafc; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 2; flex-shrink: 0; }
        .timeline-content { background: #ffffff; border-radius: 16px; padding: 20px; width: 100%; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02); transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden; }
        .timeline-content:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025); border-color: #e2e8f0; }
        .t-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .t-user-info { display: flex; flex-direction: column; }
        .t-user { font-weight: 700; color: #0f172a; font-size: 1rem; }
        .t-role-label { font-size: 0.75rem; color: #64748b; font-weight: 500; }
        .t-date { font-size: 0.8rem; color: #94a3b8; font-weight: 500; background: #f8fafc; padding: 4px 10px; border-radius: 20px; }
        .t-action-badge { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .t-details { font-size: 0.95rem; color: #475569; line-height: 1.6; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 0; }
      `}</style>

      {/* HEADER */}
      <header className="top-header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            )}
          </button>
          <div className="brand-logo"><span className="logo-icon">📦</span><span className="logo-text">StockMaster</span></div>
        </div>
        <div className="header-right">
          <div className="admin-profile">
            <div className="text-info"><span className="name">{loggedInUser.name || "User"}</span><span className="role">{loggedInUser.role || "Admin"}</span></div>
            <div className="avatar">{loggedInUser.name ? loggedInUser.name.charAt(0) : "U"}</div>
          </div>
          <button className="header-logout-btn" onClick={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="main-body">
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeView === 'users' ? 'active' : ''}`} onClick={() => setActiveView('users')}><span className="icon">👥</span> Users</button>
            <button className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}><span className="icon">📊</span> Reports</button>
            <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}><span className="icon">⚙️</span> Settings</button>
          </nav>
          <div className="sidebar-footer"><p>&copy; 2025 StockMaster</p></div>
        </aside>

        <main className="main-content">
          <div className="content-wrapper">
            
            {/* --- USERS VIEW --- */}
            {activeView === 'users' && (
              <div className="admin-card fade-in">
                <div className="admin-tabs">
                  <button className={`tab-btn ${activeUserTab === "list" ? "active" : ""}`} onClick={() => setActiveUserTab("list")}>Users List</button>
                  <button className={`tab-btn ${activeUserTab === "activity" ? "active" : ""}`} onClick={() => setActiveUserTab("activity")}>System Activity</button>
                </div>
                <div className="card-body">
                  
                  {/* TAB 1: USERS LIST */}
                  {activeUserTab === "list" && (
                    <div className="users-section">
                      <div className="table-controls">
                        <div className="search-wrapper">
                          <span className="search-icon">🔍</span>
                          <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                        </div>
                        <button className="add-user-btn" onClick={() => navigate('/signup')}>+ Invite User</button>
                      </div>
                      <div className="table-responsive">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th className="text-left">User</th>
                              <th className="text-center">Role</th>
                              <th className="text-center">Status Control</th>
                              <th className="text-left">Last Login</th>
                              <th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoading ? (
                              <tr><td colSpan="5" className="text-center" style={{padding: '20px'}}>Loading users...</td></tr>
                            ) : currentUsers.length > 0 ? (
                              currentUsers.map(user => {
                                const canEditStatus = canManageStatus(user);
                                const canChangeUserRole = canChangeRole(user);
                                const canDel = canDeleteUser(user);

                                // If I can't edit status AND can't change role AND can't delete, the row is read-only
                                const isRowReadOnly = !canEditStatus && !canChangeUserRole && !canDel;

                                return (
                                <tr key={user.id} className={isRowReadOnly ? "row-disabled-actions" : ""}>
                                  <td className="text-left">
                                    <div className="user-info-cell">
                                      <div className="user-avatar">{user.name.charAt(0)}</div>
                                      <div>
                                        <div className="user-name">
                                            {user.name} 
                                            {user.id === loggedInUserId && <span style={{fontSize:'0.7rem', color:'#6366f1', marginLeft:'6px'}}>(You)</span>}
                                        </div>
                                        <div className="user-email">{user.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <div className="stylish-select-wrapper">
                                      <select 
                                        className={`stylish-select ${user.role.toLowerCase()}`} 
                                        value={user.role} 
                                        onChange={(e) => canChangeUserRole && handleRoleChange(user.id, e.target.value)}
                                        disabled={!canChangeUserRole}
                                        style={{opacity: canChangeUserRole ? 1 : 0.6, cursor: canChangeUserRole ? 'pointer' : 'not-allowed'}}
                                      >
                                        {/* OPTION LOGIC: 
                                            1. NO "Super Admin" option (Even Super Admin cannot assign Super Admin)
                                            2. Regular Admin sees options but Select is Disabled above anyway. 
                                        */}
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="User">User</option>
                                      </select>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {user.status === "Pending" ? (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Pending</span>
                                        {canEditStatus && (
                                            <button onClick={() => handleApproveUser(user.id)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>✓ Approve</button>
                                        )}
                                      </div>
                                    ) : (
                                      <label className="switch-toggle" title={!canEditStatus ? "Permission Denied" : (user.status === "Active" ? "Deactivate" : "Activate")}>
                                        <input 
                                            type="checkbox" 
                                            checked={user.status === "Active"} 
                                            onChange={() => canEditStatus && handleStatusToggle(user.id, user.status)}
                                            disabled={!canEditStatus}
                                        />
                                        <span className={`slider round ${!canEditStatus ? "disabled" : ""}`}></span>
                                      </label>
                                    )}
                                  </td>
                                  <td className="text-left text-muted">{user.lastLogin}</td>
                                  <td className="text-right">
                                    <button 
                                        className="icon-btn delete" 
                                        onClick={() => canDel && handleDelete(user.id)}
                                        disabled={!canDel}
                                        style={{opacity: canDel ? 1 : 0.3, cursor: canDel ? 'pointer' : 'not-allowed'}}
                                    >
                                        🗑️
                                    </button>
                                  </td>
                                </tr>
                              )})
                            ) : (<tr><td colSpan="5" className="no-data">No users found.</td></tr>)}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="pagination-container">
                          <button className="page-btn nav" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                          ))}
                          <button className="page-btn nav" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SYSTEM ACTIVITY */}
                  {activeUserTab === "activity" && (
                    <div className="activity-section fade-in">
                      <div className="activity-header-controls">
                         <h3 className="activity-title">System Activity Log</h3>
                         <div className="date-filter-box">
                            <span>📅 Date:</span>
                            <input type="date" value={logDateFilter} onChange={(e) => setLogDateFilter(e.target.value)} />
                            {logDateFilter && (
                                <button onClick={() => setLogDateFilter("")} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold'}}>✕ Clear</button>
                            )}
                         </div>
                      </div>
                      
                      {isLogsLoading ? (
                        <div style={{textAlign:'center', padding:'40px', color:'#94a3b8', fontStyle:'italic'}}>Loading activity stream...</div>
                      ) : logs.length === 0 ? (
                        <div style={{textAlign:'center', padding:'40px', color:'#64748b', background:'#f8fafc', borderRadius:'12px'}}>
                            {logDateFilter ? `No activity found for ${logDateFilter}.` : "No recent activity found in system."}
                        </div>
                      ) : (
                        <div className="activity-timeline">
                          {logs.map((log) => {
                            const accentColor = getLogColor(log.action);
                            return (
                              <div key={log.id} className="timeline-item">
                                <div className="timeline-icon-box" style={{color: accentColor, borderColor: accentColor}}>
                                  {getLogIcon(log.action)}
                                </div>
                                <div className="timeline-content" style={{borderLeft: `4px solid ${accentColor}`}}>
                                  <div className="t-header">
                                    <div className="t-user-info">
                                      <span className="t-user">{log.userName || "System"}</span>
                                      <span className="t-role-label">Action Performer</span>
                                    </div>
                                    <span className="t-date">
                                      {new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <span className="t-action-badge" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>{log.action}</span>
                                  <div className="t-details">{log.details}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- REPORTS VIEW --- */}
            {activeView === 'reports' && (
              <div className="reports-view fade-in">
                <div className="section-header">
                   <div><h2>System Analytics</h2><p className="subtitle">Overview of user metrics and system growth.</p></div>
                   <button className="primary-btn excel-btn" onClick={handleDownloadExcel}><span className="icon">📥</span> Export Excel</button>
                </div>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-icon-wrapper blue">👥</div><div><div className="stat-label">Total Users</div><div className="stat-value">{reportStats.total}</div></div></div>
                  <div className="stat-card"><div className="stat-icon-wrapper green">✅</div><div><div className="stat-label">Active Users</div><div className="stat-value">{reportStats.active}</div></div></div>
                  <div className="stat-card"><div className="stat-icon-wrapper red">⏳</div><div><div className="stat-label">Pending Approval</div><div className="stat-value">{reportStats.pending}</div></div></div>
                  <div className="stat-card"><div className="stat-icon-wrapper purple">👔</div><div><div className="stat-label">Admins & Managers</div><div className="stat-value">{reportStats.admins + reportStats.managers}</div></div></div>
                </div>
                <div className="charts-grid">
                  <div className="admin-card chart-card">
                    <div className="card-header"><h3>User Growth</h3><span className="tag">Last 6 Months</span></div>
                    <div className="card-body">
                      <div className="bar-chart-container">
                        <div className="grid-lines"><div><span>100</span></div><div><span>75</span></div><div><span>50</span></div><div><span>25</span></div><div><span>0</span></div></div>
                        <div className="bars-wrapper">
                          <div className="chart-bar" style={{height: '35%'}} data-label="Jul"></div>
                          <div className="chart-bar" style={{height: '45%'}} data-label="Aug"></div>
                          <div className="chart-bar" style={{height: '30%'}} data-label="Sep"></div>
                          <div className="chart-bar" style={{height: '60%'}} data-label="Oct"></div>
                          <div className="chart-bar" style={{height: '75%'}} data-label="Nov"></div>
                          <div className="chart-bar highlight" style={{height: '85%'}} data-label="Dec"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="admin-card chart-card">
                    <div className="card-header"><h3>Role Distribution</h3></div>
                    <div className="card-body flex-center">
                      <div className="pie-container">
                        <div className="css-pie-chart" style={{ background: pieChartGradient }}><div className="pie-center-value">{reportStats.total} Users</div></div>
                        <div className="pie-legend">
                          <div className="legend-item"><span className="dot c1"></span> Admin ({reportStats.admins})</div>
                          <div className="legend-item"><span className="dot c2"></span> Manager ({reportStats.managers})</div>
                          <div className="legend-item"><span className="dot c3"></span> User ({reportStats.others})</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- SETTINGS VIEW --- */}
            {activeView === 'settings' && (
              <div className="settings-view fade-in">
                <h2 className="mb-20">Settings</h2>
                <div className="admin-card">
                   <div className="card-body" style={{padding:'40px', textAlign:'center', color:'#888'}}>Global settings configuration panel.</div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}