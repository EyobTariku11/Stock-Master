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

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // 🔍 Periodically check if the user is still ACTIVE
  const startStatusWatcher = (userId) => {
    if (window._statusCheckInterval) {
      clearInterval(window._statusCheckInterval);
    }

    window._statusCheckInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://localhost:7262/api/auth/check-status/${userId}`);
        const data = await res.json();

        if (!data.isActive) {
          clearInterval(window._statusCheckInterval);
          window._statusCheckInterval = null;

          localStorage.removeItem("loggedInUser");

          Swal.fire({
            icon: "warning",
            title: "Access Revoked",
            text: "Your account has been deactivated by an admin.",
          }).then(() => {
            navigate("/login");
          });
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
    }, 5000); // checks every 5 seconds
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
      const response = await fetch("https://localhost:7262/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.message || "Invalid email or password.";
        throw new Error(message);
      }

      console.log("Login API response:", data);

      const user = {
        id: data.id || null,
        name: data.fullName || data.name || "User",
        email: data.email || email,
        role: data.role || "Viewer",  // 👈 add role
        token: data.token || "fake-jwt-token"
      };

      if (!user.id) {
        throw new Error("User ID not returned by server.");
      }

      localStorage.setItem("loggedInUser", JSON.stringify(user));

      // ✅ Start watcher to catch immediate revoke
      startStatusWatcher(user.id);

      await Swal.fire({
        title: "Login Successful!",
        text: `Welcome back, ${user.name}!`,
        icon: "success",
        confirmButtonText: "Continue",
      });

      // 🚀 ROLE-BASED REDIRECT HERE
      if (user.role === "Admin") {
        navigate("/admin");
      } else {
        navigate("/stock");
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailError = error && (error.toLowerCase().includes("email") || error.includes("credentials"));
  const isPasswordError = error && (error.toLowerCase().includes("password") || error.includes("credentials"));

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
                <div className={`input-wrapper ${isPasswordError ? "error" : ""}`}>
                  <span className="icon">🔒</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  />
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
