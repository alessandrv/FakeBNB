import React, { useState, useRef, FormEvent, useEffect, useCallback } from 'react';
import { Button, Card, CardBody, CardFooter, Input, Divider, Popover, PopoverTrigger, PopoverContent, Autocomplete, AutocompleteItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DraggableBottomSheet } from '../components/DraggableBottomSheet';
import { Link, useLocation } from 'react-router-dom';

// Fix marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';

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

// Search for locations using OpenStreetMap Nominatim API
const searchLocations = async (query: string): Promise<NominatimResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    // Use OpenStreetMap's Nominatim API for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&country=US`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data: NominatimResult[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return [];
  }
};

// SearchBar component
const SearchBar = ({ onSearch }: { onSearch: (params: SearchParams, coordinates?: [number, number]) => void }) => {
  const [location, setLocation] = useState('');
  const [suggestedLocations, setSuggestedLocations] = useState<NominatimResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
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
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(location);
  }, [location, debouncedSearch]);

  // Handle direct input changes
  const handleInputChange = (value: string) => {
    setLocation(value);
    
    // If the input is cleared or changed significantly, reset the selected location
    if (!value || (selectedLocation && !value.includes(selectedLocation.display_name.split(',')[0]))) {
      setSelectedLocation(null);
    }
  };

  return (
    <div className="bg-white shadow-md px-2 py-2 md:px-4 md:py-3 sticky top-0 z-50">
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
                  setSelectedLocation(selected);
                  setLocation(selected.display_name.split(',')[0]);
                  
                  // Auto-search when location is selected
                  onSearch(
                    { location: selected.display_name.split(',')[0], checkIn, checkOut },
                    [parseFloat(selected.lat), parseFloat(selected.lon)] as [number, number]
                  );
                }
              }
            }}
            startContent={<Icon icon="lucide:map-pin" className="text-default-400" />}
            endContent={isLoading ? <Icon icon="lucide:loader-2" className="animate-spin text-default-400" /> : null}
            className="w-full"
            listboxProps={{
              className: "max-h-[200px] overflow-y-auto",
            }}
          >
            {suggestedLocations.map((loc) => (
              <AutocompleteItem key={loc.place_id.toString()} textValue={loc.display_name}>
                {loc.display_name.split(',')[0]}
                <div className="text-small text-default-400 truncate">{loc.display_name}</div>
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>
        
        <div className="hidden md:block">
          <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger>
              <Button 
                variant="flat" 
                className="justify-between w-full md:w-auto"
                endContent={<Icon icon="lucide:calendar" />}
              >
                {checkIn && checkOut 
                  ? `${checkIn} — ${checkOut}` 
                  : "Add dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-4 w-[280px]">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-small text-default-600 mb-1">Check in</label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    placeholder="Add date"
                  />
                </div>
                <div>
                  <label className="block text-small text-default-600 mb-1">Check out</label>
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    placeholder="Add date"
                  />
                </div>
                <Button 
                  color="primary" 
                  onClick={() => {
                    setIsOpen(false);
                    // Auto-search when dates are selected
                    if (checkIn && checkOut) {
                      if (selectedLocation) {
                        onSearch(
                          { location, checkIn, checkOut },
                          [parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lon)] as [number, number]
                        );
                      } else if (location.trim()) {
                        onSearch({ location, checkIn, checkOut });
                      }
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          type="submit" 
          color="primary"
          className="min-w-0 px-3 md:px-8"
          isIconOnly
          startContent={null}
        >
          <Icon icon="lucide:search" />
        </Button>
      </form>
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

// Component for map center updating
const SetMapCenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      // Use a small timeout to ensure the map has fully initialized
      setTimeout(() => {
        map.setView(center, 13);
        
        // Force a map redraw to ensure changes take effect
        map.invalidateSize();
      }, 100);
    }
  }, [center, map]);
  
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

// Geocoding service using OpenStreetMap Nominatim API
const geocodeLocation = async (query: string): Promise<[number, number]> => {
  try {
    const results = await searchLocations(query);
    if (results && results.length > 0) {
      return [parseFloat(results[0].lat), parseFloat(results[0].lon)] as [number, number];
    }
    // Default to New York if no match
    return [40.7128, -74.0060] as [number, number];
  } catch (error) {
    console.error("Error geocoding location:", error);
    return [40.7128, -74.0060] as [number, number]; // Default to NYC
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
    reviews: house.reviews
  };
};

const sampleHouses: House[] = [
  {
    id: '1',
    title: 'Modern Downtown Apartment',
    price: 150,
    rating: 4.8,
    reviews: 124,
    images: ['https://picsum.photos/seed/house1/400/300'],
    location: [40.7128, -74.0060],
    address: 'Downtown Manhattan, NY',
    beds: 2,
    baths: 1
  },
  {
    id: '2',
    title: 'Luxury Penthouse with View',
    price: 300,
    rating: 4.9,
    reviews: 85,
    images: ['https://picsum.photos/seed/house2/400/300'],
    location: [40.7589, -73.9850],
    address: 'Midtown East, NY',
    beds: 3,
    baths: 2
  },
  {
    id: '3',
    title: 'Cozy Brooklyn Brownstone',
    price: 175,
    rating: 4.7,
    reviews: 62,
    images: ['https://picsum.photos/seed/house3/400/300'],
    location: [40.6782, -73.9442],
    address: 'Park Slope, Brooklyn, NY',
    beds: 1,
    baths: 1
  },
  {
    id: '4',
    title: 'Queens Family Home',
    price: 220,
    rating: 4.6,
    reviews: 43,
    images: ['https://picsum.photos/seed/house4/400/300'],
    location: [40.7282, -73.7949],
    address: 'Astoria, Queens, NY',
    beds: 3,
    baths: 2
  },
  {
    id: '5',
    title: 'Central Park View Studio',
    price: 275,
    rating: 4.8,
    reviews: 91,
    images: ['https://picsum.photos/seed/house5/400/300'],
    location: [40.7812, -73.9665],
    address: 'Upper East Side, NY',
    beds: 1,
    baths: 1
  },
  // Add more sample houses as needed
];

const MapUpdater = ({ houses, onBoundsChange }: { houses: House[], onBoundsChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    }
  });

  return null;
};

const HouseCard = ({ house }: { house: House }) => (
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
    <CardFooter className="justify-between">
      <span className="font-semibold">${house.price}</span>
      <span className="text-small text-default-500">{house.reviews} reviews</span>
    </CardFooter>
  </Card>
);

export const Dashboard = () => {
  const [visibleHouses, setVisibleHouses] = useState<House[]>(sampleHouses);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default: NYC
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({ location: '', checkIn: '', checkOut: '' });
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const [mapReady, setMapReady] = useState(false);
  
  // Make sure the map is rendered client-side only
  useEffect(() => {
    setMapReady(true);
  }, []);

  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    const filtered = sampleHouses.filter(house => {
      const [lat, lng] = house.location;
      return bounds.contains([lat, lng]);
    });
    setVisibleHouses(filtered);
  };

  const handleMarkerClick = (houseId: string) => {
    setSelectedHouseId(houseId);
  };

  const handleSearch = async (params: SearchParams, coordinates?: [number, number]) => {
    setSearchParams(params);
    setIsSearching(true);
    
    try {
      if (coordinates) {
        // If we have direct coordinates from selected location
        console.log("Setting map center to:", coordinates);
        setMapCenter(coordinates);
        
        // Filter houses based on proximity to the search location
        const filteredByLocation = sampleHouses.filter(house => {
          const [lat, lng] = house.location;
          const [searchLat, searchLng] = coordinates;
          
          // Calculate approximate distance using Euclidean distance
          // For a real app, use a proper geodesic distance calculation
          const distance = Math.sqrt(
            Math.pow(lat - searchLat, 2) + 
            Math.pow(lng - searchLng, 2)
          );
          
          // Show houses within approximately a 0.1 degree radius
          return distance < 0.1;
        });
        
        setVisibleHouses(filteredByLocation.length > 0 ? filteredByLocation : sampleHouses);
      } else if (params.location) {
        // Otherwise geocode the location
        const coords = await geocodeLocation(params.location);
        console.log("Geocoded coordinates:", coords);
        setMapCenter(coords);
      }
    } catch (error) {
      console.error('Error setting map location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate the height of the main content based on searchbar height
  const searchBarHeight = 56; // Fixed height for searchbar
  
  // Adjust height for content - mobile only
  const contentHeight = `calc(100vh - ${searchBarHeight}px)`;

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
      {/* Desktop view - Search bar below main header */}
      <div className="hidden md:block sticky-search">
        <SearchBar onSearch={handleSearch} />
      </div>

      <div style={{ height: contentHeight }} className="relative dashboard-content">
        <div className="hidden md:grid md:grid-cols-[350px,1fr] h-full">
          {/* Sidebar with listings */}
          <div className="overflow-y-auto p-4 border-r">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Available Houses</h2>
              <p className="text-default-500">{visibleHouses.length} properties in view</p>
            </div>
            {visibleHouses.map(house => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>

          {/* Map */}
          <div className="relative h-full map-parent">
            {mapReady && (
              <MapContainer
                key={`map-${mapCenter.join(',')}`}
                center={mapCenter}
                zoom={13}
                className="h-full w-full map-container"
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater houses={sampleHouses} onBoundsChange={handleBoundsChange} />
                <SetMapCenter center={mapCenter} />
                {sampleHouses.map(house => (
                  <Marker 
                    key={house.id} 
                    position={house.location}
                    eventHandlers={{
                      click: () => handleMarkerClick(house.id)
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
                <ZoomControls />
              </MapContainer>
            )}
          </div>
        </div>

        {/* Mobile view with integrated search and sheet */}
        <div className="md:hidden h-full">
          {/* Full-screen map */}
          <div className="h-full w-full map-parent">
            {mapReady && (
              <MapContainer
                key={`mobile-map-${mapCenter.join(',')}`}
                center={mapCenter}
                zoom={13}
                className="h-full w-full map-container"
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater houses={sampleHouses} onBoundsChange={handleBoundsChange} />
                <SetMapCenter center={mapCenter} />
                {sampleHouses.map(house => (
                  <Marker 
                    key={house.id} 
                    position={house.location}
                    eventHandlers={{
                      click: () => handleMarkerClick(house.id)
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
                <ZoomControls />
              </MapContainer>
            )}
          </div>
          
          {/* Integrated search and sheet wrapper - this will keep both components aligned */}
          <div className="mobile-ui-wrapper fixed top-0 left-0 right-0 bottom-16 z-30 flex flex-col pointer-events-none">
            {/* Search bar for mobile - now part of the same container as the sheet */}
            <div className="pointer-events-auto">
              <SearchBar onSearch={handleSearch} />
            </div>
            
            {/* Spacer to push sheet to bottom - will adjust automatically with viewport changes */}
            <div className="flex-grow"></div>
            
            {/* Draggable sheet - now in the same container as search bar */}
            <div className="pointer-events-auto">
              <DraggableBottomSheet 
                houses={visibleHouses.map(convertHouseForSheet)} 
                onViewDetails={handleMarkerClick}
                topOffset={searchBarHeight}
                inWrapper={true}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};