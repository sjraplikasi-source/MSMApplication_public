// src/offline/syncService.ts

import { dbPromise } from "./queueDB"
import { supabase } from "@/lib/supabase"

export async function syncQueue() {

  const db = await dbPromise
  const tx = db.transaction("queue", "readwrite")
  const store = tx.objectStore("queue")

  const items = await store.getAll()

  for (const item of items) {

    try {

      const payload = item.payload

      if (item.action === "INSERT") {

        await supabase
          .from(payload.table)
          .insert(payload.data)

      }

      if (item.action === "UPDATE") {

        await supabase
          .from(payload.table)
          .update(payload.data)
          .match(payload.match)

      }

      if (item.action === "DELETE") {

        await supabase
          .from(payload.table)
          .delete()
          .match(payload.match)

      }

      await store.delete(item.id)

    } catch (err) {

      console.error("Sync gagal:", err)

      // stop jika ada error supaya tidak merusak urutan
      break
    }
  }

  await tx.done
}