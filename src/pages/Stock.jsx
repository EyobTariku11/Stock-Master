import React, { useState } from "react"; 
import { useAdminStocks } from "../hooks/useAdminStocks";
import '../../css/Stock.css'; 

export default function AdminStocks() {
  const {
    activeView, setActiveView,
    isSidebarOpen, setIsSidebarOpen,
    searchTerm, setSearchTerm,
    isLoading,
    products,
    currentProducts,
    inventoryPage, setInventoryPage, totalInventoryPages,
    currentSales,
    salesPage, setSalesPage, totalSalesPages,
    salesDateFilter, setSalesDateFilter,
    creditViewMode, setCreditViewMode,
    creditDateFilter, setCreditDateFilter,
    creditPage, setCreditPage, totalCreditPages,
    currentCreditSales,
    profile, setProfile,
    passwords, setPasswords,
    lowStockCount,
    totalRevenue,
    nearDueCount,
    handleNotificationClick,
    handleAddProduct,
    handleEditProduct,
    handleStockAdjustment,
    handleDelete,
    handleGenerateReport,
    handleProfileUpdate,
    handlePasswordChange,
    handleLogout,
    handleTogglePaid
  } = useAdminStocks();

  // --- LOCAL STATE FOR PASSWORD VISIBILITY TOGGLE ---
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const renderPagination = (currentPage, totalPages, setPage) => (
    totalPages > 1 && (
      <div className="pagination-container">
        <button className="page-btn nav" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>
        {[...Array(totalPages)].map((_, i) => (
          <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
        ))}
        <button className="page-btn nav" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
      </div>
    )
  );

  // --- ULTRA-MODERN "APP LAUNCH" LOADER ---
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: '#ffffff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.6s ease-out'
      }}>
        <style>{`
          @keyframes slideIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes progressBar { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
          
          .app-launch-container { text-align: center; font-family: 'Inter', system-ui, sans-serif; }
          .launch-logo { font-size: 3rem; margin-bottom: 1rem; animation: slideIn 0.8s ease-out; }
          .launch-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -1px; animation: slideIn 0.8s ease-out 0.1s backwards; }
          .launch-subtitle { font-size: 0.9rem; color: #64748b; margin-top: 5px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; animation: slideIn 0.8s ease-out 0.2s backwards; }
          
          .progress-container { width: 200px; height: 4px; background: #f1f5f9; border-radius: 4px; margin-top: 40px; overflow: hidden; position: relative; }
          .progress-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #6366f1); border-radius: 4px; animation: progressBar 1.5s ease-in-out forwards; }
        `}</style>

        <div className="app-launch-container">
          <div className="launch-logo">📦</div>
          <h1 className="launch-title">Bektar Stock</h1>
          <p className="launch-subtitle">Management System</p>

          <div className="progress-container">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="top-header">
        <div className="header-left">
          {/* HAMBURGER / X TOGGLE */}
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? (
              // X Icon (Close)
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              // Hamburger Icon (Open)
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
          <div className="brand-logo"><span className="logo-icon">📦</span>  BektarStock</div>
        </div>
        <div className="header-right">
          <div className="notification-wrapper" onClick={handleNotificationClick} style={{ marginRight: '15px', position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            {nearDueCount > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {nearDueCount}
              </span>
            )}
          </div>
          <div className="admin-profile">
            <div className="text-info"><span className="name">{profile.name}</span><span className="role">Manager</span></div>
            <div className="avatar">{profile.name.charAt(0)}</div>
          </div>
          <button className="header-logout-btn" onClick={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      <div className="main-body">
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeView === 'inventory' ? 'active' : ''}`} onClick={() => setActiveView('inventory')}><span className="icon">📦</span> Inventory</button>
            <button className={`nav-item ${activeView === 'sales' ? 'active' : ''}`} onClick={() => setActiveView('sales')}><span className="icon">💰</span> Sales History</button>
            <button className={`nav-item ${activeView === 'credits' ? 'active' : ''}`} onClick={() => setActiveView('credits')}><span className="icon">💳</span> Credit Sales</button>
            <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}><span className="icon">⚙️</span> Settings</button>
          </nav>
          <div className="sidebar-footer"><p>&copy; 2025 BektarStock | Tech by Eyob Tariku</p></div>
        </aside>

        <main className="main-content">
          <div className="content-wrapper">

            {activeView === 'inventory' && (
              <div className="fade-in">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon-wrapper blue">📋</div>
                    <div><div className="stat-label">Total Products</div><div className="stat-value">{products.length}</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper red">⚠️</div>
                    <div><div className="stat-label">Critical Stock</div><div className="stat-value">{lowStockCount}</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper green">💵</div>
                    <div><div className="stat-label">Total Revenue</div><div className="stat-value">{totalRevenue.toLocaleString()} Birr</div></div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-header-simple"><h2>Current Inventory</h2></div>
                  <div className="card-body">
                    <div className="table-controls">
                      <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setInventoryPage(1); }} />
                      </div>
                      <div className="action-buttons-group">
                        <button className="secondary-btn" onClick={() => handleGenerateReport('inventory')}>⬇ Inventory Report</button>
                        <button className="add-user-btn" onClick={handleAddProduct}>+ Add Product</button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th className="text-left">Product</th>
                            <th className="text-center">Category</th>
                            <th className="text-center">Price</th>
                            <th className="text-center">Stock Control</th>
                            <th className="text-center">Status</th>
                            <th className="text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentProducts.length > 0 ? (
                              currentProducts.map((p) => (
                                <tr key={p.id}>
                                  <td className="text-left font-weight-600">{p.name}</td>
                                  <td className="text-center"><span className="category-tag">{p.category}</span></td>
                                  <td className="text-center">{p.price} Birr</td>
                                  <td className="text-center">
                                    <div className="stock-control">
                                      <button className="stock-btn minus" onClick={() => handleStockAdjustment(p, 'sell')}>-</button>
                                      <span className={`stock-value ${p.stock <= p.minStock ? 'low' : ''}`}>{p.stock}</span>
                                      <button className="stock-btn plus" onClick={() => handleStockAdjustment(p, 'restock')}>+</button>
                                    </div>
                                  </td>
                                  <td className="text-center"><span className={`status-badge ${p.status.toLowerCase().replace(/\s/g, '-')}`}>{p.status}</span></td>
                                  <td className="text-right">
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                      <button className="icon-btn edit" onClick={() => handleEditProduct(p)}>✏️</button>
                                      <button className="icon-btn delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (<tr><td colSpan="6" className="text-center">No products found.</td></tr>)
                          }
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(inventoryPage, totalInventoryPages, setInventoryPage)}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'sales' && (
              <div className="fade-in">
                <div className="section-header">
                  <div><h2>Sales History</h2><p className="subtitle">Track every transaction.</p></div>
                  <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                    <div className="date-input-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #ddd', borderRadius: '6px', padding: '0 10px' }}>
                      <span style={{ marginRight: '5px' }}>📅</span>
                      <input type="date" style={{ border: 'none', outline: 'none' }} value={salesDateFilter} onChange={(e) => { setSalesDateFilter(e.target.value); setSalesPage(1); }} />
                    </div>
                    <button className="secondary-btn" onClick={() => handleGenerateReport('sales')}>⬇ Sales Report</button>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th className="text-left">Date</th>
                            <th className="text-left">Product</th>
                            <th className="text-center">Type</th>
                            <th className="text-center">Customer</th>
                            <th className="text-center">Sold By</th>
                            <th className="text-center">Created By</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Revenue</th>
                            <th className="text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSales.length > 0 ? (
                            currentSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="text-left text-muted">{sale.date}</td>
                                <td className="text-left font-weight-600">{sale.product}</td>
                                <td className="text-center"><span className={`category-tag ${sale.salesType === 'Credit' ? 'red-bg' : ''}`}>{sale.salesType}</span></td>
                                <td className="text-center">{sale.customerName}</td>
                                <td className="text-center">{sale.soldBy}</td>
                                <td className="text-center">{sale.approvedBy}</td>
                                <td className="text-center">{sale.quantity}</td>
                                <td className="text-right text-success font-weight-bold">{sale.total.toLocaleString()}</td>
                                <td className="text-center">
                                  <span style={{ fontWeight: 'bold', color: sale.status === 'Completed' ? 'green' : sale.status === 'Overdue' ? 'red' : 'orange' }}>
                                    {sale.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (<tr><td colSpan="9" className="text-center">No transactions found.</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(salesPage, totalSalesPages, setSalesPage)}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'credits' && (
              <div className="fade-in">
                <div className="section-header">
                  <div><h2>Credit Sales Management</h2></div>
                  <div className="header-actions">

                    <div style={{ display: 'flex', gap: '5px', background: '#e5e7eb', padding: '4px', borderRadius: '8px' }}>
                      <button onClick={() => { setCreditViewMode('active'); setCreditPage(1); }}
                        style={{
                          padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: '0.2s',
                          background: creditViewMode === 'active' ? 'white' : 'transparent',
                          color: creditViewMode === 'active' ? '#4f46e5' : '#6b7280', fontWeight: '600', 
                          boxShadow: creditViewMode === 'active' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}>
                        Active (Unpaid)
                      </button>

                      <button onClick={() => { setCreditViewMode('overdue'); setCreditPage(1); }}
                        style={{
                          padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: '0.2s',
                          background: creditViewMode === 'overdue' ? 'white' : 'transparent',
                          color: creditViewMode === 'overdue' ? '#b91c1c' : '#6b7280', fontWeight: '600', 
                          boxShadow: creditViewMode === 'overdue' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}>
                        Overdue ⚠️
                      </button>

                      <button onClick={() => { setCreditViewMode('paid'); setCreditPage(1); }}
                        style={{
                          padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: '0.2s',
                          background: creditViewMode === 'paid' ? 'white' : 'transparent',
                          color: creditViewMode === 'paid' ? '#166534' : '#6b7280', fontWeight: '600', 
                          boxShadow: creditViewMode === 'paid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}>
                        Completed (Paid) ✅
                      </button>
                    </div>

                    <div className="date-input-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #ddd', borderRadius: '6px', padding: '0 10px' }}>
                      <span style={{ marginRight: '5px' }}>📅</span>
                      <input type="date" style={{ border: 'none', outline: 'none' }} value={creditDateFilter} onChange={(e) => { setCreditDateFilter(e.target.value); setCreditPage(1); }} />
                    </div>

                    {creditViewMode === 'paid' && (
                      <button 
                        className="secondary-btn" 
                        style={{ padding: '6px 15px', height: '38px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }} 
                        onClick={() => handleGenerateReport('credits_paid')}
                      >
                        ⬇ Sales Report
                      </button>
                    )}

                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-header-simple">
                    <h3 style={{
                      color: creditViewMode === 'overdue' ? '#b91c1c' : creditViewMode === 'paid' ? '#166534' : 'inherit'
                    }}>
                      {creditViewMode === 'active' ? 'Current Outstanding Credits' : creditViewMode === 'overdue' ? 'Overdue & Past Payments' : 'History of Paid Credits'}
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="custom-table fixed-layout-table">
                        <thead>
                          <tr>
                            <th className="text-left" style={{ width: '12%' }}>Date</th>
                            <th className="text-left" style={{ width: '18%' }}>Product</th>
                            <th className="text-center" style={{ width: '15%' }}>Customer</th>
                            <th className="text-center" style={{ width: '10%' }}>Sold By</th> 
                            <th className="text-center" style={{ width: '10%' }}>Created By</th>
                            <th className="text-center" style={{ width: '7%' }}>Qty</th>
                            
                            {/* FIXED WIDTH FOR VARIANT COLUMN */}
                            <th className="text-center" style={{ width: '10%' }}>
                              {creditViewMode === 'paid' ? 'Revenue' : 'Days Left'}
                            </th>
                            
                            <th className="text-center" style={{ width: '10%' }}>Status</th>
                            
                            {/* FIXED WIDTH FOR ACTION COLUMN */}
                            <th className="text-center" style={{ width: '8%' }}>
                              {creditViewMode === 'paid' ? 'Approved By' : 'Mark Paid'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentCreditSales.length > 0 ? (
                            currentCreditSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="text-left text-ellipsis" title={sale.date}>{sale.date}</td>
                                <td className="text-left font-weight-600 text-ellipsis" title={sale.product}>{sale.product}</td>
                                <td className="text-center text-ellipsis" title={sale.customerName}>{sale.customerName}</td>
                                <td className="text-center text-ellipsis" title={sale.soldBy}>{sale.soldBy || '-'}</td>
                                <td className="text-center text-ellipsis" title={sale.approvedBy}>{sale.approvedBy}</td>
                                <td className="text-center">{sale.quantity}</td>

                                {creditViewMode === 'paid' ? (
                                  <td className="text-center text-success font-weight-bold">
                                    {sale.total ? sale.total.toLocaleString() : '0'}
                                  </td>
                                ) : (
                                  <td className="text-center">
                                    {sale.daysRemaining !== null ? sale.daysRemaining : '-'}
                                  </td>
                                )}

                                <td className="text-center">
                                  <span style={{ fontWeight: 'bold', color: sale.status === 'Completed' ? 'green' : sale.status === 'Overdue' ? 'red' : 'orange' }}>
                                    {sale.status}
                                  </span>
                                </td>

                                {creditViewMode === 'paid' ? (
                                  <td className="text-center text-ellipsis" title={sale.paymentApprovedBy}>{sale.paymentApprovedBy}</td>
                                ) : (
                                  <td className="text-center">
                                    <input
                                      type="checkbox"
                                      checked={sale.isPaid}
                                      disabled={sale.isPaid}
                                      onChange={() => handleTogglePaid(sale.id)}
                                      style={{ cursor: sale.isPaid ? 'not-allowed' : 'pointer' }}
                                    />
                                  </td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="9" className="text-center">No credit sales found.</td></tr>
                          )}
                        </tbody>
                      </table>

                    </div>
                    {renderPagination(creditPage, totalCreditPages, setCreditPage)}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="fade-in">
                <h2 className="mb-20">Account Settings</h2>
                <div className="settings-grid-layout">
                  <div className="admin-card">
                    <div className="card-header-simple"><h3>Profile Information</h3></div>
                    <form onSubmit={handleProfileUpdate}>
                      <div className="card-body">
                        <div className="form-group"><label>Full Name</label><input type="text" className="form-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                        <div className="form-group"><label>Email Address</label><input type="email" className="form-input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
                      </div>
                      <div className="card-footer"><button type="submit" className="primary-btn">Update Profile</button></div>
                    </form>
                  </div>
                  <div className="admin-card">
                    <div className="card-header-simple"><h3>Change Password</h3></div>
                    <form onSubmit={handlePasswordChange}>
                      <div className="card-body">
                        {/* CURRENT PASSWORD */}
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label>Current Password</label>
                          <input 
                            type={showCurrentPass ? "text" : "password"} 
                            className="form-input" 
                            style={{ paddingRight: '40px' }}
                            value={passwords.current} 
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '38px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontSize: '22px', 
                            }}
                          >
                            {showCurrentPass ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>

                        {/* NEW PASSWORD */}
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label>New Password</label>
                          <input 
                            type={showNewPass ? "text" : "password"} 
                            className="form-input" 
                            style={{ paddingRight: '40px' }}
                            value={passwords.new} 
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowNewPass(!showNewPass)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '38px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontSize: '22px', 
                            }}
                          >
                             {showNewPass ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label>Confirm Password</label>
                          <input 
                            type={showConfirmPass ? "text" : "password"} 
                            className="form-input" 
                            style={{ paddingRight: '40px' }}
                            value={passwords.confirm} 
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '38px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontSize: '22px', 
                            }}
                            
                          >
                             {showConfirmPass ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </div>
                      <div className="card-footer"><button type="submit" className="primary-btn warning">Change Password</button></div>
                    </form>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}