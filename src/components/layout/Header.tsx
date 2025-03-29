import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    return `${firstInitial}${lastInitial}`;
  };

  return (
    <header className="bg-background border-b border-default-200 sticky top-0 z-30">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Icon icon="lucide:home" className="text-2xl text-primary" />
          <span className="font-bold text-xl">FakeBNB</span>
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search for properties..."
              className="w-full pl-10 pr-4 py-2 rounded-full border border-default-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Icon 
              icon="lucide:search" 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-default-500"
            />
          </div>
        </div>

       

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/map">
            <Button variant="light" startContent={<Icon icon="lucide:map" />}>
              Map View
            </Button>
          </Link>
          {isAuthenticated ? (
            <Dropdown>
              <DropdownTrigger>
                <Button 
                  isIconOnly 
                  variant="light" 
                  className="rounded-full"
                  aria-label="User menu"
                >
                  <Avatar 
                    name={getInitials(user?.first_name, user?.last_name)} 
                    size="sm" 
                    className="transition-transform"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User actions">
                <DropdownItem key="profile" textValue="Profile">
                  <Link to="/profile" className="flex items-center gap-2">
                    <Icon icon="lucide:user" />
                    <span>Profile</span>
                  </Link>
                </DropdownItem>
                <DropdownItem key="bookings" textValue="Bookings">
                  <Link to="/bookings" className="flex items-center gap-2">
                    <Icon icon="lucide:calendar" />
                    <span>My Bookings</span>
                  </Link>
                </DropdownItem>
                <DropdownItem key="logout" textValue="Logout" className="text-danger" onClick={handleLogout}>
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:log-out" />
                    <span>Logout</span>
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : (
            <>
              <Link to="/login">
                <Button variant="light">Login</Button>
              </Link>
              <Link to="/register">
                <Button color="primary">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      
    </header>
  );
};