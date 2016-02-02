import fs from 'fs';
import config from 'config';
import jsonfile from 'jsonfile';
import * as debugUtils from './debugUtils';

class SockListener {
    constructor(socket) {
        console.log('Creating new SockListener');
        this.socket = socket;
        this.intervalID = 0;
        this.bandName = '';
        this.startTime = 0;
        this.files = {audio: [], video: []};
        this.setupSocket();
    }

    setupSocket() {
        console.log('A user has connected.');
        // this.socket.on('file-upload', function(files) {
        //     console.log(JSON.stringify(debugUtils.getKeys(files), null, 2));
        //     // TODO: Handle file part upload.
        // });

        this.socket.on('message', function(data) {
            console.log(JSON.stringify(debugUtils.getKeys(data), null, 2));
        });

        this.socket.on('start-recording', (data) => {
            console.log('Recording has started.');
            this.bandName = data.name;
            this.startTime = data.time;
            this.intervalID = setInterval(() => {
                this.socket.emit('send-stream');
            }, 300000);
        });

        this.socket.on('stop-recording', (data) => {
            var jsonObj = {
                endTime: data.time,
                startTime: this.startTime,
                files: this.files
            };
            jsonfile.writeFileSync(`${config.get('upload_dir')}/${this.bandName}-info.json`, jsonObj);
        });

        this.socket.on('stream-sent', (data) => {
            this.files.audio.push({
                fileName: this.writeToDisk(data.audio, data.part),
                time: data.time
            });
            this.files.video.push({
                fileName: this.writeToDisk(data.video, data.part),
                time: data.time
            });
        });
    }

    writeToDisk(data, part) {
        var fileName = data.name;
        var dataURL = data.contents;
        var fileExt = fileName.split('.').pop(),
            fileWithBase = `${config.get('upload_dir')}/${fileName}-part-${part}`,
            filePath = `${fileWithBase}.${fileExt}`,
            fileID = 2,
            fileBuffer;

        while (fs.existsSync(filePath)) {
            filePath = `${fileWithBase}(${fileID}).${fileExt}`;
            fileID += 1;
        }

        dataURL = dataURL.split(',').pop();
        fileBuffer = new Buffer(dataURL, "base64");
        fs.writeFileSync(filePath, fileBuffer);
        return filePath;
    }
}

export default SockListener;
export { SockListener };
