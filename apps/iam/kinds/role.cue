package core

externalName: {
	kind: "Role"
	group: "role"
	apiResource: {
		groupOverride: "role.grafana.app"
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
				spec: {
					title: string
				}
			}
		}
	}
}
