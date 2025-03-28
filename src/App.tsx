import React from 'react';
import { ScrollShadow, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { PropertyCard } from './components/property-card';
import { MapView } from './components/map-view';
import { properties } from './data/properties';
import { Property } from './types/property';
import { useVisibleProperties } from './hooks/use-visible-properties';

export default function App() {
  const [selectedProperty, setSelectedProperty] = React.useState<Property | undefined>();
  const [showMap, setShowMap] = React.useState(false);
  const [mapBounds, setMapBounds] = React.useState<[[number, number], [number, number]] | null>(null);
  const visibleProperties = useVisibleProperties(properties, mapBounds);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Mobile View Switcher */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 md:hidden">
        <Button
          color="primary"
          variant="solid"
          onPress={() => setShowMap(!showMap)}
          startContent={<Icon icon={showMap ? "lucide:list" : "lucide:map"} />}
        >
          Show {showMap ? "List" : "Map"}
        </Button>
      </div>

      {/* Desktop and Mobile Layout */}
      <div className="flex h-full w-full">
        {/* Property Listings */}
        <ScrollShadow 
          className={`
            w-full md:w-2/5 p-4 h-screen overflow-y-auto
            ${showMap ? 'hidden md:block' : 'block'}
          `}
        >
          <div className="flex flex-col gap-4">
            <p className="text-small text-default-500">
              {visibleProperties.length} properties in view
            </p>
            {visibleProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onSelect={setSelectedProperty}
              />
            ))}
          </div>
        </ScrollShadow>

        {/* Map */}
        <div 
          className={`
            relative w-full md:w-3/5 h-screen
            ${showMap ? 'block' : 'hidden md:block'}
          `}
        >
          <MapView
            
            properties={properties}
            selectedProperty={selectedProperty}
            onBoundsChange={setMapBounds}
          />
        </div>
      </div>
    </div>
  );
}
