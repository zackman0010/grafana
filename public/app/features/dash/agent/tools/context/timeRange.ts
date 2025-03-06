import { AppContext } from './app';
import { PageContext } from './page';

export interface TimeRangeContext {
  text: string;
}

export function getTimeRangeContext({ url_parameters }: PageContext, _appContext: AppContext): TimeRangeContext {
  if (url_parameters.from && url_parameters.to) {
    return {
      text: `from ${url_parameters.from} to ${url_parameters.to}`,
    };
  }

  return {
    text:
      document
        .querySelector('[data-testid~="TimePicker"]')
        ?.getAttribute('aria-label')
        ?.replace('Time range selected: ', '') ?? '',
  };
}
