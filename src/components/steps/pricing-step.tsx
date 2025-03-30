import React from "react";
import { Slider, Input } from "@heroui/react";
import { ListingData } from "../../pages/CreateHouse";

interface PricingStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

export function PricingStep({ data, updateData }: PricingStepProps) {
  const handlePriceChange = (value: number) => {
    updateData({
      ...data,
      price: value,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label className="text-small font-medium">Price per night</label>
        <Slider
          size="lg"
          step={5}
          minValue={10}
          maxValue={1000}
          value={data.price}
          onChange={handlePriceChange}
          className="max-w-md"
        />
      </div>

      <Input
        type="number"
        label="Price"
        value={data.price.toString()}
        onValueChange={(value) => handlePriceChange(Number(value))}
        startContent={
          <div className="pointer-events-none flex items-center">
            <span className="text-default-400 text-small">$</span>
          </div>
        }
        className="max-w-xs"
      />
    </div>
  );
}