/* eslint-env node, mocha */
/* eslint-disable func-names, prefer-arrow-callback, strict, global-require */
'use strict';
const expect = require('chai').expect;
const JSDOMNode = require('../lib/JSDOMNode');
const JSDOMElement = require('../lib/JSDOMElement');
const jsQuery = require('../');
const fs = require('fs');
const path = require('path');

function basicUsage($) {
  let res;
  let nodes;

  res = $('*');
  expect(res.length).to.equal(4);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  expect(res[0].toString()).to.match(/^JSDOMElement: uid=0x[a-z0-9]+, root=true, parent=null, elements=1, nodes=0$/i);
  expect(res[1].toString()).to.match(/^JSDOMElement: uid=0x[a-z0-9]+, root=true, parent=0x[a-z0-9]+, elements=2, nodes=1$/i); // eslint-disable-line

  expect(res[0].val()).to.eql(require('./data/simple-tree-a.json'));

  expect(res[2].children()).to.be.an('array');
  expect(res[2].children().length).to.equal(3);

  nodes = res[1].nodes();
  expect(nodes.length).to.equal(1);
  nodes.each(n => {
    expect(n).to.be.an.instanceof(JSDOMNode);
  });

  expect(nodes[0].val()).to.equal('root');
  expect(nodes[0].key()).to.equal('id');

  expect(nodes[0].toString()).to.match(/^JSDOMNode: uid=0x[a-z0-9]+, parent=0x[a-z0-9]+$/i);

  res = $('#invalid');
  expect(res.length).to.equal(0);

  res = $('#root');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  nodes = res[0].childNodes();
  expect(nodes.length).to.equal(1);
  nodes.each(n => {
    expect(n).to.be.an.instanceof(JSDOMNode);
  });

  expect(nodes[0].val()).to.equal('root');
  expect(nodes[0].key()).to.equal('id');

  res = $('^{a}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  nodes = res[0].childNodes();
  expect(nodes.length).to.equal(3);
  nodes.each(n => {
    expect(n).to.be.an.instanceof(JSDOMNode);
  });

  expect(nodes[0].val()).to.equal('a');
  expect(nodes[0].key()).to.equal(0);

  expect(nodes[1].val()).to.equal('b');
  expect(nodes[1].key()).to.equal(1);

  expect(nodes[2].val()).to.equal('c');
  expect(nodes[2].key()).to.equal(2);

  res = $('^{1}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  nodes = res[0].childNodes();
  expect(nodes.length).to.equal(3);
  nodes.each(n => {
    expect(n).to.be.an.instanceof(JSDOMNode);
  });

  expect(nodes[0].val()).to.equal(1);
  expect(nodes[0].key()).to.equal(0);

  expect(nodes[1].val()).to.equal(2);
  expect(nodes[1].key()).to.equal(1);

  expect(nodes[2].val()).to.equal(3);
  expect(nodes[2].key()).to.equal(2);

  res = $('^{1}');
  expect(res.length).to.equal(1);
  expect(res.prop(2)).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*');
  expect(res.length).to.equal(4);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* *');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* * *');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* * * *');
  expect(res.length).to.equal(0);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('<');
  expect(res.length).to.equal(0);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* <');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* * <');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* * * <');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('>');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('* >');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('>');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));
}

function basicUsage2($) {
  let res;

  res = $('*');
  expect(res.val()).to.eql(require(path.join(__dirname, 'data', 'simple-tree-c.json')));
  expect(res.length).to.equal(4);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{0}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{1}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{2}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('.{test 0}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('.{test 1}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('.{test 2}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('^{a description}');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{0}.{test 0}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{0}^{a description}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{0}^{a description}.{test 0}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{1}.{test 1}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{1}^{a description}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{1}^{a description}.{test 1}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{2}.{test 2}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{2}^{a description}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{2}^{a description}.{test 2}');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[name="test 0"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[name="test 1"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[name="test 2"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=0]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=1]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=2]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=0][name="test 0"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=1][name="test 1"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=2][name="test 2"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=0][name="test 0"][description="a description"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=1][name="test 1"][description="a description"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[id=2][name="test 2"][description="a description"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{0}[id=0][name="test 0"][description="a description"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('#{0}[id=1][name="test 1"][description="a description"]');
  expect(res.length).to.equal(0);

  res = $('#{0}[id=2][name="test 2"][description="a description"]');
  expect(res.length).to.equal(0);

  res = $('*[description="a description"]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id!=0]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id!=1]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id<3]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id<2]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id<=2]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id>0]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id>=0]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id>1]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id>2]');
  expect(res.length).to.equal(0);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][id>3]');
  expect(res.length).to.equal(0);

  res = $('*[description="a description"][id!=0][id!=1]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description~"a de"]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description~null]');
  expect(res.length).to.equal(0);

  res = $('*[description~"invalid"]');
  expect(res.length).to.equal(0);

  res = $('*[description!~"a de"]');
  expect(res.length).to.equal(0);

  res = $('*[description!~"invalid"]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth=0]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth>0]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth>=0]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth<0]');
  expect(res.length).to.equal(0);

  res = $('*[description="a description"][nth<=0]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth<3]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth<2]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth<1]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth!=0]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth!=1]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth!=2]');
  expect(res.length).to.equal(2);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth!=3]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth!~3]');
  expect(res.length).to.equal(3);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth="first"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth="last"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth="middle"]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth="invalid nth"]');
  expect(res.length).to.equal(0);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  res = $('*[description="a description"][nth=0]');
  expect(res.length).to.equal(1);
  res.each(e => expect(e).to.be.an.instanceof(JSDOMElement));

  const elem = res[0].detach();
  const nextRes = $('*');
  expect(nextRes.length).to.equal(3);
  nextRes.each(el => expect(el).to.be.an.instanceof(JSDOMElement));
}

describe('Basic Usage', function () {
  it('Should create a new tree from an object', function () {
    const options = {
      indices: [
        {
          key: 'id',
          accessor: '#',
        },
        {
          key: '0',
          accessor: '^',
        },
      ],
    };

    const $ = jsQuery.fromObject(require('./data/simple-tree-a.json'), options);
    basicUsage($);
    basicUsage($);
    basicUsage($);
    basicUsage($);
  });

  it('Should create a new tree from a JSON string', function () {
    const options = {
      indices: [
        {
          key: 'id',
          accessor: '#',
        },
        {
          key: '0',
          accessor: '^',
        },
      ],
    };

    const $ = jsQuery
      .fromString(fs.readFileSync(path.join(__dirname, 'data', 'simple-tree-a.json')).toString('utf-8'), options);

    basicUsage($);
    basicUsage($);
    basicUsage($);
    basicUsage($);
  });

  it('Should create a new tree from an object, part II', function () {
    const options = {
      indices: [
        {
          key: 'id',
          accessor: '#',
        },
        {
          key: 'name',
          accessor: '.',
        },
        {
          key: 'description',
          accessor: '^',
        },
      ],
    };

    const $ = jsQuery
      .fromObject(require(path.join(__dirname, 'data', 'simple-tree-c.json')), options);

    basicUsage2($);
    basicUsage2($);
    basicUsage2($);
    basicUsage2($);
  });

  it('Should create a new tree from an JSON string, part II', function () {
    const options = {
      indices: [
        {
          key: 'id',
          accessor: '#',
        },
        {
          key: 'name',
          accessor: '.',
        },
        {
          key: 'description',
          accessor: '^',
        },
      ],
    };

    const $ = jsQuery
      .fromString(fs.readFileSync(path.join(__dirname, 'data', 'simple-tree-c.json')).toString('utf-8'), options);

    basicUsage2($);
    basicUsage2($);
    basicUsage2($);
    basicUsage2($);
  });
});
