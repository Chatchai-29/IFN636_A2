import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">🏥 Vet Clinic System</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.name || user?.email || 'User'}!
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard Header */}
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Today's Appointments
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  12
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Appointments
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-yellow-600">
                  5
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Patients
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  248
                </dd>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/appointments')}
                className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-3xl mb-2">📅</span>
                <span className="text-sm font-medium">View Appointments</span>
              </button>
              
              <button
                onClick={() => navigate('/appointments/new')}
                className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="text-3xl mb-2">➕</span>
                <span className="text-sm font-medium">New Appointment</span>
              </button>
              
              <button
                onClick={() => navigate('/pets')}
                className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <span className="text-3xl mb-2">🐾</span>
                <span className="text-sm font-medium">Manage Pets</span>
              </button>
              
              <button
                onClick={() => navigate('/medical-records')}
                className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <span className="text-3xl mb-2">📋</span>
                <span className="text-sm font-medium">Medical Records</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-green-500">✓</span>
                <span className="text-gray-600">Appointment confirmed for Buddy (Golden Retriever)</span>
                <span className="text-gray-400">2 hours ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-blue-500">📝</span>
                <span className="text-gray-600">Medical record updated for Max (Persian Cat)</span>
                <span className="text-gray-400">3 hours ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-yellow-500">⏰</span>
                <span className="text-gray-600">New appointment request from John Doe</span>
                <span className="text-gray-400">5 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;