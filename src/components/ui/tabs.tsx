// src/components/ui/tabs.tsx
import React, { ReactNode, useState } from 'react';

interface TabProps {
  label: string;
  value: string;
  children: ReactNode;
}

export const Tab = ({ children }: TabProps) => <>{children}</>;

interface TabsProps {
  children: React.ReactElement<TabProps>[];
  defaultValue: string;
}

export const Tabs = ({ children, defaultValue }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        {children.map((child) => (
          <button
            key={child.props.value}
            onClick={() => setActiveTab(child.props.value)}
            className={`px-4 py-2 rounded ${
              child.props.value === activeTab ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {child.props.label}
          </button>
        ))}
      </div>
      <div>
        {children.map((child) =>
          child.props.value === activeTab ? <div key={child.props.value}>{child}</div> : null
        )}
      </div>
    </div>
  );
};
