import React, { useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { useMaintenanceContext } from "../../context/MaintenanceContext";
import { addDays, format } from 'date-fns';
import * as XLSX from 'xlsx';

interface MaintenancePlan {
  equipment: string;
  component: string;
  type: string;
  currentHours: number;
  nextService: number;
  estimatedDate: string;
  hoursRemaining: number;
}

const MaintenancePlanning: React.FC = () => {
  const { equipment, components } = useMaintenanceContext();

  // Log equipment data for debugging
  console.log('Equipment data in MaintenancePlanning:', equipment);

  const [planningPeriod, setPlanningPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const getEquipmentAverageHours = (equipmentId: string): number => {
    const unit = equipment.find(e => e.id === equipmentId);
    if (!unit) return 0;

    // Log averageHoursPerDay for verification
    console.log('Average hours per day for', equipmentId, ':', unit.averageHoursPerDay);

    // Use auto calculation or manual as provided
    return unit.useAutoCalculation ? unit.averageHoursPerDay || 0 : unit.averageHoursPerDay || 0;
  };

  const calculateEstimatedDate = (hoursRemaining: number, equipmentId: string): string => {
    const avgHoursPerDay = getEquipmentAverageHours(equipmentId);
    if (avgHoursPerDay <= 0) return 'N/A';

    const daysUntilService = Math.ceil(hoursRemaining / avgHoursPerDay);
    return format(addDays(new Date(), daysUntilService), 'dd/MM/yyyy');
  };

  const calculateNextService = (currentHours: number, interval: number): number => {
    return Math.ceil(currentHours / interval) * interval;
  };

  const generateMaintenancePlan = (): MaintenancePlan[] => {
    const plan: MaintenancePlan[] = [];

    equipment.forEach(unit => {
      const currentHours = unit.hourMeter || 0;
      const unitComponents = components.filter(c => c.equipmentId === unit.id);

      // Add component maintenance
      unitComponents.forEach(component => {
        const hoursRemaining = component.nextMaintenanceHour - currentHours;

        plan.push({
          equipment: unit.name,
          component: component.name,
          type: component.category,
          currentHours,
          nextService: component.nextMaintenanceHour,
          estimatedDate: calculateEstimatedDate(hoursRemaining, unit.id),
          hoursRemaining,
        });
      });

      // Add periodic services
      [250, 500, 1000, 2000].forEach(interval => {
        const nextService = calculateNextService(currentHours, interval);
        const hoursRemaining = nextService - currentHours;

        if (hoursRemaining > 0) {
          plan.push({
            equipment: unit.name,
            component: `${interval}hr Service`,
            type: 'periodic',
            currentHours,
            nextService,
            estimatedDate: calculateEstimatedDate(hoursRemaining, unit.id),
            hoursRemaining,
          });
        }
      });
    });

    // Filter based on planning period
    const maxDays = planningPeriod === 'weekly' ? 7 : planningPeriod === 'monthly' ? 30 : 365;

    return plan
      .filter(item => {
        if (item.estimatedDate === 'N/A') return true;
        const itemDate = new Date(item.estimatedDate.split('/').reverse().join('-'));
        const maxDate = addDays(new Date(), maxDays);
        return itemDate <= maxDate;
      })
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  };

  const exportToExcel = () => {
    const plan = generateMaintenancePlan();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(plan);

    const colWidths = [
      { wch: 20 }, // Equipment
      { wch: 20 }, // Component
      { wch: 15 }, // Type
      { wch: 15 }, // Current Hours
      { wch: 15 }, // Next Service
      { wch: 15 }, // Estimated Date
      { wch: 15 }, // Hours Remaining
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Plan');

    const period = planningPeriod.charAt(0).toUpperCase() + planningPeriod.slice(1);
    XLSX.writeFile(wb, `${period}_Maintenance_Plan.xlsx`);
  };

  const maintenancePlan = generateMaintenancePlan();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Planning</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download size={18} className="mr-2" /> Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FileSpreadsheet size={20} className="mr-2" />
            Planning Period
          </h2>

          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-md ${
                planningPeriod === 'weekly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setPlanningPeriod('weekly')}
            >
              Weekly
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                planningPeriod === 'monthly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setPlanningPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                planningPeriod === 'yearly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setPlanningPeriod('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component/Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Remaining
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {maintenancePlan.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.equipment}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.component}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.type === 'overhaul'
                          ? 'bg-blue-100 text-blue-800'
                          : item.type === 'midlife'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.currentHours}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nextService}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.estimatedDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={
                        item.hoursRemaining <= 0
                          ? 'text-red-600 font-medium'
                          : item.hoursRemaining <= 100
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }
                    >
                      {item.hoursRemaining}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePlanning;
