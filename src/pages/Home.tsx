import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardFooter, Button, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

// Sample property data
const featuredProperties = [
  {
    id: 1,
    title: 'Mountain Retreat',
    location: 'Aspen, Colorado',
    price: 250,
    rating: 4.8,
    reviewCount: 124,
    imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    title: 'Beachfront Villa',
    location: 'Malibu, California',
    price: 420,
    rating: 4.9,
    reviewCount: 86,
    imageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    title: 'Downtown Loft',
    location: 'New York City, New York',
    price: 180,
    rating: 4.6,
    reviewCount: 203,
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4,
    title: 'Countryside Cottage',
    location: 'Cotswolds, UK',
    price: 135,
    rating: 4.7,
    reviewCount: 92,
    imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 5,
    title: 'Tropical Paradise',
    location: 'Bali, Indonesia',
    price: 195,
    rating: 4.9,
    reviewCount: 156,
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 6,
    title: 'Modern City Apartment',
    location: 'Tokyo, Japan',
    price: 210,
    rating: 4.8,
    reviewCount: 74,
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
];

export const Home = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [checkInOut, setCheckInOut] = useState('');
  const [guests, setGuests] = useState('');

   useEffect(() => {
    document.documentElement.style.setProperty('--hide-header-mobile', 'None');
   
  }, []);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Navigate to the map/dashboard with search parameters
    navigate(`/map?location=${encodeURIComponent(location)}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
        </div>
        
        <div className="container mx-auto px-4 h-full flex flex-col justify-center relative">
          <div className="max-w-2xl text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find your next perfect stay
            </h1>
            <p className="text-xl mb-8">
              Discover unique homes and experiences around the world
            </p>
            
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardBody className="p-4">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Where are you going?"
                    className="flex-grow"
                    startContent={<Icon icon="lucide:map-pin" />}
                    value={location}
                    onValueChange={setLocation}
                  />
                  <Input
                    placeholder="Check in - Check out"
                    className="md:max-w-[240px]"
                    startContent={<Icon icon="lucide:calendar" />}
                    value={checkInOut}
                    onValueChange={setCheckInOut}
                  />
                  <Input
                    placeholder="Guests"
                    className="md:max-w-[140px]"
                    startContent={<Icon icon="lucide:users" />}
                    value={guests}
                    onValueChange={setGuests}
                  />
                  <Button 
                    type="submit" 
                    color="primary" 
                    startContent={<Icon icon="lucide:search" />}
                  >
                    Search
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Featured Properties */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Featured Properties</h2>
          <Link to="/map" className="text-primary flex items-center gap-1">
            See all <Icon icon="lucide:arrow-right" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProperties.map(property => (
            <Card key={property.id} className="overflow-hidden">
              <div className="h-48 overflow-hidden">
                <img 
                  src={property.imageUrl} 
                  alt={property.title} 
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <CardBody className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{property.title}</h3>
                    <p className="text-default-500">{property.location}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon icon="lucide:star" className="text-warning" />
                    <span>{property.rating}</span>
                    <span className="text-default-400">({property.reviewCount})</span>
                  </div>
                </div>
                <p className="font-semibold mt-2">
                  ${property.price} <span className="text-default-500 font-normal">/ night</span>
                </p>
              </CardBody>
              <CardFooter className="border-t border-default-200 p-3">
                <Link to={`/properties/${property.id}`} className="w-full">
                  <Button fullWidth variant="light" color="primary">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-default-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-12 text-center">Why choose FakeBNB?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="lucide:search" className="text-2xl text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
              <p className="text-default-500">
                Find the perfect stay from our extensive collection of properties worldwide.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="lucide:shield" className="text-2xl text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Bookings</h3>
              <p className="text-default-500">
                Book with confidence knowing your reservations and payments are secure.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="lucide:headphones" className="text-2xl text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p className="text-default-500">
                Our dedicated support team is always ready to assist you day or night.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 container mx-auto px-4">
        <div className="bg-primary/10 rounded-xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to start hosting?</h2>
          <p className="text-default-500 mb-8 max-w-2xl mx-auto">
            Share your space, earn extra income, and connect with travelers from around the world.
          </p>
          <Button color="primary" size="lg">
            Become a Host
          </Button>
        </div>
      </section>
    </div>
  );
}; 