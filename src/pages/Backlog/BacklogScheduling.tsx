import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import Select from "react-select";

type Backlog = {
  id: string;
  registration_code: string | null;
  unit_code: string;
  problem: string;
  date: string;
  priority?: "High" | "Medium" | "Low" | "Improve";
  status: string;
};

type ManpowerOption = { value: string; label: string };
type ShutdownEventOption = { value: string; label: string };

const BacklogScheduling: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"reguler" | "shutdown">("reguler");

  const [allBacklogs, setAllBacklogs] = useState<Backlog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");

  const [selectedBacklog, setSelectedBacklog] = useState<Backlog | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [assignedMechanics, setAssignedMechanics] = useState<ManpowerOption[]>([]);
  const [mechanicOptions, setMechanicOptions] = useState<ManpowerOption[]>([]);
  const [shutdownEvents, setShutdownEvents] = useState<ShutdownEventOption[]>([]);
  const [selectedShutdown, setSelectedShutdown] = useState<ShutdownEventOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from("backlogs")
      .select("id, registration_code, unit_code, problem, date, priority, status")
      .in("status", ["siap_dijadwalkan", "menunggu_shutdown"])
      .order("date", { ascending: true });

    const { data: mechanics } = await supabase
      .from("manpower")
      .select("id, name, nrp")
      .order("name");

    const { data: events } = await supabase
      .from("shutdown_events")
      .select("id, title, start_time")
      .eq("status", "Direncanakan")
      .order("start_time");

    setAllBacklogs(data || []);

    setMechanicOptions(
      (mechanics || []).map((m: any) => ({
        value: m.id,
        label: m.nrp ? `${m.name} / ${m.nrp}` : m.name,
      }))
    );

    setShutdownEvents(
      (events || []).map((e: any) => ({
        value: e.id,
        label: `${new Date(e.start_time).toLocaleDateString()} - ${e.title}`,
      }))
    );
  };

  if (user?.role === "mechanic") {
    return <p className="p-4 text-red-600">Akses ditolak.</p>;
  }

  /* ================= FILTERING ================= */

  const currentBacklogs = useMemo(() => {
    const filtered = allBacklogs
      .filter((b) =>
        activeTab === "reguler"
          ? b.status === "siap_dijadwalkan"
          : b.status === "menunggu_shutdown"
      )
      .filter(
        (b) =>
          b.registration_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.unit_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.problem.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((b) =>
        priorityFilter === "ALL" ? true : b.priority === priorityFilter
      )
      .sort((a, b) => {
        if (sortBy === "date") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        const order = { High: 1, Medium: 2, Low: 3, Improve: 4 };
        return (order[a.priority || "Low"] || 99) - (order[b.priority || "Low"] || 99);
      });

    return filtered;
  }, [allBacklogs, activeTab, searchTerm, priorityFilter, sortBy]);

  const regulerCount = allBacklogs.filter(b => b.status === "siap_dijadwalkan").length;
  const shutdownCount = allBacklogs.filter(b => b.status === "menunggu_shutdown").length;

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case "High": return "bg-red-600";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  /* ================= SCHEDULING ================= */

  const handleScheduleSubmit = async () => {
    if (!selectedBacklog || !scheduledDate || assignedMechanics.length === 0) {
      alert("Tanggal & Mekanik wajib diisi.");
      return;
    }

    if (activeTab === "shutdown" && !selectedShutdown) {
      alert("Backlog shutdown wajib ditautkan ke event.");
      return;
    }

    setIsSaving(true);

    await supabase
      .from("backlogs")
      .update({
        status: "dijadwalkan",
        scheduled_date: scheduledDate,
        shutdown_event_id: activeTab === "shutdown" ? selectedShutdown?.value : null,
        scheduled_by: user?.id,
        scheduled_at: new Date().toISOString(),
      })
      .eq("id", selectedBacklog.id);

    await supabase.from("backlog_assignments").delete().eq("backlog_id", selectedBacklog.id);

    const assignments = assignedMechanics.map((m) => ({
      backlog_id: selectedBacklog.id,
      manpower_id: m.value,
    }));

    await supabase.from("backlog_assignments").insert(assignments);

    setSelectedBacklog(null);
    fetchData();
    setIsSaving(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <h2 className="text-2xl font-bold">Backlog Scheduling</h2>

      {/* ===== TAB BAR ===== */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("reguler")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "reguler"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
        >
          Reguler ({regulerCount})
        </button>

        <button
          onClick={() => setActiveTab("shutdown")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "shutdown"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
        >
          Butuh Shutdown ({shutdownCount})
        </button>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="bg-white p-4 rounded shadow flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          className="border px-3 py-2 rounded text-sm w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="border px-3 py-2 rounded text-sm"
        >
          <option value="ALL">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border px-3 py-2 rounded text-sm"
        >
          <option value="date">Sort by Date</option>
          <option value="priority">Sort by Priority</option>
        </select>
      </div>

      {/* ===== LIST ===== */}
      {currentBacklogs.length === 0 ? (
        <p>Tidak ada backlog pada tab ini.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentBacklogs.map((b) => {
            const aging = Math.floor(
              (Date.now() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div key={b.id} className="bg-white p-4 rounded shadow hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {b.registration_code} - {b.unit_code}
                    </p>
                    <p className="text-sm text-gray-600">{b.problem}</p>
                  </div>

                  <span className={`px-2 py-1 text-xs text-white rounded ${getPriorityColor(b.priority)}`}>
                    {b.priority || "Low"}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-500 flex justify-between">
                  <span>Tgl Lapor: {new Date(b.date).toLocaleDateString()}</span>
                  <span className={aging > 7 ? "text-red-600 font-semibold" : ""}>
                    Aging: {aging} hari
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedBacklog(b);
                    setScheduledDate(new Date().toISOString().split("T")[0]);
                    setAssignedMechanics([]);
                    setSelectedShutdown(null);
                  }}
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Jadwalkan
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL ===== */}
      {selectedBacklog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">
              Jadwalkan: {selectedBacklog.registration_code}
            </h3>

            {activeTab === "shutdown" && (
              <div>
                <label className="block text-sm mb-1">Tautkan Event Shutdown</label>
                <Select
                  options={shutdownEvents}
                  value={selectedShutdown}
                  onChange={(opt) => setSelectedShutdown(opt as any)}
                />
              </div>
            )}

            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <Select
              isMulti
              options={mechanicOptions}
              value={assignedMechanics}
              onChange={(opts) => setAssignedMechanics(opts as any)}
              placeholder="Pilih mekanik..."
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedBacklog(null)} className="border px-4 py-2 rounded">
                Batal
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={isSaving}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacklogScheduling;