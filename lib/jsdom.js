'use strict';
require('proto-lib').get('_');
var crypto = require('crypto');

    /**
     * Characters that aren't allow to be used as selector types.
     * @type {RegExp}
     */
var INVALID_SELECTOR_CHARACTERS = '[a-zA-Z0-9 \\-{}\\[\\]=~<>!$?\'"*]',

    /**
     * The "wildcard" characters.
     * @type {String}
     */
    WILDCARDS = '(?:\\*|>|<)',

    /**
     * A regular expression string that defines the syntax of the variables within brackets (i.e. [x=5]).
     * @type {String}
     */
    VARIABLES = '(?:[a-zA-Z$_](?:[a-zA-Z0-9$_\\.:])*)',

    /**
     * The characters allowed to be a the first character of a term.
     * @type {String}
     */
    TERM_FIRST_CHAR = 'a-zA-Z_$',

    /**
     * A regular expression string that defines the "terms" or the string part of a select (i.e. #term, without the #)
     * @type {String}
     */
    TERMS = '(?:[' + TERM_FIRST_CHAR + '](?:[a-zA-Z0-9$_\\.:\\-])*|\\{.+?})',

    /**
     * The operators allowed to be used within bracket filters.
     * @type {String}
     */
    OPERATORS = '(?: *= *| *~ *| *?= *| *?! *| *> *| *< *| *>= *| *<= *| *!= *| *!~ *)',

    /**
     * The value portion of a bracket filter.
     * @type {String}
     */
    VALUES = '(?:["](?:[\\s|\\S]*?)["]|[\'](?:[\\s|\\S]*?)[\']|-*\\d+(?:\\.\\d+)?|true|false|null)',

    /**
     * The contents allowed within brackets.
     * @type {String}
     */
    ALLOWED_IN_BRACKETS = VARIABLES + OPERATORS + VALUES,

    /**
     * RegExp used to split brackets into their various parts.
     * @type {RegExp}
     */
    BRACKET_DISSECTOR = new RegExp('\\[(' + VARIABLES + ')(' + OPERATORS + ')(' + VALUES + ')\\]', 'g'),

    /**
     * Properties that cannot be "un-indexed".
     * @type {Array<String>}
     */
    LOCKED_PROPERTIES = ['id', 'level', 'delta', 'selector'],

    /**
     * Replaces circular parent references with the parent's id.
     * Passed as an argument to JSON.stringify.
     */
    REPLACE_CIRCULAR_PARENTS = function (key, value) {
        if(key === 'parent' && value && typeof value === 'object') return value.id;
        return value;
    };

/**
 *
 * @param {JSDOM} set Filters the element set by the "nth" property.
 * @param {Array<Object>} elems The array of elements to filter.
 * @param {Object} nth The "nth" object from the parsed selector.
 * @return {Array<Object>} The element set filtered by the selctor's nth value.
 */
function filterByNth (elems, nth) {
    if(!nth || typeof nth !== 'object') return elems;
    var n = nth.value;

    if(typeof n === 'string') {
        n = n.toLowerCase();

        if      (n === 'last')   { n = elems.length; }
        else if (n === 'first')  { n = 0; }
        else if (n === 'middle') { n = Math.ceil(elems.length / 2) - 1; }
    }

    switch(nth.operator) {
        case '>'  : return elems.slice(n + 1, elems.length);
        case '<'  : return elems.slice(0, n);
        case '>=' : return elems.slice(n, elems.length);
        case '<=' : return elems.slice(0, n + 1);
        case '!=' : // Not equal and not like operate the same in this case...
        case '!~' : return elems._.whereKeys(function (k) { return k != n; }); // jshint ignore:line
        default   : return elems[n] ? [elems[n]] : [];
    }
}

/**
 * Filters the given element set by the given parent. If an element in the set doesn't have *parent* as its parent, it
 * will be removed.
 * @param {Array<Object>} elements The set of elements to filter.
 * @param {Object} parent The parent element.
 * @param {Array<Object>} filtered The filtered elements (for recursion only).
 * @return {Array<Object>} A new array of elements, filtered by the parent object.
 */
function filterByDescendants (elements, parent, filtered) {
    if(typeof parent !== 'object') return elements;
    filtered = filtered || [];

    elements._.every(function (e) {
        if(e.parent.id === parent.id) filtered.push(e);
    });

    if(typeof parent === 'object')
        parent.children._.every(function (child) { filterByDescendants(elements, child, filtered); });

    return filtered;
}

/**
 * Filters the given set of elements by the given set of attributes.
 * @param {Array<Object>} elements The set of elements to filter.
 * @param {Object<Object>} attributes The set of properties to filter.
 * @return {Array<Object>} A new array of elements, filtered by attributes.
 */
function filterByAttributes (elements, attributes) {
    if(attributes._.size() < 1) return elements;
    var filtered = [];

    elements._.every(function (e) {
        var valid = attributes._.every(function (filters, property) {
            return filters._.every(function (filter) {
                var value = e[property], regex;

                if(typeof filter.value === 'string' && filter.value.indexOf('.') > -1)
                    value = e._.findChildAtPath(filter.value);

                switch(filter.operator) {
                    case '=' : if(value != filter.value) valid = false; break; // jshint ignore:line
                    case '!=': if(value == filter.value) valid = false; break; // jshint ignore:line

                    case '<' : if(parseFloat(value) >= parseFloat(filter.value)) valid = false; break;
                    case '>' : if(parseFloat(value) <= parseFloat(filter.value)) valid = false; break;
                    case '<=': if(parseFloat(value) >  parseFloat(filter.value)) valid = false; break;
                    case '>=': if(parseFloat(value) <  parseFloat(filter.value)) valid = false; break;

                    case '?=':
                        if(value instanceof Array) {
                            if(value.indexOf(filter.value) === -1) valid = false;
                        }
                        else if(value && typeof value === 'object') {
                            if(!value[filter.value]) valid = false;
                        }
                        else {
                            valid = false;
                        }
                        break;

                    case '?!':
                        if(value instanceof Array) {
                            if(value.indexOf(filter.value) !== -1) valid = false;
                        }
                        else if(value && typeof value === 'object') {
                            if(value[filter.value]) valid = false;
                        }
                        else {
                            valid = false;
                        }
                        break;

                    case '~':
                        try {
                            regex = new RegExp(filter.value);
                            if(typeof value !== 'string' || (value && regex.test(value.trim()) === false)) valid = false;
                        }
                        catch (err) {
                            valid = false;
                        }
                        break;

                    case '!~':
                        try {
                            regex = new RegExp(filter.value);
                            if(value && regex.test(value.trim()) === true) valid = false;
                        }
                        catch (err) {
                            valid = false;
                        }
                        break;
                }
                // Break every loop if we failed a filter...
                if(!valid) return false;
            });
        });
        // Element has passed all filters...
        if(valid === true) filtered.push(e);
    });
    return filtered;
}

/**
 * Gets the set of children elements of the given element.
 * @param {Object} e The element to get the children from.
 * @param {JSDOM} set The JSDOM object the element belongs to.
 * @return {Array<Object>} The children of the element e.
 */
function getChildrenOf (e) {
    if(e && typeof e === 'object' && typeof e.children === 'object')
        return e.children._.toArray();

    return [];
}

/**
 * Walks the parsed selector object by "paths", or the tokenized selector split by spaces.
 * @param {JSDOM} jsdom The JSDOM instance to find elements from.
 * @param {Object} parsed The parsed selector.
 * @param {Object=} parent The parent object of the current element set (for recursion only)
 * @return {Array<Object>} The set of elements matching the given parsed selector.
 */
function filterByParsedSelector (jsdom, parsed, parent) {
    if(!(jsdom instanceof JSDOM))
        throw new Error('JSDOM~filterByParsedSelector expected argument #0 (set) to be an instance of JSDOM.');

        // The level of the current element.
    var level = typeof parent === 'object' ? parent.level + 1 : 0,
        // The final set of elements found using the given selector
        result = [],
        // The current "path" (or selector in a selector string).
        current = parsed.shift(),
        // The nth property from the current path
        nth = current.nth,
        // The current term (e.g. selector type and identifier).
        term = current.terms[0],
        // An intermediate set of elements.
        elems = [],
        // An intermediate set of filtered elements.
        filtered;

        if((term.type !== 'wildcard' && term.type !== 'ascendant' && term.type !== 'descendant') || parsed._.size() !== 0) {

            if(term.type === 'wildcard') {
                elems = jsdom.by.delta[level];
                if(!elems || elems.length === 0) return [];
                filtered = filterByNth(filterByDescendants(filterByAttributes(elems, current.filters), parent), nth);
            }
            else if(term.type === 'descendant') {
                filtered = filterByNth(filterByAttributes(level === 0 ? jsdom.by.level[0] : getChildrenOf(parent), current.filters), nth);
            }
            else if(term.type === 'ascendant') {
                filtered = filterByNth(filterByAttributes(parent ? [parent] : [], current.filters), nth);
            }
            else {
                elems = jsdom.with[term.type](term.value);
                if(elems.length === 0) return [];

                if(current.terms.length > 1) {
                    var nextSet, newSet = [];

                    current.terms._.each(1, function (nextTerm) {
                        nextSet = jsdom.with[nextTerm.type](nextTerm.value);
                        elems._.every(function (e) {
                            if(nextSet.indexOf(e) !== -1) newSet.push(e);
                        });
                    });
                    elems = newSet;
                }
            }

            filtered = filterByNth(filterByDescendants(filterByAttributes(elems, current.filters), parent), nth);

            if(parsed.length === 0) {
                result = filtered;
            }
            else {
                filtered._.every(function (e) {
                    result = typeof parsed[0] === 'object' && parsed[0].terms[0].type === 'ascendant' ?
                    result.concat(filterByParsedSelector(jsdom, parsed._.clone(), jsdom.with.id(e.parent.id)[0])) :
                    result.concat(filterByParsedSelector(jsdom, parsed._.clone(), e));
                });
            }
        }
        else if(term.type === 'wildcard') {
            return jsdom.with.delta(level) ?
                filterByNth(filterByDescendants(filterByAttributes(jsdom.with.delta(level), current.filters), parent), nth) : [];
        }
        else if(term.type === 'descendant') {
            return filterByNth(filterByAttributes(level === 0 ? jsdom.with.level(0) : getChildrenOf(parent), current.filters), nth);
        }
        else if(term.type === 'ascendant') {
            return filterByNth(filterByAttributes(parent ? [parent] : [], current.filters), nth);
        }
        return result._.unique();
}

/**
 * Determines if the given selector is valid.
 * @param {JSDOM} jsdom The JSDOM instance the element belongs to.
 * @param {String} selector A selector string.
 * @return {Boolean} True if the selector is valid, false otherwise.
 */
function validateSelector (jsdom, selector) {
    return selector.match(jsdom.regexps.validate);
}

/**
 * Finds the elements that match the given selector.
 * @param {JSDOM} jsdom The JSDOM instance to find elements from.
 * @param {String} selector The selector used to find matching elements.
 * @return {Array<Object>} The set of matching elements, or an empty array if no matches were found.
 */
function findElementsWithSelector(jsdom, selector) {
    var regexps = jsdom.regexps;

    if(!(jsdom instanceof JSDOM))
        throw new Error('JSDOM~findElementsBySelector expected argument #0 (set) to be an instance of JSDOM.');

    if(typeof selector === 'string' && (m = selector.match(regexps.validateTerm)))
            throw new Error('Invalid selector type \'' + m[1] + '\'.');

    if(!selector || !(m = validateSelector(jsdom, selector)))
        throw new Error('Invalid selector \'' + (selector || '(empty)') + '\'.');

    var tokens = selector.split(regexps.selector)._.without('', ' '),
        paths  = [], m;

    tokens._.each(function (token) {
        token = token.trim();
        var noAttributes = token.replace(/(\[.*\])$/g, ''),
            filters      = {},
            nth          = null;

        // Dissect all the bracket attributes from the selector token
        while(m = BRACKET_DISSECTOR.exec(token)) { // jshint ignore:line
            if(m.length > 3) {
                var value = m[3]
                        .replace(/^'(.*)'$/, '$1')
                        .replace(/^"(.*)"$/, '$1')
                        ._.toJSValue(),

                    operator = m[2],
                    variable = m[1];

                if(variable === 'nth') {
                    nth = { operator: operator, value: value };
                }
                else {
                    if(!filters[variable]) filters[variable] = [];
                    filters[variable].push({ operator: operator, value: value });
                }
            }
        }

        var terms = noAttributes.match(regexps.properties);
        terms._.each(function (term, key) {
            term = term.replace(/\{ *([\s\S]+?) *}/g, '$1').trim();
            terms[key] = {
                value : term.length === 1 ? term : term.substr(1, term.length),
                type  : jsdom.map._.invert()[term[0]],
            };
        });

        paths.push({ terms: terms, nth: nth, filters: filters });
    });
    return filterByParsedSelector(jsdom, paths);
}

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

function JSDOM (tree, options) {
    // Prevent Function.call or binding...
    if(!(this instanceof JSDOM)) return new JSDOM(tree, options);

    if(!tree || typeof tree !== 'object')
        throw new TypeError('Cannot create tree with type ' + (tree ? typeof tree : tree) + '.');

    options = typeof options === 'object' ? options : {};

    /**
     * A self reference.
     * @type {JSDOM}
     */
    var self = this,

    /**
     * Stores the elements by "something".
     * This is the default (and locked) set of indexable properties.
     * @type {Object}
     */
    _by = { id: {}, selector: {}, level: {}, delta: {} },

    /**
     * Getter functions to retrieve elements "by" some property.
     * @type {Object}
     */
    _with = {
        // The "depth-first" level of the element in the tree
        id: function (n) {
            return _by.id[n] ? _by.id[n] : [];
        },

        // The "depth-first" level of the element in the tree
        level: function (n) {
            return _by.level[n] ? _by.level[n] : [];
        },

        // An element is in all delta for which it's level is <= to.
        // For example, if an element has a level 1, it will be in the deltas of 0 and 1,
        // If an element has a level 2, it will be in the deltas of 0, 1, and 2.
        // Used for the selector wildcard (*) opeerator.
        // Note: all elements are in delta 0.
        delta: function(n) {
            return _by.delta[n] ? _by.delta[n] : [];
        },

        // The "depth-first" level of the element in the tree
        selector: function (s) {
            return findElementsWithSelector(self, s);
        }
    },

    /**
     * A mapping of object properties to a character that will represent the property when using a selector.
     * If null, or non-string the property will not be available to selectors.
     * @type {Object}
     */
    _map = {
        id         : '#',
        wildcard   : '*',
        descendant : '>',
        ascendant  : '<',
        selector   : null,
        delta      : null,
        level      : null
    },

    /**
     * Copy of the _with object, for exposing publicly.
     * This will be updated when new indices are added/removed.
     * @type {Object}
     */
    withCopy = _with._.copy(),

    /**
     * Copy of the _map object, for exposing publicly.
     * This will be updated when new indices are added/removed.
     * @type {Object}
     */
    mapCopy  = _map._.copy(),

    /**
     * All of the elements in the tree.
     * @type {Array<Object>}
     */
    _elements = [],

    /**
     * The DOM tree.
     * @type {Object}
     */
    _tree = {};

    // Attempt to parse the tree.
    // Make a deep copy, and throw if circular.
    try {
        _tree = tree._.clone();
    }
    catch (e) {
        throw new SyntaxError('Cannot create tree: ' + e.message);
    }

    Object.defineProperties(this, {

        /**
         * Returns the regular expressions needed to parse selectors.
         * @memberof JSDOM
         * @function
         */
        regexps: {
            configurable : false,
            enumerable   : false,
            get          : function getRegularExpressions () {
                var types = '', selector;
                _map._.each(m => {
                    if(typeof m === 'string') types += m._.regexpSafe();
                });

                selector = '(?:(?:(?:[' + types + ']' + TERMS + ')*|' + WILDCARDS + ')(?:\\[' + ALLOWED_IN_BRACKETS + '\\])*)';

                return {
                    types        : new RegExp('([' + types + '])', 'g'),
                    validateTerm : new RegExp('(?:^| +)([^' + types + '])'),
                    selector     : new RegExp('(' + selector + ')', 'g'),
                    validate     : new RegExp('(^ *' + selector + '(?: ' + selector + ')*)' + ' *$', 'g'),
                    properties   : new RegExp('([' + types + ']' + TERMS + '|' + WILDCARDS + ')', 'g')
                };
            }
        },

        /**
         * Returns a hash based on the JSON string created by the tree.
         * @memberof JSDOM
         * @function
         */
        hash: {
            configurable : false,
            enumerable   : false,

            get: function () {
                try {
                    return getTreeHash(JSON.stringify(_tree, REPLACE_CIRCULAR_PARENTS));
                }
                catch (e) {
                    throw new Error('Unable to get tree hash: ' + e.message);
                }
            }
        },

        /**
         * Returns a copy of all the elements in the tree.
         * @memberof JSDOM
         * @function
         */
        elements: {
            configurable : false,
            enumerable   : false,

            get: function getElements () {
                var data;
                try {
                    data = _elements._.clone(REPLACE_CIRCULAR_PARENTS);
                }
                catch (e) {
                    throw new Error('Unable to get elements: ' + e.message);
                }
                return data;
            }
        },

        with: {
            configurable : false,
            enumerable   : false,
            get          : function with_ () { return withCopy; }
        },

        map: {
            configurable : false,
            enumerable   : false,
            get          : function map () { return mapCopy; }
        }
    });

    /**
     * Find elements using a predicate on indexed properties.
     * @param {Function} predicate The predicate function to invoke for each element in the index.
     * @return {Array<Object>} The set of elements that pass the predicate function.
     */
    this.where = function (predicate) {
        return _elements._.where(predicate);
    };

    /**
     * Exports a copy of the tree as an object with the keys "dom" and "hash".
     * The dom is the cloned tree, and hash is the hash for the tree.
     * @return {Object<*>}
     */
    this.export = function () {
        var tree = _tree._.clone(REPLACE_CIRCULAR_PARENTS);
        return {
            dom  : tree,
            hash : getTreeHash(tree)
        };
    };

    /**
     * Indexs the tree by it's indexable properties.
     * @param {Object} tree The tree to index within this JSDOM instance.
     * @return {JSDOM} The current JSDOM instance.
     */
    this.index = function (tree, parent, i) {
        i = ++i || 0;
        parent = parent || null;

        if(i === 0) self.empty();
        (tree || _tree)._.every(function (e) {
            e.id       = (e.id || e.id === 0) ? e.id : e._.uniqueId();
            e.parent   = parent;
            e.level    = typeof e.parent === 'object' && e.parent ? parent.level + 1 : 0;
            e.children = typeof e.children === 'object' && e.children ? e.children : [];

            self.add(e);
            if(e.children._.size() > 0) self.index(e.children, e, i);
        });
        return self;
    };

    /**
     * Empties the element set.
     * @return {JSDOM} The current JSDOM instance.
     */
    this.empty = function () {
        _by._.each(function (property) { property = {}; });
        _elements = [];
        return self;
    };

    /**
     * Adds an indexable property to the element set (i.e. allows you to search the set with the given property).
     * @param {String} name The name of the property to index by.
     * @param {String} delimiter The character to map the property to when using a selector.
     * @throws Error
     * @return {JSDOM} The current JSDOM instance.
     */
    this.addIndex = function (name, delimiter) {
        // Check that we have a valid property name
        if(typeof name !== 'string')
            throw new Error('JSDOM#addIndex expected argument #0 (name) to be a string, but got: ' + typeof name + '.');

        // Check that we have a valid property name
        if(delimiter && typeof delimiter !== 'string')
            throw new Error('JSDOM#addIndex expected argument #1 (map) to be a string, but got: ' + typeof delimiter  + '.');

        if(delimiter && typeof delimiter === 'string') {
            // Check that the delimiter is a single character
            if(delimiter.length > 1)
                throw new Error('JSDOM#addIndex expected argument #1 (map) to be a string of length 1, but it\'s length is: ' + delimiter.length + '.');

            // Check that the delimiter is a valid chacter
            if(new RegExp(INVALID_SELECTOR_CHARACTERS).test(delimiter))
                throw new Error('Selector delimiter \'' + delimiter + '\' is invalid; cannot match /' + INVALID_SELECTOR_CHARACTERS + '/g');

            // Check that the propety isn't being used by another delimiter
            if(_map[name])
                throw new Error('Property index \'' + name + '\' cannot be overwritten, currently in use by delimiter \'' + _map[name] + '\'.');

            // Check that the delimiter isn't already in use.
            if(_map._.invert()[delimiter]) {
                throw new Error('Selector delimiter (\'' + delimiter + '\') is already in use by another property.');
            }

            _map[name] = delimiter;
        }

        if(!_by[name]) {
            _by[name] = {};

            _with[name] = function (idx) {
                return _by[name][idx] ? _by[name][idx] : [];
            };

            mapCopy  = _map._.copy();
            withCopy = _with._.copy();
        }
        return self;
    };

    /**
     * Removes an indexable property from the element set.
     * @param {String} name The name of the property remove.
     * @return {JSDOM} The current JSDOM instance.
     */
    this.removeIndex = function (name) {
        if(typeof name === 'string' && LOCKED_PROPERTIES.indexOf(name) === -1) {
            if(_by[name])   delete _by[name];
            if(_with[name]) delete _with[name];

            delete _map[name];

            mapCopy  = _map._.copy();
            withCopy = _with._.copy();
        }
        return self;
    };

    /**
     * Sugar for JSDOM#with.selector
     * @param {String} selector The selector to query the tree with.
     * @return {Array<Object>} The elements that match the given selectors.
     */
    this.query = function (selector) {
        return _with.selector(selector);
    };

    /**
     * Add elements to the JSDOM.
     * @param {...Object} elements The element to add.
     * @return {JSDOM} The current JSDOM instance.
     */
    this.add = function () {
        arguments._.every(function (e) {
            if(e && e._.isPureObject() && _elements.indexOf(e) === -1) {
                _elements.push(e);

                e._.every(function (val, key) {
                    if(_by[key]) {
                        if(!_by[key][val]) _by[key][val] = [];
                        _by[key][val].push(e);
                    }
                });

                for(var i = 0; i <= e.level; i++) {
                    if(!_by.delta[i]) _by.delta[i] = [];
                    if(_by.delta[i].indexOf(e) === -1) _by.delta[i].push(e);
                }
            }
        });
        return self;
    };

    /**
     * Removes elements from the JSDOM.
     * @param {...Object} elements The element to remove.
     * @return {JSDOM} The current JSDOM instance.
     */
    this.remove = function () {
        arguments._.every(function (e) {
            if(e && e._.isPureObject() && _elements.indexOf(e) > -1) {
                var idx  = _elements.indexOf(e);
                if(idx > -1) _elements.splice(idx, 1);

                e._.every(function (val, key) {
                    if(typeof _by[key] === 'object' && _by[key][val] instanceof Array) {
                        var idx = _by[key][val].indexOf(e);
                        if(idx > -1) _by[key][val].splice(idx, 1);
                    }
                });
            }
        });
        return self;
    };

    self.index();
}

/**
 * Creates a new JSDOM from a JSON string.
 * @param {String} data The JSON string to create the JSDOM with.
 * @param {Object=} options Options to create the new JSOM with.
 * @return {JSDOM} The new JSDOM instance.
 * @throws SyntaxError
 */
JSDOM.fromString = function DOMFromString (data, options) {
    try {
        return new JSDOM(JSON.parse(data), options);
    }
    catch (e) {
        throw new SyntaxError(`Cannot parse tree: ${ e.message }`);
    }
};

module.exports = JSDOM;
