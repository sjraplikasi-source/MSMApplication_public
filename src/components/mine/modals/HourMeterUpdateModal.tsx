import React, { useState } from 'react';
import { X, Clock, Settings, Calendar } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';

interface HourMeterUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: any;
}

const HourMeterUpdateModal: React.FC<HourMeterUpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  equipment 
}) => {
  const { updateEquipmentHourMeter, getHourMeterReadings } = useMaintenanceContext();
  const [hourMeter, setHourMeter] = useState(equipment.hourMeter || 0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isSettingHours, setIsSettingHours] = useState(false);
  const [averageHoursPerDay, setAverageHoursPerDay] = useState(
    equipment.averageHoursPerDay || 12
  );
  const [useAutoCalculation, setUseAutoCalculation] = useState(
    equipment.useAutoCalculation !== false
  );

  if (!isOpen) return null;

  const validateHourMeterInput = async () => {
    if (hourMeter < (equipment.hourMeter || 0)) {
      setError('New hour meter value cannot be less than the current value');
      return false;
    }

    const readings = await getHourMeterReadings(equipment.id);
    console.log('Validating hour meter input:', {
      hourMeter,
      date,
      readings
    });
    
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()
    );

    const previousReading = sortedReadings.find(reading => 
      new Date(reading.readingDate) < new Date(date)
    );

    if (previousReading) {
      const daysDiff = (new Date(date).getTime() - new Date(previousReading.readingDate).getTime()) 
        / (1000 * 60 * 60 * 24);
      const hourDiff = hourMeter - previousReading.hours;
      const avgHoursPerDay = hourDiff / daysDiff;

      console.log('Validation calculations:', {
        daysDiff,
        hourDiff,
        avgHoursPerDay
      });

      if (avgHoursPerDay > 24) {
        setError(`The increase of ${hourDiff} hours over ${Math.round(daysDiff)} days averages to ${avgHoursPerDay.toFixed(1)} hours per day, which exceeds the maximum of 24 hours per day`);
        return false;
      }
    }

    const futureReading = sortedReadings.find(reading => 
      new Date(reading.readingDate) > new Date(date)
    );

    if (futureReading && hourMeter > futureReading.hours) {
      setError(`Hour meter value cannot exceed the future reading of ${futureReading.hours} hours on ${new Date(futureReading.readingDate).toLocaleDateString()}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const isValid = await validateHourMeterInput();
      if (!isValid) return;

      console.log('Submitting hour meter update:', {
        equipmentId: equipment.id,
        hourMeter,
        date,
        averageHoursPerDay,
        useAutoCalculation
      });

      await updateEquipmentHourMeter(
        equipment.id,
        hourMeter,
        date,
        averageHoursPerDay,
        useAutoCalculation
      );
      onClose();
    } catch (err) {
      console.error('Error updating hour meter:', err);
      setError('Failed to update hour meter');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Update Hour Meter</h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Clock size={18} className="text-gray-500 mr-2" />
              <p className="text-gray-600">
                Current hour meter: <span className="font-medium">{equipment.hourMeter || 0} hours</span>
              </p>
            </div>
            <p className="text-gray-600 text-sm">
              Last updated: {equipment.lastUpdated 
                ? new Date(equipment.lastUpdated).toLocaleDateString() 
                : 'Never'}
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Hour Meter Reading *
              </label>
              <input
                type="number"
                className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                value={hourMeter}
                onChange={(e) => {
                  setHourMeter(parseInt(e.target.value) || 0);
                  setError('');
                }}
              />
              {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setError('');
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
                <Calendar size={16} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Average Hours Per Day</h3>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  onClick={() => setIsSettingHours(!isSettingHours)}
                >
                  <Settings size={16} className="inline mr-1" />
                  Configure
                </button>
              </div>

              {isSettingHours && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="auto"
                      checked={useAutoCalculation}
                      onChange={() => setUseAutoCalculation(true)}
                      className="mr-2"
                    />
                    <label htmlFor="auto" className="text-sm text-gray-700">
                      Calculate automatically from history
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="manual"
                      checked={!useAutoCalculation}
                      onChange={() => setUseAutoCalculation(false)}
                      className="mr-2"
                    />
                    <label htmlFor="manual" className="text-sm text-gray-700">
                      Set manually
                    </label>
                  </div>

                  {!useAutoCalculation && (
                    <div className="pl-6">
                      <input
                        type="number"
                        value={averageHoursPerDay}
                        onChange={(e) => setAverageHoursPerDay(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                        min="0"
                        max="24"
                        step="0.1"
                      />
                      <span className="ml-2 text-sm text-gray-500">hours/day</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HourMeterUpdateModal;