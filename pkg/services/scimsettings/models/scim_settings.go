package models

import "time"

// ScimSettings represents the SCIM configuration stored in the database.
// Assuming these are global settings for now. If they need to be per-org,
// an OrgId field would be necessary.
type ScimSettings struct {
	ID               int64     `xorm:"pk autoincr 'id'"`
	UserSyncEnabled  bool      `xorm:"user_sync_enabled" json:"userSyncEnabled"`
	GroupSyncEnabled bool      `xorm:"group_sync_enabled" json:"groupSyncEnabled"`
	CreatedAt        time.Time `xorm:"created"`
	UpdatedAt        time.Time `xorm:"updated"`
}
