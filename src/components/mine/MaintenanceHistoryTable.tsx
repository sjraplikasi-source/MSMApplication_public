import React from 'react';
import { Calendar } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';

interface MaintenanceHistoryTableProps {
  history: any[];
  showEquipment?: boolean;
}

const MaintenanceHistoryTable: React.FC<MaintenanceHistoryTableProps> = ({ 
  history, 
  showEquipment = true 
}) => {
  const { equipment } = useMaintenanceContext();

  const getEquipmentName = (equipmentId: string) => {
    const unit = equipment.find(e => e.id === equipmentId);
    return unit ? unit.name : 'Unknown Equipment';
  };

  if (history.length === 0) {
    return <p className="text-gray-500">No maintenance history recorded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showEquipment && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equipment
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Component
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hour Meter
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map((record, index) => (
            <tr key={index}>
              {showEquipment && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getEquipmentName(record.equipmentId)}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.componentName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  record.maintenanceType === 'overhaul' 
                    ? 'bg-blue-100 text-blue-800' 
                    : record.maintenanceType === 'midlife'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {record.maintenanceType.charAt(0).toUpperCase() + record.maintenanceType.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1 text-gray-400" />
                  {new Date(record.date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {record.hourMeter} hours
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {record.notes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaintenanceHistoryTable;