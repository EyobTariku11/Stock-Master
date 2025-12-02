import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => navigate('/signup');
  const handleLogin = () => navigate('/login');

  const scrollToSection = (id) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-wrapper">
      {/* ===== NAVBAR ===== */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="brand">
            <div className="logo-box">📦</div>
            <span className="brand-name">StockMaster</span>
          </div>

          <nav className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            <a onClick={() => scrollToSection('features')}>Features</a>
            <a onClick={() => scrollToSection('about')}>Why Us</a>
            <a onClick={() => scrollToSection('contact')}>Contact</a>
            
            <div className="mobile-actions">
               <button className="btn-text" onClick={handleLogin}>Log In</button>
               <button className="btn-primary" onClick={handleGetStarted}>Get Started</button>
            </div>
          </nav>

          <div className="desktop-actions">
            <button className="btn-text" onClick={handleLogin}>Log In</button>
            <button className="btn-primary" onClick={handleGetStarted}>Get Started</button>
          </div>

          <button className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <span className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="hero">
        <div className="hero-bg-glow"></div>
        <div className="container hero-container">
          <div className="hero-content fade-up">
            <div className="badge">✨ v2.0 is now live</div>
            <h1>
              Inventory management <br />
              <span className="text-gradient">reimagined for growth.</span>
            </h1>
            <p className="subtitle">
              Stop wrestling with spreadsheets. Track stock, manage suppliers, 
              and forecast demand with an intelligent platform designed for modern business.
            </p>
            <div className="cta-group">
              <button className="btn-primary large" onClick={handleGetStarted}>
                Start Free Trial
              </button>
              <button className="btn-secondary large" onClick={() => scrollToSection('features')}>
                View Demo
              </button>
            </div>
            <div className="trust-badges">
              <span>Trusted by 500+ businesses</span>
              <div className="avatars">
                <div className="avatar"></div>
                <div className="avatar"></div>
                <div className="avatar"></div>
                <div className="avatar-plus">+</div>
              </div>
            </div>
          </div>

          {/* CSS-Only Dashboard Mockup */}
          <div className="hero-visual fade-up-delay">
            <div className="dashboard-mockup">
              <div className="mockup-header">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="bar"></div>
              </div>
              <div className="mockup-body">
                <div className="sidebar"></div>
                <div className="main-view">
                  <div className="chart-placeholder"></div>
                  <div className="grid-placeholder">
                    <div className="row"></div>
                    <div className="row"></div>
                    <div className="row"></div>
                  </div>
                </div>
              </div>
              {/* Floating Cards */}
              <div className="float-card card-1">
                <div className="icon">⚠️</div>
                <div className="text">
                  <span>Low Stock Alert</span>
                  <small>MacBook Pro M2</small>
                </div>
              </div>
              <div className="float-card card-2">
                <div className="icon">📈</div>
                <div className="text">
                  <span>Sales up 24%</span>
                  <small>This week</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES BENTO GRID ===== */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-head text-center">
            <h2>Everything you need to scale</h2>
            <p>Powerful features wrapped in a simple, intuitive interface.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card span-2">
              <div className="card-content">
                <div className="icon-wrapper blue">📊</div>
                <h3>Real-time Analytics</h3>
                <p>Visualize your inventory turnover, profit margins, and stock levels in real-time with our interactive dashboard.</p>
              </div>
              <div className="card-visual graph-visual"></div>
            </div>

            <div className="bento-card">
              <div className="icon-wrapper purple">⚡</div>
              <h3>Automated Alerts</h3>
              <p>Never run out of stock. Set custom thresholds and get notified via Email or SMS automatically.</p>
            </div>

            <div className="bento-card">
              <div className="icon-wrapper green">🔐</div>
              <h3>Role Management</h3>
              <p>Granular permissions for Admins, Managers, and Warehouse staff to keep data secure.</p>
            </div>

            <div className="bento-card span-3">
              <div className="card-row">
                <div className="text-side">
                  <div className="icon-wrapper orange">🚚</div>
                  <h3>Supplier Relations</h3>
                  <p>Centralize your supply chain. Create Purchase Orders instantly and track shipments from origin to warehouse.</p>
                </div>
                <div className="visual-side">
                  {/* Decorative visual lines */}
                  <div className="connection-line"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT / STATS ===== */}
      <section id="about" className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="number">99%</span>
              <span className="label">Inventory Accuracy</span>
            </div>
            <div className="stat-item">
              <span className="number">24/7</span>
              <span className="label">Expert Support</span>
            </div>
            <div className="stat-item">
              <span className="number">1M+</span>
              <span className="label">Products Tracked</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT CTA ===== */}
      <section id="contact" className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Ready to streamline your operations?</h2>
              <p>Join hundreds of businesses moving faster with StockMaster.</p>
              <form className="quick-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Enter your work email" />
                <button type="submit" className="btn-primary">Get Started</button>
              </form>
              <p className="tiny-text">No credit card required. 14-day free trial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="logo-text">StockMaster</span>
              <p>The operating system for modern warehouses.</p>
            </div>
            <div className="footer-links-group">
              <div className="link-col">
                <h4>Product</h4>
                <a href="#">Features</a>
                <a href="#">Pricing</a>
                <a href="#">Integrations</a>
              </div>
              <div className="link-col">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Careers</a>
              </div>
              <div className="link-col">
                <h4>Legal</h4>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Security</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 StockMaster Inc.</p>
            <div className="socials">
              <span>𝕏</span>
              <span>In</span>
              <span>Ig</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}