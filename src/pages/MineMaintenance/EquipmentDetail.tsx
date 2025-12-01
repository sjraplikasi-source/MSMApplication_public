import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Wrench, Edit, Plus } from 'lucide-react';
import { useMaintenanceContext } from '@/context/MaintenanceContext';
import AddComponentModal from "@/components/mine/modals/AddComponentModal";
import ComponentCard from "@/components/mine/ComponentCard";
import HourMeterUpdateModal from "@/components/mine/modals/HourMeterUpdateModal";
import MaintenanceHistoryTable from "@/components/mine/MaintenanceHistoryTable";

const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { equipment, components, getMaintenanceHistory } = useMaintenanceContext();

  // Log equipment data for debugging
  console.log('Equipment data in EquipmentDetail:', equipment);

  const [activeTab, setActiveTab] = useState(() => {
    // Get tab from URL query parameter
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'overview';
  });
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [isHourMeterModalOpen, setIsHourMeterModalOpen] = useState(false);

  const unit = equipment.find(e => e.id === id);
  const unitComponents = components.filter(c => c.equipmentId === id);
  const maintenanceHistory = getMaintenanceHistory(id!);

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('tab', activeTab);
    navigate(location.pathname + "?" + params.toString(), { replace: true });
  }, [activeTab, location.pathname, navigate, location.search]);

  if (!unit) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 mb-4">Equipment not found</p>
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded-md"
          onClick={() => navigate('/equipment')}
        >
          Back to Equipment List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/equipment')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{unit.name}</h1>
          <p className="text-gray-600">{unit.model} - S/N: {unit.serialNumber}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
<button
  className={[
    "px-6 py-3 font-medium",
    activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
  ].join(' ')}
  onClick={() => setActiveTab('overview')}
>
  Overview
</button>
          <button
  className={[
    "px-6 py-3 font-medium",
    activeTab === 'components' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
  ].join(' ')}
  onClick={() => setActiveTab('components')}
>
  Components
          </button>
          <button
           className={[
    "px-6 py-3 font-medium",
    activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
  ].join(' ')}
  onClick={() => setActiveTab('history')}
          >
            Maintenance History
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Clock size={20} className="text-gray-500" />
                  <span className="font-medium">Current Hour Meter:</span>
                  <span className="text-lg">{unit.hourMeter || 0} hours</span>
                </div>
                <button
                  className="flex items-center px-3 py-1 text-sm border border-blue-700 text-blue-700 rounded hover:bg-blue-50"
                  onClick={() => setIsHourMeterModalOpen(true)}
                >
                  <Edit size={16} className="mr-1" /> Update Hours
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-2">Equipment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span>{unit.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Model:</span>
                      <span>{unit.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Serial Number:</span>
                      <span>{unit.serialNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manufacturer:</span>
                      <span>{unit.manufacturer}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-2">Periodical Service</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next 250hr Service:</span>
                      <span>{Math.ceil((unit.hourMeter || 0) / 250) * 250} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next 500hr Service:</span>
                      <span>{Math.ceil((unit.hourMeter || 0) / 500) * 500} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next 1000hr Service:</span>
                      <span>{Math.ceil((unit.hourMeter || 0) / 1000) * 1000} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next 2000hr Service:</span>
                      <span>{Math.ceil((unit.hourMeter || 0) / 2000) * 2000} hours</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-2">Maintenance Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Components:</span>
                      <span>{unitComponents.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Components Due:</span>
                      <span className="text-yellow-600">
                        {unitComponents.filter(c => {
                          const hoursRemaining = c.nextMaintenanceHour - (unit.hourMeter || 0);
                          return hoursRemaining > 0 && hoursRemaining < 100;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Components Overdue:</span>
                      <span className="text-red-600">
                        {unitComponents.filter(c => {
                          return (unit.hourMeter || 0) >= c.nextMaintenanceHour;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-medium text-gray-700 mb-4">Recent Maintenance History</h3>
                {maintenanceHistory.length > 0 ? (
                  <MaintenanceHistoryTable
                    history={maintenanceHistory.slice(0, 5)}
                    showEquipment={false}
                  />
                ) : (
                  <p className="text-gray-500">No maintenance history recorded.</p>
                )}
                {maintenanceHistory.length > 5 && (
                  <div className="mt-2 text-right">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => setActiveTab('history')}
                    >
                      View full history
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700">Registered Components</h3>
                <button
                  className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800"
                  onClick={() => setIsAddComponentModalOpen(true)}
                >
                  <Plus size={18} className="mr-1" /> Add Component
                </button>
              </div>

              {unitComponents.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-lg">
                  <Wrench size={36} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 mb-4">No components registered for this equipment</p>
                  <button
                    className="px-4 py-2 bg-blue-700 text-white rounded-md"
                    onClick={() => setIsAddComponentModalOpen(true)}
                  >
                    Add Your First Component
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unitComponents.map(component => (
                    <ComponentCard
                      key={component.id}
                      component={component}
                      equipmentHours={unit.hourMeter || 0}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="font-medium text-gray-700 mb-4">Maintenance History</h3>
              {maintenanceHistory.length > 0 ? (
                <MaintenanceHistoryTable history={maintenanceHistory} showEquipment={false} />
              ) : (
                <p className="text-gray-500">No maintenance history recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <AddComponentModal
        isOpen={isAddComponentModalOpen}
        onClose={() => setIsAddComponentModalOpen(false)}
        equipmentId={id!}
      />

      <HourMeterUpdateModal
        isOpen={isHourMeterModalOpen}
        onClose={() => setIsHourMeterModalOpen(false)}
        equipment={unit}
      />
    </div>
  );
};

export default EquipmentDetail;
