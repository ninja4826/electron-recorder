var express = require('express'),
    router = require('./dist/express/router.js'),
    bodyParser = require('body-parser'),
    config = require('config');


console.log(router);
var app = express()
    .use(bodyParser.urlencoded({
        extended: true,
        limit: '5gb'
    })).use(bodyParser.json({
        limit: '5gb'
    })).use(function(req, res, next) {
        // console.log(JSON.stringify(req.body, null, 2));
        next();
    }).use('/', router.router);

app.listen(config.get('port'), function() {
    console.log('Running on port', config.get('port'));
});
