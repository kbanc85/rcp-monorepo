-- Performance indexes for RCP system scalability
-- Created: December 15, 2024
-- Purpose: Ensure O(log n) queries instead of O(n) table scans

-- ============================================
-- CORE TABLE INDEXES
-- ============================================

-- folders: user_id is used in every dashboard query
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

-- folders: position ordering is common
CREATE INDEX IF NOT EXISTS idx_folders_position ON folders(user_id, position);

-- prompts: folder_id is used for all prompt lookups
CREATE INDEX IF NOT EXISTS idx_prompts_folder_id ON prompts(folder_id);

-- prompts: user_id is used for RLS and direct queries
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);

-- prompts: position ordering within folders
CREATE INDEX IF NOT EXISTS idx_prompts_folder_position ON prompts(folder_id, position);

-- ============================================
-- SHARING INDEXES
-- ============================================

-- shared_folders: lookup by folder_id (check if folder is shared)
CREATE INDEX IF NOT EXISTS idx_shared_folders_folder_id ON shared_folders(folder_id);

-- shared_folders: lookup by owner_id (list user's shared folders)
CREATE INDEX IF NOT EXISTS idx_shared_folders_owner_id ON shared_folders(owner_id);

-- shared_folders: share_code lookups (subscription flow)
CREATE INDEX IF NOT EXISTS idx_shared_folders_share_code ON shared_folders(share_code) WHERE is_active = true;

-- subscriptions: subscriber lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_id ON subscriptions(subscriber_id);

-- subscriptions: shared_folder lookups (join operations)
CREATE INDEX IF NOT EXISTS idx_subscriptions_shared_folder_id ON subscriptions(shared_folder_id);

-- ============================================
-- QUICK ACCESS INDEXES
-- ============================================

-- quick_access_folders: user_id is used in every query
CREATE INDEX IF NOT EXISTS idx_quick_access_folders_user_id ON quick_access_folders(user_id);

-- quick_access_folders: position ordering
CREATE INDEX IF NOT EXISTS idx_quick_access_folders_user_position ON quick_access_folders(user_id, position);

-- quick_access_items: folder lookups
CREATE INDEX IF NOT EXISTS idx_quick_access_items_folder_id ON quick_access_items(quick_access_folder_id);

-- quick_access_items: owned prompt lookups (for joins)
CREATE INDEX IF NOT EXISTS idx_quick_access_items_owned_prompt ON quick_access_items(owned_prompt_id) WHERE owned_prompt_id IS NOT NULL;

-- quick_access_items: subscribed prompt lookups (for joins)
CREATE INDEX IF NOT EXISTS idx_quick_access_items_subscribed_prompt ON quick_access_items(subscribed_prompt_id) WHERE subscribed_prompt_id IS NOT NULL;

-- quick_access_items: position ordering within folders
CREATE INDEX IF NOT EXISTS idx_quick_access_items_folder_position ON quick_access_items(quick_access_folder_id, position);

-- ============================================
-- ANALYZE TABLES
-- ============================================
-- Update statistics for query planner
ANALYZE folders;
ANALYZE prompts;
ANALYZE shared_folders;
ANALYZE subscriptions;
ANALYZE quick_access_folders;
ANALYZE quick_access_items;
