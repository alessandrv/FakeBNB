import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, Badge, Chip, ScrollShadow } from '@heroui/react';

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
  expandSheet: () => void;
}

interface DraggableBottomSheetProps {
  houses: House[];
  onViewDetails?: (houseId: string) => void;
  onFindOnMap?: (location: [number, number]) => void;
  topOffset?: number;
  inWrapper?: boolean;
  activeTab?: 'list' | 'map';
  onTabChange?: (tab: 'list' | 'map') => void;
}

// Constants for sheet heights
const COLLAPSED_HEIGHT = 50;
const SNAP_THRESHOLD = 100;
const BOTTOM_NAV_HEIGHT = 64; // Height of the bottom navigation bar

export const DraggableBottomSheet = forwardRef<DraggableBottomSheetHandle, DraggableBottomSheetProps>(({ 
  houses, 
  onViewDetails,
  onFindOnMap,
  topOffset = 64,
  inWrapper = false,
  activeTab = 'list',
  onTabChange,
}, ref) => {
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // State for sheet
  const [sheetState, setSheetState] = useState<'collapsed' | 'full'>('collapsed');
  const [height, setHeight] = useState<number | string>(COLLAPSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState<number | string>(COLLAPSED_HEIGHT);
  const [maxHeight, setMaxHeight] = useState(0);
  const [sortOption, setSortOption] = useState<'price' | 'rating'>('price');
  
  // Sort houses based on sort option
  const sortedHouses = [...houses].sort((a, b) => {
    if (sortOption === 'price') {
      return (a.price || 0) - (b.price || 0);
    } else {
      return (b.rating || 0) - (a.rating || 0);
    }
  });
  
  // Expose the sheet methods to the parent component
  useImperativeHandle(ref, () => ({
    collapseSheet: () => {
      setSheetState('collapsed');
      setHeight(COLLAPSED_HEIGHT);
      document.body.classList.remove('sheet-expanded');
    },
    expandSheet: () => {
      setSheetState('full');
      setHeight(maxHeight);
      document.body.classList.add('sheet-expanded');
    }
  }));
  
  // Define strict limits for the sheet's maximum height
  const calculateMaxHeight = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const searchBarHeight = 82;
    
    // Calculate the maximum height to go up to the searchbar, but with a margin
    return (viewportHeight - searchBarHeight - BOTTOM_NAV_HEIGHT) * 0.85; // 85% of available space
  }, []);
  
  // Recalculate max height and update sheet position if expanded
  const updateDimensions = useCallback(() => {
    const newMaxHeight = calculateMaxHeight();
    setMaxHeight(newMaxHeight);
    
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
    
    if (typeof startHeight === 'number') {
      newHeight = Math.max(COLLAPSED_HEIGHT, startHeight - deltaY);
      newHeight = Math.min(newHeight, maxHeight);
    } else {
      newHeight = Math.max(COLLAPSED_HEIGHT, maxHeight - deltaY);
      newHeight = Math.min(newHeight, maxHeight);
    }
    
    setHeight(newHeight);
    
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
    
    if (typeof height === 'number') {
      const shouldGoFull = height > COLLAPSED_HEIGHT + SNAP_THRESHOLD;
      if (shouldGoFull) {
        setSheetState('full');
        setHeight(Math.min(maxHeight, maxHeight));
        document.body.classList.add('sheet-expanded');
      } else {
        setSheetState('collapsed');
        setHeight(COLLAPSED_HEIGHT);
        document.body.classList.remove('sheet-expanded');
      }
    } else {
      setSheetState('full');
      setHeight(Math.min(maxHeight, maxHeight));
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
    handleTouchEnd();
  };

  // Update height when sheet state changes
  useEffect(() => {
    if (sheetState === 'collapsed') {
      setHeight(COLLAPSED_HEIGHT);
      document.body.classList.remove('sheet-expanded');
    } else if (sheetState === 'full') {
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

  // Listen for viewport changes
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    setTimeout(updateDimensions, 100);
    window.addEventListener('scroll', updateDimensions);
    
    const searchBar = document.querySelector('.sticky');
    if (searchBar) {
      searchBarRef.current = searchBar as HTMLDivElement;
      const resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      
      resizeObserver.observe(searchBar);
      
      return () => {
        window.removeEventListener('resize', updateDimensions);
        window.removeEventListener('scroll', updateDimensions);
        resizeObserver.disconnect();
        document.body.classList.remove('sheet-expanded');
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
      document.body.classList.remove('sheet-expanded');
    };
  }, [updateDimensions]);

  return (
    <div
      ref={sheetRef}
      className="fixed left-5 right-5 bottom-[100px] bg-background/60 rounded-t-2xl shadow-lg overflow-hidden"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        transition: isDragging ? 'none' : 'height 0.3s ease-out',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'height',
        touchAction: 'none',
        zIndex: 40
      }}
    >
      {/* Drag Handle */}
      <div
        className="absolute top-0 left-0 right-0 h-12 cursor-grab active:cursor-grabbing touch-none bg-white/80 backdrop-blur-lg border-b border-gray-200 z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex items-center justify-between px-4 h-full">
          <div className="text-sm font-medium text-gray-900">
            {houses.length} properties available
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => onTabChange?.('map')}
              className={`px-4 py-1 text-sm rounded-md transition-colors ${
                activeTab === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => onTabChange?.('list')}
              className={`px-4 py-1 text-sm rounded-md transition-colors ${
                activeTab === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollShadow className="h-full pt-12 pb-20 overflow-y-auto overscroll-contain touch-auto bg-white">
        {/* Property List */}
        <div className="px-4 py-4 space-y-6 bg-white">
          {sortedHouses.map((house) => (
            <Card key={house.id} className="w-full shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              <div className="relative">
                {/* Image */}
                <img 
                  src={house.image} 
                  alt={house.address}
                  className="w-full h-64 object-cover"
                />
                
                {/* Favorite Icon */}
                <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm hover:bg-white transition-colors">
                  <Icon icon="lucide:heart" className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Rating */}
                <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span className="font-medium">{house.rating}</span>
                </div>
                
                {/* Price */}
                <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                  <span className="font-semibold">${house.price}</span>
                  <span className="text-sm text-gray-600">/month</span>
                </div>
              </div>
              
              <CardBody className="p-4">
                {/* House Name */}
                <h3 className="font-medium text-gray-900 mb-2 text-lg">{house.address}</h3>
                
                {/* Beds and Baths */}
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <span className="flex items-center mr-4">
                    <Icon icon="lucide:bed" className="w-4 h-4 mr-1" />
                    {house.beds} beds
                  </span>
                  <span className="flex items-center">
                    <Icon icon="lucide:bath" className="w-4 h-4 mr-1" />
                    {house.baths} baths
                  </span>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => onViewDetails?.(house.id)}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                  {house.location && (
                    <button
                      onClick={() => onFindOnMap?.(house.location!)}
                      className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Icon icon="lucide:map-pin" className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}); 