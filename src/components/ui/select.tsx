import * as React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { label: string; value: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function Select({
  options = [],
  value,
  onValueChange,
  placeholder = "Select option",
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 text-sm ${className}`}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
