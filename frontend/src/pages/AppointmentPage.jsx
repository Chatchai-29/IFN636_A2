import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/axios';
import { useAuth } from '../context/AuthContext'; // ใช้ context ไม่ใช่ contexts

const AppointmentPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState(null); // สำหรับแสดง success/error messages
  const { user, isAuthenticated } = useAuth();

  // Show message function
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    // Check authentication first
    if (!isAuthenticated()) {
      setError('Please login to view appointments');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.appointments.getAll({
        status: filter !== 'all' ? filter : undefined,
        userId: user?.id,
      });

      setAppointments(response.data || []);
      console.log('✅ Appointments loaded:', response.data);
    } catch (err) {
      console.error('❌ Failed to fetch appointments:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load appointments');
      }
    } finally {
      setLoading(false);
    }
  }, [filter, user?.id, isAuthenticated]);

  // Update appointment status
  const updateStatus = async (id, newStatus) => {
    try {
      const response = await api.appointments.updateStatus(id, newStatus);
      
      // Update appointment in list
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt)
      );
      
      showMessage(`Appointment ${newStatus}`, 'success');
      return { success: true, data: response.data };
    } catch (err) {
      console.error('❌ Failed to update status:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update status';
      showMessage(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  // Delete appointment
  const deleteAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await api.appointments.delete(id);
      
      // Remove from list
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      showMessage('Appointment deleted successfully', 'success');
      
      return { success: true };
    } catch (err) {
      console.error('❌ Failed to delete appointment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete appointment';
      showMessage(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  // Load appointments on mount and when filter changes
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Filter appointments based on selected filter
  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
        <button
          onClick={fetchAppointments}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Message notification */}
      {message && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Appointments</h1>
        
        {/* Filter buttons */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'confirmed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded capitalize ${
                filter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Create new appointment button */}
        <button
          onClick={() => {
            console.log('Open create appointment form');
            showMessage('Feature coming soon!', 'success');
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + New Appointment
        </button>
      </div>

      {/* Appointments list */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No appointments found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onDelete={deleteAppointment}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Appointment Card Component
const AppointmentCard = ({ appointment, onDelete, onStatusChange }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{appointment.petName || 'Unknown Pet'}</h3>
        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>
      
      <div className="text-gray-600 space-y-1 mb-4">
        <p>📅 {new Date(appointment.date).toLocaleDateString()}</p>
        <p>⏰ {appointment.time}</p>
        <p>👨‍⚕️ Dr. {appointment.veterinarianName || 'TBA'}</p>
        <p>📝 {appointment.reason || 'General Checkup'}</p>
      </div>

      <div className="flex gap-2">
        {appointment.status === 'pending' && (
          <>
            <button
              onClick={() => onStatusChange(appointment.id, 'confirmed')}
              className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Confirm
            </button>
            <button
              onClick={() => onStatusChange(appointment.id, 'cancelled')}
              className="flex-1 px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Cancel
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(appointment.id)}
          className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default AppointmentPage;