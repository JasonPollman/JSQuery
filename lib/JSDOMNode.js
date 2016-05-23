/**
* @file JSDOMNode Class — A representation of a tree node within a DOM (object child of an object).
* @author Jason Pollman <jasonjpollman@gmail.com>
*/

'use strict'; // eslint-disable-line strict
require('proto-lib').get('_');
const makeQueryArray = require('./QueryArray');

/**
* An element class. Represents an "object element". These elements make up a JSDOM Tree.
* @param {JSDOMTree} jsdom The JSDOMTree class to which this element will belong to.
* @param {Object} contents The actual contents of the element (the object itself).
* @constructor
*/
function JSDOMNode(jsdom, value, key) {
  /**
  * A self reference
  * @type {JSDOMElement}
  */
  const self = this;

  /**
  * The parent of this node.
  * @type {JSDOMElement}
  */
  let parent = null;

  /**
  * The depth-first "level" of the element in the tree (root = 0).
  * @type {Number}
  */
  let level = 0;

  key = key || self._.uniqueId();

  Object.defineProperties(self, {
    /**
    * A universal identifier for this element.
    * @type {String}
    */
    uid: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: self._.uniqueId(),
    },

    /**
    * A string representation of this node...
    * @type {String}
    */
    toString: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: () => ((self instanceof require('./JSDOMElement')) // eslint-disable-line
          ? `JSDOMElement: uid=${self.uid}, root=${self.isRoot ? 'true' : 'false'}, parent=${self.parent() ? self.parent().uid : null}, elements=${self.childElements().length}, nodes=${self.nodes().length}` // eslint-disable-line
          : `JSDOMNode: uid=${self.uid}, parent=${self.parent().uid}`),
    },

    /**
    * The key of this JSDOMElement.
    * @type {String}
    */
    key: {
      configurable: false,
      enumerable: true,
      value: () => (self.parent().type === 'object' ? key : self.parent().children().indexOf(self)),
    },

    /**
    * A shallow copy of the children elements of this element.
    * @type {Array<JSDOMElement>}
    */
    children: {
      configurable: false,
      enumerable: true,
      writable: true,
      value: () => makeQueryArray([]),
    },

    /**
    * The parent of this element.
    * @type {JSDOMElement}
    */
    parent: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: p => {
        if (p !== undefined) {
          if (p instanceof JSDOMNode && p !== self) {
            if (parent) parent.remove(self);
            parent = p;
            self.lvl(parent.lvl() + 1);
          }
        }
        return parent;
      },
    },

    /**
    * Returns the value of the current element, or if an object value is passed to value, then it will
    * set the elements value. Silently fails to set a new value if typeof value !== 'object'.
    * @function
    * @param {Object} value The value to set the element to.
    * @return {JSDOMElement} The current JSDOMElement instance.
    */
    val: {
      configurable: false,
      enumerable: true,
      writable: true,
      value: (val, k) => {
        if (val !== undefined) {
          if (!val || typeof val !== 'object') {
            value = val;
          } else {
            const e = new (require('./JSDOMElement'))(jsdom, val, k); // eslint-disable-line global-require
            e.parent(self.parent());
            self.detach();
            return e;
          }
        }
        return value;
      },
    },

    /**
    * The depth-first "level" of the element in the tree (root = 0).
    * @type {Number}
    */
    lvl: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: lvl => {
        if (lvl !== undefined) {
          if (typeof lvl === 'number' || typeof lvl === 'string') {
            const current = level;
            lvl = lvl._.getNumeric();

            if (!isNaN(lvl)) {
              level = lvl;

              if (self instanceof require('./JSDOMElement')) { // eslint-disable-line
                jsdom.index // Re-index the element for the level property.
                  .removeElementFromIndex(self, 'level', current)
                  .addElementToIndex(self, 'level', lvl);

                // Re-index the element for the delta property.
                jsdom.index.removeElementFromIndex(self, 'delta');
                for (let i = 0; i <= level; i++) jsdom.index.addElementToIndex(self, 'delta', i);
              }
              return self;
            }
          }
        }
        return level;
      },
    },
  });
}
module.exports = JSDOMNode;
