import React from 'react';
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-8">
        <Icon icon="lucide:map-off" className="text-7xl text-default-300 mb-4" />
        <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
        <p className="text-default-500 text-lg max-w-md mx-auto">
          We couldn't find the page you're looking for. Let's get you back on track.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          as={Link}
          to="/"
          color="primary"
          startContent={<Icon icon="lucide:home" />}
        >
          Go Home
        </Button>
        <Button 
          as={Link}
          to="/search"
          variant="bordered"
          startContent={<Icon icon="lucide:search" />}
        >
          Search Properties
        </Button>
      </div>
    </div>
  );
}; 