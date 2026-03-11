import { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}

const FormSection = ({ title, description, icon, children }: FormSectionProps) => (
  <div className="section-card space-y-5">
    <div className="flex items-center gap-3 border-b border-border pb-4">
      {icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-description mt-0.5">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

export default FormSection;
