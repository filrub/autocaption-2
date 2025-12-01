/**
 * User Cache System using IndexedDB
 *
 * Caches users in IndexedDB to avoid downloading on every app start.
 * IndexedDB has much larger storage limits than localStorage (~5MB).
 */

const DB_NAME = "autocaption_cache";
const DB_VERSION = 1;
const STORE_NAME = "users";
const META_STORE = "meta";

let db = null;

/**
 * Initialize IndexedDB
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create users store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }

      // Create meta store
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
  });
}

/**
 * Get cached users from IndexedDB
 */
export async function getCachedUsers() {
  try {
    const database = await initDB();

    // Get metadata
    const meta = await new Promise((resolve, reject) => {
      const tx = database.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const request = store.get("cache_meta");
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });

    if (!meta) {
      console.log("📦 No cache found");
      return null;
    }

    // Get all users
    const users = await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (!users || users.length === 0) {
      return null;
    }

    console.log(
      `📦 Loaded ${users.length} users from cache (saved ${formatTimeAgo(meta.lastSync)})`
    );
    return { users, meta };
  } catch (error) {
    console.error("Error reading cache:", error);
    await clearCache();
    return null;
  }
}

/**
 * Save users to IndexedDB cache
 */
export async function setCachedUsers(users, options = {}) {
  try {
    const database = await initDB();

    // Clear old users and add new ones
    const tx = database.transaction([STORE_NAME, META_STORE], "readwrite");
    const usersStore = tx.objectStore(STORE_NAME);
    const metaStore = tx.objectStore(META_STORE);

    // Clear existing users
    await new Promise((resolve, reject) => {
      const request = usersStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add all users
    for (const user of users) {
      usersStore.put(user);
    }

    // Save metadata
    const meta = {
      key: "cache_meta",
      value: {
        lastSync: Date.now(),
        userCount: users.length,
        ...options,
      },
    };
    metaStore.put(meta);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log(`💾 Cached ${users.length} users to IndexedDB`);
  } catch (error) {
    console.error("Error saving cache:", error);
  }
}

/**
 * Clear the cache
 */
export async function clearCache() {
  try {
    const database = await initDB();
    const tx = database.transaction([STORE_NAME, META_STORE], "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
    console.log("🗑️ Cache cleared");
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Get cache metadata
 */
export async function getCacheMeta() {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const request = store.get("cache_meta");
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Check if cache needs refresh based on time
 */
export async function isCacheStale(maxAgeMs = 60 * 60 * 1000) {
  const meta = await getCacheMeta();
  if (!meta || !meta.lastSync) return true;
  return Date.now() - meta.lastSync > maxAgeMs;
}

/**
 * Format time ago for display
 */
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Compare two user arrays to check if they're different
 */
export function hasUsersChanged(cachedUsers, freshUsers) {
  if (!cachedUsers || !freshUsers) return true;
  if (cachedUsers.length !== freshUsers.length) return true;

  // Create a map of cached user IDs
  const cachedIds = new Set(cachedUsers.map((u) => u.id));
  const freshIds = new Set(freshUsers.map((u) => u.id));

  // Check if all IDs match
  if (cachedIds.size !== freshIds.size) return true;
  for (const id of cachedIds) {
    if (!freshIds.has(id)) return true;
  }

  // Check groups (most likely to change)
  const cachedGroupMap = new Map(
    cachedUsers.map((u) => [u.id, (u.groups || []).sort().join(",")])
  );
  for (const user of freshUsers) {
    const cachedGroups = cachedGroupMap.get(user.id);
    const freshGroups = (user.groups || []).sort().join(",");
    if (cachedGroups !== freshGroups) return true;
  }

  return false;
}

/**
 * Get cache statistics for display
 */
export async function getCacheStats() {
  const meta = await getCacheMeta();
  if (!meta) return null;

  return {
    userCount: meta.userCount || 0,
    lastSync: meta.lastSync
      ? new Date(meta.lastSync).toLocaleString()
      : "Never",
    lastSyncAgo: meta.lastSync ? formatTimeAgo(meta.lastSync) : "Never",
    isStale: await isCacheStale(),
  };
}
