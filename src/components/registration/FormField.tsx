import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BaseProps {
  label: string;
  name: string;
  required?: boolean;
  className?: string;
}

interface TextFieldProps extends BaseProps {
  type?: "text" | "number" | "tel" | "url" | "email";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

interface SelectFieldProps extends BaseProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

interface DateFieldProps extends BaseProps {
  value: Date | undefined;
  onChange: (val: Date | undefined) => void;
}

export const TextField = ({
  label, name, required, type = "text", value, onChange, placeholder, className,
}: TextFieldProps) => (
  <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={name} className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <Input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || label}
      required={required}
      className="h-10 bg-background"
    />
  </div>
);

export const SelectField = ({
  label, name, required, options, value, onChange, placeholder, className,
}: SelectFieldProps) => (
  <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={name} className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 bg-background">
        <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const DateField = ({
  label, name, required, value, onChange, className,
}: DateFieldProps) => (
  <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={name} className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-start text-left font-normal bg-background",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          captionLayout="dropdown-buttons"
          fromYear={1950}
          toYear={new Date().getFullYear()}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  </div>
);
