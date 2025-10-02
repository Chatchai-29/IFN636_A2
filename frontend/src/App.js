// frontend/src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';              // ถ้าใช้เป็น AdminLogin เดิม ให้เปลี่ยน import ตามไฟล์จริง
import AdminLogin from './pages/AdminLogin';    // <— หน้าแอดมินที่มี secure code
import OwnerLogin from './pages/OwnerLogin';    // <— หน้า owner แยก
import Vetlogin from "./pages/Vetlogin";

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
import Vaccination from "./pages/Vaccination";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* login pages per role */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/vet-login" element={<Vetlogin />} />
        <Route path="/owner-login" element={<OwnerLogin />} />

        {/* old generic login */}
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/pets" element={<PetPage />} />
        <Route path="/owners" element={<OwnerPage />} />
        <Route path="/appointments" element={<AppointmentPage />} />
        <Route path="/admin-invoice" element={<AdminInvoice />} />
        <Route path="/admin-prescription" element={<AdminPrescription />} />
        <Route path="/vet-dashboard" element={<VetDashboard />} />
        <Route path="/vetprofile" element={<Vetprofile />} />
        <Route path="/vaccination" element={<Vaccination />} />

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
      </Routes>
    </Router>
  );
}

export default App;