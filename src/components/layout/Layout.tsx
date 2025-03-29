import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Icon } from '@iconify/react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Function to check if a path is active
const isActive = (path: string, currentPath: string) => {
  if (path === '/' && currentPath === '/') return true;
  if (path !== '/' && currentPath.startsWith(path)) return true;
  return false;
};

export const Layout = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const path = location.pathname;
  
  // Check if the current page is the map/dashboard page
  const isMapPage = path === '/dashboard' || path === '/map';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with Navbar - visibility controlled by CSS variables */}
      <div className="site-header">
        <Navbar />
      </div>
      
      <main className={`flex-grow ${isMapPage ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        <Outlet />
      </main>
      
      <Footer className="hidden md:block" />
      
      {/* Mobile bottom tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-default-200 z-40">
        <div className="grid grid-cols-4 h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center space-y-1 ${
              isActive('/', path) ? 'text-primary' : 'text-default-500'
            }`}
          >
            <Icon icon="lucide:home" className="text-xl" />
            <span className="text-xs">Home</span>
          </Link>
          
          <Link
            to="/map"
            className={`flex flex-col items-center justify-center space-y-1 ${
              isActive('/map', path) || isActive('/dashboard', path) ? 'text-primary' : 'text-default-500'
            }`}
          >
            <Icon icon="lucide:map" className="text-xl" />
            <span className="text-xs">Map</span>
          </Link>
          
          <Link
            to="/bookings"
            className={`flex flex-col items-center justify-center space-y-1 ${
              isActive('/bookings', path) ? 'text-primary' : 'text-default-500'
            }`}
          >
            <Icon icon="lucide:calendar" className="text-xl" />
            <span className="text-xs">Bookings</span>
          </Link>
          
          {isAuthenticated ? (
            <Link
              to="/profile"
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActive('/profile', path) ? 'text-primary' : 'text-default-500'
              }`}
            >
              <Icon icon="lucide:user" className="text-xl" />
              <span className="text-xs">Profile</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActive('/login', path) ? 'text-primary' : 'text-default-500'
              }`}
            >
              <Icon icon="lucide:log-in" className="text-xl" />
              <span className="text-xs">Login</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}; 