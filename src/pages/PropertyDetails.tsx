import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, Button, Card, CardBody, Chip, DateRangePicker, Divider, Image, Input, Progress, Textarea, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { houseService, House } from '../services/houseService';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Utility function to format image paths
const formatImageUrl = (imagePath: string) => {
  // If the path already includes http(s), it's a complete URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Otherwise, combine the API URL with the path
  return `${API_URL}/uploads/${imagePath}`;
};

// Icon mapping for amenities
const AMENITY_ICONS: Record<string, string> = {
  "WiFi": "lucide:wifi",
  "Kitchen": "lucide:cooking-pot",
  "Washer": "lucide:washing-machine",
  "Dryer": "lucide:package",
  "Air Conditioning": "lucide:fan",
  "Heating": "lucide:flame",
  "TV": "lucide:tv",
  "Pool": "lucide:droplets",
  "Hot Tub": "lucide:bath",
  "Free Parking": "lucide:car",
  "Gym": "lucide:dumbbell",
  "Elevator": "lucide:arrow-up-down",
  "Indoor Fireplace": "lucide:flame",
  "Breakfast": "lucide:coffee",
  "Workspace": "lucide:desk",
  // Default icon for any other amenities
  "default": "lucide:check-circle"
};

interface PropertyFeature {
  icon: string;
  label: string;
}

// Extended property interface based on the House interface but with additional fields needed for UI
interface PropertyData {
  id: number;
  title: string; // mapped from house.name
  description: string;
  price: number; // mapped from house.price_per_night
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    }
  };
  images: string[]; // mapped from house.photos
  features: PropertyFeature[]; // derived from house data and amenities
  amenities: string[]; // mapped from house.amenities
  rating?: number; // not in current API but could be in future
  reviews: any[]; // would need a reviews API endpoint in the future
  reviewCount: number; // if available
  host: {
    id: number;
    name: string;
    avatar?: string;
    joined?: string;
    responseRate?: number;
    responseTime?: string;
    description?: string;
  };
}

export const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [bookingDates, setBookingDates] = useState<[Date | null, Date | null]>([null, null]);
  const [guests, setGuests] = useState(2);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  
  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!id) {
        setError("Property ID is missing");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const houseData = await houseService.getHouse(parseInt(id));
        
        // Transform database house data to property format
        const propertyData: PropertyData = {
          id: houseData.id,
          title: houseData.name,
          description: houseData.description,
          price: houseData.price_per_night,
          location: {
            address: houseData.address,
            // Extract city, state, country from address if possible, or use defaults
            city: "City",
            state: "State",
            country: "Country",
            coordinates: {
              lat: houseData.latitude,
              lng: houseData.longitude
            }
          },
          images: Array.isArray(houseData.photos) && houseData.photos[0] !== null 
            ? houseData.photos.filter(Boolean) 
            : ['https://via.placeholder.com/800x600?text=No+Images+Available'],
          // Generate features from house data
          features: [
            {
              icon: 'lucide:users',
              label: `${houseData.max_guests} guests`
            },
            {
              icon: 'lucide:bed',
              label: `${houseData.bedrooms} bedrooms`
            },
            {
              icon: 'lucide:bath',
              label: `${houseData.bathrooms} bathrooms`
            }
          ],
          // Add amenities as features
          amenities: Array.isArray(houseData.amenities) && houseData.amenities[0] !== null 
            ? houseData.amenities.filter(Boolean)
            : [],
          // Placeholder for reviews - would come from a review API
          reviews: [],
          reviewCount: 0,
          // Host information
          host: {
            id: houseData.user_id,
            name: houseData.owner_first_name && houseData.owner_last_name 
              ? `${houseData.owner_first_name} ${houseData.owner_last_name}`
              : "Host",
            avatar: houseData.owner_profile_picture || undefined
          }
        };
        
        // Add amenities to features
        if (propertyData.amenities.length > 0) {
          propertyData.features = [
            ...propertyData.features,
            ...propertyData.amenities.map(amenity => ({
              icon: AMENITY_ICONS[amenity] || AMENITY_ICONS.default,
              label: amenity
            }))
          ];
        }
        
        setProperty(propertyData);
        setError(null);
      } catch (err) {
        console.error("Error fetching property:", err);
        setError("Failed to load property details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPropertyData();
  }, [id]);
  
  const calculateTotalPrice = () => {
    if (!bookingDates[0] || !bookingDates[1] || !property) return 0;
    
    const startDate = bookingDates[0];
    const endDate = bookingDates[1];
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return property.price * diffDays;
  };
  
  const handleBooking = () => {
    // In a real app, this would send the booking data to an API
    alert(`Booking confirmed for ${bookingDates[0]?.toLocaleDateString()} to ${bookingDates[1]?.toLocaleDateString()} for ${guests} guests!`);
  };
  
  const openGallery = (index: number) => {
    setModalImageIndex(index);
    setShowImageModal(true);
  };
  
  const nextImage = () => {
    if (!property) return;
    setModalImageIndex((prev) => 
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };
  
  const prevImage = () => {
    if (!property) return;
    setModalImageIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-20 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-default-500">Loading property details...</p>
      </div>
    );
  }
  
  if (error || !property) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-8 bg-danger-50 text-danger rounded-lg text-center">
          <Icon icon="lucide:alert-triangle" className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Property</h2>
          <p className="mb-4">{error || "Property not found"}</p>
          <Button as={Link} to="/" color="primary">
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Property Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{property.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          {property.rating && (
            <>
              <div className="flex items-center">
                <Icon icon="lucide:star" className="text-warning" />
                <span className="ml-1">{property.rating}</span>
              </div>
              <span>·</span>
            </>
          )}
          {property.reviewCount > 0 && (
            <>
              <span className="text-default-500">{property.reviewCount} reviews</span>
              <span>·</span>
            </>
          )}
          <span className="text-default-500">
            {property.location.city}, {property.location.state}, {property.location.country}
          </span>
        </div>
      </div>
      
      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-10">
        {/* Main image - visible on all devices */}
        <div className="col-span-1 md:col-span-1 h-[300px] md:h-[500px]">
          <img
            src={property.images[activeImage] ? formatImageUrl(property.images[activeImage]) : 'https://via.placeholder.com/800x600?text=No+Image+Available'}
            className="w-full h-full object-cover rounded-lg main-property-image cursor-pointer"
            alt={property.title}
            onClick={() => openGallery(activeImage)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Prevent infinite error loop
              target.src = 'https://via.placeholder.com/800x600?text=Image+Error';
            }}
          />
        </div>
        
        {/* Thumbnails - only visible on desktop */}
        <div className="hidden md:grid grid-cols-2 gap-2 h-[300px] md:h-[500px]">
          {property.images.length > 1 && property.images.slice(1, 5).map((image, index) => (
            <div key={index} className="overflow-hidden rounded-lg">
              <img
                src={image ? formatImageUrl(image) : 'https://via.placeholder.com/400x300?text=No+Image'}
                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                alt={`${property.title} - image ${index + 2}`}
                onClick={() => {
                  const newIndex = index + 1;
                  if (newIndex < property.images.length) {
                    setActiveImage(newIndex);
                  }
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  target.src = 'https://via.placeholder.com/400x300?text=Image+Error';
                }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile View Gallery Button */}
      <div className="md:hidden mb-6">
        <Button 
          fullWidth
          color="primary" 
          variant="bordered"
          onClick={() => openGallery(0)}
          startContent={<Icon icon="lucide:image" width={18} />}
        >
          See all {property.images.length} photos
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Left Column - Property Info */}
        <div className="lg:col-span-2">
          {/* Host Info */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Hosted by {property.host.name}</h2>
              <p className="text-default-500">
                {property.features.slice(0, 3).map(f => f.label).join(' · ')}
              </p>
            </div>
            {property.host.avatar && (
              <Avatar src={property.host.avatar} className="w-16 h-16" />
            )}
          </div>
          
          <Divider className="my-6" />
          
          {/* Features */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Property features</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Icon icon={feature.icon} width={20} />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Divider className="my-6" />
          
          {/* Description */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">About this place</h3>
            <p className="whitespace-pre-line">{property.description}</p>
          </div>
          
          {property.reviews.length > 0 && (
            <>
              <Divider className="my-6" />
              
              {/* Reviews */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="lucide:star" className="text-warning" width={24} />
                  <h3 className="text-xl font-semibold">{property.rating} · {property.reviewCount} reviews</h3>
                </div>
                
                <div className="space-y-6">
                  {property.reviews.map((review, index) => (
                    <div key={index} className="pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar src={review.author.avatar} className="w-10 h-10" />
                        <div>
                          <h4 className="font-medium">{review.author.name}</h4>
                          <p className="text-sm text-default-500">{review.author.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon 
                            key={i}
                            icon="lucide:star" 
                            className={i < review.rating ? "text-warning" : "text-default-200"} 
                            width={16} 
                          />
                        ))}
                      </div>
                      <p>{review.comment}</p>
                    </div>
                  ))}
                </div>
                
                {property.reviewCount > property.reviews.length && (
                  <Button 
                    variant="light" 
                    color="primary" 
                    className="mt-4"
                    endContent={<Icon icon="lucide:chevron-right" />}
                  >
                    Show all {property.reviewCount} reviews
                  </Button>
                )}
              </div>
            </>
          )}
          
          <Divider className="my-6" />
          
          {/* Host Info */}
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              {property.host.avatar ? (
                <Avatar src={property.host.avatar} className="w-14 h-14" />
              ) : (
                <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
                  <Icon icon="lucide:user" className="text-primary" width={24} />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold">Hosted by {property.host.name}</h3>
                {property.host.joined && (
                  <p className="text-default-500">
                    Joined in {property.host.joined}
                    {property.reviewCount > 0 && ` · ${property.reviewCount} reviews`}
                  </p>
                )}
              </div>
            </div>
            
            {(property.host.responseRate || property.host.responseTime) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {property.rating && (
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:star" className="text-warning" />
                    <span>{property.rating} rating</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:check" />
                  <span>Identity verified</span>
                </div>
                {property.host.responseRate && (
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:message-circle" />
                    <span>Response rate: {property.host.responseRate}%</span>
                  </div>
                )}
                {property.host.responseTime && (
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:clock" />
                    <span>Response time: {property.host.responseTime}</span>
                  </div>
                )}
              </div>
            )}
            
            {property.host.description && <p className="mb-4">{property.host.description}</p>}
            
            <Button 
              variant="bordered" 
              color="primary"
              startContent={<Icon icon="lucide:message-square" />}
            >
              Contact Host
            </Button>
          </div>
        </div>
        
        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-10 border shadow-lg">
            <CardBody className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="text-2xl font-semibold">
                  ${property.price} <span className="text-base font-normal text-default-500">night</span>
                </div>
                {property.rating && (
                  <div className="flex items-center gap-1">
                    <Icon icon="lucide:star" className="text-warning" />
                    <span>{property.rating}</span>
                    <span className="text-default-500">({property.reviewCount})</span>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">Check-in / Check-out dates</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      placeholder="Check-in"
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : null;
                        setBookingDates([newDate, bookingDates[1]]);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="Check-out"
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : null;
                        setBookingDates([bookingDates[0], newDate]);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium">Guests</label>
                <div className="flex items-center border rounded-medium overflow-hidden">
                  <button 
                    className="p-3 text-default-500 hover:bg-default-100 disabled:opacity-50"
                    onClick={() => setGuests(prev => Math.max(1, prev - 1))}
                    disabled={guests <= 1}
                  >
                    <Icon icon="lucide:minus" />
                  </button>
                  <div className="flex-1 text-center">{guests}</div>
                  <button 
                    className="p-3 text-default-500 hover:bg-default-100 disabled:opacity-50"
                    onClick={() => setGuests(prev => Math.min(property.features[0].label.includes('guests') ? parseInt(property.features[0].label) : 6, prev + 1))}
                    disabled={guests >= (property.features[0].label.includes('guests') ? parseInt(property.features[0].label) : 6)}
                  >
                    <Icon icon="lucide:plus" />
                  </button>
                </div>
              </div>
              
              <Button 
                color="primary" 
                size="lg" 
                className="w-full mb-4"
                onClick={handleBooking}
                disabled={!bookingDates[0] || !bookingDates[1]}
              >
                Book Now
              </Button>
              
              {bookingDates[0] && bookingDates[1] && (
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>${property.price} x {Math.ceil(Math.abs((bookingDates[1].getTime() - bookingDates[0].getTime()) / (1000 * 60 * 60 * 24)))} nights</span>
                    <span>${calculateTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cleaning fee</span>
                    <span>$85</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service fee</span>
                    <span>$45</span>
                  </div>
                  <Divider />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${calculateTotalPrice() + 85 + 45}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center items-center text-sm text-default-500 mt-4">
                <Icon icon="lucide:shield" className="mr-2" />
                <span>Your booking is protected by FakeBNB</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
      
      {/* Location */}
      <div className="mb-16">
        <h3 className="text-xl font-semibold mb-4">Location</h3>
        <div className="h-[400px] bg-default-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Icon icon="lucide:map-pin" className="mx-auto mb-2" width={40} />
            <h4 className="text-lg font-medium">{property.location.city}, {property.location.state}</h4>
            <p className="text-default-500">{property.location.address}</p>
          </div>
        </div>
      </div>
      
      {/* Fullscreen Gallery Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <Button 
              isIconOnly 
              variant="flat" 
              color="default" 
              onClick={() => setShowImageModal(false)}
            >
              <Icon icon="lucide:x" width={24} className="text-white" />
            </Button>
            <div className="text-center text-white">
              {modalImageIndex + 1} / {property.images.length}
            </div>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative">
            <img
              src={property.images[modalImageIndex] ? formatImageUrl(property.images[modalImageIndex]) : 'https://via.placeholder.com/800x600?text=No+Image+Available'}
              className="max-h-full max-w-full object-contain"
              alt={`${property.title} - fullscreen view`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://via.placeholder.com/800x600?text=Image+Error';
              }}
            />
            
            <Button 
              isIconOnly 
              variant="flat" 
              color="default"
              className="absolute left-2 rounded-full bg-black/50 text-white"
              onClick={prevImage}
            >
              <Icon icon="lucide:chevron-left" width={24} />
            </Button>
            
            <Button 
              isIconOnly 
              variant="flat" 
              color="default"
              className="absolute right-2 rounded-full bg-black/50 text-white"
              onClick={nextImage}
            >
              <Icon icon="lucide:chevron-right" width={24} />
            </Button>
          </div>
          
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-2">
              {property.images.map((image, index) => (
                <div 
                  key={index} 
                  className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 ${
                    modalImageIndex === index ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => setModalImageIndex(index)}
                >
                  <img
                    src={image ? formatImageUrl(image) : 'https://via.placeholder.com/100x100?text=No+Image'}
                    className="w-full h-full object-cover cursor-pointer"
                    alt={`Thumbnail ${index + 1}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://via.placeholder.com/100x100?text=Error';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 