import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepNavigationProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
}

export const StepNavigation = ({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onPrevious,
  canGoNext = true,
  canGoPrevious = true,
}: StepNavigationProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => onStepChange(index)}
              className={`flex flex-col items-center flex-1 ${
                index <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
              disabled={index > currentStep}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground scale-110"
                    : index < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${
                    index === currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 transition-colors ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card className="p-4 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious || currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Etapa {currentStep + 1} de {steps.length}
        </span>
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || currentStep === steps.length - 1}
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    </div>
  );
};











