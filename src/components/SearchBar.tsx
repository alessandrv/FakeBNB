import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (params: { location: string; checkIn: string; checkOut: string }, coordinates?: [number, number]) => void;
  isSearching?: boolean;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isSearching = false }) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!location || location.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsLoadingResults(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=5`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Error fetching search results:', error);
        setSearchResults([]);
      } finally {
        setIsLoadingResults(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ location, checkIn, checkOut });
  };

  const handleResultClick = (result: SearchResult) => {
    setLocation(result.display_name);
    setShowResults(false);
    onSearch(
      { location: result.display_name, checkIn, checkOut },
      [parseFloat(result.lon), parseFloat(result.lat)]
    );
  };

  return (
    <div className="fixed top-0 md:top-16 left-0 md:left-2 right-0 md:right-2 bg-white shadow-lg z-50">
      <form onSubmit={handleSubmit}>
        {/* Desktop Layout */}
        <div className="hidden md:flex gap-2 px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Where are you going?"
              className="w-full border p-2 rounded"
            />
            {showResults && (searchResults.length > 0 || isLoadingResults) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {isLoadingResults ? (
                  <div className="p-3 text-center text-gray-500">
                    Loading results...
                  </div>
                ) : (
                  searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {result.display_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="border p-2 rounded w-[140px]"
            placeholder="Check-in"
          />
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="border p-2 rounded w-[140px]"
            placeholder="Check-out"
          />
          <button 
            type="submit" 
            disabled={isSearching}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b">
          <div className="relative flex-1">
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search destination"
              className="w-full p-2 rounded-full border bg-gray-50 pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              🔍
            </span>
            {showResults && (searchResults.length > 0 || isLoadingResults) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {isLoadingResults ? (
                  <div className="p-3 text-center text-gray-500">
                    Loading results...
                  </div>
                ) : (
                  searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {result.display_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
          >
            {isSearching ? '...' : '🔍'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar; 