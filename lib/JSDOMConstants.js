/**
 * @file JSDOMConstants — Constants used throughout the jsQuery module.
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */


(function () {
    'use strict';
    /**
     * Characters that aren't allow to be used as selector types.
     * @type {RegExp}
     */
    exports.INVALID_SELECTOR_CHARACTERS = '[a-zA-Z0-9 \\-{}\\[\\]<>$_\'"*]';

    /**
     * The "wildcard" operators.
     * @type {String}
     */
    exports.WILDCARDS = '(?:\\*|>|<)';

    /**
     * A regular expression string that defines the syntax of the variables within brackets (i.e. 'x' in [x=5]).
     * @type {String}
     */
    exports.VARIABLES = '(?:[a-zA-Z$_](?:[a-zA-Z0-9$_\\.:])*)';

    /**
     * The characters allowed to be a the first character of a term.
     * @type {String}
     */
    exports.TERM_FIRST_CHAR = 'a-zA-Z_$';

    /**
     * A regular expression string that defines the "terms" or the string part of a select (i.e. #term, without the #)
     * @type {String}
     */
    exports.TERMS = '(?:[' + exports.TERM_FIRST_CHAR + '](?:[a-zA-Z0-9$_\\.\\-])*|\\{.+?})';

    /**
     * The operators allowed to be used within bracket filters (i.e. '=' in [x=5])..
     * @type {String}
     */
    exports.OPERATORS = '(?: *= *| *~ *| *?= *| *?! *| *> *| *< *| *>= *| *<= *| *!= *| *!~ *)';

    /**
     * The value portion of a bracket filter (i.e. '5' in [x=5])..
     * @type {String}
     */
    exports.VALUES = '(?:["](?:[\\s|\\S]*?)["]|[\'](?:[\\s|\\S]*?)[\']|-*\\d+(?:\\.\\d+)?|true|false|null)';

    /**
     * The contents allowed within brackets.
     * @type {String}
     */
    exports.ALLOWED_IN_BRACKETS = exports.VARIABLES + exports.OPERATORS + exports.VALUES;

    /**
     * RegExp used to split brackets into their various pieces.
     * @type {RegExp}
     */
    exports.BRACKET_DISSECTOR = new RegExp('\\[(' + exports.VARIABLES + ')(' + exports.OPERATORS + ')(' + exports.VALUES + ')\\]', 'g');

    /**
     * The maxmium number of "lines" to store in the selector cache, per JSDOMIndex instance!
     * If you notice memory bloat, check here first.
     * @type {Number}
     */
    exports.MAX_SELECTOR_CACHE = 1000;

    /**
     * A multiplier to search the first MAX_SELECTOR_MULTIPLIER portion of the cache.
     * If set to 0.5, only the first half of the cache will be elidgible for deletion.
     * This combines the Least Frequently Used and Oldest Used cache deletion methods.
     * @type {Number}
     */
    exports.MAX_SELECTOR_MULTIPLIER = 0.50;

    /**
     * Whether or not to poll selector stats. If true, ./Stat.js will store information about the selectors and their performance.
     * @type {Boolean}
     */
    exports.POLL_SELECTOR_STATS = true;

    /**
     * The maximum number of selector stats to keep.
     * @type {Number}
     */
    exports.STATS_MAX = 150;

    /**
     * Locked properties that cannot be un-indexed.
     * @type {Array<String>}
     */
    exports.LOCKED_INDICES = ['uid', 'level', 'delta'];

    /**
     * Replaces circular parent references with the parent's id.
     * Passed as an argument to JSON.stringify.
     */
    exports.REPLACE_CIRCULAR_PARENTS = function (key, value) {
        if(key === 'parent' && value && typeof value === 'object') return value.id;
        return value;
    };
}());
