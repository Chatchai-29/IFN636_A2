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

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
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
        <Route path="/vet-login" element={<Vetlogin />} />
        <Route path="/owner-login" element={<OwnerLogin />} />

        {/* Protect History */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Protect Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Protect Profile */}
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
