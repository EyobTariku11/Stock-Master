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
  const [salesDateFilter, setSalesDateFilter] = useState("");

  // Pagination State
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const itemsPerPage = 5;

  // Profile State
  const [profile, setProfile] = useState(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    return storedUser
      ? JSON.parse(storedUser)
      : { name: "Stock Manager", email: "manager@stockmaster.com", status: "active" };
  });

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // --- DATA STATE ---
  const [products, setProducts] = useState([]); 
  const [salesLog, setSalesLog] = useState([]); // Fetched from API
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. FETCH DATA (Products & Sales) ---
  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await fetch("https://localhost:7262/api/products");
      if (!res.ok) throw new Error("Failed to connect to server");
      
      const data = await res.json();
      
      // Map API data (PascalCase) to UI data (camelCase)
      const formattedProducts = data.map(p => ({
        id: p.id || p.Id,
        name: p.name || p.Name,
        category: p.category || p.Category || "Uncategorized",
        price: p.price || p.Price,
        stock: p.stock || p.Stock,
        minStock: p.minStock || p.MinStock || 10,
        status: (p.stock || p.Stock) === 0 ? "Out of Stock" : (p.stock || p.Stock) <= (p.minStock || p.MinStock || 10) ? "Low Stock" : "In Stock"
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Could not load products. Is the backend running?',
        toast: true, position: 'top-end', timer: 3000, showConfirmButton: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Sales History
  const fetchSales = async () => {
    try {
      const res = await fetch("https://localhost:7262/api/sales");
      if (!res.ok) return;
      const data = await res.json();
      
      const formattedSales = data.map(s => ({
        id: s.id || s.Id,
        product: s.productName || s.ProductName,
        quantity: s.quantity || s.Quantity,
        total: s.totalPrice || s.TotalPrice,
        date: new Date(s.dateSold || s.DateSold).toLocaleString(),
        rawDate: s.dateSold || s.DateSold, // For filtering
        soldBy: s.soldBy || s.SoldBy,
        approvedBy: s.approvedBy || s.ApprovedBy
      }));
      setSalesLog(formattedSales);
    } catch (err) {
      console.error("Sales fetch error", err);
    }
  };

  // --- CHECK USER STATUS ---
  useEffect(() => {
    const checkStatus = async () => {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!user) return;
      try {
        const res = await fetch(`https://localhost:7262/api/auth/user-status/${user.id}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.status || data.status.toLowerCase() !== "active") {
          localStorage.removeItem("loggedInUser");
          Swal.fire({ icon: "error", title: "Access Revoked", text: "Your account has been deactivated.", allowOutsideClick: false })
            .then(() => navigate("/login"));
        }
      } catch (err) { console.error("Status check failed:", err); }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, [navigate]);
  
  // --- RESPONSIVE SIDEBAR ---
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- CALCULATIONS & FILTERING ---
  const totalRevenue = salesLog.reduce((acc, sale) => acc + sale.total, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  // Inventory Logic
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalInventoryPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastProd = inventoryPage * itemsPerPage;
  const indexOfFirstProd = indexOfLastProd - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProd, indexOfLastProd);

  // Sales Logic
  const filteredSales = salesLog.filter(sale => {
    if (!salesDateFilter) return true;
    return sale.rawDate.startsWith(salesDateFilter);
  });
  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);
  const indexOfLastSale = salesPage * itemsPerPage;
  const indexOfFirstSale = indexOfLastSale - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  const paginateInventory = (pageNumber) => setInventoryPage(pageNumber);
  const paginateSales = (pageNumber) => setSalesPage(pageNumber);

  // --- 2. ADD PRODUCT (POST API) ---
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
      if (!name || !price || !stock) return Swal.fire('Error', 'Please fill all fields', 'error');

      const payload = {
        Name: name,
        Category: cat || "Uncategorized",
        Price: parseFloat(price),
        Stock: parseInt(stock),
        MinStock: 10
      };

      try {
        const res = await fetch("https://localhost:7262/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to add product");

        fetchProducts(); 
        Swal.fire('Success', `${name} added to database.`, 'success');

      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // --- 2.5 EDIT PRODUCT (PUT API) ---
  const handleEditProduct = async (product) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Product',
      html:
        `<div style="text-align:left; margin-bottom:5px; font-size:0.9rem;">Product Name</div>` +
        `<input id="swal-edit-name" class="swal2-input" value="${product.name}" style="margin-top:0;">` +
        
        `<div style="text-align:left; margin-bottom:5px; margin-top:10px; font-size:0.9rem;">Category</div>` +
        `<input id="swal-edit-cat" class="swal2-input" value="${product.category}" style="margin-top:0;">` +
        
        `<div style="text-align:left; margin-bottom:5px; margin-top:10px; font-size:0.9rem;">Price ($)</div>` +
        `<input id="swal-edit-price" type="number" class="swal2-input" value="${product.price}" style="margin-top:0;">` +
        
        `<div style="text-align:left; margin-bottom:5px; margin-top:10px; font-size:0.9rem;">Min Stock Alert Level</div>` +
        `<input id="swal-edit-min" type="number" class="swal2-input" value="${product.minStock}" style="margin-top:0;">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#3b82f6',
      preConfirm: () => [
        document.getElementById('swal-edit-name').value,
        document.getElementById('swal-edit-cat').value,
        document.getElementById('swal-edit-price').value,
        document.getElementById('swal-edit-min').value
      ]
    });

    if (formValues) {
      const [name, cat, price, minStock] = formValues;
      
      if (!name || !price) return Swal.fire('Error', 'Name and Price are required', 'error');

      try {
        // Call the new "details" endpoint
        const res = await fetch(`https://localhost:7262/api/products/details/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Name: name,
            Category: cat || "Uncategorized",
            Price: parseFloat(price),
            MinStock: parseInt(minStock) || 10
          })
        });

        if (!res.ok) throw new Error("Failed to update product details");

        fetchProducts(); // Refresh list
        Swal.fire('Updated!', 'Product details saved.', 'success');

      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // --- 3. STOCK ADJUSTMENT (Sell or Restock) ---
  const handleStockAdjustment = async (product, type) => {
    const isSale = type === 'sell';
    let quantity, soldBy;

    // UI Input Logic
    if (isSale) {
      const { value: formValues } = await Swal.fire({
        title: `Sell ${product.name}`,
        html: `
            <div style="text-align:left; font-size:0.9rem; font-weight:600; margin-bottom:5px; color:#64748b;">Quantity Sold (Max: ${product.stock})</div>
            <input id="swal-qty" type="number" class="swal2-input" placeholder="Enter quantity" style="margin-top:0;">
            <div style="text-align:left; font-size:0.9rem; font-weight:600; margin-bottom:5px; margin-top:15px; color:#64748b;">Sold By</div>
            <input id="swal-salesperson" type="text" class="swal2-input" value="${profile.name}" style="margin-top:0;">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Confirm Sale',
        preConfirm: () => {
          const q = document.getElementById('swal-qty').value;
          const s = document.getElementById('swal-salesperson').value;
          if (!q || q <= 0 || parseInt(q) > product.stock) return Swal.showValidationMessage('Invalid quantity');
          if (!s) return Swal.showValidationMessage('Please enter salesperson name');
          return [q, s];
        }
      });
      if (formValues) { quantity = parseInt(formValues[0]); soldBy = formValues[1]; }
    } else {
      const { value } = await Swal.fire({
        title: `Restock ${product.name}`,
        input: 'number',
        inputLabel: 'Enter amount to add',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Add Stock',
        inputValidator: (value) => { if (!value || value <= 0) return 'Invalid number!'; }
      });
      if (value) quantity = parseInt(value);
    }

    // API Execution Logic
    if (quantity) {
      try {
        if (isSale) {
          // --- CALL SALES API (Records Sale + Deducts Stock) ---
          const salePayload = {
            ProductId: product.id,
            Quantity: quantity,
            SoldBy: soldBy,
            ApprovedBy: profile.name // User from profile state
          };

          const res = await fetch("https://localhost:7262/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(salePayload)
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Sale failed");

          const revenue = quantity * product.price;
          Swal.fire('Sold!', `Revenue: $${revenue.toLocaleString()}`, 'success');

        } else {
          // --- CALL PRODUCTS API (Restock Only) ---
          const newStockLevel = product.stock + quantity;
          const res = await fetch(`https://localhost:7262/api/products/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
               id: product.id, 
               name: product.name,
               newStock: newStockLevel 
            })
          });

          if (!res.ok) throw new Error("Failed to update stock");
          Swal.fire('Restocked!', 'Inventory updated.', 'success');
        }

        // Refresh both tables to reflect changes
        fetchProducts();
        fetchSales();

      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // --- 4. DELETE PRODUCT (DELETE API) ---
  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete Product?', text: "Irreversible action.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`https://localhost:7262/api/products/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete product");
          
          fetchProducts();
          Swal.fire('Deleted!', 'Product removed from database.', 'success');
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  };

  // --- EXCEL DOWNLOAD (With Approved By) ---
  const handleDownloadExcel = () => {
    // 1. Prepare Inventory Sheet
    const inventoryData = products.map(p => ({
      ID: p.id,
      Name: p.name,
      Category: p.category,
      Price: `$${p.price}`,
      Stock: p.stock,
      Status: p.status
    }));

    // 2. Prepare Sales Sheet
    const salesDataToExport = salesDateFilter ? filteredSales : salesLog;
    const totalRevenue = salesDataToExport.reduce((sum, item) => sum + item.total, 0);
    const totalItemsSold = salesDataToExport.reduce((sum, item) => sum + item.quantity, 0);
    const reportDate = new Date().toLocaleString();

    const salesSheetData = [
      ["STOCKMASTER SALES REPORT"],
      [`Generated: ${reportDate}`],
      [`Filter Applied: ${salesDateFilter ? salesDateFilter : "All Time"}`],
      [""],
      ["PERFORMANCE SUMMARY"],
      ["Total Revenue", "Total Items Sold", "Transactions Count"],
      [`$${totalRevenue.toLocaleString()}`, totalItemsSold, salesDataToExport.length],
      [""],
      ["TRANSACTION DETAILS"],
      ["ID", "Date", "Product", "Sold By", "Approved By", "Qty", "Revenue"] // Header Row
    ];

    salesDataToExport.forEach(s => {
      salesSheetData.push([
        s.id,
        s.date,
        s.product,
        s.soldBy,
        s.approvedBy,
        s.quantity,
        `$${s.total.toLocaleString()}`
      ]);
    });

    const wb = XLSX.utils.book_new();
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    const wsSales = XLSX.utils.aoa_to_sheet(salesSheetData); 

    const wscols = [{ wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
    wsSales['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales Report");
    XLSX.writeFile(wb, "StockMaster_Report.xlsx");
    
    Swal.fire({ icon: 'success', title: 'Report Downloaded', text: 'Excel file generated with enhanced formatting.', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  };

  // --- SETTINGS: PROFILE UPDATE ---
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedUser || !loggedUser.id) {
       if(profile.email === "manager@stockmaster.com") { Swal.fire('Success', 'Profile updated (Mock)!', 'success'); return; }
       return Swal.fire('Error', 'User not found.', 'error');
    }
    try {
      const response = await fetch(`https://localhost:7262/api/auth/update-profile/${loggedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profile.name, email: profile.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed");
      
      // Update State and Local Storage
      setProfile({ name: data.fullName, email: data.email, id: loggedUser.id });
      localStorage.setItem("loggedInUser", JSON.stringify({ ...loggedUser, name: data.fullName, email: data.email }));
      
      Swal.fire('Success', 'Profile updated!', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  };

  // --- SETTINGS: PASSWORD CHANGE ---
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return Swal.fire('Error', 'Passwords mismatch', 'error');
    
    const loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if(!loggedUser?.id && profile.email === "manager@stockmaster.com") {
        setPasswords({ current: "", new: "", confirm: "" });
        return Swal.fire('Success', 'Password changed (Mock)!', 'success');
    }
    
    try {
      const response = await fetch(`https://localhost:7262/api/auth/change-password/${loggedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
      });
      if (!response.ok) throw new Error("Failed to change password");
      
      setPasswords({ current: "", new: "", confirm: "" });
      Swal.fire('Success', 'Password changed!', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  };

  const handleLogout = () => {
    Swal.fire({ title: 'Sign Out?', icon: 'question', showCancelButton: true, confirmButtonText: 'Log Out' })
      .then((res) => { if (res.isConfirmed) { localStorage.removeItem("loggedInUser"); navigate('/login'); } });
  };

  // --- RENDER COMPONENT ---
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
            <div className="text-info">
              <span className="name">{profile.name}</span>
              <span className="role">Manager</span>
            </div>
            <div className="avatar">{profile.name.split(' ').map(n => n[0]).join('')}</div>
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
                    <div><div className="stat-label">Total Products</div><div className="stat-value">{isLoading ? "..." : products.length}</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper red">⚠️</div>
                    <div><div className="stat-label">Critical Stock</div><div className="stat-value">{isLoading ? "..." : lowStockCount}</div></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper green">💵</div>
                    <div><div className="stat-label">Total Revenue</div><div className="stat-value">{totalRevenue.toLocaleString()} Birr</div></div>
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
                          {isLoading ? (
                             <tr><td colSpan="6" className="text-center" style={{padding:"20px"}}>Loading Data...</td></tr>
                          ) : currentProducts.length > 0 ? (
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
                                  {/* EDIT AND DELETE BUTTONS */}
                                  <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                    <button className="icon-btn edit" title="Edit" style={{backgroundColor: '#3b82f6', color:'white', padding:'4px 6px', borderRadius:'4px', border:'none', cursor:'pointer'}} onClick={() => handleEditProduct(p)}>
                                        ✏️
                                    </button>
                                    <button className="icon-btn delete" title="Delete" onClick={() => handleDelete(p.id)}>
                                        🗑️
                                    </button>
                                  </div>
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
                        <button className="page-btn nav" onClick={() => paginateInventory(inventoryPage - 1)} disabled={inventoryPage === 1}>&lt;</button>
                        {[...Array(totalInventoryPages)].map((_, i) => (
                          <button key={i} className={`page-btn ${inventoryPage === i + 1 ? 'active' : ''}`} onClick={() => paginateInventory(i + 1)}>{i + 1}</button>
                        ))}
                        <button className="page-btn nav" onClick={() => paginateInventory(inventoryPage + 1)} disabled={inventoryPage === totalInventoryPages}>&gt;</button>
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
                  <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" className="form-input" style={{ width: 'auto', padding: '8px 12px' }} value={salesDateFilter} onChange={(e) => { setSalesDateFilter(e.target.value); setSalesPage(1); }} />
                    <button className="secondary-btn" onClick={handleDownloadExcel}>⬇ Download Report</button>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{salesDateFilter ? `Transactions on ${salesDateFilter}` : 'All Transactions'}</h3>
                    <div className="stat-value text-success" style={{ fontSize: '1rem' }}>
                      Revenue:  {filteredSales.reduce((a, b) => a + b.total, 0).toLocaleString()} Birr
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
                                <td className="text-center"><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{sale.approvedBy}</span></td>
                                <td className="text-center">{sale.quantity}</td>
                                <td className="text-right text-success font-weight-bold">{sale.total.toLocaleString()} Birr</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="6" className="text-center">No transactions found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Sales */}
                    {totalSalesPages > 1 && (
                      <div className="pagination-container">
                        <button className="page-btn nav" onClick={() => paginateSales(salesPage - 1)} disabled={salesPage === 1}>&lt;</button>
                        {[...Array(totalSalesPages)].map((_, i) => (
                          <button key={i} className={`page-btn ${salesPage === i + 1 ? 'active' : ''}`} onClick={() => paginateSales(i + 1)}>{i + 1}</button>
                        ))}
                        <button className="page-btn nav" onClick={() => paginateSales(salesPage + 1)} disabled={salesPage === totalSalesPages}>&gt;</button>
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
                          <input type="text" className="form-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Email Address</label>
                          <input type="email" className="form-input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
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
                          <input type="password" className="form-input" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>New Password</label>
                          <input type="password" className="form-input" placeholder="Min 6 characters" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Confirm Password</label>
                          <input type="password" className="form-input" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
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