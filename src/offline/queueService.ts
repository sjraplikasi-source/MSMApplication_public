// src/offline/queueService.ts

import { dbPromise } from "./queueDB"

export async function addToQueue(action: string, payload: any) {
  const db = await dbPromise

  await db.add("queue", {
    action,
    payload,
    created_at: new Date().toISOString(),
  })
}