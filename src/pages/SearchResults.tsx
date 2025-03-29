import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';

export const SearchResults = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect to the dashboard/map view with any search parameters
    const searchParams = new URLSearchParams(location.search);
    navigate(`/map${location.search ? location.search : ''}`);
  }, [navigate, location.search]);

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen flex items-center justify-center">
      <Spinner size="lg" color="primary" />
    </div>
  );
}; 