import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertTriangle, CheckCircle, MoreHorizontal, LayoutGrid, LayoutList, Clock, Filter } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';
import AddEquipmentModal from "@/components/mine/modals/AddEquipmentModal";


const Equipment: React.FC = () => {
  const navigate = useNavigate();
  const { equipment, deleteEquipment } = useMaintenanceContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState('all');

  const toggleActionMenu = (id: string) => {
    if (actionMenuId === id) {
      setActionMenuId(null);
    } else {
      setActionMenuId(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this equipment? All associated data will be lost.')) {
      deleteEquipment(id);
      setActionMenuId(null);
    }
  };

  const filteredEquipment = equipment.filter(unit => {
    const matchesSearch = 
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || unit.type.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  // Get unique equipment types for filter
  const equipmentTypes = Array.from(new Set(equipment.map(unit => unit.type)));

  const getMaintenanceStatus = (unit: any) => {
    // This is a placeholder. In a real implementation, this would check the actual maintenance status
    if (unit.lastMaintenance && unit.hourMeter - unit.lastMaintenance > unit.maintenanceInterval) {
      return 'overdue';
    } else if (unit.lastMaintenance && unit.hourMeter - unit.lastMaintenance > unit.maintenanceInterval * 0.8) {
      return 'upcoming';
    }
    return 'good';
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredEquipment.map(unit => {
        const status = getMaintenanceStatus(unit);
        return (
          <div key={unit.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{unit.name}</h3>
                  <p className="text-sm text-gray-600">{unit.type}</p>
                </div>
                <div className="relative">
                  <button 
                    className="p-1 rounded-full hover:bg-gray-100"
                    onClick={() => toggleActionMenu(unit.id)}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {actionMenuId === unit.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                      <div className="py-1">
                        <button 
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                          onClick={() => navigate(`/equipment/${unit.id}`)}
                        >
                          View Details
                        </button>
                        <button 
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                          onClick={() => handleDelete(unit.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Model:</span>
                  <span className="font-medium">{unit.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">S/N:</span>
                  <span className="font-medium">{unit.serialNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hour Meter:</span>
                  <span className="font-medium">{unit.hourMeter || 0} hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>{unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                {status === 'overdue' && (
                  <span className="flex items-center text-red-600 text-sm">
                    <AlertTriangle size={14} className="mr-1" /> Maintenance Overdue
                  </span>
                )}
                {status === 'upcoming' && (
                  <span className="flex items-center text-yellow-600 text-sm">
                    <AlertTriangle size={14} className="mr-1" /> Maintenance Soon
                  </span>
                )}
                {status === 'good' && (
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle size={14} className="mr-1" /> Maintenance OK
                  </span>
                )}
                <button 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => navigate(`/equipment/${unit.id}`)}
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Model</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hour Meter</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredEquipment.map(unit => {
            const status = getMaintenanceStatus(unit);
            return (
              <tr key={unit.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{unit.name}</div>
                  <div className="text-sm text-gray-500">S/N: {unit.serialNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{unit.type}</div>
                  <div className="text-sm text-gray-500">{unit.model}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Clock size={14} className="mr-1 text-gray-400" />
                    {unit.hourMeter || 0} hours
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {status === 'overdue' && (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Maintenance Overdue
                    </span>
                  )}
                  {status === 'upcoming' && (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Maintenance Soon
                    </span>
                  )}
                  {status === 'good' && (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Maintenance OK
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    onClick={() => navigate(`/equipment/${unit.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDelete(unit.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Equipment Management</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
        >
          <Plus size={18} className="mr-1" /> Add Equipment
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center border border-gray-300 rounded-md px-3 py-2">
              <Search size={20} className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search equipment..."
                className="flex-1 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {equipmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Filter size={16} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="flex border border-gray-300 rounded-md">
              <button
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <LayoutList size={20} />
              </button>
            </div>
          </div>
        </div>

        {filteredEquipment.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No equipment found</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              Add Your First Equipment
            </button>
          </div>
        ) : (
          viewMode === 'grid' ? renderGridView() : renderListView()
        )}
      </div>

      <AddEquipmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
};

export default Equipment;