import React, { useEffect, useState } from "react";
import { Card, CardBody, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ListingData } from "../../pages/CreateHouse";
import { Amenity, amenityService } from "../../services/amenityService";

interface AmenitiesStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

// Icon mapping for common amenities
const AMENITY_ICONS: Record<string, string> = {
  "wifi": "lucide:wifi",
  "tv": "lucide:tv",
  "kitchen": "lucide:cooking-pot",
  "washer": "lucide:washing-machine",
  "parking": "lucide:parking",
  "paid-parking": "lucide:parking-meter",
  "ac": "lucide:fan",
  "workspace": "lucide:desk",
  // Default icon for any other amenities
  "default": "lucide:check-circle"
};

export function AmenitiesStep({ data, updateData }: AmenitiesStepProps) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        setIsLoading(true);
        const amenitiesList = await amenityService.getAmenities();
        setAmenities(amenitiesList);
        setError(null);
      } catch (err) {
        setError("Failed to load amenities. Please try again.");
        console.error("Error fetching amenities:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmenities();
  }, []);

  const handleChange = (amenityName: string, isSelected: boolean) => {
    const newAmenities = isSelected
      ? [...data.amenities, amenityName]
      : data.amenities.filter((name) => name !== amenityName);
    
    updateData({
      ...data,
      amenities: newAmenities,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
        <span className="ml-2">Loading amenities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="grid pb-32 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {amenities.map((amenity) => {
        const isSelected = data.amenities.includes(amenity.name);
        // Use icon from DB if available, otherwise fallback to predefined mapping or default
        const iconName = amenity.icon ? AMENITY_ICONS[amenity.icon] || `lucide:${amenity.icon}` : AMENITY_ICONS.default;
        
        return (
          <Card
            key={amenity.id}
            isPressable
            isHoverable
            onPress={() => handleChange(amenity.name, !isSelected)}
            className={`h-[80px] box-border ${isSelected ? "border-2 border-primary" : "border-2 border-transparent"}`}
          >
            <CardBody className="flex items-center gap-3 p-4 overflow-visible">
              <Icon icon={iconName} className="text-2xl text-default-500 flex-shrink-0" />
              <span className="flex-grow whitespace-normal">{amenity.name}</span>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}