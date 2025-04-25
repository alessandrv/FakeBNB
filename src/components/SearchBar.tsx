import React from 'react';
import { 
  Input, 
  Button, 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  DropdownSection,
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Calendar,
  Spinner,
  Chip,
  Card,
  Popover,
  PopoverTrigger,
  PopoverContent,
  DatePicker
} from "@heroui/react";
import { Icon } from '@iconify/react';
import { loadGoogleMapsApi, isGooglePlacesLoaded, onGoogleMapsLoaded } from '../services/GoogleMapsService';
import { parseDate, type DateValue } from '@internationalized/date';
import { useDateFormatter } from '@react-aria/i18n';

const popularCities = [
  { id: 1, name: 'Roma', country: 'Italia', lat: 41.9028, lng: 12.4964 },
  { id: 2, name: 'Milano', country: 'Italia', lat: 45.4642, lng: 9.1900 },
  { id: 3, name: 'Firenze', country: 'Italia', lat: 43.7696, lng: 11.2558 },
  { id: 4, name: 'Venezia', country: 'Italia', lat: 45.4408, lng: 12.3155 },
  { id: 5, name: 'Napoli', country: 'Italia', lat: 40.8518, lng: 14.2681 },
  { id: 6, name: 'Torino', country: 'Italia', lat: 45.0703, lng: 7.6869 },
  { id: 7, name: 'Bologna', country: 'Italia', lat: 44.4949, lng: 11.3426 },
  { id: 8, name: 'Palermo', country: 'Italia', lat: 38.1157, lng: 13.3615 },
  { id: 9, name: 'Genova', country: 'Italia', lat: 44.4056, lng: 8.9463 },
  { id: 10, name: 'Bari', country: 'Italia', lat: 41.1177, lng: 16.8512 },
  { id: 11, name: 'Catania', country: 'Italia', lat: 37.5079, lng: 15.0830 },
  { id: 12, name: 'Verona', country: 'Italia', lat: 45.4384, lng: 10.9916 }
];

interface LocationType {
  address: string;
  lat?: number;
  lng?: number;
}

interface Prediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

const formatDate = (date: DateValue | null): string => {
  if (!date) return "Quando?";
  
  const jsDate = date.toDate();
  return jsDate.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long'
  });
};

interface SearchBarProps {
  className?: string;
  onSearch?: (location: LocationType) => void;
  useGooglePlaces?: boolean;
  isSearching?: boolean;
  isMobile?: boolean;
  onMapPage?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  className = '', 
  onSearch,
  useGooglePlaces = true,
  isSearching = false,
  isMobile = false,
  onMapPage = false
}) => {
  const [location, setLocation] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<DateValue | null>(null);
  const [predictions, setPredictions] = React.useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [offlineMode, setOfflineMode] = React.useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
  
  const autoCompleteServiceRef = React.useRef<any>(null);
  const placesServiceRef = React.useRef<any>(null);
  const safetyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const requestTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const inputContainerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const apiCheckTimeout = setTimeout(() => {
      console.log('Google Places API check timeout - switching to offline mode');
      setOfflineMode(true);
      setErrorMessage('Modalità offline attiva. Utilizzando dati locali.');
      setTimeout(() => setErrorMessage(''), 3000);
    }, 5000);
    
    if (useGooglePlaces && !offlineMode) {
      if (isGooglePlacesLoaded()) {
        console.log('Google Maps API already loaded, initializing services');
        if (initGooglePlacesServices()) {
          clearTimeout(apiCheckTimeout);
        } else {
          setOfflineMode(true);
        }
      } else {
        console.log('Google Maps API not detected, using centralized service');
        loadGoogleMapsApi()
          .then(() => {
            console.log('Google Maps API loaded through centralized service');
            if (initGooglePlacesServices()) {
              clearTimeout(apiCheckTimeout);
              setOfflineMode(false);
            } else {
              setOfflineMode(true);
            }
          })
          .catch(error => {
            console.error('Error loading API:', error);
            setOfflineMode(true);
            setErrorMessage('Unable to load Google Maps API. Offline mode active.');
            setTimeout(() => setErrorMessage(''), 3000);
          });
      }
    } else {
      clearTimeout(apiCheckTimeout); 
    }
    
    return () => {
      clearTimeout(apiCheckTimeout);
      clearSafetyTimeout();
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, [useGooglePlaces, offlineMode]);

  const initGooglePlacesServices = () => {
    try {
      if (typeof window.google === 'undefined' || !window.google.maps || !window.google.maps.places) {
        console.log('Google Places API not available');
        return false;
      }
      
      console.log('Initializing Google Places API');
      
      if (!window.google.maps.places.AutocompleteService) {
        console.error('AutocompleteService not available');
        return false;
      }
      
      try {
        autoCompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      } catch (error) {
        console.error('Error initializing AutocompleteService:', error);
        return false;
      }
      
      try {
        const placesDiv = document.createElement('div');
        placesDiv.style.display = 'none';
        document.body.appendChild(placesDiv);
        placesServiceRef.current = new window.google.maps.places.PlacesService(placesDiv);
      } catch (error) {
        console.error('Error initializing PlacesService:', error);
        return false;
      }
      
      if (!autoCompleteServiceRef.current || !placesServiceRef.current) {
        console.error('Services were not properly initialized');
        return false;
      }
      
      console.log('Google Places API initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Google Places API:', error);
      return false;
    }
  };

  const clearSafetyTimeout = () => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  const fetchPredictions = React.useCallback((input: string) => {
    if (!input.trim()) {
      setPredictions([]);
      setIsLoading(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);
    setIsLoading(true);
    
    if (offlineMode || !autoCompleteServiceRef.current) {
      console.log('Using mock data for predictions');
      const filtered = popularCities
        .filter(city => 
          city.name.toLowerCase().includes(input.toLowerCase()) || 
          city.country.toLowerCase().includes(input.toLowerCase())
        )
        .map(city => ({
          description: `${city.name}, ${city.country}`,
          place_id: `city-${city.id}`,
          structured_formatting: {
            main_text: city.name,
            secondary_text: city.country
          }
        }));
      
      setPredictions(filtered);
      setIsLoading(false);
      return;
    }

    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
    }
    
    safetyTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      console.log('Safety timeout triggered - stopping loading state');
      
      useMockPredictions(input);
    }, 2000);

    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    requestTimeoutRef.current = setTimeout(() => {
      try {
        if (!autoCompleteServiceRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
          console.error('Google Places API not available');
          clearSafetyTimeout();
          useMockPredictions(input);
          return;
        }
        
        if (typeof autoCompleteServiceRef.current.getPlacePredictions !== 'function') {
          console.error('getPlacePredictions is not a function');
          clearSafetyTimeout();
          useMockPredictions(input);
          return;
        }
        
        autoCompleteServiceRef.current.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'it' }
          },
          (predictions: any, status: any) => {
            clearSafetyTimeout();
            
            setIsLoading(false);
            
            if (!status || status !== (window.google?.maps?.places?.PlacesServiceStatus?.OK || 'OK') || !predictions) {
              console.error('Google Places API error:', status);
              
              useMockPredictions(input);
              return;
            }
            
            console.log('Got predictions:', predictions.length);
            setPredictions(predictions);
          }
        );
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setIsLoading(false);
        clearSafetyTimeout();
        
        useMockPredictions(input);
      }
    }, 300);
  }, [offlineMode]);

  const useMockPredictions = (input: string) => {
    const filtered = popularCities
      .filter(city => 
        city.name.toLowerCase().includes(input.toLowerCase()) || 
        city.country.toLowerCase().includes(input.toLowerCase())
      )
      .map(city => ({
        description: `${city.name}, ${city.country}`,
        place_id: `city-${city.id}`,
        structured_formatting: {
          main_text: city.name,
          secondary_text: city.country
        }
      }));
    
    setPredictions(filtered);
    setIsLoading(false);
  };

  const handleSelectPlace = (prediction: Prediction) => {
    setLocation(prediction.description);
    setIsDropdownOpen(false);
    
    if (prediction.place_id.startsWith('city-')) {
      const cityId = prediction.place_id.replace('city-', '');
      const city = popularCities.find(c => c.id === parseInt(cityId));
      
      if (city && onSearch) {
        const locationData: LocationType = {
          address: `${city.name}, ${city.country}`,
          lat: city.lat,
          lng: city.lng
        };
        
        console.log('Selected city from mock data:', locationData);
        setIsLoading(false);
        onSearch(locationData);
      }
      return;
    }
    
    if (!offlineMode && placesServiceRef.current) {
      setIsLoading(true);
      
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      
      safetyTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        console.log('Safety timeout triggered for place details - using fallback');
        
        handleFallbackForPlace(prediction.description);
      }, 2000);
      
      try {
        if (!placesServiceRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
          console.error('Google Places API not available for details');
          clearSafetyTimeout();
          handleFallbackForPlace(prediction.description);
          return;
        }
        
        if (typeof placesServiceRef.current.getDetails !== 'function') {
          console.error('getDetails is not a function');
          clearSafetyTimeout();
          handleFallbackForPlace(prediction.description);
          return;
        }
        
        placesServiceRef.current.getDetails(
          { placeId: prediction.place_id, fields: ['geometry', 'formatted_address'] },
          (place: any, status: any) => {
            clearSafetyTimeout();
            
            setIsLoading(false);
            
            if (!status || status !== (window.google?.maps?.places?.PlacesServiceStatus?.OK || 'OK') || !place) {
              console.error('Error fetching place details:', status);
              
              handleFallbackForPlace(prediction.description);
              return;
            }
            
            const locationData: LocationType = {
              address: place.formatted_address || prediction.description,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng()
            };
            
            console.log('Selected place with coordinates:', locationData);
            
            if (onSearch) {
              onSearch(locationData);
            }
          }
        );
      } catch (error) {
        console.error('Error in getDetails:', error);
        clearSafetyTimeout();
        setIsLoading(false);
        handleFallbackForPlace(prediction.description);
      }
    } else {
      handleFallbackForPlace(prediction.description);
    }
  };

  const handleFallbackForPlace = (description: string) => {
    const cityMatch = findBestCityMatch(description);
    if (cityMatch && onSearch) {
      console.log('Offline/fallback mode: found match with', cityMatch.name);
      onSearch({
        address: description,
        lat: cityMatch.lat,
        lng: cityMatch.lng
      });
    } else if (onSearch) {
      console.log('Offline/fallback mode: no match found for', description);
      onSearch({ address: description });
    }
  };

  const findBestCityMatch = (address: string): (typeof popularCities)[0] | null => {
    const lowerAddress = address.toLowerCase();
    
    console.log('Looking for match for:', lowerAddress);
    
    for (const city of popularCities) {
      if (lowerAddress.includes(city.name.toLowerCase())) {
        console.log('Found exact match with:', city.name);
        return city;
      }
    }
    
    const words = lowerAddress.split(/[\s,]+/).filter(w => w.length > 2);
    console.log('Words for search:', words);
    
    for (const word of words) {
      for (const city of popularCities) {
        if (city.name.toLowerCase().includes(word) || 
            word.includes(city.name.toLowerCase())) {
          console.log('Found partial match with:', city.name, 'for word:', word);
          return city;
        }
      }
    }
    
    console.log('No match found, returning Rome as default');
    return popularCities[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location.trim()) return;
    
    setIsLoading(true);
    
    if (offlineMode || !autoCompleteServiceRef.current) {
      handleFallbackSearch();
      return;
    }
    
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
    }
    
    safetyTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      console.log('Safety timeout triggered for form submission - using fallback');
      handleFallbackSearch();
    }, 2000);
    
    try {
      if (!autoCompleteServiceRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Places API not available for search');
        clearSafetyTimeout();
        handleFallbackSearch();
        return;
      }
      
      if (typeof autoCompleteServiceRef.current.getPlacePredictions !== 'function') {
        console.error('getPlacePredictions is not a function for search');
        clearSafetyTimeout();
        handleFallbackSearch();
        return;
      }
      
      autoCompleteServiceRef.current.getPlacePredictions(
        {
          input: location,
          componentRestrictions: { country: 'it' }
        },
        (predictions: any, status: any) => {
          clearSafetyTimeout();
          
          if (!status || status !== (window.google?.maps?.places?.PlacesServiceStatus?.OK || 'OK') || 
              !predictions || predictions.length === 0) {
            console.log('No predictions found, using fallback');
            handleFallbackSearch();
            return;
          }
          
          const bestMatch = predictions[0];
          
          if (!placesServiceRef.current) {
            console.error('PlacesService not available');
            handleFallbackSearch();
            return;
          }
          
          if (typeof placesServiceRef.current.getDetails !== 'function') {
            console.error('getDetails is not a function');
            handleFallbackSearch();
            return;
          }
          
          try {
            placesServiceRef.current.getDetails(
              { placeId: bestMatch.place_id, fields: ['geometry', 'formatted_address'] },
              (place: any, detailStatus: any) => {
                setIsLoading(false);
                
                if (!detailStatus || detailStatus !== (window.google?.maps?.places?.PlacesServiceStatus?.OK || 'OK') || !place) {
                  console.log('Error fetching place details, using fallback');
                  handleFallbackSearch();
                  return;
                }
                
                const locationData: LocationType = {
                  address: place.formatted_address || bestMatch.description,
                  lat: place.geometry?.location?.lat(),
                  lng: place.geometry?.location?.lng()
                };
                
                if (onSearch) {
                  onSearch(locationData);
                }
              }
            );
          } catch (detailError) {
            console.error('Error in getDetails:', detailError);
            handleFallbackSearch();
          }
        }
      );
    } catch (error) {
      console.error('Error in form submission:', error);
      setIsLoading(false);
      clearSafetyTimeout();
      handleFallbackSearch();
    }
  };

  const handleFallbackSearch = () => {
    setIsLoading(false);
    
    console.log('Using fallback search for:', location);
    
    const cityMatch = findBestCityMatch(location);
    
    if (cityMatch && onSearch) {
      const locationData: LocationType = {
        address: location,
        lat: cityMatch.lat,
        lng: cityMatch.lng
      };
      
      console.log('Found city match for fallback:', cityMatch.name);
      onSearch(locationData);
    } else if (onSearch) {
      onSearch({ address: location });
    }
  };

  const renderPopularCities = () => {
    return popularCities.map((city) => (
      <DropdownItem 
        key={`city-${city.id}`}
        startContent={<Icon icon="lucide:map-pin" className="text-primary-500" />}
        description={city.country}
        onPress={() => handleSelectPlace({
          description: `${city.name}, ${city.country}`,
          place_id: `city-${city.id}`,
          structured_formatting: {
            main_text: city.name,
            secondary_text: city.country
          }
        })}
      >
        {city.name}
      </DropdownItem>
    ));
  };

  const formatMonth = (date: DateValue | null): string => {
    if (!date) return "Quando?";
    
    const jsDate = new Date(date.year, date.month - 1, 1);
    
    return jsDate.toLocaleDateString('it-IT', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className={`w-full max-w-3xl mx-auto relative z-10 ${className}`}>
      <Card 
        className="overflow-visible shadow-lg border-none"
        radius="lg"
      >
        <form 
          className="flex flex-row items-stretch p-1.5 gap-2"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 min-w-0 relative" ref={inputContainerRef}>
            <Input
              placeholder="Where do you want to go?"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                fetchPredictions(e.target.value);
              }}
              startContent={<Icon icon="lucide:map-pin" className="text-primary-500" />}
              classNames={{
                input: "pl-1",
                inputWrapper: "h-12"
              }}
              isClearable
              onClear={() => {
                setLocation('');
                setPredictions([]);
                setIsDropdownOpen(false);
              }}
              onFocus={() => {
                if (location.trim() !== '' || predictions.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
            />
            
            {isDropdownOpen && (
              <div 
                className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[60vh] overflow-auto"
                style={{ width: inputContainerRef.current?.offsetWidth }}
              >
                
                  <div className="p-2">
                    
                    {isLoading ? (
                      <div className="h-12 flex items-center justify-center">
                        <Spinner size="sm" color="primary" />
                      </div>
                    ) : predictions.length > 0 ? (
                      predictions.map((prediction, index) => (
                        <div 
                          key={`prediction-${prediction.place_id}-${index}`}
                          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                          onClick={() => handleSelectPlace(prediction)}
                        >
                          <Icon icon="lucide:map-pin" className="text-primary-500" />
                          <div>
                            <div className="font-medium">
                              {prediction.structured_formatting?.main_text || prediction.description.split(',')[0]}
                            </div>
                            <div className="text-sm text-gray-500">
                              {prediction.structured_formatting?.secondary_text || 
                               prediction.description.split(',').slice(1).join(',')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 text-center text-gray-600">
                        <p className="mb-1">No results found</p>
                        <p className="text-xs text-gray-400">Try another location or check spelling</p>
                      </div>
                    )}
                  </div>
                
              </div>
            )}
          </div>
          
          <div className="h-12">
            <Popover 
              isOpen={isCalendarOpen}
              onOpenChange={setIsCalendarOpen}
              placement="bottom"
              showArrow
            >
              <PopoverTrigger>
                <Button 
                  color="default" 
                  variant="flat" 
                  className="h-12 px-3 justify-start font-normal whitespace-nowrap"
                  startContent={<Icon icon="lucide:calendar" className="text-primary-500" />}
                >
                  {formatMonth(selectedDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <div className="p-3 flex flex-col gap-3">
                      <div>
                        <div className="text-sm text-center text-gray-500 mb-2">Year</div>
                        <div className="flex justify-between items-center">
                          <Button 
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => {
                              const currentYear = selectedDate ? selectedDate.year : new Date().getFullYear();
                              const currentMonth = selectedDate ? selectedDate.month : 1;
                              const newDate = parseDate(`${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-01`);
                              setSelectedDate(newDate);
                            }}
                          >
                            <Icon icon="lucide:chevron-left" />
                          </Button>
                          <span className="font-medium">
                            {selectedDate ? selectedDate.year : new Date().getFullYear()}
                          </span>
                          <Button 
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => {
                              const currentYear = selectedDate ? selectedDate.year : new Date().getFullYear();
                              const currentMonth = selectedDate ? selectedDate.month : 1;
                              const newDate = parseDate(`${currentYear + 1}-${String(currentMonth).padStart(2, '0')}-01`);
                              setSelectedDate(newDate);
                            }}
                          >
                            <Icon icon="lucide:chevron-right" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2">Month</div>
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 12 }, (_, i) => {
                            const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                            return (
                              <Button 
                                key={`month-${i}`}
                                color={selectedDate && selectedDate.month === i + 1 ? "primary" : "default"}
                                variant={selectedDate && selectedDate.month === i + 1 ? "flat" : "light"}
                                className="justify-start px-3 py-1"
                                onPress={() => {
                                  const year = selectedDate ? selectedDate.year : new Date().getFullYear();
                                  const newDate = parseDate(`${year}-${String(i + 1).padStart(2, '0')}-01`);
                                  setSelectedDate(newDate);
                                  setIsCalendarOpen(false);
                                }}
                              >
                                {monthName}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button 
                      size="sm" 
                      color="danger" 
                      variant="light" 
                      onPress={() => {
                        setSelectedDate(null);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm"
                      color="primary" 
                      onPress={() => setIsCalendarOpen(false)}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            color="primary" 
            type="submit"
            isIconOnly
            className="h-12 w-12"
            isLoading={isLoading}
            isDisabled={!location.trim()}
          >
            {!isLoading && <Icon icon="lucide:chevron-right" width={24} />}
          </Button>
        </form>
      </Card>
      
      {errorMessage && (
        <div className="mt-2 text-center">
          <Chip color="danger" variant="flat">{errorMessage}</Chip>
        </div>
      )}
      
      {offlineMode && !errorMessage && (
        <div className="absolute top-0 right-0 -mt-2 -mr-2">
          <Chip size="sm" color="warning" variant="flat">offline</Chip>
        </div>
      )}
    </div>
  );
};
export default SearchBar; 