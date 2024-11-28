package core

externalName: {
	kind: "Role"
	group: "iam2"
	apiResource: {
		groupOverride: "iam2.grafana.app"
	}
	codegen: {
		frontend: false
		backend: true
	}
	pluralName: "Roles"
	current: "v0alpha1"
	versions: {
		"v0alpha1": {
			schema: {
        #Rule: {
          group: string
          resource?: string
          name?: string
				}
				spec: {
					title: string
          rules: [...#Rule]
				}
			}
		}
	}
}
