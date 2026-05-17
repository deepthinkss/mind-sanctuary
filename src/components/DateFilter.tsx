import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateFilterProps {
  // Currently selected date
  selectedDate: Date | undefined;

  // Function called when date changes
  onSelect: (date: Date | undefined) => void;
}

export function DateFilter({
  selectedDate,
  onSelect,
}: DateFilterProps) {

  // Controls popover open/close state
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">

      {/* Calendar popup wrapper */}
      <Popover open={open} onOpenChange={setOpen}>

        {/* Button that opens the calendar */}
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 justify-start text-left text-sm font-normal",

              // Muted text when no date selected
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />

            {/* Show selected date or placeholder */}
            {selectedDate
              ? format(selectedDate, "MMM d, yyyy")
              : "Filter by date"}
          </Button>
        </PopoverTrigger>

        {/* Calendar dropdown */}
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}

            // Handle date selection
            onSelect={(date) => {
              onSelect(date);

              // Close calendar after selecting date
              setOpen(false);
            }}

            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Clear selected date button */}
      {selectedDate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onSelect(undefined)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
