import config from 'config';
import fs from 'fs';
import sys from 'sys';
import { exec } from 'child_process';
import * as express from 'express';

var router = express.Router();

function merge(response, files) {
    console.log('Merging');
    let merger = `${process.cwd()}\\merger.bat`;
    let audioFile = `${process.cwd()}\\uploads\\${files.audio.name}`;
    let videoFile = `${process.cwd()}\\uploads\\${files.video.name}`;
    let mergedFile = `${process.cwd()}\\uploads\\${files.audio.name.split('.')[0]}-merged.webm`;

    let command = `${merger} ${audioFile} ${videoFile} ${mergedFile}`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.log(err.stack);
            console.log('Error code:', err.code);
            console.log('Signal received:', err.signal);
        } else {
            console.log('Done merging.');
            response.json({
                name: `${files.audio.name.split('.')[0]}-merged.webm`
            });
        }
    });
}

function _upload(response, file) {
    // console.log(file);
    if (!file) return;
    var objCheck = (obj, str) => (Object.keys(obj).indexOf(str) > -1);
    if (objCheck(file, 'audio') || objCheck(file, 'video')) {
        if (objCheck(file, 'audio')) {
            _upload(file.audio);
        }
        if (objCheck(file, 'video')) {
            _upload(file.video);
        }
        return;
    }

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

router.post('/upload', (req, res) => {
    var files = req.body;
    if ('audio' in files) {
        _upload(res, files.audio);
    }
    if ('video' in files) {
        _upload(res, files.video);
    }

    if ('audio' in files || 'video' in files) {
        // merge(res, files);
    }
    if ('contents' in files) {
        upload(res, files);
    }

    res.json({
        audio: files.audio.name,
        video: files.video.name
    });
    // _upload(res, files);

    // if (files.uploadOnlyAudio) {
    //     console.log('uploadOnlyAudio');
    //     res.json({ audio: files.audio.name });
    // }
    //
    // if (!files.uploadOnlyAudio) {
    //     console.log('Not uploadOnlyAudio');
    //     _upload(res, files.video);
    //     merge(res, files);
    // }
});

export default router;
export { router };
