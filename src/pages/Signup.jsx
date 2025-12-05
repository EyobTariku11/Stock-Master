import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import '../../css/Signup.css';

export default function Signup() {
  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI states
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // 1️⃣ Check empty fields
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    // 2️⃣ Check email format
    if (!isValidEmail(email)) {
      setError("Invalid email format.");
      setIsLoading(false);
      return;
    }

    // 3️⃣ Check password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    // 4️⃣ Check passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    // 5️⃣ Check terms
    if (!agreeTerms) {
      setError("You must agree to the Terms & Conditions.");
      setIsLoading(false);
      return;
    }

    // 6️⃣ Call .NET API
    try {
      const response = await fetch("https://localhost:7262/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json(); // parse JSON

      if (!response.ok) {
        setError(data?.message || "Failed to create account");
        return;
      }

      console.log("User created:", data);
      navigate("/Login");

    } catch (err) {
      console.error("Signup fetch error:", err);
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  // Error highlighting logic
  const isNameError = error && error.includes("fields");
  const isEmailError = error && (error.toLowerCase().includes("email") || error.includes("fields"));
  const isPassError = error && (error.toLowerCase().includes("password") || error.includes("fields") || error.includes("match"));
  const isTermsError = error && error.includes("Terms");

  return (
    <div className="signup-page-wrapper">
      <div className="signup-card-container">

        {/* LEFT SIDE: FORM */}
        <div className="signup-form-side">
          <div className="form-content">
            <Link to="/" className="brand-logo">
              <span className="logo-icon">📦</span> BektarStock
            </Link>

            <div className="header-text">
              <h2>Create Account</h2>
              <p>Start managing your inventory today.</p>
            </div>

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
                    onChange={(e) => { setFullName(e.target.value); if (error) setError(""); }}
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
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="input-group compact">
                <label>Password</label>
                <div 
                  className={`input-wrapper ${isPassError ? 'error' : ''}`} 
                  style={{ position: 'relative' }} // Added relative positioning
                >
                  <span className="icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    style={{ paddingRight: '40px' }} // Space for the eye icon
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: '#888',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="input-group compact">
                <label>Confirm Password</label>
                <div 
                  className={`input-wrapper ${isPassError ? 'error' : ''}`}
                  style={{ position: 'relative' }} // Added relative positioning
                >
                  <span className="icon">🔑</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    style={{ paddingRight: '40px' }} // Space for the eye icon
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(""); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: '#888',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <div className={`terms-group ${isTermsError ? 'error-terms' : ''}`}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => { setAgreeTerms(e.target.checked); if (error) setError(""); }}
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