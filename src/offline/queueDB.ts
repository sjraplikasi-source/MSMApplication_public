// src/offline/queueDB.ts

import { openDB } from "idb"

export const dbPromise = openDB("msm-offline-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("queue")) {
      db.createObjectStore("queue", {
        keyPath: "id",
        autoIncrement: true,
      })
    }
  },
})