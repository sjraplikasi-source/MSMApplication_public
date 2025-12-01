import React, { useState, useEffect } from 'react';
import { Clock, ArrowUp, Search, Calendar, Download } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';
import HourMeterUpdateModal from '@/components/mine/modals/HourMeterUpdateModal';
import * as XLSX from 'xlsx';

interface HourMeterReading {
  id: string;
  equipmentId: string;
  readingDate: string;
  hours: number;
  createdAt: string;
}

const HourMeter: React.FC = () => {
  const { equipment, getHourMeterReadings } = useMaintenanceContext();

  // Debug log for equipment data
  console.log('Equipment data:', equipment);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const [hourMeterReadings, setHourMeterReadings] = useState<Record<string, HourMeterReading[]>>({});

  const filteredEquipment = equipment.filter(
    unit => unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           unit.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
           unit.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const loadHourMeterReadings = async () => {
      const readings: Record<string, HourMeterReading[]> = {};
      for (const unit of equipment) {
        readings[unit.id] = await getHourMeterReadings(unit.id);
      }
      setHourMeterReadings(readings);
    };

    loadHourMeterReadings();
  }, [equipment, getHourMeterReadings]);

  const handleOpenUpdateModal = (unit: any) => {
    setSelectedEquipment(unit);
    setIsUpdateModalOpen(true);
  };

  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
    const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
    return dateB - dateA;
  });

  const calculateAverageHours = (equipmentId: string) => {
    try {
      const readings = hourMeterReadings[equipmentId];
      console.log('Calculating average hours for equipment', equipmentId);
      console.log('Available readings:', readings);
      
      if (!readings || readings.length < 2) {
        console.log('Insufficient readings for calculation');
        return 0;
      }

      const sortedReadings = [...readings].sort((a, b) =>
        new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
      );

      const firstReading = sortedReadings[0];
      const lastReading = sortedReadings[sortedReadings.length - 1];

      console.log('First reading:', firstReading);
      console.log('Last reading:', lastReading);

      const totalHourChange = lastReading.hours - firstReading.hours;
      const totalDays = Math.max(
        1,
        Math.round(
          (new Date(lastReading.readingDate).getTime() - new Date(firstReading.readingDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      console.log('Total hour change:', totalHourChange);
      console.log('Total days:', totalDays);

      const avgHours = totalHourChange / totalDays;
      console.log('Calculated average hours:', avgHours);
      
      return Math.min(24, Math.max(0, Math.round(avgHours * 10) / 10));
    } catch (error) {
      console.error('Error calculating average hours:', error);
      return 0;
    }
  };

  const toggleHistory = (equipmentId: string) => {
    setExpandedEquipment(expandedEquipment === equipmentId ? null : equipmentId);
  };

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = equipment.map(unit => {
      const readings = hourMeterReadings[unit.id] || [];
      const sortedReadings = [...readings].sort((a, b) =>
        new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()
      );

      return {
        'Equipment Name': unit.name,
        Model: unit.model,
        'Serial Number': unit.serialNumber,
        'Current Hour Meter': unit.hourMeter,
        'Average Hours/Day': unit.useAutoCalculation
          ? calculateAverageHours(unit.id)
          : unit.averageHoursPerDay || 0,
        'Last Updated': unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'Never',
        'Reading History': sortedReadings.map(reading => ({
          Date: new Date(reading.readingDate).toLocaleDateString(),
          Hours: reading.hours,
          Change:
            readings[readings.indexOf(reading) + 1] !== undefined
              ? reading.hours - readings[readings.indexOf(reading) + 1].hours
              : null,
        })),
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = exportData.map(item => ({
      Equipment: item['Equipment Name'],
      Model: item.Model,
      'Serial Number': item['Serial Number'],
      'Current Hours': item['Current Hour Meter'],
      'Avg Hours/Day': item['Average Hours/Day'],
      'Last Updated': item['Last Updated'],
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);

    // Create detailed readings sheet
    const detailedData: any[] = [];
    exportData.forEach(item => {
      item['Reading History'].forEach(reading => {
        detailedData.push({
          Equipment: item['Equipment Name'],
          Date: reading.Date,
          Hours: reading.Hours,
          Change: reading.Change !== null ? reading.Change : '',
        });
      });
    });
    const detailedWs = XLSX.utils.json_to_sheet(detailedData);

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Equipment Summary');
    XLSX.utils.book_append_sheet(wb, detailedWs, 'Hour Meter Readings');

    // Set column widths
    const summaryColWidths = [
      { wch: 20 }, // Equipment
      { wch: 15 }, // Model
      { wch: 15 }, // Serial Number
      { wch: 15 }, // Current Hours
      { wch: 15 }, // Avg Hours/Day
      { wch: 15 }, // Last Updated
    ];
    summaryWs['!cols'] = summaryColWidths;

    const detailedColWidths = [
      { wch: 20 }, // Equipment
      { wch: 15 }, // Date
      { wch: 15 }, // Hours
      { wch: 15 }, // Change
    ];
    detailedWs['!cols'] = detailedColWidths;

    // Generate Excel file
    XLSX.writeFile(wb, 'Hour_Meter_Readings.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Hour Meter Updates</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download size={18} className="mr-2" /> Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 mb-6">
          <Search size={20} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search equipment..."
            className="flex-1 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {sortedEquipment.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No equipment found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEquipment.map(unit => (
              <div key={unit.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{unit.name}</div>
                      <div className="text-sm text-gray-500">
                        {unit.model} - S/N: {unit.serialNumber}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock size={16} className="text-gray-400 mr-2" />
                      <span className="font-medium">{unit.hourMeter || 0} hours</span>
                    </div>

                    <div className="text-sm">
                      <div className="text-gray-500">Avg. Hours/Day:</div>
                      <div className="font-medium">
                        {unit.useAutoCalculation
                          ? calculateAverageHours(unit.id)
                          : unit.averageHoursPerDay || 0}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => toggleHistory(unit.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                      >
                        View History
                      </button>
                      <button
                        onClick={() => handleOpenUpdateModal(unit)}
                        className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <ArrowUp size={14} className="mr-1" /> Update Hours
                      </button>
                    </div>
                  </div>
                </div>

                {expandedEquipment === unit.id && (
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Hour Meter History</h3>
                    {(!hourMeterReadings[unit.id] || hourMeterReadings[unit.id].length === 0) ? (
                      <p className="text-sm text-gray-500">No history available</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Hour Meter
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Change
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[...hourMeterReadings[unit.id]]
                              .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
                              .map((reading, index, array) => {
                                const previousReading = array[index + 1]?.hours || 0;
                                const change = reading.hours - previousReading;

                                return (
                                  <tr key={reading.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex items-center">
                                        <Calendar size={14} className="mr-1 text-gray-400" />
                                        {new Date(reading.readingDate).toLocaleDateString()}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                      {reading.hours} hours
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      {index < array.length - 1 && (
                                        <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                          {change >= 0 ? '+' : ''}
                                          {change} hours
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEquipment && (
        <HourMeterUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment}
        />
      )}
    </div>
  );
};

export default HourMeter;