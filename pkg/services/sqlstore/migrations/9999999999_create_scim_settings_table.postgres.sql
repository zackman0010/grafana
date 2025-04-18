-- create table scim_settings
CREATE TABLE IF NOT EXISTS "scim_settings" (
	 "id" BIGSERIAL PRIMARY KEY
	,"user_sync_enabled" BOOL NOT NULL
	,"group_sync_enabled" BOOL NOT NULL
	,"created_at" TIMESTAMP NOT NULL
	,"updated_at" TIMESTAMP NOT NULL
);

-- create index IDX_scim_settings_id
CREATE UNIQUE INDEX "IDX_scim_settings_id" ON "scim_settings" ("id"); 