package sqlkeeper

import (
	"context"
	"fmt"

	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/registry/apis/secret/encryption/manager"
	keepertypes "github.com/grafana/grafana/pkg/registry/apis/secret/secretkeeper/types"
	secretStorage "github.com/grafana/grafana/pkg/storage/secret"
)

type SQLKeeper struct {
	encryptionManager *manager.EncryptionManager
	store             secretStorage.EncryptedValueStorage
}

var _ keepertypes.Keeper = (*SQLKeeper)(nil)

func NewSQLKeeper(encryptionManager *manager.EncryptionManager, store secretStorage.EncryptedValueStorage) (*SQLKeeper, error) {
	return &SQLKeeper{
		encryptionManager: encryptionManager,
		store:             store,
	}, nil
}

func (s *SQLKeeper) Store(ctx context.Context, exposedValueOrRef string) (keepertypes.ExternalID, error) {
	// TODO: namespace, opt
	namespace := "default"

	var externalID keepertypes.ExternalID
	encryptedVal, err := s.encryptionManager.Encrypt(ctx, namespace, []byte(exposedValueOrRef), nil)
	if err != nil {
		return externalID, fmt.Errorf("unable to encrypt value: %w", err)
	}

	encryptedSt, err := s.store.Create(ctx, encryptedVal)
	if err != nil {
		return externalID, fmt.Errorf("unable to store encrypted value: %w", err)
	}

	externalID = keepertypes.ExternalID(encryptedSt.UID)
	return externalID, nil
}

func (s *SQLKeeper) Update(ctx context.Context, externalID keepertypes.ExternalID, exposedValueOrRef string) error {
	// TODO: namespace, opt
	namespace := "default"

	// TODO: look at Matheus prototype update

	encryptedVal, err := s.encryptionManager.Encrypt(ctx, namespace, []byte(exposedValueOrRef), nil)
	if err != nil {
		return fmt.Errorf("unable to encrypt value: %w", err)
	}

	err = s.store.Update(ctx, externalID.String(), encryptedVal)
	if err != nil {
		return fmt.Errorf("unable to store encrypted value: %w", err)
	}

	return nil
}

func (s *SQLKeeper) Expose(ctx context.Context, externalID keepertypes.ExternalID) (secretv0alpha1.ExposedSecureValue, error) {
	// TODO: namespace where from?
	namespace := "default"

	var exposedValue secretv0alpha1.ExposedSecureValue
	encryptedValue, err := s.store.Get(ctx, externalID.String())
	if err != nil {
		return exposedValue, fmt.Errorf("unable to get encrypted value: %w", err)

	}

	exposedBytes, err := s.encryptionManager.Decrypt(ctx, namespace, encryptedValue.EncryptedData)
	if err != nil {
		return exposedValue, fmt.Errorf("unable to decrypt: %w", err)
	}

	return secretv0alpha1.NewExposedSecureValue(string(exposedBytes)), nil
}

func (s *SQLKeeper) Delete(ctx context.Context, externalID keepertypes.ExternalID) error {
	return s.store.Delete(ctx, externalID.String())
}
