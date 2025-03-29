import React from 'react';
import { useParams } from 'react-router-dom';

export const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Property Details</h1>
      <p className="text-default-500">
        This is a placeholder for the property details page for property ID: {id}
      </p>
    </div>
  );
}; 