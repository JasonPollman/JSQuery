'use strict';

/**
 * @module JSQuery
 * Turn any JS Object or JSON string into a queryable DOM
 */

require('proto-lib').get('_');

var ElementIndexer = require('./lib/ElementIndexer');

class JSDOM {
    /**
     * Creates a new JSDOM from a JSON string
     * @param {String} data The JSON string to create the JSDOM with.
     * @return {JSDOM} The new JSDOM.
     * @throws SyntaxError
     */
    static treeFromJSONString (data) {
        try {
            data = JSON.parse(data);
        }
        catch (e) {
            throw new SyntaxError(`Cannot parse tree: ${ e.message }`);
        }
        return new JSDOM(data);
    }

    constructor (tree, options) {
        this.settings = {};
        this.index    = new ElementIndexer();
        this.tree     = tree;

        options = typeof options === 'object' ? options : {};
        options._.each((o, k) => this.settings[k] = o);
        this.index.addIndex('name', '.');
        this.indexTree();
    }

    indexTree (tree, parent) {
        this.index.empty();
        parent = parent || null;

        (tree || this.tree)._.every(e => {
            e.id       = e.id || e._.uniqueId();
            e.parent   = parent;
            e.level    = typeof e.parent === 'object' && e.parent ? parent.level + 1 : 0;
            e.children = typeof e.children === 'object' && e.children ? e.children : [];
            if(e.children._.size() > 0) this.indexTree(e.children, e);
        });
    }

    get with () {
        return this.index.with;
    }

    query (s) {
        return this.with.selector(s);
    }
}

module.exports = JSDOM;

var x = new JSDOM([
    {
        name: 'root',
        children: [
            {
                name: 'root child 1'
            },
            {
                name: 'root child 2',
                children: [
                    {
                        name: 'root child 2 child 1'
                    },
                    {
                        name: 'root child 2 child 2'
                    }
                ]
            }
        ]
    },
    {
        name: 'root 2',
        children: [
            {
                name: 'root 2 child 1'
            },
            {
                name: 'root 2 child 2'
            }
        ]
    }
]);

console.log(x.query('* * * <'));
