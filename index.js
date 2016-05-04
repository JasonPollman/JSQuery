(function () {
    'use strict';
    var JSDOM = require('./lib/JSDOMTree');

    module.exports = {
        fromString: JSDOM.fromString,
        fromObject: JSDOM.fromObject
    };

    var x = module.exports.fromObject({
        a: 1,
        b: [
            {
                a: 'foo',
                b: 'bar',
                name: 'test'
            },
            {
                a: 'foo',
                b: 'bar',
                name: 'test'
            },
            {
                a: 'foo',
                b: 'bar',
                name: 'test'
            },
            {
                a: 'z',
                b: 'bar',
                name: 'test'
            }
        ]
    },
    {
        map: {
            children: 'x'
        },
        indices: [
            { key: 'name', accessor: '.' },
            { key: 'id', accessor: '#' },
            { key: 'a', accessor: '^' },
            { key: 'aqq', accessor: '@' }
        ]
    });

    // console.log(x.elements);
    // console.log(x.with.name('root child 1'));
    //console.log(y = x.with.id('0xb')[0]);
    // console.log(y = x.with.name('root'));
    //console.log(y.id, y.level);
    //console.log(x.query('*[nth=0]')[0].contents);
    //console.log(x.with.delta(2));

    // x.query('*[nth=0]')[0].attribute('name', 'jason');
    // //console.log(x.query('*[nth=0]')[0].contents);
    //console.log(x.query('.root').children().val());
    var $ = x;
    $('.{test}').prop('name', 'jason');
    $('^{foo}').prop('aqq', 'zzz');
    $('^{foo}').prop('aqq', 'LLL');
    $('.{test}').prop('123', 'jason3erw4');
    $('.{test}').prop('123', 'jason3erw4PPPP');
    $('^{foo}').prop('123', 'jason3erw4');
    $('^{foo}').prop('123>>>>', 'jason3erw4');
    $('@{LLL}').prop('mmm', 'PPPPPP');
    console.log($('@{LLL}'))
    console.log($.export().json);
    //console.log($.with.level(0));
    //console.log($('* * *'));
    //console.log($.with.name('root 2 child 1'));
    //console.log($(.with.name('root')[0].prop('fail', 'fail'));
    //console.log($.with.name('root')[0].val());)
    //console.log($.export().json);
    var stat = require('./lib/JSDOMStat');
    console.log(stat);
}());
