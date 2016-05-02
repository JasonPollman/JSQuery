/**
 * @file JSDOMTree Class — Creates "js object" trees.
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */


(function () {
    'use strict';
    require('proto-lib').get('_');

    var crypto         = require('crypto'),
        JSDOMIndex     = require('./JSDOMIndex'),
        JSDOMConstants = require('./JSDOMConstants'),
        JSDOMElement   = require('./JSDOMElement');

    /**
     * Gets the hash for the given tree string.
     * @param {String} tree A stringified tree.
     * @return {String} An md5 hash for the given tree string.
     * @throws TypeError
     */
    function getTreeHash (tree) {
        if(!tree || typeof tree !== 'string')
            throw new TypeError('Attempt to get tree hash from non-string value.');

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
    function JSDOMTree (tree, options) {
        // Prevent Function.call or binding...
        if(!(this instanceof JSDOMTree)) return new JSDOMTree(tree, options);

        if(!tree || typeof tree !== 'object')
            throw new TypeError('Cannot create tree with type ' + (tree ? typeof tree : tree) + '.');

        options = typeof options === 'object' ? options : {};

        var propertyDefinitions =  {

            /**
             * Returns a hash based on the JSON string created by the tree.
             * @memberof JSDOM
             * @function
             */
            hash: {
                configurable : false,
                enumerable   : false,

                get: function getHash () {
                    try {
                        return getTreeHash(JSON.stringify(tree, JSDOMConstants.REPLACE_CIRCULAR_PARENTS));
                    }
                    catch (e) {
                        throw new Error('Unable to get tree hash: ' + e.message);
                    }
                }
            },

            /**
             * Returns a copy of all the elements in the tree.
             * @type {Array<JSDOMElement>}
             */
            elements: {
                configurable : false,
                enumerable   : false,
                get          : function getElements () { return index.all(); }
            },

            /**
             * Lookup elements "with" this object.
             * It's properties map to the available index lookup functions.
             * @type {Object<Function>}
             */
            with: {
                configurable : false,
                enumerable   : false,
                get          : function getWith () { return index.with._.copy(); }
            },

            /**
             * This JSDOMTree's JSDOMIndex instance.
             * @type {JSDOMIndex}
             */
            index: {
                configurable : false,
                enumerable   : false,
                get          : function getIndex () { return index; }
            },

            /**
             * The property JSDOMTree used to find elements for each object in the tree.
             * @type {String}
             */
            childKey: {
                configurable : false,
                enumerable   : false,
                get          : function getChildProperty () { return childKey; }
            }
        };

        Object.defineProperties(this, propertyDefinitions);

        /**
         * A self reference.
         * @type {JSDOM}
         */
        var self = this,

        /**
         * The indexer used with this tree instance.
         * @type {JSDOMIndex}
         */
        index = new JSDOMIndex(),

        /**
         * The root element of the tree.
         * @type {JSDOMElement}
         */
        root = new JSDOMElement(self, tree),

        /**
         * The key used to identify child elements.
         * @type {String}
         */
        childKey = 'children';

        // Attempt to parse the tree: make a deep copy, and throw if circular.
        try {
            tree = tree._.clone();
        }
        catch (e) {
            throw new SyntaxError('Cannot create tree: ' + e.message);
        }

        /**
         * Indexs the tree by it's indexable properties.
         * @return {JSDOM} The current JSDOM instance.
         */
        function indexTree (tree, parent, i) {
            i = ++i || 0;
            parent = parent || null;

            if(i === 0) {
                self.empty();
                // Check for alternate syntax... { children: [] } as compared to [{ children: [] }, { children: [] }]
                if(!(tree instanceof Array) && tree.children) tree = tree.children;
            }
            tree._.every(function (elem) {
                // This will ignore all non-object elements...
                if(typeof elem === 'object') {
                    var children = elem[childKey];

                    var e = new JSDOMElement(self, elem);
                    e.parent = (parent instanceof JSDOMElement) ? parent : root;
                    e.level  = e.parent.level + 1;
                    e.parent.addChild(e);

                    var add = e.addChild;
                    e.addChild = function () {
                        add.apply(e, arguments);
                    };

                    // Recursively index the tree with the element's children...
                    if(typeof children === 'object' && children._.size() > 0) indexTree(children, e, i);
                }
            });
            return self;
        }

        /**
         * Adds an element property index from the JSDOMIndex.
         * @return {JSDOMTree} The current JSDOMTree instance.
         */
        this.addIndex = function addIndex () {
            index.addIndex.apply(index, arguments);
            // We must re-index the tree, as we have a new property index
            // that an element could belong to.
            indexTree(tree);
            return self;
        };

        /**
         * Removes an element property index from the JSDOMIndex.
         * @return {JSDOMTree} The current JSDOMTree instance.
         */
        this.removeIndex = function removeIndex () {
            index.removeIndex.apply(index, arguments);
            return self;
        };

        /**
         * Find elements using a predicate on indexed properties.
         * @param {Function} predicate The predicate function to invoke for each element in the index.
         * @return {Array<Object>} The set of elements that pass the predicate function.
         */
        this.where = function where (predicate) {
            return index.all._.where(predicate);
        };

        /**
         * Exports a copy of the tree as an object with the keys "dom" and "hash".
         * The dom is the cloned tree, and hash is the hash for the tree.
         * @return {Object<*>}
         */
        this.export = function export_ () {
            var tree = [], str;
            root.children._.every(function (elem) { tree.push(elem.val()); });
            str = JSON.stringify(tree, null, '    ');

            return {
                obj  : tree,
                json : str,
                hash : getTreeHash(str)
            };
        };

        /**
         * Empties the element set, but saves added indices.
         * @return {JSDOM} The current JSDOM instance.
         */
        this.empty = function empty () {
            index.empty();
            root = new JSDOMElement(self, tree);
            return self;
        };

        /**
         * Sugar for JSDOM#with.selector
         * @param {String} selector The selector to query the tree with.
         * @return {Array<Object>} The elements that match the given selectors.
         */
        this.query = function query (selector) {
            return index.with.selector(selector);
        };

        // Set the child key with the given option.
        if(typeof options.map === 'object') {
            childKey = typeof options.map.children === 'string' ? options.map.children : 'children';
        }

        // Setup initial indices...
        if(options.indices instanceof Array) {
            options.indices._.every(function (index) {
                if(typeof index === 'object' && typeof index.key === 'string') self.addIndex(index.key, index.accessor);
            });
        }

        Object.defineProperties(self.query, propertyDefinitions);
        indexTree(tree);
    }

    /**
     * Creates a new JSDOM from a JSON string.
     * @param {String} data The JSON string to create the JSDOM with.
     * @param {Object=} options Options to create the new JSOM with.
     * @return {JSDOM} The new JSDOM instance.
     * @throws SyntaxError
     */
    JSDOMTree.fromString = function DOMFromString (data, options) {
        try {
            return new JSDOMTree(JSON.parse(data), options).query;
        }
        catch (e) {
            throw new SyntaxError('Cannot parse tree: ' + e.message);
        }
    };

    /**
     * Creates a new JSDOM from a js object.
     * @param {Object} data The js object to create the JSDOM with.
     * @param {Object=} options Options to create the new JSOM with.
     * @return {JSDOM} The new JSDOM instance.
     * @throws SyntaxError
     */
    JSDOMTree.fromObject = function DOMFromObject (data, options) {
        return new JSDOMTree(data, options).query;
    };

    module.exports = JSDOMTree;
}());
