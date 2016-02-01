var server = require('./dist/server'),
    handlers = require('./dist/handlers'),
    router = require('./dist/router'),
    handle = {};

handle['/'] = handlers.home;
handle['/home'] = handlers.home;
handle['/upload'] = handlers.upload;
handle._static = handlers.serveStatic;

server.start(router.route, handle);
