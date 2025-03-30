import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ListingData } from "../listing-form";

interface DetailsStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

interface CounterProps {
  label: string;
  value: number;
  icon: string;
  onChange: (value: number) => void;
  min?: number;
}

function Counter({ label, value, icon, onChange, min = 1 }: CounterProps) {
  return (
    <Card>
      <CardBody className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon icon={icon} className="text-2xl text-default-400" />
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="flat"
            onPress={() => onChange(Math.max(min, value - 1))}
            isDisabled={value <= min}
          >
            <Icon icon="lucide:minus" className="text-xl" />
          </Button>
          <span className="w-8 text-center font-semibold">{value}</span>
          <Button
            isIconOnly
            variant="flat"
            onPress={() => onChange(value + 1)}
          >
            <Icon icon="lucide:plus" className="text-xl" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function DetailsStep({ data, updateData }: DetailsStepProps) {
  const handleChange = (field: keyof ListingData["details"], value: number) => {
    updateData({
      ...data,
      details: {
        ...data.details,
        [field]: value,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Counter
        label="Bedrooms"
        value={data.details.bedrooms}
        icon="lucide:bed"
        onChange={(value) => handleChange("bedrooms", value)}
      />
      <Counter
        label="Bathrooms"
        value={data.details.bathrooms}
        icon="lucide:bath"
        onChange={(value) => handleChange("bathrooms", value)}
      />
      <Counter
        label="Beds"
        value={data.details.beds}
        icon="lucide:pillow"
        onChange={(value) => handleChange("beds", value)}
      />
      <Counter
        label="Guests"
        value={data.details.guests}
        icon="lucide:users"
        onChange={(value) => handleChange("guests", value)}
      />
    </div>
  );
}