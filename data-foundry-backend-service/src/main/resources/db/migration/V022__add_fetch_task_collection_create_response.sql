SET @sql = IF(
  (SELECT COUNT(1)
   FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'fetch_tasks'
     AND column_name = 'collection_create_http_status') = 0,
  'ALTER TABLE fetch_tasks ADD COLUMN collection_create_http_status INT NULL AFTER collection_task_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(1)
   FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'fetch_tasks'
     AND column_name = 'collection_create_raw_response') = 0,
  'ALTER TABLE fetch_tasks ADD COLUMN collection_create_raw_response MEDIUMTEXT NULL AFTER collection_create_http_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
