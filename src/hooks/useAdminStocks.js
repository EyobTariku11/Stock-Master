import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

export const useAdminStocks = () => {
  const navigate = useNavigate();

  // --- 1. STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState("inventory");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Data Containers
  const [products, setProducts] = useState([]);
  const [salesLog, setSalesLog] = useState([]);

  // Pagination & Filters
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [creditPage, setCreditPage] = useState(1);
  const itemsPerPage = 5;

  const [salesDateFilter, setSalesDateFilter] = useState("");
  const [creditDateFilter, setCreditDateFilter] = useState("");
  const [creditViewMode, setCreditViewMode] = useState("active"); 

  // User Profile
  const [profile, setProfile] = useState(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    return storedUser
      ? JSON.parse(storedUser)
      : { name: "Stock Manager", email: "manager@stockmaster.com", status: "active" };
  });
  const adminName = profile?.name;

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
    const saved = localStorage.getItem("acknowledgedAlerts");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("acknowledgedAlerts", JSON.stringify(acknowledgedIds));
  }, [acknowledgedIds]);

  // --- 2. INITIAL FETCH & LISTENERS ---
  useEffect(() => {
    fetchProducts();
    fetchSales();

    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- AUTH STATUS CHECKER (FIXED) ---
  useEffect(() => {
    const checkStatus = async () => {
      const userStr = localStorage.getItem("loggedInUser");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user || !user.id) return;

      // FIX LINE 71: Correct URL to 'check-status' to avoid 404
      const url = `https://localhost:7262/api/auth/check-status/${user.id}`;

      try {
        const res = await fetch(url, { cache: "no-store" });
        
        if (res.ok) {
            const data = await res.json();
            // FIX: Backend returns { isActive: boolean }
            if (data.isActive === false) { 
              localStorage.removeItem("loggedInUser");
              Swal.fire({ icon: "error", title: "Access Revoked", text: "Your account has been deactivated.", allowOutsideClick: false })
                .then(() => navigate("/login"));
            }
        }
      } catch (err) { console.error("Status check failed:", err); }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, [navigate]);

  // --- 3. API FETCH FUNCTIONS ---

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
      Swal.fire({ icon: 'error', title: 'Connection Error', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch("https://localhost:7262/api/sales");
      if (!res.ok) return;
      const data = await res.json();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const formattedSales = data.map(s => {
        let daysRem = null;
        if (s.creditDueDate || s.CreditDueDate) {
          const due = new Date(s.creditDueDate || s.CreditDueDate);
          due.setHours(0, 0, 0, 0);
          const diffTime = due - today;
          daysRem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const status = s.status || s.Status; 
        const isPaid = status === "Completed";

        let approvedByName = s.approvedBy || s.ApprovedBy;
        if (s.salesType === "Credit" && status === "Completed") {
          approvedByName = s.paymentApprovedBy || s.PaymentApprovedBy || approvedByName;
        }

        return {
          id: s.id || s.Id,
          product: s.productName || s.ProductName,
          quantity: s.quantity || s.Quantity,
          total: s.totalPrice || s.TotalPrice,
          date: new Date(s.dateSold || s.DateSold).toLocaleDateString(),
          rawDate: s.dateSold || s.DateSold,
          soldBy: s.soldBy || s.SoldBy,
          approvedBy: approvedByName,
          salesType: s.salesType || s.SalesType,
          customerName: s.customerName || s.CustomerName || "-",
          creditDueDate: (s.creditDueDate || s.CreditDueDate)
            ? new Date(s.creditDueDate || s.CreditDueDate).toLocaleDateString()
            : "-",
          daysRemaining: daysRem,
          status: status,
          isPaid: isPaid
        };
      });
      setSalesLog(formattedSales);
    } catch (err) {
      console.error("Sales fetch error", err);
    }
  };

  // --- 4. DATA FILTERING LOGIC ---
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalInventoryPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice((inventoryPage - 1) * itemsPerPage, inventoryPage * itemsPerPage);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const filteredSales = salesLog.filter(sale => !salesDateFilter || sale.rawDate.startsWith(salesDateFilter));
  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentSales = filteredSales.slice((salesPage - 1) * itemsPerPage, salesPage * itemsPerPage);
  const totalRevenue = salesLog.reduce((acc, sale) => acc + sale.total, 0);

  const allCreditSales = salesLog.filter(s => {
    const isCredit = s.salesType === 'Credit';
    const matchesDate = creditDateFilter ? s.rawDate.startsWith(creditDateFilter) : true;
    return isCredit && matchesDate;
  });

  const activeCreditSales = allCreditSales.filter(s => s.status === 'Active');
  const overdueCreditSales = allCreditSales.filter(s => s.status === 'Overdue');
  const paidCreditSales = allCreditSales.filter(s => s.status === 'Completed');

  let displayedCreditSales = [];
  if (creditViewMode === 'active') displayedCreditSales = activeCreditSales;
  else if (creditViewMode === 'overdue') displayedCreditSales = overdueCreditSales;
  else if (creditViewMode === 'paid') displayedCreditSales = paidCreditSales;

  const totalCreditPages = Math.ceil(displayedCreditSales.length / itemsPerPage);
  const currentCreditSales = displayedCreditSales.slice((creditPage - 1) * itemsPerPage, creditPage * itemsPerPage);

  const nearDueItems = activeCreditSales.filter(s => s.daysRemaining <= 3 && !acknowledgedIds.includes(s.id));
  const nearDueCount = nearDueItems.length;

  // --- 5. ACTION HANDLERS ---

  const handleTogglePaid = async (id) => {
    const adminName = profile?.name; // Make sure profile exists
    if (!adminName) {
      Swal.fire('Error', 'Admin name not found!', 'error');
      return;
    }
  
    try {
      const res = await fetch(`https://localhost:7262/api/sales/mark-paid/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ApprovedBy: adminName }) // Must match backend exactly
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        Swal.fire('Error', data.message || 'Failed to mark as paid', 'error');
        console.error("Error response:", data);
        return;
      }
  
      Swal.fire('Success', 'Credit sale marked as paid!', 'success');
  
      // Update state
      setCurrentCreditSales(prev =>
        prev.map(s =>
          s.id === id ? { ...s, isPaid: true, approvedBy: adminName, status: 'Completed' } : s
        )
      );
  
    } catch (err) {
      console.error("Fetch error:", err);
      Swal.fire('Error', 'Network error, try again', 'error');
    }
  };
  
  
  const handleNotificationClick = () => {
    if (nearDueCount === 0) {
      Swal.fire({ title: 'No New Alerts', text: 'No active payments due in the next 3 days.', icon: 'info' });
      return;
    }
    const listHtml = nearDueItems.map(item => `
        <div style="text-align: left; margin-bottom: 8px;">
           <strong>${item.customerName}</strong>: ${item.total} Birr <span style="color:orange">(${item.daysRemaining} days left)</span>
        </div>`).join('');

    Swal.fire({
      title: '<strong>Upcoming Payments</strong>',
      html: `<div style="max-height: 200px; overflow-y: auto;">${listHtml}</div>`,
      icon: 'warning',
      confirmButtonText: 'Acknowledged'
    }).then((result) => {
      if (result.isConfirmed) {
        setAcknowledgedIds(prev => [...prev, ...nearDueItems.map(i => i.id)]);
      }
    });
  };

  const handleAddProduct = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Product',
      html:
        '<input id="swal-name" class="swal2-input" placeholder="Product Name">' +
        '<input id="swal-cat" class="swal2-input" placeholder="Category">' +
        '<input id="swal-price" type="number" class="swal2-input" placeholder="Price">' +
        '<input id="swal-stock" type="number" class="swal2-input" placeholder="Initial Stock">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById('swal-name').value;
        const cat = document.getElementById('swal-cat').value;
        const price = document.getElementById('swal-price').value;
        const stock = document.getElementById('swal-stock').value;
        if (!name || !price || !stock) { Swal.showValidationMessage('Please fill all fields'); return false; }
        return [name, cat, price, stock];
      }
    });

    if (formValues) {
      const [name, cat, price, stock] = formValues;
      try {
        const res = await fetch("https://localhost:7262/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Name: name, Category: cat || "Uncategorized", Price: parseFloat(price), Stock: parseInt(stock), MinStock: 10 })
        });
        if (!res.ok) throw new Error("Failed to add product");
        fetchProducts();
        Swal.fire('Success', `${name} added to database.`, 'success');
      } catch (err) { Swal.fire('Error', err.message, 'error'); }
    }
  };

  const handleEditProduct = async (product) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Product',
      html:
        `<input id="swal-edit-name" class="swal2-input" value="${product.name}" placeholder="Name">` +
        `<input id="swal-edit-cat" class="swal2-input" value="${product.category}" placeholder="Category">` +
        `<input id="swal-edit-price" type="number" class="swal2-input" value="${product.price}" placeholder="Price">` +
        `<input id="swal-edit-min" type="number" class="swal2-input" value="${product.minStock}" placeholder="Min Stock">`,
      showCancelButton: true,
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
          body: JSON.stringify({ Name: name, Category: cat || "Uncategorized", Price: parseFloat(price), MinStock: parseInt(minStock) || 10 })
        });
        if (!res.ok) throw new Error("Failed to update details");
        fetchProducts();
        Swal.fire('Updated!', 'Product details saved.', 'success');
      } catch (err) { Swal.fire('Error', err.message, 'error'); }
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete Product?', text: "Irreversible action.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`https://localhost:7262/api/products/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete product");
          fetchProducts();
          Swal.fire('Deleted!', 'Product removed.', 'success');
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    });
  };

  const handleStockAdjustment = async (product, type) => {
    const isSale = type === 'sell';
    if (isSale) {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const { value: formValues } = await Swal.fire({
        title: `<div class="modern-swal-title">New Sale</div>`,
        html: `
          <div class="modern-form-wrapper">
             <div class="product-info-banner"><span>${product.name}</span><span class="badge">In Stock: ${product.stock}</span></div>
             <div class="form-grid">
                <div class="form-group"><label>Quantity</label><input id="swal-qty" type="number" class="swal-modern-input" placeholder="0" max="${product.stock}"></div>
                <div class="form-group"><label>Payment Type</label><select id="swal-type" class="swal-modern-input"><option value="Cash">Cash</option><option value="Credit">Credit</option></select></div>
                <div class="form-group"><label>Sold By</label><input id="swal-soldBy" type="text" class="swal-modern-input" value="${profile.name}"></div>
                <div class="form-group full-width"><label>Customer Name</label><input id="swal-customer" type="text" class="swal-modern-input" placeholder="Customer Name"></div>
                <div class="form-group"><label>Due Date (Credit Only)</label><input id="swal-credit-date" type="date" class="swal-modern-input" min="${todayStr}" disabled></div>
             </div>
          </div>
        `,
        customClass: { popup: 'modern-swal-popup' },
        showCancelButton: true,
        confirmButtonText: 'Complete Sale',
        didOpen: () => {
          const popup = Swal.getPopup();
          const typeSelect = popup.querySelector('#swal-type');
          const dateInput = popup.querySelector('#swal-credit-date');
          
          typeSelect.addEventListener('change', () => {
            const isCredit = typeSelect.value === 'Credit';
            if (isCredit) {
                dateInput.disabled = false;
                dateInput.focus();
            } else { 
                dateInput.disabled = true; 
                dateInput.value = ''; 
            }
          });
        },
        preConfirm: () => {
          const qty = parseInt(document.getElementById('swal-qty').value);
          const type = document.getElementById('swal-type').value;
          const soldBy = document.getElementById('swal-soldBy').value;
          const customer = document.getElementById('swal-customer').value;
          const creditDate = document.getElementById('swal-credit-date').value;

          if (!qty || qty <= 0) return Swal.showValidationMessage('Invalid quantity');
          if (qty > product.stock) return Swal.showValidationMessage(`Insufficient stock.`);
          if (!soldBy) return Swal.showValidationMessage('Sold By is required.');
          if (type === 'Credit' && (!customer || !creditDate)) return Swal.showValidationMessage('Customer & Due Date required for credit.');

          return { qty, type, soldBy, customer, creditDate };
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
            CustomerName: formValues.customer || "Walk-in",
            CreditSaleDate: formValues.type === 'Cash' ? null : formValues.creditDate
          };

          const res = await fetch("https://localhost:7262/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(salePayload)
          });
          
          if (res.status === 204) {
             // success
          } else if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || "Sale failed");
          }

          Swal.fire({ icon: 'success', title: 'Sale Successful', timer: 2000, showConfirmButton: false });
          fetchProducts();
          fetchSales();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    } else {
      const { value } = await Swal.fire({ title: `Restock ${product.name}`, input: 'number', inputLabel: 'Enter amount to add', confirmButtonText: 'Add Stock' });
      if (value && value > 0) {
        try {
          const cleanProduct = {
             Name: product.name,
             Category: product.category,
             Price: product.price,
             MinStock: product.minStock,
             Stock: product.stock + parseInt(value)
          };

          const res = await fetch(`https://localhost:7262/api/products/details/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleanProduct)
          });

          if (res.status !== 204 && !res.ok) throw new Error("Failed to restock");
          
          Swal.fire('Restocked!', `${value} items added.`, 'success');
          fetchProducts();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    }
  };

  const handleDownloadExcel = () => {
    const inventoryData = products.map(p => ({ ID: p.id, Name: p.name, Category: p.category, Price: `${p.price}`, Stock: p.stock, Status: p.status }));
    const salesDataToExport = salesDateFilter ? filteredSales : salesLog;
    const reportDate = new Date().toLocaleString();

    const salesSheetData = [
      ["STOCKMASTER SALES REPORT"], [`Generated: ${reportDate}`], ["ID", "Date", "Product", "Type", "Customer", "Sold By", "Qty", "Revenue", "Status"]
    ];
    salesDataToExport.forEach(s => {
      salesSheetData.push([s.id, s.date, s.product, s.salesType, s.customerName, s.soldBy, s.quantity, `${s.total.toLocaleString()}`, s.status]);
    });

    const wb = XLSX.utils.book_new();
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    const wsSales = XLSX.utils.aoa_to_sheet(salesSheetData);
    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales Report");
    XLSX.writeFile(wb, "StockMaster_Report.xlsx");
    Swal.fire({ icon: 'success', title: 'Report Downloaded', toast: true, timer: 3000 });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedUser) return Swal.fire('Error', 'User not found.', 'error');
    try {
      const response = await fetch(`https://localhost:7262/api/auth/update-profile/${loggedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profile.name, email: profile.email })
      });

      if (response.status === 204) {
         setProfile({ name: profile.name, email: profile.email, id: loggedUser.id });
         localStorage.setItem("loggedInUser", JSON.stringify({ ...loggedUser, name: profile.name, email: profile.email }));
         Swal.fire('Success', 'Profile updated!', 'success');
         return;
      }

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
    if (!loggedUser) return;
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

  return {
    activeView, setActiveView,
    isSidebarOpen, setIsSidebarOpen,
    searchTerm, setSearchTerm,
    isLoading,
    products, 
    currentProducts, 
    inventoryPage, setInventoryPage, totalInventoryPages,
    salesLog,
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
    handleDownloadExcel,
    handleProfileUpdate,
    handlePasswordChange,
    handleLogout,
    handleTogglePaid
  };
};