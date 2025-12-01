import { supabase } from '@/lib/supabaseClient';
import { addDays, format } from 'date-fns';

export async function generateNextWeeklyCheck() {
  const { data, error } = await supabase
    .from('weekly_check_schedule')
    .select('*')
    .order('plan_date', { ascending: false });

  if (error) {
    console.error('Fetch error:', error.message);
    return;
  }

  const latestByEquipment: Record<string, any> = {};

  for (const entry of data || []) {
    if (!entry.actual_date || !entry.interval_days) continue;
    if (!latestByEquipment[entry.equipment_id]) {
      latestByEquipment[entry.equipment_id] = entry;
    }
  }

  for (const eqId in latestByEquipment) {
    const last = latestByEquipment[eqId];
    const nextPlan = addDays(new Date(last.actual_date), last.interval_days);
    const nextPlanStr = format(nextPlan, 'yyyy-MM-dd');

    const { data: existing } = await supabase
      .from('weekly_check_schedule')
      .select('id')
      .eq('equipment_id', eqId)
      .eq('plan_date', nextPlanStr);

    if (existing && existing.length > 0) continue;

    await supabase.from('weekly_check_schedule').insert({
      equipment_id: eqId,
      plan_date: nextPlanStr,
      interval_days: last.interval_days,
    });

    console.log(`✅ Generated next schedule for ${eqId} on ${nextPlanStr}`);
  }
}
