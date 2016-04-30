'use strict';
var lib = require('proto-lib').get('_');

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
     * A regular expression string that defines the "terms" or the string part of a select (i.e. #term, without the #)
     * @type {String}
     */
    TERMS = '(?:[\\w:\\-]+|\\{.+?})',

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
    BRACKET_DISSECTOR = new RegExp('\\[(' + VARIABLES + ')(' + OPERATORS + ')(' + VALUES + ')\\]', 'g');

/**
 *
 * @param {ElementIndexer} set Filters the element set by the "nth" property.
 * @param {Array<Object>} elems The array of elements to filter.
 * @param {Object} nth The "nth" object from the parsed selector.
 * @return {Array<Object>} The filtered element set
 */
function filterByNth (elems, nth) {
    if(!nth || typeof nth !== 'object') return elems;
    var value = nth.value;

    if(typeof nth === 'string') {
        if(nth.value.toLowerCase() === 'last') {
            value = elems.length;
        }
        else if(nth.value.toLowerCase() === 'first') {
            value = 0;
        }
        else if(nth.value.toLowerCase() === 'middle') {
            value = Math.ceil(elems.length / 2) - 1;
        }
    }

    switch(nth.operator) {
        case '>'  : return elems.slice(value + 1, elems.length);
        case '<'  : return elems.slice(0, value);
        case '>=' : return elems.slice(value, elems.length);
        case '<=' : return elems.slice(0, value + 1);
        case '!=' :
        case '!~' : return elems._.whereKeys((k) => { return k != value; }); // jshint ignore:line
        default   : return [elems[value]] || [];
    }
}

function filterByDescendants (elements, parent, filtered) {
    if(typeof parent !== 'object') return elements;
    filtered = filtered || [];

    elements._.every(e => {
        if(e.parent.id === parent.id) filtered.push(e);
    });

    if(typeof parent === 'object')
        parent.children._.every(child => { filterByDescendants(elements, child, filtered); });

    return filtered;
}

function applyFilters (elements, filtersByProperty) {
    if(filtersByProperty._.size() < 1) return elements;
    var filtered = [];

    elements._.every(e => {
        var valid = true;

        filtersByProperty._.every((filters, property) => {
            filters._.every((filter) => {
                var value = e[property], regex;

                if(typeof filter.value === 'string' && filter.value.indexOf('.') > -1)
                    value = e._.findChildAtPath(filter.value);

                switch(filter.operator) {
                    case '=':
                        if(value != filter.value) valid = false; // jshint ignore:line
                        break;

                    case '!=':
                        if(value == filter.value) valid = false; // jshint ignore:line
                        break;

                    case '<':
                        if(parseFloat(value) >= parseFloat(filter.value)) valid = false;
                        break;

                    case '>':
                        if(parseFloat(value) <= parseFloat(filter.value)) valid = false;
                        break;

                    case '<=':
                        if(parseFloat(value) > parseFloat(filter.value)) valid = false;
                        break;

                    case '>=':
                        if(parseFloat(value) < parseFloat(filter.value)) valid = false;
                        break;

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
                            if(!value || (value && regex.test(value.trim()) === false)) valid = false;
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
            });
        });

        if(valid === true) filtered.push(e);
    });
    return filtered;
}

/**
 * Gets the children of the given element.
 * @param {Object} e The element to get the children from.
 * @param {ElementIndexer} set The ElementIndexer object the element belongs to.
 * @return {Array<Object>} The children of the element e.
 */
function getChildrenOf(e) {
    if(e && typeof e === 'object' && typeof typeof e.children === 'object')
        return e.children._.toArray();

    return [];
}

function walkSelectorPaths (set, parsed, parent) {
    if(!(set instanceof ElementIndexer))
        throw new Error('ElementIndexer~walkDOM expected argument #0 (set) to be an instance of ElementIndexer.');

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
                elems = set.by.delta[level];
                if(!elems || elems.length === 0) return [];
                filtered = filterByNth(filterByDescendants(applyFilters(elems, current.filters), parent), nth);
            }
            else if(term.type === 'descendant') {
                filtered = filterByNth(applyFilters(level === 0 ? set.by.level[0] : getChildrenOf(parent), current.filters), nth);
            }
            else if(term.type === 'ascendant') {
                filtered = filterByNth(applyFilters(parent ? [parent] : [], current.filters), nth);
            }
            else {
                elems = set.with[term.type](term.value);
                if(elems.length === 0) return [];

                if(current.terms.length > 1) {
                    var nextSet, newSet = [];

                    current.terms._.each(1, nextTerm => {
                        nextSet = set.with[nextTerm.type](nextTerm.value);
                        elems._.every((e) => {
                            if(nextSet.indexOf(e) !== -1) newSet.push(e);
                        });
                    });
                    elems = newSet;
                }
            }

            filtered = filterByNth(filterByDescendants(applyFilters(elems, current.filters), parent), nth);

            if(parsed.length === 0) {
                result = filtered;
            }
            else {
                filtered._.every(function (e) {
                    result = typeof parsed[0] === 'object' && parsed[0].terms[0].type === 'ascendant' ?
                    result.concat(walkSelectorPaths(set, parsed._.clone(), set.with.id(e.parent.id)[0])) :
                    result.concat(walkSelectorPaths(set, parsed._.clone(), e));
                });
            }
        }
        else if(term.type === 'wildcard') {
            return set.by.delta[level] ?
                filterByNth(filterByDescendants(applyFilters(set.by.delta[level], current.filters), parent), nth) : [];
        }
        else if(term.type === 'descendant') {
            return filterByNth(applyFilters(level === 0 ? set.by.level[0] : getChildrenOf(parent), current.filters), nth);
        }
        else if(term.type === 'ascendant') {
            return filterByNth(applyFilters(parent ? [parent] : [], current.filters), nth);
        }

        return result._.makeUnique();
}

/**
 * Determines if the given selector is valid.
 * @param {ElementIndexer} set The ElementIndexer the element belongs to.
 * @param {String} s A selector string.
 * @return {Boolean} True if the selector is valid, false otherwise.
 */
function validateSelector (set, s) {
    return s.match(set.regexps.validate);
}

/**
 * Finds the elemets that match the given selector.
 * @param {ElementIndexer} set An ElementIndexer instance.
 * @param {String} s The selector used to find matching elements.
 * @return {Array<Object>} The set of matching elements.
 */
function findElementsWithSelector(set, s) {
    var m;

    if(!(set instanceof ElementIndexer))
        throw new Error('ElementIndexer.findElementsBySelector expected argument #0 (set) to be an instance of ElementIndexer.');

    if(!s || !(m = validateSelector(set, s)))
        throw new Error(`ElementIndexer.findElementsBySelector: Invalid selector '${ s || '(empty)' }'.`);

    var tokens = s.split(set.regexps.selector)._.without('', ' '),
        paths  = [];

    tokens._.each(token => {
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

        var terms = noAttributes.match(set.regexps.properties);
        terms._.each((term, key) => {
            term = term.replace(/\{ *([\s\S]+?) *}/g, '$1').trim();
            terms[key] = {
                value : term.length === 1 ? term : term.substr(1, term.length),
                type  : set.map._.invert()[term[0]],
            };
        });

        paths.push({
            terms   : terms,
            nth     : nth,
            filters : filters
        });
    });

    return walkSelectorPaths(set, paths) || [];
}

class ElementIndexer {
    constructor (options) {
        options = typeof options === 'object' ? options : {};

        /**
         * The current set of elements.
         * @type {Array<Element>}
         */
        this.elements = [];

        /**
         * Stores the elements by "something".
         * This is the default (and locked) set of indexable properties.
         * @type {Object}
         */
        this.by = { id: {}, selector: {}, level: {}, delta: {} };

        /**
         * Getter functions to retrieve elements "by" some property.
         * @type {Object}
         */
        this.with = {
            // The "depth-first" level of the element in the tree
            id: n => {
                return this.by.id[n] ? this.by.id[n] : [];
            },

            // The "depth-first" level of the element in the tree
            selector: s => {
                return findElementsWithSelector(this, s);
            },

            // The "depth-first" level of the element in the tree
            level: n => {
                return this.by.level[n] ? this.by.level[n] : [];
            },

            // The "breadth-first" level of the element in the tree
            delta: n => {
                return this.by.delta[n] ? this.by.delta[n] : [];
            }
        };

        /**
         * Properties that are "locked", meaning calls to removeIndex will (silently) fail to remove them.
         * @type {Array<String>}
         */
        this.locked = Object.freeze(['id', 'level', 'delta', 'selector']);

        /**
         * A mapping of properties to a character that will represent that property when using a selector.
         * If null, the property will not be available when using a selector.
         * @type {Object}
         */
        this.map = {
            id         : '#',
            wildcard   : '*',
            descendant : '>',
            ascendant  : '<',
            selector   : null,
            delta      : null,
            level      : null
        };
    }

    /**
     * Returns various regular expressions for the current ElementIndexer.
     * Uses the current values of ElementIndexer#map, to allow the DOM to use added property indexes.
     * @return {Object<RegExp>}
     */
    get regexps () {
        var types = '', selector;

        this.map._.each(m => {
            if(typeof m === 'string') types += m._.regexpSafe();
        });

        types    = '[' + types + ']';
        selector = '(?:(?:(?:' + types + TERMS + ')*|' + WILDCARDS + ')(?:\\[' + ALLOWED_IN_BRACKETS + '\\])*)';

        return {
            selector   : new RegExp('(' + selector + ')', 'g'),
            validate   : new RegExp('(^ *' + selector + '(?: ' + selector + ')*)' + ' *$', 'g'),
            properties : new RegExp('(' + types +  TERMS + '|' + WILDCARDS + ')', 'g')
        };
    }

    /**
     * Empties the element set.
     * @return {ElementIndexer} The current ElementIndexer instance.
     */
    empty () {
        this.by._.each(property => { property = {}; });
        this.elements = [];
        return this;
    }

    /**
     * Returns a shallow copy of all the elements in the element set
     * @return {Array<Element>}
     */
    getElements () {
        return this.elements._.copy();
    }

    /**
     * Adds an indexable property to the element set (i.e. allows you to search the set with the given property).
     * @param {String} name The name of the property to index by.
     * @param {String} delimiter The character to map the property to when using a selector.
     * @throws Error
     * @return {ElementIndexer} The current ElementIndexer instance.
     */
    addIndex (name, delimiter) {

        // Check that we have a valid property name
        if(typeof name !== 'string')
            throw new Error(`ElementIndexer#addIndex expected argument #0 (name) to be a string, but got: ${ typeof name }.`);

        // Check that we have a valid property name
        if(delimiter && typeof delimiter !== 'string')
            throw new Error(`ElementIndexer#addIndex expected argument #1 (map) to be a string, but got: ${ typeof delimiter }.`);

        if(delimiter && typeof delimiter === 'string') {
            // Check that the delimiter is a single character
            if(delimiter.length > 1)
                throw new Error(`ElementIndexer#addIndex expected argument #1 (map) to be a string of length 1, but it's length is: ${ delimiter.length }`);

            // Check that the delimiter is a valid chacter
            if(new RegExp(INVALID_SELECTOR_CHARACTERS).test(delimiter))
                throw new Error(`Selector delimiter '${ delimiter }' is invalid; cannot match /${ INVALID_SELECTOR_CHARACTERS }/g`);

            // Check that the propety isn't being used by another delimiter
            if(this.map[name])
                throw new Error(`Property index '${ name }' cannot be overwritten, currently in use by delimiter '${ this.map[name] }'.`);

            // Check that the delimiter isn't already in use.
            if(this.map._.invert()[delimiter]) {
                throw new Error(`Selector delimiter ('${ delimiter }') is already in use by another property.`);
            }

            this.map[name] = delimiter;
        }

        if(!this.by[name]) {
            this.by[name] = {};
            this.with[name] = idx => {
                return this.by[name][idx] ? this.by[name][idx] : [];
            };
        }
        return this;
    }

    /**
     * Removes an indexable property from the element set.
     * @param {String} name The name of the property remove.
     * @return {ElementIndexer} The current ElementIndexer instance.
     */
    removeIndex (name) {
        if(typeof name === 'string' && this.locked.indexOf(name) === -1) {
            if(this.by[name])   delete this.by[name];
            if(this.with[name]) delete this.with[name];
            delete this.map[name];
        }
        return this;
    }

    /**
     * Add elements to the ElementIndexer.
     * @param {...Object} elements The element to add.
     * @return {ElementIndexer} The current ElementIndexer instance.
     */
    add () {
        arguments._.every((e) => {
            if(e && e._.isPureObject() && this.elements.indexOf(e) === -1) {
                this.elements.push(e);

                e._.every((val, key) => {
                    if(this.by[key]) {
                        if(!this.by[key][val]) this.by[key][val] = [];
                        this.by[key][val].push(e);
                    }
                });

                for(var i = 0; i <= e.level; i++) {
                    if(!this.by.delta[i]) this.by.delta[i] = [];
                    if(this.by.delta[i].indexOf(e) === -1) this.by.delta[i].push(e);
                }
            }
        });
        return this;
    }

    /**
     * Removes elements from the ElementIndexer.
     * @param {...Object} elements The element to remove.
     * @return {ElementIndexer} The current ElementIndexer instance.
     */
    remove () {
        arguments._.every(e => {
            if(e && e._.isPureObject() && this.elements.indexOf(e) > -1) {
                var idx  = this.elements.indexOf(e);

                if(idx > -1) this.elements.splice(idx, 1);

                e._.every((val, key) => {
                    if(typeof this.by[key] === 'object' && this.by[key][val] instanceof Array) {
                        var idx = this.by[key][val].indexOf(e);
                        if(idx > -1) this.by[key][val].splice(idx, 1);
                    }
                });
            }
        });
        return this;
    }
}

module.exports = ElementIndexer;
