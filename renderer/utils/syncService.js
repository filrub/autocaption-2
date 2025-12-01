/**
 * Sync Service
 * 
 * Handles synchronization between local IndexedDB and Supabase.
 * Strategy: Push local changes, then pull remote updates.
 */

import {
  getPendingChanges,
  clearPendingChanges,
  setLastSyncTime,
  getAllUsers,
  getAllGroups,
  importUsersFromServer
} from "./localDatabase.js";

/**
 * Fetch all users from Supabase (paginated)
 */
async function fetchUsersFromSupabase(supabase) {
  const PAGE_SIZE = 100;
  let allUsers = [];
  let page = 0;
  let hasMore = true;

  console.log("📥 Fetching users from Supabase...");

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("recognized_faces")
      .select("id, name, descriptor, created_at, thumbnail_url")
      .order("id")
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allUsers = [...allUsers, ...data];
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  // Fetch groups separately
  const { data: userGroups, error: groupsError } = await supabase
    .from("user_groups")
    .select("user_id, groups(name)");

  if (groupsError) {
    console.warn("Could not fetch groups:", groupsError);
  }

  // Build groups map
  const groupsMap = new Map();
  if (userGroups) {
    for (const ug of userGroups) {
      if (!groupsMap.has(ug.user_id)) {
        groupsMap.set(ug.user_id, []);
      }
      if (ug.groups?.name) {
        groupsMap.get(ug.user_id).push(ug.groups.name);
      }
    }
  }

  // Fetch all groups
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, created_at");

  // Merge groups into users
  const usersWithGroups = allUsers.map(user => ({
    ...user,
    groups: groupsMap.get(user.id) || []
  }));

  return { users: usersWithGroups, groups: groups || [] };
}

/**
 * Push a single pending change to Supabase
 */
async function pushChange(supabase, change) {
  const { type, data } = change;

  switch (type) {
    case "user_add": {
      // Check if user already exists by name
      const { data: existing } = await supabase
        .from("recognized_faces")
        .select("id")
        .eq("name", data.name)
        .single();

      if (existing) {
        // User exists, update descriptor
        await supabase.rpc("add_face_descriptor", {
          p_name: data.name,
          p_descriptor: data.descriptor
        });
      } else {
        // Create new user
        await supabase.from("recognized_faces").insert({
          name: data.name,
          descriptor: data.descriptor,
          thumbnail_url: data.thumbnail_url,
          created_at: data.created_at
        });
      }
      break;
    }

    case "user_update": {
      // Update existing user
      const { data: existing } = await supabase
        .from("recognized_faces")
        .select("id")
        .eq("name", data.name)
        .single();

      if (existing) {
        await supabase
          .from("recognized_faces")
          .update({
            descriptor: data.descriptor,
            thumbnail_url: data.thumbnail_url
          })
          .eq("id", existing.id);
      }
      break;
    }

    case "user_delete": {
      await supabase
        .from("recognized_faces")
        .delete()
        .eq("name", data.name);
      break;
    }

    case "group_add": {
      // Supabase handles this via add_user_to_group
      break;
    }

    case "group_add_user": {
      // Find user ID by getting all users and matching by local reference
      // This is tricky because local IDs don't match remote IDs
      // We use name as the unique identifier
      const { data: user } = await supabase
        .from("recognized_faces")
        .select("id")
        .eq("name", data.user_name || "")
        .single();

      if (user) {
        await supabase.rpc("add_user_to_group", {
          p_user_id: user.id,
          p_group_name: data.group_name
        });
      } else if (data.user_id) {
        // Try to find by looking up in our local db what name this user has
        // This is a fallback
        await supabase.rpc("add_user_to_group", {
          p_user_id: data.user_id,
          p_group_name: data.group_name
        });
      }
      break;
    }

    case "group_remove_user": {
      const { data: user } = await supabase
        .from("recognized_faces")
        .select("id")
        .eq("name", data.user_name || "")
        .single();

      if (user) {
        await supabase.rpc("remove_user_from_group", {
          p_user_id: user.id,
          p_group_name: data.group_name
        });
      } else if (data.user_id) {
        await supabase.rpc("remove_user_from_group", {
          p_user_id: data.user_id,
          p_group_name: data.group_name
        });
      }
      break;
    }
  }
}

/**
 * Full sync: push local changes, pull remote data
 */
export async function syncWithSupabase(supabase, onProgress = null) {
  const results = {
    pushed: 0,
    pulled: 0,
    errors: []
  };

  try {
    // Step 1: Push local changes
    onProgress?.({ step: "push", message: "Invio modifiche locali..." });
    
    const pendingChanges = await getPendingChanges();
    console.log(`📤 Pushing ${pendingChanges.length} local changes...`);

    for (const change of pendingChanges) {
      try {
        await pushChange(supabase, change);
        results.pushed++;
      } catch (error) {
        console.error("Error pushing change:", change, error);
        results.errors.push({ change, error: error.message });
      }
    }

    // Step 2: Pull remote data (full refresh)
    onProgress?.({ step: "pull", message: "Scaricamento dati remoti..." });
    
    const { users, groups } = await fetchUsersFromSupabase(supabase);
    console.log(`📥 Pulled ${users.length} users from Supabase`);

    // Step 3: Import to local database
    onProgress?.({ step: "import", message: "Aggiornamento database locale..." });
    
    await importUsersFromServer(users, groups);
    results.pulled = users.length;

    // Step 4: Clear pending changes (they've been pushed)
    await clearPendingChanges();
    await setLastSyncTime();

    console.log("✅ Sync complete!");
    return results;

  } catch (error) {
    console.error("Sync error:", error);
    throw error;
  }
}

/**
 * Initial sync: pull all data from Supabase (first run or reset)
 */
export async function initialSyncFromSupabase(supabase, onProgress = null) {
  onProgress?.({ step: "pull", message: "Scaricamento database..." });
  
  const { users, groups } = await fetchUsersFromSupabase(supabase);
  
  onProgress?.({ step: "import", message: "Importazione dati..." });
  
  await importUsersFromServer(users, groups);
  
  return { users: users.length, groups: groups.length };
}
