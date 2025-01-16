package access

import (
	"context"

	grpc "google.golang.org/grpc"

	secret "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
)

// Register the
func RegisterSecretDecoder(reg grpc.ServiceRegistrar, access secret.SecretAccess) {
	RegisterSecretDecoderServer(reg, &secreteServer{access})
}

type secreteServer struct {
	access secret.SecretAccess
}

// GetSecretValues implements SecretDecoderServer.
func (s *secreteServer) GetSecretValues(ctx context.Context, req *SecretRequest) (*SecretResponse, error) {
	values, err := s.access.ReadSecrets(ctx, req.Namespace, req.Names...)
	if err != nil {
		return nil, err // error should only happen for un-recoverable events
	}
	rsp := &SecretResponse{
		Values: make(map[string]string, len(values)),
	}
	for k, v := range values {
		rsp.Values[k] = v.DangerouslyExposeAndConsumeValue()
	}
	return rsp, nil
}
