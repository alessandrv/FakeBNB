import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortablePhoto } from "../sortable-photo";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ListingData } from "../../pages/CreateHouse";

interface PhotosStepProps {
  data: ListingData;
  updateData: (data: ListingData) => void;
}

export function PhotosStep({ data, updateData }: PhotosStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = data.photos.findIndex((photo) => photo.name === active.id);
      const newIndex = data.photos.findIndex((photo) => photo.name === over.id);

      updateData({
        ...data,
        photos: arrayMove(data.photos, oldIndex, newIndex),
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      updateData({
        ...data,
        photos: [...data.photos, ...newPhotos],
      });
    }
  };

  const removePhoto = (photoName: string) => {
    updateData({
      ...data,
      photos: data.photos.filter((photo) => photo.name !== photoName),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          as="label"
          color="primary"
          startContent={<Icon icon="lucide:upload" />}
        >
          Upload Photos
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />
        </Button>
        <span className="text-small text-default-500">
          Drag to reorder photos
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={data.photos.map((photo) => photo.name)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.photos.map((photo) => (
              <SortablePhoto
                key={photo.name}
                photo={photo}
                onRemove={() => removePhoto(photo.name)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}