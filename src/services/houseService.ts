import { ListingData } from '../pages/CreateHouse';

const API_URL = import.meta.env.VITE_API_URL;

export interface House {
  id: number;
  user_id: number;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  max_guests: number;
  price_per_night: number;
  amenities: string[];
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface HouseFilters {
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  guests?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'price_per_night' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export const houseService = {
  async createHouse(data: ListingData): Promise<House> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    const houseData = {
      name: data.name,
      description: data.description,
      address: data.address.formatted,
      latitude: data.address.location[0],
      longitude: data.address.location[1],
      bedrooms: data.details.bedrooms,
      bathrooms: data.details.bathrooms,
      beds: data.details.beds,
      max_guests: data.details.guests,
      price_per_night: data.price,
      amenities: data.amenities,
      photos: data.photos.map(photo => URL.createObjectURL(photo)) // Convert File objects to URLs
    };

    const response = await fetch(`${API_URL}/api/houses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(houseData),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      if (response.status === 400) {
        throw new Error(error.message || 'Invalid data. Please check all required fields.');
      }
      throw new Error(error.message || 'Failed to create house');
    }

    return response.json();
  },

  async getHouses(filters: HouseFilters = {}): Promise<House[]> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_URL}/api/houses?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch houses');
    }

    return response.json();
  },

  async getHouse(id: number): Promise<House> {
    const response = await fetch(`${API_URL}/api/houses/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch house');
    }

    return response.json();
  },

  async updateHouse(id: number, data: Partial<ListingData>): Promise<House> {
    const token = localStorage.getItem('token');
    const formData = new FormData();

    // Add updated fields
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.address) {
      formData.append('address', data.address.formatted);
      formData.append('latitude', data.address.location[0].toString());
      formData.append('longitude', data.address.location[1].toString());
    }
    if (data.details) {
      formData.append('bedrooms', data.details.bedrooms.toString());
      formData.append('bathrooms', data.details.bathrooms.toString());
      formData.append('beds', data.details.beds.toString());
      formData.append('max_guests', data.details.guests.toString());
    }
    if (data.price) formData.append('price_per_night', data.price.toString());
    if (data.amenities) formData.append('amenities', JSON.stringify(data.amenities));
    if (data.photos) {
      data.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });
    }

    const response = await fetch(`${API_URL}/api/houses/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update house');
    }

    return response.json();
  },

  async deleteHouse(id: number): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/houses/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete house');
    }
  },
}; 