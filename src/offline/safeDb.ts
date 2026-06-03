// ======================================
// src/offline/safeDb.ts
// Universal Offline Safe Database Helper
// ======================================

import { supabase } from "@/lib/supabase"
import { addToQueue } from "./queueService"

export async function safeInsert(table: string, data: any) {

  if (navigator.onLine) {
    const { data: inserted, error } = await supabase
  .from(table)
  .insert(data)
  .select()
  .single()

if (error) throw error

return inserted
  }

  await addToQueue("INSERT", {
    table,
    data
  })
}

export async function safeUpdate(table: string, data: any, match: any) {

  if (navigator.onLine) {
    const { error } = await supabase
      .from(table)
      .update(data)
      .match(match)

    if (error) throw error
    return
  }

  await addToQueue("UPDATE", {
    table,
    data,
    match
  })
}

export async function safeDelete(table: string, match: any) {

  if (navigator.onLine) {
    const { error } = await supabase
      .from(table)
      .delete()
      .match(match)

    if (error) throw error
    return
  }

  await addToQueue("DELETE", {
    table,
    match
  })
}