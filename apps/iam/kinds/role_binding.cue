package core

roleBinding: {
	kind: "RoleBinding"
	group: "iam2"
	apiResource: {
		groupOverride: "iam2.grafana.app"
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
          type: string
          name: string
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
