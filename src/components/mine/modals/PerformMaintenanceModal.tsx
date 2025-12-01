import React, { useState } from 'react';
import { X, PenTool } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';

interface PerformMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: any;
  currentHours: number;
}

const PerformMaintenanceModal: React.FC<PerformMaintenanceModalProps> = ({ 
  isOpen, 
  onClose, 
  component,
  currentHours
}) => {
  const { performMaintenance } = useMaintenanceContext();
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate next maintenance hour
    const nextMaintenanceHour = currentHours + component.maintenanceInterval;
    
    performMaintenance({
      componentId: component.id,
      componentName: component.name,
      equipmentId: component.equipmentId,
      date,
      hourMeter: currentHours,
      nextMaintenanceHour,
      notes,
      maintenanceType: component.category,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Perform Maintenance</h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-800">{component.name}</h3>
            <p className="text-gray-600 text-sm">
              Current hour meter: {currentHours} hours
            </p>
            <p className="text-gray-600 text-sm">
              Next scheduled maintenance: {component.nextMaintenanceHour} hours
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter details about the maintenance performed"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm text-blue-700">
              This will reset the maintenance schedule for this component.
              Next maintenance will be due at {currentHours + component.maintenanceInterval} hours.
            </p>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 flex items-center bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <PenTool size={16} className="mr-1" /> Complete Maintenance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformMaintenanceModal;