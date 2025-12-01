import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, PenTool } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';

interface ComponentListItemProps {
  component: any;
  equipment: any;
}

const ComponentListItem: React.FC<ComponentListItemProps> = ({ component, equipment }) => {
  const navigate = useNavigate();
  const currentHours = equipment?.hourMeter || 0;
  const hoursRemaining = component.nextMaintenanceHour - currentHours;
  
  let statusClass = 'text-green-600';
  let statusIcon = <CheckCircle size={16} className="mr-1" />;
  let statusText = 'OK';
  
  if (hoursRemaining <= 0) {
    statusClass = 'text-red-600';
    statusIcon = <AlertTriangle size={16} className="mr-1" />;
    statusText = 'Overdue';
  } else if (hoursRemaining <= 100) {
    statusClass = 'text-yellow-600';
    statusIcon = <AlertTriangle size={16} className="mr-1" />;
    statusText = 'Due Soon';
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{component.name}</div>
        {component.serialNumber && (
          <div className="text-sm text-gray-500">S/N: {component.serialNumber}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{equipment?.name || 'Unknown'}</div>
        <div className="text-sm text-gray-500">{equipment?.model || ''}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          component.category === 'overhaul' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {component.category === 'overhaul' ? 'Overhaul' : 'Midlife'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {component.nextMaintenanceHour} hours
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${statusClass}`}>
        <div className="flex items-center">
          {statusIcon}
          {statusText}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          className="text-blue-600 hover:text-blue-900 mr-3"
          onClick={() => navigate(`/equipment/${component.equipmentId}`)}
        >
          View
        </button>
        <button 
          className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs"
          onClick={() => navigate(`/equipment/${component.equipmentId}`)}
        >
          <PenTool size={12} className="mr-1" /> Maintain
        </button>
      </td>
    </tr>
  );
};

export default ComponentListItem;