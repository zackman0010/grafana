package goclient

import (
	"context"
	"errors"
	"fmt"

	"github.com/fullstorydev/grpchan"
	"github.com/grafana/authlib/authn"
	decryptv0alpha1 "github.com/grafana/grafana/apis/secret/v0alpha1/decrypt"
	"go.opentelemetry.io/otel"
	"google.golang.org/grpc"
)

type client struct {
	c decryptv0alpha1.SecureValueDecrypterClient
}

// NewClient instantiates and returns a new SecretClient that make decrypt requests to the Secrets Manager via gRPC.
// The TokenExchange provided must be instantiated with an access policy token containing a permission in the form `secret.grafana.app/securevalues/actor_{your-app}:decrypt`
func NewClient(cfg ClientConfig) (SecretClient, error) {
	// Validate
	if len(cfg.URL) == 0 {
		return nil, errors.New("cfg must have grpc url")
	}

	if cfg.TokenExchange == nil {
		return nil, errors.New("cfg must have TokenExchange")
	}

	tracer := cfg.OptTracer
	if tracer == nil {
		tracer = otel.Tracer("secret-grpc-client")
	}

	// grpc connection setup
	conn, err := grpc.NewClient(cfg.URL, cfg.DialOptions...)
	if err != nil {
		return nil, fmt.Errorf("failed to create grpc client: %w", err)
	}

	clientInt := authn.NewGrpcClientInterceptor(cfg.TokenExchange, authn.WithClientInterceptorTracer(tracer))

	cc := grpchan.InterceptClientConn(conn, clientInt.UnaryClientInterceptor, clientInt.StreamClientInterceptor)

	return &client{
		c: decryptv0alpha1.NewSecureValueDecrypterClient(cc),
	}, nil
}

func (sc *client) Decrypt(ctx context.Context, namespace string, names ...string) (map[string]DecryptedValue, error) {
	resp, err := sc.c.DecryptSecureValues(ctx, &decryptv0alpha1.SecureValueDecryptRequest{
		Namespace: namespace,
		Names:     names,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	vals := resp.DecryptedValues
	toReturn := make(map[string]DecryptedValue, len(vals))
	for k, v := range vals {
		toReturn[k] = DecryptedValue(v)
	}

	return toReturn, nil
}
