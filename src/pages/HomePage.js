import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import homeBanner from '../assets/background.jpg'; 
import wea from '../assets/p1.png'; 
import ai from '../assets/p2.png'; 
import farm from '../assets/p4.png';
import logoMenu from '../assets/logo-menu.jpg';


function HomePage() {
  return (
    <div className="home">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <img src={logoMenu} style={{width:"60px"}} alt=''/>
          <span className="logo-text">AgriGuard</span>
        </div>
        <ul className="nav-links">
          <li><Link to="/">Trang Chủ</Link></li>
          <li><Link to="/about">Dự Án</Link></li>
        </ul>
      </nav>

      {/* Hero Banner with Text */}
      <div className="banner-container">
        <img src={homeBanner} alt="Home Banner" className="banner-image" />
        <div className="banner-text">
          <h1>AgriGuard</h1>
          <p>"Chăm cây bằng dữ liệu, gặt hái bằng niềm tin"</p>
          <Link to="/about" className="get-started-button">Bắt đầu</Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="feature-card">
          <img src={wea} alt="Weather" />
          <h3>Theo dõi thời tiết</h3>
          <p>Kết nối với dữ liệu thời gian thực</p>
        </div>
        <div className="feature-card">
          <img src={ai} alt="AI" />
          <h3>Tư vấn qua AI</h3>
          <p>Cung cấp những thông tin và hướng dẫn về nuôi trồng</p>
        </div>
        <div className="feature-card">
          <img src={farm} alt="Farm" />
          <h3>"Bản đồ" nuôi trồng</h3>
          <p>Kiểm soát cây trồng thông qua dữ liệu GPS</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
