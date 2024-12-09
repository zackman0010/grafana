import { reportInteraction } from '@grafana/runtime';
export function megaMenuItemClicked(
  menuIsDocked: boolean,
  itemIsBookmarked: boolean,
  bookmarkToggleOn: boolean,
  path?: string
): void {
  const pathCheck = path || '';
  reportInteraction('grafana_navigation_item_clicked', { pathCheck, menuIsDocked, itemIsBookmarked, bookmarkToggleOn });
}

export function megaMenuOpened(state: boolean, singleTopNav: boolean): void {
  reportInteraction('grafana_navigation_menu_opened', { state, singleTopNav });
}

export function megaMenuDocked(state: boolean): void {
  reportInteraction('grafana_navigation_menu_docked', { state });
}

export function trackDeleteTokenClicked(): void {
  reportInteraction('grafana_e2c_delete_token_clicked', {});
}

export function trackGenerateTokenClicked(): void {
  reportInteraction('grafana_e2c_generate_token_clicked', {});
}
