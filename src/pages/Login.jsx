import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import Swal from "sweetalert2";   
import '../../css/Login.css';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- FORCE LOGOUT HELPER ---
  const forceLogout = (message) => {
    if (window._statusCheckInterval) {
      clearInterval(window._statusCheckInterval);
      window._statusCheckInterval = null;
    }
    // Remove session
    sessionStorage.removeItem("loggedInUser");
    
    Swal.fire({
      icon: "warning",
      title: "Access Revoked",
      text: message,
      allowOutsideClick: false,
      confirmButtonText: "Return to Login"
    }).then(() => {
      // Force navigation to login and reload to clear states
      navigate("/login");
      window.location.reload(); 
    });
  };

  // --- STATUS WATCHER ---
  const startStatusWatcher = (userId) => {
    if (window._statusCheckInterval) clearInterval(window._statusCheckInterval);

    window._statusCheckInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://localhost:7262/api/auth/check-status/${userId}`);

        // CASE 1: User Deleted (404) or Token Invalid (401)
        if (res.status === 404) {
           forceLogout("Your account no longer exists.");
           return;
        }
        if (res.status === 401) {
           forceLogout("Session expired or invalid.");
           return;
        }

        // CASE 2: User Exists, check if Active
        if (res.ok) {
          const data = await res.json();
          if (!data.isActive) {
            forceLogout("Your account has been deactivated by an admin.");
          }
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
    }, 5000); // Checks every 5 seconds
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError("Invalid email format.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Login API Call
      const response = await fetch("https://localhost:7262/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }

      if (!response.ok) {
        let serverMessage = data?.message || responseText || "An error occurred.";
        throw new Error(serverMessage);
      }

      // 2. Prepare User Object
      const roleFromDB = data.role || "Viewer";
      
      const user = {
        id: data.id || null,
        name: data.fullName || data.name || "User",
        email: data.email || email,
        role: roleFromDB, 
        token: data.token || "fake-jwt-token"
      };

      if (!user.id) throw new Error("User ID not returned by server.");

      // 3. Save to SessionStorage (Using sessionStorage for Tab Isolation)
      sessionStorage.setItem("loggedInUser", JSON.stringify(user));

      // 4. Role Check
      const roleLower = String(user.role || "").toLowerCase().trim();
      const isAuthorizedAdmin = 
        roleLower === "admin" || 
        roleLower === "superadmin" || 
        roleLower === "super admin";

      // 5. Start watcher only if NOT an admin
      if (!isAuthorizedAdmin) {
        startStatusWatcher(user.id);
      }

      // 6. Alert and Navigate
      Swal.fire({
        title: "Login Successful!",
        text: `Welcome back, ${user.name}!`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        // Navigation Logic
        if (isAuthorizedAdmin) {
          navigate("/admin", { replace: true });
        } else {
          navigate("/stock", { replace: true });
        }
      });

    } catch (err) {
      console.error(err);
      setError(err.message.replace(/^Error:\s*/, "") || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailError = error && (error.toLowerCase().includes("user") || error.toLowerCase().includes("exist") || error.toLowerCase().includes("email"));
  const isPasswordError = error && error.toLowerCase().includes("password");

  return (
    <div className="login-page-wrapper">
      
      {/* --- CSS FIX: Center Text in SweetAlert --- */}
      <style>{`
        div:where(.swal2-container) .swal2-html-container {
          text-align: center !important;
        }
      `}</style>

      <div className="login-card-container">
        <div className="login-form-side">
          <div className="form-content">
            <Link to="/" className="brand-logo">
              <span className="logo-icon">📦</span> BektarStock
            </Link>

            <div className="header-text">
              <h2>Welcome Back</h2>
              <p>Enter your email and password to access your dashboard.</p>
            </div>

            {error && (
              <div className="error-alert">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit}>
              <div className="input-group">
                <label>Email Address</label>
                <div className={`input-wrapper ${isEmailError ? "error" : ""}`}>
                  <span className="icon">✉️</span>
                  <input
                    type="text"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className={`input-wrapper ${isPasswordError ? "error" : ""}`} style={{ position: 'relative' }}>
                  <span className="icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    style={{ paddingRight: '40px' }}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280', padding: 0
                    }}
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-link">Forgot Password?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : "Sign In"}
              </button>
            </form>

            <div className="footer-text">
              <p>Don't have an account? <Link to="/signup">Create free account</Link></p>
            </div>
          </div>
        </div>

        <div className="login-image-side">
          <div className="image-overlay">
            <div className="overlay-text">
              <h3>Manage Stock with Confidence.</h3>
              <p>Join over 10,000 businesses managing their inventory smarter, faster, and easier.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}