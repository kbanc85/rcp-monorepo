-- Migration: Add soft delete support for prompts (trash bin feature)
-- Created: December 15, 2024
-- Purpose: Enable prompts to be moved to trash instead of permanent deletion

-- ============================================
-- ADD DELETED_AT COLUMN
-- ============================================

-- Add deleted_at column for soft delete
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Index for efficient trash queries (only index rows that are in trash)
CREATE INDEX IF NOT EXISTS idx_prompts_deleted_at ON prompts(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Composite index for fetching non-deleted prompts efficiently
CREATE INDEX IF NOT EXISTS idx_prompts_user_not_deleted ON prompts(user_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- UPDATE RPC FUNCTIONS
-- ============================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_quick_access_menu(UUID);
DROP FUNCTION IF EXISTS get_subscribed_folders(UUID);

-- Update get_quick_access_menu to exclude deleted prompts
CREATE OR REPLACE FUNCTION get_quick_access_menu(p_user_id UUID)
RETURNS TABLE (
  folder_id UUID,
  folder_name VARCHAR,
  folder_position INTEGER,
  item_id UUID,
  prompt_id UUID,
  prompt_title VARCHAR,
  prompt_text TEXT,
  item_position INTEGER,
  source_type VARCHAR,
  source_label VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qaf.id AS folder_id,
    qaf.name AS folder_name,
    qaf.position AS folder_position,
    qai.id AS item_id,
    COALESCE(qai.owned_prompt_id, qai.subscribed_prompt_id) AS prompt_id,
    COALESCE(op.title, sp.title)::VARCHAR AS prompt_title,
    COALESCE(op.text, sp.text)::TEXT AS prompt_text,
    qai.position AS item_position,
    CASE
      WHEN qai.owned_prompt_id IS NOT NULL THEN 'owned'
      ELSE 'subscribed'
    END::VARCHAR AS source_type,
    CASE
      WHEN qai.subscribed_prompt_id IS NOT NULL THEN sf.source_label
      ELSE NULL
    END::VARCHAR AS source_label
  FROM quick_access_folders qaf
  LEFT JOIN quick_access_items qai ON qai.quick_access_folder_id = qaf.id
  LEFT JOIN prompts op ON op.id = qai.owned_prompt_id AND op.deleted_at IS NULL
  LEFT JOIN prompts sp ON sp.id = qai.subscribed_prompt_id AND sp.deleted_at IS NULL
  LEFT JOIN subscriptions sub ON sub.id = qai.subscription_id
  LEFT JOIN shared_folders sf ON sf.id = sub.shared_folder_id
  WHERE qaf.user_id = p_user_id
    AND (
      (qai.owned_prompt_id IS NOT NULL AND op.id IS NOT NULL) OR
      (qai.subscribed_prompt_id IS NOT NULL AND sp.id IS NOT NULL) OR
      qai.id IS NULL
    )
  ORDER BY qaf.position, qai.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_subscribed_folders to exclude deleted prompts
CREATE OR REPLACE FUNCTION get_subscribed_folders(p_user_id UUID)
RETURNS TABLE (
  folder_id UUID,
  folder_name VARCHAR,
  owner_id UUID,
  owner_email VARCHAR,
  share_code VARCHAR,
  source_label VARCHAR,
  subscribed_at TIMESTAMPTZ,
  subscription_id UUID,
  prompts JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS folder_id,
    f.name AS folder_name,
    sf.owner_id,
    u.email::VARCHAR AS owner_email,
    sf.share_code,
    sf.source_label,
    s.subscribed_at,
    s.id AS subscription_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'text', p.text,
          'position', p.position,
          'created_at', p.created_at
        ) ORDER BY p.position
      ) FILTER (WHERE p.id IS NOT NULL AND p.deleted_at IS NULL),
      '[]'::jsonb
    ) AS prompts
  FROM subscriptions s
  JOIN shared_folders sf ON sf.id = s.shared_folder_id
  JOIN folders f ON f.id = sf.folder_id
  JOIN auth.users u ON u.id = sf.owner_id
  LEFT JOIN prompts p ON p.folder_id = f.id AND p.deleted_at IS NULL
  WHERE s.subscriber_id = p_user_id
    AND sf.is_active = true
  GROUP BY f.id, f.name, sf.owner_id, u.email, sf.share_code, sf.source_label, s.subscribed_at, s.id
  ORDER BY s.subscribed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ANALYZE TABLES
-- ============================================

ANALYZE prompts;
