import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Clock } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';

interface UpcomingMaintenanceTableProps {
  maintenanceItems: any[];
}

const UpcomingMaintenanceTable: React.FC<UpcomingMaintenanceTableProps> = ({ maintenanceItems }) => {
  const navigate = useNavigate();
  const { equipment } = useMaintenanceContext();

  const getEquipmentName = (equipmentId: string) => {
    const unit = equipment.find(e => e.id === equipmentId);
    return unit ? unit.name : 'Unknown Equipment';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Equipment
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Component
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due at (hours)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hours Remaining
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {maintenanceItems.map((item, index) => {
            const hoursRemaining = item.nextMaintenanceHour - item.currentHours;
            let statusClass = 'text-green-600';
            
            if (hoursRemaining <= 0) {
              statusClass = 'text-red-600 font-medium';
            } else if (hoursRemaining <= 100) {
              statusClass = 'text-yellow-600';
            }
            
            return (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getEquipmentName(item.equipmentId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.component}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1 text-gray-400" />
                    {item.nextMaintenanceHour}
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${statusClass}`}>
                  {hoursRemaining <= 0 
                    ? `Overdue by ${Math.abs(hoursRemaining)} hours` 
                    : `${hoursRemaining} hours`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    className="text-blue-600 hover:text-blue-900"
                    onClick={() => navigate(`/equipment/${item.equipmentId}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UpcomingMaintenanceTable;