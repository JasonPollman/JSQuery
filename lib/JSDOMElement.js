/**
* @file JSDOMElement Class — A representation of an element (object child of an object).
* @author Jason Pollman <jasonjpollman@gmail.com>
*/

'use strict'; // eslint-disable-line strict
const lib = require('proto-lib').get('_');
const JSDOMNode = require('./JSDOMNode');
const JSDOMConstants = require('./JSDOMConstants');
const makeQueryArray = require('./QueryArray');

/**
* An element class. Represents an "object element". These elements make up a JSDOM Tree.
* @param {JSDOMTree} jsdom The JSDOMTree class to which this element will belong to.
* @param {Object} contents The actual contents of the element (the object itself).
* @constructor
* @extends JSDOMNode
*/
function JSDOMElement(jsdom, contents, k) {
  if (!(this instanceof JSDOMElement)) return new JSDOMElement(jsdom, contents, k);

  if (!(jsdom instanceof require('./JSDOMTree'))) { // eslint-disable-line global-require
    throw new TypeError('JSDOMIndex#addIndex expected argument #0 (jsdom) to be an instance of JSDOMTree');
  }

  /**
  * A self reference
  * @type {JSDOMElement}
  */
  const self = this;

  /**
  * The children of the current element.
  * @type {Array<JSDOMElement}
  */
  let children = [];

  /**
  * This element's child nodes indexed by their key.
  * @type {Object}
  */
  let nodesByKey = {};

  /**
  * This element's child elements indexed by their key.
  * @type {Object}
  */
  let elementsByKey = {};

  // Inherit instance methods from JSDOMNode
  JSDOMNode.apply(self, arguments); // eslint-disable-line prefer-rest-params

  // Add some immutable properties to the element...
  Object.defineProperties(self, {
    /**
    * The type of this JSDOMElement (array or object).
    * @type {String}
    */
    type: {
      configurable: false,
      enumerable: true,
      get: () => (contents instanceof Array ? 'array' : 'object'),
    },

    /**
    * The type of this JSDOMElement (array or object)
    * @type {String}
    */
    isRoot: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: k === 'root',
    },

    /**
    * A shallow copy of the children elements of this element.
    * @type {Array<JSDOMElement>}
    */
    children: {
      configurable: false,
      enumerable: true,
      writable: true,
      value: () => makeQueryArray(children._.copy()),
    },

    /**
    * A shallow copy of the children elements of this element.
    * @type {Array<JSDOMElement>}
    */
    childElements: {
      configurable: false,
      enumerable: true,
      writable: true,
      value: () => makeQueryArray(elementsByKey._.toArray()),
    },

    /**
    * A shallow copy of the children elements of this element.
    * @type {Array<JSDOMElement>}
    */
    childNodes: {
      configurable: false,
      enumerable: true,
      writable: true,
      value: () => makeQueryArray(nodesByKey._.toArray()),
    },
  });

  /**
  * Initializes the element's contents with children contents.
  * @return {undefined}
  */
  function init() {
    contents._.every((o, k) => self.append(o, k)); // eslint-disable-line no-shadow

    if (self.isRoot) {
      self.children()._.every(function bubbleLevels(c) {
        c.lvl(this.lvl() + 1);
        c.children()._.every(bubbleLevels.bind(c));
      }.bind(self));

      self.lvl(0);
      jsdom.index
        .removeElementFromAllIndices(self)
        .indexAllPropertiesOfObjectForElement(self.val(), self)
        .addElementToIndex(self, 'uid', self.uid);
    }
  }

  /**
  * Adds a child at the given index.
  * @param {Number} idx The index to add the child to.
  * @param {JSDOMElement|JSDOMNode} The child to add.
  */
  function addChildAtIndex(idx, child) {
    if (lib.object.isNumeric(idx)) {
      children.splice(idx, 0, child);

      if (child instanceof JSDOMNode && !(child instanceof JSDOMElement)) {
        nodesByKey[child.key()] = child;
      } else {
        if (!elementsByKey[child.key()]) elementsByKey[child.key()] = [];
        elementsByKey[child.key()] = child;
      }

      if (child instanceof JSDOMElement) {
        jsdom.index
          .removeElementFromAllCustomIndices(child)
          .indexAllPropertiesOfObjectForElement(child.val(), child)
          .addElementToIndex(self, 'uid', self.uid);
      }
    }
  }

  function reindex(node) {
    if (node instanceof JSDOMElement) {
      jsdom.index
        .removeElementFromAllIndices(node)
        .indexAllPropertiesOfObjectForElement(node.val(), node)
        .addElementToIndex(node, 'uid', node.uid);
    }

    node.children()._.every(reindex);
  }

  /**
  * Adds a child element (or node) at the given index that has the value "value".
  * If key is specified, the key will be passed
  * @param {Number} index The index to add the child at.
  * @param {JSDOMNode|JSDOMElement|*} value A value, JSDOMElement, or JSDOMNode.
  * @param {String=} k The key of the child.
  */
  function addElementAtIndexWithValueAndKey(index, value, k) { // eslint-disable-line no-shadow
    // Got JSDOMElement or JSDOMNode, just add the child.
    if (value instanceof JSDOMNode) {
      const idx = children.indexOf(value);
      if (value !== self && value !== self.parent()) {
        if (idx === -1) {
          // Child doesn't exist on self, add it at given index.
          value.parent(self);
          addChildAtIndex(index, value);
        } else if (idx !== children.length - 1) {
          // Child is already child of parent, move it to new index.
          self.remove(value);
          addChildAtIndex(index, value);
        }
        return value;
      }
    } else if (value && typeof value === 'object') {
      // Got object, create new element and add it.
      return addElementAtIndexWithValueAndKey(index, new JSDOMElement(jsdom, value, k));
    } else {
      // Got literal (or null), create new node and add it.
      return addElementAtIndexWithValueAndKey(index, new JSDOMNode(jsdom, value, k));
    }
    return null;
  }

  /**
  * Removes a child from it's interal key index.
  * @param {JSDOMNode|JSDOMElement} child The child to remove.
  * @return {undefined}
  */
  function removeChildIndexedByKey(child) {
    let idx;

    if (child instanceof JSDOMElement) {
      if (elementsByKey[child.key()] instanceof Array) {
        idx = elementsByKey[child.key()].indexOf(child);
        if (idx > -1) elementsByKey[child.key()].splice(idx, 1);
      }
    } else {
      delete nodesByKey[child.key()];
    }
  }

  this.reindex = function reindexPublic() {
    reindex(self);
    return self;
  };

  /**
  * Returns only the child nodes of this element.
  * @return {Array<JSDOMNode>}
  */
  this.nodes = function nodes() {
    return makeQueryArray(nodesByKey._.toArray());
  };

  /**
  * Returns only the child elements of this element.
  * @return {Array<JSDOMElement>}
  */
  this.elements = function elements() {
    return makeQueryArray(elementsByKey._.toArray());
  };

  /**
  * Returns the value of the current element, or if an object value is passed to value, then it will
  * set the elements value. Silently fails to set a new value if typeof value !== 'object'.
  * @param {Object} value The value to set the element to.
  * @return {JSDOMElement} The current JSDOMElement instance.
  */
  this.val = function val(value) {
    if (value !== undefined) {
      self.empty();
      init(value);
    } else {
      const o = (self.type === 'object' ? {} : []);
      children._.each(c => {
        o[c.key()] = c.val();
      });
      return o;
    }
    return self;
  };

  /**
  * Gets/sets a property on an element's contents. If the argument passed for value === undefined, the property
  * will be returned, otherwise it will try to set the value.
  * @param {String} named The name of the value to get/set.
  * @param {*=} value The value to set.
  * @return {*|JSDOMElement} If set, the current JSDOMElement instance, if got, the value of the property.
  */
  this.prop = function prop(named, value) {
    if (value === null || typeof value === 'string' || typeof value === 'number') {
      if (nodesByKey[named]) {
        nodesByKey[named].val(value);
      } else {
        nodesByKey[named] = self.append(new JSDOMNode(jsdom, value, named));
      }
    } else {
      return nodesByKey[named] ? nodesByKey[named].val() : undefined;
    }
    return self;
  };

  /**
  * Removes a property from an element.
  * @param {String} named The name of the property to remove.
  * @return {JSDOMElement} The current JSDOMElement instance.
  */
  this.removeProp = function removeProp(named) {
    if (typeof named === 'string' || typeof named === 'number') {
      const value = self.prop(named);

      if (value !== undefined && nodesByKey[named] instanceof Array) {
        delete nodesByKey[named];
      }
    }
    return self;
  };

  /**
  * Alias to JSDOMElement#prop
  * @type {Function}
  */
  this.attr = this.prop;

  /**
  * Alias to JSDOMElement#removeProp
  * @type {Function}
  */
  this.removeAttr = this.removeProp;

  /**
  * Appends a child element to the current element.
  * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to append.
  * @param {String|Number} k The key for the element to be attached to this object as (objects types only).
  * @return {JSDOMElement|JSDOMNode} The newly created element.
  */
  this.append = function append(value, k) { // eslint-disable-line no-shadow
    return addElementAtIndexWithValueAndKey(children.length, value, k);
  };

  /**
  * Prepends a child element to the current element.
  * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to prepend.
  * @param {String|Number} k The key for the element to be attached to this object as (objects types only).
  * @return {JSDOMElement} The current JSDOMElement instance.
  */
  this.prepend = function prepend(value, k) { // eslint-disable-line no-shadow
    return addElementAtIndexWithValueAndKey(0, value, k);
  };

  /**
  * Inserts the value (or child) at the given index.
  * @param {Number} n The index to insert the child at.
  * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to insert.
  * @param {String|Number} k The key for the element to be attached to this object as (objects types only).
  * @return {JSDOMElement|JSDOMNode} The newly created element.
  */
  this.insertAtIndex = function insertAtIndex(n, value, k) { // eslint-disable-line no-shadow
    return addElementAtIndexWithValueAndKey(n, value, k);
  };

  /**
  * Inserts the value (or child) just before the given child.
  * If the child does not exist within the current element, the new element is *appended*
  * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to insert.
  * @param {String|Number} key The key for the element to be attached to this object as (objects types only).
  * @param {JSDOMElement|JSDOMNode} child The child element to insert the new child before.
  * @return {JSDOMElement|JSDOMNode} The newly created element.
  */
  this.insertBefore = function insertBefore(value, k, child) { // eslint-disable-line no-shadow
    if (k instanceof JSDOMNode) {
      child = k;
      k = undefined;
    }

    const idx = children.indexOf(child);
    if (idx !== -1) {
      addElementAtIndexWithValueAndKey(idx - 1, value, k);
    } else {
      addElementAtIndexWithValueAndKey(children.length, value, k);
    }
    return self;
  };

  /**
  * Inserts the value (or child) just after the given child.
  * If the child does not exist within the current element, the new element is *appended*
  * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to insert.
  * @param {String|Number} key The key for the element to be attached to this object as (objects types only).
  * @param {JSDOMElement|JSDOMNode} child The child element to insert the new child after.
  * @return {JSDOMElement|JSDOMNode} The newly created element.
  */
  this.insertAfter = function insertAfter(value, key, child) {
    if (key instanceof JSDOMNode) {
      child = key;
      key = undefined;
    }

    const idx = children.indexOf(child);
    if (idx !== -1) {
      addElementAtIndexWithValueAndKey(idx + 1, value, key);
    } else {
      addElementAtIndexWithValueAndKey(children.length, value, key);
    }
    return self;
  };

  /**
  * Removes the given child element from this element.
  * @param {JSDOMElement|JSDOMNode} child The child element/node to remove.
  * @return {JSDOMElement|JSDOMNode} The removed child element/node.
  */
  this.remove = function remove(child) {
    if (child !== undefined) {
      if (child instanceof JSDOMNode) {
        const idx = children.indexOf(child);
        if (idx !== -1) {
          removeChildIndexedByKey(child);
          if (child instanceof JSDOMElement) jsdom.index.removeElementFromAllIndices(child);
          children.splice(idx, 1);
        }
        return child;
      }
    }
    return null;
  };

  /**
  * Removes all the children from this element.
  * @return {JSDOMElement} The current JSDOMElement isntance.
  */
  this.empty = function empty() {
    nodesByKey = {};
    elementsByKey = {};
    children = [];
    return self;
  };

  /**
  * Removes this element from its parent (detaches it from the tree).
  * @return {JSDOMElement} The current JSDOMElement instance.
  */
  this.detach = function detach() {
    self.parent().remove(self);
    return self;
  };

  /**
  * Returns the child at the given index.
  * @param {Number} n The index of the child to get.
  * @return {JSDOMElement|undefined} The element at the given index, or undefined.
  */
  this.getChildAtIndex = function getChildAtIndex(n) {
    return children[n];
  };

  /**
  * Returns an array of the element's children who pass the given predicate function.
  * @param {Function} predicate The predicate to filter the children by.
  * @return {Array<JSDOMElement>} An array of child elements.
  */
  this.getChildWhere = function getChildWhere(predicate) {
    return makeQueryArray(children._.where(predicate));
  };

  /**
  * Find children by selector.
  * @param {String} selector The selector to find children elements with.
  * @return {Array<JSDOMElement|JSDOMNode>} The children that match the given selector.
  */
  this.find = function find(selector) {
    return typeof selector === 'string'
      ? jsdom.query(`${JSDOMConstants.UID_SELECTOR_MAP + self.uid} ${selector}`)
      : makeQueryArray([]);
  };

  // Initialze the element's contents...
  init();
}

JSDOMElement._.inherits(JSDOMNode);
module.exports = JSDOMElement;
