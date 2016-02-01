import config from 'config';
import fs from 'fs';
import sys from 'sys';
import { exec } from 'child_process';

function home(response) {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(fs.readFileSync('./static/index.html'));
}

function upload(response, postData) {
    var files = JSON.parse(postData);

    _upload(response, files.audio);

    if (files.uploadOnlyAudio) {
        response.statusCode = 200;
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(files.audio.name);
    }

    if (!files.uploadOnlyAudio) {
        _upload(response, files.video);
        merge(response, files);
    }
}

function merge(response, files) {
    let merger = `${__dirname}/merger.bat`;
    let audioFile = `${__dirname}/uploads/${files.audio.name}`;
    let videoFile = `${__dirname}/uploads/${files.video.name}`;
    let mergedFile = `${__dirname}/uploads/${files.audio.name.split('.')[0]}-merged.webm`;

    var command = `${merger}, ${audioFile} ${videoFile} ${mergedFile}`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.log(err.stack);
            console.log('Error code:', err.code);
            console.log('Signal received:', err.signal);
        } else {
            response.statusCode = 200;
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end(`${files.audio.name.split('.')[0]}-merged.webm`);
        }
    });
}

function _upload(response, file) {
    var fileRootName = file.name.split('.').shift(),
        fileExt = file.name.split('.').pop(),
        filePathBase = `${config.get('upload_dir')}/`,
        fileRootNameWithBase = `${filePathBase}${fileRootName}`,
        filePath = `${fileRootNameWithBase}.${fileExt}`,
        fileID = 2,
        fileBuffer;

    while (fs.existsSync(filePath)) {
        filePath = `${fileRootNameWithBase}(${fileID}).${fileExt}`;
        fileID += 1;
    }

    file.contents = file.contents.split(',').pop();

    fileBuffer = new Buffer(file.contents, 'base64');

    fs.writeFileSync(filePath, fileBuffer);
}

function serveStatic(response, pathname) {
    var extension = pathname.split('.').pop(),
        extensionTypes = {
            'js': 'application/javascript',
            'webm': 'video/webm',
            'mp4': 'video/mp4',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'gif': 'image/gif'
        };
    response.writeHead(200, {
        'Content-Type': extensionTypes[extension]
    });
    if (hasMediaType(extensionTypes[extension])) {
        response.end(fs.readFileSync(`.${pathname}`));
    } else {
        response.end(fs.readFileSync(`./static${pathname}`));
    }
}

function hasMediaType(type) {
    var hasType = false;
    [
        'audio/wav',
        'audio/ogg',
        'video/webm',
        'video/mp4'
    ].forEach((t) => {
        if (t == type) {
            hasType = true;
        }
    });

    return hasType;
}
