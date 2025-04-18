-- create table scim_settings
CREATE TABLE IF NOT EXISTS "scim_settings" (
	 "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
	,"user_sync_enabled" BOOL NOT NULL
	,"group_sync_enabled" BOOL NOT NULL
	,"created_at" DATETIME NOT NULL
	,"updated_at" DATETIME NOT NULL
);

-- create index IDX_scim_settings_id - Usually not needed for PK in SQLite
-- CREATE UNIQUE INDEX "IDX_scim_settings_id" ON "scim_settings" ("id"); 