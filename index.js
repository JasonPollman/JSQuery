(function () {
    'use strict';
    var JSDOM = require('./lib/JSDOMTree');

    module.exports = {
        fromString: JSDOM.fromString,
        fromObject: JSDOM.fromObject
    };

    var x = module.exports.fromObject({
        children: {
            a: {
                id: 0,
                name: 'root',
                x: [
                    {
                        name: 'root child 1'
                    },
                    {
                        name: 'root child 2',
                        x: [
                            {
                                name: 'root child 2',
                                x: [
                                    {
                                        name: 'root child 2',
                                        x: [
                                            {
                                                name: 'root child 2',
                                                x: [
                                                    {
                                                        name: 'root child 2',
                                                        x: [
                                                            {
                                                                name: 'root child 2',
                                                                x: [
                                                                    {
                                                                        name: 'root child 2',
                                                                        x: [
                                                                            {
                                                                                name: 'root child 2',
                                                                                x: [
                                                                                    {
                                                                                        name: 'root child 2',
                                                                                        x: [
                                                                                            {
                                                                                                name: 'root child 2',
                                                                                                x: [
                                                                                                    {
                                                                                                        name: 'root child 2 child 1',
                                                                                                        id: 7,
                                                                                                        test: {
                                                                                                            foo: 'bar'
                                                                                                        },
                                                                                                        a: [
                                                                                                            1, null, 2, 3, 4
                                                                                                        ]
                                                                                                    },
                                                                                                    {
                                                                                                        name: 'root child 2 child 2'
                                                                                                    }
                                                                                                ]
                                                                                            }
                                                                                        ]
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            b: {
                name: 'root 2',
                x: [
                    {
                        name: 'root 2 child 1'
                    },
                    {
                        name: 'root 2 child 2'
                    }
                ]
            },
            c: [
                {
                    name: 'a1',
                    x: [
                        {
                            name: 'a10'
                        },
                        {
                            name: 'a12'
                        }
                    ]
                }
            ]
        }
    },
    {
        map: {
            children: 'x'
        },
        indices: [
            { key: 'name', accessor: '.' },
            { key: 'id', accessor: '#' }
        ]
    });

    console.log(x);
    // console.log(x.elements);
    // console.log(x.with.name('root child 1'));
    //console.log(y = x.with.id('0xb')[0]);
    // console.log(y = x.with.name('root'));
    //console.log(y.id, y.level);
    //console.log(x.query('*[nth=0]')[0].contents);
    //console.log(x.with.delta(2));

    // x.query('*[nth=0]')[0].attribute('name', 'jason');
    // //console.log(x.query('*[nth=0]')[0].contents);
    //console.log(x.query('* * *'));
    var $ = x;
    $('* * *');
    $('* * *');
    console.log($.with.name('root'));
    // x.query('* * *');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    //
    // x.query('.root');
    // x.query('.root');
    // x.query('.root');
    // x.query('.root');
    // x.query('.root');
    // x.query('.root');
    //
    // x.query('.root');
    // x.query('.root');
    // x.query('.root');
    // x.query('* * *');
    // x.query('* * *');
    // x.query('* * *');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('.{root 2}');
    // x.query('* * *');
    // x.query('* * *');
    // x.query('* * *');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 1}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2 child 2}');
    // x.query('.{root 2 child 2}');
    //console.log(x.query('* * <[name="root"] '));
    //
    //console.log(x.query('.a12'));

    // console.log(x.where(function (e) { return e.id === 0 }));
    // console.log(x.elements);
    //console.log(x.export().json);
    var stat = require('./lib/JSDOMStat');
    console.log(JSON.stringify(stat, null, '    '));
}());
