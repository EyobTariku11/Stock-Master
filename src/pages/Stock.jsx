import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import '../../css/Stock.css'; 

export default function AdminStocks() {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState("inventory"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Date Filter State for Sales
  const [salesDateFilter, setSalesDateFilter] = useState("");

  // --- PAGINATION STATE ---
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const itemsPerPage = 5;

  // Settings State (Used for 'Approved By')
  const [profile, setProfile] = useState({ name: "Stock Manager", email: "manager@stockmaster.com" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // --- DATA STATE ---
  const [products, setProducts] = useState([
    { id: 101, name: "Nike Air Max", category: "Footwear", price: 120, stock: 45, minStock: 10, status: "In Stock" },
    { id: 102, name: "Gaming Mouse", category: "Electronics", price: 55, stock: 8, minStock: 15, status: "Low Stock" },
    { id: 103, name: "Cotton T-Shirt", category: "Clothing", price: 25, stock: 200, minStock: 50, status: "In Stock" },
    { id: 104, name: "Mechanical Keyboard", category: "Electronics", price: 150, stock: 0, minStock: 5, status: "Out of Stock" },
    { id: 105, name: "Coffee Maker", category: "Home", price: 89, stock: 24, minStock: 10, status: "In Stock" },
    { id: 106, name: "Wireless Headset", category: "Electronics", price: 89, stock: 15, minStock: 5, status: "In Stock" },
    { id: 107, name: "Yoga Mat", category: "Fitness", price: 20, stock: 50, minStock: 10, status: "In Stock" },
    { id: 108, name: "Running Shoes", category: "Footwear", price: 95, stock: 4, minStock: 5, status: "Low Stock" },
  ]);

  const [salesLog, setSalesLog] = useState([
    { id: 1, product: "Nike Air Max", quantity: 2, total: 240, date: "2025-11-28 10:30 AM", soldBy: "John Doe", approvedBy: "Stock Manager" },
    { id: 2, product: "Cotton T-Shirt", quantity: 5, total: 125, date: "2025-11-27 02:15 PM", soldBy: "Jane Smith", approvedBy: "Admin User" },
    { id: 3, product: "Gaming Mouse", quantity: 1, total: 55, date: "2025-11-26 09:00 AM", soldBy: "Mike Ross", approvedBy: "Stock Manager" },
    { id: 4, product: "Coffee Maker", quantity: 1, total: 89, date: "2025-11-25 04:30 PM", soldBy: "John Doe", approvedBy: "Admin User" },
    { id: 5, product: "Yoga Mat", quantity: 2, total: 40, date: "2025-11-25 11:20 AM", soldBy: "Jane Smith", approvedBy: "Stock Manager" },
    { id: 6, product: "Nike Air Max", quantity: 1, total: 120, date: "2025-11-24 01:10 PM", soldBy: "Mike Ross", approvedBy: "Stock Manager" },
  ]);

  // Responsive Sidebar
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- CALCULATIONS ---
  const totalRevenue = salesLog.reduce((acc, sale) => acc + sale.total, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  // --- FILTERING & PAGINATION LOGIC ---
  
  // 1. Inventory Logic
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastProd = inventoryPage * itemsPerPage;
  const indexOfFirstProd = indexOfLastProd - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProd, indexOfLastProd);
  const totalInventoryPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginateInventory = (pageNumber) => setInventoryPage(pageNumber);

  // 2. Sales Logic (With Date Filter)
  const filteredSales = salesLog.filter(sale => {
    if (!salesDateFilter) return true;
    return sale.date.startsWith(salesDateFilter);
  });

  const indexOfLastSale = salesPage * itemsPerPage;
  const indexOfFirstSale = indexOfLastSale - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);
  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);

  const paginateSales = (pageNumber) => setSalesPage(pageNumber);

  // --- HANDLERS ---

  const handleAddProduct = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Product',
      html:
        '<input id="swal-name" class="swal2-input" placeholder="Product Name">' +
        '<input id="swal-cat" class="swal2-input" placeholder="Category">' +
        '<input id="swal-price" type="number" class="swal2-input" placeholder="Price ($)">' +
        '<input id="swal-stock" type="number" class="swal2-input" placeholder="Initial Stock">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add Product',
      confirmButtonColor: '#4f46e5',
      preConfirm: () => [
        document.getElementById('swal-name').value,
        document.getElementById('swal-cat').value,
        document.getElementById('swal-price').value,
        document.getElementById('swal-stock').value
      ]
    });

    if (formValues) {
      const [name, cat, price, stock] = formValues;
      if(!name || !price || !stock) return Swal.fire('Error', 'Please fill all fields', 'error');

      const newProduct = {
        id: Date.now(),
        name: name,
        category: cat || "Uncategorized",
        price: parseFloat(price),
        stock: parseInt(stock),
        minStock: 10,
        status: parseInt(stock) > 10 ? "In Stock" : "Low Stock"
      };

      setProducts([newProduct, ...products]);
      Swal.fire('Success', `${name} added.`, 'success');
    }
  };

  const handleStockAdjustment = async (product, type) => {
    const isSale = type === 'sell';
    
    let quantity, soldBy;

    // --- CASE 1: SELLING (MINUS) ---
    if (isSale) {
        const { value: formValues } = await Swal.fire({
            title: `Sell ${product.name}`,
            html: `
                <div style="text-align:left; font-size:0.9rem; font-weight:600; margin-bottom:5px; color:#64748b;">Quantity Sold (Max: ${product.stock})</div>
                <input id="swal-qty" type="number" class="swal2-input" placeholder="Enter quantity" style="margin-top:0;">
                <div style="text-align:left; font-size:0.9rem; font-weight:600; margin-bottom:5px; margin-top:15px; color:#64748b;">Sold By (Salesperson)</div>
                <input id="swal-salesperson" type="text" class="swal2-input" placeholder="Enter name" style="margin-top:0;">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Confirm Sale',
            preConfirm: () => {
                const q = document.getElementById('swal-qty').value;
                const s = document.getElementById('swal-salesperson').value;
                if (!q || q <= 0) return Swal.showValidationMessage('Please enter a valid quantity');
                if (parseInt(q) > product.stock) return Swal.showValidationMessage('Insufficient stock!');
                if (!s) return Swal.showValidationMessage('Please enter salesperson name');
                return [q, s];
            }
        });
        
        if (formValues) {
            quantity = parseInt(formValues[0]);
            soldBy = formValues[1];
        }

    // --- CASE 2: RESTOCKING (PLUS) ---
    } else {
        const { value } = await Swal.fire({
            title: `Restock ${product.name}`,
            input: 'number',
            inputLabel: 'Enter amount to add',
            inputPlaceholder: 'Enter quantity',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Add Stock',
            inputValidator: (value) => {
                if (!value || value <= 0) return 'Invalid number!';
            }
        });
        if (value) quantity = parseInt(value);
    }

    // --- UPDATE STATE IF QUANTITY EXISTS ---
    if (quantity) {
      const updatedProducts = products.map(p => {
        if (p.id === product.id) {
          const newStock = isSale ? p.stock - quantity : p.stock + quantity;
          let newStatus = newStock === 0 ? "Out of Stock" : (newStock <= p.minStock ? "Low Stock" : "In Stock");
          return { ...p, stock: newStock, status: newStatus };
        }
        return p;
      });
      setProducts(updatedProducts);

      if (isSale) {
        // Date formatting
        const now = new Date();
        const dateString = now.toISOString().split('T')[0] + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const saleTotal = quantity * product.price;
        const newSale = {
          id: Date.now(),
          product: product.name,
          quantity: quantity,
          total: saleTotal,
          date: dateString,
          soldBy: soldBy,
          approvedBy: profile.name // Auto-filled from login state
        };
        setSalesLog([newSale, ...salesLog]);
        Swal.fire('Sold!', `Revenue: $${saleTotal.toLocaleString()}`, 'success');
      } else {
        Swal.fire('Restocked!', 'Inventory updated.', 'success');
      }
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete Product?', text: "Irreversible action.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        setProducts(products.filter(p => p.id !== id));
        Swal.fire('Deleted!', 'Product removed.', 'success');
      }
    });
  };

  // --- EXCEL EXPORT (Updated with new columns) ---
  const handleDownloadExcel = () => {
    const inventoryData = products.map(p => ({
        ID: p.id,
        Name: p.name,
        Category: p.category,
        Price: p.price,
        Stock: p.stock,
        Status: p.status
    }));

    const salesDataToExport = salesDateFilter ? filteredSales : salesLog;
    
    const salesData = salesDataToExport.map(s => ({
        TransactionID: s.id,
        Date: s.date,
        Product: s.product,
        Quantity: s.quantity,
        TotalRevenue: s.total,
        SoldBy: s.soldBy,        // New Column
        ApprovedBy: s.approvedBy // New Column
    }));

    const wb = XLSX.utils.book_new();
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    const wsSales = XLSX.utils.json_to_sheet(salesData);

    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales Report");

    XLSX.writeFile(wb, "StockMaster_Report.xlsx");
    Swal.fire({ icon: 'success', title: 'Report Downloaded', text: salesDateFilter ? 'Included filtered sales only.' : 'Included all sales records.', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  };

  // --- SETTINGS HANDLERS ---
  const handleProfileUpdate = (e) => {
    e.preventDefault();
    Swal.fire('Profile Updated', `Saved changes for ${profile.name}`, 'success');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      return Swal.fire('Error', 'Please fill all password fields', 'error');
    }
    if (passwords.new !== passwords.confirm) {
      return Swal.fire('Error', 'New passwords do not match', 'error');
    }
    if (passwords.new.length < 6) {
      return Swal.fire('Error', 'Password must be at least 6 characters', 'error');
    }
    setPasswords({ current: "", new: "", confirm: "" });
    Swal.fire('Success', 'Password has been changed successfully', 'success');
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Sign Out?', icon: 'question', showCancelButton: true, confirmButtonText: 'Log Out'
    }).then((res) => {
      if(res.isConfirmed) navigate('/login');
    });
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="top-header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div className="brand-logo"><span className="logo-icon">📦</span> StockMaster</div>
        </div>
        <div className="header-right">
          <div className="admin-profile">
            <div className="text-info"><span className="name">{profile.name}</span><span className="role">Manager</span></div>
            <div className="avatar">SM</div>
          </div>
          <button className="header-logout-btn" onClick={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      <div className="main-body">
        {/* SIDEBAR */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeView === 'inventory' ? 'active' : ''}`} onClick={() => setActiveView('inventory')}>
              <span className="icon">📦</span> Inventory
            </button>
            <button className={`nav-item ${activeView === 'sales' ? 'active' : ''}`} onClick={() => setActiveView('sales')}>
              <span className="icon">💰</span> Sales History
            </button>
            <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>
              <span className="icon">⚙️</span> Settings
            </button>
          </nav>
          <div className="sidebar-footer"><p>&copy; 2025 StockMaster</p></div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="main-content">
          <div className="content-wrapper">
            
            {/* --- VIEW 1: INVENTORY --- */}
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
                    <div><div className="stat-label">Total Revenue</div><div className="stat-value">${totalRevenue.toLocaleString()}</div></div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-header-simple">
                    <h2>Current Inventory</h2>
                  </div>
                  <div className="card-body">
                    <div className="table-controls">
                      <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setInventoryPage(1); }} />
                      </div>
                      <div className="action-buttons-group">
                        <button className="secondary-btn" onClick={handleDownloadExcel}>⬇ Excel Report</button>
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
                                <td className="text-center">${p.price}</td>
                                <td className="text-center">
                                  <div className="stock-control">
                                    <button className="stock-btn minus" onClick={() => handleStockAdjustment(p, 'sell')}>-</button>
                                    <span className={`stock-value ${p.stock <= p.minStock ? 'low' : ''}`}>{p.stock}</span>
                                    <button className="stock-btn plus" onClick={() => handleStockAdjustment(p, 'restock')}>+</button>
                                  </div>
                                  </td>
                                  <td className="text-center">
                                    <span className={`status-badge ${p.status.toLowerCase().replace(/\s/g, '-')}`}>{p.status}</span>
                                  </td>
                                  <td className="text-right">
                                    <button className="icon-btn delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                                  </td>
                                </tr>
                            ))
                          ) : (
                            <tr><td colSpan="6" className="text-center">No products found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Inventory */}
                    {totalInventoryPages > 1 && (
                      <div className="pagination-container">
                        <button 
                          className="page-btn nav" 
                          onClick={() => paginateInventory(inventoryPage - 1)} 
                          disabled={inventoryPage === 1}
                        >
                          &lt;
                        </button>
                        {[...Array(totalInventoryPages)].map((_, i) => (
                          <button 
                            key={i} 
                            className={`page-btn ${inventoryPage === i + 1 ? 'active' : ''}`}
                            onClick={() => paginateInventory(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          className="page-btn nav" 
                          onClick={() => paginateInventory(inventoryPage + 1)} 
                          disabled={inventoryPage === totalInventoryPages}
                        >
                          &gt;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- VIEW 2: SALES HISTORY --- */}
            {activeView === 'sales' && (
              <div className="fade-in">
                <div className="section-header">
                  <div>
                    <h2>Sales History</h2>
                    <p className="subtitle">Track every transaction made from the inventory.</p>
                  </div>
                  <div className="header-actions" style={{display:'flex', gap:'10px'}}>
                     {/* Date Filter Input */}
                     <input 
                        type="date" 
                        className="form-input" 
                        style={{width: 'auto', padding: '8px 12px'}}
                        value={salesDateFilter}
                        onChange={(e) => { setSalesDateFilter(e.target.value); setSalesPage(1); }}
                     />
                     <button className="secondary-btn" onClick={handleDownloadExcel}>⬇ Download Report</button>
                  </div>
                </div>

                <div className="admin-card">
                   <div className="card-header-simple" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h3>{salesDateFilter ? `Transactions on ${salesDateFilter}` : 'All Transactions'}</h3>
                      <div className="stat-value text-success" style={{fontSize: '1rem'}}>
                          Revenue: ${filteredSales.reduce((a,b)=>a+b.total, 0).toLocaleString()}
                      </div>
                   </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th className="text-left">Date</th>
                            <th className="text-left">Product Name</th>
                            <th className="text-center">Sold By</th>
                            <th className="text-center">Approved By</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSales.length > 0 ? (
                            currentSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="text-left text-muted">{sale.date}</td>
                                <td className="text-left font-weight-600">{sale.product}</td>
                                <td className="text-center">{sale.soldBy || "-"}</td>
                                <td className="text-center"><span style={{background:'#f1f5f9', padding:'2px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>{sale.approvedBy}</span></td>
                                <td className="text-center">{sale.quantity}</td>
                                <td className="text-right text-success font-weight-bold">+${sale.total.toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="6" className="text-center">No transactions found {salesDateFilter && 'for this date'}.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Sales */}
                    {totalSalesPages > 1 && (
                      <div className="pagination-container">
                        <button 
                          className="page-btn nav" 
                          onClick={() => paginateSales(salesPage - 1)} 
                          disabled={salesPage === 1}
                        >
                          &lt;
                        </button>
                        {[...Array(totalSalesPages)].map((_, i) => (
                          <button 
                            key={i} 
                            className={`page-btn ${salesPage === i + 1 ? 'active' : ''}`}
                            onClick={() => paginateSales(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          className="page-btn nav" 
                          onClick={() => paginateSales(salesPage + 1)} 
                          disabled={salesPage === totalSalesPages}
                        >
                          &gt;
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* --- VIEW 3: SETTINGS --- */}
            {activeView === 'settings' && (
              <div className="fade-in">
                <h2 className="mb-20">Account Settings</h2>
                <div className="settings-grid-layout">
                  
                  {/* Profile Form */}
                  <div className="admin-card">
                    <div className="card-header-simple"><h3>Profile Information</h3></div>
                    <form onSubmit={handleProfileUpdate}>
                      <div className="card-body">
                        <div className="form-group">
                          <label>Full Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={profile.name}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email Address</label>
                          <input 
                            type="email" 
                            className="form-input" 
                            value={profile.email}
                            onChange={(e) => setProfile({...profile, email: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="card-footer">
                        <button type="submit" className="primary-btn">Update Profile</button>
                      </div>
                    </form>
                  </div>

                  {/* Password Form */}
                  <div className="admin-card">
                    <div className="card-header-simple"><h3>Change Password</h3></div>
                    <form onSubmit={handlePasswordChange}>
                      <div className="card-body">
                        <div className="form-group">
                          <label>Current Password</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            value={passwords.current}
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>New Password</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            placeholder="Min 6 characters"
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Confirm Password</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="card-footer">
                        <button type="submit" className="primary-btn warning">Change Password</button>
                      </div>
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