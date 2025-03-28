import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Set up axios defaults
axios.defaults.withCredentials = true;

// Define user interface
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  created_at: string;
  is_verified: boolean;
  profilePic?: string; // Added for profile picture URL
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Create axios instance with auth headers
  const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
  });

  // Add access token to requests
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle token refresh on 401 errors
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is 401 and we haven't tried to refresh the token yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token
          const refreshed = await refreshToken();
          
          if (refreshed) {
            // Retry the original request with new token
            const token = localStorage.getItem('accessToken');
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          } else {
            // If refresh failed, logout and redirect to login
            await logout();
            navigate('/login');
            return Promise.reject(error);
          }
        } catch (refreshError) {
          await logout();
          navigate('/login');
          return Promise.reject(error);
        }
      }
      
      return Promise.reject(error);
    }
  );

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        return false;
      }
      
      const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
        refreshToken,
      });
      
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      return true;
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      return false;
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      }, {
        // Increase timeout for login requests
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      
      // Check specifically for rate limiting errors
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        // Pass through the error with rate limit information
        throw error;
      }
      
      // For demo mode handling when backend is not available
      if (axios.isAxiosError(error) && !error.response) {
        // If network error or server unavailable, handle gracefully
        console.warn('Backend unreachable, consider using demo mode');
      }
      
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint if it exists
      const token = localStorage.getItem('refreshToken');
      if (token) {
        await api.post('/api/auth/logout', { refreshToken: token }).catch(() => {
          // Ignore errors from logout endpoint
        });
      }
    } finally {
      // Clear tokens and user state regardless of API call success
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      
      try {
        // Check if we have a token
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        // Attempt to get user profile
        const response = await api.get('/api/auth/profile');
        setUser(response.data.user);
      } catch (error) {
        console.error('Error loading user:', error);
        
        // If error is 401, try to refresh the token
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const refreshed = await refreshToken();
          
          if (refreshed) {
            // If refresh worked, try to get profile again
            try {
              const response = await api.get('/api/auth/profile');
              setUser(response.data.user);
            } catch (profileError) {
              // If still failing, logout
              await logout();
            }
          } else {
            // If refresh failed, clear user state
            await logout();
          }
        } else {
          // For other errors, clear user state
          await logout();
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Provide auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 