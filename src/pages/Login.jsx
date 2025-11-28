import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom"; 
import '../../css/Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UI States
  const [error, setError] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to validate email format
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setIsLoading(true);

    // --- 1. CHECK EMPTY FIELDS ---
    if (!email || !password) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    // --- 2. CHECK EMAIL FORMAT (NEW) ---
    if (!isValidEmail(email)) {
      setError("Invalid email format. Please include '@' and a domain.");
      setIsLoading(false);
      return;
    }

    // --- 3. CHECK PASSWORD LENGTH ---
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    // --- 4. SIMULATE API LOGIN ---
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate a fake backend failure for specific email
      if (email === "fail@test.com") {
        throw new Error("No account found with this email.");
      }

      await login({ email });
      navigate('/dashboard'); 
      
    } catch (err) {
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if a specific input should show error style
  // It returns true if the global error exists AND (it's a general error OR matches the specific field)
  const isEmailError = error && (error.toLowerCase().includes("email") || error.includes("fields") || error.includes("credentials"));
  const isPasswordError = error && (error.toLowerCase().includes("password") || error.includes("fields") || error.includes("credentials"));

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        
        {/* LEFT SIDE: FORM */}
        <div className="login-form-side">
          <div className="form-content">
            <Link to="/" className="brand-logo">
              <span className="logo-icon">📦</span> StockMaster
            </Link>
            
            <div className="header-text">
              <h2>Welcome Back</h2>
              <p>Enter your email and password to access your dashboard.</p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="error-alert">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit}>
              <div className="input-group">
                <label>Email Address</label>
                {/* Apply error class based on validation logic */}
                <div className={`input-wrapper ${isEmailError ? 'error' : ''}`}>
                  <span className="icon">✉️</span>
                  <input
                    type="text" // changed from email to text to allow manual validation demonstration
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(""); // Clear error immediately when typing
                    }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className={`input-wrapper ${isPasswordError ? 'error' : ''}`}>
                  <span className="icon">🔒</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
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

        {/* RIGHT SIDE: IMAGE */}
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