import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Property } from '../types/property';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  properties: Property[];
  selectedProperty?: Property;
  onBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
}

// Component to handle map events
const MapEventHandler: React.FC<{ onBoundsChange?: MapViewProps['onBoundsChange'] }> = ({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        onBoundsChange([[sw.lat, sw.lng], [ne.lat, ne.lng]]);
      }
    },
  });
  return null;
};

// Component to handle selected property
const MapController: React.FC<{ selectedProperty?: Property }> = ({ selectedProperty }) => {
  const map = useMap();

  React.useEffect(() => {
    if (selectedProperty) {
      map.setView(
        [selectedProperty.location.lat, selectedProperty.location.lng],
        13
      );
    }
  }, [selectedProperty, map]);

  // Force map invalidation on mount to ensure proper rendering
  React.useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ 
  properties, 
  selectedProperty,
  onBoundsChange 
}) => {
  const center = selectedProperty?.location || { lat: 40.7128, lng: -74.0060 };
  const mapRef = React.useRef<L.Map>(null);

  // Force map resize when visibility changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="map-container"
        whenReady={(map) => {
          setTimeout(() => {
            map.target.invalidateSize();
          }, 100);
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEventHandler onBoundsChange={onBoundsChange} />
        <MapController selectedProperty={selectedProperty} />
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[property.location.lat, property.location.lng]}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{property.title}</h3>
                <p className="mt-1">${property.price} / night</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
