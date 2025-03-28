import React from 'react';
import { Button, Card, CardBody, CardFooter } from '@heroui/react';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface House {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  images: string[];
  location: [number, number];
  address: string;
  beds: number;
  baths: number;
}

const sampleHouses: House[] = [
  {
    id: '1',
    title: 'Modern Downtown Apartment',
    price: 150,
    rating: 4.8,
    reviews: 124,
    images: ['https://picsum.photos/seed/house1/400/300'],
    location: [40.7128, -74.0060],
    address: 'Downtown Manhattan, NY',
    beds: 2,
    baths: 1
  },
  {
    id: '2',
    title: 'Luxury Penthouse with View',
    price: 300,
    rating: 4.9,
    reviews: 85,
    images: ['https://picsum.photos/seed/house2/400/300'],
    location: [40.7589, -73.9850],
    address: 'Midtown East, NY',
    beds: 3,
    baths: 2
  },
  // Add more sample houses as needed
];

const MapUpdater = ({ houses, onBoundsChange }: { houses: House[], onBoundsChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    }
  });

  return null;
};

export const Dashboard = () => {
  const [showMap, setShowMap] = React.useState(true);
  const [visibleHouses, setVisibleHouses] = React.useState<House[]>(sampleHouses);
  const [mapCenter] = React.useState<[number, number]>([40.7128, -74.0060]);

  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    const filtered = sampleHouses.filter(house => {
      const [lat, lng] = house.location;
      return bounds.contains([lat, lng]);
    });
    setVisibleHouses(filtered);
  };

  const HouseCard = ({ house }: { house: House }) => (
    <Card className="mb-4">
      <CardBody className="p-0">
        <div className="relative">
          <img
            src={house.images[0]}
            alt={house.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <Button
            isIconOnly
            className="absolute top-2 right-2"
            variant="flat"
            color="default"
            size="sm"
          >
            <Icon icon="lucide:heart" />
          </Button>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold">{house.title}</h3>
            <div className="flex items-center">
              <Icon icon="lucide:star" className="text-warning" />
              <span className="ml-1">{house.rating}</span>
            </div>
          </div>
          <p className="text-small text-default-500">{house.address}</p>
          <div className="flex gap-2 text-small text-default-500 mt-2">
            <span>{house.beds} beds</span>
            <span>•</span>
            <span>{house.baths} baths</span>
          </div>
        </div>
      </CardBody>
      <CardFooter className="justify-between">
        <span className="font-semibold">${house.price}</span>
        <span className="text-small text-default-500">{house.reviews} reviews</span>
      </CardFooter>
    </Card>
  );

  return (
    <div className="h-[calc(100vh-64px)]">
      <div className="hidden md:grid md:grid-cols-[350px,1fr] h-full">
        {/* Sidebar with listings */}
        <div className="overflow-y-auto p-4 border-r">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Available Houses</h2>
            <p className="text-default-500">{visibleHouses.length} properties in view</p>
          </div>
          {visibleHouses.map(house => (
            <HouseCard key={house.id} house={house} />
          ))}
        </div>

        {/* Map */}
        <div className="relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapUpdater houses={sampleHouses} onBoundsChange={handleBoundsChange} />
            {sampleHouses.map(house => (
              <Marker key={house.id} position={house.location}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">{house.title}</h3>
                    <p className="text-small">${house.price}/night</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Mobile view */}
      <div className="md:hidden h-full">
        {showMap ? (
          <div className="h-full">
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapUpdater houses={sampleHouses} onBoundsChange={handleBoundsChange} />
              {sampleHouses.map(house => (
                <Marker key={house.id} position={house.location}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{house.title}</h3>
                      <p className="text-small">${house.price}/night</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {visibleHouses.map(house => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>
        )}

        {/* Mobile toggle button */}
        <Button
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000]"
          color="primary"
          variant="solid"
          startContent={<Icon icon={showMap ? "lucide:list" : "lucide:map"} />}
          onPress={() => setShowMap(!showMap)}
        >
          {showMap ? 'Show List' : 'Show Map'}
        </Button>
      </div>
    </div>
  );
};