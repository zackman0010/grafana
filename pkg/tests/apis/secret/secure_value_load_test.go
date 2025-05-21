package secret

import (
	"context"
	"fmt"
	"testing"
	"time"

	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/registry/apis/secret"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/tests/apis"
	"github.com/grafana/grafana/pkg/tests/testinfra"
	"github.com/stretchr/testify/require"
	"golang.org/x/sync/errgroup"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestIntegrationSecureValueCreateMany(t *testing.T) {
	t.Skip("Comment this line to run the test manually.")

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	// Amount of SecureValues to create concurrently.
	const RUNS = 300

	helper := apis.NewK8sTestHelper(t, testinfra.GrafanaOpts{
		AppModeProduction: false, // required for experimental APIs
		EnableFeatureToggles: []string{
			// Required to start the example service
			featuremgmt.FlagGrafanaAPIServerWithExperimentalAPIs,
			featuremgmt.FlagSecretsManagementAppPlatform,
		},
	})

	permissions := map[string]ResourcePermission{
		ResourceSecureValues: {Actions: ActionsAllSecureValues},
		// in order to create securevalues, we need to first create keepers (and delete them to clean it up).
		ResourceKeepers: {
			Actions: []string{
				secret.ActionSecretKeepersCreate,
				secret.ActionSecretKeepersDelete,
			},
		},
	}

	genericUserEditor := mustCreateUsers(t, helper, permissions).Editor

	client := helper.GetResourceClient(apis.ResourceClientArgs{
		User: genericUserEditor,
		GVR:  gvrSecureValues,
	})

	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(RUNS)

	secureValues := make([]string, RUNS)

	t1 := time.Now()

	for i := range RUNS {
		g.Go(func() error {
			testSecureValue := helper.LoadYAMLOrJSONFile("testdata/secure-value-default-generate.yaml")
			testSecureValue.SetGenerateName("")
			testSecureValue.SetName(fmt.Sprintf("%s-%d", t.Name(), i))

			raw, err := client.Resource.Create(gctx, testSecureValue, metav1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("%s: %w", raw.GetName(), err)
			}

			status, ok := raw.Object["status"].(map[string]any)
			if !ok {
				return fmt.Errorf("%s: status not found", raw.GetName())
			}

			statusPhase, ok := status["phase"].(string)
			if !ok {
				return fmt.Errorf("%s: status.phase not found", raw.GetName())
			}

			if statusPhase != string(secretv0alpha1.SecureValuePhasePending) {
				return fmt.Errorf("%s: status.phase is not %s", raw.GetName(), secretv0alpha1.SecureValuePhasePending)
			}

			t.Logf("SecureValue %s created with status %s", raw.GetName(), statusPhase)

			secureValues[i] = raw.GetName()

			return nil
		})
	}

	require.NoError(t, g.Wait())

	t.Logf("Created %d SecureValues in %s", RUNS, time.Since(t1))

	g, gctx = errgroup.WithContext(ctx)
	g.SetLimit(RUNS / 10)

	t2 := time.Now()

	// Check that each SecureValue was processed by the worker.
	for _, name := range secureValues {
		g.Go(func() error {
			require.NotEmpty(t, name)

			require.Eventually(
				t,
				func() bool {
					result, err := client.Resource.Get(gctx, name, metav1.GetOptions{})
					require.NoError(t, err)
					require.NotNil(t, result)

					status, ok := result.Object["status"].(map[string]any)
					require.True(t, ok)
					require.NotNil(t, status)

					statusPhase, ok := status["phase"].(string)
					require.True(t, ok)

					if statusPhase == "Succeeded" {
						t.Logf("SecureValue %s processed", name)
						return true
					}

					return false
				},
				120*time.Second,
				500*time.Millisecond,
				"expected status.phase to be Succeeded for %s", name,
			)

			return nil
		})
	}

	require.NoError(t, g.Wait())

	t.Logf("Checked %d SecureValues in %s", RUNS, time.Since(t2))
}
