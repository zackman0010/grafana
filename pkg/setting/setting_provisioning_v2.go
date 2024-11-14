package setting

type ProvisioningV2Settings struct {
	RepositoryName          string
	RepositoryURL           string
	RepositoryToken         string
	RepositoryWebhookSecret string
	RepositoryWebhookURL    string
	RepositoryOrgID         int64
}

func (cfg *Cfg) readProvisioningV2Settings() {
	section := cfg.Raw.Section("provisioning_v2")

	cfg.ProvisioningV2.RepositoryName = section.Key("repository_name").MustString("")
	cfg.ProvisioningV2.RepositoryURL = section.Key("repository_url").MustString("")
	cfg.ProvisioningV2.RepositoryToken = section.Key("repository_token").MustString("")
	cfg.ProvisioningV2.RepositoryWebhookURL = section.Key("repository_webhook_url").MustString("")
	cfg.ProvisioningV2.RepositoryWebhookSecret = section.Key("repository_webhook_secret").MustString("")
	cfg.ProvisioningV2.RepositoryOrgID = section.Key("repository_org_id").MustInt64(0)
}
