-- DANGER: This deletes ALL users from Supabase Auth.
-- Run this in the Supabase Dashboard → SQL Editor
-- Related rows in profiles, user_roles, team_members will auto-delete (CASCADE).
-- Other tables (tasks, projects, clients, etc.) will have user_id set to NULL (SET NULL).

-- Step 1: Delete all users from Supabase Auth
DELETE FROM auth.users;

-- Step 2: Verify deletion
-- SELECT COUNT(*) FROM auth.users;
