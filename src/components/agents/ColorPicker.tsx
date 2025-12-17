import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESET_COLORS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Amarelo", value: "#f59e0b" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Emerald", value: "#34d399" },
  { name: "Pink", value: "#f472b6" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Slate", value: "#64748b" },
  { name: "Gray", value: "#6b7280" },
  { name: "Zinc", value: "#71717a" },
  { name: "Neutral", value: "#737373" },
  { name: "Stone", value: "#78716c" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Yellow", value: "#ca8a04" },
  { name: "Lime", value: "#65a30d" },
  { name: "Green", value: "#16a34a" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#9333ea" },
  { name: "Fuchsia", value: "#c026d3" },
];

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState(value);

  const handlePresetClick = (colorValue: string) => {
    onChange(colorValue);
    setCustomColor(colorValue);
  };

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor);
    onChange(newColor);
  };

  const isValidHex = (hex: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold">Cor do Agente</Label>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            Cores Pré-definidas
          </Label>
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map((color) => {
              const isSelected = value.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handlePresetClick(color.value)}
                  className={cn(
                    "relative w-10 h-10 rounded-md border-2 transition-all hover:scale-110 hover:shadow-md",
                    isSelected
                      ? "border-primary shadow-lg ring-2 ring-primary/20"
                      : "border-muted hover:border-primary/50"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Cor Personalizada</Label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-16 h-16 cursor-pointer rounded-lg border-2 border-border hover:border-primary/50 transition-colors"
                style={{
                  backgroundColor: customColor,
                }}
              />
              {isValidHex(customColor) && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: `linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.1) 48%, rgba(0,0,0,0.1) 52%, transparent 52%)`,
                  }}
                />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Input
                value={customColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setCustomColor(newColor);
                  if (isValidHex(newColor)) {
                    onChange(newColor);
                  }
                }}
                placeholder="#3b82f6"
                className="font-mono text-sm"
                maxLength={7}
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: customColor }}
                />
                <span className="text-xs text-muted-foreground">
                  {isValidHex(customColor) ? "Cor válida" : "Digite um código hex válido"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div
              className="w-12 h-12 rounded-lg border-2 border-border shadow-sm flex-shrink-0"
              style={{ backgroundColor: value }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Cor Selecionada</p>
              <p className="text-sm font-mono font-medium truncate">{value}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

