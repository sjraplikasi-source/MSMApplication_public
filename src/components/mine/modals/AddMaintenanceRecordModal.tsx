import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddMaintenanceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scheduleId?: string;
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
  planned_hour_interval: number;
}

interface Employee {
  id: string;
  name: string;
  position: string;
}

interface LastMaintenance {
  id: string;
  hour_meter: number;
  execution_date: string;
}

const AddMaintenanceRecordModal: React.FC<AddMaintenanceRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  scheduleId
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [technicians, setTechnicians] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastMaintenance, setLastMaintenance] = useState<LastMaintenance | null>(null);

  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [executionDate, setExecutionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [hourMeter, setHourMeter] = useState(0);
  const [workPerformed, setWorkPerformed] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (scheduleId) {
        fetchScheduleDetails();
      }
    }
  }, [isOpen, scheduleId]);

  const fetchData = async () => {
    try {
      const [equipmentData, componentsData, serviceTypesData, techniciansData] = await Promise.all([
        supabase.from('equipment').select('*').order('name'),
        supabase.from('components').select('*').order('name'),
        supabase.from('service_types').select('*').order('name'),
        supabase.from('employees').select('*').order('name')
      ]);

      if (equipmentData.error) throw equipmentData.error;
      if (componentsData.error) throw componentsData.error;
      if (serviceTypesData.error) throw serviceTypesData.error;
      if (techniciansData.error) throw techniciansData.error;

      setEquipment(equipmentData.data || []);
      setComponents(componentsData.data || []);
      setServiceTypes(serviceTypesData.data || []);
      setTechnicians(techniciansData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          equipment:equipment_id (*),
          component:component_id (*),
          service_type:service_type_id (*)
        `)
        .eq('id', scheduleId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedEquipment(data.equipment?.id || '');
        setSelectedComponent(data.component?.id || '');
        setSelectedServiceType(data.service_type?.id || '');
        setHourMeter(data.equipment?.hour_meter || 0);
      }
    } catch (error) {
      console.error('Error fetching schedule details:', error);
    }
  };

  const fetchLastMaintenance = async (equipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_executions')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('execution_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      setLastMaintenance(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching last maintenance:', error);
      setLastMaintenance(null);
    }
  };

  useEffect(() => {
    if (selectedEquipment) {
      fetchLastMaintenance(selectedEquipment);
    }
  }, [selectedEquipment]);

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

    if (!selectedTechnician) {
      setError('Please select a technician');
      return;
    }

    if (!workPerformed.trim()) {
      setError('Please describe the work performed');
      return;
    }

    const serviceType = serviceTypes.find(st => st.id === selectedServiceType);
    if (!serviceType) return;

    const nextServiceHour = hourMeter + serviceType.hour_interval;
    const actualHourInterval = lastMaintenance ? hourMeter - lastMaintenance.hour_meter : serviceType.hour_interval;

    try {
      const { error: insertError } = await supabase
        .from('maintenance_executions')
        .insert([{
          schedule_id: scheduleId || null,
          equipment_id: selectedEquipment || null,
          component_id: selectedComponent || null,
          service_type_id: selectedServiceType,
          execution_date: executionDate,
          hour_meter: hourMeter,
          technician_id: selectedTechnician,
          actual_work_performed: workPerformed,
          parts_used: partsUsed || null,
          notes: notes || null,
          next_service_hour: nextServiceHour,
          actual_hour_interval: actualHourInterval
        }]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      setError('Failed to create maintenance record');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Record Maintenance</h2>
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
                    setSelectedComponent('');
                    const equipmentItem = equipment.find(item => item.id === e.target.value);
                    if (equipmentItem) {
                      setHourMeter(equipmentItem.hour_meter);
                    }
                  }}
                  disabled={!!selectedComponent || !!scheduleId}
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
                    setSelectedEquipment('');
                  }}
                  disabled={!!selectedEquipment || !!scheduleId}
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
                  Technician *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                >
                  <option value="">Select technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} - {tech.position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Execution Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={executionDate}
                      onChange={(e) => setExecutionDate(e.target.value)}
                    />
                    <Calendar size={16} className="absolute right-3 top-3 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hour Meter *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={hourMeter}
                      onChange={(e) => setHourMeter(parseInt(e.target.value) || 0)}
                    />
                    <Clock size={16} className="absolute right-3 top-3 text-gray-400" />
                  </div>
                </div>
              </div>

              {lastMaintenance && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    Last maintenance: {new Date(lastMaintenance.execution_date).toLocaleDateString()} at {lastMaintenance.hour_meter} hours
                  </p>
                  <p className="text-sm text-gray-600">
                    Hours since last maintenance: {hourMeter - lastMaintenance.hour_meter}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Performed *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  placeholder="Describe the maintenance work performed..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parts Used
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  value={partsUsed}
                  onChange={(e) => setPartsUsed(e.target.value)}
                  placeholder="List any parts used during maintenance..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes or observations..."
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
                Record Maintenance
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddMaintenanceRecordModal;