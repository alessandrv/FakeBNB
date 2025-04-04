import React from "react";
import { Card, CardBody, Checkbox } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ListingData } from "../../pages/CreateHouse";

interface AmenitiesStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

const AMENITIES = [
  { id: "wifi", label: "Wi-Fi", icon: "lucide:wifi" },
  { id: "tv", label: "TV", icon: "lucide:tv" },
  { id: "kitchen", label: "Kitchen", icon: "lucide:cooking-pot" },
  { id: "washer", label: "Washer", icon: "lucide:washing-machine" },
  { id: "parking", label: "Free parking", icon: "lucide:parking" },
  { id: "paid-parking", label: "Paid parking", icon: "lucide:parking-meter" },
  { id: "ac", label: "Air conditioning", icon: "lucide:fan" },
  { id: "workspace", label: "Workspace", icon: "lucide:desk" },
];

export function AmenitiesStep({ data, updateData }: AmenitiesStepProps) {
  const handleChange = (amenityId: string, isSelected: boolean) => {
    const newAmenities = isSelected
      ? [...data.amenities, amenityId]
      : data.amenities.filter((id) => id !== amenityId);
    
    updateData({
      ...data,
      amenities: newAmenities,
    });
  };

  return (
    <div className="grid pb-32 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {AMENITIES.map((amenity) => (
        <Card
          key={amenity.id}
          isPressable
          isHoverable
          onPress={() => handleChange(amenity.id, !data.amenities.includes(amenity.id))}
          className={`h-[80px] box-border ${data.amenities.includes(amenity.id) ? "border-2 border-primary" : "border-2 border-transparent"}`}
        >
          <CardBody className="flex items-center gap-3 p-4 overflow-visible">
            <Icon icon={amenity.icon} className="text-2xl text-default-500 flex-shrink-0" />
            <span className="flex-grow whitespace-normal">{amenity.label}</span>
            
          </CardBody>
        </Card>
      ))}
    </div>
  );
}