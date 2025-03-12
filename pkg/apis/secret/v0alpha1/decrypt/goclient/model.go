package goclient

import (
	"context"

	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"

	"github.com/grafana/authlib/authn"
)

type ClientConfig struct {
	URL           string
	DialOptions   []grpc.DialOption
	TokenExchange authn.TokenExchanger // TokenExchanger interface
	OptTracer     trace.Tracer         // trace.Tracer interface
}

type SecretClient interface {
	Decrypt(ctx context.Context, namespace string, names ...string) (map[string]DecryptedValue, error)
}

type DecryptedValue string

func (d DecryptedValue) String() string {
	return "redacted"
}

func (d DecryptedValue) MarshalJSON() ([]byte, error) {
	return []byte("redacted"), nil
}

func (d DecryptedValue) Expose() string {
	return (string)(d)
}
