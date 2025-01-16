package access

import (
	"context"

	"github.com/fullstorydev/grpchan"
	grpc "google.golang.org/grpc"

	authnlib "github.com/grafana/authlib/authn"
	secret "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
)

func NewSecretAccessGRPC(conn *grpc.ClientConn) (secret.SecretAccess, error) {
	clientInt, err := authnlib.NewGrpcClientInterceptor(
		&authnlib.GrpcClientConfig{},
	)
	if err != nil {
		return nil, err
	}
	cc := grpchan.InterceptClientConn(conn, clientInt.UnaryClientInterceptor, clientInt.StreamClientInterceptor)
	return &secreteAccessGRPC{
		client: NewSecretDecoderClient(cc),
	}, nil
}

type secreteAccessGRPC struct {
	client SecretDecoderClient
}

// ReadSecrets implements SecretAccess.
func (s *secreteAccessGRPC) ReadSecrets(ctx context.Context, namespace string, names ...string) (map[string]secret.ExposedSecureValue, error) {
	rsp, err := s.client.GetSecretValues(ctx, &SecretRequest{
		Namespace: namespace,
		Names:     names,
	})
	if err != nil {
		return nil, err
	}
	vals := make(map[string]secret.ExposedSecureValue, len(rsp.Values))
	for k, v := range rsp.Values {
		vals[k] = secret.NewExposedSecureValue(v)
	}
	return vals, nil
}
