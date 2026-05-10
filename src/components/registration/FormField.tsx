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
  disabled?: boolean;
}

interface SelectFieldProps extends BaseProps {
  options: Array<string | { value: string; label: string }>;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

interface DateFieldProps extends BaseProps {
  value: Date | undefined;
  onChange: (val: Date | undefined) => void;
}

export const TextField = ({
  label, name, required, type = "text", value, onChange, placeholder, disabled, className,
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
      disabled={disabled}
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
        {options.map((opt) => {
          const option = typeof opt === "string" ? { value: opt, label: opt } : opt;

          return (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          );
        })}
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

interface SchoolYearFieldProps extends BaseProps {
  value: string;
  onChange: (val: string) => void;
}

export const SchoolYearField = ({
  label, name, required, value, className,
  onChange,
}: SchoolYearFieldProps) => {
  const normalizeStartYear = (input: string) => input.replace(/\D/g, "").slice(0, 4);

  const getAutoEndYear = (startYear: string) => {
    if (startYear.length !== 4) {
      return "";
    }

    return String(Number(startYear) + 1).padStart(4, "0");
  };

  const parts = value ? value.split("-") : ["", ""];
  const startYear = normalizeStartYear(parts[0] || "");
  const autoEndYear = getAutoEndYear(startYear);
  const endYear = startYear.length === 4 ? autoEndYear : "";

  const handleStartChange = (start: string) => {
    const normalizedStart = normalizeStartYear(start);
    const normalizedEnd = getAutoEndYear(normalizedStart);

    onChange(normalizedStart ? `${normalizedStart}-${normalizedEnd}` : "");
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={`${name}_start`}
          name={`${name}_start`}
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={startYear}
          onChange={(e) => handleStartChange(e.target.value)}
          placeholder="YYYY"
          className="h-10 bg-background text-center"
        />
        <span className="text-muted-foreground font-medium">-</span>
        <Input
          id={`${name}_end`}
          name={`${name}_end`}
          type="text"
          value={endYear}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          placeholder="auto"
          className="h-10 bg-background text-center"
        />
      </div>
    </div>
  );
};
