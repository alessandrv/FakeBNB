import React, { useState, useCallback, useEffect } from "react";
import { Input, Autocomplete, Spinner, AutocompleteItem } from "@heroui/react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Icon as LeafletIcon } from "leaflet";
import { Icon as IconifyIcon } from '@iconify/react';
import { ListingData } from "../../pages/CreateHouse";

interface AddressStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

// OpenStreetMap Nominatim API response interface
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

// Enhanced Search for locations using OpenStreetMap Nominatim API
const searchLocations = async (query: string): Promise<NominatimResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    // Format the query to better handle house numbers
    const formattedQuery = query.replace(/(\d+)\s+([A-Za-z])/, '$1, $2');
    
    // Use OpenStreetMap's Nominatim API for geocoding with improved parameters
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` + 
      `format=json&` +
      `q=${encodeURIComponent(formattedQuery)}&` +
      `limit=10&` +
      `addressdetails=1&` +
      `accept-language=en&` + // Prefer English results
      `dedupe=1&` +
      `countrycodes=it&` + // Limit to Italy
      `featuretype=house,street,place&` + // Include houses and streets
      `viewbox=6.6272658,35.2889616,18.7844746,47.0921462` // Bounding box for Italy
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data: NominatimResult[] = await response.json();
    console.log('Search results:', data); // Debug log
    
    // Sort results by importance and prioritize house numbers
    return data.sort((a, b) => {
      // Prioritize results that match house numbers if the query includes numbers
      const queryHasNumber = /\d/.test(query);
      const aHasNumber = /\d/.test(a.display_name);
      const bHasNumber = /\d/.test(b.display_name);
      
      if (queryHasNumber) {
        if (aHasNumber && !bHasNumber) return -1;
        if (!aHasNumber && bHasNumber) return 1;
      }
      
      return b.importance - a.importance;
    });
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return [];
  }
};

// Component to update map center when location changes
function MapCenterUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, 17, { animate: true });
  }, [map, position]);
  
  return null;
}

// Debounce function to limit API calls
function debounce<F extends (...args: any[]) => any>(func: F, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function(...args: Parameters<F>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }
}

export function AddressStep({ data, updateData }: AddressStepProps) {
  const [address, setAddress] = useState(data.address.formatted);
  const [suggestedLocations, setSuggestedLocations] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  // Set default map view to Italy if no location is provided
  const initialMapCenter = data.address.location[0] !== 0 && data.address.location[1] !== 0 
    ? data.address.location 
    : [42.5, 12.5] as [number, number]; // Center of Italy
  const initialZoom = data.address.formatted ? 15 : 6; // Zoomed out for Italy, detailed for specific address

  // Debounce function for location search
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length >= 3) {
        setIsLoading(true);
        const results = await searchLocations(query);
        setSuggestedLocations(results);
        setIsLoading(false);
      } else {
        setSuggestedLocations([]);
      }
    }, 350),
    []
  );

  useEffect(() => {
    debouncedSearch(address);
  }, [address, debouncedSearch]);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setShowResults(true);
    
    updateData({
      ...data,
      address: {
        ...data.address,
        formatted: value,
      },
    });
  };

  const handleLocationSelect = (key: any) => {
    if (key) {
      const selected = suggestedLocations.find(
        loc => loc.place_id.toString() === key
      );
      
      if (selected) {
        setSelectedLocation(selected);
        setAddress(selected.display_name);
        setShowResults(false); // Hide results after selection
        
        const location: [number, number] = [parseFloat(selected.lat), parseFloat(selected.lon)];
        
        updateData({
          ...data,
          address: {
            ...data.address,
            formatted: selected.display_name,
            location: location,
          },
        });
      }
    }
  };

  return (
    <div className="pb-0">
      <div className="relative">
        <Input
          label="Property Address"
          placeholder="Enter your property's address"
          value={address}
          onValueChange={handleAddressChange}
          description="Search for your property's address to center the map"
          startContent={isLoading ? <Spinner size="sm" /> : null}
        />
        
        {/* Search Results */}
        {showResults && address.length >= 3 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-default-200 rounded-lg shadow-lg overflow-hidden">
            {isLoading ? (
              <div className="p-4 text-center">
                <Spinner size="sm" />
                <span className="ml-2">Searching...</span>
              </div>
            ) : suggestedLocations.length > 0 ? (
              suggestedLocations.map((location) => (
                <button
                  key={location.place_id}
                  className="w-full px-4 py-3 flex items-start gap-2 hover:bg-default-100 transition-colors text-left border-b border-default-100 last:border-none"
                  onClick={() => handleLocationSelect(location.place_id.toString())}
                >
                  <IconifyIcon icon="lucide:map-pin" className="mt-1 flex-shrink-0" />
                  <span className="text-sm">{location.display_name}</span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-default-500">
                No results found
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="md:aspect-auto md:mt-0 md:h-[500px] aspect-square w-full rounded-lg overflow-hidden mt-4">
        <MapContainer
          center={initialMapCenter}
          zoom={initialZoom}
          className="w-full h-full"
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={data.address.location}
            icon={new LeafletIcon({
              iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })}
          />
          <MapCenterUpdater position={data.address.location} />
        </MapContainer>
      </div>
    </div>
  );
}