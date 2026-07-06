-- Rename file-upload exercise content key required_files -> max_files.
-- Semantics change from "at least N files" to "up to X files"; the stored
-- number carries over unchanged as the new maximum.
UPDATE exercises
SET content_json = (content_json - 'required_files')
  || jsonb_build_object('max_files', content_json->'required_files')
WHERE content_json->>'type' = 'file_upload'
  AND content_json ? 'required_files';
