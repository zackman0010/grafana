package server

import (
	"context"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"

	authzextv1 "github.com/grafana/grafana/pkg/services/authz/zanzana/proto/v1"
)

var _ authzextv1.AuthzExtentionServiceServer = (*Server)(nil)

func NewAuthz(openfga openfgav1.OpenFGAServiceServer) *Server {
	return &Server{openfga: openfga}
}

type Server struct {
	authzextv1.UnimplementedAuthzExtentionServiceServer

	openfga openfgav1.OpenFGAServiceServer
}

// Write implements v1.AuthzExtentionServiceServer.
func (s *Server) Write(ctx context.Context, req *authzextv1.WriteRequest) (*authzextv1.WriteResponse, error) {
	// TODO: Construct OpenFGA write request
	writeReq := &openfgav1.WriteRequest{}
	_, err := s.openfga.Write(ctx, writeReq)
	if err != nil {
		return nil, err
	}
	return &authzextv1.WriteResponse{}, nil
}
