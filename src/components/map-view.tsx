import { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { Property } from '../types/property';
import 'ol/ol.css';

interface MapViewProps {
  properties: Property[];
  selectedProperty?: Property;
  onBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
}

export const MapView: React.FC<MapViewProps> = ({ 
  properties, 
  selectedProperty,
  onBoundsChange 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupOverlay = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([-74.0060, 40.7128]), // Default to New York
        zoom: 13
      })
    });

    // Create vector layer for markers
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });
    map.addLayer(vectorLayer);

    // Create popup overlay
    const popup = new Overlay({
      element: popupRef.current!,
      positioning: 'bottom-center',
      offset: [0, -10],
      autoPan: true
    });
    map.addOverlay(popup);
    popupOverlay.current = popup;

    // Handle map move events
    map.on('moveend', () => {
      if (onBoundsChange) {
        const extent = map.getView().calculateExtent(map.getSize());
        const bottomLeft = map.getCoordinateFromPixel([0, map.getSize()![1]]);
        const topRight = map.getCoordinateFromPixel([map.getSize()![0], 0]);
        onBoundsChange([[bottomLeft[1], bottomLeft[0]], [topRight[1], topRight[0]]]);
      }
    });

    mapInstance.current = map;

    return () => {
      map.setTarget(undefined);
    };
  }, [onBoundsChange]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapInstance.current) return;

    const vectorSource = mapInstance.current.getLayers().getArray()
      .find(layer => layer instanceof VectorLayer)?.getSource() as VectorSource;

    if (!vectorSource) return;

    // Clear existing features
    vectorSource.clear();

    // Add new features for each property
    properties.forEach(property => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([property.location.lng, property.location.lat])),
        property: property
      });

      // Create marker style
      const isSelected = selectedProperty?.id === property.id;
      feature.setStyle(new Style({
        image: new Icon({
          src: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          scale: isSelected ? 1.5 : 1,
          anchor: [0.5, 1]
        })
      }));

      vectorSource.addFeature(feature);
    });
  }, [properties, selectedProperty]);

  // Update view when selected property changes
  useEffect(() => {
    if (!mapInstance.current || !selectedProperty) return;

    const view = mapInstance.current.getView();
    view.animate({
      center: fromLonLat([selectedProperty.location.lng, selectedProperty.location.lat]),
      zoom: 13,
      duration: 1000
    });
  }, [selectedProperty]);

  // Handle marker clicks
  useEffect(() => {
    if (!mapInstance.current || !popupOverlay.current) return;

    const map = mapInstance.current;
    const popup = popupOverlay.current;

    const clickHandler = (evt: any) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
      
      if (feature) {
        const property = feature.get('property') as Property;
        const coordinate = evt.coordinate;
        
        if (popupRef.current) {
          popupRef.current.innerHTML = `
            <div class="text-sm">
              <h3 class="font-semibold">${property.title}</h3>
              <p class="mt-1">$${property.price} / night</p>
            </div>
          `;
        }
        
        popup.setPosition(coordinate);
      } else {
        popup.setPosition(undefined);
      }
    };

    map.on('click', clickHandler);

    return () => {
      map.un('click', clickHandler);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div ref={popupRef} className="bg-white p-2 rounded shadow-lg" />
    </div>
  );
};
