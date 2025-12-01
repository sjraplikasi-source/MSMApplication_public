import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMaintenanceContext } from "@/context/MaintenanceContext";

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string;
}

const AddComponentModal: React.FC<AddComponentModalProps> = ({ isOpen, onClose, equipmentId }) => {
  const { addComponent, maintenanceSettings, equipment } = useMaintenanceContext();
  const [formData, setFormData] = useState({
    name: '',
    category: 'overhaul',
    serialNumber: '',
    maintenanceInterval: 2000,
    installationDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [selectedSettingId, setSelectedSettingId] = useState('');

  if (!isOpen) return null;

  const equipmentItem = equipment.find(e => e.id === equipmentId);
  const filteredSettings = maintenanceSettings.filter(
    setting => setting.category === formData.category
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maintenanceInterval' ? parseInt(value) || 0 : value,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setFormData(prev => ({
      ...prev,
      category,
      // Reset name when category changes
      name: '',
    }));
    setSelectedSettingId('');
  };

  const handleSettingSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const settingId = e.target.value;
    setSelectedSettingId(settingId);
    
    if (settingId) {
      const setting = maintenanceSettings.find(s => s.id === settingId);
      if (setting) {
        setFormData(prev => ({
          ...prev,
          name: setting.name,
          maintenanceInterval: setting.interval,
        }));
      }
    }
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Component name is required';
    if (formData.maintenanceInterval <= 0) {
      newErrors.maintenanceInterval = 'Maintenance interval must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      // Calculate next maintenance hour based on current equipment hours
      const currentHours = equipmentItem?.hourMeter || 0;
      const nextMaintenanceHour = currentHours + formData.maintenanceInterval;
      
      addComponent({
        ...formData,
        id: Date.now().toString(),
        equipmentId,
        lastMaintenanceDate: formData.installationDate,
        lastMaintenanceHour: currentHours,
        nextMaintenanceHour,
      });
      
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Add New Component</h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Category *
              </label>
              <select
                name="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.category}
                onChange={handleCategoryChange}
              >
                <option value="overhaul">Overhaul</option>
                <option value="midlife">Midlife</option>
              </select>
            </div>
            
            {filteredSettings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select from Predefined Components
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedSettingId}
                  onChange={handleSettingSelect}
                >
                  <option value="">-- Select a component --</option>
                  {filteredSettings.map(setting => (
                    <option key={setting.id} value={setting.id}>
                      {setting.name} ({setting.interval} hours)
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Name *
              </label>
              <input
                type="text"
                name="name"
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                placeholder="e.g., Engine, Transmission"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                name="serialNumber"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., ENG12345"
                value={formData.serialNumber}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Interval (hours) *
                </label>
                <input
                  type="number"
                  name="maintenanceInterval"
                  className={`w-full px-3 py-2 border ${errors.maintenanceInterval ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  placeholder="2000"
                  value={formData.maintenanceInterval}
                  onChange={handleChange}
                />
                {errors.maintenanceInterval && (
                  <p className="mt-1 text-sm text-red-500">{errors.maintenanceInterval}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Installation Date
                </label>
                <input
                  type="date"
                  name="installationDate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.installationDate}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Additional information about this component"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
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
              Add Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddComponentModal;