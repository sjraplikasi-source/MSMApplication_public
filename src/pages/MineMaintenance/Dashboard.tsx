import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle, Calendar } from 'lucide-react';
import { useMaintenanceContext } from "../../context/MaintenanceContext";
import MaintenanceStatusCard from "@/components/mine/MaintenanceStatusCard";
import UpcomingMaintenanceTable from "@/components/mine/UpcomingMaintenanceTable";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    equipment, 
    components,
    getUpcomingMaintenance, 
    getOverdueMaintenance,
    getCompletedMaintenance
  } = useMaintenanceContext();

  // Get maintenance data
  const upcomingMaintenance = getUpcomingMaintenance();
  const overdueMaintenance = getOverdueMaintenance();
  const completedMaintenance = getCompletedMaintenance();

  // Debug logs
  console.log('Equipment:', equipment);
  console.log('Components:', components);
  console.log('Upcoming Maintenance:', upcomingMaintenance);
  console.log('Overdue Maintenance:', overdueMaintenance);
  console.log('Completed Maintenance:', completedMaintenance);

  // Calculate maintenance statistics
  const totalEquipment = equipment.length;
  const totalComponents = components.length;
  const equipmentWithMaintenance = new Set([
    ...upcomingMaintenance.map(m => m.equipmentId),
    ...overdueMaintenance.map(m => m.equipmentId)
  ]).size;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Dashboard</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/equipment')}
            className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
          >
            View Equipment
          </button>
          <button 
            onClick={() => navigate('/hour-meter')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Update Hour Meter
          </button>
        </div>
      </div>

      {equipment.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to Mine Maintenance Tracker</h2>
          <p className="mb-6">Get started by adding your first equipment unit.</p>
          <button 
            onClick={() => navigate('/equipment')}
            className="px-6 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
          >
            Add Equipment
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MaintenanceStatusCard 
              title="Total Equipment" 
              count={totalEquipment}
              icon={<Clock className="text-blue-500" size={24} />}
              color="blue"
            />
            <MaintenanceStatusCard 
              title="Total Components" 
              count={totalComponents}
              icon={<Calendar className="text-green-500" size={24} />}
              color="green"
            />
            <MaintenanceStatusCard 
              title="Overdue Maintenance" 
              count={overdueMaintenance.length}
              icon={<AlertTriangle className="text-red-500" size={24} />}
              color="red"
            />
            <MaintenanceStatusCard 
              title="Upcoming Maintenance" 
              count={upcomingMaintenance.length}
              icon={<Clock className="text-yellow-500" size={24} />}
              color="yellow"
            />
          </div>

          {overdueMaintenance.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-red-600 flex items-center">
                  <AlertTriangle size={24} className="mr-2" />
                  Overdue Maintenance
                </h2>
                <button
                  onClick={() => navigate('/maintenance-schedule')}
                  className="text-red-600 hover:text-red-800"
                >
                  View All
                </button>
              </div>
              <UpcomingMaintenanceTable maintenanceItems={overdueMaintenance.slice(0, 5)} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Calendar size={24} className="mr-2" />
                Upcoming Maintenance
              </h2>
              <button
                onClick={() => navigate('/maintenance-schedule')}
                className="text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            {upcomingMaintenance.length > 0 ? (
              <UpcomingMaintenanceTable maintenanceItems={upcomingMaintenance.slice(0, 5)} />
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming maintenance scheduled</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Equipment Status</h2>
              <div className="space-y-4">
                {equipment.slice(0, 5).map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium">{unit.name}</h3>
                      <p className="text-sm text-gray-500">{unit.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{unit.hourMeter} hours</p>
                      <p className="text-sm text-gray-500">
                        Last updated: {unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                ))}
                {equipment.length > 5 && (
                  <button
                    onClick={() => navigate('/equipment')}
                    className="w-full text-center text-blue-600 hover:text-blue-800 mt-2"
                  >
                    View All Equipment
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Maintenance</h2>
              <div className="space-y-4">
                {completedMaintenance.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium">{record.componentName}</h3>
                      <p className="text-sm text-gray-500">{record.maintenanceType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">{record.hourMeter} hours</p>
                    </div>
                  </div>
                ))}
                {completedMaintenance.length > 5 && (
                  <button
                    onClick={() => navigate('/maintenance-records')}
                    className="w-full text-center text-blue-600 hover:text-blue-800 mt-2"
                  >
                    View All Records
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;