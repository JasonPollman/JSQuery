/**
 * @file JSDOMElement Class — A representation of an element (object child of an object).
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */

(function () {
    'use strict';
    var lib            = require('proto-lib').get('_'),
        JSDOMNode      = require('./JSDOMNode'),
        JSDOMConstants = require('./JSDOMConstants'),
        makeQueryArray = require('./QueryArray');

    /**
     * An element class. Represents an "object element". These elements make up a JSDOM Tree.
     * @param {JSDOMTree} jsdom The JSDOMTree class to which this element will belong to.
     * @param {Object} contents The actual contents of the element (the object itself).
     * @constructor
     * @extends JSDOMNode
     */
    function JSDOMElement (jsdom, contents, key) {
        if(!(this instanceof JSDOMElement)) return new JSDOMElement(jsdom, contents, key);

        if(!(jsdom instanceof require('./JSDOMTree')))
            throw new TypeError('JSDOMIndex#addIndex expected argument #0 (jsdom) to be an instance of JSDOMTree');

            /**
             * A self reference
             * @type {JSDOMElement}
             */
        var self = this,

            /**
             * The children of the current element.
             * @type {Array<JSDOMElement}
             */
            children = [],

            /**
             * This element's child nodes indexed by their key.
             * @type {Object}
             */
            nodesByKey = {},

            /**
             * This element's child elements indexed by their key.
             * @type {Object}
             */
            elementsByKey = {};

        // Inherit instance methods from JSDOMNode
        JSDOMNode.apply(self, arguments);

        // Add some immutable properties to the element...
        Object.defineProperties(self, {
            /**
             * The type of this JSDOMElement (array or object).
             * @type {String}
             */
            type: {
                configurable : false,
                enumerable   : true,
                get          : function () {
                    return contents instanceof Array ? 'array' : 'object';
                }
            },

            /**
             * The type of this JSDOMElement (array or object)
             * @type {String}
             */
            isRoot: {
                configurable : false,
                enumerable   : true,
                writable     : false,
                value        : key === 'root'
            },

            /**
             * A shallow copy of the children elements of this element.
             * @type {Array<JSDOMElement>}
             */
            children: {
                configurable : false,
                enumerable   : true,
                writable     : true,
                value        : function () {
                    return makeQueryArray(children._.copy());
                }
            }
        });

        /**
         * Initializes the element's contents with children contents.
         * @return {undefined}
         */
        function init () {
            contents._.every(function (o, k) {
                self.append(o, k);
            });

            if(self.isRoot) {
                self.children()._.every(function bubbleLevels (c) {
                    c.lvl(this.lvl() + 1);
                    c.children()._.every(bubbleLevels.bind(c));
                }.bind(self));
            }
        }

        /**
         * Adds a child at the given index.
         * @param {Number} idx The index to add the child to.
         * @param {JSDOMElement|JSDOMNode} The child to add.
         */
        function addChildAtIndex (idx, child) {
            console.log('adding', idx);
            if(lib.object.isNumeric(idx)) {
                if(child instanceof JSDOMNode && !(child instanceof JSDOMElement)) {
                    nodesByKey[child.key] = child;
                }
                else {
                    if(!elementsByKey[child.key]) elementsByKey[child.key] = [];
                    elementsByKey[child.key] = child;
                }

                jsdom.index
                    .removeElementFromAllCustomIndices(child)
                    .indexAllPropertiesOfObjectForElement(self.val(), child)
                    .addElementToIndex(self, 'uid', self.uid);

                children.splice(idx, 0, child);
            }
        }

        function reindex (node) {
            jsdom.index
                .removeElementFromAllIndices(node)
                .indexAllPropertiesOfObjectForElement(node.val(), node)
                .addElementToIndex(node, 'uid', node.uid);

            node.children()._.every(reindex);
        }

        /**
         * Adds a child element (or node) at the given index that has the value "value".
         * If key is specified, the key will be passed
         * @param {Number} index The index to add the child at.
         * @param {JSDOMNode|JSDOMElement|*} value A value, JSDOMElement, or JSDOMNode.
         * @param {String=} key The key of the child.
         */
        function addElementAtIndexWithValueAndKey (index, value, key) {
            // Got JSDOMElement or JSDOMNode, just add the child.
            if(value instanceof JSDOMNode) {
                var idx = children.indexOf(value);
                if(value !== self && value !== self.parent()) {
                    // Child doesn't exist on self, add it at given index.
                    if(idx === -1) {
                        value.parent(self);
                        addChildAtIndex(index, value, key);
                    }
                    // Child is already child of parent, move it to new index.
                    else if(idx !== children.length - 1) {
                        self.remove(value);
                        addChildAtIndex(index, value, key);
                    }
                    return value;
                }
            }
            // Got object, create new element and add it.
            else if(value && typeof value === 'object') {
                return addElementAtIndexWithValueAndKey(index, new JSDOMElement(jsdom, value, key));
            }
            // Got literal (or null), create new node and add it.
            else {
                return addElementAtIndexWithValueAndKey(index, new JSDOMNode(jsdom, value, key));
            }
        }

        /**
         * Removes a child from it's interal key index.
         * @param {JSDOMNode|JSDOMElement} child The child to remove.
         * @return {undefined}
         */
        function removeChildIndexedByKey (child) {
            var idx;

            if(child instanceof JSDOMElement) {
                if(elementsByKey[child.key] instanceof Array) {
                    idx = elementsByKey[child.key].indexOf(child);
                    if(idx > -1) elementsByKey[child.key].splice(idx, 1);
                }
            }
            else {
                delete nodesByKey[child.key];
            }
        }

        this.reindex = function () {
            reindex(self);
            return self;
        };

        /**
         * Returns only the child nodes of this element.
         * @return {Array<JSDOMNode>}
         */
        this.nodes = function () {
            return makeQueryArray(nodesByKey._.toArray());
        };

        /**
         * Returns only the child elements of this element.
         * @return {Array<JSDOMElement>}
         */
        this.elements = function () {
            return makeQueryArray(elementsByKey._.toArray());
        };

        /**
         * Returns the value of the current element, or if an object value is passed to value, then it will
         * set the elements value. Silently fails to set a new value if typeof value !== 'object'.
         * @param {Object} value The value to set the element to.
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.val = function (value) {
            if(value !== undefined) {
                self.empty();
                init(value);
            }
            else {
                var o = (self.type === 'object' ? {} : []);
                children._.each(function (c) {
                    //console.log(self.type, c.key);
                    o[c.key] = c.val();
                });
                return o;
            }
        };

        /**
         * Gets/sets a property on an element's contents. If the argument passed for value === undefined, the property
         * will be returned, otherwise it will try to set the value.
         * @param {String} named The name of the value to get/set.
         * @param {*=} value The value to set.
         * @return {*|JSDOMElement} If set, the current JSDOMElement instance, if got, the value of the property.
         */
        this.prop = function (named, value) {
            if(value === null || typeof value === 'string' || typeof value === 'number') {
                if(nodesByKey[named]) {
                    var current = nodesByKey[named];
                    nodesByKey[named].val(value);

                    jsdom.index // Re-index the element the changed property
                        .removeElementFromIndex(nodesByKey[named], named, current)
                        .addElementToIndex(nodesByKey[named], named, value);
                }
                else {
                    console.log('herre', named);
                    var e = self.append(new JSDOMNode(jsdom, value, named));
                    nodesByKey[named] = e;
                }
            }
            else {
                return nodesByKey[named] ? nodesByKey[named].val() : undefined;
            }
            return self;
        };

        /**
         * Removes a property from an element.
         * @param {String} named The name of the property to remove.
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.removeProp = function (named) {
            if(typeof named === 'string' || typeof named === 'number') {
                var value = self.prop(named);

                if(value !== undefined && nodesByKey[named] instanceof Array) {
                    jsdom.index.removeElementFromIndex(nodesByKey[named], named, value);
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
         * @param {String|Number} key The key for the element to be attached to this object as (objects types only).
         * @return {JSDOMElement|JSDOMNode} The newly created element.
         */
        this.append = function (value, key) {
            return addElementAtIndexWithValueAndKey(children.length, value, key);
        };

        /**
         * Prepends a child element to the current element.
         * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to prepend.
         * @param {String|Number} key The key for the element to be attached to this object as (objects types only).
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.prepend = function (value, key) {
            return addElementAtIndexWithValueAndKey(0, value, key);
        };

        /**
         * Inserts the value (or child) at the given index.
         * @param {Number} n The index to insert the child at.
         * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to insert.
         * @param {String|Number} key The key for the element to be attached to this object as (objects types only).
         * @return {JSDOMElement|JSDOMNode} The newly created element.
         */
        this.insertAtIndex = function (n, value, key) {
            return addElementAtIndexWithValueAndKey(n, value, key);
        };

        /**
         * Inserts the value (or child) just before the given child.
         * If the child does not exist within the current element, the new element is *appended*
         * @param {JSDOMElement|JSDOMNode|*} value The value (or child element) to insert.
         * @param {String|Number} key The key for the element to be attached to this object as (objects types only).
         * @param {JSDOMElement|JSDOMNode} child The child element to insert the new child before.
         * @return {JSDOMElement|JSDOMNode} The newly created element.
         */
        this.insertBefore = function (value, key, child) {
            if(key instanceof JSDOMNode) {
                child = key;
                key   = undefined;
            }

            var idx = children.indexOf(child);
            if(idx !== -1) {
                addElementAtIndexWithValueAndKey(idx - 1, value, key);
            }
            else {
                addElementAtIndexWithValueAndKey(children.length, value, key);
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
        this.insertAfter = function (value, key, child) {
            if(key instanceof JSDOMNode) {
                child = key;
                key   = undefined;
            }

            var idx = children.indexOf(child);
            if(idx !== -1) {
                addElementAtIndexWithValueAndKey(idx + 1, value, key);
            }
            else {
                addElementAtIndexWithValueAndKey(children.length, value, key);
            }
            return self;
        };

        /**
         * Removes the given child element from this element.
         * @param {JSDOMElement|JSDOMNode} child The child element/node to remove.
         * @return {JSDOMElement|JSDOMNode} The removed child element/node.
         */
        this.remove = function (child) {
            if(child !== undefined) {
                if(child instanceof JSDOMNode) {
                    var idx = children.indexOf(child);
                    if(idx !== -1) {
                        removeChildIndexedByKey(child);
                        jsdom.index.removeElementFromAllIndices(child);
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
        this.empty = function () {
            nodesByKey    = {};
            elementsByKey = {};
            children      = [];
            return self;
        };

        /**
         * Removes this element from its parent (detaches it from the tree).
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.detach = function () {
            self.parent().remove(self);
            return self;
        };

        /**
         * Returns the child at the given index.
         * @param {Number} n The index of the child to get.
         * @return {JSDOMElement|undefined} The element at the given index, or undefined.
         */
        this.getChildAtIndex = function (n) {
            return children[n];
        };

        /**
         * Returns an array of the element's children who pass the given predicate function.
         * @param {Function} predicate The predicate to filter the children by.
         * @return {Array<JSDOMElement>} An array of child elements.
         */
        this.getChildWhere = function (predicate) {
            return makeQueryArray(children._.where(predicate));
        };

        /**
         * Find children by selector.
         * @param {String} selector The selector to find children elements with.
         * @return {Array<JSDOMElement|JSDOMNode>} The children that match the given selector.
         */
        this.find = function (selector) {
            return typeof selector === 'string' ?
                jsdom.query(JSDOMConstants.UID_SELECTOR_MAP + self.uid + ' ' + selector) :
                makeQueryArray([]);
        };

        // Index all of the element's properties, and index the element by its uid...
        jsdom.index
            .indexAllPropertiesOfObjectForElement(contents, self)
            .addElementToIndex(self, 'uid', self.uid);

        // Initialze the element's contents...
        init();
    }

    JSDOMElement._.inherits(JSDOMNode);
    module.exports = JSDOMElement;
}());
