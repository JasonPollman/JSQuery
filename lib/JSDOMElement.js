(function () {
    'use strict';
    module.exports = function JSDOMElement (jsdom, contents) {
        if(!(this instanceof JSDOMElement)) return new JSDOMElement(jsdom, contents);
        if(typeof contents !== 'object') throw new Error('Cannot create element from non-object');

        var self     = this,
            children = [],
            parent   = null,
            level    = 0;

        Object.defineProperties(self, {
            uid: {
                configurable : false,
                enumerable   : true,
                writable     : false,
                value: self._.uniqueId()
            },

            children: {
                configurable : false,
                enumerable   : true,

                get: function () {
                    return children._.copy();
                }
            },

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
         * @param {Object} child The child element to add.
         */
        this.val = function (value) {
            if(value !== undefined) {
                if(typeof value === 'object') {
                    contents = value;

                    // Re-index all properties
                    jsdom.index
                        .removeFromAllCustomIndices(self)
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

        this.prop = function (named, value) {
            if(value !== undefined) {
                var current = contents[named];
                contents[named] = value;

                jsdom.index // Re-index the element the changed property
                    .removeElementFromIndex(self, named, current)
                    .addElementToIndex(self, named, value);

                return self;
            }
            else {
                return contents[named];
            }
        };

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

        this.attr       = this.prop;
        this.removeAttr = this.removeProp;

        /**
         * Adds a child element to the current element.
         * Silently fails if the argument passed for parameter child is not an instance of JSDOMElement.
         * @param {JSDOMElement} child The child element to add.
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
         */
        this.removeChild = function (child) {
            var idx = children.indexOf(child);
            if(idx !== -1 && child instanceof JSDOMElement) children.splice(idx, 1);
            return self;
        };

        /**
         * Returns the child at the given index.
         * @param {Number} n The index of the child to get.
         * @return {JSDOMElement} The element at the given index, or null.
         */
        this.getChildAtIndex = function (n) {
            return children[n] || null;
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

    };
}());
