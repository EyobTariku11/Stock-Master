import React, { useState } from 'react';
import '../../css/Landing.css'; 
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    navigate('/Login');
  };

  // Function to smooth scroll to specific sections
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false); // Close menu on mobile click
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="landing-container">
      {/* ===== NAVBAR ===== */}
      <header className="navbar">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-icon">📦</span>
            <span className="logo-text">BektarStock</span>
          </div>

          <nav className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
            {/* Changed to use scrollToSection function for better handling */}
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About Us</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact Us</a>
            
            <div className="mobile-buttons">
               <button className="btn-primary" onClick={handleGetStarted}>Get Started</button>
            </div>
          </nav>

          <div className="nav-buttons">
            <button className="btn-primary" onClick={handleGetStarted}>Get Started</button>
          </div>

          <div className="menu-toggle" onClick={toggleMenu}>
            <div className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></div>
            <div className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></div>
            <div className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></div>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text-wrapper">
            <h1>
              Total control over your <br />
              <span className="gradient-text">inventory & stock.</span>
            </h1>
            <p className="hero-subtitle">
              Eliminate stockouts and overstocking. Track products in real-time, 
              manage suppliers, and streamline your warehouse operations with ease.
            </p>
            
            <div className="hero-cta">
              <button className="btn-primary large" onClick={() => scrollToSection('about')}>
                Learn More
              </button>
            </div>
          </div>
          
          <div className="hero-image-wrapper">
            {/* Background Blob for blending effect */}
            <div className="gradient-blob"></div>
            
            {/* UPDATED IMAGE SOURCE: Using a reliable high-quality warehouse image */}
            <img 
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt="Warehouse Inventory Management" 
              className="hero-img floating"
            />
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Built for modern businesses</h2>
          <p>Everything you need to keep your stock moving efficiently.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-box blue">📊</div>
            <h3>Real-time Tracking</h3>
            <p>Monitor stock levels across multiple locations. Get instant low-stock alerts.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box green">🔐</div>
            <h3>User Permissions</h3>
            <p>Assign roles to staff. Control who can add, edit, or remove inventory items.</p>
          </div>
          <div className="feature-card">
            <div className="icon-box purple">🚚</div>
            <h3>Supplier Management</h3>
            <p>Keep track of your suppliers, purchase orders, and incoming shipments in one place.</p>
          </div>
        </div>
      </section>

      {/* ===== ABOUT US SECTION ===== */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-image">
             <img 
               src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
               alt="Our Team" 
             />
          </div>
          <div className="about-text">
            <h4>About Us</h4>
            <h2>We help small businesses scale efficiently.</h2>
            <p>
              Founded in 2025, BektarStock started with a simple mission: to replace 
              clunky spreadsheets with a modern, intuitive inventory tool.
            </p>
            <p>
              We believe that you shouldn't need a degree in logistics to manage your stock. 
              Our team is dedicated to building software that is powerful enough for 
              warehouses but simple enough for local shops.
            </p>
            
            <div className="about-values">
              <div className="value-item">
                <span className="check-icon">✓</span>
                <span>Simple Interface</span>
              </div>
              <div className="value-item">
                <span className="check-icon">✓</span>
                <span>24/7 Support</span>
              </div>
              <div className="value-item">
                <span className="check-icon">✓</span>
                <span>Data Security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT US SECTION ===== */}
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <div className="contact-text">
            <h2>Get in Touch</h2>
            <p>
              Have questions about how BektarStock fits your business? 
              Fill out the form and our team will get back to you shortly.
            </p>
            
            <div className="contact-details">
              <div className="detail-item">
                <span className="detail-icon">📧</span>
                <span>support@BektarStock.com</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📍</span>
                <span>123 Market Street, Suite 400<br/>San Francisco, CA 94103</span>
              </div>
            </div>
          </div>

          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="john@company.com" required />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea placeholder="Tell us about your inventory needs..." rows="4"></textarea>
            </div>
            <button type="submit" className="btn-primary full-width">
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-icon">📦</span>
              <span className="logo-text">BektarStock</span>
            </div>
            <p>Simplifying inventory management for businesses of all sizes.</p>
          </div>
          
          <div className="footer-links">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <a href="#about">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
          </div>

          <div className="footer-links">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} BektarStock Inc. All rights reserved.| Tech by Eyob Tariku</p>
        </div>
      </footer>
    </div>
  );
}