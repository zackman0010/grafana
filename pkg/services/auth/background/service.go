package background

import (
	"errors"
	"fmt"
	"log/slog"
	"strconv"

	"golang.org/x/net/context"

	"github.com/grafana/authlib/claims"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/services/authn"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/serviceaccounts"
)

type BackgroundIdentityService interface {
	AdminIdentity(ctx context.Context, namespace string) (identity.Requester, error)

	// Run at startup to make sure the right identities exist
	SetupBackgroundUsers(context.Context) error
}

func NewBackgroundIdentityService() {

}

type backgroundIdentities struct {
	log *slog.Logger

	serviceAccountNamePrefix string
	role                     org.RoleType

	accountIdByOrgId map[int64]int64
	loginByOrgId     map[int64]string

	serviceAccounts serviceaccounts.Service
	orgService      org.Service
	authn           authn.Service
}

// This will create a service user with the prefix
func (o *backgroundIdentities) SetupBackgroundUsers(ctx context.Context) error {
	orgIds, err := o.findAllOrgIds(ctx)
	if err != nil {
		return err
	}

	// userId:0 and RoleAdmin grants the crawler process permissions to view all dashboards in all folders & orgs
	// the process doesn't and shouldn't actually need to edit/modify any resources from the UI
	orgRole := org.RoleAdmin

	accountIdByOrgId := make(map[int64]int64)
	loginByOrgId := make(map[int64]string)
	for _, orgId := range orgIds {
		o.log.Info("Creating account for org", "orgId", orgId)

		serviceAccountNameOrg := o.serviceAccountNamePrefix + strconv.FormatInt(orgId, 10)

		saForm := serviceaccounts.CreateServiceAccountForm{
			Name: serviceAccountNameOrg,
			Role: &orgRole,
		}

		serviceAccount, err := o.serviceAccounts.CreateServiceAccount(ctx, orgId, &saForm)
		accountAlreadyExists := errors.Is(err, serviceaccounts.ErrServiceAccountAlreadyExists)

		if !accountAlreadyExists && err != nil {
			o.log.Error("Failed to create the service account", "err", err, "accountName", serviceAccountNameOrg, "orgId", orgId)
			return err
		}

		claims.NewTypeID(claims.TypeServiceAccount, fmt.Sprintf("%d", serviceAccount.Id))

		var serviceAccountLogin string
		var serviceAccountId int64
		if accountAlreadyExists {
			id, err := o.serviceAccounts.RetrieveServiceAccountIdByName(ctx, orgId, serviceAccountNameOrg)
			if err != nil {
				o.log.Error("Failed to retrieve service account", "err", err, "accountName", serviceAccountNameOrg)
				return err
			}

			// update org_role to make sure everything works properly if someone has changed the role since SA's original creation
			dto, err := o.serviceAccounts.UpdateServiceAccount(ctx, orgId, id, &serviceaccounts.UpdateServiceAccountForm{
				Name: &serviceAccountNameOrg,
				Role: &orgRole,
			})

			if err != nil {
				o.log.Error("Failed to update service account's role", "err", err, "accountName", serviceAccountNameOrg)
				return err
			}

			serviceAccountLogin = dto.Login
			serviceAccountId = id
		} else {
			serviceAccountLogin = serviceAccount.Login
			serviceAccountId = serviceAccount.Id
		}

		accountIdByOrgId[orgId] = serviceAccountId
		loginByOrgId[orgId] = serviceAccountLogin
	}

	o.accountIdByOrgId = accountIdByOrgId
	o.loginByOrgId = loginByOrgId

	return nil
}

func (o *backgroundIdentities) findAllOrgIds(ctx context.Context) ([]int64, error) {
	searchAllOrgsQuery := &org.SearchOrgsQuery{}
	result, err := o.orgService.Search(ctx, searchAllOrgsQuery)
	if err != nil {
		o.log.Error("Error when searching for orgs", "err", err)
		return nil, err
	}

	orgIds := make([]int64, 0)
	for i := range result {
		orgIds = append(orgIds, result[i].ID)
	}

	return orgIds, nil
}

func (o *backgroundIdentities) AdminIdentity(ctx context.Context, namespace string) (identity.Requester, error) {
	info, err := claims.ParseNamespace(namespace)
	if err != nil {
		return nil, err
	}

	o.authn.ResolveIdentity(ctx, info.OrgID)

	return nil, fmt.Errorf("todo" + info.Value)

}
