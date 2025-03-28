export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  reviews: number;
}
