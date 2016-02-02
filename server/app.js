// var express = require('express'),
//     router = require('./dist/express/router.js'),
//     bodyParser = require('body-parser'),
//     config = require('config');

var bodyParser = require('body-parser');
var config = require('config');
var keypress = require('keypress');
var router = require('./dist/express/router');
var SockListener = require('./dist/sock').SockListener;

keypress(process.stdin);

var app = require('express')();

var sockListeners = [];

// console.log(router);
// var app = express()
app.use(bodyParser.urlencoded({
        extended: true,
        limit: '5gb'
    })).use(bodyParser.json({
        limit: '5gb'
    })).use(function(req, res, next) {
        // console.log(JSON.stringify(req.body, null, 2));
        next();
    }).use('/', router.router);

var server = require('http').Server(app);
server.listen(config.get('port'));
var io = require('socket.io')(server);

io.on('connection', function(socket) {
    sockListeners.push(new SockListener(socket));
});


process.stdin.on('keypress', function(ch, key) {
    // console.log(JSON.stringify(key, null, 2));
    if (key.name === "enter") {
        console.log('Gracefully stopping server.');
        server.close();
        console.log('Server has been stopped. Exiting application.');
        process.exit();
    }
});

server.on('listening', function() {
    console.log('Running on port', config.get('port'));
    console.log('Press "Enter" to exit.');
});
