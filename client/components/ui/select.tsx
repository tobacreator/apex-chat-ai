import * as React from "react";

// Main Select component (renders native <select>)
export function Select({ value, onValueChange, children, className, ...props }: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onValueChange(e.target.value)}
      className={"block w-full border rounded-md p-2 " + (className || "")}
      {...props}
    >
      {children}
    </select>
  );
}

// SelectTrigger is a fragment for native select
export function SelectTrigger({ children }: React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>;
}

// SelectValue renders a disabled placeholder option
export function SelectValue({ placeholder }: { placeholder: string }) {
  return <option value="" disabled>{placeholder}</option>;
}

// SelectContent is a fragment for native select
export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// SelectItem renders an <option>
export function SelectItem({ value, children, className, ...props }: { value: string; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <option value={value} className={className} {...props}>
      {children}
    </option>
  );
} 