-- Create the get_subscriptions_with_labels function that the dashboard expects
CREATE OR REPLACE FUNCTION get_subscriptions_with_labels(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  folder_id UUID,
  folder_name TEXT,
  source_label TEXT,
  owner_email TEXT,
  subscribed_at TIMESTAMPTZ,
  prompts JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    f.id AS folder_id,
    f.name::TEXT AS folder_name,
    COALESCE(sf.source_label, 'Shared Prompts')::TEXT AS source_label,
    u.email::TEXT AS owner_email,
    s.subscribed_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'text', p.text,
            'position', p.position
          ) ORDER BY p.position
        )
        FROM prompts p
        WHERE p.folder_id = f.id
      ),
      '[]'::jsonb
    ) AS prompts
  FROM subscriptions s
  JOIN shared_folders sf ON s.shared_folder_id = sf.id
  JOIN folders f ON sf.folder_id = f.id
  JOIN auth.users u ON sf.owner_id = u.id
  WHERE s.subscriber_id = p_user_id
    AND sf.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the get_subscribed_folders function (fixing the type mismatch)
DROP FUNCTION IF EXISTS get_subscribed_folders(UUID);

CREATE OR REPLACE FUNCTION get_subscribed_folders(p_user_id UUID)
RETURNS TABLE (
  folder_id UUID,
  folder_name TEXT,
  owner_id UUID,
  owner_email TEXT,
  share_code TEXT,
  subscribed_at TIMESTAMPTZ,
  prompts JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS folder_id,
    f.name::TEXT AS folder_name,
    sf.owner_id,
    u.email::TEXT AS owner_email,
    sf.share_code::TEXT AS share_code,
    s.subscribed_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'text', p.text,
            'position', p.position,
            'created_at', p.created_at
          ) ORDER BY p.position
        )
        FROM prompts p
        WHERE p.folder_id = f.id
      ),
      '[]'::jsonb
    ) AS prompts
  FROM subscriptions s
  JOIN shared_folders sf ON s.shared_folder_id = sf.id
  JOIN folders f ON sf.folder_id = f.id
  JOIN auth.users u ON sf.owner_id = u.id
  WHERE s.subscriber_id = p_user_id
    AND sf.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
