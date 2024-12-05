import { reportTrackingEvent } from '../events';

export function megaMenuItemClicked(
  menuIsDocked: boolean,
  itemIsBookmarked: boolean,
  bookmarkToggleOn: boolean,
  path?: string
): void {
  const pathCheck = path || '';
  reportTrackingEvent({
    repo: '',
    product: 'navigation',
    eventName: 'megaMenuItemClicked',
    properties: { pathCheck, menuIsDocked, itemIsBookmarked, bookmarkToggleOn },
  });
}

export function megaMenuOpened(state: boolean, singleTopNav: boolean): void {
  reportTrackingEvent({
    repo: '',
    product: 'navigation',
    eventName: 'megaMenuOpened',
    properties: { state, singleTopNav },
  });
}

export function megaMenuDocked(state: boolean): void {
  reportTrackingEvent({
    repo: '',
    product: 'navigation',
    eventName: 'megaMenuDocked',
    properties: { state },
  });
}

export function createReturnToPrevious(page: string, previousPage?: string): void {
  const previousPageCheck = previousPage || '';
  reportTrackingEvent({
    repo: '',
    product: 'return_to_previous',
    eventName: 'createReturnToPrevious',
    properties: { page, previousPageCheck },
  });
}

export function dismissReturnToPrevious(action: string, page: string): void {
  reportTrackingEvent({
    repo: '',
    product: 'return_to_previous',
    eventName: 'dismissReturnToPrevious',
    properties: { action, page },
  });
}
