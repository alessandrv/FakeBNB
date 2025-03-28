import { Property } from '../types/property';

export const properties: Property[] = [
  {
    id: '1',
    title: 'Modern Downtown Apartment',
    description: 'Luxurious 2-bedroom apartment with city views',
    price: 150,
    image: 'https://picsum.photos/seed/apt1/400/300',
    location: {
      lat: 40.7128,
      lng: -74.0060
    },
    rating: 4.8,
    reviews: 124
  },
  {
    id: '2',
    title: 'Cozy Studio Near Park',
    description: 'Perfect for solo travelers or couples',
    price: 95,
    image: 'https://picsum.photos/seed/apt2/400/300',
    location: {
      lat: 40.7200,
      lng: -73.9900
    },
    rating: 4.6,
    reviews: 89
  },
  {
    id: '3',
    title: 'Spacious Family Home',
    description: '4-bedroom house with garden',
    price: 250,
    image: 'https://picsum.photos/seed/apt3/400/300',
    location: {
      lat: 40.7300,
      lng: -74.0100
    },
    rating: 4.9,
    reviews: 156
  }
];
