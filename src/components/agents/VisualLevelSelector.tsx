import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface VisualLevelSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; emoji?: string; description?: string }[];
  className?: string;
}

export const VisualLevelSelector = ({
  label,
  value,
  onChange,
  options,
  className,
}: VisualLevelSelectorProps) => {
  const currentIndex = options.findIndex((opt) => opt.value === value);
  const sliderValue = currentIndex >= 0 ? currentIndex : 0;

  const handleSliderChange = (values: number[]) => {
    const index = values[0];
    if (options[index]) {
      onChange(options[index].value);
    }
  };

  return (
    <div className={className}>
      <Label className="text-base font-semibold mb-4 block">{label}</Label>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Nível atual:</span>
          <span className="font-medium">
            {options[currentIndex]?.emoji} {options[currentIndex]?.label}
          </span>
        </div>
        <Slider
          value={[sliderValue]}
          onValueChange={handleSliderChange}
          min={0}
          max={options.length - 1}
          step={1}
          className="w-full"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                value === option.value
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="text-2xl mb-1">{option.emoji}</div>
              <div className="text-xs font-medium">{option.label}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};



