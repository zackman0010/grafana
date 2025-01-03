package sqlkeeper

import (
	"context"
	"errors"
	"fmt"
	"time"

	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/registry/apis/secret"
	"github.com/grafana/grafana/pkg/services/sqlstore"
)

var (
	ErrEncryptedValueNotFound = errors.New("encrypted value not found")
)

type secretEncryptedValueDB struct {
	UID            string `xorm:"pk 'uid'"`
	EncryptedValue string `xorm:"encrypted_value"`
	Created        int64  `xorm:"created"`
}

type SQLKeeper struct {
	db db.DB
}

var _ secret.Keeper = (*SQLKeeper)(nil)

func NewSQLKeeper(db db.DB) (*SQLKeeper, error) {
	return &SQLKeeper{db: db}, nil
}

func (s *SQLKeeper) Store(ctx context.Context, exposedValueOrRef string) (secret.ExternalID, error) {
	// TODO: encrypt exposedValueOrRef and obtain encrypted value
	encrypted_value := exposedValueOrRef

	// Insert in DB
	row := &secretEncryptedValueDB{EncryptedValue: encrypted_value, Created: time.Now().Unix()}
	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if _, err := sess.Insert(row); err != nil {
			return fmt.Errorf("failed to insert row: %w", err)
		}

		return nil
	})
	if err != nil {
		return "", fmt.Errorf("db failure: %w", err)
	}

	return secret.ExternalID(row.UID), nil
}

func (s *SQLKeeper) Expose(ctx context.Context, id secret.ExternalID) (secretv0alpha1.ExposedSecureValue, error) {
	// Fetch from DB
	row := &secretEncryptedValueDB{UID: id.String()}
	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		found, err := sess.Get(row)
		if err != nil {
			return fmt.Errorf("failed to get row: %w", err)
		}

		if !found {
			return ErrEncryptedValueNotFound
		}

		return nil
	})
	if err != nil {
		return "", fmt.Errorf("db failure: %w", err)
	}

	// TODO: decrypt row.EncryptedValue

	// Return exposed value
	return secretv0alpha1.NewExposedSecureValue(row.EncryptedValue), nil
}

func (s *SQLKeeper) Delete(ctx context.Context, id secret.ExternalID) error {
	row := &secretEncryptedValueDB{UID: id.String()}
	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if _, err := sess.Delete(row); err != nil {
			return fmt.Errorf("failed to delete row: %w", err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("db failure: %w", err)
	}

	return nil
}
