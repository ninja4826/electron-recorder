var express = require('express'),
    router = require('./dist/express/router.js'),
    bodyParser = require('body-parser'),
    config = require('config');


console.log(router);
var app = express()
    .use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json())
    .use('/', router.router);

app.listen(config.get('port'), function() {
    console.log('Running on port', config.get('port'));
});
