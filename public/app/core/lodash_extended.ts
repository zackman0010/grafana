// eslint-disable-next-line lodash/import-scope
import _ from 'lodash';

import { arrayMove } from 'app/core/utils/arrayMove';

/*
  Provide move for backwards compatibility with plugins.
*/
_.mixin({
  move: arrayMove,
});

export default _;
