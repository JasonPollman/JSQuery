(function () {
    'use strict';
    require('proto-lib').get('_');
    var JSDOMConstants           = require('./JSDOMConstants'),
        JSDOMElement             = require('./JSDOMElement'),
        findElementsWithSelector = require('./JSDOMHelpers'),

        LOCKED_INDICES = ['uid', 'level', 'delta'];

    function JSDOMIndex () {
        /**
         * A self reference.
         * @type {JSDOMIndex}
         */
        var self = this;

        function removeElementFromIndex (element, name, key) {
            if(typeof self.by[name][key] === 'object' && self.by[name][key]) {
                var idx = self.by[name][key].indexOf(element);
                if(idx > -1) self.by[name][key].splice(idx, 1);
            }
        }

        /**
         * Stores the elements by "something".
         * This is the default (and locked) set of indexable properties.
         * @type {Object}
         */
        this.by = { uid: {}, level: {}, delta: {} };

        /**
         * Getter functions to retrieve elements "by" some property.
         * @type {Object}
         */
        this.with = {
            // The "depth-first" level of the element in the tree
            uid: function (n) {
                return self.by.uid[n] ? self.by.uid[n] : [];
            },

            // The "depth-first" level of the element in the tree
            level: function (n) {
                return self.by.level[n] ? self.by.level[n] : [];
            },

            // An element is in all delta for which it's level is <= to.
            // For example, if an element has a level 1, it will be in the deltas of 0 and 1,
            // If an element has a level 2, it will be in the deltas of 0, 1, and 2.
            // Used for the selector wildcard (*) opeerator.
            // Note: all elements are in delta 0.
            delta: function(n) {
                return self.by.delta[n] ? self.by.delta[n] : [];
            },

            // The "depth-first" level of the element in the tree
            selector: function (s) {
                return findElementsWithSelector(self, s);
            }
        };

        /**
         * A mapping of element value properties to a character that will represent the property when using a selector.
         * If null, or non-string the property will not be available to selectors.
         * @type {Object}
         */
        this.map = {
            wildcard   : '*',
            descendant : '>',
            ascendant  : '<'
        };

        /**
         * Adds an indexable property to the element set (i.e. allows you to search the set with the given property).
         * @param {String} name The name of the property to index by.
         * @param {String} delimiter The character to map the property to when using a selector.
         * @throws Error
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.addIndex = function (name, delimiter) {
            // Check that we have a valid property name
            if(typeof name !== 'string')
                throw new Error('JSDOMIndex#addIndex expected argument #0 (name) to be a string, but got: ' + typeof name + '.');

            // Check that we have a valid property name
            if(delimiter && typeof delimiter !== 'string')
                throw new Error('JSDOMIndex#addIndex expected argument #1 (map) to be a string, but got: ' + typeof delimiter  + '.');

            if(delimiter && typeof delimiter === 'string') {
                // Check that the delimiter is a single character
                if(delimiter.length > 1)
                    throw new Error('JSDOMIndex#addIndex expected argument #1 (map) to be a string of length 1, but it\'s length is: ' + delimiter.length + '.');

                // Check that the delimiter is a valid chacter
                if(new RegExp(JSDOMConstants.INVALID_SELECTOR_CHARACTERS).test(delimiter))
                    throw new Error('Selector delimiter \'' + delimiter + '\' is invalid; cannot match /' + JSDOMConstants.INVALID_SELECTOR_CHARACTERS + '/g');

                // Check that the propety isn't being used by another delimiter
                if(self.map[name])
                    throw new Error('Property index \'' + name + '\' cannot be overwritten, currently in use by delimiter \'' + self.map[name] + '\'.');

                // Check that the delimiter isn't already in use.
                if(self.map._.invert()[delimiter]) {
                    throw new Error('Selector delimiter (\'' + delimiter + '\') is already in use by another property.');
                }
                self.map[name] = delimiter;
            }

            if(!self.by[name]) {
                self.by[name] = {};

                self.with[name] = function (idx) {
                    return self.by[name][idx] ? self.by[name][idx] : [];
                };
            }
            return self;
        };

        /**
         * Removes an indexable property from the element set.
         * @param {String} name The name of the property remove.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.removeIndex = function (name) {
            if(typeof name === 'string' && JSDOMConstants.LOCKED_PROPERTIES.indexOf(name) === -1) {
                if(self.by[name])   delete self.by[name];
                if(self.with[name]) delete self.with[name];

                delete self.map[name];
            }
            return self;
        };

        /**
         * Empties the element index.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.empty = function () {
            self.by._.every(function (val, key) { self.by[key] = {}; });
            return self;
        };

        this.addElementToIndex = function (element, name, key) {
            if(element instanceof JSDOMElement && self.by[name] && (key || key === 0)) {
                if(!self.by[name][key]) self.by[name][key] = [];
                if(self.by[name][key].indexOf(element) === -1) self.by[name][key].push(element);
            }
            return self;
        };

        this.removeElementFromIndex = function (element, name, key) {
            if(element instanceof JSDOMElement && self.by[name]) {

                // No key specified, remove the element from all values of the index with 'name'.
                if(!key && key !== 0) {
                    self.by[name]._.every(function (k) { removeElementFromIndex(element, name, k); });
                }
                // Just remove the element from the specified index value.
                else {
                    removeElementFromIndex(element, name, key);
                }
            }
            return self;
        };

        this.removeFromAllCustomIndices = function (e) {
            self.by._.every(function (index, key) {
                if(LOCKED_INDICES.indexOf(key) === -1) {
                    index._.every(function (value) {
                        var idx = value.indexOf(e);
                        if(idx > -1) value.splice(idx, 1);
                    });
                }
            });
            return self;
        };

        this.indexAllPropertiesOfObjectForElement = function (o, e) {
            if(typeof o === 'object' && e instanceof JSDOMElement) {
                o._.every(function (val, key) {
                    self.addElementToIndex(e, key, val);
                });
            }
            return self;
        };

        Object.defineProperties(self, {
            /**
             * Returns the regular expressions needed to parse selectors.
             * @return {Object<RegExp>}
             */
            regexps: {
                configurable : false,
                enumerable   : false,
                get          : function getRegularExpressions () {
                    var types = '', selector;
                    self.map._.each(function (m) {
                        if(typeof m === 'string') types += m._.regexpSafe();
                    });

                    selector = '(?:(?:(?:[' + types + ']' + JSDOMConstants.TERMS + ')*|' + JSDOMConstants.WILDCARDS + ')(?:\\[' + JSDOMConstants.ALLOWED_IN_BRACKETS + '\\])*)';

                    return {
                        types        : new RegExp('([' + types + '])', 'g'),
                        validateTerm : new RegExp('(?:^| +)([^' + types + '])'),
                        selector     : new RegExp('(' + selector + '*)', 'g'),
                        validate     : new RegExp('(^ *' + selector + '(?: ' + selector + ')*)' + ' *$', 'g'),
                        properties   : new RegExp('([' + types + ']' + JSDOMConstants.TERMS + '|' + JSDOMConstants.WILDCARDS + ')', 'g')
                    };
                }
            },

            /**
             * Retrieves all of the indexed elements
             * @return {Array<JSDOMElement>} An array of all of the elements in the index.
             */
            all: {
                configurable : false,
                enumerable   : false,
                get          : function getAllElements () { return self.by.uid._.toArray(); }
            },
        });
    }
    module.exports = JSDOMIndex;
}());
