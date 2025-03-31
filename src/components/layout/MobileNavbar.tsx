import React from 'react';

import { Icon } from '@iconify/react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '@heroui/react';
import { motion } from 'framer-motion';

// Function to check if a path is active
const isActive = (path: string, currentPath: string) => {
  if (path === '/' && currentPath === '/') return true;
  if (path !== '/' && currentPath.startsWith(path)) return true;
  return false;
};

export const MobileNavbar = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const path = location.pathname;
  
  // Check if the current page is the map/dashboard page
  const isMapPage = path === '/dashboard' || path === '/map';
  
  // Get user initials for avatar fallback
  const userInitials = user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : '';

  return (
    <div className=" flex flex-col min-h-screen bg-background">
      {/* Header with Navbar - visibility controlled by CSS variables */}
    
      
      <main className={`flex-grow pb-0`}>
        <Outlet />
      </main>
      
      
      {/* Mobile bottom tabs - visibility controlled by --hide-navbar-mobile CSS variable */}
      <div className="fixed h-[92px] bottom-4 left-1/2 -translate-x-1/2 md:hidden z-40 w-full max-w-lg px-4">
      <div className="relative">
        {/* Dock Background with Glass Effect */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md rounded-2xl border border-default-200/50 shadow-xl" />
        
        {/* Dock Items Container - Standardized Heights */}
        <div className={`relative grid ${isAuthenticated ? 'grid-cols-4' : 'grid-cols-3'} gap-2 p-3`}>
          {/* Home Icon */}
          <motion.div whileHover={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
            <Link
              to="/"
              className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
                isActive('/', path) ? 'text-primary bg-primary/10' : 'text-default-500 hover:bg-default-100'
              }`}
            >
              <div className="h-8 flex items-center justify-center">
                <Icon icon="lucide:home" className="text-2xl" />
              </div>
              <span className="text-xs font-medium mt-1">Home</span>
            </Link>
          </motion.div>

          {/* Map Icon */}
          <motion.div whileHover={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
            <Link
              to="/map"
              className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
                isActive('/map', path) || isActive('/dashboard', path) 
                  ? 'text-primary bg-primary/10' 
                  : 'text-default-500 hover:bg-default-100'
              }`}
            >
              <div className="h-8 flex items-center justify-center">
                <Icon icon="lucide:map" className="text-2xl" />
              </div>
              <span className="text-xs font-medium mt-1">Map</span>
            </Link>
          </motion.div>

          {/* Chat Icon - Only for authenticated users */}
          {isAuthenticated && (
            <motion.div whileHover={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
              <Link
                to="/chat"
                className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
                  isActive('/chat', path) 
                    ? 'text-primary bg-primary/10' 
                    : 'text-default-500 hover:bg-default-100'
                }`}
              >
                <div className="h-8 flex items-center justify-center">
                  <Icon icon="lucide:message-circle" className="text-2xl" />
                </div>
                <span className="text-xs font-medium mt-1">Chat</span>
              </Link>
            </motion.div>
          )}

          {/* Profile/Login Icon */}
          <motion.div whileHover={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
            {isAuthenticated ? (
              <Link
                to="/profile"
                className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
                  isActive('/profile', path) 
                    ? 'text-primary bg-primary/10' 
                    : 'text-default-500 hover:bg-default-100'
                }`}
              >
                <div className="h-8 flex items-center justify-center">
                  <Avatar 
                    src={user?.profilePic} 
                    name={userInitials}
                    size="sm"
                    isBordered={isActive('/profile', path)}
                    color={isActive('/profile', path) ? "primary" : "default"}
                    className="text-tiny"
                  />
                </div>
                <span className="text-xs font-medium mt-1">Profile</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
                  isActive('/login', path) 
                    ? 'text-primary bg-primary/10' 
                    : 'text-default-500 hover:bg-default-100'
                }`}
              >
                <div className="h-8 flex items-center justify-center">
                  <Icon icon="lucide:log-in" className="text-2xl" />
                </div>
                <span className="text-xs font-medium mt-1">Login</span>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </div>
    </div>
  );
}; 