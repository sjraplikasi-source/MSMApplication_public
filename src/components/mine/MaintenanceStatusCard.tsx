import React from 'react';

interface MaintenanceStatusCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

const MaintenanceStatusCard: React.FC<MaintenanceStatusCardProps> = ({ 
  title, 
  count, 
  icon,
  color
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'red':
        return 'bg-red-50 border-red-200 text-red-600';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-600';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200 text-yellow-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  return (
    <div className={`border rounded-lg shadow-sm p-4 ${getColorClasses()}`}>
      <div className="flex items-center space-x-3">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-3xl font-bold mt-2">{count}</p>
    </div>
  );
};

export default MaintenanceStatusCard;