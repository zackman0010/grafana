package server

import (
	"context"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/grafana/grafana/pkg/services/authz/zanzana/common"
	authzextv1 "github.com/grafana/grafana/pkg/services/authz/zanzana/proto/v1"
)

func (s *Server) BatchCheck(ctx context.Context, r *authzextv1.BatchCheckRequest) (*authzextv1.BatchCheckResponse, error) {
	if info, ok := common.GetTypeInfo(r.GetGroup(), r.GetResource()); ok {
		return s.batchCheckTyped(ctx, r, info)
	}

	return s.batchCheckGeneric(ctx, r)
}

func (s *Server) batchCheckTyped(ctx context.Context, r *authzextv1.BatchCheckRequest, info common.TypeInfo) (*authzextv1.BatchCheckResponse, error) {
	relation := common.VerbMapping[r.GetVerb()]

	// 1. check if subject has access through namespace
	res, err := s.openfga.Check(ctx, &openfgav1.CheckRequest{
		StoreId:              s.storeID,
		AuthorizationModelId: s.modelID,
		TupleKey: &openfgav1.CheckRequestTupleKey{
			User:     r.GetSubject(),
			Relation: relation,
			Object:   common.NewNamespaceResourceIdent(r.GetGroup(), r.GetResource()),
		},
	})

	if err != nil {
		return nil, err
	}

	if res.GetAllowed() {
		return &authzextv1.BatchCheckResponse{All: true}, nil
	}

	BatchRes := &authzextv1.BatchCheckResponse{
		Items: make(map[string]bool, len(r.Items)),
	}

	// 2. check if subject has direct access to resources
	for _, i := range r.Items {
		res, err := s.openfga.Check(ctx, &openfgav1.CheckRequest{
			StoreId:              s.storeID,
			AuthorizationModelId: s.modelID,
			TupleKey: &openfgav1.CheckRequestTupleKey{
				User:     r.GetSubject(),
				Relation: relation,
				Object:   common.NewTypedIdent(info.Type, i.GetName()),
			},
		})
		if err != nil {
			return nil, err
		}

		BatchRes.Items[i.GetName()] = res.GetAllowed()
	}

	return BatchRes, nil
}

func (s *Server) batchCheckGeneric(ctx context.Context, r *authzextv1.BatchCheckRequest) (*authzextv1.BatchCheckResponse, error) {
	relation := common.VerbMapping[r.GetVerb()]

	// 1. check if subject has access through namespace
	res, err := s.openfga.Check(ctx, &openfgav1.CheckRequest{
		StoreId:              s.storeID,
		AuthorizationModelId: s.modelID,
		TupleKey: &openfgav1.CheckRequestTupleKey{
			User:     r.GetSubject(),
			Relation: relation,
			Object:   common.NewNamespaceResourceIdent(r.GetGroup(), r.GetResource()),
		},
	})

	if err != nil {
		return nil, err
	}

	if res.GetAllowed() {
		return &authzextv1.BatchCheckResponse{All: true}, nil
	}

	BatchRes := &authzextv1.BatchCheckResponse{
		Items: make(map[string]bool, len(r.Items)),
	}

	for _, i := range r.Items {
		// 2. check if subject has direct access to resource
		res, err := s.openfga.Check(ctx, &openfgav1.CheckRequest{
			StoreId:              s.storeID,
			AuthorizationModelId: s.modelID,
			TupleKey: &openfgav1.CheckRequestTupleKey{
				User:     r.GetSubject(),
				Relation: relation,
				Object:   common.NewResourceIdent(r.GetGroup(), r.GetResource(), i.GetName()),
			},
			Context: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"requested_group": structpb.NewStringValue(common.FormatGroupResource(r.GetGroup(), r.GetResource())),
				},
			},
		})

		if err != nil {
			return nil, err
		}

		if res.GetAllowed() {
			BatchRes.Items[i.GetName()] = true
			continue
		}

		if i.Folder == "" {
			BatchRes.Items[i.GetName()] = false
			continue
		}

		// 3. check if subject has access as a sub resource for the folder
		res, err = s.openfga.Check(ctx, &openfgav1.CheckRequest{
			StoreId:              s.storeID,
			AuthorizationModelId: s.modelID,
			TupleKey: &openfgav1.CheckRequestTupleKey{
				User:     r.GetSubject(),
				Relation: relation,
				Object:   common.NewFolderResourceIdent(r.GetGroup(), r.GetResource(), i.GetFolder()),
			},
			Context: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"requested_group": structpb.NewStringValue(common.FormatGroupResource(r.GetGroup(), r.GetResource())),
				},
			},
		})

		if err != nil {
			return nil, err
		}

		BatchRes.Items[i.GetName()] = res.GetAllowed()
	}

	return BatchRes, nil
}
