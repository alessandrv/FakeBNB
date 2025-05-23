import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useNavigate, useParams } from "react-router-dom";
import { AddressStep } from "../components/steps/address-step";
import { DetailsStep } from "../components/steps/details-step";
import { AmenitiesStep } from "../components/steps/amenities-step";
import { PhotosStep } from "../components/steps/photos-step";
import { DescriptionStep } from "../components/steps/description-step";
import { PricingStep } from "../components/steps/pricing-step";
import { SummaryStep } from "../components/steps/summary-step";
import { FormStepper } from "../components/form-stepper";
import { houseService, House } from "../services/houseService";

export interface ListingData {
  address: {
    location: [number, number];
    formatted: string;
  };
  details: {
    bedrooms: number;
    bathrooms: number;
    beds: number;
    guests: number;
  };
  amenities: string[];
  photos: File[];
  name: string;
  description: string;
  tags: string[];
  price: number;
}

const INITIAL_DATA: ListingData = {
  address: {
    location: [51.505, -0.09],
    formatted: "",
  },
  details: {
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    guests: 2,
  },
  amenities: [],
  photos: [],
  name: "",
  description: "",
  tags: [],
  price: 50,
};

export function ListingForm() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<ListingData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();

  // Load house data if editing
  useEffect(() => {
    if (id) {
      const loadHouse = async () => {
        try {
          const house = await houseService.getHouse(Number(id));
          setFormData({
            address: {
              location: [house.latitude, house.longitude],
              formatted: house.address,
            },
            details: {
              bedrooms: house.bedrooms,
              bathrooms: house.bathrooms,
              beds: house.beds,
              guests: house.max_guests,
            },
            amenities: house.amenities,
            photos: [], // We'll handle photos separately
            name: house.name,
            description: house.description,
            tags: [], // Not used in backend
            price: house.price_per_night,
          });
        } catch (error) {
          setError("Failed to load house data");
          navigate("/profile?tab=houses");
        }
      };
      loadHouse();
    }
  }, [id, navigate]);

  // Hide header, footer, and navbar for both desktop and mobile
  useEffect(() => {
    // Hide elements
    document.documentElement.style.setProperty('--hide-header-mobile', 'none');
    document.documentElement.style.setProperty('--hide-header-desktop', 'none');
    document.documentElement.style.setProperty('--hide-navbar-mobile', 'none');
    document.documentElement.style.setProperty('--hide-footer-desktop', 'none');
    
    // Cleanup function to restore visibility when component unmounts
    return () => {
      document.documentElement.style.setProperty('--hide-header-mobile', 'block');
      document.documentElement.style.setProperty('--hide-header-desktop', 'block');
      document.documentElement.style.setProperty('--hide-navbar-mobile', 'grid');
      document.documentElement.style.setProperty('--hide-footer-desktop', 'block');
    };
  }, []);

  const steps = [
    {
      title: "Address",
      description: "Where's your place located?",
      component: <AddressStep data={formData} updateData={setFormData} />,
    },
    {
      title: "Details",
      description: "Share some basics about your place",
      component: <DetailsStep data={formData} updateData={setFormData} />,
    },
    {
      title: "Amenities",
      description: "What amenities do you offer?",
      component: <AmenitiesStep data={formData} updateData={setFormData} />,
    },
    {
      title: "Photos",
      description: "Add some photos of your place",
      component: <PhotosStep data={formData} updateData={setFormData} />,
    },
    {
      title: "Description",
      description: "How would you describe your place?",
      component: <DescriptionStep data={formData} updateData={setFormData} />,
    },
    {
      title: "Pricing",
      description: "Set your price",
      component: <PricingStep data={formData} updateData={setFormData} />,
    },
    {
      title: "Summary",
      description: "Review your listing",
      component: <SummaryStep data={formData} />,
    },
  ];

  const next = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/profile?tab=houses');
    } else {
      prev();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (id) {
        await houseService.updateHouse(Number(id), formData);
      } else {
        await houseService.createHouse(formData);
      }
      navigate("/profile?tab=houses");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save house");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 p-4 md:p-6 pt-6 md:pt-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            {id ? "Edit Property" : "List Your Property"}
          </h1>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <FormStepper steps={steps} currentStep={currentStep} />
          <div className="mt-8">
            {steps[currentStep].component}
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-divider shadow-lg z-50">
        <div className="flex justify-between gap-4 max-w-6xl mx-auto">
          <Button
            variant="flat"
            onPress={handleBack}
            className="flex-1 md:flex-none"
            isDisabled={isLoading}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button 
              color="primary" 
              onPress={handleSubmit} 
              className="flex-1 md:flex-none"
              isLoading={isLoading}
            >
              {id ? "Update" : "Submit"}
            </Button>
          ) : (
            <Button 
              color="primary" 
              onPress={next} 
              className="flex-1 md:flex-none"
              isDisabled={isLoading}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}