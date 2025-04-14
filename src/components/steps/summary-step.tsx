import React from 'react';
import { Card, CardBody, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ListingData } from '../../pages/CreateHouse';

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

interface SummaryStepProps {
  data: ListingData;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({ data }) => {
  return (
    <div className="space-y-6 pb-24">
      <Card>
        <CardBody>
          <h3 className="text-xl font-semibold mb-4">Location</h3>
          <div className="flex items-start gap-3">
            <Icon icon="lucide:map-pin" className="mt-1" />
            <p>{data.address.formatted}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-xl font-semibold mb-4">Property Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bed" />
              <span>{data.details.bedrooms} bedrooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bath" />
              <span>{data.details.bathrooms} bathrooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:users" />
              <span>Up to {data.details.guests} guests</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bed-double" />
              <span>{data.details.beds} beds</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-xl font-semibold mb-4">Amenities</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.amenities.map((amenityName, index) => {
              // For the summary, we'll just use a default icon since we don't have the amenity objects
              return (
                <div key={index} className="flex items-center gap-2">
                  <Icon icon={AMENITY_ICONS.default} className="text-success" />
                  <span>{amenityName}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-xl font-semibold mb-4">Photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.photos.map((photo, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Property photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-xl font-semibold mb-4">Description</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Property Name</h4>
              <p>{data.name}</p>
            </div>
            <Divider />
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="whitespace-pre-line">{data.description}</p>
            </div>
            {data.tags.length > 0 && (
              <>
                <Divider />
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-default-100 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-xl font-semibold mb-4">Pricing</h3>
          <div className="flex items-center gap-2">
            <Icon icon="lucide:dollar-sign" />
            <span className="text-2xl font-semibold">{data.price}</span>
            <span className="text-default-500">per night</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}; 