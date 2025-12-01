import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Settings } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';
import ComponentListItem from "@/components/mine/ComponentListItem";


const Components: React.FC = () => {
  const navigate = useNavigate();
  const { components, equipment } = useMaintenanceContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filtering logic
  const filteredComponents = components.filter(component => {
    const matchesSearch = 
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || component.category === filterType;
    
    // For status filtering, we need the current hour meter of the equipment
    const equipmentItem = equipment.find(e => e.id === component.equipmentId);
    const currentHours = equipmentItem?.hourMeter || 0;
    const hoursRemaining = component.nextMaintenanceHour - currentHours;
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'ok' && hoursRemaining > 100) ||
      (filterStatus === 'upcoming' && hoursRemaining <= 100 && hoursRemaining > 0) ||
      (filterStatus === 'overdue' && hoursRemaining <= 0);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Components Management</h1>
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Settings size={18} className="mr-1" /> Maintenance Settings
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 flex-1">
            <Search size={20} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search components..."
              className="flex-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="overhaul">Overhaul</option>
                <option value="midlife">Midlife</option>
              </select>
              <Filter size={16} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="ok">OK</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
              </select>
              <Filter size={16} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {components.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No components found</p>
            <p className="text-gray-600">
              Add components to your equipment units to track maintenance schedules.
            </p>
            <button 
              onClick={() => navigate('/equipment')}
              className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              Go to Equipment
            </button>
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No components match your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Component
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Service
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
                {filteredComponents.map(component => {
                  const equipmentItem = equipment.find(e => e.id === component.equipmentId);
                  return (
                    <ComponentListItem 
                      key={component.id}
                      component={component}
                      equipment={equipmentItem}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Components;