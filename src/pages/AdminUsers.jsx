import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import '../../css/AdminUsers.css';

export default function AdminUsers() {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState("users");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);

  // Users Tab State
  const [activeUserTab, setActiveUserTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Settings State
  const [notifications, setNotifications] = useState({ email: true, sms: false });

  // --- BACKEND DATA STATE ---
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- RESPONSIVE SIDEBAR ---
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- FETCH DATA FUNCTION ---
  const fetchUsers = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);

      // NOTE: Ensure this URL matches your actual backend port
      const response = await fetch('https://localhost:7262/api/auth/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();

      const formattedData = data.map(user => {
        let lastLoginText = "Never";
        if (user.lastLogin) {
          const lastLoginDate = new Date(user.lastLogin);
          const diffMs = Date.now() - lastLoginDate.getTime();
          const diffSec = Math.floor(diffMs / 1000);
          const diffMin = Math.floor(diffSec / 60);
          const diffHour = Math.floor(diffMin / 60);
          const diffDay = Math.floor(diffHour / 24);

          if (diffSec < 60) lastLoginText = `${diffSec} sec ago`;
          else if (diffMin < 60) lastLoginText = `${diffMin} min ago`;
          else if (diffHour < 24) lastLoginText = `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
          else lastLoginText = `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        }

        return {
          id: user.id,
          name: user.name || "Unknown",
          email: user.email || "No Email",
          role: user.role || "User",
          status: user.status || "Pending", 
          lastLogin: lastLoginText
        };
      });

      setUsers(formattedData);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (!isBackground) {
        Swal.fire({ icon: 'error', title: 'Connection Failed', text: 'Could not load users.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- INITIAL LOAD & AUTOMATIC POLLING ---
  useEffect(() => {
    fetchUsers(false);
    const intervalId = setInterval(() => {
      fetchUsers(true); 
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchUsers]);

  // --- ANALYTICS CALCULATIONS (Memoized) ---
  const reportStats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === "Active").length;
    const pending = users.filter(u => u.status === "Pending").length;
    
    // Role Counts for Pie Chart
    const admins = users.filter(u => u.role === "Admin").length;
    const managers = users.filter(u => u.role === "Manager").length;
    const others = total - admins - managers;

    return { total, active, pending, admins, managers, others };
  }, [users]);

  // Calculate Gradient string for Pie Chart dynamically based on roles
  const pieChartGradient = useMemo(() => {
    if (reportStats.total === 0) return 'conic-gradient(#e2e8f0 0% 100%)';
    
    const adminPct = (reportStats.admins / reportStats.total) * 100;
    const managerPct = (reportStats.managers / reportStats.total) * 100;
    
    // CSS Conic Gradient logic
    // Color 1 (Primary/Admin): 0% -> adminPct%
    // Color 2 (Green/Manager): adminPct% -> (adminPct + managerPct)%
    // Color 3 (Orange/Others): (adminPct + managerPct)% -> 100%
    
    const p1 = adminPct;
    const p2 = adminPct + managerPct;
    
    return `conic-gradient(var(--primary) 0% ${p1}%, #10b981 ${p1}% ${p2}%, #f59e0b ${p2}% 100%)`;
  }, [reportStats]);

  // --- HANDLERS ---
  const handleRoleChange = async (id, newRole) => {
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
          const response = await fetch(`https://localhost:7262/api/auth/users/${id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
          });
          if (!response.ok) throw new Error('Failed to update role');

          Swal.fire('Updated!', 'User role changed.', 'success');
          fetchUsers(true); 
        } catch (error) {
          Swal.fire('Error!', 'Could not update role.', 'error');
        }
      }
    });
  };

  const handleApproveUser = async (id) => {
    Swal.fire({
      title: 'Approve User?',
      text: "This user is currently Pending. Activate them now?",
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Approve & Activate'
    }).then(async (result) => {
      if (result.isConfirmed) {
        updateUserStatus(id, "Active");
      }
    });
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    updateUserStatus(id, newStatus);
  };

  const updateUserStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`https://localhost:7262/api/auth/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');

      Swal.fire('Success', `User status set to ${newStatus}.`, 'success');
      fetchUsers(true);
    } catch (error) {
      console.error(error);
      Swal.fire('Error!', 'Could not update status.', 'error');
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: 'Delete User?', 
      text: "Irreversible action.", 
      icon: 'warning',
      showCancelButton: true, 
      confirmButtonColor: '#d33', 
      confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`https://localhost:7262/api/auth/users/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!response.ok) throw new Error(`Server error: ${response.status}`);

          Swal.fire('Deleted!', 'User removed.', 'success');
          fetchUsers(true);
        } catch (error) {
          Swal.fire('Error', 'Could not delete user.', 'error');
        }
      }
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Sign Out', icon: 'question',
      showCancelButton: true, confirmButtonColor: '#4f46e5', confirmButtonText: 'Log Out'
    }).then((result) => {
      if (result.isConfirmed) navigate('/login');
    });
  };

  const handleDownloadExcel = () => {
    const usersData = users.map(u => ({
      ID: u.id, Name: u.name, Email: u.email, Role: u.role, Status: u.status, LastLogin: u.lastLogin
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersData), "User List");
    XLSX.writeFile(wb, "StockMaster_Users.xlsx");
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Excel downloaded!' });
  };

  // --- PAGINATION ---
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="top-header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="brand-logo"><span className="logo-icon">📦</span><span className="logo-text">StockMaster</span></div>
        </div>
        <div className="header-right">
          <div className="admin-profile">
            <div className="text-info"><span className="name">Admin User</span><span className="role">Super Admin</span></div>
            <div className="avatar">AD</div>
          </div>
          <button className="header-logout-btn" onClick={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="main-body">
        {/* SIDEBAR */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeView === 'users' ? 'active' : ''}`} onClick={() => setActiveView('users')}><span className="icon">👥</span> Users</button>
            <button className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}><span className="icon">📊</span> Reports</button>
            <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}><span className="icon">⚙️</span> Settings</button>
          </nav>
          <div className="sidebar-footer"><p>&copy; 2025 StockMaster</p></div>
        </aside>

        {/* MAIN CONTENT */}
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
                  {/* USERS LIST */}
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
                              currentUsers.map(user => (
                                <tr key={user.id}>
                                  <td className="text-left">
                                    <div className="user-info-cell">
                                      <div className="user-avatar">{user.name.charAt(0)}</div>
                                      <div><div className="user-name">{user.name}</div><div className="user-email">{user.email}</div></div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <div className="stylish-select-wrapper">
                                      <select className={`stylish-select ${user.role.toLowerCase()}`} value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="User">User</option>
                                      </select>
                                    </div>
                                  </td>
                                  
                                  {/* STATUS CONTROL */}
                                  <td className="text-center">
                                    {user.status === "Pending" ? (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <span style={{ 
                                          backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                                        }}>Pending</span>
                                        <button 
                                          onClick={() => handleApproveUser(user.id)} 
                                          style={{ 
                                            background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px'
                                          }}
                                          title="Approve User"
                                        >
                                          ✓ Approve
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="switch-toggle" title={user.status === "Active" ? "Deactivate" : "Activate"}>
                                        <input type="checkbox" checked={user.status === "Active"} onChange={() => handleStatusToggle(user.id, user.status)} />
                                        <span className="slider round"></span>
                                      </label>
                                    )}
                                  </td>
                                  
                                  <td className="text-left text-muted">{user.lastLogin}</td>
                                  <td className="text-right"><button className="icon-btn delete" onClick={() => handleDelete(user.id)}>🗑️</button></td>
                                </tr>
                              ))
                            ) : (<tr><td colSpan="5" className="no-data">No users found.</td></tr>)}
                          </tbody>
                        </table>
                      </div>

                      {/* PAGINATION */}
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

                  {/* ACTIVITY TAB (Placeholder) */}
                  {activeUserTab === "activity" && (
                    <div className="activity-section"><p style={{padding:'20px', textAlign:'center', color:'#666'}}>System logs coming soon...</p></div>
                  )}
                </div>
              </div>
            )}

            {/* --- REPORTS VIEW (COMPLETELY IMPLEMENTED) --- */}
            {activeView === 'reports' && (
              <div className="reports-view fade-in">
                
                {/* Header */}
                <div className="section-header">
                   <div>
                     <h2>System Analytics</h2>
                     <p className="subtitle">Overview of user metrics and system growth.</p>
                   </div>
                   <button className="primary-btn excel-btn" onClick={handleDownloadExcel}>
                     <span className="icon">📥</span> Export Excel
                   </button>
                </div>

                {/* Top Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon-wrapper blue">👥</div>
                    <div>
                      <div className="stat-label">Total Users</div>
                      <div className="stat-value">{reportStats.total}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper green">✅</div>
                    <div>
                      <div className="stat-label">Active Users</div>
                      <div className="stat-value">{reportStats.active}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper red">⏳</div>
                    <div>
                      <div className="stat-label">Pending Approval</div>
                      <div className="stat-value">{reportStats.pending}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper purple">👔</div>
                    <div>
                      <div className="stat-label">Admins & Managers</div>
                      <div className="stat-value">{reportStats.admins + reportStats.managers}</div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="charts-grid">
                  
                  {/* Left: User Growth Bar Chart (CSS ONLY) */}
                  <div className="admin-card chart-card">
                    <div className="card-header">
                      <h3>User Growth</h3>
                      <span className="tag">Last 6 Months</span>
                    </div>
                    <div className="card-body">
                      <div className="bar-chart-container">
                        <div className="grid-lines">
                          <div><span>100</span></div>
                          <div><span>75</span></div>
                          <div><span>50</span></div>
                          <div><span>25</span></div>
                          <div><span>0</span></div>
                        </div>
                        {/* Mock data bars for visualization using CSS heights */}
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

                  {/* Right: Role Distribution Pie Chart */}
                  <div className="admin-card chart-card">
                    <div className="card-header">
                      <h3>Role Distribution</h3>
                    </div>
                    <div className="card-body flex-center">
                      <div className="pie-container">
                        {/* Dynamic Gradient based on actual state */}
                        <div 
                          className="css-pie-chart" 
                          style={{ background: pieChartGradient }}
                        >
                          <div className="pie-center-value">{reportStats.total} Users</div>
                        </div>
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