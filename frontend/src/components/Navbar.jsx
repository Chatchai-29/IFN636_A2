// frontend/src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keep button look & feel exactly the same
  const btnClass =
    'px-4 py-2 rounded-full font-bold hover:opacity-90 transition';
  const btnStyle = { backgroundColor: '#F3F58B', color: '#000' };

  // NEW: only change the bar color by role (menus remain unchanged)
  const ROLE_COLORS = {
    admin: '#A5A1FB', // Admin
    owner: '#FBD4A1', // Pet Owner
    vet:   '#D18AC5', // Vet
    guest: '#2563EB', // Tailwind blue-600 as fallback for guests
  };
  const role = user?.role || 'guest';
  const barColor = ROLE_COLORS[role] || ROLE_COLORS.guest;

  return (
    // Keep existing layout & font, but override background color dynamically
    <nav
      className="bg-blue-600 text-black p-4 flex justify-between items-center"
      style={{ fontFamily: "'Cherry Bomb One', cursive", backgroundColor: barColor }}
    >
      <Link
        to="/Dashboard"
        className="text-2xl font-bold"
        style={{ color: '#FFFFFF' }}
      >
        Pet Clinic Management
      </Link>

      <div className="flex items-center space-x-3">
        {!user && (
          <>
            {/* Vet login → /vet-login */}
            <Link to="/vet-login" className={btnClass} style={btnStyle}>
              Vet Login
            </Link>
            {/* Owner login → /owner-login */}
            <Link to="/owner-login" className={btnClass} style={btnStyle}>
              Owner Login
            </Link>
          </>
        )}

        {user ? (
          <>
            <Link to="/admin-invoice" className={btnClass} style={btnStyle}>
              Admin Invoice
            </Link>
            <Link to="/admin-prescription" className={btnClass} style={btnStyle}>
              Admin Prescription
            </Link>
            <Link to="/appointments" className={btnClass} style={btnStyle}>
              Appointment
            </Link>
            <Link to="/Dashboard" className={btnClass} style={btnStyle}>
              Dashboard
            </Link>
            <Link to="/history" className={btnClass} style={btnStyle}>
              History
            </Link>
            <Link to="/owners" className={btnClass} style={btnStyle}>
              Add Owner
            </Link>
            <Link to="/pets" className={btnClass} style={btnStyle}>
              Add Pet
            </Link>
            <Link to="/profile" className={btnClass} style={btnStyle}>
              Profile
            </Link>
            <button onClick={handleLogout} className={btnClass} style={btnStyle}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={btnClass} style={btnStyle}>
              Admin Login
            </Link>
            <Link to="/register" className={btnClass} style={btnStyle}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
