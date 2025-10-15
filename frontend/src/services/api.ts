import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await apiClient.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
  verify: async () => {
    const response = await apiClient.get('/api/auth/verify');
    return response.data;
  },
};

export const employeeAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/employees');
    return response.data;
  },
  create: async (employee: any) => {
    const response = await apiClient.post('/api/employees', employee);
    return response.data;
  },
  update: async (id: number, employee: any) => {
    const response = await apiClient.put(`/api/employees/${id}`, employee);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/employees/${id}`);
    return response.data;
  },
  syncHRMS: async () => {
    const response = await apiClient.post('/api/employees/sync-hrms');
    return response.data;
  },
};

export const supportStaffAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/support-staff');
    return response.data;
  },
  create: async (staff: any) => {
    const response = await apiClient.post('/api/support-staff', staff);
    return response.data;
  },
  update: async (id: number, staff: any) => {
    const response = await apiClient.put(`/api/support-staff/${id}`, staff);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/support-staff/${id}`);
    return response.data;
  },
};

export const guestAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/guests');
    return response.data;
  },
  create: async (guest: any) => {
    const response = await apiClient.post('/api/guests', guest);
    return response.data;
  },
};

export const billingAPI = {
  getHistory: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiClient.get(`/api/billing/history?${params.toString()}`);
    return response.data;
  },
  create: async (billing: any) => {
    const response = await apiClient.post('/api/billing/create', billing);
    return response.data;
  },
};

export const priceMasterAPI = {
  get: async () => {
    const response = await apiClient.get('/api/price-master');
    return response.data;
  },
  update: async (prices: any) => {
    const response = await apiClient.put('/api/price-master', prices);
    return response.data;
  },
};

export const dashboardAPI = {
  getStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiClient.get(`/api/dashboard/stats?${params.toString()}`);
    return response.data;
  },
};

export const reportsAPI = {
  getEmployeeReport: async (filters: any = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.company) params.append('company', filters.company);
    
    const response = await apiClient.get(`/api/reports/employee?${params.toString()}`);
    return response.data;
  },
  getSupportStaffReport: async (filters: any = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.staff_id) params.append('staff_id', filters.staff_id);
    if (filters.company) params.append('company', filters.company);
    
    const response = await apiClient.get(`/api/reports/support-staff?${params.toString()}`);
    return response.data;
  },
  getCompanyReport: async (filters: any = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.company) params.append('company', filters.company);
    
    const response = await apiClient.get(`/api/reports/company?${params.toString()}`);
    return response.data;
  },
};

export default apiClient;