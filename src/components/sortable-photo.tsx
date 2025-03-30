import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

interface SortablePhotoProps {
  photo: File;
  onRemove: () => void;
}

export function SortablePhoto({ photo, onRemove }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: photo.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative"
    >
      <CardBody className="p-0">
        <img
          src={URL.createObjectURL(photo)}
          alt={photo.name}
          className="w-full aspect-square object-cover rounded-lg"
        />
        <Button
          isIconOnly
          color="danger"
          variant="flat"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onPress={onRemove}
        >
          <Icon icon="lucide:x" />
        </Button>
      </CardBody>
    </Card>
  );
}