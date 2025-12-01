import React, { useState } from 'react';
import { Plus, Settings, Save, Trash2 } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';

const MaintenanceSettings: React.FC = () => {
  const { 
    maintenanceSettings, 
    addMaintenanceSetting, 
    updateMaintenanceSetting, 
    deleteMaintenanceSetting 
  } = useMaintenanceContext();
  
  const [newSetting, setNewSetting] = useState({
    name: '',
    category: 'overhaul',
    interval: 2000,
  });

  const [errors, setErrors] = useState<{
    name?: string;
    interval?: string;
  }>({});

  const validateSetting = (setting: any) => {
    const errors: {name?: string; interval?: string} = {};
    
    if (!setting.name.trim()) {
      errors.name = 'Component name is required';
    }
    
    if (!setting.interval || setting.interval <= 0) {
      errors.interval = 'Interval must be greater than 0';
    }
    
    return errors;
  };

  const handleAddSetting = () => {
    const validationErrors = validateSetting(newSetting);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    addMaintenanceSetting({
      ...newSetting,
      id: Date.now().toString(),
    });
    
    setNewSetting({
      name: '',
      category: 'overhaul',
      interval: 2000,
    });
    
    setErrors({});
  };

  const handleUpdateInterval = (id: string, interval: number) => {
    if (interval <= 0) {
      // Show validation error
      return;
    }
    
    updateMaintenanceSetting(id, { interval });
  };

  const handleDeleteSetting = (id: string) => {
    if (confirm('Are you sure you want to delete this maintenance setting?')) {
      deleteMaintenanceSetting(id);
    }
  };

  // Group settings by category
  const overhaulSettings = maintenanceSettings.filter(s => s.category === 'overhaul');
  const midlifeSettings = maintenanceSettings.filter(s => s.category === 'midlife');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Settings size={20} className="mr-2" />
          Configure Maintenance Intervals
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Configure maintenance intervals for different component types. These settings will be used to calculate when maintenance is due.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Name
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                placeholder="e.g., Engine"
                value={newSetting.name}
                onChange={(e) => setNewSetting({ ...newSetting, name: e.target.value })}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newSetting.category}
                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
              >
                <option value="overhaul">Overhaul</option>
                <option value="midlife">Midlife</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interval (hours)
              </label>
              <div className="flex">
                <input
                  type="number"
                  className={`w-full px-3 py-2 border ${errors.interval ? 'border-red-500' : 'border-gray-300'} rounded-l-md`}
                  placeholder="2000"
                  value={newSetting.interval}
                  onChange={(e) => setNewSetting({ ...newSetting, interval: parseInt(e.target.value) || 0 })}
                />
                <button
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 rounded-r-md flex items-center"
                  onClick={handleAddSetting}
                >
                  <Plus size={18} className="mr-1" /> Add
                </button>
              </div>
              {errors.interval && <p className="mt-1 text-sm text-red-500">{errors.interval}</p>}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">Overhaul Components</h3>
          {overhaulSettings.length === 0 ? (
            <p className="text-gray-500 italic">No overhaul components configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Component Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Maintenance Interval
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {overhaulSettings.map(setting => (
                    <tr key={setting.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {setting.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                            value={setting.interval}
                            onChange={(e) => handleUpdateInterval(setting.id, parseInt(e.target.value) || 0)}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value > 0) {
                                handleUpdateInterval(setting.id, value);
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-500">hours</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteSetting(setting.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Midlife Components</h3>
          {midlifeSettings.length === 0 ? (
            <p className="text-gray-500 italic">No midlife components configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Component Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Maintenance Interval
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {midlifeSettings.map(setting => (
                    <tr key={setting.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {setting.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                            value={setting.interval}
                            onChange={(e) => handleUpdateInterval(setting.id, parseInt(e.target.value) || 0)}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value > 0) {
                                handleUpdateInterval(setting.id, value);
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-500">hours</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteSetting(setting.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSettings;