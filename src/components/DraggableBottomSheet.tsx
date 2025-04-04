import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, Badge, Chip } from '@heroui/react';

interface House {
  id: string;
  address: string;
  price?: number;
  image: string;
  beds?: number;
  baths?: number;
  rating?: number;
  reviews?: number;
  location?: [number, number];
}

// Define the ref interface
export interface DraggableBottomSheetHandle {
  collapseSheet: () => void;
}

interface DraggableBottomSheetProps {
  houses: House[];
  onViewDetails?: (houseId: string) => void;
  onFindOnMap?: (location: [number, number]) => void;
  topOffset?: number;
  inWrapper?: boolean; // New prop to indicate if sheet is in a wrapper
}

// Constants for sheet heights - changed to only show header with count and button
const COLLAPSED_HEIGHT = 70; // More compact height for collapsed state
const SNAP_THRESHOLD = 100; // Threshold for snapping decision

export const DraggableBottomSheet = forwardRef<DraggableBottomSheetHandle, DraggableBottomSheetProps>(({ 
  houses, 
  onViewDetails,
  onFindOnMap,
  topOffset = 64, // Default to 64px if not provided
  inWrapper = false // Default to false for backward compatibility
}, ref) => {
  // Get the exact searchbar height to ensure we don't go past it
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // State for sheet
  const [sheetState, setSheetState] = useState<'collapsed' | 'full'>('collapsed');
  const [height, setHeight] = useState<number | string>(COLLAPSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState<number | string>(COLLAPSED_HEIGHT);
  // Track the current available height
  const [maxHeight, setMaxHeight] = useState(0);
  // Tab state for new design
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  // View mode for list - options: 'all' or 'favorites'
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  // State for sorting
  const [sortOption, setSortOption] = useState<'price' | 'rating'>('price');
  
  // For simulating favorites - would be replaced with actual favorite tracking
  const [favorites] = useState<Set<string>>(new Set());
  
  // Get featured houses (would typically come from API with featured flag)
  const featuredHouses = houses.slice(0, Math.min(5, houses.length));
  
  // Filter houses based on view mode
  const filteredHouses = viewMode === 'all' 
    ? houses 
    : houses.filter(house => favorites.has(house.id));
  
  // Sort houses based on sort option
  const sortedHouses = [...filteredHouses].sort((a, b) => {
    if (sortOption === 'price') {
      return (a.price || 0) - (b.price || 0);
    } else {
      return (b.rating || 0) - (a.rating || 0);
    }
  });
  
  // Expose the collapseSheet method to the parent component
  useImperativeHandle(ref, () => ({
    collapseSheet: () => {
      setSheetState('collapsed');
      setHeight(COLLAPSED_HEIGHT);
      document.body.classList.remove('sheet-expanded');
    }
  }));
  
  // Define strict limits for the sheet's maximum height
  const calculateMaxHeight = useCallback(() => {
    const viewportHeight = window.innerHeight;
    
    if (inWrapper) {
      // When in wrapper, we need to account for search bar (56px) at the top
      // and bottom navbar (64px) at the bottom
      const searchBarHeight = 82; // Search bar height (56px) + top spacing (12px) + padding
      const bottomNavHeight = 96;
      
      // Reserve space for search bar at top plus bottom navbar
      return viewportHeight - searchBarHeight - bottomNavHeight;
    } else {
      // Get current search bar position
      const searchBar = document.querySelector('.fixed[class*="top-3"]') as HTMLElement; // Updated selector for floating search bar
      const searchBarHeight = searchBar ? searchBar.offsetHeight + 12 : topOffset; // Add top-3 (12px) to the height
      const bottomNavHeight = 96; // Height of bottom nav
      
      // Calculate height from bottom of search bar to top of bottom nav
      return viewportHeight - searchBarHeight - bottomNavHeight;
    }
  }, [topOffset, inWrapper]);
  
  // Recalculate max height and update sheet position if expanded
  const updateDimensions = useCallback(() => {
    const newMaxHeight = calculateMaxHeight();
    setMaxHeight(newMaxHeight);
    
    // If sheet is fully expanded, update its height to maintain full expansion
    if (sheetState === 'full') {
      setHeight(newMaxHeight);
    }
  }, [calculateMaxHeight, sheetState]);
  
  // Initialize max height
  useEffect(() => {
    setMaxHeight(calculateMaxHeight());
  }, [calculateMaxHeight]);

  // Common handler for both touch and mouse dragging
  const handleDrag = useCallback((clientY: number) => {
    if (!startY) return;
    
    const deltaY = clientY - startY;
    let newHeight: number | string;
    
    // Calculate new height based on drag
    if (typeof startHeight === 'number') {
      newHeight = Math.max(COLLAPSED_HEIGHT, startHeight - deltaY);
      // Strict enforcement of maximum height - never exceed maxHeight
      newHeight = Math.min(newHeight, maxHeight);
    } else {
      // Convert string height to numeric
      newHeight = Math.max(COLLAPSED_HEIGHT, maxHeight - deltaY);
      newHeight = Math.min(newHeight, maxHeight);
    }
    
    setHeight(newHeight);
    
    // Check if we're close to max height to update visual state
    if (typeof newHeight === 'number' && newHeight > maxHeight - 10) {
      document.body.classList.add('sheet-expanded');
    } else {
      document.body.classList.remove('sheet-expanded');
    }
  }, [startY, startHeight, maxHeight]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartHeight(height);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleDrag(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Decide whether to snap to collapsed or full
    if (typeof height === 'number') {
      const shouldGoFull = height > COLLAPSED_HEIGHT + SNAP_THRESHOLD;
      if (shouldGoFull) {
        setSheetState('full');
        // Explicitly set height to maxHeight but never exceed it
        setHeight(Math.min(maxHeight, maxHeight)); // Ensure we never exceed maxHeight
        document.body.classList.add('sheet-expanded');
      } else {
        setSheetState('collapsed');
        setHeight(COLLAPSED_HEIGHT);
        document.body.classList.remove('sheet-expanded');
      }
    } else {
      setSheetState('full');
      // Explicitly set height to maxHeight but never exceed it
      setHeight(Math.min(maxHeight, maxHeight)); // Ensure we never exceed maxHeight
      document.body.classList.add('sheet-expanded');
    }
  };

  // Mouse event handlers for desktop support
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(height);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleDrag(e.clientY);
  };

  const handleMouseUp = () => {
    handleTouchEnd(); // Reuse the touch end logic
  };

  // Update height when sheet state changes
  useEffect(() => {
    if (sheetState === 'collapsed') {
      setHeight(COLLAPSED_HEIGHT);
      document.body.classList.remove('sheet-expanded');
    } else if (sheetState === 'full') {
      // Explicitly set to maxHeight
      setHeight(maxHeight);
      document.body.classList.add('sheet-expanded');
    }
  }, [sheetState, maxHeight]);
  
  // Ensure sheet-expanded class stays in sync with actual height
  useEffect(() => {
    if (typeof height === 'number' && height > maxHeight - 10) {
      document.body.classList.add('sheet-expanded');
    } else if (sheetState === 'collapsed') {
      document.body.classList.remove('sheet-expanded');
    }
  }, [height, maxHeight, sheetState]);

  // Toggle between collapsed and full states
  const toggleSheetState = () => {
    setSheetState(sheetState === 'collapsed' ? 'full' : 'collapsed');
  };

  // Handle tab change
  const handleTabChange = (tab: 'list' | 'map') => {
    setActiveTab(tab);
    // If user clicks "Map" tab, show the collapsed view with just the tab bar
    if (tab === 'map') {
      toggleSheetState();
    }
  };

  // Listen for viewport changes (like address bar showing/hiding)
  useEffect(() => {
    // Add event listener for viewport changes
    window.addEventListener('resize', updateDimensions);
    
    // Initial calculation
    updateDimensions();
    
    // Some mobile browsers need extra help with initial height
    setTimeout(updateDimensions, 100);
    
    // Special handling for iOS Safari and mobile Chrome
    window.addEventListener('scroll', updateDimensions);
    
    const searchBar = document.querySelector('.sticky');
    if (searchBar) {
      searchBarRef.current = searchBar as HTMLDivElement;
      
      // Create a resize observer for search bar height changes
      const resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      
      resizeObserver.observe(searchBar);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', updateDimensions);
        window.removeEventListener('scroll', updateDimensions);
        resizeObserver.disconnect();
        document.body.classList.remove('sheet-expanded');
      };
    }
    
    // Cleanup if no search bar
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
      document.body.classList.remove('sheet-expanded');
    };
  }, [updateDimensions]);

  // Get positioning style based on whether sheet is in wrapper or standalone
  const getPositionStyle = () => {
    if (inWrapper) {
      // When in wrapper, position is relative to the wrapper
      return {
        position: 'relative' as const,
        bottom: 0,
        height: typeof height === 'number' ? `${height}px` : height,
        maxHeight: `${maxHeight}px`, // Enforce the calculated maxHeight
        // Add overflow handling to prevent content from going beyond maxHeight
        overflow: 'hidden'
      };
    } else {
      // Standalone mode - position fixed to viewport
      return {
        position: 'fixed' as const,
        bottom: '64px',
        left: 0,
        right: 0,
        height: typeof height === 'number' ? `${height}px` : height,
        maxHeight: `${maxHeight}px`, // Enforce the calculated maxHeight
        zIndex: 30,
        // Add overflow handling to prevent content from going beyond maxHeight
        overflow: 'hidden'
      };
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`shadow-lg rounded-t-xl draggable-sheet bottom-0 absolute inset-0 bg-background/60 backdrop-blur-md border border-default-200/50 ${
        isDragging ? 'dragging' : 'transition-all duration-300 ease-out'
      } ${sheetState === 'full' ? 'sheet-full' : ''} ${inWrapper ? 'in-wrapper' : 'fixed left-0 right-0'}`}
      style={getPositionStyle()}
    >
      {/* Drag handle - subtle line */}
      <div
        className="w-full h-6 flex items-center justify-center cursor-grab top-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300"></div>
      </div>

      {/* Header with search stats and view toggle */}
      <div className="px-4 flex flex-col">
        <div className="flex items-center justify-between">
          {/* Property count */}
          <div className="flex items-center">
            <span className="font-medium text-sm text-default-700">
              <span className="font-semibold text-gradient-first">{houses.length}</span> properties available
            </span>
          </div>
          
          {/* Map/List Toggle */}
          <div className="flex items-center space-x-1 bg-default-100 rounded-full p-0.5">
            <button
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === 'list' 
                  ? 'bg-white shadow-sm text-default-800' 
                  : 'text-default-500 hover:text-default-700'
              }`}
              onClick={() => handleTabChange('list')}
            >
              List
            </button>
            <button
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === 'map' 
                  ? 'bg-white shadow-sm text-default-800' 
                  : 'text-default-500 hover:text-default-700'
              }`}
              onClick={() => handleTabChange('map')}
            >
              Map
            </button>
          </div>
          
          {/* Expand/collapse button */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full bg-default-100 text-default-600 hover:bg-default-200"
            onClick={toggleSheetState}
          >
            <Icon 
              icon={sheetState === 'collapsed' ? 'lucide:chevron-up' : 'lucide:chevron-down'} 
              className="text-sm" 
            />
          </button>
        </div>
        
        {/* Secondary toolbar - only visible when expanded */}
        {sheetState === 'full' && (
          <div className="flex items-center justify-between pt-3 pb-2 mt-1 border-b border-default-200/50">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  viewMode === 'all' 
                    ? 'bg-gradient-first-50 text-gradient-first border-gradient-first' 
                    : 'bg-white text-default-600 border-default-200 hover:border-default-300'
                }`}
                onClick={() => setViewMode('all')}
              >
                All
              </button>
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  viewMode === 'favorites' 
                    ? 'bg-gradient-first-50 text-gradient-first border-gradient-first' 
                    : 'bg-white text-default-600 border-default-200 hover:border-default-300'
                }`}
                onClick={() => setViewMode('favorites')}
              >
                Favorites
              </button>
            </div>
            
            <div className="flex items-center">
              <span className="text-xs text-default-500 mr-2">Sort:</span>
              <select 
                className="text-xs bg-white border border-default-200 rounded-md px-2 py-1"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as 'price' | 'rating')}
              >
                <option value="price">Price</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content - only visible when expanded */}
      <div 
        className={`overflow-y-auto pb-4 ${
          sheetState === 'collapsed' 
            ? 'hidden' // Hide completely when collapsed
            : 'h-[calc(100%-80px)]' // Adjusted height for new header
        }`}
      >
        {houses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 mt-8">
            <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-3">
              <Icon icon="lucide:search-x" className="text-2xl text-default-400" />
            </div>
            <p className="text-default-800 font-medium">No properties found in this area</p>
            <p className="text-default-500 text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            {/* Featured Properties Carousel */}
            {viewMode === 'all' && featuredHouses.length > 0 && (
              <div className="px-4 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-default-800 font-medium text-sm">Featured Properties</h3>
                  <span className="text-xs text-gradient-first">View all</span>
                </div>
                
                <div 
                  ref={carouselRef}
                  className="flex overflow-x-auto pb-2 -mx-1 hide-scrollbar"
                >
                  {featuredHouses.map((house) => (
                    <div key={`featured-${house.id}`} className="w-64 flex-shrink-0 px-1">
                      <Card className="border border-default-200 overflow-hidden hover:border-indigo-300 transition-all">
                        <CardBody className="p-0">
                          {/* Image with badges */}
                          <div className="relative aspect-video w-full">
                            <img 
                              src={house.image} 
                              alt={house.address} 
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gradient-first/70 via-transparent to-transparent"></div>
                            
                            {/* Badges positioned at corners */}
                            <div className="absolute top-2 left-2">
                              {house.rating && (
                                <Chip
                                  size="sm"
                                  className="bg-amber-500/90 backdrop-blur-sm text-white border-none text-xs"
                                  startContent={<Icon icon="lucide:star" className="text-white text-xs" />}
                                >
                                  {house.rating}
                                </Chip>
                              )}
                            </div>
                            
                            <div className="absolute top-2 right-2">
                              <Button
                                isIconOnly
                                className="bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
                                variant="flat"
                                radius="full"
                                size="sm"
                              >
                                <Icon icon="lucide:heart" className="text-red-500" />
                              </Button>
                            </div>
                            
                            {/* Property info positioned at bottom */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex justify-between items-end">
                                <div>
                                  {house.price && (
                                    <div className="text-white font-semibold text-sm mb-1">${house.price}/mo</div>
                                  )}
                                  <div className="text-white/90 text-xs line-clamp-1">{house.address}</div>
                                </div>
                                <Button 
                                  size="sm"
                                  variant="solid"
                                  className="h-7 min-w-0 px-2 bg-gradient-to-tr from-gradient-first to-gradient-second text-white"
                                  onClick={() => onViewDetails?.(house.id)}
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Regular Property List */}
            <div className="px-4 mt-4">
              {viewMode === 'all' && featuredHouses.length > 0 && (
                <h3 className="text-default-800 font-medium text-sm mb-2">All Properties</h3>
              )}
              
              <div className="grid grid-cols-1 gap-4">
                {sortedHouses.map((house) => (
                  <Card 
                    key={house.id} 
                    className="border border-default-200 overflow-hidden hover:border-indigo-300 transition-all"
                  >
                    <CardBody className="p-0">
                      <div className="flex flex-col">
                        {/* Large Image */}
                        <div className="relative w-full aspect-[16/9]">
                          <img 
                            src={house.image} 
                            alt={house.address} 
                            className="h-full w-full object-cover"
                          />
                          
                          {/* Overlay gradient for better text visibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                          
                          {/* Rating badge */}
                          {house.rating && (
                            <div className="absolute top-3 left-3">
                              <Chip
                                size="sm"
                                className="bg-amber-500/90 backdrop-blur-sm text-white border-none"
                                startContent={<Icon icon="lucide:star" className="text-white text-xs" />}
                              >
                                {house.rating}
                              </Chip>
                            </div>
                          )}
                          
                          {/* Favorite button */}
                          <div className="absolute top-3 right-3">
                            <Button
                              isIconOnly
                              className="bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
                              variant="flat"
                              radius="full"
                              size="sm"
                            >
                              <Icon icon="lucide:heart" className="text-red-500" />
                            </Button>
                          </div>
                          
                          {/* Price overlay */}
                          {house.price && (
                            <div className="absolute bottom-3 left-3">
                              <Chip
                                size="md"
                                className="bg-gradient-to-tr from-gradient-first to-gradient-second backdrop-blur-sm text-white font-medium border-none"
                              >
                                ${house.price}/mo
                              </Chip>
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-medium text-default-800 text-base mb-2">{house.address}</h3>
                          
                          {/* Features */}
                          <div className="flex items-center gap-x-6 text-sm text-default-600 mb-3">
                            {house.beds && (
                              <span className="flex items-center gap-1.5">
                                <Icon icon="lucide:bed" className="text-indigo-500" />
                                <span>{house.beds} beds</span>
                              </span>
                            )}
                            {house.baths && (
                              <span className="flex items-center gap-1.5">
                                <Icon icon="lucide:bath" className="text-indigo-500" />
                                <span>{house.baths} baths</span>
                              </span>
                            )}
                            {house.reviews && (
                              <span className="flex items-center gap-1.5 ml-auto">
                                <Icon icon="lucide:message-circle" className="text-default-400" />
                                <span>{house.reviews} reviews</span>
                              </span>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-3">
                            <Button 
                              size="md"
                              variant="solid"
                              color="primary"
                              className="flex-1 bg-gradient-to-tr from-gradient-first to-gradient-second"
                              startContent={<Icon icon="lucide:info" />}
                              onClick={() => onViewDetails?.(house.id)}
                            >
                              View Details
                            </Button>
                            {onFindOnMap && house.location && (
                              <Button 
                                size="md"
                                variant="flat"
                                color="primary"
                                className="flex-1"
                                startContent={<Icon icon="lucide:map-pin" />}
                                onClick={() => onFindOnMap(house.location!)}
                              >
                                Show on Map
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* Add padding at the bottom to ensure space below the last row */}
            <div className="h-6"></div>
          </>
        )}
      </div>
    </div>
  );
}); 