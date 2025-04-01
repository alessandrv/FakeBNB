import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { initializeSocket, disconnectSocket, isSocketConnected } from '../services/socketService';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Set up axios defaults
axios.defaults.withCredentials = true;

// Token refresh timer - 10 minutes
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

// Socket health check - 30 seconds
const SOCKET_HEALTH_CHECK_INTERVAL = 30 * 1000; 

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
  const socketInitialized = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const socketHealthCheckRef = useRef<number | null>(null);
  const lastTokenRefresh = useRef<number>(Date.now());

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

  // Ensure socket connection is healthy
  const checkSocketHealth = () => {
    console.log('Checking socket health...');
    
    // If user is logged in but socket isn't connected, try to reconnect
    if (user && !isSocketConnected()) {
      console.log('Socket disconnected, attempting to reconnect...');
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        // Try to initialize without disrupting the UI
        try {
          console.log('Reinitializing socket due to health check');
          initializeSocket(token);
          socketInitialized.current = true;
        } catch (error) {
          console.error('Error reinitializing socket:', error);
        }
      }
    } else {
      console.log('Socket health check passed');
    }
  };

  // Set up socket health monitor
  const setupSocketHealthMonitor = () => {
    // Clear any existing timer
    if (socketHealthCheckRef.current) {
      window.clearInterval(socketHealthCheckRef.current);
    }
    
    // Set up new health check if user is logged in
    if (user) {
      socketHealthCheckRef.current = window.setInterval(() => {
        checkSocketHealth();
      }, SOCKET_HEALTH_CHECK_INTERVAL) as unknown as number;
    }
  };

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
            
            // Only reinitialize socket if it's not connected
            if (token && user && !isSocketConnected()) {
              console.log('Reinitializing socket with new token after 401');
              initializeSocket(token);
              socketInitialized.current = true;
            }
            
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

  // Set up proactive token refresh
  const setupTokenRefresh = () => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
    }
    
    // Set up new timer if user is logged in
    if (user) {
      refreshTimerRef.current = window.setInterval(async () => {
        // Don't refresh if we just did it recently (avoid duplicate refreshes)
        const timeSinceLastRefresh = Date.now() - lastTokenRefresh.current;
        if (timeSinceLastRefresh < TOKEN_REFRESH_INTERVAL / 2) {
          console.log('Skipping token refresh, was refreshed recently');
          return;
        }
        
        console.log('Proactively refreshing token');
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('Token refreshed successfully');
            lastTokenRefresh.current = Date.now();
            
            // Only update socket if it's not connected
            if (!isSocketConnected()) {
              const token = localStorage.getItem('accessToken');
              if (token) {
                console.log('Updating socket with new token after scheduled refresh');
                initializeSocket(token);
                socketInitialized.current = true;
              }
            }
          } else {
            console.warn('Token refresh failed');
          }
        } catch (error) {
          console.error('Error during scheduled token refresh:', error);
        }
      }, TOKEN_REFRESH_INTERVAL) as unknown as number;
    }
  };

  // Initialize socket when user is authenticated
  useEffect(() => {
    if (user && localStorage.getItem('accessToken')) {
      // Check if socket is already connected before trying to initialize
      if (!isSocketConnected()) {
        console.log('Initializing socket connection...');
        const token = localStorage.getItem('accessToken');
        if (token) {
          initializeSocket(token);
          socketInitialized.current = true;
        }
      } else {
        console.log('Socket already connected, skipping initialization');
      }
      
      // Set up monitors
      setupTokenRefresh();
      setupSocketHealthMonitor();
    }
    
    return () => {
      console.log('Cleaning up socket in AuthContext');
      disconnectSocket();
      socketInitialized.current = false;
      
      // Clear timers
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      
      if (socketHealthCheckRef.current) {
        window.clearInterval(socketHealthCheckRef.current);
        socketHealthCheckRef.current = null;
      }
    };
  }, [user]);

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
      
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        lastTokenRefresh.current = Date.now();
        
        // Store new refresh token too if it's provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Only clear tokens if the error indicates the refresh token is invalid
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
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
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);

      // Initialize socket connection after successful login
      console.log('Initializing socket connection after login...');
      initializeSocket(accessToken);
      socketInitialized.current = true;
    } catch (error) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw error;
      }
      
      if (axios.isAxiosError(error) && !error.response) {
        console.warn('Backend unreachable, consider using demo mode');
      }
      
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Disconnect from Socket.IO
      disconnectSocket();
      socketInitialized.current = false;
      
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
        
        // Initialize socket if we have a user
        if (response.data.user && !socketInitialized.current) {
          initializeSocket(token);
          socketInitialized.current = true;
        }
      } catch (error) {
        console.error('Error loading user:', error);
        
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const refreshed = await refreshToken();
          
          if (refreshed) {
            try {
              const response = await api.get('/api/auth/profile');
              setUser(response.data.user);
              
              // Initialize socket if we have a user
              if (response.data.user && !socketInitialized.current) {
                const newToken = localStorage.getItem('accessToken');
                if (newToken) {
                  initializeSocket(newToken);
                  socketInitialized.current = true;
                }
              }
            } catch (profileError) {
              await logout();
            }
          } else {
            await logout();
          }
        } else {
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