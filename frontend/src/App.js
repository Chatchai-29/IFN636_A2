import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Import Pages
import LoginPage from './pages/LoginPage';
import VetLoginPage from './pages/VetLoginPage';
import OwnerLoginPage from './pages/OwnerLoginPage';
import AppointmentPage from './pages/AppointmentPage';
import DashboardPage from './pages/DashboardPage';
// Import other pages as needed

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/vet-login" replace />;
  }
  
  return children;
};

// Home/Landing Page Component
const HomePage = () => {
  const token = localStorage.getItem('token');
  
  // If logged in, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Landing page for non-logged in users
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-bold text-gray-900 mb-8">
          🏥 Vet Clinic System
        </h1>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Welcome! Please select your login type:
          </h2>
          
          <div className="space-y-4">
            <a
              href="/vet-login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              👨‍⚕️ Veterinarian Login
            </a>
            
            <a
              href="/owner-login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              🐾 Pet Owner Login
            </a>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>
            
            <a
              href="/register"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create New Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Navigate to="/vet-login" replace />} />
            <Route path="/vet-login" element={<VetLoginPage />} />
            <Route path="/owner-login" element={<OwnerLoginPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/appointments" 
              element={
                <ProtectedRoute>
                  <AppointmentPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Add more routes as needed */}
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;