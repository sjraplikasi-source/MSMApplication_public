// src/components/ui/textarea.tsx

import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`border border-gray-300 px-3 py-2 rounded-md w-full min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
