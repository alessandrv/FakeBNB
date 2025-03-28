import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Property } from '../types/property';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect }) => {
  return (
    <Card 
      className="w-full"
      isPressable
      onPress={() => onSelect(property)}
    >
      <CardBody className="p-0">
        <div className="relative">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute top-2 right-2">
            <Button 
              isIconOnly
              variant="flat"
              className="bg-white/80 backdrop-blur-sm"
              size="sm"
            >
              <Icon icon="lucide:heart" className="text-default-700" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold">{property.title}</h3>
          <p className="text-small text-default-500 mt-1">{property.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Icon icon="lucide:star" className="text-warning-500" />
            <span className="text-small">{property.rating}</span>
            <span className="text-small text-default-500">({property.reviews} reviews)</span>
          </div>
          <div className="mt-2">
            <span className="font-semibold">${property.price}</span>
            <span className="text-default-500"> / night</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
