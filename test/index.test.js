/* eslint-env node, mocha */
/* eslint-disable func-names, prefer-arrow-callback, strict, global-require */
'use strict';
const expect = require('chai').expect;
const JSDOMIndex = require('../lib/JSDOMIndex');
const JSDOMElement = require('../lib/JSDOMElement');
const JSDOMTree = require('../lib/JSDOMTree');
const lib = require('proto-lib');
const JSDOMConstants = require('../lib/JSDOMConstants');

describe('JSDOMIndex', function () {
  let index;
  before(function () {
    index = new JSDOMIndex();
  });

  it('Should return the proper API when required', function () {
    expect(index.validateSelector).to.be.a('function');
    expect(index.by).to.be.an('object');
    expect(index.with).to.be.an('object');
    expect(index.map).to.be.an('object');
    expect(index.addIndex).to.be.a('function');
    expect(index.removeIndex).to.be.a('function');
    expect(index.empty).to.be.a('function');
    expect(index.emptyCache).to.be.a('function');
    expect(index.addElementToIndex).to.be.a('function');
    expect(index.removeElementFromIndex).to.be.a('function');
    expect(index.removeElementFromAllCustomIndices).to.be.a('function');
    expect(index.removeElementFromAllIndices).to.be.a('function');
    expect(index.indexAllPropertiesOfObjectForElement).to.be.a('function');
    expect(index.regexps).to.be.an('object');
    expect(index.all).to.not.be.a('undefined');
    expect(index.count).to.not.be.a('undefined');
    expect(index.updated).to.not.be.a('undefined');

    expect(index.by.uid).to.be.an('object');
    expect(index.by.level).to.be.an('object');
    expect(index.by.delta).to.be.an('object');

    expect(index.with.uid).to.be.a('function');
    expect(index.with.level).to.be.a('function');
    expect(index.with.delta).to.be.a('function');
    expect(index.with.selector).to.be.a('function');
  });

  it('Should handle exceptions using JSDOMIndex#addIndex', function () {
    expect(index.addIndex('test')).to.equal(index);
    expect(index.addIndex('id', '#')).to.equal(index);

    expect(index.addIndex.bind(index, 'id', '#')).to.throw(Error);
    expect(index.addIndex.bind(index, function () {}, '#')).to.throw(Error);
    expect(index.addIndex.bind(index, 123, '#')).to.throw(Error);
    expect(index.addIndex.bind(index, [], '#')).to.throw(Error);

    expect(index.addIndex.bind(index, 'newIndex', function () {})).to.throw(Error);
    expect(index.addIndex.bind(index, 'newIndex', 123)).to.throw(Error);
    expect(index.addIndex.bind(index, 'newIndex', {})).to.throw(Error);
    expect(index.addIndex.bind(index, 'newIndex', 'a')).to.throw(TypeError);
    expect(index.addIndex.bind(index, 'newIndex', 'abc')).to.throw(TypeError);
    expect(index.addIndex.bind(index, 'uid', '^')).to.throw(Error);
    expect(index.addIndex.bind(index, 'someKey', '#')).to.throw(Error);
    expect(index.addIndex.bind(index, 'id', '^')).to.throw(Error);
  });

  it('Should add new indexes using JSDOMIndex#addIndex', function () {
    expect(index.addIndex('newIndex', '^')).to.equal(index);
    expect(index.by.newIndex).to.be.an('object');
    expect(index.by.newIndex._.size()).to.equal(0);

    for (let i = 0; i < JSDOMConstants.MAX_SELECTOR_CACHE + 5; i++) {
      expect(index.addElementToIndex(
        new JSDOMElement(
          new JSDOMTree({ newIndex: 'bar' }), { newIndex: 'bar' }),
          'newIndex',
          `testKey${i}`
        )
      ).to.equal(index);
      expect(index.by.newIndex._.size()).to.equal(i + 1);
    }

    expect(index.with.newIndex).to.be.a('function');

    for (let i = 0; i < JSDOMConstants.MAX_SELECTOR_CACHE + 5; i++) {
      const elems = index.with.newIndex(`testKey${i}`);
      expect(elems).to.be.an('array');
      expect(elems.length).to.equal(1);
    }
  });

  it('Should use caching up to the maximum cache size, then dump lines as needed', function () {
    for (let i = 0; i < JSDOMConstants.MAX_SELECTOR_CACHE + 5; i++) {
      const res = index.with.selector(`^{testKey${i}}`);
      expect(res.length).to.equal(1);
    }

    index.emptyCache();

    for (let i = 0; i < JSDOMConstants.MAX_SELECTOR_CACHE + 5; i++) {
      const res = index.with.selector(`^{testKey${i}}`);
      expect(res.length).to.equal(1);
    }
  });

  it('Should remove an element from an index when JSDOMIndex#removeElementFromIndex is called', function () {
    expect(index.removeElementFromIndex([], 'newIndex')).to.equal(index);
    expect(index.removeElementFromIndex({}, 'newIndex')).to.equal(index);
    expect(index.removeElementFromIndex(123, 'newIndex')).to.equal(index);
    expect(index.removeElementFromIndex('a string', 'newIndex')).to.equal(index);
    expect(index.removeElementFromIndex(function () {}, 'newIndex')).to.equal(index);
    expect(index.removeElementFromIndex([], 'nonexistentIndex')).to.equal(index);

    for (let i = 0; i < JSDOMConstants.MAX_SELECTOR_CACHE / 4; i++) {
      let res = index.with.selector(`^{testKey${i}}`);
      expect(res.length).to.equal(1);
      expect(index.with.newIndex(`testKey${i}`).length).to.equal(1);
      expect(index.removeElementFromIndex(res[0], 'newIndex', `testKey${i}`)).to.equal(index);
      res = index.with.selector(`^{testKey${i}}`);
      expect(res.length).to.equal(0);
      expect(index.with.newIndex(`testKey${i}`).length).to.equal(0);
      expect(index.by.newIndex._.size()).to.equal((JSDOMConstants.MAX_SELECTOR_CACHE + 5) - (i + 1));
    }
  });

  it('Should remove an element from custom indices when JSDOMIndex#removeElementFromAllCustomIndices is called', function () { // eslint-disable-line
    expect(index.removeElementFromAllCustomIndices([])).to.equal(index);
    expect(index.removeElementFromAllCustomIndices({})).to.equal(index);
    expect(index.removeElementFromAllCustomIndices(123)).to.equal(index);
    expect(index.removeElementFromAllCustomIndices('a string')).to.equal(index);
    expect(index.removeElementFromAllCustomIndices(function () {})).to.equal(index);
    expect(index.removeElementFromAllCustomIndices([], 'nonexisty')).to.equal(index);

    for (let i = JSDOMConstants.MAX_SELECTOR_CACHE / 4; i < JSDOMConstants.MAX_SELECTOR_CACHE / 2; i++) {
      let res = index.with.selector(`^{testKey${i}}`);
      expect(res.length).to.equal(1);
      expect(index.with.newIndex(`testKey${i}`).length).to.equal(1);
      expect(index.removeElementFromAllCustomIndices(res[0])).to.equal(index);
      res = index.with.selector(`^{testKey${i}}`);
      expect(res.length).to.equal(0);
      expect(index.with.newIndex(`testKey${i}`).length).to.equal(0);
      expect(index.by.newIndex._.size()).to.equal((JSDOMConstants.MAX_SELECTOR_CACHE + 5) - (i + 1));
    }
  });

  it('Should always return an array when using the "with" object', function () {
    expect(index.with.level(999)).to.eql([]);
    expect(index.with.delta(-1)).to.eql([]);
    expect(index.with.level([])).to.eql([]);
    expect(index.with.delta({})).to.eql([]);
    expect(index.with.level('bad level')).to.eql([]);
    expect(index.with.delta('bad delta')).to.eql([]);
  });

  it('Should always return the current JSDOMIndex when calling JSDOMIndex#indexAllPropertiesOfObjectForElement', function () { // eslint-disable-line
    expect(index.indexAllPropertiesOfObjectForElement([])).to.equal(index);
    expect(index.indexAllPropertiesOfObjectForElement(null)).to.equal(index);
    expect(index.indexAllPropertiesOfObjectForElement(undefined)).to.equal(index);
    expect(index.indexAllPropertiesOfObjectForElement(123)).to.equal(index);
    expect(index.indexAllPropertiesOfObjectForElement('a string')).to.equal(index);
    expect(index.indexAllPropertiesOfObjectForElement(function () {})).to.equal(index);
  });

  it('Should throw on invalid selectors', function () {
    expect(index.with.selector.bind(index, 'bad selector')).to.throw(TypeError);
    expect(index.with.selector.bind(index, [])).to.throw(TypeError);
    expect(index.with.selector.bind(index, function () {})).to.throw(TypeError);
    expect(index.with.selector.bind(index, 123)).to.throw(TypeError);
    expect(index.with.selector.bind(index, '##WrOnG')).to.throw(TypeError);
    expect(index.with.selector.bind(index, null)).to.throw(TypeError);
    expect(index.with.selector.bind(index, undefined)).to.throw(TypeError);
  });

  it('Should empty all the indices when JDSOMIndex#empty is called', function () {
    index.empty();
    expect(index.by.newIndex._.size()).to.equal(0);
  });

  it('Should remove new indexes using JDSOMIndex#removeIndex', function () {
    expect(index.removeIndex('doesntExist')).to.equal(index);
    expect(index.removeIndex([])).to.equal(index);
    expect(index.removeIndex(function () {})).to.equal(index);
    expect(index.removeIndex(123)).to.equal(index);
    expect(index.removeIndex('newIndex')).to.equal(index);

    expect(index.by.newIndex).to.be.a('undefined');
    expect(index.with.newIndex).to.be.a('undefined');
  });
});
