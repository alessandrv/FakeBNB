import React from 'react';
import { Input, Textarea, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FormData {
  address: string;
  houseNumber: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  description: string;
  images: string[];
}

export const CreateHouse = () => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<FormData>({
    address: '',
    houseNumber: '',
    city: '',
    state: '',
    country: '',
    zip: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    description: '',
    images: [],
  });
  const [position, setPosition] = React.useState<[number, number]>([37.7749, -122.4194]);
  const [search, setSearch] = React.useState('');
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    const savedData = localStorage.getItem('houseForm');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleInputChange = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageURLs = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...imageURLs]
      }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    const imageURLs = Array.from(files).map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageURLs]
    }));
  };

  const handleDeleteImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const saveToLocalStorage = () => {
    localStorage.setItem('houseForm', JSON.stringify(formData));
  };

  const steps = [
    {
      title: "Location Information",
      content: (
        <div className="space-y-6">
          <div className="h-[400px] w-full mb-6">
            <MapContainer center={position} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={position}>
                <Popup>Selected location</Popup>
              </Marker>
            </MapContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Address"
              value={formData.address}
              onValueChange={handleInputChange('address')}
            />
            <Input
              label="House Number"
              value={formData.houseNumber}
              onValueChange={handleInputChange('houseNumber')}
            />
            <Input
              label="City"
              value={formData.city}
              onValueChange={handleInputChange('city')}
            />
            <Input
              label="State"
              value={formData.state}
              onValueChange={handleInputChange('state')}
            />
            <Input
              label="Country"
              value={formData.country}
              onValueChange={handleInputChange('country')}
            />
            <Input
              label="ZIP Code"
              value={formData.zip}
              onValueChange={handleInputChange('zip')}
            />
          </div>
        </div>
      )
    },
    {
      title: "House Details",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price"
              value={formData.price}
              onValueChange={handleInputChange('price')}
              startContent={<Icon icon="lucide:dollar-sign" />}
            />
            <Input
              label="Bedrooms"
              value={formData.bedrooms}
              onValueChange={handleInputChange('bedrooms')}
              startContent={<Icon icon="lucide:bed" />}
            />
            <Input
              label="Bathrooms"
              value={formData.bathrooms}
              onValueChange={handleInputChange('bathrooms')}
              startContent={<Icon icon="lucide:bath" />}
            />
            <Input
              label="Square Footage"
              value={formData.sqft}
              onValueChange={handleInputChange('sqft')}
              startContent={<Icon icon="lucide:square" />}
            />
          </div>
          <Textarea
            label="Description"
            value={formData.description}
            onValueChange={handleInputChange('description')}
            placeholder="Describe the property..."
            className="min-h-[150px]"
          />
        </div>
      )
    },
    {
      title: "Images",
      content: (
        <div 
          className={`p-8 border-2 border-dashed rounded-lg ${
            isDragging ? 'border-primary bg-primary/10' : 'border-default-300'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="text-center">
            <input
              type="file"
              id="file-input"
              className="hidden"
              onChange={handleImageUpload}
              multiple
              accept="image/*"
            />
            <label 
              htmlFor="file-input"
              className="cursor-pointer"
            >
              <div className="flex flex-col items-center gap-2">
                <Icon icon="lucide:upload" className="w-12 h-12 text-default-400" />
                <p className="text-default-600">
                  {isDragging ? "Drop images here!" : "Drag & drop images or click to upload"}
                </p>
              </div>
            </label>
          </div>
          {formData.images.length > 0 && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    isIconOnly
                    color="danger"
                    variant="flat"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onPress={() => handleDeleteImage(index)}
                  >
                    <Icon icon="lucide:x" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      title: "Review",
      content: (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Location Details</h3>
              <div className="space-y-2">
                <p>Address: {formData.address} {formData.houseNumber}</p>
                <p>City: {formData.city}</p>
                <p>State: {formData.state}</p>
                <p>Country: {formData.country}</p>
                <p>ZIP: {formData.zip}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">House Details</h3>
              <div className="space-y-2">
                <p>Price: ${formData.price}</p>
                <p>Bedrooms: {formData.bedrooms}</p>
                <p>Bathrooms: {formData.bathrooms}</p>
                <p>Square Footage: {formData.sqft}</p>
                <p>Description: {formData.description}</p>
              </div>
            </div>
          </div>
          {formData.images.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Uploaded Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`House image ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create House Listing</h1>
      </div>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center ${
                index < steps.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStep ? 'bg-primary text-white' : 'bg-default-100'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-default-100'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{steps[currentStep].title}</h2>
          {steps[currentStep].content}
        </div>

        <div className="flex justify-between mt-8">
          <Button
            variant="flat"
            onPress={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            isDisabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button
            color="primary"
            onPress={() => {
              if (currentStep === steps.length - 1) {
                saveToLocalStorage();
              } else {
                setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
              }
            }}
          >
            {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};