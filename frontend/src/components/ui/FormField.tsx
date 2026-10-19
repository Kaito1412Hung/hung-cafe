import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-xl border bg-white px-3.5 text-sm text-coffee-950 placeholder:text-coffee-400/80 transition " +
  "focus:outline-none focus:ring-4 focus:ring-coffee-200/60 focus:border-coffee-500";

const fieldState = (invalid?: boolean) =>
  invalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-coffee-200";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-coffee-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-coffee-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(fieldBase, "h-11", fieldState(invalid), className)} aria-invalid={invalid} {...props} />;
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(fieldBase, "min-h-24 resize-none py-2.5", fieldState(invalid), className)}
      aria-invalid={invalid}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-11 cursor-pointer pr-8", fieldState(), className)} {...props}>
      {children}
    </select>
  );
}
