import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

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
  const [showMobileSearchInput, setShowMobileSearchInput] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch({ location, checkIn, checkOut });
    setShowMobileSearchInput(false);
    setShowDatePicker(false);
  };

  const handleResultClick = (result: SearchResult) => {
    setLocation(result.display_name);
    setShowResults(false);
    setShowMobileSearchInput(false);
    onSearch(
      { location: result.display_name, checkIn, checkOut },
      [parseFloat(result.lon), parseFloat(result.lat)]
    );
  };

  const handleMobileSearchClick = () => {
    setShowMobileSearchInput(true);
    setTimeout(() => locationInputRef.current?.focus(), 0);
  };

  const handleDateSelect = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDatePicker(false);
  };

  return (
    <div className="w-full z-50 mb-4">
      {/* Desktop Layout */}
      <form onSubmit={handleSubmit} className="hidden md:block max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 bg-white rounded-full border p-1 shadow-sm">
          <div className="relative flex-1">
            <input
              ref={locationInputRef}
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Where are you going?"
              className="w-full py-1 px-3 bg-transparent outline-none text-sm"
            />
            {showResults && (searchResults.length > 0 || isLoadingResults) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                {isLoadingResults ? (
                  <div className="p-3 text-center text-gray-500">Loading...</div>
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
          <div className="border-l h-5"></div>
          <div className="flex items-center">
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="py-1 px-2 bg-transparent outline-none text-sm text-gray-500 placeholder-gray-400"
              title="Check-in date"
              placeholder="Check-in"
            />
            <span className="text-gray-300 mx-1">-</span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="py-1 px-2 bg-transparent outline-none text-sm text-gray-500 placeholder-gray-400"
              title="Check-out date"
              placeholder="Check-out"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors flex-shrink-0 flex items-center justify-center"
          >
            <Icon
              icon={isSearching ? "carbon:circle-dash" : "carbon:search"}
              className="w-4 h-4"
            />
          </button>
        </div>
      </form>

      {/* Mobile Layout */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-50 p-2 shadow-md">
        {/* Location Input (conditionally shown) */}
        {showMobileSearchInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start p-4">
            <div className="bg-white rounded-lg shadow-xl w-full p-4">
              <div className="relative">
                <input
                  ref={locationInputRef}
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowResults(true);
                  }}
                  placeholder="Where are you going?"
                  className="w-full p-3 border rounded-md pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMobileSearchInput(false)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Icon icon="carbon:close" className="w-5 h-5" />
                </button>
              </div>
              {showResults && (searchResults.length > 0 || isLoadingResults) && (
                <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                  {isLoadingResults ? (
                    <div className="p-3 text-center text-gray-500">Loading...</div>
                  ) : (
                    searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b last:border-b-0"
                      >
                        {result.display_name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date Picker (conditionally shown) */}
        {showDatePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleDateSelect} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4 text-center">Select Dates</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="checkin-mobile" className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                  <input
                    id="checkin-mobile"
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="checkout-mobile" className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                  <input
                    id="checkout-mobile"
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Confirm Dates
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mobile Icon Bar */}
        {!showMobileSearchInput && !showDatePicker && (
          <div className="flex justify-around items-center bg-white rounded-full border shadow-sm p-2">
            <button
              type="button"
              onClick={handleMobileSearchClick}
              className="flex flex-col items-center text-gray-600 hover:text-blue-500"
            >
              <Icon icon="carbon:search-locate" className="w-6 h-6 mb-1" />
              <span className="text-xs">Where</span>
            </button>
            <div className="border-l h-8"></div>
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="flex flex-col items-center text-gray-600 hover:text-blue-500"
            >
              <Icon icon="carbon:calendar" className="w-6 h-6 mb-1" />
              <span className="text-xs">When</span>
            </button>
            <div className="border-l h-8"></div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSearching || !location || !checkIn || !checkOut}
              className="flex flex-col items-center text-blue-500 disabled:text-gray-400"
            >
              <Icon icon={isSearching ? "carbon:circle-dash" : "carbon:search"} className="w-6 h-6 mb-1" />
              <span className="text-xs">Search</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar; 