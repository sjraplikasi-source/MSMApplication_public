import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, PenTool, MoreHorizontal } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';
import PerformMaintenanceModal from './modals/PerformMaintenanceModal';

interface ComponentCardProps {
  component: any;
  equipmentHours: number;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ component, equipmentHours }) => {
  const { deleteComponent } = useMaintenanceContext();
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hoursRemaining = component.nextMaintenanceHour - equipmentHours;
  
  let statusColor = 'bg-green-50 border-green-200 text-green-700';
  let statusIcon = <CheckCircle size={16} className="text-green-500" />;
  let statusText = 'Good';
  
  if (hoursRemaining <= 0) {
    statusColor = 'bg-red-50 border-red-200 text-red-700';
    statusIcon = <AlertTriangle size={16} className="text-red-500" />;
    statusText = 'Overdue';
  } else if (hoursRemaining <= 100) {
    statusColor = 'bg-yellow-50 border-yellow-200 text-yellow-700';
    statusIcon = <AlertTriangle size={16} className="text-yellow-500" />;
    statusText = 'Due Soon';
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this component?')) {
      deleteComponent(component.id);
    }
    setIsMenuOpen(false);
  };

  const getCategoryLabel = (category: string) => {
    return category === 'overhaul' ? 'Overhaul' : 'Midlife';
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 relative">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-gray-800">{component.name}</h3>
          <div className="relative">
            <button 
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <MoreHorizontal size={18} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  <button 
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setIsMaintenanceModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    Perform Maintenance
                  </button>
                  <button 
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {component.serialNumber && (
          <p className="text-gray-500 text-sm">S/N: {component.serialNumber}</p>
        )}
        
        <div className="mt-3 flex justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${
            component.category === 'overhaul' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-purple-100 text-purple-700'
          }`}>
            {getCategoryLabel(component.category)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full flex items-center ${statusColor}`}>
            {statusIcon}
            <span className="ml-1">{statusText}</span>
          </span>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Installation Date:</span>
            <span>{component.installationDate || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Maintenance Interval:</span>
            <span>{component.maintenanceInterval} hours</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Next Maintenance:</span>
            <span className="font-medium">{component.nextMaintenanceHour} hours</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Hours Remaining:</span>
            <span className={hoursRemaining <= 0 ? 'text-red-600 font-medium' : ''}>
              {hoursRemaining <= 0 
                ? `Overdue by ${Math.abs(hoursRemaining)}` 
                : hoursRemaining}
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <button 
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
            onClick={() => setIsMaintenanceModalOpen(true)}
          >
            <PenTool size={16} className="mr-2" /> Perform Maintenance
          </button>
        </div>
      </div>
      
      <PerformMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        component={component}
        currentHours={equipmentHours}
      />
    </div>
  );
};

export default ComponentCard;