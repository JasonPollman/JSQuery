/**
 * @file JSDOMElementArray Class — An array-like object that contains JSDOMElements
 * @author Jason Pollman <jasonjpollman@gmail.com>
 */

(function () {
    'use strict';
    require('proto-lib').get('_');

    function JSDOMElementArray () {
        if(!(this instanceof JSDOMElementArray)) return new JSDOMElementArray();
        Array.apply(this, arguments);

        var self       = this,
            arrPush    = self.push,
            arrPop     = self.pop,
            arrShift   = self.shift,
            arrUnshift = self.unshift;

        Object.defineProperties(self, {
            length: {
                configurable : false,
                enumerable   : false
            },

            push: {
                configurable: false,
                enumberable : false,
                writable    : false,
                value       : function () {
                    arguments._.each(function (arg) {
                        if(arg instanceof require('./JSDOMElement')) arrPush.call(self, arg);
                    });
                }
            },

            shift: {
                configurable: false,
                enumberable : false,
                writable    : false,
                value       : function () {
                    arguments._.each(function (arg) {
                        if(arg instanceof require('./JSDOMElement')) arrShift.call(self, arg);
                    });
                }
            },

            unshift: {
                configurable: false,
                enumberable : false,
                writable    : false,
                value       : function () {
                    arguments._.each(function (arg) {
                        if(arg instanceof require('./JSDOMElement')) arrUnshift.call(self, arg);
                    });
                }
            },

            pop: {
                configurable: false,
                enumberable : false,
                writable    : false,
                value       : function () {
                    arguments._.each(function (arg) {
                        if(arg instanceof require('./JSDOMElement')) arrPop.call(self, arg);
                    });
                }
            },

            prop: {
                configurable: false,
                enumberable : false,
                writable    : false,
                value       : function (property, value) {
                    if(value !== undefined) {
                        self._.each(function (e) { e.prop.apply(e, arguments); });
                        return self;
                    }
                    else {
                        return self.length > 0 ? self[0].prop(property) : undefined;
                    }
                }
            },

            val: {
                configurable: false,
                enumberable : false,
                writable    : false,
                value       : function (value) {
                    if(value !== undefined) {
                        self._.each(function (e) { e.val.apply(e, arguments); });
                        return self;
                    }
                    else {
                        return self.length > 0 ? self[0].val() : undefined;
                    }
                }
            }
        });

        arguments._.each(function (arg) { self.push(arg); });
    }

    JSDOMElementArray._.inherits(Array);
    module.exports = JSDOMElementArray;

    var x = new JSDOMElementArray(1, 2, 3);

    console.log(x.valueOf(), '<<<<');
    x.push(1, 8, 7);
    console.log(x[0]);

    x.forEach(function (x) {
        console.log(x, '???')
    });

    x._.each(function (x) {
        console.log(x, typeof x, 'xxx')
    });
}());
