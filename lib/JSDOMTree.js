/**
* @file JSDOMTree Class — Creates "js object" trees.
* @author Jason Pollman <jasonjpollman@gmail.com>
*/

'use strict'; // eslint-disable-line strict
require('proto-lib').get('_');

const crypto = require('crypto');
const JSDOMIndex = require('./JSDOMIndex');
const JSDOMConstants = require('./JSDOMConstants');
const JSDOMElement = require('./JSDOMElement');

/**
* Gets the hash for the given tree string.
* @param {String} tree A stringified tree.
* @return {String} An md5 hash for the given tree string.
* @throws TypeError
*/
function getTreeHash(tree) {
  if (!tree || typeof tree !== 'string') {
    throw new TypeError('Attempt to get tree hash from non-string value.');
  }

  return crypto.createHash('md5')
  .update(tree)
  .digest('hex');
}

/**
* Creates a JSDOMTree. Used to store "elements" of an object in a tree-like data structure.
* Used to query and lookup elements by their various properties and by selectors.
* @param {Object} tree The "tree" or object to create the JSDOMTree with.
* @param {Object=} options User options used to create the tree.
* @constructor
*/
function JSDOMTree(tree, options) {
  if (!tree || typeof tree !== 'object') {
    throw new TypeError(`Cannot create tree with type: ${(tree ? typeof tree : tree)}.`);
  }

  options = typeof options === 'object' ? options : {};

  /**
  * A self reference.
  * @type {JSDOM}
  */
  const self = this;

  /**
  * The indexer used with this tree instance.
  * @type {JSDOMIndex}
  */
  const index = new JSDOMIndex();

  /**
  * The root element of the tree.
  * @type {JSDOMElement}
  */
  let root = null;

  const propertyDefinitions = {
    /**
    * Returns a hash based on the JSON string created by the tree.
    * @memberof JSDOM
    * @function
    */
    hash: {
      configurable: false,
      enumerable: false,

      get: function getHash() {
        try {
          return getTreeHash(JSON.stringify(tree, JSDOMConstants.REPLACE_CIRCULAR_PARENTS));
        } catch (e) {
          throw new Error(`Unable to get tree hash: ${e.message}`);
        }
      },
    },

    /**
    * Returns a copy of all the elements in the tree.
    * @type {Array<JSDOMElement>}
    */
    elements: {
      configurable: false,
      enumerable: false,
      get: function getElements() { return index.all; },
    },

    /**
    * Lookup elements "with" this object.
    * It's properties map to the available index lookup functions.
    * @type {Object<Function>}
    */
    with: {
      configurable: false,
      enumerable: false,
      get: function getWith() { return index.with._.copy(); },
    },

    /**
    * Lookup elements "with" this object.
    * It's properties map to the available index lookup functions.
    * @type {Object<Function>}
    */
    by: {
      configurable: false,
      enumerable: false,
      get: function getWith() { return index.by; },
    },

    /**
    * This JSDOMTree's JSDOMIndex instance.
    * @type {JSDOMIndex}
    */
    index: {
      configurable: false,
      enumerable: false,
      get: function getIndex() { return index; },
    },
  };

  /**
  * Adds an element property index from the JSDOMIndex.
  * @return {JSDOMTree} The current JSDOMTree instance.
  */
  this.addIndex = function addIndex(...args) {
    index.addIndex.apply(index, args);
    // We must re-index the tree, as we have a new property index
    // that an element could belong to.
    if (root) root.reindex();
    return self;
  };

  /**
  * Removes an element property index from the JSDOMIndex.
  * @return {JSDOMTree} The current JSDOMTree instance.
  */
  this.removeIndex = function removeIndex(...args) {
    index.removeIndex.apply(index, args);
    return self;
  };

  /**
  * Find elements using a predicate on indexed properties.
  * @param {Function} predicate The predicate function to invoke for each element in the index.
  * @return {Array<Object>} The set of elements that pass the predicate function.
  */
  this.where = function where(predicate) {
    return index.all._.where(predicate);
  };

  /**
  * Exports a copy of the tree as an object with the keys "dom" and "hash".
  * The dom is the cloned tree, and hash is the hash for the tree.
  * @return {Object<*>}
  */
  this.export = function export_() {
    const dom = [];
    root.children()._.every(elem => dom.push(elem.val()));
    const json = JSON.stringify(tree, null, '    ');

    return { dom, json, hash: getTreeHash(json) };
  };

  /**
  * Empties the element set, but saves added indices.
  * @return {JSDOM} The current JSDOM instance.
  */
  this.empty = function empty() {
    index.empty();
    root = new JSDOMElement(self, tree, 'root');
    return self;
  };

  /**
  * Sugar for JSDOM#with.selector
  * @param {String} selector The selector to query the tree with.
  * @return {Array<Object>} The elements that match the given selectors.
  */
  this.query = function query(selector) {
    return index.with.selector(selector);
  };

  // Attempt to parse the tree: make a deep copy, and throw if circular.
  try {
    tree = tree._.clone();
  } catch (e) {
    throw new SyntaxError(`Cannot create tree: ${e.message}`);
  }

  // Setup initial indices...
  if (options.indices instanceof Array) {
    options.indices._.each(idx => {
      if (typeof idx === 'object' && typeof (idx.key === 'string' || typeof idx.key === 'number')) {
        self.addIndex(idx.key.toString(), idx.accessor);
      }
    });
  }

  Object.defineProperties(self, propertyDefinitions);
  Object.defineProperties(self.query, propertyDefinitions);

  self._.each((val, key) => { self.query[key] = val; });
  root = new JSDOMElement(self, tree, 'root');
}


/**
 * Creates a new JSDOMTree from a JSON string.
 * @param {String} data The JSON string to create the DOM tree with.
 * @param {Object=} options Options that will be passed ot the JSDOMTree constructor.
 * @return {JSDOMTree} The newly created DOMTree.
 * @throws {SyntaxError} If the string data cannot be stringified.
 */
JSDOMTree.fromString = function treeFromString(data, options) {
  try {
    return new JSDOMTree(JSON.parse(data), options).query;
  } catch (e) {
    throw new SyntaxError(`Cannot parse tree: ${e.message}`);
  }
};

/**
 * Creates a new JSDOMTree from an object.
 * @param {Object} data The JSON string to create the DOM tree with.
 * @param {Object=} options Options that will be passed ot the JSDOMTree constructor.
 * @return {JSDOMTree} The newly created DOMTree.
 */
JSDOMTree.fromObject = function treeFromObject(data, options) {
  return new JSDOMTree(data, options).query;
};

module.exports = JSDOMTree;
