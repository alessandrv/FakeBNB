import React, { useState, useCallback, useEffect } from "react";
import { Input, Autocomplete, Spinner } from "@heroui/react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Icon } from "leaflet";
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
    // Use OpenStreetMap's Nominatim API for geocoding with improved parameters
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` + 
      `format=json&` +
      `q=${encodeURIComponent(query)}&` +
      `limit=5&` +
      `addressdetails=1&` +
      `accept-language=en&` + // Prefer English results
      `dedupe=1`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data: NominatimResult[] = await response.json();
    
    // Sort results by importance for better suggestions
    return data.sort((a, b) => b.importance - a.importance);
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
      <Input
        label="Property Address"
        placeholder="Enter your property's address"
        value={address}
        onValueChange={handleAddressChange}
        description="Search for your property's address to center the map"
        startContent={isLoading ? <Spinner size="sm" /> : null}
      />
      
     
      
      <div className="md:aspect-auto md:mt-0 md:h-[500px] aspect-square w-full rounded-lg overflow-hidden ">
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
            icon={new Icon({
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