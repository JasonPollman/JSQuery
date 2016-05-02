/**
 * @file JSDOMElement Class — A representation of an element (object child of an object).
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */

(function () {
    'use strict';
    require('proto-lib').get('_');
    
    /**
     * An element class. Represents an "object element". These elements make up a JSDOM Tree.
     * @param {JSDOMTree} jsdom The JSDOMTree class to which this element will belong to.
     * @param {Object} contents The actual contents of the element (the object itself).
     * @constructor
     */
    function JSDOMElement (jsdom, contents) {
        if(!(this instanceof JSDOMElement))
            return new JSDOMElement(jsdom, contents);

        if(!(jsdom instanceof require('./JSDOMTree')))
            throw new TypeError('JSDOMIndex#addIndex expected argument #0 (jsdom) to be an instance of JSDOMTree');

        if(typeof contents !== 'object')
            throw new TypeError('Cannot create element from non-object');

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
             * The parent of this element.
             * @type {JSDOMElement}
             */
            parent = null,

            /**
             * The depth-first "level" of the element in the tree (root = 0).
             * @type {Number}
             */
            level = 0;

        Object.defineProperties(self, {

            /**
             * A universal identifier for this element.
             * @type {String}
             */
            uid: {
                configurable : false,
                enumerable   : true,
                writable     : false,
                value: self._.uniqueId()
            },

            /**
             * A shallow copy of the children elements of this element.
             * @type {Array<JSDOMElement>}
             */
            children: {
                configurable : false,
                enumerable   : true,
                get          : function () { return children._.copy(); }
            },

            /**
             * The depth-first "level" of the element in the tree (root = 0).
             * @type {Number}
             */
            level: {
                configurable : false,
                enumerable   : true,

                get: function () {
                    return level;
                },
                set: function (lvl) {
                    var current = level;

                    if(lvl || (!lvl && lvl === 0)) {
                        lvl = lvl._.getNumeric();
                        if(!isNaN(lvl)) level = lvl;

                        jsdom.index // Re-index the element for the level property.
                            .removeElementFromIndex(self, 'level', current)
                            .addElementToIndex(self, 'level', lvl);

                        // Re-index the element for the delta property.
                        jsdom.index.removeElementFromIndex(self, 'delta');
                        for(var i = 0; i <= level; i++) jsdom.index.addElementToIndex(self, 'delta', i);
                    }
                }
            },

            /**
             * The parent of this element.
             * @type {JSDOMElement}
             */
            parent: {
                configurable : false,
                enumerable   : true,

                get: function () {
                    return parent;
                },
                set: function (p) {
                    if(p instanceof JSDOMElement && children.indexOf(p) === -1 && p !== self) {
                        if(parent) parent.removeChild(self);
                        parent = p;

                        parent.addChild(p);
                        self.level = parent.level + 1;
                    }
                }
            }
        });

        /**
         * Returns the value of the current element, or if an object value is passed to value, then it will
         * set the elements value. Silently fails to set a new value if typeof value !== 'object'.
         * @param {Object} value The value to set the element to.
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.val = function (value) {
            if(value !== undefined) {
                if(typeof value === 'object') {
                    contents = value;

                    // Re-index all properties
                    jsdom.index
                        .removeElementFromAllCustomIndices(self)
                        .indexAllPropertiesOfObjectForElement(contents, self);
                }
            }
            else {
                var props = contents._.copy();
                props.children = [];
                children._.every(function (c) { props.children.push(c.val()); });
                return props;
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
            if(value !== undefined) {
                var current = contents[named];
                contents[named] = value;

                jsdom.index // Re-index the element the changed property
                    .removeElementFromIndex(self, named, current)
                    .addElementToIndex(self, named, value);
            }
            else {
                return contents[named];
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

                if(value !== undefined) {
                    jsdom.index.removeElementFromIndex(self, named, value);

                    if(contents instanceof Array && named._.isNumeric()) {
                        contents.splice(named._.getNumeric(), 1);
                    }
                    else {
                        delete contents[named];
                    }
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
         * Adds a child element to the current element.
         * Silently fails if the argument passed for parameter child is not an instance of JSDOMElement.
         * @param {JSDOMElement} child The child element to add.
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.addChild = function (child) {
            if(children.indexOf(child) === -1 && child instanceof JSDOMElement && child !== self && child !== self.parent) {
                child.parent = self;
                children.push(child);
            }
            return self;
        };

        /**
         * Adds a child from the specified element.
         * Silently fails if the argument passed for parameter child is not an instance of JSDOMElement.
         * @param {JSDOMElement} child The child element to add.
         * @return {JSDOMElement} The current JSDOMElement instance.
         */
        this.removeChild = function (child) {
            var idx = children.indexOf(child);
            if(idx !== -1 && child instanceof JSDOMElement) children.splice(idx, 1);
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
            return children._.where(predicate);
        };

        // Index all of the element's properties, and index the element by its uid...
        jsdom.index
            .indexAllPropertiesOfObjectForElement(contents, self)
            .addElementToIndex(self, 'uid', self.uid);

    }
    module.exports = JSDOMElement;
}());
