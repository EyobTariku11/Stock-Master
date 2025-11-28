import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2'; 
import * as XLSX from 'xlsx'; 
import '../../css/AdminUsers.css';

export default function AdminUsers() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState("users"); // 'users', 'reports', 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);
  
  // Users Tab State
  const [activeUserTab, setActiveUserTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Settings State
  const [notifications, setNotifications] = useState({ email: true, sms: false });

  // Responsive Sidebar
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- MOCK DATA ---
  const [users, setUsers] = useState([
    { id: 1, name: "John Doe", email: "john@stock.com", role: "Admin", status: "Active", lastLogin: "2 mins ago" },
    { id: 2, name: "Sarah Smith", email: "sarah@ware.com", role: "Manager", status: "Active", lastLogin: "1 hour ago" },
    { id: 3, name: "Mike Johnson", email: "mike@logistics.com", role: "Viewer", status: "Inactive", lastLogin: "3 days ago" },
    { id: 4, name: "Emily Davis", email: "emily@stock.com", role: "Manager", status: "Active", lastLogin: "5 hours ago" },
    { id: 5, name: "Chris Evans", email: "chris@tech.com", role: "Viewer", status: "Active", lastLogin: "1 day ago" },
    { id: 6, name: "Natalie Port", email: "natalie@design.com", role: "Viewer", status: "Active", lastLogin: "2 days ago" },
    { id: 7, name: "Tom Holland", email: "tom@web.com", role: "Manager", status: "Inactive", lastLogin: "1 week ago" },
    { id: 8, name: "Bruce Wayne", email: "bruce@corp.com", role: "Admin", status: "Active", lastLogin: "10 mins ago" },
    { id: 9, name: "Clark Kent", email: "clark@daily.com", role: "Viewer", status: "Active", lastLogin: "4 hours ago" },
  ]);

  const activityLogs = [
    { id: 1, user: "John Doe", action: "Updated stock count for 'Nike Air'", time: "2 mins ago", type: "update" },
    { id: 2, user: "Sarah Smith", action: "Added new supplier 'Global Tech'", time: "1 hour ago", type: "create" },
    { id: 3, user: "System", action: "Weekly backup completed", time: "4 hours ago", type: "system" },
  ];

  // --- HANDLERS WITH SWAL ---

  // 1. Role Change Handler
  const handleRoleChange = (id, newRole) => {
    Swal.fire({
      title: 'Update Role?',
      text: `Are you sure you want to change this user to ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, Update'
    }).then((result) => {
      if (result.isConfirmed) {
        setUsers(users.map(user => user.id === id ? { ...user, role: newRole } : user));
        Swal.fire('Updated!', 'User role has been changed.', 'success');
      } else {
        // Force re-render/reset if needed
        setUsers([...users]); 
      }
    });
  };

  // 2. Status Toggle Handler
  const handleStatusToggle = (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const isActivating = newStatus === "Active";

    Swal.fire({
      title: isActivating ? 'Activate User?' : 'Deactivate User?',
      text: isActivating 
        ? "This user will regain access to the system." 
        : "This user will lose access to the system.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isActivating ? '#10b981' : '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: isActivating ? 'Yes, Activate' : 'Yes, Deactivate'
    }).then((result) => {
      if (result.isConfirmed) {
        setUsers(users.map(user => user.id === id ? { ...user, status: newStatus } : user));
        Swal.fire(
          isActivating ? 'Activated!' : 'Deactivated!',
          `User is now ${newStatus}.`,
          'success'
        );
      }
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete User?', text: "This action cannot be undone.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        setUsers(users.filter(user => user.id !== id));
        Swal.fire('Deleted!', 'User has been removed.', 'success');
      }
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Sign Out', text: "Are you sure?", icon: 'question',
      showCancelButton: true, confirmButtonColor: '#4f46e5', confirmButtonText: 'Log Out'
    }).then((result) => {
      if (result.isConfirmed) navigate('/login');
    });
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    Swal.fire('Saved!', 'System settings updated.', 'success');
  };

  // --- EXCEL EXPORT FUNCTION ---
  const handleDownloadExcel = () => {
    const summaryData = [
      { Metric: "Report Date", Value: new Date().toLocaleDateString() },
      { Metric: "Total Users", Value: users.length },
      { Metric: "Active Users", Value: users.filter(u => u.status === "Active").length },
      { Metric: "Revenue", Value: "$45,200" }
    ];

    const usersData = users.map(u => ({
      ID: u.id, Name: u.name, Email: u.email, Role: u.role, Status: u.status, LastLogin: u.lastLogin
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsUsers = XLSX.utils.json_to_sheet(usersData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Overview");
    XLSX.utils.book_append_sheet(wb, wsUsers, "User List");

    XLSX.writeFile(wb, "StockMaster_Report.xlsx");
    
    const Toast = Swal.mixin({
      toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
    });
    Toast.fire({ icon: 'success', title: 'Excel report downloaded!' });
  };

  // --- PAGINATION LOGIC ---
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const setPage = (n) => setCurrentPage(n);

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="top-header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div className="brand-logo">
            <span className="logo-icon">📦</span><span className="logo-text">StockMaster</span>
          </div>
        </div>
        <div className="header-right">
          <div className="admin-profile">
            <div className="text-info"><span className="name">Admin User</span><span className="role">Super Admin</span></div>
            <div className="avatar">AD</div>
          </div>
          <button className="header-logout-btn" onClick={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      <div className="main-body">
        {/* SIDEBAR */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeView === 'users' ? 'active' : ''}`} onClick={() => setActiveView('users')}>
              <span className="icon">👥</span> Users
            </button>
            <button className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}>
              <span className="icon">📊</span> Reports
            </button>
            <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>
              <span className="icon">⚙️</span> Settings
            </button>
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
                  {activeUserTab === "list" && (
                    <div className="users-section">
                      <div className="table-controls">
                        <div className="search-wrapper">
                          <span className="search-icon">🔍</span>
                          <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                        </div>
                        <button className="add-user-btn">+ Invite User</button>
                      </div>
                      <div className="table-responsive">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th className="text-left">User</th>
                              <th className="text-center">Role</th>
                              <th className="text-center">Status</th>
                              <th className="text-left">Last Login</th>
                              <th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentUsers.length > 0 ? (
                              currentUsers.map((user) => (
                                <tr key={user.id}>
                                  <td className="text-left">
                                    <div className="user-info-cell">
                                      <div className="user-avatar">{user.name.charAt(0)}</div>
                                      <div><div className="user-name">{user.name}</div><div className="user-email">{user.email}</div></div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <div className="stylish-select-wrapper">
                                      <select 
                                        className={`stylish-select ${user.role.toLowerCase()}`} 
                                        value={user.role} 
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                      >
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Viewer">Viewer</option>
                                      </select>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <label className="switch-toggle" title={user.status === "Active" ? "Deactivate" : "Activate"}>
                                      <input 
                                        type="checkbox" 
                                        checked={user.status === "Active"} 
                                        onChange={() => handleStatusToggle(user.id, user.status)} 
                                      />
                                      <span className="slider round"></span>
                                    </label>
                                  </td>
                                  <td className="text-left text-muted">{user.lastLogin}</td>
                                  <td className="text-right"><button className="icon-btn delete" onClick={() => handleDelete(user.id)}>🗑️</button></td>
                                </tr>
                              ))
                            ) : (<tr><td colSpan="5" className="no-data">No users found.</td></tr>)}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="pagination-container">
                          <span className="pagination-info">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length}</span>
                          <div className="pagination-controls">
                            <button className="page-btn nav" onClick={prevPage} disabled={currentPage === 1}>&lt;</button>
                            {[...Array(totalPages)].map((_, i) => (
                              <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                            ))}
                            <button className="page-btn nav" onClick={nextPage} disabled={currentPage === totalPages}>&gt;</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeUserTab === "activity" && (
                    <div className="activity-section">
                      <ul className="timeline">
                        {activityLogs.map((log) => (
                          <li key={log.id} className="timeline-item">
                            <div className={`timeline-marker ${log.type}`}></div>
                            <div className="timeline-content">
                              <div className="timeline-header"><span className="log-user">{log.user}</span><span className="log-time">{log.time}</span></div>
                              <p className="log-action">{log.action}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- REPORTS VIEW --- */}
            {activeView === 'reports' && (
              <div className="reports-view fade-in">
                <div className="section-header">
                  <div>
                    <h2>Analytics Dashboard</h2>
                    <p className="subtitle">Real-time inventory and user insights.</p>
                  </div>
                  <button className="primary-btn excel-btn" onClick={handleDownloadExcel}>
                    <span>📊</span> Export to Excel
                  </button>
                </div>
                
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon-wrapper blue">📦</div>
                    <div><div className="stat-label">Total Stock</div><div className="stat-value">1,240</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper red">⚠️</div>
                    <div><div className="stat-label">Low Stock</div><div className="stat-value">12</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper green">💵</div>
                    <div><div className="stat-label">Revenue</div><div className="stat-value">$45.2k</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper purple">👥</div>
                    <div><div className="stat-label">Active Users</div><div className="stat-value">24</div></div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="admin-card chart-card">
                    <div className="card-header">
                      <h3>Inventory Turnover</h3>
                      <div className="tag">Last 6 Months</div>
                    </div>
                    <div className="card-body">
                      <div className="bar-chart-container">
                        <div className="grid-lines">
                          <div><span>100%</span></div><div><span>75%</span></div>
                          <div><span>50%</span></div><div><span>25%</span></div>
                          <div><span>0%</span></div>
                        </div>
                        <div className="bars-wrapper">
                          <div className="chart-bar" style={{height: '40%'}} data-label="Jan" title="Jan: 40%"></div>
                          <div className="chart-bar" style={{height: '55%'}} data-label="Feb" title="Feb: 55%"></div>
                          <div className="chart-bar" style={{height: '45%'}} data-label="Mar" title="Mar: 45%"></div>
                          <div className="chart-bar highlight" style={{height: '80%'}} data-label="Apr" title="Apr: 80%"></div>
                          <div className="chart-bar" style={{height: '60%'}} data-label="May" title="May: 60%"></div>
                          <div className="chart-bar" style={{height: '85%'}} data-label="Jun" title="Jun: 85%"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card chart-card">
                    <div className="card-header"><h3>Category Distribution</h3></div>
                    <div className="card-body flex-center">
                      <div className="pie-container">
                        <div className="css-pie-chart">
                          <div className="pie-center-value">Total<br/>1,240</div>
                        </div>
                        <div className="pie-legend">
                          <div className="legend-item"><span className="dot c1"></span> Electronics (40%)</div>
                          <div className="legend-item"><span className="dot c2"></span> Clothing (35%)</div>
                          <div className="legend-item"><span className="dot c3"></span> Home (25%)</div>
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
                <h2 className="mb-20">System Settings</h2>
                <div className="admin-card">
                  <form onSubmit={handleSaveSettings}>
                    <div className="card-body settings-grid">
                      <div className="settings-section">
                        <h3>Profile Settings</h3>
                        <div className="form-group"><label>Full Name</label><input type="text" className="form-input" defaultValue="Admin User" /></div>
                        <div className="form-group"><label>Email Address</label><input type="email" className="form-input" defaultValue="admin@stockmaster.com" /></div>
                      </div>
                      <div className="settings-section">
                        <h3>Security</h3>
                        <div className="form-group"><label>Current Password</label><input type="password" class="form-input" placeholder="••••••••" /></div>
                        <div className="form-group"><label>New Password</label><input type="password" class="form-input" placeholder="New password" /></div>
                        <div className="toggle-group">
                          <label className="toggle-label"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                          <span>Enable Two-Factor Auth (2FA)</span>
                        </div>
                      </div>
                      <div className="settings-section full-width">
                        <h3>Notifications</h3>
                        <div className="checkbox-group">
                          <label className="custom-checkbox"><input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} /><span>Email Alerts on Low Stock</span></label>
                          <label className="custom-checkbox"><input type="checkbox" checked={notifications.sms} onChange={() => setNotifications({...notifications, sms: !notifications.sms})} /><span>SMS Alerts for Login</span></label>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button type="button" className="secondary-btn" onClick={() => setActiveView('users')}>Cancel</button>
                      <button type="submit" className="primary-btn">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}