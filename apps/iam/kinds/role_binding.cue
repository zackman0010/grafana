package core

roleBinding: {
	kind: "RoleBinding"
	group: "iam"
	apiResource: {
		groupOverride: "iam.grafana.app"
	}
	codegen: {
		frontend: false
		backend: true
	}
	pluralName: "RoleBindings"
	current: "v0alpha1"
	versions: {
		"v0alpha1": {
			schema: {
        #Subject: {
          name: string
          type: string
        }
        #RoleRef: {
          name: string
        }

				spec: {
          subjects: [...#Subject]
          roleRef: #RoleRef
				}
			}
		}
	}
}
