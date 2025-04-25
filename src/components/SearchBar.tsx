import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SearchBar.css';
import { loadGoogleMapsApi, isGooglePlacesLoaded, onGoogleMapsLoaded } from '../services/GoogleMapsService';

// Mock data for popular cities with coordinates for Google Maps
const popularCities = [
  { id: 1, name: 'Roma', country: 'Italia', lat: 41.9028, lng: 12.4964 },
  { id: 2, name: 'Milano', country: 'Italia', lat: 45.4642, lng: 9.1900 },
  { id: 3, name: 'Firenze', country: 'Italia', lat: 43.7696, lng: 11.2558 },
  { id: 4, name: 'Venezia', country: 'Italia', lat: 45.4408, lng: 12.3155 },
  { id: 5, name: 'Napoli', country: 'Italia', lat: 40.8518, lng: 14.2681 },
  { id: 6, name: 'Torino', country: 'Italia', lat: 45.0703, lng: 7.6869 },
  { id: 7, name: 'Bologna', country: 'Italia', lat: 44.4949, lng: 11.3426 },
  { id: 8, name: 'Palermo', country: 'Italia', lat: 38.1157, lng: 13.3615 },
  // Aggiungiamo più città per migliorare la ricerca offline
  { id: 9, name: 'Genova', country: 'Italia', lat: 44.4056, lng: 8.9463 },
  { id: 10, name: 'Bari', country: 'Italia', lat: 41.1177, lng: 16.8512 },
  { id: 11, name: 'Catania', country: 'Italia', lat: 37.5079, lng: 15.0830 },
  { id: 12, name: 'Verona', country: 'Italia', lat: 45.4384, lng: 10.9916 }
];

// Tipo per la proprietà location
interface LocationType {
  address: string;
  lat?: number;
  lng?: number;
}

// Interfaccia per le props del componente
interface SearchBarProps {
  className?: string;
  onSearch?: (location: LocationType) => void;
  useGooglePlaces?: boolean;
  isSearching?: boolean;
  isMobile?: boolean;
  onMapPage?: boolean;
}

interface Prediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  className = '', 
  onSearch,
  useGooglePlaces = true,
  isSearching = false,
  isMobile = false,
  onMapPage = false
}) => {
  // Stato per l'input di ricerca
  const [location, setLocation] = useState<string>('');
  const [date, setDate] = useState<string>('Quando?');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  
  // Refs per i timeout e gli elementi del DOM
  const searchFormRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoCompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inizializzazione dei servizi Google Places
  useEffect(() => {
    // Verifichiamo se l'API è disponibile - con un timeout di sicurezza
    const apiCheckTimeout = setTimeout(() => {
      console.log('Google Places API check timeout - switching to offline mode');
      setOfflineMode(true);
      setErrorMessage('Modalità offline attiva. Utilizzando dati locali.');
      setTimeout(() => setErrorMessage(''), 3000);
    }, 5000);
    
    // Prova a inizializzare i servizi - se non ci riesce, passa alla modalità offline
    if (useGooglePlaces && !offlineMode) {
      // Verifica se l'API è già disponibile
      if (isGooglePlacesLoaded()) {
        console.log('Google Maps API già caricata, inizializzazione servizi');
        if (initGooglePlacesServices()) {
          clearTimeout(apiCheckTimeout);
        } else {
          setOfflineMode(true);
        }
      } else {
        // L'API non è disponibile, usa il servizio centralizzato
        console.log('Google Maps API non rilevata, utilizzo servizio centralizzato');
        
        // Carica l'API tramite il servizio
        loadGoogleMapsApi()
          .then(() => {
            console.log('Google Maps API caricata tramite servizio centralizzato');
            if (initGooglePlacesServices()) {
              clearTimeout(apiCheckTimeout);
              setOfflineMode(false);
            } else {
              setOfflineMode(true);
            }
          })
          .catch(error => {
            console.error('Errore nel caricamento dell\'API:', error);
            setOfflineMode(true);
            setErrorMessage('Impossibile caricare Google Maps API. Modalità offline attiva.');
            setTimeout(() => setErrorMessage(''), 3000);
          });
      }
    } else {
      clearTimeout(apiCheckTimeout); 
    }
    
    // Clean up
    return () => {
      clearTimeout(apiCheckTimeout);
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, [useGooglePlaces, offlineMode]);

  const initGooglePlacesServices = () => {
    try {
      // Verifica se l'API Google è disponibile
      if (typeof window.google === 'undefined' || !window.google.maps || !window.google.maps.places) {
        console.log('Google Places API not available');
        return false;
      }
      
      console.log('Inizializzazione Google Places API');
      
      // Verifica che l'oggetto AutocompleteService sia disponibile
      if (!window.google.maps.places.AutocompleteService) {
        console.error('AutocompleteService non disponibile');
        return false;
      }
      
      // Inizializza AutocompleteService
      try {
        autoCompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      } catch (error) {
        console.error('Errore nell\'inizializzazione di AutocompleteService:', error);
        return false;
      }
      
      // Creiamo un elemento temporaneo per il PlacesService
      try {
        const placesDiv = document.createElement('div');
        placesDiv.style.display = 'none';
        document.body.appendChild(placesDiv);
        placesServiceRef.current = new window.google.maps.places.PlacesService(placesDiv);
      } catch (error) {
        console.error('Errore nell\'inizializzazione di PlacesService:', error);
        return false;
      }
      
      // Verifica che i servizi siano stati inizializzati correttamente
      if (!autoCompleteServiceRef.current || !placesServiceRef.current) {
        console.error('I servizi non sono stati inizializzati correttamente');
        return false;
      }
      
      console.log('Google Places API initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Google Places API:', error);
      return false;
    }
  };

  // Effetto per gestire il click fuori dal dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchFormRef.current && 
        !searchFormRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setShowCalendar(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Ottiene suggerimenti da Google Places o mock data
  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim()) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // In modalità offline o se l'API non è disponibile, usa i dati mockati
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

    // Safety timeout to stop loading state after 2 seconds
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
    }
    
    safetyTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      console.log('Safety timeout triggered - stopping loading state');
      
      // Fallback ai dati mockati se il timeout scatta
      useMockPredictions(input);
    }, 2000);

    // Local request timeout
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    requestTimeoutRef.current = setTimeout(() => {
      try {
        // Verifica che l'API sia ancora disponibile
        if (!autoCompleteServiceRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
          console.error('Google Places API non disponibile');
          clearSafetyTimeout();
          useMockPredictions(input);
          return;
        }
        
        // Più sicuro: verifica che il servizio abbia il metodo richiesto
        if (typeof autoCompleteServiceRef.current.getPlacePredictions !== 'function') {
          console.error('getPlacePredictions non è una funzione');
          clearSafetyTimeout();
          useMockPredictions(input);
          return;
        }
        
        autoCompleteServiceRef.current.getPlacePredictions(
          {
            input,
            // Uso un formato minimale senza tipi specifici
            // che permette di cercare qualsiasi tipo di luogo
            componentRestrictions: { country: 'it' }
          },
          (predictions: any, status: any) => {
            // Clear safety timeout since we got a response
            clearSafetyTimeout();
            
            setIsLoading(false);
            
            if (!status || status !== (window.google?.maps?.places?.PlacesServiceStatus?.OK || 'OK') || !predictions) {
              console.error('Google Places API error:', status);
              
              // Fallback ai dati mockati in caso di errore
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
        
        // Fallback ai dati mockati in caso di errore
        useMockPredictions(input);
      }
    }, 300); // Debounce time
  }, [offlineMode]);

  // Funzione di utilità per cancellare il safety timeout
  const clearSafetyTimeout = () => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };
  
  // Funzione di utilità per usare i dati mockati
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

  // Gestisce il cambiamento nel campo di ricerca
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocation(inputValue);
    setShowSuggestions(true);
    fetchPredictions(inputValue);
  };

  // Gestisce la selezione di un luogo
  const handleSelectPlace = (prediction: Prediction) => {
    setLocation(prediction.description);
    setShowSuggestions(false);
    
    // Se è un ID di città mockato, gestisci direttamente
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
    
    // Se stiamo usando Google Places e non siamo in modalità offline
    if (!offlineMode && placesServiceRef.current) {
      setIsLoading(true);
      
      // Safety timeout for place details request
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      
      safetyTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        console.log('Safety timeout triggered for place details - using fallback');
        
        // Fallback alla ricerca tra i dati mockati
        const cityMatch = findBestCityMatch(prediction.description);
        if (cityMatch && onSearch) {
          onSearch({
            address: prediction.description,
            lat: cityMatch.lat,
            lng: cityMatch.lng
          });
        } else if (onSearch) {
          onSearch({ address: prediction.description });
        }
      }, 2000);
      
      try {
        // Verifica che l'API sia ancora disponibile
        if (!placesServiceRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
          console.error('Google Places API non disponibile per i dettagli');
          clearSafetyTimeout();
          handleFallbackForPlace(prediction.description);
          return;
        }
        
        // Più sicuro: verifica che il servizio abbia il metodo richiesto
        if (typeof placesServiceRef.current.getDetails !== 'function') {
          console.error('getDetails non è una funzione');
          clearSafetyTimeout();
          handleFallbackForPlace(prediction.description);
          return;
        }
        
        placesServiceRef.current.getDetails(
          { placeId: prediction.place_id, fields: ['geometry', 'formatted_address'] },
          (place: any, status: any) => {
            // Clear the safety timeout
            clearSafetyTimeout();
            
            setIsLoading(false);
            
            if (!status || status !== (window.google?.maps?.places?.PlacesServiceStatus?.OK || 'OK') || !place) {
              console.error('Error fetching place details:', status);
              
              // Fallback alla ricerca tra i dati mockati
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
      // In modalità offline, cerca tra i dati mockati
      handleFallbackForPlace(prediction.description);
    }
  };
  
  // Funzione di utility per gestire il fallback quando si seleziona un luogo
  const handleFallbackForPlace = (description: string) => {
    // Cerca una corrispondenza nei dati mockati
    const cityMatch = findBestCityMatch(description);
    if (cityMatch && onSearch) {
      console.log('Modalità offline/fallback: trovata corrispondenza con', cityMatch.name);
      onSearch({
        address: description,
        lat: cityMatch.lat,
        lng: cityMatch.lng
      });
    } else if (onSearch) {
      console.log('Modalità offline/fallback: nessuna corrispondenza trovata per', description);
      // Usa Roma come default se nessuna corrispondenza è trovata
      onSearch({ 
        address: description,
        lat: popularCities[0].lat,
        lng: popularCities[0].lng
      });
    }
  };

  // Trova la migliore corrispondenza tra le città mockate
  const findBestCityMatch = (address: string): (typeof popularCities)[0] | null => {
    const lowerAddress = address.toLowerCase();
    
    console.log('Cerco corrispondenza per:', lowerAddress);
    
    // Cerca corrispondenze esatte
    for (const city of popularCities) {
      if (lowerAddress.includes(city.name.toLowerCase())) {
        console.log('Trovata corrispondenza esatta con:', city.name);
        return city;
      }
    }
    
    // Cerca corrispondenze parziali
    const words = lowerAddress.split(/[\s,]+/).filter(w => w.length > 2);
    console.log('Parole per la ricerca:', words);
    
    for (const word of words) {
      for (const city of popularCities) {
        if (city.name.toLowerCase().includes(word) || 
            word.includes(city.name.toLowerCase())) {
          console.log('Trovata corrispondenza parziale con:', city.name, 'per la parola:', word);
          return city;
        }
      }
    }
    
    // Se non trova nulla, restituisce Roma come default
    console.log('Nessuna corrispondenza trovata, restituisco Roma come default');
    return popularCities[0];
  };

  // Gestisce l'invio del form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location.trim()) return;
    
    setIsLoading(true);
    
    // In modalità offline, usa direttamente i dati mockati
    if (offlineMode || !autoCompleteServiceRef.current) {
      handleFallbackSearch();
      return;
    }
    
    // Safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
    }
    
    safetyTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      console.log('Safety timeout triggered for form submission - using fallback');
      handleFallbackSearch();
    }, 2000);
    
    try {
      // Verifica che l'API sia ancora disponibile
      if (!autoCompleteServiceRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Places API non disponibile per la ricerca');
        clearSafetyTimeout();
        handleFallbackSearch();
        return;
      }
      
      // Più sicuro: verifica che il servizio abbia il metodo richiesto
      if (typeof autoCompleteServiceRef.current.getPlacePredictions !== 'function') {
        console.error('getPlacePredictions non è una funzione per la ricerca');
        clearSafetyTimeout();
        handleFallbackSearch();
        return;
      }
      
      autoCompleteServiceRef.current.getPlacePredictions(
        {
          input: location,
          // Uso un formato minimale senza tipi specifici
          // che permette di cercare qualsiasi tipo di luogo
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
          
          // Usa la prima predizione
          const bestMatch = predictions[0];
          
          if (!placesServiceRef.current) {
            console.error('PlacesService non disponibile');
            handleFallbackSearch();
            return;
          }
          
          // Verifica che il servizio abbia il metodo richiesto
          if (typeof placesServiceRef.current.getDetails !== 'function') {
            console.error('getDetails non è una funzione');
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
  
  // Funzione di fallback per la ricerca
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
      // Nessuna corrispondenza trovata, invia solo il testo
      onSearch({ address: location });
    }
  };

  // Gestisce i tasti nelle date (per il calendario)
  const handleDateSelect = (date: string) => {
    setDate(date);
    setShowCalendar(false);
  };

  // Rendering del componente
  return (
    <div className={`w-full max-w-3xl mx-auto relative z-10 font-sans ${className}`}>
      <form ref={searchFormRef} className="flex items-center bg-white rounded-full shadow-lg overflow-visible relative p-1.5" onSubmit={handleSubmit}>
        <div className="flex-1 relative min-w-0">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-500 text-lg z-10">
            📍
          </span>
          <input
            ref={inputRef}
            type="text"
            className="w-full py-4 pl-10 pr-4 border-none outline-none text-base text-gray-800 bg-transparent"
            placeholder="Dove vuoi andare?"
            value={location}
            onChange={handleLocationChange}
            onFocus={() => setShowSuggestions(true)}
            aria-label="Cerca una destinazione"
          />
        </div>
        
        {/* Ripristino la sezione date */}
        <div className="py-3 px-5 border-l border-r border-gray-100 cursor-pointer whitespace-nowrap text-sm text-gray-600 flex items-center" onClick={() => setShowCalendar(!showCalendar)}>
          <span className="mr-2 flex items-center">📅</span>
          {date}
        </div>
        
        <button 
          type="submit" 
          className="bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-full w-12 h-12 flex items-center justify-center mx-1.5 cursor-pointer transition-colors duration-200 flex-shrink-0 disabled:cursor-not-allowed"
          disabled={isLoading}
          aria-label="Cerca"
        >
          {isLoading ? (
            <div className="animate-spin">
              ➤
            </div>
          ) : (
            "➤"
          )}
        </button>
        
        {/* Dropdown suggerimenti - migliorato per mobile */}
        {showSuggestions && (
          <div className={`${isMobile ? 'fixed inset-x-0 top-20 mx-2' : 'absolute top-full left-0 w-full mt-2.5'} bg-white rounded-xl shadow-lg overflow-y-auto z-50 animate-fadeIn block pointer-events-auto opacity-100 ${isMobile ? 'max-h-[35vh]' : 'max-h-[450px]'} border border-gray-100`}>
            {/* Sezione suggerimenti popolari */}
            {location.trim() === '' && (
              <div className={`${isMobile ? 'py-1.5' : 'py-2.5'}`}>
                <div className={`flex items-center ${isMobile ? 'px-3 py-1' : 'px-4 py-2'} font-semibold text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="mr-2 text-base">🌎</span>
                  Destinazioni popolari
                </div>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-1 ${isMobile ? 'p-1' : 'p-2'}`}>
                  {popularCities.map((city) => (
                    <div 
                      key={city.id} 
                      className={`flex items-center ${isMobile ? 'p-2' : 'p-3'} cursor-pointer transition-colors duration-200 rounded-lg hover:bg-gray-100 relative`}
                      onClick={() => handleSelectPlace({
                        description: `${city.name}, ${city.country}`,
                        place_id: `city-${city.id}`,
                        structured_formatting: {
                          main_text: city.name,
                          secondary_text: city.country
                        }
                      })}
                    >
                      <div className="mr-3 text-base flex items-center justify-center w-6 text-primary-500">
                        📍
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : ''}`}>{city.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{city.country}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sezione risultati di ricerca */}
            {location.trim() !== '' && (
              <div className={`${isMobile ? 'py-1.5' : 'py-2.5'}`}>
                <div className={`flex items-center ${isMobile ? 'px-3 py-1' : 'px-4 py-2'} font-semibold text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="mr-2 text-base">🔍</span>
                  Risultati della ricerca
                </div>
                <div className={`${isMobile ? 'max-h-[30vh]' : 'max-h-[300px]'} overflow-y-auto`}>
                  {isLoading ? (
                    <div className={`${isMobile ? 'py-3' : 'py-5'} px-4 text-center text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                      Ricerca in corso...
                    </div>
                  ) : predictions.length > 0 ? (
                    predictions.map((prediction, index) => (
                      <div 
                        key={`${prediction.place_id}-${index}`} 
                        className={`flex items-center ${isMobile ? 'p-2' : 'p-3'} cursor-pointer transition-colors duration-200 hover:bg-gray-100 rounded-lg`}
                        onClick={() => handleSelectPlace(prediction)}
                      >
                        <div className="mr-3 text-base flex items-center justify-center w-6 text-primary-500">
                          📍
                        </div>
                        <div className="flex-1 flex flex-col">
                          <div className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : ''}`}>
                            {prediction.structured_formatting?.main_text || 
                             prediction.description.split(',')[0]}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {prediction.structured_formatting?.secondary_text || 
                             prediction.description.split(',').slice(1).join(',')}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`${isMobile ? 'py-3' : 'py-5'} px-4 text-center text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                      Nessun risultato trovato
                      <div className="text-xs text-gray-400 mt-2">
                        Prova con un'altra località o verifica l'ortografia
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Footer del dropdown */}
            <div className={`${isMobile ? 'p-1.5' : 'p-2.5'} flex justify-center border-t border-gray-100 bg-gray-50`}>
              <button 
                type="button" 
                className={`bg-transparent border-none text-primary-500 ${isMobile ? 'text-xs' : 'text-sm'} cursor-pointer ${isMobile ? 'py-0.5 px-3' : 'py-1 px-4'} rounded-full transition-colors duration-200 hover:bg-gray-100`}
                onClick={() => setShowSuggestions(false)}
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
        
        {/* Calendario (implementazione semplificata) */}
        {showCalendar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">&lt;</button>
                <div className="font-medium">Luglio 2024</div>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">&gt;</button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 py-3 px-3 bg-gray-50">
                <div className="text-center text-sm font-medium text-gray-500">D</div>
                <div className="text-center text-sm font-medium text-gray-500">L</div>
                <div className="text-center text-sm font-medium text-gray-500">M</div>
                <div className="text-center text-sm font-medium text-gray-500">M</div>
                <div className="text-center text-sm font-medium text-gray-500">G</div>
                <div className="text-center text-sm font-medium text-gray-500">V</div>
                <div className="text-center text-sm font-medium text-gray-500">S</div>
              </div>

              <div className="grid grid-cols-7 gap-1 p-3">
                {/* Spazio vuoto */}
                <div className="w-10 h-10"></div>
                {Array.from({ length: 31 }, (_, i) => (
                  <div 
                    key={i + 1} 
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-gray-100 ${i + 1 === 15 ? 'bg-primary-500 text-white' : ''}`}
                    onClick={() => handleDateSelect(`${i + 1} Luglio`)}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              
              <div className="p-3 flex justify-center border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  className="bg-transparent border-none text-primary-500 text-sm cursor-pointer py-1 px-4 rounded-full transition-colors duration-200 hover:bg-gray-100"
                  onClick={() => setShowCalendar(false)}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
      
      {/* Messaggio di errore o indicatore di modalità offline */}
      {errorMessage && (
        <div className="text-primary-500 mt-2.5 text-center text-sm">
          {errorMessage}
        </div>
      )}
      
      {/* Indicatore della modalità offline */}
      {offlineMode && !errorMessage && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200">
          offline
        </div>
      )}
    </div>
  );
};

export default SearchBar; 