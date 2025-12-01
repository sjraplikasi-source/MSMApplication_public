import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

// Types
interface Equipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  manufacturer?: string;
  hourMeter: number;
  lastUpdated?: string;
  averageHoursPerDay?: number;
  useAutoCalculation: boolean;
}

interface HourMeterReading {
  id: string;
  equipmentId: string;
  readingDate: string;
  hours: number;
  createdAt: string;
}

interface Component {
  id: string;
  equipmentId: string;
  name: string;
  category: 'overhaul' | 'midlife';
  serialNumber?: string;
  maintenanceInterval: number;
  installationDate: string;
  lastMaintenanceDate: string;
  lastMaintenanceHour: number;
  nextMaintenanceHour: number;
  notes?: string;
}

interface MaintenanceSetting {
  id: string;
  name: string;
  category: 'overhaul' | 'midlife';
  interval: number;
}

interface MaintenanceRecord {
  id: string;
  componentId: string;
  componentName: string;
  equipmentId: string;
  date: string;
  hourMeter: number;
  nextMaintenanceHour: number;
  notes?: string;
  maintenanceType: string;
}

interface MaintenanceContextType {
  equipment: Equipment[];
  addEquipment: (equipment: Equipment) => Promise<void>;
  updateEquipment: (id: string, data: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateEquipmentHourMeter: (
    id: string,
    hourMeter: number,
    date: string,
    averageHoursPerDay?: number,
    useAutoCalculation?: boolean
  ) => Promise<void>;
  
  getHourMeterReadings: (equipmentId: string) => Promise<HourMeterReading[]>;
  
  components: Component[];
  addComponent: (component: Component) => Promise<void>;
  updateComponent: (id: string, data: Partial<Component>) => Promise<void>;
  deleteComponent: (id: string) => Promise<void>;
  
  maintenanceSettings: MaintenanceSetting[];
  addMaintenanceSetting: (setting: MaintenanceSetting) => Promise<void>;
  updateMaintenanceSetting: (id: string, data: Partial<MaintenanceSetting>) => Promise<void>;
  deleteMaintenanceSetting: (id: string) => Promise<void>;
  
  maintenanceRecords: MaintenanceRecord[];
  performMaintenance: (record: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
  getMaintenanceHistory: (equipmentId: string) => MaintenanceRecord[];
  
  getUpcomingMaintenance: () => any[];
  getOverdueMaintenance: () => any[];
  getCompletedMaintenance: () => MaintenanceRecord[];
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSetting[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    fetchEquipment();
    fetchComponents();
    fetchMaintenanceSettings();
    fetchMaintenanceRecords();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Transform the data to match the Equipment interface
      const transformedData = data.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        model: item.model,
        serialNumber: item.serial_number,
        manufacturer: item.manufacturer,
        hourMeter: item.hour_meter || 0,
        lastUpdated: item.last_updated,
        averageHoursPerDay: item.average_hours_per_day,
        useAutoCalculation: item.use_auto_calculation !== false
      }));

      setEquipment(transformedData);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to fetch equipment');
    }
  };

const fetchComponents = async () => {
  try {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // Transform the data to match the Component interface
    const transformedData = data.map(item => ({
      id: item.id,
      equipmentId: item.equipment_id,
      name: item.name,
      category: item.category,
      serialNumber: item.serial_number,
      maintenanceInterval: item.maintenance_interval,
      installationDate: item.installation_date,
      lastMaintenanceDate: item.last_maintenance_date,
      lastMaintenanceHour: item.last_maintenance_hour,
      nextMaintenanceHour: item.next_maintenance_hour,
      notes: item.notes
    }));
    
    setComponents(transformedData);
  } catch (error) {
    console.error('Error fetching components:', error);
    toast.error('Failed to fetch components');
  }
};

const fetchMaintenanceSettings = async () => {
  const { data, error } = await supabase
    .from('maintenance_settings')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching maintenance settings:', error);
    toast.error('Failed to fetch maintenance settings');
    return;
  }
  
  setMaintenanceSettings(data);
};

  const fetchMaintenanceRecords = async () => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching maintenance records:', error);
      return;
    }
    
    setMaintenanceRecords(data);
  };

  const addEquipment = async (newEquipment: Equipment) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .insert([{
          name: newEquipment.name,
          type: newEquipment.type,
          model: newEquipment.model,
          serial_number: newEquipment.serialNumber,
          manufacturer: newEquipment.manufacturer,
          hour_meter: newEquipment.hourMeter,
          use_auto_calculation: true
        }]);

      if (error) throw error;

      await fetchEquipment();
      toast.success('Equipment added successfully!');
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error('Failed to add equipment');
    }
  };

  const updateEquipment = async (id: string, data: Partial<Equipment>) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          name: data.name,
          type: data.type,
          model: data.model,
          serial_number: data.serialNumber,
          manufacturer: data.manufacturer,
          hour_meter: data.hourMeter,
          average_hours_per_day: data.averageHoursPerDay,
          use_auto_calculation: data.useAutoCalculation
        })
        .eq('id', id);

      if (error) throw error;

      await fetchEquipment();
      toast.success('Equipment updated successfully!');
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchEquipment();
      await fetchComponents();
      toast.success('Equipment deleted successfully!');
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  const updateEquipmentHourMeter = async (
    id: string,
    hourMeter: number,
    date: string,
    averageHoursPerDay?: number,
    useAutoCalculation: boolean = true
  ) => {
    try {
      console.log('Updating hour meter:', {
        id,
        hourMeter,
        date,
        averageHoursPerDay,
        useAutoCalculation
      });

      // First, add the hour meter reading
      const { error: readingError } = await supabase
        .from('hour_meter_readings')
        .insert([{
          equipment_id: id,
          reading_date: date,
          hours: hourMeter
        }]);

      if (readingError) throw readingError;

      // Calculate average hours per day if using auto calculation
      let calculatedAverage = null;
      if (useAutoCalculation) {
        const { data: avgData, error: avgError } = await supabase
          .rpc('calculate_average_hours_per_day', { p_equipment_id: id });

        if (avgError) throw avgError;
        calculatedAverage = avgData;
      }

      // Update equipment with new hour meter and average
      const { error: equipmentError } = await supabase
        .from('equipment')
        .update({
          hour_meter: hourMeter,
          last_updated: new Date().toISOString(),
          average_hours_per_day: useAutoCalculation ? calculatedAverage : averageHoursPerDay,
          use_auto_calculation: useAutoCalculation
        })
        .eq('id', id);

      if (equipmentError) throw equipmentError;

      await fetchEquipment();
      toast.success('Hour meter updated successfully!');
    } catch (error) {
      console.error('Error updating hour meter:', error);
      toast.error('Failed to update hour meter');
      throw error;
    }
  };

  const getHourMeterReadings = async (equipmentId: string): Promise<HourMeterReading[]> => {
    try {
      console.log('Fetching hour meter readings for equipment:', equipmentId);
      
      const { data, error } = await supabase
        .from('hour_meter_readings')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('reading_date', { ascending: false });

      if (error) throw error;

      console.log('Received hour meter readings:', data);

      return data.map(reading => ({
        id: reading.id,
        equipmentId: reading.equipment_id,
        readingDate: reading.reading_date,
        hours: reading.hours,
        createdAt: reading.created_at
      }));
    } catch (error) {
      console.error('Error fetching hour meter readings:', error);
      toast.error('Failed to fetch hour meter readings');
      return [];
    }
  };

const addComponent = async (newComponent: Component) => {
  try {
    const { error } = await supabase
      .from('components')
      .insert([{
        equipment_id: newComponent.equipmentId,
        name: newComponent.name,
        category: newComponent.category,
        serial_number: newComponent.serialNumber,
        maintenance_interval: newComponent.maintenanceInterval,
        installation_date: newComponent.installationDate,
        last_maintenance_date: newComponent.lastMaintenanceDate,
        last_maintenance_hour: newComponent.lastMaintenanceHour,
        next_maintenance_hour: newComponent.nextMaintenanceHour,
        notes: newComponent.notes
      }]);

    if (error) throw error;

    await fetchComponents();
    toast.success('Component added successfully!');
  } catch (error) {
    console.error('Error adding component:', error);
    toast.error('Failed to add component');
  }
};


  const updateComponent = async (id: string, data: Partial<Component>) => {
    const { error } = await supabase
      .from('components')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Error updating component:', error);
      toast.error('Failed to update component');
      return;
    }

    await fetchComponents();
    toast.success('Component updated successfully!');
  };

  const deleteComponent = async (id: string) => {
    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting component:', error);
      toast.error('Failed to delete component');
      return;
    }

    await fetchComponents();
    toast.success('Component deleted successfully!');
  };

  const addMaintenanceSetting = async (newSetting: MaintenanceSetting) => {
    const { error } = await supabase
      .from('maintenance_settings')
      .insert([newSetting]);

    if (error) {
      console.error('Error adding maintenance setting:', error);
      toast.error('Failed to add maintenance setting');
      return;
    }

    await fetchMaintenanceSettings();
    toast.success('Maintenance setting added successfully!');
  };

  const updateMaintenanceSetting = async (id: string, data: Partial<MaintenanceSetting>) => {
    const { error } = await supabase
      .from('maintenance_settings')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Error updating maintenance setting:', error);
      toast.error('Failed to update maintenance setting');
      return;
    }

    await fetchMaintenanceSettings();
    toast.success('Maintenance setting updated successfully!');
  };

  const deleteMaintenanceSetting = async (id: string) => {
    const { error } = await supabase
      .from('maintenance_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting maintenance setting:', error);
      toast.error('Failed to delete maintenance setting');
      return;
    }

    await fetchMaintenanceSettings();
    toast.success('Maintenance setting deleted successfully!');
  };

  const performMaintenance = async (recordData: Omit<MaintenanceRecord, 'id'>) => {
    const { error: recordError } = await supabase
      .from('maintenance_records')
      .insert([recordData]);

    if (recordError) {
      console.error('Error performing maintenance:', recordError);
      toast.error('Failed to perform maintenance');
      return;
    }

    const { error: componentError } = await supabase
      .from('components')
      .update({
        last_maintenance_date: recordData.date,
        last_maintenance_hour: recordData.hourMeter,
        next_maintenance_hour: recordData.nextMaintenanceHour
      })
      .eq('id', recordData.componentId);

    if (componentError) {
      console.error('Error updating component:', componentError);
      toast.error('Failed to update component');
      return;
    }

    await fetchMaintenanceRecords();
    await fetchComponents();
    toast.success('Maintenance performed successfully!');
  };

  const getMaintenanceHistory = (equipmentId: string) => {
    return [...maintenanceRecords]
      .filter(record => record.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getUpcomingMaintenance = () => {
    console.log('Checking upcoming maintenance...');
    const result: any[] = [];
    
    equipment.forEach(unit => {
      console.log(`Checking equipment: ${unit.name}, Hour meter: ${unit.hourMeter}`);
      
      // Check components maintenance
      const unitComponents = components.filter(c => c.equipmentId === unit.id);
      unitComponents.forEach(component => {
        const hoursRemaining = component.nextMaintenanceHour - unit.hourMeter;
        console.log(`Component: ${component.name}, Next maintenance: ${component.nextMaintenanceHour}, Hours remaining: ${hoursRemaining}`);
        
        if (hoursRemaining > 0 && hoursRemaining <= 500) {
          result.push({
            equipmentId: unit.id,
            component: component.name,
            type: component.category,
            currentHours: unit.hourMeter,
            nextMaintenanceHour: component.nextMaintenanceHour,
          });
          console.log(`Added to upcoming maintenance: ${component.name}`);
        }
      });
    });
    
    console.log(`Found ${result.length} upcoming maintenance items`);
    return result.sort((a, b) => 
      (a.nextMaintenanceHour - a.currentHours) - (b.nextMaintenanceHour - b.currentHours)
    );
  };

  const getOverdueMaintenance = () => {
    console.log('Checking overdue maintenance...');
    const result: any[] = [];
    
    equipment.forEach(unit => {
      console.log(`Checking equipment: ${unit.name}, Hour meter: ${unit.hourMeter}`);
      
      // Check components maintenance
      const unitComponents = components.filter(c => c.equipmentId === unit.id);
      unitComponents.forEach(component => {
        const hoursRemaining = component.nextMaintenanceHour - unit.hourMeter;
        console.log(`Component: ${component.name}, Next maintenance: ${component.nextMaintenanceHour}, Hours remaining: ${hoursRemaining}`);
        
        if (hoursRemaining <= 0) {
          result.push({
            equipmentId: unit.id,
            component: component.name,
            type: component.category,
            currentHours: unit.hourMeter,
            nextMaintenanceHour: component.nextMaintenanceHour,
          });
          console.log(`Added to overdue maintenance: ${component.name}`);
        }
      });
    });
    
    console.log(`Found ${result.length} overdue maintenance items`);
    return result.sort((a, b) => 
      (b.currentHours - b.nextMaintenanceHour) - (a.currentHours - a.nextMaintenanceHour)
    );
  };

  const getCompletedMaintenance = () => {
    return [...maintenanceRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const contextValue: MaintenanceContextType = {
    equipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    updateEquipmentHourMeter,
    getHourMeterReadings,
    
    components,
    addComponent,
    updateComponent,
    deleteComponent,
    
    maintenanceSettings,
    addMaintenanceSetting,
    updateMaintenanceSetting,
    deleteMaintenanceSetting,
    
    maintenanceRecords,
    performMaintenance,
    getMaintenanceHistory,
    
    getUpcomingMaintenance,
    getOverdueMaintenance,
    getCompletedMaintenance,
  };

  return (
    <MaintenanceContext.Provider value={contextValue}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenanceContext = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenanceContext must be used within a MaintenanceProvider');
  }
  return context;
};