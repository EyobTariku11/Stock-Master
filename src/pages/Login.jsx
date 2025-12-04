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
  
  // State for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const startStatusWatcher = (userId) => {
    if (window._statusCheckInterval) {
      clearInterval(window._statusCheckInterval);
    }

    // Only start watcher if it's a real ID (not our hardcoded mock admin)
    if (userId === "mock-admin-id") return;

    window._statusCheckInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://localhost:7262/api/auth/check-status/${userId}`);
        if (res.ok) {
            const data = await res.json();
            if (!data.isActive) {
              clearInterval(window._statusCheckInterval);
              window._statusCheckInterval = null;
              localStorage.removeItem("loggedInUser");
              Swal.fire({
                icon: "warning",
                title: "Access Revoked",
                text: "Your account has been deactivated by an admin.",
              }).then(() => navigate("/login"));
            }
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
    }, 5000);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // 1. Basic Validation
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

    // ---------------------------------------------------------
    // SPECIAL ADMIN BYPASS CHECK (Requested Logic)
    // ---------------------------------------------------------
    if (email === "Admin@gmail.com" && password === "123456") {
        const adminUser = {
            id: "mock-admin-id",
            name: "System Admin",
            email: email,
            role: "Admin", // Force role to Admin
            token: "mock-jwt-token"
        };

        localStorage.setItem("loggedInUser", JSON.stringify(adminUser));
        
        await Swal.fire({
            title: "Login Successful!",
            text: `Welcome back, Admin!`,
            icon: "success",
            confirmButtonText: "Continue",
            timer: 1500,
            showConfirmButton: false
        });

        setIsLoading(false);
        navigate("/admin"); // Navigate directly to Admin Panel
        return; // Stop here, do not call API
    }
    // ---------------------------------------------------------

    // 2. Real API Call for all other users
    try {
      const response = await fetch("https://localhost:7262/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (err) {
        data = null; 
      }

      if (!response.ok) {
        let serverMessage = "An error occurred.";

        if (data && data.message) {
            serverMessage = data.message;
        } else if (responseText) {
            serverMessage = responseText;
        }

        const lowerMsg = serverMessage.toLowerCase();

        if (lowerMsg.includes("user not found")) {
            throw new Error("User does not exist. Please check your email.");
        } else if (lowerMsg.includes("incorrect password")) {
            throw new Error("Incorrect password. Please try again.");
        } else if (lowerMsg.includes("not active") || lowerMsg.includes("locked")) {
            throw new Error("Your account is not active.");
        } else {
            throw new Error(serverMessage);
        }
      }

      console.log("Login API response:", data);

      const user = {
        id: data.id || null,
        name: data.fullName || data.name || "User",
        email: data.email || email,
        role: data.role || "Viewer", 
        token: data.token || "fake-jwt-token"
      };

      if (!user.id) throw new Error("User ID not returned by server.");

      localStorage.setItem("loggedInUser", JSON.stringify(user));
      startStatusWatcher(user.id);

      await Swal.fire({
        title: "Login Successful!",
        text: `Welcome back, ${user.name}!`,
        icon: "success",
        confirmButtonText: "Continue",
        timer: 1500,
        showConfirmButton: false
      });

      // 3. Navigation based on Role from Database
      const userRole = user.role ? user.role.toLowerCase() : "";

      if (userRole === "admin") {
        navigate("/admin", { replace: true });

      } else {
        navigate("/stock", { replace: true });
      }

    } catch (err) {
      console.error(err);
      setError(err.message.replace(/^Error:\s*/, "") || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  // Error highlighting logic
  const isEmailError = error && (
    error.toLowerCase().includes("user") || 
    error.toLowerCase().includes("exist") ||
    error.toLowerCase().includes("email")
  );
  
  const isPasswordError = error && (
    error.toLowerCase().includes("password")
  );

  return (
    <div className="login-page-wrapper">
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