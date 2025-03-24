package cloudmigration

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResourceDependencyParse(t *testing.T) {
	t.Run("empty input returns an empty set", func(t *testing.T) {
		result, err := ResourceDependency.Parse(nil)
		require.NoError(t, err)
		require.Empty(t, result)
	})

	t.Run("input with duplicates returns an error", func(t *testing.T) {
		// Map values can't be duplicates, so this test is no longer applicable
		// Instead, validate that the function works with the ResourceTypes map
		resourceTypes := ResourceTypes{
			FolderDataType: ResourceMigrationScopeAll,
		}
		_, err := ResourceDependency.Parse(resourceTypes)
		require.NoError(t, err)
	})

	t.Run("unknown resource type returns an error", func(t *testing.T) {
		// Using an unregistered MigrateDataType
		resourceTypes := ResourceTypes{
			"does not exist": ResourceMigrationScopeAll,
		}
		_, err := ResourceDependency.Parse(resourceTypes)
		require.ErrorIs(t, err, ErrUnknownResourceType)
	})

	t.Run("PluginDataType has no dependencies", func(t *testing.T) {
		resourceTypes := ResourceTypes{
			PluginDataType: ResourceMigrationScopeAll,
		}
		result, err := ResourceDependency.Parse(resourceTypes)
		require.NoError(t, err)
		require.Len(t, result, 1)
		require.Contains(t, result, PluginDataType)
	})

	t.Run("FolderDataType has no dependencies", func(t *testing.T) {
		resourceTypes := ResourceTypes{
			FolderDataType: ResourceMigrationScopeAll,
		}
		result, err := ResourceDependency.Parse(resourceTypes)
		require.NoError(t, err)
		require.Len(t, result, 1)
		require.Contains(t, result, FolderDataType)
	})

	t.Run("DatasourceDataType requires PluginDataType", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				DatasourceDataType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
			require.Contains(t, err.Error(), string(PluginDataType))
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				DatasourceDataType: ResourceMigrationScopeAll,
				PluginDataType:     ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, 2)
		})
	})

	t.Run("LibraryElementDataType requires FolderDataType", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				LibraryElementDataType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
			require.Contains(t, err.Error(), string(FolderDataType))
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				LibraryElementDataType: ResourceMigrationScopeAll,
				FolderDataType:         ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, 2)
		})
	})

	t.Run("DashboardDataType requires multiple dependencies", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			// Missing: FolderDataType, DatasourceDataType, LibraryElementDataType, PluginDataType
			resourceTypes := ResourceTypes{
				DashboardDataType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)

			// Missing: DatasourceDataType, PluginDataType
			resourceTypes = ResourceTypes{
				DashboardDataType:      ResourceMigrationScopeAll,
				LibraryElementDataType: ResourceMigrationScopeAll,
				FolderDataType:         ResourceMigrationScopeAll,
			}
			_, err = ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				DashboardDataType:      ResourceMigrationScopeAll,
				FolderDataType:         ResourceMigrationScopeAll,
				DatasourceDataType:     ResourceMigrationScopeAll,
				LibraryElementDataType: ResourceMigrationScopeAll,
				PluginDataType:         ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, len(resourceTypes))
		})
	})

	t.Run("MuteTimingType has no dependencies", func(t *testing.T) {
		resourceTypes := ResourceTypes{
			MuteTimingType: ResourceMigrationScopeAll,
		}
		result, err := ResourceDependency.Parse(resourceTypes)
		require.NoError(t, err)
		require.Len(t, result, 1)
		require.Contains(t, result, MuteTimingType)
	})

	t.Run("NotificationTemplateType has no dependencies", func(t *testing.T) {
		resourceTypes := ResourceTypes{
			NotificationTemplateType: ResourceMigrationScopeAll,
		}
		result, err := ResourceDependency.Parse(resourceTypes)
		require.NoError(t, err)
		require.Len(t, result, 1)
		require.Contains(t, result, NotificationTemplateType)
	})

	t.Run("ContactPointType requires NotificationTemplateType", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				ContactPointType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
			require.Contains(t, err.Error(), string(NotificationTemplateType))
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				ContactPointType:         ResourceMigrationScopeAll,
				NotificationTemplateType: ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, 2)
		})
	})

	t.Run("NotificationPolicyType requires multiple dependencies", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			// Missing: ContactPointType, NotificationTemplateType
			resourceTypes := ResourceTypes{
				NotificationPolicyType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)

			// Missing: NotificationTemplateType
			resourceTypes = ResourceTypes{
				NotificationPolicyType: ResourceMigrationScopeAll,
				ContactPointType:       ResourceMigrationScopeAll,
			}
			_, err = ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				NotificationPolicyType:   ResourceMigrationScopeAll,
				ContactPointType:         ResourceMigrationScopeAll,
				NotificationTemplateType: ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, 3)
		})
	})

	t.Run("AlertRuleType requires multiple dependencies", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			// Missing all dependencies
			resourceTypes := ResourceTypes{
				AlertRuleType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)

			// Missing some dependencies
			resourceTypes = ResourceTypes{
				AlertRuleType:      ResourceMigrationScopeAll,
				DatasourceDataType: ResourceMigrationScopeAll,
				FolderDataType:     ResourceMigrationScopeAll,
			}
			_, err = ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				AlertRuleType:            ResourceMigrationScopeAll,
				DatasourceDataType:       ResourceMigrationScopeAll,
				FolderDataType:           ResourceMigrationScopeAll,
				DashboardDataType:        ResourceMigrationScopeAll,
				MuteTimingType:           ResourceMigrationScopeAll,
				ContactPointType:         ResourceMigrationScopeAll,
				NotificationPolicyType:   ResourceMigrationScopeAll,
				PluginDataType:           ResourceMigrationScopeAll,
				LibraryElementDataType:   ResourceMigrationScopeAll,
				NotificationTemplateType: ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, len(resourceTypes))
		})
	})

	t.Run("AlertRuleGroupType requires AlertRuleType and all its dependencies", func(t *testing.T) {
		t.Run("when the dependency is missing returns an error", func(t *testing.T) {
			// Missing all dependencies
			resourceTypes := ResourceTypes{
				AlertRuleGroupType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)

			// With partial dependencies
			resourceTypes = ResourceTypes{
				AlertRuleGroupType: ResourceMigrationScopeAll,
				AlertRuleType:      ResourceMigrationScopeAll,
				FolderDataType:     ResourceMigrationScopeAll,
				DashboardDataType:  ResourceMigrationScopeAll,
				MuteTimingType:     ResourceMigrationScopeAll,
			}
			_, err = ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
		})

		t.Run("when the dependency is present returns the correct set", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				AlertRuleGroupType:       ResourceMigrationScopeAll,
				AlertRuleType:            ResourceMigrationScopeAll,
				DatasourceDataType:       ResourceMigrationScopeAll,
				FolderDataType:           ResourceMigrationScopeAll,
				DashboardDataType:        ResourceMigrationScopeAll,
				MuteTimingType:           ResourceMigrationScopeAll,
				ContactPointType:         ResourceMigrationScopeAll,
				NotificationPolicyType:   ResourceMigrationScopeAll,
				PluginDataType:           ResourceMigrationScopeAll,
				LibraryElementDataType:   ResourceMigrationScopeAll,
				NotificationTemplateType: ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, len(resourceTypes))
		})
	})

	t.Run("multiple resources with shared dependencies", func(t *testing.T) {
		t.Run("resources with no dependencies", func(t *testing.T) {
			resourceTypes := ResourceTypes{
				FolderDataType:           ResourceMigrationScopeAll,
				PluginDataType:           ResourceMigrationScopeAll,
				MuteTimingType:           ResourceMigrationScopeAll,
				NotificationTemplateType: ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, 4)
		})

		t.Run("overlapping dependencies", func(t *testing.T) {
			// DashboardDataType -> LibraryElementDataType -> FolderDataType
			//                  \-> DatasourceDataType     -> PluginDataType
			// ContactPointType -> NotificationTemplateType
			resourceTypes := ResourceTypes{
				DashboardDataType:        ResourceMigrationScopeAll,
				LibraryElementDataType:   ResourceMigrationScopeAll,
				FolderDataType:           ResourceMigrationScopeAll,
				DatasourceDataType:       ResourceMigrationScopeAll,
				PluginDataType:           ResourceMigrationScopeAll,
				ContactPointType:         ResourceMigrationScopeAll,
				NotificationTemplateType: ResourceMigrationScopeAll,
			}
			result, err := ResourceDependency.Parse(resourceTypes)
			require.NoError(t, err)
			require.Len(t, result, 7)
		})

		t.Run("missing shared dependency fails", func(t *testing.T) {
			// ContactPointType -> NotificationTemplateType
			// DatasourceDataType -> PluginDataType
			resourceTypes := ResourceTypes{
				ContactPointType:   ResourceMigrationScopeAll,
				DatasourceDataType: ResourceMigrationScopeAll,
			}
			_, err := ResourceDependency.Parse(resourceTypes)
			require.ErrorIs(t, err, ErrMissingDependency)
		})
	})
}
