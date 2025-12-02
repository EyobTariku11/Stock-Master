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
  
  // Date Filters
  const [salesDateFilter, setSalesDateFilter] = useState("");
  const [creditDateFilter, setCreditDateFilter] = useState(""); 

  // Credit View Mode (Active vs Overdue)
  const [creditViewMode, setCreditViewMode] = useState("active"); // 'active' or 'overdue'

  // Notification State with Persistence
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
    // Load acknowledged alerts from LocalStorage on initial render
    const saved = localStorage.getItem("acknowledgedAlerts");
    return saved ? JSON.parse(saved) : [];
  });

  // Save to LocalStorage whenever acknowledgedIds changes
  useEffect(() => {
    localStorage.setItem("acknowledgedAlerts", JSON.stringify(acknowledgedIds));
  }, [acknowledgedIds]);

  // Pagination State
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [creditPage, setCreditPage] = useState(1); 
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
  const [salesLog, setSalesLog] = useState([]); 
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
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to midnight

      const formattedSales = data.map(s => {
        // Calculate Days Remaining Logic
        let daysRem = null;
        if (s.creditDueDate || s.CreditDueDate) {
            const due = new Date(s.creditDueDate || s.CreditDueDate);
            due.setHours(0, 0, 0, 0);
            const diffTime = due - today;
            daysRem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          id: s.id || s.Id,
          product: s.productName || s.ProductName,
          quantity: s.quantity || s.Quantity,
          total: s.totalPrice || s.TotalPrice,
          // Transaction Date
          date: new Date(s.dateSold || s.DateSold).toLocaleString(),
          rawDate: s.dateSold || s.DateSold, 
          soldBy: s.soldBy || s.SoldBy,
          approvedBy: s.approvedBy || s.ApprovedBy, 
          // Credit Specifics
          salesType: s.salesType || s.SalesType || "Cash", 
          customerName: s.customerName || s.CustomerName || "-",
          // Map CreditDueDate from API
          creditDueDate: (s.creditDueDate || s.CreditDueDate) 
              ? new Date(s.creditDueDate || s.CreditDueDate).toLocaleDateString() 
              : "-",
          daysRemaining: daysRem
        };
      });
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

  // === CREDIT SALES LOGIC (Split into Active & Overdue) ===
  const allCreditSales = salesLog.filter(s => {
      const isCredit = s.salesType === 'Credit';
      const matchesDate = creditDateFilter ? s.rawDate.startsWith(creditDateFilter) : true;
      return isCredit && matchesDate;
  });

  // Filter 1: Active Credits (Days Remaining > 0)
  const activeCreditSales = allCreditSales.filter(s => s.daysRemaining !== null && s.daysRemaining > 0);
  
  // Filter 2: Overdue Credits (Days Remaining <= 0)
  const overdueCreditSales = allCreditSales.filter(s => s.daysRemaining !== null && s.daysRemaining <= 0);

  // Determine which list to show based on Toggle State
  const displayedCreditSales = creditViewMode === 'active' ? activeCreditSales : overdueCreditSales;

  // Pagination for Credits
  const totalCreditPages = Math.ceil(displayedCreditSales.length / itemsPerPage);
  const indexOfLastCredit = creditPage * itemsPerPage;
  const indexOfFirstCredit = indexOfLastCredit - itemsPerPage;
  const currentCreditSales = displayedCreditSales.slice(indexOfFirstCredit, indexOfLastCredit);

  // === NOTIFICATION LOGIC ===
  // Only alert for active items (not yet overdue) that are near due (<=3 days)
  // AND NOT in the acknowledged list
  const nearDueItems = activeCreditSales.filter(s => 
      s.daysRemaining <= 3 && 
      !acknowledgedIds.includes(s.id)
  );
  const nearDueCount = nearDueItems.length;

  // --- NOTIFICATION CLICK HANDLER ---
  const handleNotificationClick = () => {
    if (nearDueCount === 0) {
        Swal.fire({
            title: 'No New Alerts',
            text: 'There are no active credit payments due in the next 3 days that require attention.',
            icon: 'info',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }

    const listHtml = nearDueItems.map(item => `
        <div style="text-align: left; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
           <div style="font-weight: bold; color: #1f2937; font-size: 1.1rem;">${item.customerName}</div>
           <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
              <span>Product: ${item.product}</span>
              <span>Amt: <strong>${item.total} Birr</strong></span>
           </div>
           <div style="margin-top: 5px; color: #d97706; font-weight: 600; font-size: 0.9rem;">
              ⚠️ Due in ${item.daysRemaining} days
           </div>
        </div>
    `).join('');

    Swal.fire({
        title: '<strong>Upcoming Payments</strong>',
        html: `<div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">${listHtml}</div>`,
        icon: 'warning',
        showCloseButton: true,
        focusConfirm: false,
        confirmButtonText: 'Acknowledged',
        confirmButtonColor: '#3b82f6'
    }).then((result) => {
        if (result.isConfirmed) {
            // Add IDs to ignored list so they don't appear again
            const idsToIgnore = nearDueItems.map(i => i.id);
            setAcknowledgedIds(prev => [...prev, ...idsToIgnore]);
            
            Swal.fire({
                icon: 'success',
                title: 'Alerts Cleared',
                text: 'These alerts will not appear again.',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false
            });
        }
    });
  };

  const paginateInventory = (pageNumber) => setInventoryPage(pageNumber);
  const paginateSales = (pageNumber) => setSalesPage(pageNumber);
  const paginateCredit = (pageNumber) => setCreditPage(pageNumber);

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
      preConfirm: () => {
        const name = document.getElementById('swal-name').value;
        const cat = document.getElementById('swal-cat').value;
        const price = document.getElementById('swal-price').value;
        const stock = document.getElementById('swal-stock').value;

        if (!name || !price || !stock) {
            Swal.showValidationMessage('Please fill all fields');
            return false;
        }
        return [name, cat, price, stock];
      }
    });

    if (formValues) {
      const [name, cat, price, stock] = formValues;

      try {
        const res = await fetch("https://localhost:7262/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Name: name,
            Category: cat || "Uncategorized",
            Price: parseFloat(price),
            Stock: parseInt(stock),
            MinStock: 10
          })
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
        `<input id="swal-edit-name" class="swal2-input" value="${product.name}" placeholder="Name">` +
        `<input id="swal-edit-cat" class="swal2-input" value="${product.category}" placeholder="Category">` +
        `<input id="swal-edit-price" type="number" class="swal2-input" value="${product.price}" placeholder="Price">` +
        `<input id="swal-edit-min" type="number" class="swal2-input" value="${product.minStock}" placeholder="Min Stock">`,
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
      try {
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

        if (!res.ok) throw new Error("Failed to update details");
        fetchProducts();
        Swal.fire('Updated!', 'Product details saved.', 'success');
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // --- 3. STOCK ADJUSTMENT (Sell or Restock) ---
  const handleStockAdjustment = async (product, type) => {
    const isSale = type === 'sell';

    if (isSale) {
      const todayStr = new Date().toISOString().split('T')[0];

      const { value: formValues } = await Swal.fire({
        title: `<div class="modern-swal-title">New Transaction</div>`,
        html: `
          <div class="modern-form-wrapper">
             <div class="product-info-banner">
                <span>${product.name}</span>
                <span class="badge">In Stock: ${product.stock}</span>
             </div>

             <div class="form-grid">
                <div class="form-group">
                   <label>Quantity</label>
                   <input id="swal-qty" type="number" class="swal-modern-input" placeholder="0" max="${product.stock}">
                </div>
                <div class="form-group">
                   <label>Payment Type</label>
                   <select id="swal-type" class="swal-modern-input">
                     <option value="Cash">Cash</option>
                     <option value="Credit">Credit</option>
                   </select>
                </div>
                
                <div class="form-group full-width">
                   <label>Customer Name</label>
                   <input id="swal-customer" type="text" class="swal-modern-input" placeholder="Customer Name">
                </div>
                
                <div class="form-group">
                   <label>Due Date (Future Only)</label>
                   <input id="swal-credit-date" type="date" class="swal-modern-input" min="${todayStr}" disabled>
                </div>
                
                <div class="form-group">
                   <label>Salesperson</label>
                   <input id="swal-salesperson" type="text" class="swal-modern-input" value="${profile.name}">
                </div>
             </div>
          </div>
        `,
        customClass: {
            popup: 'modern-swal-popup'
        },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Complete Sale',
        
        didOpen: () => {
            const popup = Swal.getPopup();
            const typeSelect = popup.querySelector('#swal-type');
            const dateInput = popup.querySelector('#swal-credit-date');

            typeSelect.addEventListener('change', () => {
                const isCredit = typeSelect.value === 'Credit';
                if (isCredit) {
                    dateInput.disabled = false;
                } else {
                    dateInput.disabled = true;
                    dateInput.value = ''; 
                }
            });
        },

        preConfirm: () => {
          const qty = parseInt(document.getElementById('swal-qty').value);
          const type = document.getElementById('swal-type').value;
          const customer = document.getElementById('swal-customer').value;
          const creditDate = document.getElementById('swal-credit-date').value;
          const soldBy = document.getElementById('swal-salesperson').value;
    
          if (!qty || qty <= 0) return Swal.showValidationMessage('Invalid quantity');
          if (qty > product.stock) return Swal.showValidationMessage(`Insufficient stock. Only ${product.stock} available.`);
    
          if (type === 'Credit') {
              if (!customer) return Swal.showValidationMessage('Customer name required for credit sale');
              if (!creditDate) return Swal.showValidationMessage('Due date required for credit sale');
          }
    
          return { qty, type, customer, creditDate, soldBy };
        }
      });
    
      if (formValues) {
        try {
          const salePayload = {
            ProductId: product.id,
            Quantity: formValues.qty,
            SoldBy: formValues.soldBy,
            ApprovedBy: profile.name,
            SalesType: formValues.type,
            CustomerName: formValues.customer || null,
            CreditSaleDate: (formValues.type === 'Credit' && formValues.creditDate) ? formValues.creditDate : null 
          };
    
          const res = await fetch("https://localhost:7262/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(salePayload)
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Sale failed");
          
          Swal.fire({
            icon: 'success',
            title: 'Sale Successful',
            text: `Revenue: $${(formValues.qty * product.price).toLocaleString()}`,
            timer: 2000,
            showConfirmButton: false
          });
          
          fetchProducts();
          fetchSales();
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }

    } else {
      // === CASE 2: RESTOCKING ===
      const { value } = await Swal.fire({
        title: `Restock ${product.name}`,
        input: 'number',
        inputLabel: 'Enter amount to add',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Add Stock',
        inputValidator: (value) => { if (!value || value <= 0) return 'Invalid number!'; }
      });
      
      if (value) {
        try {
          const newStock = product.stock + parseInt(value);
          const res = await fetch(`https://localhost:7262/api/products/details/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Name: product.name,
              Category: product.category,
              Price: product.price,
              MinStock: product.minStock,
              Stock: newStock
            })
          });

          if (!res.ok) throw new Error("Failed to restock");
          
          Swal.fire('Restocked!', `${value} items added.`, 'success');
          fetchProducts();
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    }
  };

  // --- 4. DELETE PRODUCT ---
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

  // --- EXCEL DOWNLOAD ---
  const handleDownloadExcel = () => {
    const inventoryData = products.map(p => ({
      ID: p.id, Name: p.name, Category: p.category, Price: `$${p.price}`, Stock: p.stock, Status: p.status
    }));

    const salesDataToExport = salesDateFilter ? filteredSales : salesLog;
    const totalRevenue = salesDataToExport.reduce((sum, item) => sum + item.total, 0);
    const totalItemsSold = salesDataToExport.reduce((sum, item) => sum + item.quantity, 0);
    const reportDate = new Date().toLocaleString();

    const salesSheetData = [
      ["STOCKMASTER SALES REPORT"],
      [`Generated: ${reportDate}`],
      ["PERFORMANCE SUMMARY"],
      ["Total Revenue", "Total Items Sold"],
      [`$${totalRevenue.toLocaleString()}`, totalItemsSold],
      [""],
      ["TRANSACTION DETAILS"],
      ["ID", "Date", "Product", "Type", "Customer", "Sold By", "Qty", "Revenue"]
    ];

    salesDataToExport.forEach(s => {
      salesSheetData.push([
        s.id, s.date, s.product, s.salesType, s.customerName, s.soldBy, s.quantity, `$${s.total.toLocaleString()}`
      ]);
    });

    const wb = XLSX.utils.book_new();
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    const wsSales = XLSX.utils.aoa_to_sheet(salesSheetData); 
    const wscols = [{ wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
    wsSales['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales Report");
    XLSX.writeFile(wb, "StockMaster_Report.xlsx");
    
    Swal.fire({ icon: 'success', title: 'Report Downloaded', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  };

  // --- SETTINGS UPDATES ---
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
      
      setProfile({ name: data.fullName, email: data.email, id: loggedUser.id });
      localStorage.setItem("loggedInUser", JSON.stringify({ ...loggedUser, name: data.fullName, email: data.email }));
      Swal.fire('Success', 'Profile updated!', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  };

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
          
          {/* NOTIFICATION ICON WITH CLICK HANDLER */}
          <div 
             className="notification-wrapper" 
             onClick={handleNotificationClick} 
             style={{ marginRight: '15px', position: 'relative', cursor: 'pointer' }} 
             title={nearDueCount > 0 ? `${nearDueCount} Payments Due Soon` : "No pending alerts"}
          >
             <span style={{ fontSize: '1.2rem' }}>🔔</span>
             {nearDueCount > 0 && (
                 <span style={{
                     position: 'absolute',
                     top: '-5px',
                     right: '-5px',
                     background: '#ef4444',
                     color: 'white',
                     borderRadius: '50%',
                     width: '18px',
                     height: '18px',
                     fontSize: '0.7rem',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     fontWeight: 'bold'
                 }}>
                     {nearDueCount}
                 </span>
             )}
          </div>

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
            {/* CREDIT SALES TAB */}
            <button className={`nav-item ${activeView === 'credits' ? 'active' : ''}`} onClick={() => setActiveView('credits')}>
              <span className="icon">💳</span> Credit Sales
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
                  <div className="card-header-simple"><h2>Current Inventory</h2></div>
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
                                <td className="text-center">{p.price} Birr</td>
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
                                  <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                    <button className="icon-btn edit" onClick={() => handleEditProduct(p)}>✏️</button>
                                    <button className="icon-btn delete" onClick={() => handleDelete(p.id)}>🗑️</button>
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
                  <div><h2>Sales History</h2><p className="subtitle">Track every transaction.</p></div>
                  <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                    {/* Styled Date Picker for Filtering */}
                    <div className="date-input-wrapper" style={{display:'flex', alignItems:'center', background:'white', border:'1px solid #ddd', borderRadius:'6px', padding:'0 10px'}}>
                        <span style={{marginRight:'5px'}}>📅</span>
                        <input 
                            type="date" 
                            style={{ border:'none', outline:'none', padding:'8px 0', fontFamily:'inherit', color:'#4b5563' }} 
                            value={salesDateFilter} 
                            onChange={(e) => { setSalesDateFilter(e.target.value); setSalesPage(1); }} 
                        />
                    </div>
                    <button className="secondary-btn" onClick={handleDownloadExcel}>⬇ Report</button>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>All Transactions</h3>
                    <div className="stat-value text-success" style={{ fontSize: '1rem' }}>
                      Rev: {filteredSales.reduce((a, b) => a + b.total, 0).toLocaleString()} Birr
                    </div>
                  </div>
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
                                <td className="text-center">
                                    <span className={`category-tag ${sale.salesType === 'Credit' ? 'red-bg' : ''}`}>{sale.salesType}</span>
                                </td>
                                <td className="text-center">{sale.customerName}</td>
                                <td className="text-center">{sale.soldBy}</td>
                                <td className="text-center">{sale.approvedBy}</td> 
                                <td className="text-center">{sale.quantity}</td>
                                <td className="text-right text-success font-weight-bold">{sale.total.toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="8" className="text-center">No transactions found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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

            {/* --- VIEW 3: CREDIT SALES (UPDATED with TOGGLE) --- */}
            {activeView === 'credits' && (
              <div className="fade-in">
                <div className="section-header">
                  <div><h2>Credit Sales Management</h2><p className="subtitle">Track outstanding payments.</p></div>
                  <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                    
                    {/* CREDIT VIEW TOGGLE BUTTONS */}
                    <div style={{ display: 'flex', gap: '5px', background: '#e5e7eb', padding: '4px', borderRadius: '8px' }}>
                        <button 
                            onClick={() => { setCreditViewMode('active'); setCreditPage(1); }}
                            style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: creditViewMode === 'active' ? 'white' : 'transparent',
                                color: creditViewMode === 'active' ? '#4f46e5' : '#6b7280',
                                boxShadow: creditViewMode === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Active Credits
                        </button>
                        <button 
                             onClick={() => { setCreditViewMode('overdue'); setCreditPage(1); }}
                             style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: creditViewMode === 'overdue' ? '#fee2e2' : 'transparent',
                                color: creditViewMode === 'overdue' ? '#b91c1c' : '#6b7280',
                                boxShadow: creditViewMode === 'overdue' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Overdue / Past Due ⚠️
                        </button>
                    </div>

                    {/* CREDIT DATE PICKER */}
                    <div className="date-input-wrapper" style={{display:'flex', alignItems:'center', background:'white', border:'1px solid #ddd', borderRadius:'6px', padding:'0 10px'}}>
                        <span style={{marginRight:'5px'}}>📅</span>
                        <input 
                            type="date" 
                            style={{ border:'none', outline:'none', padding:'8px 0', fontFamily:'inherit', color:'#4b5563' }} 
                            value={creditDateFilter} 
                            onChange={(e) => { setCreditDateFilter(e.target.value); setCreditPage(1); }} 
                        />
                    </div>
                  
                  </div>
                </div>

                <div className="admin-card">
                  <div className="card-header-simple">
                      <h3 style={{ color: creditViewMode === 'overdue' ? '#b91c1c' : 'inherit' }}>
                          {creditViewMode === 'active' ? 'Current Outstanding Credits' : 'Overdue & Past Payments'}
                      </h3>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th className="text-left">Date Sold</th>
                            <th className="text-left">Customer Name</th>
                            <th className="text-left">Approved By</th> 
                            <th className="text-left">Product</th>
                            <th className="text-center">Due Date</th>
                            <th className="text-center">Days Remaining</th>
                            <th className="text-right">Amount Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentCreditSales.length > 0 ? (
                            currentCreditSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="text-left text-muted">{sale.date}</td>
                                <td className="text-left font-weight-600" style={{color: 'var(--primary)'}}>{sale.customerName}</td>
                                <td className="text-left">{sale.approvedBy}</td> 
                                <td className="text-left">{sale.product}</td>
                                <td className="text-center">
                                    <span style={{background:'#fee2e2', color:'#b91c1c', padding:'4px 8px', borderRadius:'4px', fontSize:'0.85rem', fontWeight:'600'}}>
                                        {sale.creditDueDate}
                                    </span>
                                </td>
                                <td className="text-center">
                                    {sale.daysRemaining === null ? '-' : (
                                        <span style={{
                                            color: sale.daysRemaining <= 0 ? '#b91c1c' : (sale.daysRemaining <= 3 ? '#d97706' : 'inherit'),
                                            fontWeight: 'bold'
                                        }}>
                                            {sale.daysRemaining <= 0 
                                                ? `Overdue (${Math.abs(sale.daysRemaining)} days ago)` 
                                                : `${sale.daysRemaining} Days`
                                            }
                                        </span>
                                    )}
                                </td>
                                <td className="text-right font-weight-bold">{sale.total.toLocaleString()} Birr</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="7" className="text-center">No {creditViewMode} credit records found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalCreditPages > 1 && (
                      <div className="pagination-container">
                        <button className="page-btn nav" onClick={() => paginateCredit(creditPage - 1)} disabled={creditPage === 1}>&lt;</button>
                        {[...Array(totalCreditPages)].map((_, i) => (
                          <button key={i} className={`page-btn ${creditPage === i + 1 ? 'active' : ''}`} onClick={() => paginateCredit(i + 1)}>{i + 1}</button>
                        ))}
                        <button className="page-btn nav" onClick={() => paginateCredit(creditPage + 1)} disabled={creditPage === totalCreditPages}>&gt;</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- VIEW 4: SETTINGS --- */}
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
                        <div className="form-group"><label>Current Password</label><input type="password" className="form-input" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /></div>
                        <div className="form-group"><label>New Password</label><input type="password" className="form-input" placeholder="Min 6 characters" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} /></div>
                        <div className="form-group"><label>Confirm Password</label><input type="password" className="form-input" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></div>
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