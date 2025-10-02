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

  const btnClass = 'px-4 py-2 rounded-full font-bold hover:opacity-90 transition';
  const btnStyle = { backgroundColor: '#F3F58B', color: '#000' };

  return (
    <nav
      className="bg-blue-600 text-black p-4 flex justify-between items-center"
      style={{ fontFamily: "'Cherry Bomb One', cursive" }}
    >
      <Link
        to="/dashboard"
        className="text-2xl font-bold"
        style={{ color: '#FFFFFF' }}
      >
        Pet Clinic Management
      </Link>

      <div className="flex items-center space-x-3">
        {!user && (
          <>
            <Link to="/admin-login" className={btnClass} style={btnStyle}>
              Admin Login
            </Link>
            <Link to="/vet-login" className={btnClass} style={btnStyle}>
              Vet Login
            </Link>
            <Link to="/owner-login" className={btnClass} style={btnStyle}>
              Owner Login
            </Link>
            <Link to="/register" className={btnClass} style={btnStyle}>
              Register
            </Link>
          </>
        )}

        {user && (
          <>
            <Link to="/admin-invoice" className={btnClass} style={btnStyle}>
              Admin Invoice
            </Link>
            <Link to="/admin-prescription" className={btnClass} style={btnStyle}>
              Admin Prescription
            </Link>
            <Link to="/vaccination" className={btnClass} style={btnStyle}>
              Vaccination
            </Link>
            <Link to="/appointments" className={btnClass} style={btnStyle}>
              Appointment
            </Link>
            <Link to="/dashboard" className={btnClass} style={btnStyle}>
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
              Admin Profile
            </Link>
            <button onClick={handleLogout} className={btnClass} style={btnStyle}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
