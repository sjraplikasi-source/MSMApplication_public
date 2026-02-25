// src/pages/MineMaintenance/HourMeter

import React, { useState, useEffect } from 'react';
import { Clock, ArrowUp, Search, Download } from 'lucide-react';
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
      unit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const loadReadings = async () => {
      const readings: Record<string, HourMeterReading[]> = {};

      for (const unit of equipment) {
        readings[unit.id] = await getHourMeterReadings(unit.id);
      }

      setHourMeterReadings(readings);
    };

    loadReadings();
  }, [equipment]);

  const handleOpenUpdateModal = (unit: any) => {
    setSelectedEquipment(unit);
    setIsUpdateModalOpen(true);
  };

  const toggleHistory = (equipmentId: string) => {
    setExpandedEquipment(expandedEquipment === equipmentId ? null : equipmentId);
  };

  const exportToExcel = async () => {

  const rows: any[] = [];

  for (const unit of equipment) {

    const readings = await getHourMeterReadings(unit.id);

    if (!readings.length) {
      rows.push({
        Code: unit.code || '-',
        Equipment: unit.name,
        Date: unit.lastUpdated
          ? new Date(unit.lastUpdated).toLocaleDateString()
          : '-',
        Hours: unit.hourMeter || 0,
        Source: 'Equipment'
      });
      continue;
    }

    readings.forEach(reading => {
      rows.push({
        Code: unit.code || '-',
        Equipment: unit.name,
        Date: new Date(reading.readingDate).toLocaleDateString(),
        Hours: reading.hours,
        Source: 'Reading'
      });
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Hour Meter Data');

  XLSX.writeFile(wb, 'Hour_Meter_Readings.xlsx');
};

  const sortedEquipment = [...filteredEquipment].sort(
    (a, b) => (b.hourMeter || 0) - (a.hourMeter || 0)
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hour Meter Updates</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm border rounded ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : ''
            }`}
          >
            Grid
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-sm border rounded ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : ''
            }`}
          >
            List
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded"
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white border rounded p-3">
        <div className="flex items-center">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search equipment..."
            className="flex-1 outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CONTENT */}
      {sortedEquipment.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          No equipment found
        </div>
      ) : viewMode === 'grid' ? (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedEquipment.map(unit => (
            <div key={unit.id} className="bg-white border rounded-lg p-4">

              <div className="font-semibold">
                {unit.code} • {unit.name}
              </div>

              <div className="text-sm text-gray-500 mb-2">
                HM : {unit.hourMeter || 0} h
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleHistory(unit.id)}
                  className="flex-1 text-xs border rounded py-1"
                >
                  History
                </button>

                <button
                  onClick={() => handleOpenUpdateModal(unit)}
                  className="flex-1 text-xs bg-blue-600 text-white rounded py-1 flex justify-center items-center gap-1"
                >
                  <ArrowUp size={12} />
                  Update
                </button>
              </div>

              {expandedEquipment === unit.id && (
                <div className="mt-2 text-xs text-gray-500">
                  {(hourMeterReadings[unit.id] || []).slice(0, 5).map(r => (
                    <div key={r.id} className="flex justify-between">
                      <span>{new Date(r.readingDate).toLocaleDateString()}</span>
                      <span>{r.hours} h</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>

      ) : (

        <div className="space-y-3">
          {sortedEquipment.map(unit => (
            <div key={unit.id} className="bg-white border rounded-lg p-4 flex justify-between">

              <div>
                <div className="font-semibold">
                  {unit.code} • {unit.name}
                </div>
                <div className="text-xs text-gray-500">
                  HM : {unit.hourMeter || 0} h
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleHistory(unit.id)}
                  className="text-xs border rounded px-2"
                >
                  History
                </button>

                <button
                  onClick={() => handleOpenUpdateModal(unit)}
                  className="text-xs bg-blue-600 text-white rounded px-2"
                >
                  Update
                </button>
              </div>

            </div>
          ))}
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