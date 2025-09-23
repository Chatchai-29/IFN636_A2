// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import PetPage from './pages/PetPage';
import OwnerPage from './pages/OwnerPage';
import AppointmentPage from './pages/AppointmentPage';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import AdminInvoice from './pages/AdminInvoice';
import AdminPrescription from "./pages/AdminPrescription";
import VetDashboard from './pages/VetDashboard';
import Vetprofile from './pages/Vetprofile.jsx';
import Vetlogin from "./pages/Vetlogin";
import OwnerLogin from "./pages/OwnerLogin";

// ✅ NEW: import RoleRoute
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/vet-login" element={<Vetlogin />} />
        <Route path="/owner-login" element={<OwnerLogin />} />

        {/* General public pages (adjust as needed) */}
        <Route path="/pets" element={<PetPage />} />
        <Route path="/owners" element={<OwnerPage />} />
        <Route path="/appointments" element={<AppointmentPage />} />

        {/* ---------- Protected (any authenticated user) ---------- */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ---------- Role-based protection ---------- */}
        {/* Admin-only pages */}
        <Route
          path="/admin-invoice"
          element={
            <ProtectedRoute>
              <RoleRoute allow={['admin']}>
                <AdminInvoice />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-prescription"
          element={
            <ProtectedRoute>
              <RoleRoute allow={['admin']}>
                <AdminPrescription />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Vet-only pages */}
        <Route
          path="/vet-dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allow={['vet']}>
                <VetDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vetprofile"
          element={
            <ProtectedRoute>
              <RoleRoute allow={['vet']}>
                <Vetprofile />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Owner-only example */}
        <Route
          path="/my-pets"
          element={
            <ProtectedRoute>
              <RoleRoute allow={['owner']}>
                <PetPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
