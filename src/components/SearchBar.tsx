import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

// Interfaccia delle props
interface SearchBarProps {
  onSearch: (params: { location: string; checkIn: string; checkOut: string }, coordinates?: [number, number]) => void;
  isSearching?: boolean;
  isMobile?: boolean;
}

// Destinazioni preimpostate semplici
const CITIES = [
  { id: 1, name: "Roma", coords: [41.9028, 12.4964] as [number, number] },
  { id: 2, name: "Milano", coords: [45.4642, 9.1900] as [number, number] },
  { id: 3, name: "Firenze", coords: [43.7696, 11.2558] as [number, number] },
  { id: 4, name: "Venezia", coords: [45.4408, 12.3155] as [number, number] },
  { id: 5, name: "Napoli", coords: [40.8518, 14.2681] as [number, number] },
  { id: 6, name: "Torino", coords: [45.0703, 7.6869] as [number, number] },
  { id: 7, name: "Bologna", coords: [44.4949, 11.3426] as [number, number] },
  { id: 8, name: "Palermo", coords: [38.1157, 13.3615] as [number, number] }
];

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isSearching = false, isMobile = false }) => {
  // Stati base
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref per il contenitore del componente
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filtra le città in base all'input
  const matchingCities = CITIES.filter(city => 
    city.name.toLowerCase().includes(location.toLowerCase())
  );
  
  // Gestisce il submit del form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se c'è una corrispondenza con una città, usa le sue coordinate
    const matchedCity = CITIES.find(
      city => city.name.toLowerCase() === location.toLowerCase()
    );
    
    if (matchedCity) {
      console.log("Città corrispondente:", matchedCity.name);
      onSearch({ location: matchedCity.name, checkIn, checkOut }, matchedCity.coords);
    } else if (location.trim()) {
      // Altrimenti, se c'è un termine di ricerca, invialo senza coordinate
      console.log("Ricerca generica:", location);
      onSearch({ location, checkIn, checkOut });
    }
    
    setIsOpen(false);
  };
  
  // Gestisce la selezione di una città
  const handleSelectCity = (city: typeof CITIES[0]) => {
    console.log("Città selezionata:", city.name);
    setLocation(city.name);
    onSearch({ location: city.name, checkIn, checkOut }, city.coords);
    setIsOpen(false);
  };
  
  // Effetto per chiudere il dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div 
      className="relative"
      ref={containerRef}
      style={{ 
        zIndex: 9999,
        position: 'relative',
        width: '100%'
      }}
    >
      {/* Form di ricerca */}
      <form onSubmit={handleSubmit} className="relative z-20">
        <div className="flex items-center bg-white rounded-full shadow-xl border border-gray-300 overflow-hidden">
          {/* Campo di ricerca */}
          <div className="flex-1 px-4 py-3">
            <label className="block text-xs font-bold text-gray-700 mb-1">Dove</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder="Cerca città"
              className="w-full bg-transparent border-none focus:outline-none text-gray-800"
              autoComplete="off"
            />
          </div>
          
          {/* Separatore */}
          <div className="h-10 border-r border-gray-300"></div>
          
          {/* Date (desktop) */}
          {!isMobile && (
            <div className="flex-1 px-4 py-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-gray-800 w-24"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-gray-800 w-24"
                />
              </div>
            </div>
          )}
          
          {/* Date (mobile) */}
          {isMobile && (
            <div className="flex-1 px-3 py-3">
              <div className="flex items-center justify-center">
                <Icon icon="carbon:calendar" className="text-gray-500 mr-2" />
                <span className="text-gray-800">{checkIn || "Seleziona date"}</span>
              </div>
            </div>
          )}
          
          {/* Pulsante di ricerca */}
          <button
            type="submit"
            className="m-1 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow-md"
            disabled={isSearching}
          >
            <Icon 
              icon={isSearching ? "eos-icons:loading" : "carbon:search"} 
              className="w-5 h-5" 
            />
          </button>
        </div>
      </form>
      
      {/* Dropdown dei risultati - slegato dal normale flusso del documento */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-300"
          style={{ 
            zIndex: 9999,
            top: containerRef.current ? `${containerRef.current.getBoundingClientRect().height + 4}px` : '60px',
            maxHeight: '300px',
            overflowY: 'auto',
            width: '100%'
          }}
        >
          {location.trim() === '' ? (
            // Mostra tutte le città quando non c'è testo
            <div className="p-3">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-200 mb-2">
                DESTINAZIONI POPOLARI
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CITIES.map(city => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-md text-left transition-colors"
                  >
                    <div className="bg-blue-100 p-2 rounded-full mr-2">
                      <Icon icon="carbon:location" className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-800">{city.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : matchingCities.length > 0 ? (
            // Mostra le città che corrispondono al testo
            <div className="p-3">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-200 mb-2">
                RISULTATI PER "{location}"
              </div>
              {matchingCities.map(city => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className="w-full flex items-center px-3 py-3 hover:bg-gray-100 rounded-md text-left transition-colors"
                >
                  <div className="bg-blue-100 p-2 rounded-full mr-3 flex-shrink-0">
                    <Icon icon="carbon:location" className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800 block">{city.name}</span>
                    <span className="text-xs text-gray-500 block">Italia</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Nessun risultato
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Nessun risultato per "{location}"</p>
              <p className="text-xs text-gray-400">Premi Invio per cercare comunque</p>
            </div>
          )}
          
          {/* Pulsante per chiudere */}
          <div className="sticky bottom-0 p-2 border-t border-gray-200 bg-white text-center">
            <button
              type="button"
              className="text-blue-600 text-sm font-medium hover:text-blue-800 px-4 py-1 rounded-full hover:bg-blue-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar; 