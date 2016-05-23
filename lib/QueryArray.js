/**
* @file QueryArray — An array-like object that contains JSDOMElements
* @author Jason Pollman <jasonjpollman@gmail.com>
*/
'use strict';

require('proto-lib').get('_');

function QuerifyArray(a) {
  if (!(a instanceof Array)) throw new Error('QuerifyArray expected argument #0 (array) to be an array.');

  if (!a.querified) {
    Object.defineProperties(a, {
      querified: {
        configurable: false,
        enumberable: false,
        writable: false,
        value: true,
      },

      prop: {
        configurable: false,
        enumberable: true,
        writable: false,
        value: function prop(property, value) { // eslint-disable-line object-shorthand
          const args = arguments; // eslint-disable-line prefer-rest-params

          if (value !== undefined) {
            a._.each(e => {
              if (e instanceof require('./JSDOMElement')) e.prop.apply(e, args); // eslint-disable-line global-require, max-len
            });
            return a;
          }
          return a.length > 0 ? a[0].prop(property) : undefined;
        },
      },

      val: {
        configurable: false,
        enumberable: true,
        writable: false,
        value: function val(value) {
          const args = arguments; // eslint-disable-line prefer-rest-params

          if (value !== undefined) {
            a._.each(e => {
              if (e instanceof require('./JSDOMNode')) e.val.apply(e, args); // eslint-disable-line global-require, max-len
            });
            return a;
          }
          return a.length > 0 ? a[0].val() : undefined;
        },
      },

      get: {
        configurable: false,
        enumberable: true,
        writable: false,
        value: n => a[n],
      },

      children: {
        configurable: false,
        enumberable: true,
        writable: false,
        value: () => (a.length > 0 ? a[0].children() : undefined),
      },

      level: {
        configurable: false,
        enumberable: true,
        writable: false,
        value: () => (a.length > 0 ? a[0].level() : undefined),
      },

      each: {
        configurable: false,
        enumberable: true,
        writable: false,
        value: (...args) => a._.each.apply(a, args),
      },
    });
  }
  return a;
}

module.exports = QuerifyArray;
