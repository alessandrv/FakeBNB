import React, { useState, useRef, FormEvent, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, CardBody, CardFooter, Input, Divider, Popover, PopoverTrigger, PopoverContent, Autocomplete, AutocompleteItem, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DraggableBottomSheet, DraggableBottomSheetHandle } from '../components/DraggableBottomSheet';
import { Link, useLocation } from 'react-router-dom';

// Import properties from data file
import { properties } from '../data/properties';

// Fix marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import { Header } from '../components/layout/Header';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});

// Define search params interface
interface SearchParams {
  location: string;
  checkIn: string;
  checkOut: string;
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

// Constants for POI markers
const POI_MIN_ZOOM_LEVEL = 14;
const MIN_FETCH_INTERVAL = 5000;

// Enhanced Search for locations using OpenStreetMap Nominatim API
const searchLocations = async (query: string): Promise<NominatimResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    // Use OpenStreetMap's Nominatim API for geocoding with improved parameters
    // Add featureType to filter for cities and countries only
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` + 
      `format=json&` +
      `q=${encodeURIComponent(query)}&` +
      `limit=5&` +
      `addressdetails=1&` +
      `accept-language=en&` + // Prefer English results
      `dedupe=1&` + // Remove duplicate results
      `featuretype=city,country,state,county,region,district` // Limit to administrative boundaries
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data: NominatimResult[] = await response.json();
    
    // Filter results to only include places that are cities or countries
    // This is an additional check as the API's featuretype parameter might not be 100% reliable
    const filteredData = data.filter(item => {
      const lowerClass = item.class.toLowerCase();
      const lowerType = item.type.toLowerCase();
      
      // Check if the result is a city, country, state, or administrative boundary
      return (
        lowerClass === 'boundary' || 
        lowerClass === 'place' || 
        lowerType.includes('city') || 
        lowerType.includes('town') || 
        lowerType.includes('country') || 
        lowerType.includes('state') || 
        lowerType.includes('region') ||
        lowerType === 'administrative'
      );
    });
    
    // Sort results by importance for better suggestions
    return filteredData.sort((a, b) => b.importance - a.importance);
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return [];
  }
};

// Enhanced SearchBar component
const SearchBar = ({ onSearch, isSearching = false }: { 
  onSearch: (params: SearchParams, coordinates?: [number, number]) => void;
  isSearching?: boolean;
}) => {
  const [location, setLocation] = useState('');
  const [suggestedLocations, setSuggestedLocations] = useState<NominatimResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileDateOpen, setIsMobileDateOpen] = useState(false); // Separate state for mobile date picker
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Validate dates are selected before searching
  const validateDates = (): boolean => {
    if (!checkIn || !checkOut) {
      setDateError("Please select check-in and check-out dates");
      return false;
    }
    setDateError(null);
    return true;
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchAttempted(true);
    
    // Validate dates are selected
    if (!validateDates()) {
      // Open the date picker if dates aren't selected
      if (window.innerWidth < 768) {
        setIsMobileDateOpen(true);
      } else {
        setIsOpen(true);
      }
      return;
    }
    
    // Close the virtual keyboard on mobile
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    if (selectedLocation) {
      onSearch(
        { location, checkIn, checkOut }, 
        [parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lon)] as [number, number]
      );
    } else if (location.trim()) {
      // Still search even without a selected location from autocomplete
      onSearch({ location, checkIn, checkOut });
    }
  };

  // Create a formatted date string for display
  const formattedDates = useMemo(() => {
    if (checkIn && checkOut) {
      return `${checkIn} — ${checkOut}`;
    }
    return "Add dates";
  }, [checkIn, checkOut]);

  // Debounce function for location search with improved timing
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
    }, 350), // Slightly longer debounce for better UX
    []
  );

  useEffect(() => {
    debouncedSearch(location);
    
    // Reset search attempted state when user types new input
    if (searchAttempted) {
      setSearchAttempted(false);
    }
  }, [location, debouncedSearch, searchAttempted]);

  // Handle direct input changes
  const handleInputChange = (value: string) => {
    setLocation(value);
    
    // If the input is cleared or changed significantly, reset the selected location
    if (!value || (selectedLocation && !value.includes(selectedLocation.display_name.split(',')[0]))) {
      setSelectedLocation(null);
    }
  };

  // Format display name for better readability
  const formatLocationName = (displayName: string): string => {
    const parts = displayName.split(',');
    if (parts.length > 2) {
      return `${parts[0].trim()}, ${parts[parts.length - 2].trim()}`;
    }
    return parts[0].trim();
  };

  // Create a combined array that includes a "no results" item when appropriate
  const autocompleteItems = useMemo(() => {
    if (location.length >= 3 && suggestedLocations.length === 0 && !isLoading) {
      return [{ 
        place_id: -1, 
        display_name: "No results found",
        lat: "0",
        lon: "0",
        // Add other required properties with default values
        licence: "",
        osm_type: "",
        osm_id: 0,
        boundingbox: [],
        class: "",
        type: "",
        importance: 0
      }];
    }
    return suggestedLocations;
  }, [location, suggestedLocations, isLoading]);

  // Date popover content - shared between mobile and desktop
  const datePopoverContent = (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="block text-small text-default-600 mb-1">Check in</label>
        <Input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          placeholder="Add date"
          color="default"
        />
      </div>
      <div>
        <label className="block text-small text-default-600 mb-1">Check out</label>
        <Input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          placeholder="Add date"
          color="default"
        />
      </div>
      {dateError && <p className="text-danger text-xs">{dateError}</p>}
      <Button 
        color="primary" 
        className="bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
        onClick={() => {
          // Validate dates before applying
          if (!checkIn || !checkOut) {
            setDateError("Please select both check-in and check-out dates");
            return;
          }
          
          // Clear date error
          setDateError(null);
          
          // Close both popovers
          setIsOpen(false);
          setIsMobileDateOpen(false);
          
          // Auto-search when dates are selected
          if (selectedLocation) {
            onSearch(
              { location, checkIn, checkOut },
              [parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lon)] as [number, number]
            );
          } else if (location.trim()) {
            onSearch({ location, checkIn, checkOut });
          }
        }}
      >
        Apply
      </Button>
    </div>
  );

  return (
    <div className="fixed top-15 left-2 right-2 bg-white rounded-xl shadow-lg px-2 py-2 md:px-4 md:py-3 z-50">
      <form onSubmit={handleSearch} className="flex items-center gap-1 md:gap-2">
        <div className="flex-1">
          <Autocomplete
            placeholder="Where are you going?"
            value={location}
            onInputChange={handleInputChange}
            onSelectionChange={(key) => {
              if (key) {
                const selected = suggestedLocations.find(
                  loc => loc.place_id.toString() === key
                );
                if (selected) {
                  // Use a more descriptive location name for display
                  // Extract just the city/country name for cleaner display
                  const displayName = selected.display_name;
                  const mainLocationName = displayName.split(',')[0].trim();
                  
                  setSelectedLocation(selected);
                  setLocation(mainLocationName);
                  
                  // Close the virtual keyboard on mobile
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  
                  // Always open the date picker after selecting a location
                  if (window.innerWidth < 768) {
                    setIsMobileDateOpen(true);
                  } else {
                    setIsOpen(true);
                  }
                  
                  // Only auto-search when dates are already selected
                  if (checkIn && checkOut) {
                    onSearch(
                      { location: mainLocationName, checkIn, checkOut },
                      [parseFloat(selected.lat), parseFloat(selected.lon)] as [number, number]
                    );
                  } else {
                    setDateError("Please select check-in and check-out dates");
                  }
                }
              }
            }}
            startContent={<Icon icon="lucide:map-pin" className="text-default-400" />}
            endContent={
              isLoading ? (
                <Icon icon="lucide:loader-2" className="animate-spin text-default-400" />
              ) : location && !selectedLocation && searchAttempted ? (
                <Icon icon="lucide:alert-circle" className="text-danger" />
              ) : null
            }
            className="w-full"
            listboxProps={{
              className: "max-h-[200px] overflow-y-auto",
            }}
            errorMessage={
              location && !selectedLocation && searchAttempted ? 
              "Select a location from the dropdown for more accurate results" : undefined
            }
            items={autocompleteItems}
            aria-label="Search for a location"
          >
            {(item: NominatimResult) => {
              // Special rendering for no results item
              if (item.place_id === -1) {
                return (
                  <AutocompleteItem key="no-results" textValue="No results found" isReadOnly>
                    <div className="text-default-400 italic">No locations found</div>
                  </AutocompleteItem>
                );
              }
              
              // Normal location item rendering
              return (
                <AutocompleteItem key={item.place_id.toString()} textValue={item.display_name}>
                  <div className="flex items-start">
                    <Icon icon="lucide:map-pin" className="mt-0.5 mr-2 text-default-400" />
                    <div>
                      <div className="font-medium">{item.display_name.split(',')[0]}</div>
                      <div className="text-small text-default-400 truncate">
                        {formatLocationName(item.display_name.substring(item.display_name.indexOf(',') + 1))}
                      </div>
                    </div>
                  </div>
                </AutocompleteItem>
              );
            }}
          </Autocomplete>
        </div>

        {/* Mobile Date Selector - Show on mobile only */}
        <div className="md:hidden">
          <Popover isOpen={isMobileDateOpen} onOpenChange={setIsMobileDateOpen} placement="bottom">
            <PopoverTrigger>
              <Button 
                isIconOnly
                variant="flat"
                color="default"
                className="bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
              >
                <Icon icon="lucide:calendar" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0">
              {datePopoverContent}
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Desktop Date Selector - Show on desktop only */}
        <div className="hidden md:block">
          <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger>
              <Button 
                variant="flat" 
                className="justify-between w-full md:w-auto"
                endContent={<Icon icon="lucide:calendar" />}
                color="default"
              >
                {formattedDates}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-4 w-[280px]">
              {datePopoverContent}
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          type="submit" 
          color="primary"
          className="min-w-0 px-3 md:px-8 bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
          isIconOnly={window.innerWidth < 768}
          isLoading={isSearching}
          startContent={window.innerWidth >= 768 ? <Icon icon="lucide:search" /> : null}
        >
          {isSearching ? null : (
            <>
              {window.innerWidth < 768 ? (
                <Icon icon="lucide:search" />
              ) : (
                <span className="ml-1">Search</span>
              )}
            </>
          )}
        </Button>
      </form>

      {/* Date error message */}
      {dateError && (
        <div className="mt-1 px-1 text-xs text-danger">
          {dateError}
        </div>
      )}

      {/* Mobile Date Indicator - Show selected dates on mobile */}
      {(checkIn || checkOut) && (
        <div className="md:hidden mt-1 px-1 text-xs text-default-600">
          <div className="flex items-center">
            <Icon icon="lucide:calendar" className="mr-1 text-primary" width={12} height={12} />
            <span>{formattedDates}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function for debouncing
function debounce<F extends (...args: any[]) => any>(func: F, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<F>) {
    const context = this;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Modified Component for map center updating without changing zoom
const SetMapCenter = ({ center, searchedLocation = false }: { center: [number, number], searchedLocation?: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      // Use a small timeout to ensure the map has fully initialized
      setTimeout(() => {
        // Get current zoom level
        const currentZoom = map.getZoom();
        
        // Use panTo instead of flyTo to maintain zoom level
        map.panTo(center, {
          animate: true,
          duration: 1.0 // Animation duration in seconds
        });
        
        // Force a map redraw to ensure changes take effect
        map.invalidateSize();
      }, 100);
    }
  }, [center, map, searchedLocation]);
  
  return null;
};

// Component for zoom controls
const ZoomControls = () => {
  const map = useMap();
  
  const handleZoomIn = () => {
    map.zoomIn();
  };
  
  const handleZoomOut = () => {
    map.zoomOut();
  };
  
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <Button 
        isIconOnly 
        variant="flat" 
        className="bg-white shadow-md"
        onClick={handleZoomIn}
      >
        <Icon icon="lucide:plus" />
      </Button>
      <Button 
        isIconOnly 
        variant="flat" 
        className="bg-white shadow-md"
        onClick={handleZoomOut}
      >
        <Icon icon="lucide:minus" />
      </Button>
    </div>
  );
};

interface House {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  images: string[];
  location: [number, number];
  address: string;
  beds: number;
  baths: number;
}

// Convert Property type to House type for use in the map
const convertPropertiesToHouses = (): House[] => {
  return properties.map(property => ({
    id: property.id,
    title: property.title,
    price: property.price,
    rating: property.rating,
    reviews: property.reviews,
    // Create an array with the single image
    images: [property.image],
    // Convert the location object to an array format
    location: [property.location.lat, property.location.lng],
    // Use the title or description as the address if no dedicated address field
    address: property.description.split('.')[0], // Use the first sentence of description as address
    // Add default values for properties not in the data file
    beds: Math.floor(Math.random() * 4) + 1, // Random number of beds between 1-4
    baths: Math.floor(Math.random() * 3) + 1 // Random number of baths between 1-3
  }));
};

// Replace the sampleHouses array with the converted properties
const sampleHouses: House[] = convertPropertiesToHouses();

// Enhanced geocoding service using OpenStreetMap Nominatim API with better error handling
const geocodeLocation = async (query: string): Promise<[number, number] | null> => {
  try {
    const results = await searchLocations(query);
    if (results && results.length > 0) {
      console.log("Geocoding results for:", query, results);
      return [parseFloat(results[0].lat), parseFloat(results[0].lon)] as [number, number];
    }
    return null; // Return null instead of default to better handle no results
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
};

// Convert House type for DraggableBottomSheet
const convertHouseForSheet = (house: House) => {
  return {
    id: house.id,
    address: house.title,
    price: house.price,
    image: house.images[0],
    beds: house.beds,
    baths: house.baths,
    rating: house.rating,
    reviews: house.reviews,
    // Include the location for Find on map feature
    location: house.location
  };
};

// Create a context for direct map access
const MapContext = React.createContext<L.Map | null>(null);

export const useMapInstance = () => {
  return React.useContext(MapContext);
};

// Modified MapUpdater to prevent excessive bounds change events
const MapUpdater = ({ houses, onBoundsChange }: { houses: House[], onBoundsChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMap();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef<boolean>(true);
  
  // Export the map instance to the parent component through a global variable and context
  useEffect(() => {
    if (map) {
      console.log("🗺️ Setting leafletMap global reference");
      (window as any).leafletMap = map;
      
      // Force a map invalidation to ensure everything is initialized properly
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
    
    return () => {
      if ((window as any).leafletMap === map) {
        (window as any).leafletMap = null;
      }
    };
  }, [map]);

  useMapEvents({
    moveend: () => {
      // Clear any existing timeout to debounce the bounds change event
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Only update bounds after movement has completely stopped
      timeoutRef.current = setTimeout(() => {
        const currentBounds = map.getBounds();
        console.log("🗺️ Map movement ended, bounds:", {
          north: currentBounds.getNorth().toFixed(5),
          south: currentBounds.getSouth().toFixed(5),
          east: currentBounds.getEast().toFixed(5),
          west: currentBounds.getWest().toFixed(5),
          isInitialLoad: initialLoadRef.current
        });
        
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
        }
        onBoundsChange(currentBounds);
      }, 300);
    }
  });

  // Initial bounds update
  useEffect(() => {
    if (map && initialLoadRef.current) {
      // Set a small delay to ensure the map is fully initialized
      setTimeout(() => {
        const bounds = map.getBounds();
        console.log("🗺️ Initial map bounds:", {
          north: bounds.getNorth().toFixed(5),
          south: bounds.getSouth().toFixed(5),
          east: bounds.getEast().toFixed(5),
          west: bounds.getWest().toFixed(5)
        });
        onBoundsChange(bounds);
        initialLoadRef.current = false;
      }, 500);
    }
  }, [map, onBoundsChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
};

// New component for the floating Load Properties button
const LoadPropertiesButton = ({ onClick, isLoading }: { onClick: () => void, isLoading?: boolean }) => {
  return (
    <div className="fixed bottom-44 left-1/2 transform -translate-x-1/2 z-10">
      <Button 
        color="primary"
        className="shadow-lg rounded-full bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
        isIconOnly
        onClick={onClick}
        isLoading={isLoading}
      >
        {isLoading ? (
          <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
        ) : (
          <Icon icon="lucide:refresh-cw" />
        )}
      </Button>
    </div>
  );
};

const HouseCard = ({ house, onFindOnMap }: { house: House, onFindOnMap: (location: [number, number]) => void }) => (
  <Card className="mb-4">
    <CardBody className="p-0">
      <div className="relative">
        <img
          src={house.images[0]}
          alt={house.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <Button
          isIconOnly
          className="absolute top-2 right-2"
          variant="flat"
          color="default"
          size="sm"
        >
          <Icon icon="lucide:heart" />
        </Button>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{house.title}</h3>
          <div className="flex items-center">
            <Icon icon="lucide:star" className="text-warning" />
            <span className="ml-1">{house.rating}</span>
          </div>
        </div>
        <p className="text-small text-default-500">{house.address}</p>
        <div className="flex gap-2 text-small text-default-500 mt-2">
          <span>{house.beds} beds</span>
          <span>•</span>
          <span>{house.baths} baths</span>
        </div>
      </div>
    </CardBody>
    <CardFooter className="flex-col items-stretch gap-2">
      <div className="flex justify-between items-center w-full">
        <span className="font-semibold">${house.price}</span>
        <span className="text-small text-default-500">{house.reviews} reviews</span>
      </div>
      <div className="flex flex-col gap-2">
        <Link to={`/property/${house.id}`} className="w-full">
          <Button 
            size="sm"
            variant="solid" 
            color="primary"
            className="w-full"
          >
            View details
          </Button>
        </Link>
        <Button 
          size="sm"
          variant="flat" 
          color="primary"
          startContent={<Icon icon="lucide:map-pin" />}
          onClick={() => onFindOnMap(house.location)}
          className="w-full"
        >
          Find on map
        </Button>
      </div>
    </CardFooter>
  </Card>
);

// Component to display a highlighted marker for searched locations
const SearchedLocationMarker = ({ position }: { position: [number, number] }) => {
  // Create a more subtle effect for the search point
  return (
    <>
      {/* Single external highlight circle */}
   
      
      {/* Core dot */}
      <CircleMarker 
        center={position} 
        pathOptions={{ 
          color: '#2563eb', 
          fillColor: '#2563eb',
          fillOpacity: 0.8,
          weight: 1.5
        }}
        radius={2}
      />
      
      {/* Add a marker with a label */}
      <Marker 
        position={position}
        icon={L.divIcon({
          html: '<div class="flex justify-center items-center w-full h-full"><div class="w-4 h-4 bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground rounded-full shadow-lg"></div></div>',
          className: 'custom-marker-icon ',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })}
      >
        <Popup closeButton={false}>
          <div className="text-center">
            <p className="font-medium">Search Location</p>
            <p className="text-small text-default-500">
              {position[0].toFixed(4)}, {position[1].toFixed(4)}
            </p>
          </div>
        </Popup>
      </Marker>
    </>
  );
};

// Add a new component to ensure markers stay visible during map changes
const PersistentMarkers = ({ houses, onMarkerClick, selectedHouseId, findOnMapTimestamp }: { 
  houses: House[], 
  onMarkerClick: (id: string) => void,
  selectedHouseId: string | null,
  findOnMapTimestamp: number
}) => {
  // Create a map of refs for all markers
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const map = useMap();
  const pendingPopupRef = useRef<string | null>(null);
  const attemptCountRef = useRef<number>(0);
  const maxAttempts = 3; // Maximum number of attempts to ensure popup visibility
  const prevSelectedHouseIdRef = useRef<string | null>(null);
  const prevTimestampRef = useRef<number>(0);

  // Log when the component receives new properties
  useEffect(() => {
    console.log("🏠 PersistentMarkers updated:", {
      houseCount: houses.length,
      selectedHouseId,
      timestamp: findOnMapTimestamp
    });
  }, [houses, selectedHouseId, findOnMapTimestamp]);

  // More robust function to ensure popup visibility
  const ensurePopupVisibility = useCallback((markerId: string) => {
    const marker = markerRefs.current[markerId];
    if (!marker) {
      console.log("❌ Marker not found for ID:", markerId);
      return;
    }

    console.log("🔍 Ensuring popup visibility for marker:", markerId);

    // Get the marker position
    const markerPosition = marker.getLatLng();
    
    // Check if marker is already well within viewport (not near edges)
    // Using a larger padding value (-0.3) to determine "near edge"
    const viewportBounds = map.getBounds().pad(-0.3);
    const isMarkerFullyVisible = viewportBounds.contains(markerPosition);
    
    // If marker is near edge or outside viewport
    if (!isMarkerFullyVisible) {
      console.log("📍 Marker near edge, panning to center it");
      // Center map on marker with animation
      map.panTo(markerPosition, {
        animate: true,
        duration: 0.5
      });
      
      // Don't open popup yet - wait for movement to complete
      pendingPopupRef.current = markerId;
      attemptCountRef.current += 1;
    } else {
      // Marker is well within viewport, safe to open popup
      console.log("📍 Marker well within viewport, opening popup directly");
      setTimeout(() => {
        marker.openPopup();
        // Reset attempt counter
        attemptCountRef.current = 0;
        pendingPopupRef.current = null;
      }, 100);
    }
  }, [map]);

  // Handle map movement completion
  useMapEvents({
    moveend: () => {
      // If we have a pending popup to open after movement
      if (pendingPopupRef.current) {
        const markerId = pendingPopupRef.current;
        console.log("🗺️ Map movement ended, handling pending popup:", markerId);
        
        // If we've tried too many times, force open the popup anyway
        if (attemptCountRef.current >= maxAttempts) {
          console.log("🔄 Maximum attempts reached, forcing popup open");
          const marker = markerRefs.current[markerId];
          if (marker) {
            setTimeout(() => {
              marker.openPopup();
              // Reset counters
              attemptCountRef.current = 0;
              pendingPopupRef.current = null;
            }, 100);
          }
        } else {
          // Try again to ensure visibility
          console.log("🔄 Trying again to ensure popup visibility, attempt:", attemptCountRef.current);
          setTimeout(() => {
            ensurePopupVisibility(markerId);
          }, 300);
        }
      }
    },
    popupclose: () => {
      // Clear the selected house state when a popup is closed manually
      if (selectedHouseId) {
        console.log("🗺️ Popup closed manually, clearing selected house:", selectedHouseId);
        // Use the onMarkerClick handler with null to clear the selection
        onMarkerClick("");
      }
    }
  });

  // When selectedHouseId changes or findOnMapTimestamp updates, trigger the popup process
  useEffect(() => {
    if (selectedHouseId && markerRefs.current[selectedHouseId]) {
      // Check if this is a new house selection or the same house but with a new timestamp
      const isSameHouse = prevSelectedHouseIdRef.current === selectedHouseId;
      const isNewTimestamp = findOnMapTimestamp > prevTimestampRef.current;
      
      // If it's a new house or the same house but with a new timestamp (user clicked "Find on map" again)
      if (!isSameHouse || (isSameHouse && isNewTimestamp)) {
        // Reset the attempt counter
        attemptCountRef.current = 0;
        
        // Close any open popups first to ensure the new one opens
        map.closePopup();
        
        // Start the process of ensuring visibility and opening popup
        ensurePopupVisibility(selectedHouseId);
        
        // Update the refs
        prevSelectedHouseIdRef.current = selectedHouseId;
        prevTimestampRef.current = findOnMapTimestamp;
      }
    }
  }, [selectedHouseId, ensurePopupVisibility, findOnMapTimestamp, map]);

  return (
    <>
      {houses.map(house => (
        <Marker 
          icon={L.divIcon({
            html: '<div class="flex justify-center items-center w-full h-full"><div class="w-6 h-6 bg-gradient-to-tr from-gradient-first to-gradient-second rounded-full shadow-lg flex items-center justify-center border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-4 h-4"><path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" /><path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198c.03-.028.061-.056.091-.086L12 5.432z" /></svg></div></div>',
            className: 'custom-marker-icon ',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })}
          
          key={house.id} 
          position={house.location}
          ref={(ref) => {
            if (ref) {
              markerRefs.current[house.id] = ref;
            }
          }}
          eventHandlers={{
            click: () => onMarkerClick(house.id),
            popupclose: () => {
              // Clear the selected house when popup is closed manually
              if (house.id === selectedHouseId) {
                console.log("🏠 Popup closed for house:", house.id);
                onMarkerClick("");
              }
            }
          }}
        >
          <Popup>
            <div className="p-2 flex flex-col">
              <img src={house.images[0]} alt={house.title} className="w-full h-24 object-cover mb-2 rounded" />
              <h3 className="font-semibold">{house.title}</h3>
              <div className="flex justify-between">
                <p className="text-small">${house.price}/night</p>
                <div className="flex items-center">
                  <Icon icon="lucide:star" className="text-yellow-500 text-xs" />
                  <span className="text-xs ml-1">{house.rating}</span>
                </div>
              </div>
              <Link to={`/property/${house.id}`} className="text-sm text-primary mt-2">View Details</Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

// Custom component to set map options
const MapOptions = () => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      // Set map options
      map.options.maxBoundsViscosity = 1.0;
      map.options.inertia = true;
      map.options.inertiaDeceleration = 3000;
    }
  }, [map]);
  
  return null;
};

// Map Provider component to make the map accessible via context
const MapProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      console.log("🗺️ Map is now available in context");
      (window as any).leafletMap = map;
    }
  }, [map]);
  
  return (
    <MapContext.Provider value={map}>
      {children}
    </MapContext.Provider>
  );
};

// Types for POI data
interface POI {
  id: number;
  type: string;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    amenity?: string;
    [key: string]: string | undefined;
  };
}

// Function to fetch POIs from Overpass API
const fetchPOIs = async (bounds: L.LatLngBounds): Promise<POI[]> => {
  try {
    if (!bounds || !bounds.isValid()) {
      console.warn('Invalid bounds provided to fetchPOIs');
      return [];
    }

    // Safely get bounds coordinates
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();

    if (isNaN(south) || isNaN(west) || isNaN(north) || isNaN(east)) {
      console.warn('Invalid coordinates in bounds');
      return [];
    }
  
    // Query for specific POIs we want to show (only hospitals, universities, schools, and police stations)
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"hospital|university|school|police"](${south},${west},${north},${east});
        way["amenity"~"hospital|university|school|police"](${south},${west},${north},${east});
        relation["amenity"~"hospital|university|school|police"](${south},${west},${north},${east});
      );
      out body;
      >;
      out skel qt;
    `;

    console.log('Fetching POIs with query:', query);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limit exceeded for Overpass API');
        return []; // Return empty array instead of throwing error
      }
      throw new Error('Failed to fetch POIs');
    }
    
    const data = await response.json();
    console.log('Received POIs:', data.elements?.length || 0);
    return data.elements || [];
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return []; // Return empty array instead of throwing error
  }
};

// Component to display POI markers
const POIMarkers = () => {
  const map = useMap();
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const mapInitializedRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMapReadyRef = useRef(false);
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const rateLimitRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to get display name for POI type
  const getPOIDisplayName = (amenity: string) => {
    const displayNames: Record<string, string> = {
      'university': 'Universities',
      'school': 'Schools',
      'hospital': 'Hospitals',
      'police': 'Police Stations'
    };
    return displayNames[amenity] || amenity;
  };

  // Function to get marker HTML based on POI type
  const getMarkerHTML = (amenity: string) => {
    const icons = {
      hospital: `
        <div class="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center" style="z-index: 1000;">
          <div class="text-red-500 text-xl font-bold">+</div>
        </div>
      `,
      university: `
        <div class="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center" style="z-index: 1000;">
          <div class="text-blue-500 text-xl">🎓</div>
        </div>
      `,
      school: `
        <div class="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center" style="z-index: 1000;">
          <div class="text-green-500 text-xl">📚</div>
        </div>
      `,
      police: `
        <div class="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center" style="z-index: 1000;">
          <div class="text-indigo-500 text-xl">👮</div>
        </div>
      `
    };

    return icons[amenity as keyof typeof icons] || '';
  };

  // Initialize map state
  useEffect(() => {
    if (map) {
      isMapReadyRef.current = true;
      mapInitializedRef.current = true;
      console.log('Map initialized, current zoom:', map.getZoom());
    }
  }, [map]);

  // Update POIs when map bounds change
  useEffect(() => {
    if (!map) return;

    const updatePOIs = async () => {
      if (!isMapReadyRef.current) return;

      try {
        // Clear any existing timeouts
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current);
        }
        if (rateLimitRetryTimeoutRef.current) {
          clearTimeout(rateLimitRetryTimeoutRef.current);
        }

        // Wait for map to settle after movement
        movementTimeoutRef.current = setTimeout(async () => {
          try {
            if (!map || !map.getBounds) {
              console.warn('Map not ready for POI update');
              return;
            }

            // Check if zoom level is sufficient
            const currentZoom = map.getZoom();
            console.log('Current zoom level:', currentZoom);
            if (currentZoom < POI_MIN_ZOOM_LEVEL) {
              console.log('Zoom level too low, clearing POIs');
              setPois([]); // Clear POIs when zoomed out
              return;
            }

            const bounds = map.getBounds();
            if (!bounds || !bounds.isValid()) {
              console.warn('Invalid map bounds');
              return;
            }

            // Rate limiting check with increased interval
            const now = Date.now();
            if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
              console.log('Rate limiting POI fetch - waiting longer');
              return;
            }
            
            boundsRef.current = bounds;
            setIsLoading(true);
            lastFetchTimeRef.current = now;
            
            const newPOIs = await fetchPOIs(bounds);
            console.log('Fetched new POIs:', newPOIs.length);
            
            // Filter out any POIs with invalid coordinates
            const validPOIs = newPOIs.filter(poi => 
              typeof poi.lat === 'number' && 
              typeof poi.lon === 'number' && 
              !isNaN(poi.lat) && 
              !isNaN(poi.lon)
            );
            setPois(validPOIs);
          } catch (error) {
            console.error('Error updating POIs:', error);
          } finally {
            setIsLoading(false);
          }
        }, 1000);
      } catch (error) {
        console.error('Error in updatePOIs:', error);
        setIsLoading(false);
      }
    };

    // Add zoomend event listener
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();
      console.log('Zoom level changed to:', currentZoom);
      if (currentZoom < POI_MIN_ZOOM_LEVEL) {
        setPois([]); // Clear POIs when zoomed out
      } else {
        updatePOIs(); // Update POIs when zoomed in
      }
    };

    map.on('zoomend', handleZoomEnd);
    map.on('moveend', updatePOIs);

    // Initial POI load
    if (map.getZoom() >= POI_MIN_ZOOM_LEVEL) {
      updatePOIs();
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (rateLimitRetryTimeoutRef.current) {
        clearTimeout(rateLimitRetryTimeoutRef.current);
      }
      map.off('moveend', updatePOIs);
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  return (
    <>
      {/* Legend - only show when zoomed in */}
      {map && map.getZoom() >= POI_MIN_ZOOM_LEVEL && (
        <div className="absolute top-20 right-4 z-[2000] bg-white p-3 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Points of Interest</h3>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={() => setShowLegend(!showLegend)}
            >
              <Icon icon={showLegend ? "lucide:chevron-up" : "lucide:chevron-down"} />
            </Button>
          </div>
          {showLegend && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">+</span>
                </div>
                <span className="text-sm">Hospitals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">🎓</span>
                </div>
                <span className="text-sm">Universities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">📚</span>
                </div>
                <span className="text-sm">Schools</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">👮</span>
                </div>
                <span className="text-sm">Police Stations</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POI Markers - only show when zoomed in */}
      {map && map.getZoom() >= POI_MIN_ZOOM_LEVEL && pois.map(poi => {
        if (typeof poi.lat !== 'number' || typeof poi.lon !== 'number' || 
            isNaN(poi.lat) || isNaN(poi.lon)) {
          return null;
        }

        const amenity = poi.tags?.amenity;
        if (!amenity || !['hospital', 'university', 'school', 'police'].includes(amenity)) {
          return null;
        }

        const name = poi.tags?.name;
        const markerHtml = getMarkerHTML(amenity);
        
        if (!markerHtml) {
          return null;
        }

        return (
          <Marker
            key={`${poi.id}-${poi.type}`}
            position={[poi.lat, poi.lon]}
            icon={L.divIcon({
              html: markerHtml,
              className: 'custom-poi-marker',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })}
            zIndexOffset={1000}
          >
            <Popup className="z-[1500]">
              <div className="p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {amenity === 'hospital' && '+'}
                    {amenity === 'university' && '🎓'}
                    {amenity === 'school' && '📚'}
                    {amenity === 'police' && '👮'}
                  </span>
                  <h3 className="font-semibold">{name || getPOIDisplayName(amenity)}</h3>
                </div>
                <p className="text-sm text-default-500 capitalize">{getPOIDisplayName(amenity)}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
      
      {/* Loading indicator - only show when zoomed in */}
      {map && map.getZoom() >= POI_MIN_ZOOM_LEVEL && isLoading && (
        <div className="absolute bottom-4 right-4 z-[2000] bg-white p-2 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm">Loading POIs...</span>
          </div>
        </div>
      )}
    </>
  );
};

export const Map = () => {
  const [visibleHouses, setVisibleHouses] = useState<House[]>([]);  // Start with empty array
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.9028, 12.4964]); // Default: Rome, Italy
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [findOnMapTimestamp, setFindOnMapTimestamp] = useState<number>(0); // Timestamp for "Find on map" clicks
  const [searchParams, setSearchParams] = useState<SearchParams>({ location: '', checkIn: '', checkOut: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchedLocation, setIsSearchedLocation] = useState(false);
  const location = useLocation();
  const [mapReady, setMapReady] = useState(false);
  const [searchedCoordinates, setSearchedCoordinates] = useState<[number, number] | null>(null);
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);
  const [autoFilterEnabled, setAutoFilterEnabled] = useState(true); // Changed to true to auto-filter on load
  const [isLoading, setIsLoading] = useState(false);
  const [markersLoaded, setMarkersLoaded] = useState(false); // Track if markers have been loaded
  const bottomSheetRef = useRef<DraggableBottomSheetHandle>(null);
  
  // Make sure the map is rendered client-side only
  useEffect(() => {
    setMapReady(true);
  }, []);

  // Track bounds but don't filter properties automatically after initial load
  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    if (!bounds.isValid()) {
      console.log("❌ Invalid bounds in handleBoundsChange");
      return;
    }
    
    console.log("🗺️ Bounds changed:", {
      autoFilterEnabled,
      hasSelectedHouse: !!selectedHouseId
    });
    
    setCurrentBounds(bounds);
    
    // Only apply initial filtering when the map first loads if auto-filtering is enabled
    if (autoFilterEnabled) {
      console.log("🔄 Auto-filtering enabled, loading properties");
      filterPropertiesByBounds(bounds);
      setAutoFilterEnabled(false); // Disable auto filtering after first load
    }
  };
  
  // Function to manually filter properties based on current bounds
  const filterPropertiesByBounds = (bounds: L.LatLngBounds) => {
    if (!bounds || !bounds.isValid()) {
      console.log("❌ Invalid bounds in filterPropertiesByBounds", bounds);
      return;
    }
    
    console.log("🔍 FILTER: Filtering properties with bounds:", {
      north: bounds.getNorth().toFixed(5),
      south: bounds.getSouth().toFixed(5),
      east: bounds.getEast().toFixed(5),
      west: bounds.getWest().toFixed(5),
      selectedHouseId,
      isValid: bounds.isValid(),
      area: (bounds.getNorth() - bounds.getSouth()) * 
            (bounds.getEast() - bounds.getWest())
    });
    
    setIsLoading(true);
    
    // Small delay to show loading state
    setTimeout(() => {
      // Filter properties by bounds
      const filtered = sampleHouses.filter(house => {
        const [lat, lng] = house.location;
        const isInBounds = bounds.contains([lat, lng]);
        if (!isInBounds) {
          console.log(`House ${house.id} at [${lat}, ${lng}] is outside bounds`);
        }
        return isInBounds;
      });
      
      console.log("🔍 FILTER: Filter results:", {
        total: sampleHouses.length,
        filtered: filtered.length,
        propertiesFound: filtered.length > 0 ? "Yes" : "No",
        filteredIds: filtered.map(h => h.id)
      });
      
      // Only display houses that are actually visible on the map
      setVisibleHouses(filtered);
      setMarkersLoaded(true); // Mark that markers have been loaded
      setIsLoading(false);
    }, 300);
  };
  
  // Handler for the Load Properties button
  const handleLoadProperties = () => {
    console.log("🔄 Refresh Properties clicked", {
      hasCurrentBounds: !!currentBounds,
      selectedHouseId,
      hasOpenPopup: !!selectedHouseId
    });
    
    // Close any open popup when refreshing properties
    if (selectedHouseId) {
      console.log("🔄 Closing popup before refreshing properties");
      setSelectedHouseId(null);
    }
    
    // Show loading state immediately
    setIsLoading(true);
    
    // Wait slightly longer to ensure popup is closed and any animations complete
    setTimeout(() => {
      try {
        // Get the live map instance to use for bounds checking
        const leafletMap = (window as any).leafletMap;
        
        // Check if the leafletMap reference is available
        if (leafletMap) {
          console.log("🗺️ Using direct leafletMap reference for refresh");
          
          // Get the current bounds DIRECTLY from the map - not from our state
          const liveBounds = leafletMap.getBounds();
          
          if (!liveBounds || !liveBounds.isValid()) {
            console.error("❌ Invalid bounds from leafletMap");
            throw new Error("Invalid bounds from leafletMap");
          }
          
          console.log("🗺️ LIVE map bounds when refreshing:", {
            north: liveBounds.getNorth().toFixed(5),
            south: liveBounds.getSouth().toFixed(5),
            east: liveBounds.getEast().toFixed(5),
            west: liveBounds.getWest().toFixed(5),
            isValid: liveBounds.isValid()
          });
          
          // Force the search to use the current visible properties regardless of state
          const filteredHouses = sampleHouses.filter(house => {
            const [lat, lng] = house.location;
            const isInBounds = liveBounds.contains([lat, lng]);
            if (!isInBounds) {
              console.log(`House ${house.id} is outside current map bounds`);
            }
            return isInBounds;
          });
          
          console.log(`📊 Found ${filteredHouses.length} properties in current view`);
          
          // Update the visible houses directly
          setVisibleHouses(filteredHouses);
          setMarkersLoaded(true);
          setIsLoading(false);
        } else if (currentBounds) {
          // Fallback to currentBounds if map instance not available
          console.log("⚠️ Using stored bounds as fallback");
          if (!currentBounds.isValid()) {
            console.error("❌ Invalid currentBounds");
            throw new Error("Invalid currentBounds");
          }
          filterPropertiesByBounds(currentBounds);
        } else {
          console.error("❌ No map bounds available for filtering");
          setIsLoading(false);
          // Just show all houses if we can't get bounds
          console.log("📍 Showing all houses as fallback");
          setVisibleHouses(sampleHouses);
          setMarkersLoaded(true);
        }
      } catch (error) {
        console.error("Error during property refresh:", error);
        setIsLoading(false);
        // Show all houses as a fallback if there's an error
        setVisibleHouses(sampleHouses);
        setMarkersLoaded(true);
      }
    }, 300); // Use a longer timeout to ensure all map movements have completed
  };

  // Reset markers when the map is moved significantly
  useEffect(() => {
    if (markersLoaded && currentBounds) {
      // When markers are loaded and bounds change significantly, 
      // we could optionally clear markers here until user clicks "Load Properties" again
      // setMarkersLoaded(false);
      // setVisibleHouses([]);
    }
  }, [mapCenter]);

  const handleMarkerClick = (houseId: string) => {
    // Check for empty string to handle closing popups
    if (houseId === "") {
      setSelectedHouseId(null);
    } else {
      setSelectedHouseId(houseId);
    }
  };

  // Enhanced handle search with better error handling and user feedback
  const handleSearch = async (params: SearchParams, coordinates?: [number, number]) => {
    setSearchParams(params);
    setIsSearching(true);
    setSearchError(null);
    // Clear the selected house when performing a new search
    setSelectedHouseId(null);
    console.log("🔍 New search - clearing selected house state");
    
    // Collapse the bottom sheet if it's open
    if (bottomSheetRef.current) {
      bottomSheetRef.current.collapseSheet();
    }
    
    try {
      if (coordinates) {
        // If we have direct coordinates from selected location
        console.log("Setting map center to:", coordinates);
        setMapCenter(coordinates);
        setSearchedCoordinates(coordinates);
        setIsSearchedLocation(true);
        
        // Hide markers when searching a new area
        setMarkersLoaded(false);
        setVisibleHouses([]);
        
        // Force map to zoom in to show POIs
        const leafletMap = (window as any).leafletMap;
        if (leafletMap) {
          leafletMap.setZoom(POI_MIN_ZOOM_LEVEL);
          // Force a map redraw to ensure POIs are loaded
          setTimeout(() => {
            leafletMap.invalidateSize();
          }, 100);
        }
        
      } else if (params.location) {
        // Otherwise geocode the location
        const coords = await geocodeLocation(params.location);
        if (coords) {
          console.log("Geocoded coordinates:", coords);
          setMapCenter(coords);
          setSearchedCoordinates(coords);
          setIsSearchedLocation(true);
          
          // Hide markers when searching a new area
          setMarkersLoaded(false);
          setVisibleHouses([]);
          
          // Force map to zoom in to show POIs
          const leafletMap = (window as any).leafletMap;
          if (leafletMap) {
            leafletMap.setZoom(POI_MIN_ZOOM_LEVEL);
            // Force a map redraw to ensure POIs are loaded
            setTimeout(() => {
              leafletMap.invalidateSize();
            }, 100);
          }
          
        } else {
          // No results found
          setSearchError(`No locations found for "${params.location}"`);
          // Keep showing all houses but don't move the map
        }
      }
    } catch (error) {
      console.error('Error setting map location:', error);
      setSearchError('Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-load properties after search or when map is loaded
  useEffect(() => {
    // When the map movement finishes after search, load properties
    if (!isSearching && currentBounds && (searchedCoordinates || !markersLoaded)) {
      // Add a short delay to ensure the map has finished moving
      const timerId = setTimeout(() => {
        filterPropertiesByBounds(currentBounds);
      }, 500);
      
      return () => clearTimeout(timerId);
    }
  }, [isSearching, searchedCoordinates, currentBounds, markersLoaded]);

  const handleFindOnMap = (houseLocation: [number, number]) => {
    setMapCenter(houseLocation);
    // Don't set searchedLocation to true to avoid zoom change
    setIsSearchedLocation(false);
    
    // Collapse the bottom sheet if it's open
    if (bottomSheetRef.current) {
      bottomSheetRef.current.collapseSheet();
    }
    
    // Find the house in the full sampleHouses array (not just visibleHouses)
    // This ensures we can find any house, even if it's currently filtered out
    const house = sampleHouses.find(h => 
      h.location[0] === houseLocation[0] && h.location[1] === houseLocation[1]
    );
    if (house) {
      // Generate a new timestamp to force popup to reopen even for the same house
      setFindOnMapTimestamp(Date.now());
      setSelectedHouseId(house.id);
    }
  };

  // Calculate the height of the main content based on searchbar height
  const searchBarHeight = 56; // Fixed height for searchbar
  
  // Adjust height for content - mobile only
  const contentHeight = `calc(100vh`;

  // useEffect for handling CSS variable for hiding header
  useEffect(() => {
    // Only hide header on mobile view for Dashboard page
    const isDashboardPage = location.pathname === '/dashboard' || location.pathname === '/map';
    document.documentElement.style.setProperty('--hide-header-mobile', isDashboardPage ? 'none' : 'block');
    
    // Always show header on desktop
    document.documentElement.style.setProperty('--hide-header-desktop', 'block');
    
    return () => {
      document.documentElement.style.setProperty('--hide-header-mobile', 'block');
      document.documentElement.style.setProperty('--hide-header-desktop', 'block');
    };
  }, [location]);

  return (
    <>
      <div className="site-header">
        <Header />
      </div>
      {/* Desktop view - Search bar below main header */}
      <div className="hidden md:block">
        <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      </div>

      <div style={{ height: contentHeight }} className="relative dashboard-content">
        <div className="hidden md:grid md:grid-cols-[350px,1fr] h-full">
          {/* Sidebar with listings */}
          <div className="overflow-y-auto p-4 border-r">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Available Properties</h2>
              <p className="text-default-500">
                {visibleHouses.length} properties found in this area
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {visibleHouses.map(house => (
                <HouseCard 
                  key={house.id} 
                  house={house} 
                  onFindOnMap={handleFindOnMap}
                />
              ))}
              {visibleHouses.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-default-500">No properties found in this area</p>
                  <Button 
                    color="primary" 
                    className="mt-4"
                    onClick={handleLoadProperties}
                    isLoading={isLoading}
                  >
                    Load Properties
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="relative h-full map-parent">
            {mapReady && (
              <MapContainer
                center={mapCenter}
                zoom={6}
                className="h-full w-full map-container"
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapProvider>
                  <MapUpdater houses={[]} onBoundsChange={handleBoundsChange} />
                  <SetMapCenter center={mapCenter} searchedLocation={isSearchedLocation} />
                  <MapOptions />
                  
                  {/* Show visual marker for searched location */}
                  {searchedCoordinates && <SearchedLocationMarker position={searchedCoordinates} />}
                  
                  {/* Add POI markers */}
                  <POIMarkers />
                  
                  {/* Add property markers */}
                  <PersistentMarkers 
                    houses={visibleHouses}
                    onMarkerClick={handleMarkerClick}
                    selectedHouseId={selectedHouseId}
                    findOnMapTimestamp={findOnMapTimestamp}
                  />
                  
                  <ZoomControls />
                </MapProvider>
              </MapContainer>
            )}
          </div>
        </div>

        {/* Mobile view with integrated search and sheet */}
        <div className="md:hidden h-full">
          {/* Full-screen map */}
          <div className="h-full w-full map-parent">
            
            {/* Floating Search Bar for mobile */}
            <SearchBar onSearch={handleSearch} isSearching={isSearching} />
            
            {mapReady && (
              <MapContainer
                center={mapCenter}
                zoom={6}
                className="h-full w-full map-container"
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapProvider>
                  <MapUpdater houses={[]} onBoundsChange={handleBoundsChange} />
                  <SetMapCenter center={mapCenter} searchedLocation={isSearchedLocation} />
                  <MapOptions />
                  
                  {/* Show visual marker for searched location */}
                  {searchedCoordinates && <SearchedLocationMarker position={searchedCoordinates} />}
                  
                  {/* Add POI markers */}
                  <POIMarkers />
                  
                  {/* Add property markers */}
                  <PersistentMarkers 
                    houses={visibleHouses}
                    onMarkerClick={handleMarkerClick}
                    selectedHouseId={selectedHouseId}
                    findOnMapTimestamp={findOnMapTimestamp}
                  />
                  
                  <ZoomControls />
                </MapProvider>
              </MapContainer>
            )}
          </div>
        </div>
      </div>
    </>
  );
};