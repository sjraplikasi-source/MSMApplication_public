import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddMaintenanceScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Equipment {
  id: string;
  name: string;
  model: string;
  hour_meter: number;
}

interface Component {
  id: string;
  name: string;
  equipment_id: string;
}

interface ServiceType {
  id: string;
  name: string;
  category: string;
  hour_interval: number;
}

const AddMaintenanceScheduleModal: React.FC<AddMaintenanceScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [equipmentData, componentsData, serviceTypesData] = await Promise.all([
        supabase.from('equipment').select('*').order('name'),
        supabase.from('components').select('*').order('name'),
        supabase.from('service_types').select('*').order('name')
      ]);

      if (equipmentData.error) throw equipmentData.error;
      if (componentsData.error) throw componentsData.error;
      if (serviceTypesData.error) throw serviceTypesData.error;

      setEquipment(equipmentData.data || []);
      setComponents(componentsData.data || []);
      setServiceTypes(serviceTypesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedServiceType) {
      setError('Please select a service type');
      return;
    }

    if (!(selectedEquipment || selectedComponent)) {
      setError('Please select either equipment or component');
      return;
    }

    const serviceType = serviceTypes.find(st => st.id === selectedServiceType);
    if (!serviceType) return;

    const equipmentItem = equipment.find(e => e.id === selectedEquipment);
    const plannedHourMeter = equipmentItem ? 
      equipmentItem.hour_meter + serviceType.hour_interval : 
      0;

    try {
      const { error: insertError } = await supabase
        .from('maintenance_schedules')
        .insert([{
          equipment_id: selectedEquipment || null,
          component_id: selectedComponent || null,
          service_type_id: selectedServiceType,
          planned_date: plannedDate || null,
          planned_hour_meter: plannedHourMeter,
          notes: notes || null
        }]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating schedule:', error);
      setError('Failed to create maintenance schedule');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Schedule Maintenance</h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value)}
                >
                  <option value="">Select a service type</option>
                  {serviceTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.hour_interval} hours)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedEquipment}
                  onChange={(e) => {
                    setSelectedEquipment(e.target.value);
                    setSelectedComponent(''); // Reset component when equipment changes
                  }}
                  disabled={!!selectedComponent}
                >
                  <option value="">Select equipment</option>
                  {equipment.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.model} ({item.hour_meter} hours)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedComponent}
                  onChange={(e) => {
                    setSelectedComponent(e.target.value);
                    setSelectedEquipment(''); // Reset equipment when component changes
                  }}
                  disabled={!!selectedEquipment}
                >
                  <option value="">Select component</option>
                  {components.map(component => (
                    <option key={component.id} value={component.id}>
                      {component.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planned Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                  />
                  <Calendar size={16} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or instructions..."
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
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
                Schedule Maintenance
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddMaintenanceScheduleModal;