import { Link } from 'react-router-dom';

export default function Navbar({ user, onLoginClick, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <svg width="20" height="20" viewBox="0 0 40 40">
          <polygon
            points="20,3 33,3 37,11 33,19 20,19 16,11"
            fill="none"
            stroke="#F5A623"
            strokeWidth="1.5"
          />
          <path
            d="M23 5.5 L18.5 13 L22.5 13 L20 19 L28 11 L23.5 11 Z"
            fill="#F5A623"
          />
        </svg>
        <span className="logo-text">
          <span className="logo-net">NET</span>
          <span className="logo-flash">flash</span>
        </span>
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/dashboard" style={{ color: '#F5A623', fontWeight: 'bold' }}>⭐ Watchlist</Link>
            <button onClick={onLogout} style={{ background: 'none', color: '#8A8682', fontSize: '13px', fontWeight: '500' }}>Logout</button>
          </>
        ) : (
          <button onClick={onLoginClick} style={{ background: '#F5A623', color: '#0F0F0F', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
            Log In
          </button>
        )}
      </div>
    </nav>
  );
}
