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
  
  // State for sheet
  const [sheetState, setSheetState] = useState<'collapsed' | 'full'>('collapsed');
  const [height, setHeight] = useState<number | string>(COLLAPSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState<number | string>(COLLAPSED_HEIGHT);
  // Track the current available height
  const [maxHeight, setMaxHeight] = useState(0);
  
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
      className={` shadow-lg rounded-t-xl draggable-sheet bottom-0 absolute   inset-0 bg-background/60 backdrop-blur-md  border border-default-200/50  ${
        isDragging ? 'dragging' : 'transition-all duration-300 ease-out'
      } ${sheetState === 'full' ? 'sheet-full' : ''} ${inWrapper ? 'in-wrapper' : 'fixed left-0 right-0'}`}
      style={getPositionStyle()}
    >
      {/* Drag handle - smaller */}
      <div
        className="w-full h-4 flex items-center justify-center cursor-grab top-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="w-12 h-1 rounded-full bg-gray-300"></div>
      </div>

      {/* Header with count badge and expand button - more compact */}
      <div className="px-3 pb-1 flex justify-between items-center" >
        <div className="flex items-center">
          <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
            {houses.length} {houses.length === 1 ? 'property' : 'properties'}
          </span>
        </div>
        {sheetState === 'full' && (
          <div className="flex justify-center">
            <Button 
              color="primary" 
              variant="flat" 
              onClick={toggleSheetState}
              className="font-medium text-xs h-7 px-2"
              startContent={<Icon icon="lucide:map" className="text-xs" />}
            >
              Show Map
            </Button>
          </div>
        )}
        <Button
          variant="light"
          size="sm"
          onClick={toggleSheetState}
          className="text-xs px-1 h-7"
        >
          {sheetState === 'collapsed' ? 'View All' : 'Collapse'}
          <Icon icon={sheetState === 'collapsed' ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="ml-1 text-xs" />
        </Button>
      </div>

      {/* Content - only visible when expanded */}
      <div 
        className={`overflow-y-auto px-2 pb-2 ${
          sheetState === 'collapsed' 
            ? 'hidden' // Hide completely when collapsed
            : 'h-[calc(100%-55px)]' // Adjusted to the new more compact header
        }`}
      >
        {houses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32">
            <Icon icon="lucide:search-x" className="text-3xl text-gray-400 mb-2" />
            <p className="text-gray-500">No properties found in this area</p>
          </div>
        ) : (
          <>
            {houses.map((house) => (
              <Card key={house.id} className="mb-3">
                <CardBody className="p-0">
                  <div className="flex flex-row">
                    {/* Left: Smaller Image */}
                    <div className="relative w-1/3">
                      <img
                        src={house.image}
                        alt={house.address}
                        className="h-full w-full object-cover rounded-l-lg"
                      />
                      <Button
                        isIconOnly
                        className="absolute top-1 right-1"
                        variant="flat"
                        color="default"
                        size="sm"
                      >
                        <Icon icon="lucide:heart" className="text-xs" />
                      </Button>
                    </div>
                    
                    {/* Right: Content */}
                    <div className="w-2/3 p-2">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-sm truncate pr-2">{house.address}</h3>
                        <div className="flex items-center">
                          <Icon icon="lucide:star" className="text-warning text-xs" />
                          <span className="ml-1 text-xs">{house.rating}</span>
                        </div>
                      </div>
                      
                      {/* Amenities */}
                      <div className="flex gap-1 text-xs text-default-500">
                        <span>{house.beds} beds</span>
                        <span>•</span>
                        <span>{house.baths} baths</span>
                      </div>
                      
                      {/* Price and Reviews */}
                      <div className="mt-1 flex justify-between items-center">
                        <span className="font-semibold text-sm">${house.price}/month</span>
                        <span className="text-xs text-default-500">{house.reviews} reviews</span>
                      </div>
                      
                      {/* Buttons in a row */}
                      <div className="mt-2 flex gap-1 justify-between">
                        <Link 
                          to={`/property/${house.id}`} 
                          className="flex-1"
                          onClick={() => onViewDetails?.(house.id)}
                        >
                          <Button 
                            size="sm"
                            variant="solid" 
                            color="primary"
                            className="w-full text-xs h-8"
                          >
                            View details
                          </Button>
                        </Link>
                        {onFindOnMap && house.location && (
                          <Button 
                            size="sm"
                            variant="flat" 
                            color="primary"
                            className="flex-1 text-xs h-8"
                            startContent={<Icon icon="lucide:map-pin" className="text-xs" />}
                            onClick={() => {
                              onFindOnMap(house.location!);
                              onViewDetails?.(house.id);
                              setSheetState('collapsed');
                            }}
                          >
                            Find on map
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
            {/* Add padding at the bottom to ensure space below the last card */}
            <div className="h-4"></div>
          </>
        )}
      </div>
    </div>
  );
}); 