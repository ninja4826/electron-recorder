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
        this.socket.on('message', (data) => {
            console.log(JSON.stringify(debugUtils.getKeys(data), null, 2));
        });

        this.socket.on('disconnect', () => {
            console.log('User has disconnected.');
            if (this.startTime !== 0) {
                console.log('User was in the middle of a recording.');
                console.log('Band name was:', this.bandName);
                this.stopStream(Date.now());
            }
        });

        this.socket.on('start-recording', (data) => {
            console.log('Recording has started.');
            this.bandName = data.name;
            this.startTime = data.time;
            this.intervalID = setInterval(() => {
                this.socket.emit('send-stream');
            }, 300000);
        });

        // this.socket.on('stop-recording', (data) => {
        //     console.log('Recording has stopped.');
        //     var jsonObj = {
        //         endTime: data.time,
        //         startTime: this.startTime,
        //         files: this.files
        //     };
        //     jsonfile.writeFileSync(`${config.get('upload_dir')}/${this.bandName}-info.json`, jsonObj, { spaces: "\t"});
        // });

        this.socket.on('stream-sent', (data) => {
            console.log('Stream has been sent.');
            this.files.audio.push({
                fileName: this.writeToDisk(data.audio, data.part),
                time: data.time,
                part: data.part
            });
            this.files.video.push({
                fileName: this.writeToDisk(data.video, data.part),
                time: data.time,
                part: data.part
            });

            if (data.stop) {
                this.stopStream(data.time);
                this.socket.emit('done-streaming');
            }
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
        console.log(filePath, 'has been written.');
        return filePath;
    }

    stopStream(time) {
        console.log('Stopping stream.');
        var jsonObj = {
            endTime: time,
            startTime: this.startTime,
            files: this.files
        };
        var infoFileName = `${config.get('upload_dir')}/${this.bandName}-info.json`;
        jsonfile.writeFileSync(infoFileName, jsonObj, { spaces: "\t" });
        this.startTime = 0;
        clearInterval(this.intervalID);
        this.intervalID = 0;
        this.bandName = '';
        this.files = { audio: [], video: [] };
    }
}

export default SockListener;
export { SockListener };
