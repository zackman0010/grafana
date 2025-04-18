-- create table scim_settings
CREATE TABLE IF NOT EXISTS `scim_settings` (
	 `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY
	,`user_sync_enabled` TINYINT(1) NOT NULL
	,`group_sync_enabled` TINYINT(1) NOT NULL
	,`created_at` DATETIME NOT NULL
	,`updated_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- create index IDX_scim_settings_id
-- CREATE UNIQUE INDEX `IDX_scim_settings_id` ON `scim_settings` (`id`); -- PK is already unique index 