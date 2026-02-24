// src/pages/MineMaintenance/HourMeter
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

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const [hourMeterReadings, setHourMeterReadings] = useState<Record<string, HourMeterReading[]>>({});

  const filteredEquipment = equipment.filter(
    unit =>
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
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
    return (b.hourMeter || 0) - (a.hourMeter || 0);
  });

  const calculateAverageHours = (equipmentId: string) => {
    const readings = hourMeterReadings[equipmentId];

    if (!readings || readings.length < 2) return 0;

    const sorted = [...readings].sort(
      (a, b) => new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
    );

    const delta = sorted[sorted.length - 1].hours - sorted[0].hours;
    const days = Math.max(
      1,
      Math.round(
        (new Date(sorted[sorted.length - 1].readingDate).getTime() -
          new Date(sorted[0].readingDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    return Math.min(24, Math.round((delta / days) * 10) / 10);
  };

  const getStatusColor = (hours: number, avg: number) => {
    if (hours === 0) return 'text-gray-400';
    if (avg === 0) return 'text-yellow-500';
    if (avg > 20) return 'text-red-500';
    return 'text-blue-600';
  };

  const toggleHistory = (equipmentId: string) => {
    setExpandedEquipment(expandedEquipment === equipmentId ? null : equipmentId);
  };

  const exportToExcel = () => {
    const summaryData = equipment.map(unit => ({
      Equipment: unit.name,
      Model: unit.model,
      'Serial Number': unit.serialNumber,
      'Current Hours': unit.hourMeter,
      'Avg Hours/Day': unit.useAutoCalculation
        ? calculateAverageHours(unit.id)
        : unit.averageHoursPerDay || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, 'Hour_Meter_Readings.xlsx');
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
  <h1 className="text-2xl font-bold text-gray-800">Hour Meter Updates</h1>

  <div className="flex gap-2">

    <button
      onClick={() => setViewMode('grid')}
      className={`px-3 py-1 text-sm rounded border ${
        viewMode === 'grid'
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white'
      }`}
    >
      Grid
    </button>

    <button
      onClick={() => setViewMode('list')}
      className={`px-3 py-1 text-sm rounded border ${
        viewMode === 'list'
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white'
      }`}
    >
      List
    </button>

    <button
      onClick={exportToExcel}
      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
    >
      <Download size={18} className="mr-2" /> Export
    </button>

  </div>
</div>
        <h1 className="text-2xl font-bold text-gray-800">Hour Meter Updates</h1>

        <button
          onClick={exportToExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download size={18} className="mr-2" /> Export
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center border rounded-md px-3 py-2">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search equipment..."
            className="flex-1 outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* GRID */}
      {sortedEquipment.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No equipment found
        </div>
      ) : (
       {viewMode === 'grid' ? (

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {sortedEquipment.map(unit => {
) : (

  <div className="space-y-3">
    {sortedEquipment.map(unit => {

      const avg = unit.useAutoCalculation
        ? calculateAverageHours(unit.id)
        : unit.averageHoursPerDay || 0;

      const statusColor = getStatusColor(unit.hourMeter || 0, avg);

      return (
        <div key={unit.id} className="bg-white border rounded-lg p-4">

          <div className="flex justify-between items-center">

            <div>
              <div className="font-semibold">
                {unit.code} • {unit.name}
              </div>
              <div className="text-xs text-gray-500">
                {unit.model} • S/N: {unit.serialNumber}
              </div>
            </div>

            <div className="text-right">
              <div className={`text-lg font-bold ${statusColor}`}>
                {unit.hourMeter || 0} h
              </div>
              <div className="text-xs text-gray-500">
                Avg : {avg}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleHistory(unit.id)}
                className="text-xs border rounded px-2 py-1"
              >
                History
              </button>

              <button
                onClick={() => handleOpenUpdateModal(unit)}
                className="text-xs bg-blue-600 text-white rounded px-2 py-1"
              >
                Update
              </button>
            </div>

          </div>

          {expandedEquipment === unit.id && (
            <div className="mt-3 border-t pt-2 text-xs">
              {!hourMeterReadings[unit.id]?.length ? (
                <div className="text-gray-400">No history</div>
              ) : (
                hourMeterReadings[unit.id]
                  .slice(0, 5)
                  .map(r => (
                    <div key={r.id} className="flex justify-between">
                      <span>{new Date(r.readingDate).toLocaleDateString()}</span>
                      <span>{r.hours} h</span>
                    </div>
                  ))
              )}
            </div>
          )}

        </div>
      );
    })}
  </div>

)}
          {sortedEquipment.map(unit => {
            const avg = unit.useAutoCalculation
              ? calculateAverageHours(unit.id)
              : unit.averageHoursPerDay || 0;

            const statusColor = getStatusColor(unit.hourMeter || 0, avg);

            return (
              <div
                key={unit.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition"
              >
                <div className="p-4 space-y-3">

                  {/* TITLE */}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {unit.code} • {unit.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {unit.model} • S/N: {unit.serialNumber}
                    </div>
                  </div>

                  {/* HOURS */}
                  <div className={`text-2xl font-bold ${statusColor}`}>
                    {unit.hourMeter || 0} h
                  </div>

                  {/* AVG */}
                  <div className="text-sm text-gray-600">
                    Avg / Day : <span className="font-medium">{avg}</span>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => toggleHistory(unit.id)}
                      className="flex-1 text-xs border rounded py-1 hover:bg-gray-50"
                    >
                      History
                    </button>

                    <button
                      onClick={() => handleOpenUpdateModal(unit)}
                      className="flex-1 text-xs bg-blue-600 text-white rounded py-1 hover:bg-blue-700 flex justify-center items-center gap-1"
                    >
                      <ArrowUp size={12} /> Update
                    </button>
                  </div>
                </div>

                {/* HISTORY */}
                {expandedEquipment === unit.id && (
                  <div className="border-t p-3 text-sm">
                    {!hourMeterReadings[unit.id]?.length ? (
                      <div className="text-gray-400 text-xs">
                        No history available
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {[...hourMeterReadings[unit.id]]
                          .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
                          .slice(0, 5)
                          .map(reading => (
                            <div key={reading.id} className="flex justify-between text-xs">
                              <span>{new Date(reading.readingDate).toLocaleDateString()}</span>
                              <span>{reading.hours} h</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
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