import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Search, Filter, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AddMaintenanceScheduleModal from '@/components/mine/modals/AddMaintenanceScheduleModal';
import AddMaintenanceRecordModal from '@/components/mine/modals/AddMaintenanceRecordModal';

interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  component_id: string;
  service_type_id: string;
  planned_date: string;
  planned_hour_meter: number;
  status: 'pending' | 'due' | 'overdue' | 'completed';
  notes: string;
  equipment: {
    name: string;
    model: string;
    hour_meter: number;
  };
  component?: {
    name: string;
  };
  service_type: {
    name: string;
    category: string;
  };
}

const MaintenanceSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | undefined>();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          equipment:equipment_id (name, model, hour_meter),
          component:component_id (name),
          service_type:service_type_id (name, category)
        `)
        .order('planned_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSchedule = (schedule: MaintenanceSchedule) => {
    // Navigate to equipment detail page with maintenance schedule tab active
    navigate(`/equipment/${schedule.equipment_id}?tab=components`);
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (schedule.component?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.service_type.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    const matchesType = typeFilter === 'all' || schedule.service_type.category === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'overdue':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'due':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <CalendarClock size={16} className="text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Schedule</h1>
        <button 
          className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800"
          onClick={() => setIsAddScheduleModalOpen(true)}
        >
          <Plus size={18} className="mr-1" /> Add Schedule
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 flex-1">
            <Search size={20} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search schedules..."
              className="flex-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
              <Filter size={16} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="periodical">Periodical</option>
                <option value="midlife">Midlife</option>
                <option value="overhaul">Overhaul</option>
              </select>
              <Filter size={16} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipment/Component
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Planned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hour Meter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.equipment.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {schedule.component?.name || schedule.equipment.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      schedule.service_type.category === 'periodical'
                        ? 'bg-blue-100 text-blue-800'
                        : schedule.service_type.category === 'midlife'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {schedule.service_type.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schedule.planned_date
                      ? new Date(schedule.planned_date).toLocaleDateString()
                      : 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {schedule.planned_hour_meter} hours
                    </div>
                    <div className="text-sm text-gray-500">
                      Current: {schedule.equipment.hour_meter} hours
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                      {getStatusIcon(schedule.status)}
                      <span className="ml-1 capitalize">{schedule.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleViewSchedule(schedule)}
                    >
                      View
                    </button>
                    {schedule.status !== 'completed' && (
                      <button
                        className="text-green-600 hover:text-green-800"
                        onClick={() => {
                          setSelectedScheduleId(schedule.id);
                          setIsAddRecordModalOpen(true);
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddMaintenanceScheduleModal
        isOpen={isAddScheduleModalOpen}
        onClose={() => setIsAddScheduleModalOpen(false)}
        onSuccess={fetchSchedules}
      />

      <AddMaintenanceRecordModal
        isOpen={isAddRecordModalOpen}
        onClose={() => {
          setIsAddRecordModalOpen(false);
          setSelectedScheduleId(undefined);
        }}
        onSuccess={fetchSchedules}
        scheduleId={selectedScheduleId}
      />
    </div>
  );
};

export default MaintenanceSchedule;