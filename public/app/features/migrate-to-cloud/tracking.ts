import { Codeowners } from '../../tracking/owners';
import { Event } from '../../tracking/tracking';

export const e2cEvents: { [key: string]: Event } = {
  grafana_e2c_generate_token_clicked: {
    description: 'User clicked on the generate token button',
    productArea: 'e2c',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'funnel',
  },
  grafana_e2c_delete_token_clicked: {
    description: 'User clicked on the delete token button',
    productArea: 'e2c',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
  },
  grafana_e2c_generated_token_modal_dismissed: {
    description: 'User dismissed the generated token modal',
    productArea: 'e2c',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
  },
};
