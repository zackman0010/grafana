import debounce from 'lodash/debounce';
import memoize from 'lodash/memoize';

export default <T>(func: (...args: T[]) => void, wait = 7000) => {
  const mem = memoize(
    (...args) =>
      debounce(func, wait, {
        leading: true,
      }),
    (...args) => JSON.stringify(args)
  );

  return (...args: T[]) => mem(...args)(...args);
};
