package core

import (
  "time"
)

tempRoleBinding: {
	kind: "TempRoleBinding"
	group: "iam2"
	apiResource: {
		groupOverride: "iam2.grafana.app"
	}
	codegen: {
		frontend: false
		backend: true
	}
	pluralName: "TempRoleBindings"
	current: "v0alpha1"
	versions: {
		"v0alpha1": {
			schema: {
        #Subject: {
					type: "user" | "team" @cuetsy(kind="enum")
          name: string
        }

        #RoleRef: {
          name: string
        }

				spec: {
          subjects: [...#Subject]
          roleRef: #RoleRef
          ttlSeconds: int
				}

        status: {
          activated?: time.Time
        }
			}
		}
	}
}
