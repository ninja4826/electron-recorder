import config from 'config';
import http from 'http';
import url from 'url';

export default function start(route, handle) {
    const onRequest = (req, res) => {
        var pathname = url.parse(req.url).pathname;
        var postData = '';

        req.setEncoding('utf8');

        req.addListener('data', (postDataChunk) => {
            postData += postDataChunk;
        });

        req.addListener('end', () => {
            route(handle, pathname, res, postData);
        });
    };

    http.createServer(onRequest).listen(config.get('port'));
}
