export type MigrateToCloudEvent =
  | 'grafana_e2c_generate_token_clicked' // user clicked the "generate token" button
  | 'grafana_e2c_delete_token_clicked' // user clicked the "delete token" button
  | 'grafana_e2c_generated_token_modal_dismissed'; // user dismissed the "generated token" modal
