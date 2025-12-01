/**
 * Local Database Service using IndexedDB
 * 
 * This is the main data store for the app. All operations happen locally
 * and are synced to Supabase when the user clicks "Sync".
 */

const DB_NAME = "autocaption_db";
const DB_VERSION = 2;

// Store names
const STORES = {
  USERS: "users",
  GROUPS: "groups",
  USER_GROUPS: "user_groups",
  PENDING_CHANGES: "pending_changes",
  META: "meta"
};

let db = null;

/**
 * Initialize IndexedDB
 */
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log("📦 Local database initialized");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Users store
      if (!database.objectStoreNames.contains(STORES.USERS)) {
        const usersStore = database.createObjectStore(STORES.USERS, { keyPath: "id", autoIncrement: true });
        usersStore.createIndex("name", "name", { unique: true });
      }

      // Groups store
      if (!database.objectStoreNames.contains(STORES.GROUPS)) {
        const groupsStore = database.createObjectStore(STORES.GROUPS, { keyPath: "id", autoIncrement: true });
        groupsStore.createIndex("name", "name", { unique: true });
      }

      // User-Groups junction store
      if (!database.objectStoreNames.contains(STORES.USER_GROUPS)) {
        const ugStore = database.createObjectStore(STORES.USER_GROUPS, { keyPath: ["user_id", "group_id"] });
        ugStore.createIndex("user_id", "user_id");
        ugStore.createIndex("group_id", "group_id");
      }

      // Pending changes store (for sync)
      if (!database.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
        const changesStore = database.createObjectStore(STORES.PENDING_CHANGES, { keyPath: "id", autoIncrement: true });
        changesStore.createIndex("type", "type");
        changesStore.createIndex("timestamp", "timestamp");
      }

      // Meta store (sync info, etc.)
      if (!database.objectStoreNames.contains(STORES.META)) {
        database.createObjectStore(STORES.META, { keyPath: "key" });
      }

      console.log("📦 Database schema created/upgraded");
    };
  });
}

/**
 * Generic transaction helper
 */
async function transaction(storeNames, mode, callback) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeNames, mode);
    const result = callback(tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Add a pending change for sync
 */
async function addPendingChange(type, entity, data) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.PENDING_CHANGES, "readwrite");
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const change = {
      type,        // "user_add", "user_update", "user_delete", "group_add", "group_remove"
      entity,      // "user", "group", "user_group"
      data,        // The actual data
      timestamp: Date.now()
    };
    const request = store.add(change);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =====================================================
// USER OPERATIONS
// =====================================================

/**
 * Get all users with their groups
 */
export async function getAllUsers() {
  const database = await initDB();
  
  // Get all users
  const users = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readonly");
    const store = tx.objectStore(STORES.USERS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  // Get all user-group relationships
  const userGroups = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USER_GROUPS, "readonly");
    const store = tx.objectStore(STORES.USER_GROUPS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  // Get all groups for name lookup
  const groups = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.GROUPS, "readonly");
    const store = tx.objectStore(STORES.GROUPS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  // Build groups map
  const groupsById = new Map(groups.map(g => [g.id, g.name]));

  // Build user-groups map
  const userGroupsMap = new Map();
  for (const ug of userGroups) {
    if (!userGroupsMap.has(ug.user_id)) {
      userGroupsMap.set(ug.user_id, []);
    }
    const groupName = groupsById.get(ug.group_id);
    if (groupName) {
      userGroupsMap.get(ug.user_id).push(groupName);
    }
  }

  // Merge groups into users
  return users.map(user => ({
    ...user,
    groups: userGroupsMap.get(user.id) || []
  }));
}

/**
 * Get a user by name
 */
export async function getUserByName(name) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readonly");
    const store = tx.objectStore(STORES.USERS);
    const index = store.index("name");
    const request = index.get(name.toUpperCase());
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add or update a user (upsert by name)
 * If user exists, appends descriptor. If not, creates new user.
 */
export async function addOrUpdateUser(name, descriptor, thumbnailUrl = null) {
  const database = await initDB();
  const normalizedName = name.toUpperCase().trim();
  
  // Check if user exists
  const existingUser = await getUserByName(normalizedName);
  
  if (existingUser) {
    // Append descriptor to existing user
    const updatedDescriptor = [...(existingUser.descriptor || []), ...descriptor];
    
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.USERS, "readwrite");
      const store = tx.objectStore(STORES.USERS);
      const updatedUser = {
        ...existingUser,
        descriptor: updatedDescriptor,
        thumbnail_url: existingUser.thumbnail_url || thumbnailUrl
      };
      const request = store.put(updatedUser);
      request.onsuccess = async () => {
        await addPendingChange("user_update", "user", { 
          id: existingUser.id, 
          name: normalizedName, 
          descriptor: updatedDescriptor,
          thumbnail_url: updatedUser.thumbnail_url
        });
        resolve(updatedUser);
      };
      request.onerror = () => reject(request.error);
    });
  } else {
    // Create new user
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.USERS, "readwrite");
      const store = tx.objectStore(STORES.USERS);
      const newUser = {
        name: normalizedName,
        descriptor: descriptor,
        thumbnail_url: thumbnailUrl,
        created_at: new Date().toISOString()
      };
      const request = store.add(newUser);
      request.onsuccess = async () => {
        newUser.id = request.result;
        await addPendingChange("user_add", "user", newUser);
        resolve(newUser);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Update user thumbnail
 */
export async function updateUserThumbnail(userId, thumbnailUrl) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readwrite");
    const store = tx.objectStore(STORES.USERS);
    const getRequest = store.get(userId);
    
    getRequest.onsuccess = () => {
      const user = getRequest.result;
      if (user) {
        user.thumbnail_url = thumbnailUrl;
        const putRequest = store.put(user);
        putRequest.onsuccess = () => resolve(user);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete a user and their group associations
 */
export async function deleteUser(userId) {
  const database = await initDB();
  
  // Get user info before deleting (for sync)
  const user = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readonly");
    const store = tx.objectStore(STORES.USERS);
    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Delete user
  await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readwrite");
    const store = tx.objectStore(STORES.USERS);
    const request = store.delete(userId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Delete user-group associations
  const userGroups = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USER_GROUPS, "readonly");
    const store = tx.objectStore(STORES.USER_GROUPS);
    const index = store.index("user_id");
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  for (const ug of userGroups) {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.USER_GROUPS, "readwrite");
      const store = tx.objectStore(STORES.USER_GROUPS);
      const request = store.delete([ug.user_id, ug.group_id]);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Add pending change
  if (user) {
    await addPendingChange("user_delete", "user", { id: userId, name: user.name });
  }

  return true;
}

/**
 * Remove a single face descriptor from a user
 */
export async function removeUserDescriptor(userId, descriptorIndex) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readwrite");
    const store = tx.objectStore(STORES.USERS);
    const getRequest = store.get(userId);
    
    getRequest.onsuccess = async () => {
      const user = getRequest.result;
      if (user && user.descriptor && user.descriptor.length > descriptorIndex) {
        user.descriptor.splice(descriptorIndex, 1);
        
        if (user.descriptor.length === 0) {
          // No more descriptors, delete the user
          await deleteUser(userId);
          resolve({ deleted: true, user });
        } else {
          // Update user with remaining descriptors
          const putRequest = store.put(user);
          putRequest.onsuccess = async () => {
            await addPendingChange("user_update", "user", { 
              id: userId, 
              name: user.name, 
              descriptor: user.descriptor 
            });
            resolve({ deleted: false, user });
          };
          putRequest.onerror = () => reject(putRequest.error);
        }
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// =====================================================
// GROUP OPERATIONS
// =====================================================

/**
 * Get all groups
 */
export async function getAllGroups() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.GROUPS, "readonly");
    const store = tx.objectStore(STORES.GROUPS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get or create a group by name
 */
export async function getOrCreateGroup(name) {
  const database = await initDB();
  const normalizedName = name.toUpperCase().trim();
  
  // Check if exists
  const existing = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.GROUPS, "readonly");
    const store = tx.objectStore(STORES.GROUPS);
    const index = store.index("name");
    const request = index.get(normalizedName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (existing) return existing;

  // Create new group
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.GROUPS, "readwrite");
    const store = tx.objectStore(STORES.GROUPS);
    const newGroup = {
      name: normalizedName,
      created_at: new Date().toISOString()
    };
    const request = store.add(newGroup);
    request.onsuccess = async () => {
      newGroup.id = request.result;
      await addPendingChange("group_add", "group", newGroup);
      resolve(newGroup);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add user to group
 */
export async function addUserToGroup(userId, groupName) {
  const group = await getOrCreateGroup(groupName);
  const database = await initDB();

  // Get user name for sync
  const user = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readonly");
    const store = tx.objectStore(STORES.USERS);
    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Check if relationship already exists
  const existing = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USER_GROUPS, "readonly");
    const store = tx.objectStore(STORES.USER_GROUPS);
    const request = store.get([userId, group.id]);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (existing) return; // Already in group

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USER_GROUPS, "readwrite");
    const store = tx.objectStore(STORES.USER_GROUPS);
    const ug = { user_id: userId, group_id: group.id };
    const request = store.add(ug);
    request.onsuccess = async () => {
      await addPendingChange("group_add_user", "user_group", { 
        user_id: userId, 
        user_name: user?.name || "",
        group_name: group.name 
      });
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove user from group
 */
export async function removeUserFromGroup(userId, groupName) {
  const database = await initDB();
  const normalizedName = groupName.toUpperCase().trim();

  // Get user name for sync
  const user = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readonly");
    const store = tx.objectStore(STORES.USERS);
    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Find group
  const group = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.GROUPS, "readonly");
    const store = tx.objectStore(STORES.GROUPS);
    const index = store.index("name");
    const request = index.get(normalizedName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!group) return;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USER_GROUPS, "readwrite");
    const store = tx.objectStore(STORES.USER_GROUPS);
    const request = store.delete([userId, group.id]);
    request.onsuccess = async () => {
      await addPendingChange("group_remove_user", "user_group", { 
        user_id: userId,
        user_name: user?.name || "",
        group_name: normalizedName 
      });
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// =====================================================
// SYNC OPERATIONS
// =====================================================

/**
 * Get pending changes count
 */
export async function getPendingChangesCount() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.PENDING_CHANGES, "readonly");
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending changes
 */
export async function getPendingChanges() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.PENDING_CHANGES, "readonly");
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all pending changes (after successful sync)
 */
export async function clearPendingChanges() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.PENDING_CHANGES, "readwrite");
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get/set last sync time
 */
export async function getLastSyncTime() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.META, "readonly");
    const store = tx.objectStore(STORES.META);
    const request = store.get("lastSync");
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

export async function setLastSyncTime(timestamp = Date.now()) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.META, "readwrite");
    const store = tx.objectStore(STORES.META);
    const request = store.put({ key: "lastSync", value: timestamp });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Import users from server (initial sync or full refresh)
 */
export async function importUsersFromServer(users, groups = []) {
  const database = await initDB();

  // Clear existing data
  await new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.USERS, STORES.GROUPS, STORES.USER_GROUPS], "readwrite");
    tx.objectStore(STORES.USERS).clear();
    tx.objectStore(STORES.GROUPS).clear();
    tx.objectStore(STORES.USER_GROUPS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Import groups first
  const groupIdMap = new Map(); // old id -> new id
  for (const group of groups) {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.GROUPS, "readwrite");
      const store = tx.objectStore(STORES.GROUPS);
      const newGroup = {
        name: group.name.toUpperCase(),
        created_at: group.created_at || new Date().toISOString(),
        remote_id: group.id // Keep track of remote ID
      };
      const request = store.add(newGroup);
      request.onsuccess = () => {
        groupIdMap.set(group.id, request.result);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Create groups from user.groups if not already created
  for (const user of users) {
    if (user.groups) {
      for (const groupName of user.groups) {
        const normalized = groupName.toUpperCase();
        const exists = await new Promise((resolve, reject) => {
          const tx = database.transaction(STORES.GROUPS, "readonly");
          const store = tx.objectStore(STORES.GROUPS);
          const index = store.index("name");
          const request = index.get(normalized);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        if (!exists) {
          await new Promise((resolve, reject) => {
            const tx = database.transaction(STORES.GROUPS, "readwrite");
            const store = tx.objectStore(STORES.GROUPS);
            const request = store.add({
              name: normalized,
              created_at: new Date().toISOString()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
    }
  }

  // Get final groups map
  const allGroups = await getAllGroups();
  const groupNameToId = new Map(allGroups.map(g => [g.name, g.id]));

  // Import users
  for (const user of users) {
    const newUserId = await new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.USERS, "readwrite");
      const store = tx.objectStore(STORES.USERS);
      const newUser = {
        name: user.name.toUpperCase(),
        descriptor: user.descriptor || [],
        thumbnail_url: user.thumbnail_url || null,
        created_at: user.created_at || new Date().toISOString(),
        remote_id: user.id // Keep track of remote ID
      };
      const request = store.add(newUser);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Add user-group relationships
    if (user.groups) {
      for (const groupName of user.groups) {
        const groupId = groupNameToId.get(groupName.toUpperCase());
        if (groupId) {
          await new Promise((resolve, reject) => {
            const tx = database.transaction(STORES.USER_GROUPS, "readwrite");
            const store = tx.objectStore(STORES.USER_GROUPS);
            const request = store.add({ user_id: newUserId, group_id: groupId });
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(); // Ignore duplicates
          });
        }
      }
    }
  }

  // Clear pending changes after import
  await clearPendingChanges();
  await setLastSyncTime();

  console.log(`📦 Imported ${users.length} users and ${allGroups.length} groups to local database`);
}

/**
 * Check if local database has any data
 */
export async function hasLocalData() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.USERS, "readonly");
    const store = tx.objectStore(STORES.USERS);
    const request = store.count();
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Format time ago for display
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return "Mai";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s fa`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
  return `${Math.floor(seconds / 86400)}g fa`;
}
