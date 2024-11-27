package watcher

import (
	"context"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
)

var _ operator.ResourceWatcher = (*RoleWatcher)(nil)

type RoleWatcher struct{}

// Add implements operator.ResourceWatcher.
func (r *RoleWatcher) Add(ctx context.Context, obj resource.Object) error {
	panic("unimplemented")
}

// Delete implements operator.ResourceWatcher.
func (r *RoleWatcher) Delete(context.Context, resource.Object) error {
	panic("unimplemented")
}

// Update implements operator.ResourceWatcher.
func (r *RoleWatcher) Update(ctx context.Context, old resource.Object, new resource.Object) error {
	panic("unimplemented")
}
