package client

import (
	"context"

	"google.golang.org/grpc"

	"github.com/grafana/grafana/pkg/infra/log"
	authzextv1 "github.com/grafana/grafana/pkg/services/authz/zanzana/proto/v1"
)

type ExtensionClient struct {
	logger log.Logger
	client authzextv1.AuthzExtentionServiceClient
}

func NewExtensionAuthzClient(ctx context.Context, cc grpc.ClientConnInterface) (*ExtensionClient, error) {
	c := &ExtensionClient{
		client: authzextv1.NewAuthzExtentionServiceClient(cc),
	}

	return c, nil
}

func (c *ExtensionClient) Write(ctx context.Context, req *authzextv1.WriteRequest) (*authzextv1.WriteResponse, error) {
	res, err := c.client.Write(ctx, req)
	return res, err
}
