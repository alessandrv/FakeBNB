import React from "react";
import { Icon } from "@iconify/react";

interface Step {
  title: string;
  description: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
}

export function FormStepper({ steps, currentStep }: FormStepperProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Mobile stepper */}
      <div className="flex md:hidden items-center justify-between px-2">
        <span className="text-small text-default-500">
          Step {currentStep + 1} of {steps.length}
        </span>
        <div className="flex-1 h-1 mx-4 bg-default-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.title}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index <= currentStep
                    ? "bg-primary text-white"
                    : "bg-default-100 text-default-500"
                }`}
              >
                {index < currentStep ? (
                  <Icon icon="lucide:check" className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="text-small mt-2">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  index < currentStep ? "bg-primary" : "bg-default-100"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
        <p className="text-default-500">{steps[currentStep].description}</p>
      </div>
    </div>
  );
}