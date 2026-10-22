// IndexedDB-backed offline SOS queue. Stores SOS requests locally when offline
// and synchronizes them to the backend when connectivity returns.
const DB_NAME = "aapdasetu";
const STORE = "sos_queue";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueSOS(sos) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add({ ...sos, queuedAt: Date.now(), synced: false });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Fallback to localStorage if IndexedDB is unavailable
    const existing = JSON.parse(localStorage.getItem("aapdasetu_sos_queue") || "[]");
    existing.push({ ...sos, queuedAt: Date.now(), synced: false });
    localStorage.setItem("aapdasetu_sos_queue", JSON.stringify(existing));
    return true;
  }
}

export async function getQueuedSOS() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return JSON.parse(localStorage.getItem("aapdasetu_sos_queue") || "[]");
  }
}

export async function removeQueuedSOS(localId) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(localId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    const existing = JSON.parse(localStorage.getItem("aapdasetu_sos_queue") || "[]");
    localStorage.setItem("aapdasetu_sos_queue", JSON.stringify(existing.filter((s) => s.localId !== localId)));
    return true;
  }
}

export async function syncQueue(createFn) {
  const items = await getQueuedSOS();
  const pending = items.filter((s) => !s.synced);
  const synced = [];
  for (const item of pending) {
    try {
      await createFn(item);
      await removeQueuedSOS(item.localId);
      synced.push(item.localId);
    } catch (e) {
      break; // stop on first failure, retry later
    }
  }
  return synced;
}