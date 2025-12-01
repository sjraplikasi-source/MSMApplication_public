import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Search, Filter, Plus, Calendar, Clock, PenTool as Tool } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AddMaintenanceRecordModal from '@/components/mine/modals/AddMaintenanceRecordModal';

interface MaintenanceExecution {
  id: string;
  equipment_id: string;
  component_id: string;
  service_type_id: string;
  execution_date: string;
  hour_meter: number;
  technician_id: string;
  actual_work_performed: string;
  parts_used: string;
  notes: string;
  next_service_hour: number;
  actual_hour_interval: number;
  equipment: {
    name: string;
    model: string;
  };
  component?: {
    name: string;
  };
  service_type: {
    name: string;
    category: string;
    planned_hour_interval: number;
  };
  technician: {
    name: string;
    position: string;
  };
}

const MaintenanceRecords: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<MaintenanceExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_executions')
        .select(`
          *,
          equipment:equipment_id (name, model),
          component:component_id (name),
          service_type:service_type_id (name, category, planned_hour_interval),
          technician:technician_id (name, position)
        `)
        .order('execution_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecord = (record: MaintenanceExecution) => {
    // Navigate to equipment detail page with maintenance history tab active
    navigate(`/equipment/${record.equipment_id}?tab=history`);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.component?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.service_type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.technician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.actual_work_performed.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || record.service_type.category === typeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Records</h1>
        <button 
          className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800"
          onClick={() => setIsAddRecordModalOpen(true)}
        >
          <Plus size={18} className="mr-1" /> Add Record
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 flex-1">
            <Search size={20} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search records..."
              className="flex-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                  Date & Hour Meter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Performed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maintenance Intervals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.equipment.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.component?.name || record.equipment.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.service_type.category === 'periodical'
                        ? 'bg-blue-100 text-blue-800'
                        : record.service_type.category === 'midlife'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {record.service_type.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {new Date(record.execution_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock size={14} className="mr-1 text-gray-400" />
                      {record.hour_meter} hours
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.technician.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.technician.position}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {record.actual_work_performed}
                    </div>
                    {record.parts_used && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Tool size={14} className="mr-1" />
                        Parts: {record.parts_used}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Planned: {record.service_type.planned_hour_interval} hours
                    </div>
                    <div className="text-sm text-gray-500">
                      Actual: {record.actual_hour_interval} hours
                    </div>
                    <div className="text-sm text-gray-500">
                      Next: {record.next_service_hour} hours
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => handleViewRecord(record)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddMaintenanceRecordModal
        isOpen={isAddRecordModalOpen}
        onClose={() => setIsAddRecordModalOpen(false)}
        onSuccess={fetchRecords}
      />
    </div>
  );
};

export default MaintenanceRecords;