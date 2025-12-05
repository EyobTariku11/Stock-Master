import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver';

export const useAdminStocks = () => {
  const navigate = useNavigate();

  // --- 1. STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState("inventory");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Loading State
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

  // User Profile - FIXED: Using sessionStorage
  const [profile, setProfile] = useState(() => {
    const storedUser = sessionStorage.getItem("loggedInUser");
    return storedUser
      ? JSON.parse(storedUser)
      : { name: "Stock Manager", email: "manager@bektarstock.com", status: "active" };
  });

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // Alerts - FIXED: Using sessionStorage so alerts are per-session
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
    const saved = sessionStorage.getItem("acknowledgedAlerts");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem("acknowledgedAlerts", JSON.stringify(acknowledgedIds));
  }, [acknowledgedIds]);

  // --- 2. INITIAL FETCH & LISTENERS ---
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const start = Date.now();

      // Fetch data
      await Promise.all([fetchProducts(), fetchSales()]);
      
      // Artificial delay to allow the "App Launch" animation to play smoothly
      const end = Date.now();
      const duration = end - start;
      const minLoadingTime = 1500; 
      const delay = duration < minLoadingTime ? minLoadingTime - duration : 0;

      setTimeout(() => {
        setIsLoading(false);
      }, delay);
    };

    initData();

    const handleResize = () => setIsSidebarOpen(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    
    // Background polling
    const pollingInterval = setInterval(() => {
      fetchSales(false); 
    }, 10000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(pollingInterval);
    };
  }, []);

  // --- AUTH STATUS CHECKER ---
  useEffect(() => {
    const checkStatus = async () => {
      // FIXED: using sessionStorage
      const userStr = sessionStorage.getItem("loggedInUser");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user || !user.id) return;

      const url = `https://localhost:7262/api/auth/check-status/${user.id}`;

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (data.isActive === false) { 
              sessionStorage.removeItem("loggedInUser");
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

  // --- HELPER: Parse API Error ---
  const parseApiError = async (response, defaultMsg) => {
    try {
        const data = await response.json();
        // 1. Check for array of errors (Identity)
        if (Array.isArray(data)) return data.join(" | ");
        // 2. Check for standard object messages
        if (data.message) return data.message;
        if (data.title) return data.title;
        // 3. Check for dictionary-style errors (FluentValidation or Identity)
        if (data.errors && typeof data.errors === 'object') {
             return Object.values(data.errors).flat().join(", ");
        }
        return defaultMsg;
    } catch {
        return defaultMsg;
    }
  };

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
    }
  };

  const fetchSales = async (showLoading = false) => {
    if(showLoading) setIsLoading(true); 
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

        let status = s.status || s.Status; 
        const isPaid = status === "Completed";

        // Logic: Force Overdue if daysRem <= 0 and not paid
        if (!isPaid && daysRem !== null) {
            if (daysRem <= 0) {
                status = "Overdue";
            } else {
                status = "Active";
            }
        }

        return {
          id: s.id || s.Id,
          product: s.productName || s.ProductName,
          quantity: s.quantity || s.Quantity,
          total: s.totalPrice || s.TotalPrice,
          date: new Date(s.dateSold || s.DateSold).toLocaleDateString(),
          rawDate: s.dateSold || s.DateSold,
          soldBy: s.soldBy || s.SoldBy,
          
          approvedBy: s.approvedBy || s.ApprovedBy || "-",
          paymentApprovedBy: s.paymentApprovedBy || s.PaymentApprovedBy || "-",

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
    } finally {
      if(showLoading) setIsLoading(false);
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
    if (!id) return;
    const sale = salesLog.find(s => s.id === id);
    if (!sale || sale.isPaid) return;

    const result = await Swal.fire({
      title: 'Confirm Payment',
      text: `Mark credit for ${sale.customerName} (${sale.total} Birr) as Paid?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981', 
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Mark Paid',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const payload = {
        ApprovedBy: profile.name || "Admin",
        SalesType: "Credit",
        ProductId: 0, 
        Quantity: 1, 
        SoldBy: "System",
        CustomerName: "Existing",
        CreditSaleDate: new Date().toISOString()
      };

      const res = await fetch(`https://localhost:7262/api/sales/mark-paid/${id}`, {
        method: 'PUT',
        headers: { 
          "Content-Type": "application/json",
          "userName": profile.name || "Unknown"
        },
        body: JSON.stringify(payload)
      });
  
      if (res.status === 204) {
         Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Marked as Paid', showConfirmButton: false, timer: 1500 });
         fetchSales();
         return;
      }
      
      if (!res.ok) {
        const errMsg = await parseApiError(res, "Failed to mark as paid");
        throw new Error(errMsg);
      }

      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Marked as Paid', showConfirmButton: false, timer: 1500 });
      fetchSales();
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
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
      title: "Add Product",
      html: `
        <div class="mini-form">
          <input id="swal-name" class="mini-input" placeholder="Product Name">
          <input id="swal-cat" class="mini-input" placeholder="Category (optional)">
          <input id="swal-price" type="number" class="mini-input" placeholder="Price">
          <input id="swal-stock" type="number" class="mini-input" placeholder="Initial Stock">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Add",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "mini-popup",
        confirmButton: "mini-btn-confirm",
        cancelButton: "mini-btn-cancel",
      },
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById("swal-name").value;
        const cat = document.getElementById("swal-cat").value;
        const price = document.getElementById("swal-price").value;
        const stock = document.getElementById("swal-stock").value;
  
        if (!name || !price || !stock) {
          Swal.showValidationMessage("Please fill all required fields");
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
          headers: { 
            "Content-Type": "application/json",
            "userName": profile.name || "Unknown"
          },
          body: JSON.stringify({
            Name: name,
            Category: cat || "Uncategorized",
            Price: parseFloat(price),
            Stock: parseInt(stock),
            MinStock: 10
          })
        });
  
        if (!res.ok) {
             const errMsg = await parseApiError(res, "Failed to add product");
             throw new Error(errMsg);
        }
  
        fetchProducts();
        Swal.fire("Success", `${name} added successfully.`, "success");
      } catch (err) {
        Swal.fire("Error", err.message, "error");
      }
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
          headers: { 
            "Content-Type": "application/json",
            "userName": profile.name || "Unknown"
          },
          body: JSON.stringify({ Name: name, Category: cat || "Uncategorized", Price: parseFloat(price), MinStock: parseInt(minStock) || 10 })
        });
        if (!res.ok) {
             const errMsg = await parseApiError(res, "Failed to update details");
             throw new Error(errMsg);
        }
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
          const res = await fetch(`https://localhost:7262/api/products/${id}`, { 
            method: "DELETE",
            headers: {
              "userName": profile.name || "Unknown"
            }
          });
          if (!res.ok) {
             const errMsg = await parseApiError(res, "Failed to delete product");
             throw new Error(errMsg);
          }
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
            headers: { 
              "Content-Type": "application/json",
              "userName": profile.name || "Unknown"
            },
            body: JSON.stringify(salePayload)
          });
          if (res.status === 204) { /* success */ } else if (!res.ok) {
              const errMsg = await parseApiError(res, "Sale failed");
              throw new Error(errMsg);
          }
          Swal.fire({ icon: 'success', title: 'Sale Successful', timer: 2000, showConfirmButton: false });
          fetchProducts();
          fetchSales();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    } else {
      // RESTOCK LOGIC
      const { value } = await Swal.fire({ title: `Restock ${product.name}`, input: 'number', inputLabel: 'Enter amount to add', confirmButtonText: 'Add Stock' });
      if (value && value > 0) {
        try {
          const res = await fetch(`https://localhost:7262/api/products/${product.id}`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "userName": profile.name || "Unknown"
            },
            body: JSON.stringify({ NewStock: product.stock + parseInt(value) })
          });

          if (res.status !== 204 && !res.ok) {
               const errMsg = await parseApiError(res, "Failed to restock");
               throw new Error(errMsg);
          }
          Swal.fire('Restocked!', `${value} items added.`, 'success');
          fetchProducts();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    }
  };

  // --- REPORT GENERATOR ---
  const handleGenerateReport = async (reportType = 'sales') => {
    const workbook = new ExcelJS.Workbook();
    
    // --- Styling Constants ---
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Light Gray
    
    if (reportType === 'inventory') {
      // ===============================================
      //       INVENTORY REPORT LOGIC
      // ===============================================
      const sheet = workbook.addWorksheet('Current Inventory');

      // 1. Title
      sheet.mergeCells('A1:G1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'BEKTAR STOCK - INVENTORY AUDIT REPORT';
      titleCell.font = { size: 18, bold: true, color: { argb: 'FF1E293B' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 30;

      // 2. Executive Summary
      sheet.mergeCells('A3:C3');
      sheet.getCell('A3').value = "EXECUTIVE SUMMARY";
      sheet.getCell('A3').font = { bold: true, size: 11 };
      sheet.getCell('A3').fill = subHeaderFill;

      // Calculations
      const totalAssetValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });

      // Summary Rows
      sheet.getCell('A4').value = "Total Items:";
      sheet.getCell('B4').value = products.length;

      sheet.getCell('A5').value = "Total Asset Value:";
      sheet.getCell('B5').value = totalAssetValue;
      sheet.getCell('B5').numFmt = '#,##0.00 "Birr"';

      sheet.getCell('A6').value = "Low Stock Alerts:";
      sheet.getCell('B6').value = lowStockCount;
      sheet.getCell('B6').font = { color: { argb: 'FFDC2626' }, bold: true }; 

      // --- ADDED DATE ROW HERE (Row 7) ---
      sheet.getCell('A7').value = "As of Date:";
      sheet.getCell('B7').value = currentDate;
      sheet.getCell('B7').font = { italic: true, color: { argb: 'FF64748B' } };

      // 3. Table Headers (Row 9)
      const headers = ["Product Name", "Category", "Unit Price", "Quantity", "Total Value", "Min Stock", "Status"];
      const headerRow = sheet.getRow(9);
      headerRow.values = headers;
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: {style:'medium'} };
      });
      headerRow.height = 24;

      // 4. Data Rows
      let currentRow = 10;
      products.forEach((p, index) => {
        const row = sheet.getRow(currentRow);
        const totalValue = p.price * p.stock;
        
        row.values = [p.name, p.category, p.price, p.stock, totalValue, p.minStock, p.status];
        
        const isEven = index % 2 === 0;
        row.eachCell((cell, colNum) => {
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.border = { bottom: {style:'dotted', color: {argb: 'FFCBD5E1'}} };
          
          if(colNum >= 3 && colNum <= 6) cell.alignment = { horizontal: 'center' };
          else cell.alignment = { horizontal: 'left' };
        });

        row.getCell(3).numFmt = '#,##0.00';
        row.getCell(5).numFmt = '#,##0.00 "Birr"';

        // Conditional Formatting for Low Stock
        if (p.stock <= p.minStock) {
          row.getCell(7).font = { color: { argb: 'FFDC2626' }, bold: true }; 
          row.getCell(4).font = { color: { argb: 'FFDC2626' }, bold: true };
        } else {
          row.getCell(7).font = { color: { argb: 'FF16A34A' }, bold: true }; 
        }
        currentRow++;
      });

      // Set Column Widths
      sheet.columns = [{ width: 30 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 20 }, { width: 12 }, { width: 15 }];
      
      // Save File
      saveAs(new Blob([await workbook.xlsx.writeBuffer()]), `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    } else {
      // ===============================================
      //       SALES & CREDITS REPORT LOGIC
      // ===============================================
      const sheet = workbook.addWorksheet('Sales Report');
      
      // 1. Determine Data Source
      let dataToExport;
      let reportTitle;
      let fileNamePrefix;

      if (reportType === 'credits_paid') {
        dataToExport = salesLog.filter(s => s.salesType === 'Credit' && s.status === 'Completed');
        if (creditDateFilter) {
          dataToExport = dataToExport.filter(s => s.date === creditDateFilter);
        }
        reportTitle = 'BEKTAR STOCK - COMPLETED CREDIT SALES REPORT';
        fileNamePrefix = 'Completed_Credits_Report';
      } else {
        dataToExport = salesDateFilter ? filteredSales : salesLog;
        reportTitle = 'BEKTAR STOCK - SALES TRANSACTION REPORT';
        fileNamePrefix = 'Sales_Report';
      }

      // 2. Title
      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { size: 18, bold: true, color: { argb: 'FF1E293B' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 30;

      // 3. Executive Summary
      sheet.mergeCells('A3:C3');
      sheet.getCell('A3').value = "EXECUTIVE SUMMARY";
      sheet.getCell('A3').font = { bold: true, size: 11 };
      sheet.getCell('A3').fill = subHeaderFill;
      
      const totalPeriodRevenue = dataToExport.reduce((acc, s) => acc + s.total, 0);
      const cashSales = dataToExport.filter(s => s.salesType === 'Cash').reduce((acc, s) => acc + s.total, 0);
      const creditSales = dataToExport.filter(s => s.salesType === 'Credit').reduce((acc, s) => acc + s.total, 0);
      
      sheet.getCell('A4').value = "Total Revenue:";
      sheet.getCell('B4').value = totalPeriodRevenue;
      sheet.getCell('B4').numFmt = '#,##0.00 "Birr"';
      sheet.getCell('B4').font = { bold: true, color: { argb: 'FF16A34A' } };
      
      sheet.getCell('A5').value = "Total Transactions:";
      sheet.getCell('B5').value = dataToExport.length;
      
      sheet.getCell('A6').value = "Breakdown:";
      sheet.getCell('B6').value = `Cash: ${cashSales.toLocaleString()} | Credit: ${creditSales.toLocaleString()}`;
      
      // 4. Table Headers (Row 9)
      const headers = ["Date", "Product", "Type", "Customer", "Sold By", "Created By", "Pmt Approved By", "Qty", "Revenue", "Status"];
      const headerRow = sheet.getRow(9);
      headerRow.values = headers;
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: {style:'medium'} };
      });
      headerRow.height = 24;

      // 5. Data Rows
      let currentRow = 10;
      dataToExport.forEach((s, index) => {
        const row = sheet.getRow(currentRow);
        row.values = [
          s.date, 
          s.product, 
          s.salesType, 
          s.customerName, 
          s.soldBy, 
          s.approvedBy, 
          s.paymentApprovedBy || '-', 
          s.quantity, 
          s.total, 
          s.status
        ];
        
        const isEven = index % 2 === 0;
        row.eachCell((cell, colNum) => {
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.border = { bottom: {style:'dotted', color: {argb: 'FFCBD5E1'}} };
          if(colNum >= 8) cell.alignment = { horizontal: 'center' };
          else cell.alignment = { horizontal: 'left' };
        });
        
        row.getCell(9).numFmt = '#,##0.00 "Birr"'; 
        row.getCell(9).font = { bold: true };
        
        const statusCell = row.getCell(10);
        if(s.status === 'Completed') statusCell.font = { color: { argb: 'FF16A34A' }, bold: true }; 
        else if(s.status === 'Overdue') statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }; 
        else statusCell.font = { color: { argb: 'FFD97706' }, bold: true }; 
        currentRow++;
      });
      
      sheet.columns = [{ width: 12 }, { width: 20 }, { width: 10 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 8 }, { width: 15 }, { width: 12 }];
      
      saveAs(new Blob([await workbook.xlsx.writeBuffer()]), `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    // --- LOGGING THE ACTION ---
    // This sends the "Eyob generated report" action to the backend
    try {
      await fetch("https://localhost:7262/api/audit/log-client-action", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "userName": profile.name || "Unknown" // Sends the current user's name
        },
        body: JSON.stringify({
          UserName: profile.name || "Unknown", // Send in body as per your C# implementation
          Action: "Report Generated",
          Details: `Generated ${reportType} report.`
        })
      });
    } catch (logErr) {
      console.error("Failed to log report generation", logErr);
    }
    
    Swal.fire({ icon: 'success', title: 'Report Generated', toast: true, timer: 3000 });
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    // FIXED: using sessionStorage
    const loggedUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!loggedUser) return Swal.fire('Error', 'User not found.', 'error');
    try {
      const response = await fetch(`https://localhost:7262/api/auth/update-profile/${loggedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profile.name, email: profile.email })
      });
      if (response.status === 204) {
         setProfile({ name: profile.name, email: profile.email, id: loggedUser.id });
         // FIXED: using sessionStorage
         sessionStorage.setItem("loggedInUser", JSON.stringify({ ...loggedUser, name: profile.name, email: profile.email }));
         Swal.fire('Success', 'Profile updated!', 'success');
         return;
      }
      
      if (!response.ok) {
           const errMsg = await parseApiError(response, "Failed to update profile");
           throw new Error(errMsg);
      }

      const data = await response.json();
      setProfile({ name: data.fullName, email: data.email, id: loggedUser.id });
      // FIXED: using sessionStorage
      sessionStorage.setItem("loggedInUser", JSON.stringify({ ...loggedUser, name: data.fullName, email: data.email }));
      Swal.fire('Success', 'Profile updated!', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return Swal.fire('Error', 'Passwords mismatch', 'error');
    // FIXED: using sessionStorage
    const loggedUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!loggedUser) return;
    try {
      const response = await fetch(`https://localhost:7262/api/auth/change-password/${loggedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
      });
      
      if (!response.ok) {
           const errMsg = await parseApiError(response, "Failed to change password");
           throw new Error(errMsg);
      }
      
      setPasswords({ current: "", new: "", confirm: "" });
      Swal.fire('Success', 'Password changed!', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  };

  const handleLogout = () => {
    // FIXED: using sessionStorage
    sessionStorage.removeItem("loggedInUser");
    if (window._statusCheckInterval) {
      clearInterval(window._statusCheckInterval);
      window._statusCheckInterval = null;
    }
    navigate("/login", { replace: true });
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
    handleGenerateReport, 
    handleProfileUpdate,
    handlePasswordChange,
    handleLogout,
    handleTogglePaid
  };
};