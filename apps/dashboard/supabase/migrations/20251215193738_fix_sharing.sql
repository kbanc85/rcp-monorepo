-- Add source_label column to shared_folders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shared_folders' AND column_name = 'source_label'
  ) THEN
    ALTER TABLE shared_folders ADD COLUMN source_label VARCHAR(100) DEFAULT 'Shared Prompts';
  END IF;
END $$;

-- Quick Access tables
CREATE TABLE IF NOT EXISTS quick_access_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quick_access_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their quick access folders" ON quick_access_folders;
CREATE POLICY "Users can manage their quick access folders"
ON quick_access_folders FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS quick_access_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quick_access_folder_id UUID NOT NULL REFERENCES quick_access_folders(id) ON DELETE CASCADE,
  owned_prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  subscribed_prompt_id UUID,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quick_access_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their quick access items" ON quick_access_items;
CREATE POLICY "Users can manage their quick access items"
ON quick_access_items FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to get quick access menu
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
    qaf.id as folder_id,
    qaf.name::VARCHAR as folder_name,
    qaf.position as folder_position,
    qai.id as item_id,
    COALESCE(qai.owned_prompt_id, qai.subscribed_prompt_id) as prompt_id,
    COALESCE(op.title, sp.title)::VARCHAR as prompt_title,
    COALESCE(op.text, sp.text)::TEXT as prompt_text,
    qai.position as item_position,
    CASE
      WHEN qai.owned_prompt_id IS NOT NULL THEN 'owned'::VARCHAR
      ELSE 'subscribed'::VARCHAR
    END as source_type,
    sf.source_label::VARCHAR as source_label
  FROM quick_access_folders qaf
  LEFT JOIN quick_access_items qai ON qai.quick_access_folder_id = qaf.id
  LEFT JOIN prompts op ON qai.owned_prompt_id = op.id
  LEFT JOIN subscriptions sub ON qai.subscription_id = sub.id
  LEFT JOIN shared_folders sf ON sub.shared_folder_id = sf.id
  LEFT JOIN folders subf ON sf.folder_id = subf.id
  LEFT JOIN prompts sp ON sp.folder_id = subf.id AND sp.id = qai.subscribed_prompt_id
  WHERE qaf.user_id = p_user_id
  ORDER BY qaf.position, qai.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
