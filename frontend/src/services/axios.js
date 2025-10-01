import axios from 'axios';

// กำหนด base URL ตาม environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// สร้าง axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // สำหรับส่ง cookies ถ้าจำเป็น
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // ดึง token จาก localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug log (comment out in production)
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Debug log (comment out in production)
    console.log(`📥 Response ${response.status}:`, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error details
    if (error.response) {
      console.error(`❌ API Error ${error.response.status}:`, {
        url: originalRequest?.url,
        message: error.response.data?.message || error.message
      });
    } else if (error.request) {
      console.error('❌ No response from server:', error.message);
    } else {
      console.error('❌ Request setup error:', error.message);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Skip redirect for auth endpoints
      const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
      const isAuthEndpoint = authEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint)
      );
      
      if (!isAuthEndpoint) {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Dispatch logout event (for React components to listen)
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Redirect to login only if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/vet-login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Export default instance สำหรับ backward compatibility
export default axiosInstance;

// Named exports สำหรับ convenience methods
export const api = {
  // Direct axios methods
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  patch: (url, data, config) => axiosInstance.patch(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
  
  // Auth endpoints
  auth: {
    login: (credentials) => axiosInstance.post('/auth/login', credentials),
    register: (userData) => axiosInstance.post('/auth/register', userData),
    logout: () => axiosInstance.post('/auth/logout'),
    me: () => axiosInstance.get('/auth/me'),
    refresh: () => axiosInstance.post('/auth/refresh'),
    updateProfile: (data) => axiosInstance.put('/auth/profile', data),
    changePassword: (data) => axiosInstance.put('/auth/password', data),
  },
  
  // Appointments endpoints
  appointments: {
    getAll: (params) => axiosInstance.get('/appointments', { params }),
    getById: (id) => axiosInstance.get(`/appointments/${id}`),
    create: (data) => axiosInstance.post('/appointments', data),
    update: (id, data) => axiosInstance.put(`/appointments/${id}`, data),
    delete: (id) => axiosInstance.delete(`/appointments/${id}`),
    updateStatus: (id, status) => axiosInstance.patch(`/appointments/${id}/status`, { status }),
  },
  
  // Pets endpoints
  pets: {
    getAll: (params) => axiosInstance.get('/pets', { params }),
    getById: (id) => axiosInstance.get(`/pets/${id}`),
    create: (data) => axiosInstance.post('/pets', data),
    update: (id, data) => axiosInstance.put(`/pets/${id}`, data),
    delete: (id) => axiosInstance.delete(`/pets/${id}`),
    getByOwnerId: (ownerId) => axiosInstance.get(`/pets/owner/${ownerId}`),
  },
  
  // Owners/Customers endpoints
  owners: {
    getAll: (params) => axiosInstance.get('/owners', { params }),
    getById: (id) => axiosInstance.get(`/owners/${id}`),
    create: (data) => axiosInstance.post('/owners', data),
    update: (id, data) => axiosInstance.put(`/owners/${id}`, data),
    delete: (id) => axiosInstance.delete(`/owners/${id}`),
  },
  
  // Veterinarians endpoints
  veterinarians: {
    getAll: (params) => axiosInstance.get('/veterinarians', { params }),
    getById: (id) => axiosInstance.get(`/veterinarians/${id}`),
    create: (data) => axiosInstance.post('/veterinarians', data),
    update: (id, data) => axiosInstance.put(`/veterinarians/${id}`, data),
    delete: (id) => axiosInstance.delete(`/veterinarians/${id}`),
    getSchedule: (id, date) => axiosInstance.get(`/veterinarians/${id}/schedule`, { params: { date } }),
  },
  
  // Medical Records endpoints
  medicalRecords: {
    getAll: (params) => axiosInstance.get('/medical-records', { params }),
    getById: (id) => axiosInstance.get(`/medical-records/${id}`),
    getByPetId: (petId) => axiosInstance.get(`/medical-records/pet/${petId}`),
    create: (data) => axiosInstance.post('/medical-records', data),
    update: (id, data) => axiosInstance.put(`/medical-records/${id}`, data),
    delete: (id) => axiosInstance.delete(`/medical-records/${id}`),
  },
  
  // Services endpoints
  services: {
    getAll: (params) => axiosInstance.get('/services', { params }),
    getById: (id) => axiosInstance.get(`/services/${id}`),
    create: (data) => axiosInstance.post('/services', data),
    update: (id, data) => axiosInstance.put(`/services/${id}`, data),
    delete: (id) => axiosInstance.delete(`/services/${id}`),
  },
  
  // Upload endpoints
  upload: {
    image: (formData) => axiosInstance.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    file: (formData) => axiosInstance.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },
};

// Export instance สำหรับ custom requests
export { axiosInstance };