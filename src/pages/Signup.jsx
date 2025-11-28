import { useState } from "react";
// import { useAuth } from "../contexts/AuthContext"; 
import { useNavigate, Link } from "react-router-dom"; 
import '../../css/Signup.css';

export default function Signup() {
  // const { signup } = useAuth(); 
  const navigate = useNavigate();

  // Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false); // New State
  
  // UI States
  const [error, setError] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // --- 1. CHECK EMPTY FIELDS ---
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    // --- 2. CHECK EMAIL FORMAT ---
    if (!isValidEmail(email)) {
      setError("Invalid email format.");
      setIsLoading(false);
      return;
    }

    // --- 3. CHECK PASSWORD LENGTH ---
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    // --- 4. CHECK PASSWORDS MATCH ---
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    // --- 5. CHECK TERMS (NEW) ---
    if (!agreeTerms) {
      setError("You must agree to the Terms & Conditions.");
      setIsLoading(false);
      return;
    }

    // --- 6. SIMULATE API SIGNUP ---
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // await signup(email, password, fullName);
      navigate('/dashboard'); 
    } catch (err) {
      setError("Failed to create account. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Logic for highlighting errors
  const isNameError = error && error.includes("fields");
  const isEmailError = error && (error.toLowerCase().includes("email") || error.includes("fields"));
  const isPassError = error && (error.toLowerCase().includes("password") || error.includes("fields") || error.includes("match"));
  const isTermsError = error && (error.includes("Terms"));

  return (
    <div className="signup-page-wrapper">
      <div className="signup-card-container">
        
        {/* LEFT SIDE: FORM */}
        <div className="signup-form-side">
          <div className="form-content">
            <Link to="/" className="brand-logo">
              <span className="logo-icon">📦</span> StockMaster
            </Link>
            
            <div className="header-text">
              <h2>Create Account</h2>
              <p>Start managing your inventory today.</p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="error-alert">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit}>
              
              {/* Full Name */}
              <div className="input-group compact">
                <label>Full Name</label>
                <div className={`input-wrapper ${isNameError ? 'error' : ''}`}>
                  <span className="icon">👤</span>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="input-group compact">
                <label>Email Address</label>
                <div className={`input-wrapper ${isEmailError ? 'error' : ''}`}>
                  <span className="icon">✉️</span>
                  <input
                    type="text"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="input-group compact">
                <label>Password</label>
                <div className={`input-wrapper ${isPassError ? 'error' : ''}`}>
                  <span className="icon">🔒</span>
                  <input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="input-group compact">
                <label>Confirm Password</label>
                <div className={`input-wrapper ${isPassError ? 'error' : ''}`}>
                  <span className="icon">🔑</span>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
              </div>

              {/* CHECKBOX WITH ERROR HANDLING */}
              <div className={`terms-group ${isTermsError ? 'error-terms' : ''}`}>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (error) setError("");
                    }}
                  />
                  <span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</span>
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : "Create Account"}
              </button>
            </form>

            <div className="footer-text">
              <p>Already have an account? <Link to="/login">Sign In</Link></p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: IMAGE */}
        <div className="signup-image-side">
          <div className="image-overlay">
            <div className="overlay-text">
              <h3>Join the Revolution.</h3>
              <p>Scale your business with the most intuitive stock management platform.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}