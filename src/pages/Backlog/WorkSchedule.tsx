// src/pages/Backlog/WorkSchedule.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Power } from 'lucide-react';
import Select from 'react-select';

// Setup untuk kalender
const localizer = momentLocalizer(moment);

const WorkSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk filter
  const [mechanicOptions, setMechanicOptions] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [unitOptions, setUnitOptions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Ambil semua backlog yang dijadwalkan
      const { data: backlogs, error } = await supabase
        .from('backlogs')
        .select(`
          id, scheduled_date, problem, unit_code,
          shutdown_event:shutdown_event_id (title),
          backlog_assignments (manpower(id, name))
        `)
        .eq('status', 'dijadwalkan');

      if (error) {
        console.error("Error fetching scheduled backlogs:", error);
        setLoading(false);
        return;
      }

      // Proses data untuk kalender
      const calendarEvents = backlogs.map(b => ({
        id: b.id,
        title: `${b.unit_code}: ${b.problem}`,
        start: new Date(b.scheduled_date),
        end: new Date(b.scheduled_date),
        allDay: true,
        resource: {
          isShutdown: !!b.shutdown_event,
          shutdownTitle: b.shutdown_event?.title,
          mechanics: b.backlog_assignments.map(a => ({ id: a.manpower.id, name: a.manpower.name }))
        }
      }));
      setEvents(calendarEvents);
      
      // Ambil data untuk filter
      const uniqueMechanics = new Map();
      const uniqueUnits = new Map();
      backlogs.forEach(b => {
        uniqueUnits.set(b.unit_code, { value: b.unit_code, label: b.unit_code });
        b.backlog_assignments.forEach(a => {
            uniqueMechanics.set(a.manpower.id, { value: a.manpower.id, label: a.manpower.name });
        });
      });
      setMechanicOptions(Array.from(uniqueMechanics.values()));
      setUnitOptions(Array.from(uniqueUnits.values()));
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // Logika untuk memberi warna pada event
  const eventPropGetter = (event) => {
    const backgroundColor = event.resource.isShutdown ? '#fee2e2' : '#dbeafe'; // Merah untuk shutdown, Biru untuk reguler
    const borderColor = event.resource.isShutdown ? '#ef4444' : '#3b82f6';
    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: '#1f2937',
      border: `1px solid ${borderColor}`,
      display: 'block'
    };
    return { style };
  };

  // Komponen custom untuk event di kalender
  const CustomEvent = ({ event }) => (
    <div className="text-xs">
      <div className="font-semibold truncate">{event.title}</div>
      <div className="flex items-center gap-1">
        {event.resource.isShutdown && <Power size={12} className="text-red-600" />}
        <span>{event.resource.mechanics.map(m => m.name).join(', ')}</span>
      </div>
    </div>
  );

  // Logika untuk memfilter event yang tampil
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
        const mechanicMatch = !selectedMechanic || event.resource.mechanics.some(m => m.id === selectedMechanic.value);
        const unitMatch = !selectedUnit || event.title.startsWith(selectedUnit.value);
        return mechanicMatch && unitMatch;
    });
  }, [events, selectedMechanic, selectedUnit]);

  return (
    <div className="p-6 max-w-full mx-auto bg-white rounded-lg border">
      <h2 className="text-xl font-bold mb-4">Jadwal Kerja (Tampilan Kalender)</h2>
      
      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex-1">
              <label className="text-sm font-medium">Filter by Mekanik</label>
              <Select options={mechanicOptions} isClearable value={selectedMechanic} onChange={setSelectedMechanic} />
          </div>
          <div className="flex-1">
              <label className="text-sm font-medium">Filter by Unit</label>
              <Select options={unitOptions} isClearable value={selectedUnit} onChange={setSelectedUnit} />
          </div>
      </div>

      <div style={{ height: '75vh' }}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={eventPropGetter}
          components={{ event: CustomEvent }}
          onSelectEvent={event => navigate(`/Backlog/detail/${event.id}`)}
        />
      </div>
    </div>
  );
};

export default WorkSchedule;
