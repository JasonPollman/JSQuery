/**
 * @file JSDOMIndex Class — Used by JSDOMTree objects to index their elements.
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */

(function () {
    'use strict';
    require('proto-lib').get('_');

    var JSDOMConstants           = require('./JSDOMConstants'),
        JSDOMNode                = require('./JSDOMNode'),
        JSDOMStat                = require('./JSDOMStat'),
        makeQueryArray           = require('./QueryArray'),
        findElementsWithSelector = require('./JSDOMHelpers');

    /**
     * Creates a new JSDOMIndex object.
     * Stores elements by "indexable" properties, that can be customized (added/removed).
     * Also contains many lookup functions to retrieve elements by indexed properties.
     * @constructor
     */
    function JSDOMIndex () {
        /**
         * A self reference.
         * @type {JSDOMIndex}
         */
        var self = this,

        /**
         * A reference to when the last index update was.
         * @type {Number}
         */
        updated = null,

        /**
         * Used to compare to updated. If updated === lastIndexUpdate, then cached results
         * can be used, otherwise the selector will be evaluated and cached.
         * @type {Number}
         */
        lastIndexUpdate = -1,

        /**
         * Stores cached results per selector.
         * @type {Object}
         */
        cache = {};

        /**
         * Removes an element from the given index.
         * @param {JSDOMElement} element The element to remove.
         * @param {String} name The named of the index.
         * @param {String} key The index key to remove the element from.
         * @return {undefined}
         */
        function removeElementFromIndex (element, name, key) {
            if(typeof self.by[name] === 'object' && typeof self.by[name][key] === 'object' && self.by[name][key]) {
                var idx = self.by[name][key].indexOf(element);
                if(idx > -1) self.by[name][key].splice(idx, 1);
            }
        }

        /**
         * Update the "last updated" time.
         * Anytime there's a change in the index, this *needs* to be called.
         * JSDOMHelpers uses this to clear/update cache.
         * @return {undefined}
         */
        function update () {
            var time = process.hrtime();
            updated = time[0] * 1e9 + time[1];
        }

        /**
         * Determines if the given selector is valid.
         * @param {JSDOMIndex} index The JSDOM instance the element belongs to.
         * @param {String} selector A selector string.
         * @return {Boolean} True if the selector is valid, false otherwise.
         */
        this.validateSelector = function validateSelector (selector) {
            return selector.match(self.regexps.validate);
        };

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
            selector: function (selector) {
                var m, result, tokens, md5;

                if(!selector || !(m = self.validateSelector(selector)))
                    throw new Error('Invalid selector \'' + (selector || '(empty)') + '\'.');

                tokens = selector.trim().split(self.regexps.selector)._.without('', ' ');
                md5    = tokens.join('---');

                if(updated === lastIndexUpdate) {
                    if(cache[md5]) {
                        if(JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.new(selector, md5);
                        cache[md5].called++;

                        if(JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.end(cache[md5].data.length);
                        return cache[md5].data;
                    }
                }
                else {
                    lastIndexUpdate = updated;
                }

                // Get the selector results...
                result = findElementsWithSelector(self, selector, tokens);

                // Remove the LFU (least frequently used) cache line item, from
                // only the the first Math.ceil(JSDOMConstants.MAX_SELECTOR_CACHE * JSDOMConstants.MAX_SELECTOR_MULTIPLIER)
                // of the cache. This will balance the LFU and Oldest cache removal methods.
                if(cache._.size() >= JSDOMConstants.MAX_SELECTOR_CACHE) {
                    var lfu = cache
                        ._.first(Math.ceil(JSDOMConstants.MAX_SELECTOR_CACHE * JSDOMConstants.MAX_SELECTOR_MULTIPLIER))
                        ._.keyOfMin(function (line) {
                            return line.returned;
                        });

                    cache[lfu] = null;
                    delete cache[lfu];
                }

                // Add to cache...
                cache[md5] = { data: makeQueryArray(result._.copy()), called : 0 };
                return makeQueryArray(result);
            }
        };

        /**
         * A mapping of element value properties to a character that will represent the property when using a selector.
         * If null, or non-string the property will not be available to selectors.
         * @type {Object}
         */
        this.map = {
            uid        : JSDOMConstants.UID_SELECTOR_MAP,
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
            var addMap = false;

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
                addMap = true;
            }

            if(!self.by[name]) {
                self.by[name] = {};

                self.with[name] = function (idx) {
                    return self.by[name][idx] ? self.by[name][idx] : [];
                };

                if(addMap) self.map[name] = delimiter;
                update();
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
                update();
            }
            return self;
        };

        /**
         * Empties the element index.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.empty = function () {
            console.log('emptying index');
            self.by._.every(function (val, key) { self.by[key] = {}; });
            update();
            return self;
        };

        /**
         * Adds an element to the index with "named" for key "key".
         * @param {JSDOMElement} element A JSDOM element.
         * @param {String} name The name of the index to add the elemnt to.
         * @param {String} key The key of the index to add the element undex.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.addElementToIndex = function (element, name, key) {
            if(element instanceof JSDOMNode && self.by[name] && (key || key === 0)) {
                if(!self.by[name][key]) self.by[name][key] = [];
                if(self.by[name][key].indexOf(element) === -1) self.by[name][key].push(element);
                update();
            }
            return self;
        };

        /**
         * Removes an element from index with "named" for key "key". If no key is specified,
         * It will remove the element from all keys of index "named".
         * @param {JSDOMElement} element A JSDOM element.
         * @param {String} name The name of the index to add the elemnt to.
         * @param {String} key The key of the index to add the element undex.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.removeElementFromIndex = function (element, name, key) {
            if(element instanceof JSDOMNode && self.by[name]) {
                // No key specified, remove the element from all values of the index with 'name'.
                if(!key && key !== 0) {
                    self.by[name]._.every(function (k) { removeElementFromIndex(element, name, k); });
                }
                // Just remove the element from the specified index value.
                else {
                    removeElementFromIndex(element, name, key);
                }
                update();
            }
            return self;
        };

        /**
         * Removes the element from all custom (user added) indices.
         * @param {JSDOMElement} e The element to remove from the custom indices.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.removeElementFromAllCustomIndices = function (e) {
            self.by._.every(function (index, key) {
                if(JSDOMConstants.LOCKED_INDICES.indexOf(key) === -1) removeElementFromIndex(e, index, key);
            });
            update();
            return self;
        };

        /**
         * Removes the element from all indices...
         * @param {JSDOMElement} e The element to remove from the custom indices.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.removeElementFromAllIndices = function (e) {
            self.by._.every(function (index, key) {
                removeElementFromIndex(e, index, key);
            });
            update();
            return self;
        };

        /**
         * Iterates through the given object, and indexs all of its properties for which
         * indexes exist.
         * @param {Object} o The object to index.
         * @param {JDSOMElement} e The JSDOMElement associated with this object.
         * @return {JSDOMIndex} The current JSDOMIndex instance.
         */
        this.indexAllPropertiesOfObjectForElement = function (o, e) {
            if(o && typeof o === 'object' && e instanceof JSDOMNode) {
                o._.every(function (val, key) {
                    self.addElementToIndex(e, key, val);
                });
            }
            // No need to update, JSDOMIndex#addElementToIndex will call update.
            return self;
        };

        Object.defineProperties(self, {
            /**
             * Returns the regular expressions needed to parse selectors.
             * @type {Object<RegExp>}
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
             * @type {Array<JSDOMElement>}
             */
            all: {
                configurable : false,
                enumerable   : false,
                get          : function getAllElements () { return self.by.uid._.toArray(); }
            },

            /**
             * Retrieves the number of elements in the index.
             * @type {Number}
             */
            count: {
                configurable : false,
                enumerable   : false,
                get          : function getAllElements () { return self.by.uid._.size(); }
            },

            /**
             * A reference to when the last index update was.
             * @type {Number}
             */
            updated: {
                configurable : false,
                enumerable   : false,
                get          : function getUpdates () { return updated; }
            }
        });

        // Set inital "last updated" time.
        update();
    }
    module.exports = JSDOMIndex;
}());
