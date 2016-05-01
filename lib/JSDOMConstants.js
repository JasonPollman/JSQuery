(function () {
    'use strict';
    /**
     * Characters that aren't allow to be used as selector types.
     * @type {RegExp}
     */
    exports.INVALID_SELECTOR_CHARACTERS = '[a-zA-Z0-9 \\-{}\\[\\]=~<>!$?\'"*]';

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
    exports.TERMS = '(?:[' + exports.TERM_FIRST_CHAR + '](?:[a-zA-Z0-9$_\\.:\\-])*|\\{.+?})';

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
     * Replaces circular parent references with the parent's id.
     * Passed as an argument to JSON.stringify.
     */
    exports.REPLACE_CIRCULAR_PARENTS = function (key, value) {
        if(key === 'parent' && value && typeof value === 'object') return value.id;
        return value;
    };
}());
