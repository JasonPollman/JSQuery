/**
* @file This is a simple selector statistics polling module.
* Each time a selector is called, a new Stat object is pushed into Stat.called.
* This is for debugging purposes only — do not rely on it.
* It may removed in future versions!
*
* @author Jason Pollman <jasonjpollman@gmail.com>
*/
'use strict'; // eslint-disable-line strict

let call = 0;
const JSDOMConstants = require('./JSDOMConstants');
const Stat = {
  /**
  * Create a new stat object
  * @param {String} selector The selector used in this call to findElementsWithSelector
  * @param {String=} cache The md5 cache line name, if this is a cache call.
  * @param {Number=} count The number of elements returned from the selector query.
  * @return {Object} The new stat object.
  */
  new: (selector, cache, count) => {
    const start = process.hrtime();
    const stat = {
      call: call++,
      selector: typeof selector === 'string' ? selector : null,
      elems: typeof count === 'number' ? count : null,
      cache: typeof cache === 'string' ? cache : null,
      msec: null,
      cycles: {
        parsing: 0,
        selector: 0,
        nth: 0,
        attributes: 0,
        descendants: 0,
      },

      /**
      * Ends a stat call (updates the total time).
      * @param {Number} count The number of elements returned from the selector query.
      * @return {Object} The stat object.
      */
      end: c => {
        if (typeof c === 'number') stat.elems = c;

        const diff = process.hrtime(start);
        Stat.current.msec = ((diff[0] * 1e9 + diff[1]) * 1e-6);
        return stat;
      },
    };

    Stat.calls.push(stat);
    // Trim the stat list to the total allowable.
    Stat.calls = Stat.calls.slice(-JSDOMConstants.STATS_MAX);
    Stat.current = stat;

    return stat;
  },
  current: null,
  calls: [],
};

module.exports = Stat;
