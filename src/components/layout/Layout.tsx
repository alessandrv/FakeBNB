import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Icon } from '@iconify/react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '@heroui/react';

// Function to check if a path is active
const isActive = (path: string, currentPath: string) => {
  if (path === '/' && currentPath === '/') return true;
  if (path !== '/' && currentPath.startsWith(path)) return true;
  return false;
};

export const Layout = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const path = location.pathname;
  
  // Check if the current page is the map/dashboard page
  const isMapPage = path === '/dashboard' || path === '/map';
  
  // Get user initials for avatar fallback
  const userInitials = user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : '';

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
        <div className={`grid ${isAuthenticated ? 'grid-cols-4' : 'grid-cols-3'} h-16`}>
          {/* Home tab - always visible */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center space-y-1 ${
              isActive('/', path) ? 'text-primary' : 'text-default-500'
            }`}
          >
            <Icon icon="lucide:home" className="text-xl" />
            <span className="text-xs">Home</span>
          </Link>
          
          {/* Map tab - always visible */}
          <Link
            to="/map"
            className={`flex flex-col items-center justify-center space-y-1 ${
              isActive('/map', path) || isActive('/dashboard', path) ? 'text-primary' : 'text-default-500'
            }`}
          >
            <Icon icon="lucide:map" className="text-xl" />
            <span className="text-xs">Map</span>
          </Link>
          
          {/* Chat tab - only visible when logged in */}
          {isAuthenticated && (
            <Link
              to="/chat"
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActive('/chat', path) ? 'text-primary' : 'text-default-500'
              }`}
            >
              <Icon icon="lucide:message-circle" className="text-xl" />
              <span className="text-xs">Chat</span>
            </Link>
          )}
          
          {/* Profile tab - show profile pic when logged in, or login icon */}
          {isAuthenticated ? (
            <Link
              to="/profile"
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActive('/profile', path) ? 'text-primary' : 'text-default-500'
              }`}
            >
              <Avatar 
                src={user?.profilePic} 
                name={userInitials}
                size="sm"
                isBordered={isActive('/profile', path)}
                color={isActive('/profile', path) ? "primary" : "default"}
                className="text-tiny"
              />
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