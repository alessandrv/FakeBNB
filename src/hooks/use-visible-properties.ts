import React from 'react';
import { Property } from '../types/property';

export const useVisibleProperties = (
  properties: Property[],
  bounds: [[number, number], [number, number]] | null
) => {
  return React.useMemo(() => {
    if (!bounds) return properties;

    const [[south, west], [north, east]] = bounds;
    
    return properties.filter((property) => {
      const { lat, lng } = property.location;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    });
  }, [properties, bounds]);
};
