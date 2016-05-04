/**
 * @file JSDOMElementArray Class — An array-like object that contains JSDOMElements
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */

(function () {
    'use strict';
    require('proto-lib').get('_');

    function QuerifyArray (a) {
        if(!(a instanceof Array)) throw new Error('QuerifyArray expected argument #0 (array) to be an array.');

        if(!a.querified) {
            Object.defineProperties(a, {
                querified: {
                    configurable : false,
                    enumberable  : false,
                    writable     : false,
                    value        : true
                },

                prop: {
                    configurable : false,
                    enumberable  : true,
                    writable     : false,
                    value        : function (property, value) {
                        var args = arguments;

                        if(value !== undefined) {
                            a._.each(function (e) {
                                if(e instanceof require('./JSDOMElement')) e.prop.apply(e, args);
                            });
                            return a;
                        }
                        else {
                            return a.length > 0 ? a[0].prop(property) : undefined;
                        }
                    }
                },

                val: {
                    configurable: false,
                    enumberable : true,
                    writable    : false,
                    value       : function (value) {
                        var args = arguments;

                        if(value !== undefined) {
                            a._.each(function (e) {
                                if(e instanceof require('./JSDOMNode')) e.val.apply(e, args);
                            });
                            return a;
                        }
                        else {
                            return a.length > 0 ? a[0].val() : undefined;
                        }
                    }
                },

                get: {
                    configurable: false,
                    enumberable : true,
                    writable    : false,
                    value       : function (n) {
                        return a[n];
                    }
                },

                children: {
                    configurable: false,
                    enumberable : true,
                    writable    : false,
                    value       : function () {
                        return a.length > 0 ? a[0].children() : undefined;
                    }
                },

                level: {
                    configurable: false,
                    enumberable : true,
                    writable    : false,
                    value       : function () {
                        return a.length > 0 ? a[0].level() : undefined;
                    }
                }
            });
        }
        return a;
    }
    module.exports = QuerifyArray;
}());
