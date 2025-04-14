const API_URL = import.meta.env.VITE_API_URL;

export interface Amenity {
  id: number;
  name: string;
  icon?: string;
}

export const amenityService = {
  async getAmenities(): Promise<Amenity[]> {
    const response = await fetch(`${API_URL}/api/amenities`);
    if (!response.ok) {
      throw new Error('Failed to fetch amenities');
    }

    return response.json();
  }
};

export default amenityService; 