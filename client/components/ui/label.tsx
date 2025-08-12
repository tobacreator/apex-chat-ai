import * as React from "react";
import { cn } from "@/lib/utils"; // Assuming "@/lib/utils" is correctly configured for cn utility

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-gray-700", className)}
      {...props}
    />
  );
} 