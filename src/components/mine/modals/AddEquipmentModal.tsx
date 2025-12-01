import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';


interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ isOpen, onClose }) => {
  const { addEquipment } = useMaintenanceContext();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    model: '',
    serialNumber: '', // Changed from serial_number to match the interface
    manufacturer: '',
    hourMeter: 0,
  });
  const [errors, setErrors] = useState<any>({});

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourMeter' ? parseInt(value) || 0 : value,
    }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Equipment name is required';
    if (!formData.type.trim()) newErrors.type = 'Equipment type is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.serialNumber.trim()) newErrors.serialNumber = 'Serial number is required';
    if (formData.hourMeter < 0) newErrors.hourMeter = 'Hour meter cannot be negative';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      try {
        await addEquipment({
          ...formData,
          last_updated: new Date().toISOString(),
          use_auto_calculation: true,
        });
        
        onClose();
      } catch (error) {
        console.error('Error adding equipment:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Add New Equipment</h2>
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
                Equipment Name *
              </label>
              <input
                type="text"
                name="name"
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                placeholder="e.g., Excavator #123"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Type *
              </label>
              <input
                type="text"
                name="type"
                className={`w-full px-3 py-2 border ${errors.type ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                placeholder="e.g., Excavator, Loader, Truck"
                value={formData.type}
                onChange={handleChange}
              />
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  name="model"
                  className={`w-full px-3 py-2 border ${errors.model ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  placeholder="e.g., CAT 336"
                  value={formData.model}
                  onChange={handleChange}
                />
                {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number *
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  className={`w-full px-3 py-2 border ${errors.serialNumber ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  placeholder="e.g., CAT0336ABC123"
                  value={formData.serialNumber}
                  onChange={handleChange}
                />
                {errors.serialNumber && <p className="mt-1 text-sm text-red-500">{errors.serialNumber}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Caterpillar"
                  value={formData.manufacturer}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Hour Meter
                </label>
                <input
                  type="number"
                  name="hourMeter"
                  className={`w-full px-3 py-2 border ${errors.hourMeter ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  placeholder="0"
                  value={formData.hourMeter}
                  onChange={handleChange}
                />
                {errors.hourMeter && <p className="mt-1 text-sm text-red-500">{errors.hourMeter}</p>}
              </div>
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
              Add Equipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEquipmentModal;