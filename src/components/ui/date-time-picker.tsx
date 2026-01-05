import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  min,
  disabled,
  className,
  placeholder = "Selecione data e hora",
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(new Date(value), "HH:mm") : ""
  );

  const minDate = min ? new Date(min) : new Date();
  minDate.setHours(0, 0, 0, 0);
  
  const getMinTime = () => {
    if (!min || !selectedDate) return "00:00";
    const minDateTime = new Date(min);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    minDateTime.setHours(0, 0, 0, 0);
    
    if (selectedDateOnly.getTime() === minDateTime.getTime()) {
      return format(new Date(min), "HH:mm");
    }
    return "00:00";
  };

  React.useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setTimeValue(format(date, "HH:mm"));
    }
  }, [value]);


  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    
    const currentTime = timeValue || "00:00";
    const [hours, minutes] = currentTime.split(":");
    const newDateTime = new Date(date);
    newDateTime.setHours(parseInt(hours) || 0);
    newDateTime.setMinutes(parseInt(minutes) || 0);
    
    if (min && newDateTime < new Date(min)) {
      const minDateTime = new Date(min);
      newDateTime.setHours(minDateTime.getHours());
      newDateTime.setMinutes(minDateTime.getMinutes());
      setTimeValue(format(minDateTime, "HH:mm"));
    }
    
    onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    
    if (selectedDate && newTime) {
      const [hours, minutes] = newTime.split(":");
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(parseInt(hours) || 0);
      newDateTime.setMinutes(parseInt(minutes) || 0);
      
      if (min && newDateTime < new Date(min)) {
        const minDateTime = new Date(min);
        newDateTime.setHours(minDateTime.getHours());
        newDateTime.setMinutes(minDateTime.getMinutes());
        setTimeValue(format(minDateTime, "HH:mm"));
        onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
        return;
      }
      
      onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const displayValue = selectedDate && timeValue
    ? `${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às ${timeValue}`
    : selectedDate
    ? `${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              const dateOnly = new Date(date);
              dateOnly.setHours(0, 0, 0, 0);
              return dateOnly < minDate;
            }}
            initialFocus
          />
          <div className="space-y-2 border-t pt-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário
            </Label>
            <div className="relative">
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                min={getMinTime()}
                className="w-full pr-10"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {selectedDate && timeValue && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

