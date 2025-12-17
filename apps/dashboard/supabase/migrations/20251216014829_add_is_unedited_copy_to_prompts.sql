-- Add is_unedited_copy column to prompts table
-- This tracks prompts that were copied from subscriptions but not yet edited
ALTER TABLE prompts
ADD COLUMN is_unedited_copy BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN prompts.is_unedited_copy IS 'True if this prompt was copied from a subscription and has not been edited yet';
