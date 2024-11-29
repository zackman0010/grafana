package core

externalName: {
	kind: "Role"
	group: "iam2"
	apiResource: {
		groupOverride: "iam2.grafana.app"
		validation: operations:  ["create","update"]
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
					verb: "get" | "create" | "update" | "delete" @cuetsy(kind="enum")
          group: string
          resource: string
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
