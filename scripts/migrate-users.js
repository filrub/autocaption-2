/**
 * Migration Script: Old Supabase → New Supabase
 * 
 * Migrates users from old recognized_faces table to new one.
 * 
 * Setup:
 * 1. Add to your .env file:
 *    VITE_OLD_SUPABASE_URL=https://your-old-project.supabase.co
 *    VITE_OLD_SUPABASE_ANON_KEY=your-old-anon-key
 * 
 * 2. Run: node scripts/migrate-users.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Validate environment variables
const requiredEnvVars = [
  "VITE_OLD_SUPABASE_URL",
  "VITE_OLD_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ Missing environment variables:");
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error("\nAdd these to your .env file and try again.");
  process.exit(1);
}

// Create Supabase clients
const oldSupabase = createClient(
  process.env.VITE_OLD_SUPABASE_URL,
  process.env.VITE_OLD_SUPABASE_ANON_KEY
);

const newSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrate() {
  console.log("🚀 Starting migration...\n");

  // Step 1: Fetch all users from old database
  console.log("📥 Fetching users from old database...");
  const { data: oldUsers, error: fetchError } = await oldSupabase
    .from("recognized_faces")
    .select("*")
    .order("id");

  if (fetchError) {
    console.error("❌ Error fetching from old database:", fetchError.message);
    process.exit(1);
  }

  console.log(`   Found ${oldUsers.length} users in old database\n`);

  if (oldUsers.length === 0) {
    console.log("✅ No users to migrate.");
    return;
  }

  // Step 2: Fetch existing users from new database to avoid duplicates
  console.log("📥 Checking existing users in new database...");
  const { data: existingUsers, error: existingError } = await newSupabase
    .from("recognized_faces")
    .select("name");

  if (existingError) {
    console.error("❌ Error fetching from new database:", existingError.message);
    process.exit(1);
  }

  const existingNames = new Set(existingUsers.map((u) => u.name.toUpperCase()));
  console.log(`   Found ${existingUsers.length} existing users in new database\n`);

  // Step 3: Filter out duplicates
  const usersToMigrate = oldUsers.filter(
    (u) => !existingNames.has(u.name.toUpperCase())
  );

  const skippedCount = oldUsers.length - usersToMigrate.length;
  if (skippedCount > 0) {
    console.log(`⏭️  Skipping ${skippedCount} users (already exist in new database)\n`);
  }

  if (usersToMigrate.length === 0) {
    console.log("✅ All users already migrated!");
    return;
  }

  // Step 4: Migrate users
  console.log(`📤 Migrating ${usersToMigrate.length} users...\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const user of usersToMigrate) {
    try {
      // Normalize descriptor
      let descriptor = user.descriptor;
      
      // Parse if string
      if (typeof descriptor === "string") {
        descriptor = JSON.parse(descriptor);
      }

      // Prepare user data for insertion
      const userData = {
        name: user.name.toUpperCase(), // Normalize to uppercase
        descriptor: descriptor,
        created_at: user.created_at,
      };

      // Insert into new database
      const { error: insertError } = await newSupabase
        .from("recognized_faces")
        .insert(userData);

      if (insertError) {
        throw insertError;
      }

      successCount++;
      process.stdout.write(`\r   Progress: ${successCount + errorCount}/${usersToMigrate.length} (${successCount} ✓, ${errorCount} ✗)`);
    } catch (error) {
      errorCount++;
      errors.push({ name: user.name, error: error.message });
      process.stdout.write(`\r   Progress: ${successCount + errorCount}/${usersToMigrate.length} (${successCount} ✓, ${errorCount} ✗)`);
    }
  }

  console.log("\n");

  // Step 5: Summary
  console.log("═══════════════════════════════════════");
  console.log("               SUMMARY                 ");
  console.log("═══════════════════════════════════════");
  console.log(`   Total in old DB:     ${oldUsers.length}`);
  console.log(`   Already existed:     ${skippedCount}`);
  console.log(`   Successfully migrated: ${successCount}`);
  console.log(`   Failed:              ${errorCount}`);
  console.log("═══════════════════════════════════════\n");

  if (errors.length > 0) {
    console.log("❌ Errors:");
    errors.forEach((e) => console.log(`   - ${e.name}: ${e.error}`));
    console.log("");
  }

  if (successCount > 0) {
    console.log("✅ Migration complete!");
  }
}

// Run migration
migrate().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
