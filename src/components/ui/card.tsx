//src/components/ui/card.tsx
import React, { ReactNode } from 'react';

export const Card = ({ children }: { children: ReactNode }) => (
  <div className="border rounded-lg shadow p-4 bg-white">{children}</div>
);

export const CardContent = ({ children }: { children: ReactNode }) => (
  <div className="mt-2">{children}</div>
);
