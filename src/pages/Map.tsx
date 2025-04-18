import React, { useState, useRef, FormEvent, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, CardBody, CardFooter, Input, Divider, Popover, PopoverTrigger, PopoverContent, Autocomplete, AutocompleteItem, Spinner, Badge, Avatar, Tooltip, Progress, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Map as OlMap, View } from 'ol';
import { MapBrowserEvent } from 'ol';
import type { ObjectEvent } from 'ol/Object';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon as OlIcon } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { DraggableBottomSheet, DraggableBottomSheetHandle } from '../components/DraggableBottomSheet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import SearchBar from '../components/SearchBar';
import { properties } from '../data/properties';
import 'ol/ol.css';
import { createRoot } from 'react-dom/client';
import MapEvent from 'ol/MapEvent';
import { DragPan } from 'ol/interaction';
import { Text, Fill, Stroke } from 'ol/style';

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
const POI_MIN_ZOOM_LEVEL = 13;
const MIN_FETCH_INTERVAL = 10000; // 10 seconds between fetches
const POI_CACHE_DURATION = 300000; // 5 minutes cache duration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

interface POI {
  id: number;
  type: string;
  name: string;
  coordinates: [number, number];
}

interface House {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  location: [number, number];
  description: string;
  hasBooking: boolean;
}

interface POICacheEntry {
  pois: POI[];
  timestamp: number;
}

interface RequestQueueItem {
  bbox: string;
  type: string;
  resolve: (value: POI[]) => void;
  reject: (reason?: any) => void;
  retries: number;
}

const PropertyCard: React.FC<{
  house: House;
  isSelected: boolean;
  onLocate: () => void;
}> = ({ house, isSelected, onLocate }) => {
  const navigate = useNavigate();
  
  return (
    <Card className={`mb-4 hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="relative pb-[66.666667%] rounded-t-lg overflow-hidden">
        <img 
          src={house.image} 
          alt={house.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {house.hasBooking && (
          <Badge color="success" className="absolute top-3 left-3" aria-label="Property has a booking">
            Booked
          </Badge>
        )}
      </div>
      <CardBody className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 flex-1">{house.title}</h3>
          <Badge color="primary" variant="solid" size="lg" className="ml-2 flex-shrink-0" aria-label={`Price: $${house.price}`}>
            ${house.price}
          </Badge>
        </div>
        <p className="text-gray-600 text-sm line-clamp-2 mb-2">{house.description}</p>
        <div className="flex items-center text-sm text-gray-600">
          <Tooltip content={`${house.rating} out of 5 stars`}>
            <span className="flex items-center">
              <Progress value={house.rating * 20} color="warning" className="w-20 mr-2" aria-label={`Rating: ${house.rating} out of 5 stars`} />
              {house.rating} <span className="text-yellow-400 ml-1">★</span>
            </span>
          </Tooltip>
          <span className="mx-1">·</span>
          <span>({house.reviews} reviews)</span>
        </div>
      </CardBody>
      <CardFooter className="p-3 pt-0">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="bordered" 
            color="default" 
            onPress={onLocate}
            className="flex-1"
            aria-label={`Locate ${house.title} on map`}
          >
            <Icon icon="carbon:location" className="mr-1" />
            Find on Map
          </Button>
          <Button 
            size="sm" 
            color="primary"
            onPress={() => navigate(`/property/${house.id}`)}
            className="flex-1"
            aria-label={`View details of ${house.title}`}
          >
            <Icon icon="carbon:view" className="mr-1" />
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const PropertyPopup: React.FC<{ house: House }> = ({ house }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-[300px]" onClick={(e) => e.stopPropagation()}>
      <div className="relative pb-[66.666667%] rounded-t-lg overflow-hidden">
        <img 
          src={house.image} 
          alt={house.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <CardBody className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 flex-1">{house.title}</h3>
          <Badge color="primary" variant="solid" size="lg" className="ml-2 flex-shrink-0" aria-label={`Price: $${house.price}`}>
            ${house.price}
          </Badge>
        </div>
        <p className="text-gray-600 text-sm mb-2">{house.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <span className="flex items-center">
              {house.rating} <span className="text-yellow-400 ml-1">★</span>
            </span>
            <span className="mx-1">·</span>
            <span>{house.reviews} reviews</span>
          </div>
          {house.hasBooking ? 
            <Chip color="primary" size="sm" aria-label="Property has booking">Has Booking</Chip> : 
            <Chip color="success" size="sm" aria-label="Property is available">Available</Chip>
          }
        </div>
      </CardBody>
      <CardFooter className="p-3 pt-0">
        <Button
          color="primary"
          fullWidth
          onPress={() => navigate(`/property/${house.id}`)}
          aria-label={`View details of ${house.title}`}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

const Popup: React.FC<{ house: House | null; onClose: () => void }> = ({ house, onClose }) => {
  const navigate = useNavigate();
  
  if (!house) return null;
  
  return (
    <Card className="max-w-[400px] shadow-lg">
      <CardBody className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{house.title}</h3>
              <Badge color="primary" variant="solid" size="lg" className="ml-2" aria-label={`Price: $${house.price}`}>
                ${house.price}
              </Badge>
            </div>
            <div className="flex items-center mt-2 mb-3">
              <Progress value={house.rating * 20} color="warning" className="w-20 mr-2" aria-label={`Rating: ${house.rating} out of 5 stars`} />
              <span>{house.rating}/5 ({house.reviews} reviews)</span>
            </div>
            <Button
              color="primary"
              fullWidth
              onPress={() => navigate(`/property/${house.id}`)}
              size="sm"
              aria-label={`View details of ${house.title}`}
            >
              View Details
            </Button>
          </div>
          <div className="w-32 h-32 flex-shrink-0">
            <Avatar 
              src={house.image} 
              alt={house.title}
              className="w-full h-full rounded-lg object-cover"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

const Map: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const isMountedRef = useRef(true);
  const [map, setMap] = useState<OlMap | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [popupOverlay, setPopupOverlay] = useState<Overlay | null>(null);
  const [visibleHouses, setVisibleHouses] = useState<House[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [houses] = useState<House[]>(() => {
    const bookedPropertyIds = ['1', '3', '7', '9', '11'];
    return properties.map(property => ({
      id: property.id,
      title: property.title,
      price: property.price,
      rating: property.rating,
      reviews: property.reviews,
      image: property.image,
      location: [property.location.lng, property.location.lat],
      description: property.description,
      hasBooking: bookedPropertyIds.includes(property.id)
    }));
  });
  const navigate = useNavigate();
  const [searchMarker, setSearchMarker] = useState<Feature | null>(null);
  const searchVectorRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const bottomSheetRef = useRef<DraggableBottomSheetHandle>(null);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);

  // Initialize cache and queue inside component
  const poiCache = useRef<Record<string, POICacheEntry>>({});
  const requestQueue = useRef<RequestQueueItem[]>([]);
  const isProcessingQueue = useRef(false);
  const lastRequestTime = useRef(0);

  // Function to process the request queue
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;

    if (timeSinceLastRequest < MIN_FETCH_INTERVAL) {
      setTimeout(processQueue, MIN_FETCH_INTERVAL - timeSinceLastRequest);
      isProcessingQueue.current = false;
      return;
    }

    const item = requestQueue.current.shift();
    if (!item) {
      isProcessingQueue.current = false;
      return;
    }

    try {
      const pois = await fetchPOIsWithRetry(item.bbox, item.type, item.retries);
      item.resolve(pois);
    } catch (error) {
      item.reject(error);
    }

    lastRequestTime.current = Date.now();
    isProcessingQueue.current = false;
    processQueue();
  }, []);

  // Function to fetch POIs with retry logic
  const fetchPOIsWithRetry = useCallback(async (bbox: string, type: string, retries: number): Promise<POI[]> => {
    const cacheKey = `${bbox}-${type}`;
    const cached = poiCache.current[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < POI_CACHE_DURATION) {
      return cached.pois;
    }

    try {
      const pois = await fetchPOIs(bbox, type);
      poiCache.current[cacheKey] = {
        pois,
        timestamp: Date.now()
      };
      return pois;
    } catch (error) {
      if (retries > 0 && (error as Error).message.includes('429')) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchPOIsWithRetry(bbox, type, retries - 1);
      }
      throw error;
    }
  }, []);

  // Function to fetch POIs from OpenStreetMap
  const fetchPOIs = useCallback(async (bbox: string, type: string): Promise<POI[]> => {
    const overpassQuery = `
      [out:json][timeout:25];
      area["name:en"="Italy"]->.searchArea;
      area["name"="Foligno"]->.foligno;
      (
        node["amenity"="${type}"](area.searchArea)(area.foligno);
        way["amenity"="${type}"](area.searchArea)(area.foligno);
        relation["amenity"="${type}"](area.searchArea)(area.foligno);
      );
      out body;
      >;
      out skel qt;
    `;

    console.log('Fetching POIs with query:', overpassQuery);

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received POI data:', data);

      if (!data.elements) {
        console.log('No elements found in response');
        return [];
      }

      const pois = data.elements.map((element: any) => {
        const coordinates = element.lat && element.lon 
          ? [element.lon, element.lat]
          : element.center 
            ? [element.center.lon, element.center.lat]
            : null;

        if (!coordinates) {
          return null;
        }

        const poi = {
          id: element.id,
          type: element.tags?.amenity || type,
          name: element.tags?.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          coordinates
        };
        console.log('Created POI:', poi);
        return poi;
      }).filter((poi: POI | null): poi is POI => poi !== null);

      console.log(`Processed ${pois.length} POIs`);
      return pois;
    } catch (error) {
      console.error(`Error fetching ${type} POIs:`, error);
      return [];
    }
  }, []);

  // Function to update visible houses based on map bounds
  const updateVisibleHouses = useCallback(() => {
    if (!map) return;

    const extent = map.getView().calculateExtent(map.getSize());
    const visible = houses.filter(house => {
      const [lng, lat] = house.location;
      const coordinate = fromLonLat([lng, lat]);
      return coordinate[0] >= extent[0] && 
             coordinate[0] <= extent[2] && 
             coordinate[1] >= extent[1] && 
             coordinate[1] <= extent[3];
    });
    setVisibleHouses(visible);
  }, [map, houses]);

  // Initialize map and popup
  useEffect(() => {
    if (!mapRef.current || !popupRef.current) return;

    const mapContainer = mapRef.current;
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';

    const newMap = new OlMap({
      target: mapContainer,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          })
        })
      ],
      view: new View({
        center: fromLonLat([12.4964, 41.9028]),
        zoom: 6
      }),
      pixelRatio: 1
    });

    // Create and configure popup overlay
    const popup = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -10],
      stopEvent: true,
      className: 'ol-popup',
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });

    newMap.addOverlay(popup);
    setPopupOverlay(popup);

    // Add CSS for popup
    const style = document.createElement('style');
    style.textContent = `
      .ol-popup {
        z-index: 1000;
        position: absolute;
        background: transparent;
        box-shadow: none;
        padding: 0;
        border: none;
        min-width: 320px;
        pointer-events: auto;
        transform: translate(-50%, 0);
      }
      .ol-popup:after, .ol-popup:before {
        display: none;
      }
      .map-marker:hover {
        cursor: pointer;
      }
    `;
    // Keep a reference to the head to ensure we're removing from the correct parent
    const head = document.head;
    head.appendChild(style);

    // Handle click events
    const clickHandler = (evt: any) => {
      const feature = newMap.forEachFeatureAtPixel(evt.pixel, (feature) => feature, {
        hitTolerance: 5,
        layerFilter: (layer) => layer instanceof VectorLayer
      });
      
      if (feature) {
        evt.preventDefault();
        evt.stopPropagation();
        
        const house = feature.get('house');
        if (!house) return;
        
        // Position the popup at the clicked feature's coordinates
        const geometry = feature.getGeometry();
        if (geometry && geometry instanceof Point) {
          const coordinates = geometry.getCoordinates();
          popup.setPosition(coordinates);
        }
        
        setSelectedHouse(house);
      } else {
        setSelectedHouse(null);
        popup.setPosition(undefined);
      }
    };

    // Add pointer cursor for house icons
    newMap.on('pointermove', function(e) {
      const pixel = newMap.getEventPixel(e.originalEvent);
      const hit = newMap.hasFeatureAtPixel(pixel, {
        layerFilter: (layer) => layer instanceof VectorLayer
      });
      
      mapContainer.style.cursor = hit ? 'pointer' : '';
    });

    newMap.on('singleclick', clickHandler);

    // Set willReadFrequently attribute on canvas to improve getImageData performance
    setTimeout(() => {
      const canvas = mapContainer.querySelector('canvas');
      if (canvas) {
        (canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: true });
        console.log('Set willReadFrequently on map canvas for better performance');
      }
    }, 100);

    setMap(newMap);

    // Cleanup function
    return () => {
      // Properly clean up event listeners first
      newMap.un('singleclick', clickHandler);
      
      // Set target to undefined to destroy the map
      newMap.setTarget(undefined);
      
      // Safely remove the style element
      if (style.parentNode === head) {
        head.removeChild(style);
      }
    };
  }, []);

  // Map event handler
  const handleMapEvent = useCallback((event: MapBrowserEvent<PointerEvent> | ObjectEvent) => {
    updateVisibleHouses();
  }, [updateVisibleHouses]);

  // Separate effect for map event listeners and initial update
  useEffect(() => {
    if (!map) return;

    // Use the correct event names from OpenLayers
    map.on(['change:view'], handleMapEvent as any);
    map.on(['moveend'], handleMapEvent as any);

    // Initial update
    updateVisibleHouses();

    return () => {
      map.un(['change:view'], handleMapEvent as any);
      map.un(['moveend'], handleMapEvent as any);
    };
  }, [map, handleMapEvent, updateVisibleHouses]);

  // Update the updatePOIs function
  const updatePOIs = useCallback(() => {
    if (!map) return;

    const view = map.getView();
    const zoom = view.getZoom();
    
    if (!zoom || zoom < POI_MIN_ZOOM_LEVEL) {
      setPois([]);
      return;
    }

    const fetchAllPOIs = async () => {
      try {
        const types = ['hospital', 'police', 'school', 'university'];
        const promises = types.map(type => 
          new Promise<POI[]>((resolve, reject) => {
            requestQueue.current.push({
              bbox: '', // Empty bbox to fetch all of Italy
              type,
              resolve,
              reject,
              retries: MAX_RETRIES
            });
          })
        );
        
        const allPOIs = await Promise.all(promises);
        const flattenedPOIs = allPOIs.flat();
        setPois(flattenedPOIs);
        processQueue();
      } catch (error) {
        console.error('Error fetching POIs:', error);
        setPois([]);
      }
    };

    fetchAllPOIs();
  }, [map, processQueue]);

  // Update the useEffect for POI updates
  useEffect(() => {
    if (!map) return;

    let updateTimeout: NodeJS.Timeout;

    const handleMoveEnd = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updatePOIs, 1000); // Debounce for 1 second
    };

    const handleZoomEnd = () => {
      const zoom = map.getView().getZoom();
      if (!zoom || zoom < POI_MIN_ZOOM_LEVEL) {
        setPois([]);
      } else {
        handleMoveEnd();
      }
    };

    map.on('moveend' as any, handleMoveEnd);
    map.on('zoomend' as any, handleZoomEnd);

    // Initial update
    updatePOIs();

    return () => {
      clearTimeout(updateTimeout);
      map.un('moveend' as any, handleMoveEnd);
      map.un('zoomend' as any, handleZoomEnd);
    };
  }, [map, updatePOIs]);

  // Update the useEffect for POI markers
  useEffect(() => {
    if (!map) return;

    // Create POI vector layer with higher z-index
    const poiVectorSource = new VectorSource();
    const poiVectorLayer = new VectorLayer({
      source: poiVectorSource,
      zIndex: 2000
    });
    map.addLayer(poiVectorLayer);

    // Update POI markers
    poiVectorSource.clear();
    pois.forEach(poi => {
      const feature = new Feature({
        geometry: new Point(fromLonLat(poi.coordinates)),
        poi
      });

      // Set different colors for different POI types
      let color = '#000000';
      switch (poi.type) {
        case 'hospital':
          color = '#FF0000';
          break;
        case 'police':
          color = '#0000FF';
          break;
        case 'school':
          color = '#00FF00';
          break;
        case 'university':
          color = '#800080';
          break;
      }

      const style = new Style({
        text: new Text({
          text: poi.name,
          font: '12px Arial',
          fill: new Fill({ color: color }),
          stroke: new Stroke({
            color: 'white',
            width: 3
          }),
          offsetY: -15
        })
      });

      feature.setStyle(style);
      poiVectorSource.addFeature(feature);
    });

    return () => {
      map.removeLayer(poiVectorLayer);
    };
  }, [map, pois]);

  // Add this after map initialization in the first useEffect
  useEffect(() => {
    if (!map) return;

    // Create search marker layer
    const searchVectorSource = new VectorSource();
    const searchVectorLayer = new VectorLayer({
      source: searchVectorSource,
      zIndex: 3000 // Higher than POIs and house markers
    });
    map.addLayer(searchVectorLayer);
    searchVectorRef.current = searchVectorLayer;

    return () => {
      if (searchVectorRef.current) {
        map.removeLayer(searchVectorRef.current);
      }
    };
  }, [map]);

  // Update house markers
  useEffect(() => {
    if (!map) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 1000,
      className: 'map-marker' // Add class for CSS targeting
    });
    map.addLayer(vectorLayer);

    houses.forEach(house => {
      const feature = new Feature({
        geometry: new Point(fromLonLat(house.location)),
        house
      });

      const isSelected = selectedProperty === house.id;
      // Use a consistent light blue for the circle, white for the house
      const circleFill = '%23A0D2DB'; // Light blue color
      const houseFill = '%23FFFFFF'; // White color
      const borderColor = '%23FFFFFF'; // White border color
      
      feature.setStyle(new Style({
        image: new OlIcon({
          src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="11" fill="${circleFill}" stroke="${borderColor}" stroke-width="1" />
            <path d="M12 5c-.4 0-.8.2-1 .5l-5 5.5c-.3.3-.3.7 0 1 .3.3.7.3 1 0L12 6.8l5 5.2c.3.3.7.3 1 0 .3-.3.3-.7 0-1l-5-5.5c-.2-.3-.6-.5-1-.5zm-3 7c-.6 0-1 .4-1 1v5c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-5c0-.6-.4-1-1-1H9zm.5 1h5v4.5h-5V13zm1 1v1.5h1.5V14h-1.5zm2.5 0v1.5H14V14h-1z" fill="${houseFill}"/>
          </svg>`,
          scale: 1.5,
          anchor: [0.5, 0.5]
        })
      }));

      vectorSource.addFeature(feature);
    });

    return () => {
      map.removeLayer(vectorLayer);
    };
  }, [map, houses, selectedProperty]);

  const handleSearch = async (params: { location: string; checkIn: string; checkOut: string }, coordinates?: [number, number]) => {
    if (!map) return;
    setIsSearching(true);
    
    try {
      let searchCoords;
      if (coordinates) {
        // Use provided coordinates
        searchCoords = fromLonLat(coordinates);
      } else {
        // Fetch coordinates from Nominatim
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(params.location)}`);
        const data: NominatimResult[] = await response.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          searchCoords = fromLonLat([parseFloat(lon), parseFloat(lat)]);
        }
      }

      if (searchCoords && searchVectorRef.current) {
        // Remove previous search marker
        if (searchMarker) {
          searchVectorRef.current.getSource()?.removeFeature(searchMarker);
        }

        // Create new search marker
        const newSearchMarker = new Feature({
          geometry: new Point(searchCoords)
        });

        // Style for the search marker
        newSearchMarker.setStyle(new Style({
          image: new OlIcon({
            src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" 
                fill="%23FF0000" stroke="%23FFFFFF" stroke-width="1"/>
            </svg>`,
            scale: 2,
            anchor: [0.5, 1], // Anchor at bottom center of the pin
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
          })
        }));

        // Add the marker and store it
        searchVectorRef.current.getSource()?.addFeature(newSearchMarker);
        setSearchMarker(newSearchMarker);

        // Animate to the location
        map.getView().animate({
          center: searchCoords,
          zoom: 13,
          duration: 1000
        });
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewModeChange = (mode: 'list' | 'map') => {
    setViewMode(mode);
    if (mode === 'list') {
      // When switching to list view, expand the bottom sheet
      bottomSheetRef.current?.expandSheet();
    } else {
      // When switching to map view, collapse the bottom sheet
      bottomSheetRef.current?.collapseSheet();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header - Hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="flex-1 relative">
        {/* Search Bar - Full width on mobile, adjusted for desktop */}
        <div className="md:absolute md:left-[calc(384px+16px)] md:right-4 md:top-4 md:z-50">
          <SearchBar onSearch={handleSearch} isSearching={isSearching} />
        </div>
        <div className="fixed inset-0 md:top-[64px]">
          {/* Map Container - Full Screen */}
          <div className="absolute inset-0">
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />
            <div ref={popupRef} className="absolute z-30" />
          </div>

          {/* Desktop: Side List */}
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-96 bg-white shadow-lg overflow-y-auto z-20">
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4">
                Properties in View ({visibleHouses.length})
              </h2>
              <div className="space-y-4 pt-2">
                {visibleHouses.map(house => (
                  <PropertyCard
                    key={house.id}
                    house={house}
                    isSelected={selectedProperty === house.id}
                    onLocate={() => {
                      setSelectedProperty(house.id);
                      if (map) {
                        const view = map.getView();
                        view.animate({
                          center: fromLonLat(house.location),
                          zoom: 14,
                          duration: 1000
                        });
                      }
                    }}
                  />
                ))}
                {visibleHouses.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No properties in current view. Try zooming out or moving the map.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Search Bar Positioning */}
          <div className="md:hidden absolute top-4 left-4 right-4 z-50">
            <SearchBar onSearch={handleSearch} isSearching={isSearching} />
          </div>

          {/* Mobile: Draggable Bottom Sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
            <div className="touch-none">
              <DraggableBottomSheet
                ref={bottomSheetRef}
                houses={visibleHouses.map(house => ({
                  id: house.id,
                  address: house.title,
                  price: house.price,
                  image: house.image,
                  rating: house.rating,
                  reviews: house.reviews,
                  location: house.location
                }))}
                onViewDetails={(houseId) => {
                  navigate(`/properties/${houseId}`);
                }}
                onFindOnMap={(location) => {
                  if (map) {
                    const view = map.getView();
                    view.animate({
                      center: fromLonLat(location),
                      zoom: 14,
                      duration: 1000
                    });
                  }
                }}
                topOffset={88}
                inWrapper={true}
                activeTab={viewMode}
                onTabChange={handleViewModeChange}
              />
            </div>
          </div>
        </div>
        {selectedHouse && (
          <div 
            ref={popupRef} 
            className="absolute z-10"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: 'translate(20px, 20px)' // Fixed position offset
            }}
          >
            <Popup 
              house={selectedHouse} 
              onClose={() => {
                setSelectedHouse(null);
                if (popupOverlay) {
                  popupOverlay.setPosition(undefined);
                }
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;