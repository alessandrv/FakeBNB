import React from "react";
import { Input, Textarea, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ListingData } from "../listing-form";

interface DescriptionStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

const SUGGESTED_TAGS = [
  { id: "university", label: "University", icon: "lucide:graduation-cap" },
  { id: "work", label: "Work-friendly", icon: "lucide:briefcase" },
  { id: "family", label: "Family-friendly", icon: "lucide:heart" },
  { id: "quiet", label: "Quiet", icon: "lucide:moon" },
  { id: "central", label: "Central", icon: "lucide:map-pin" },
  { id: "beach", label: "Beach", icon: "lucide:umbrella" },
  { id: "mountain", label: "Mountain", icon: "lucide:mountain" },
  { id: "city", label: "City center", icon: "lucide:building" },
];

export function DescriptionStep({ data, updateData }: DescriptionStepProps) {
  const handleNameChange = (value: string) => {
    updateData({
      ...data,
      name: value,
    });
  };

  const handleDescriptionChange = (value: string) => {
    updateData({
      ...data,
      description: value,
    });
  };

  const toggleTag = (tagId: string) => {
    const newTags = data.tags.includes(tagId)
      ? data.tags.filter((t) => t !== tagId)
      : [...data.tags, tagId];
    
    updateData({
      ...data,
      tags: newTags,
    });
  };

  return (
    <div className="space-y-6">
      <Input
        label="Property Name"
        placeholder="Give your property a catchy title"
        value={data.name}
        onValueChange={handleNameChange}
      />
      
      <Textarea
        label="Description"
        placeholder="Describe your property..."
        value={data.description}
        onValueChange={handleDescriptionChange}
        minRows={4}
      />

      <div className="space-y-2">
        <label className="text-small font-medium">Property Tags</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {SUGGESTED_TAGS.map((tag) => (
            <Card
              key={tag.id}
              isPressable
              isHoverable
              onPress={() => toggleTag(tag.id)}
              className={`h-16 ${data.tags.includes(tag.id) ? "border-2 border-primary" : ""}`}
            >
              <CardBody className="flex items-center justify-center gap-2 p-2">
                <Icon icon={tag.icon} className="text-xl text-default-500" />
                <span>{tag.label}</span>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
      </div>

  );
}