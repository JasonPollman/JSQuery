/* eslint-env node, mocha */
/* eslint-disable func-names, prefer-arrow-callback, strict, global-require */
'use strict';
const expect = require('chai').expect;
const JSDOMNode = require('../lib/JSDOMNode');
const JSDOMElement = require('../lib/JSDOMElement');
const JSDOMTree = require('../lib/JSDOMTree');

describe('Basic Usage', function () {
  it('Should create a valid JSDOMNode', function () {
    const node = new JSDOMNode(new JSDOMTree({ foo: 'bar' }), 5, 'nodeKey');
    expect(node).to.be.an.instanceof(JSDOMNode);
    expect(node.val()).to.equal(5);
  });

  it('Should get/set the node\'s value when calling JSDOMNode#val', function () {
    const node = new JSDOMNode(new JSDOMTree({ foo: 'bar' }), 5, 'nodeKey');
    expect(node).to.be.an.instanceof(JSDOMNode);
    expect(node.val()).to.equal(5);

    expect(node.val(123)).to.equal(node);
    expect(node.val()).to.equal(123);

    expect(node.val([1, 2, 3])).to.be.an.instanceof(JSDOMElement);
  });

  it('Should get/set the node\'s level when calling JSDOMNode#lvl', function () {
    const node = new JSDOMNode(new JSDOMTree({ foo: 'bar' }), 5, 'nodeKey');
    expect(node).to.be.an.instanceof(JSDOMNode);
    expect(node.lvl()).to.equal(0);

    expect(node.lvl(5)).to.equal(node);
    expect(node.lvl()).to.equal(5);

    expect(node.lvl('invalid level')).to.equal(node);
    expect(node.lvl()).to.equal(5);

    expect(node.lvl([])).to.equal(node);
    expect(node.lvl()).to.equal(5);

    expect(node.lvl({})).to.equal(node);
    expect(node.lvl()).to.equal(5);

    expect(node.lvl(function () {})).to.equal(node);
    expect(node.lvl()).to.equal(5);
  });

  it('Should return the nodes key when referencing JSDOMNode#key', function () {
    const t = new JSDOMTree({ foo: 'bar' });
    const p = t.query('*')[0];

    let node = new JSDOMNode(t, 5, 'nodeKey');
    p.append(node);
    expect(node).to.be.an.instanceof(JSDOMNode);
    expect(node.key()).to.eql('nodeKey');

    node = new JSDOMNode(new JSDOMTree({ foo: 'bar' }), 5, 0);
    expect(node).to.be.an.instanceof(JSDOMNode);
    expect(node.key()).to.eql(0);
  });

  it('Should always return zero children...', function () {
    const node = new JSDOMNode(new JSDOMTree({ foo: 'bar' }), 5, 'nodeKey');
    expect(node).to.be.an.instanceof(JSDOMNode);
    expect(node.children()).to.eql([]);
  });
});
