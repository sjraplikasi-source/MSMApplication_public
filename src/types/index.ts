// src/types/index.ts
export type User = {
  id: string;
  email: string;
  name: string;
  nrp?: string;
  role: 'mechanic' | 'group_leader' | 'planner';
};

export type Equipment = {
  id: string;
  code: string;
  name: string;
};

export type RepairReport = {
  id: string;
  wo_number: string;
  equipment_id: string;
  equipment?: Equipment;
  start_date: string;
  start_hour: string;
  finish_date: string;
  finish_hour: string;
  area: string;
  hour_meter: number;
  shift: 'Shift 1' | 'Shift 2';
  status_breakdown: 'Schedule' | 'Unschedule';
  activity_status: 'RFU' | 'Pending Job';
  mechanic_comment?: string;
  submitted_by?: string;
  approved_by?: string;
  approved_name?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
};