/* globals FileReader */

import fs from 'fs';
import config from 'config';
import jsonfile from 'jsonfile';
import FileReader from 'filereader';
import * as debugUtils from './debugUtils';

// function slugify(text) {
//     return text.toString().toLowerCase()
//         .replace(/\s+/g, '-')
//         .replace(/[^\w\-]+/g, '')
//         .replace(/\-\-+/g, '-')
//         .replace(/^-+/, '')
//         .replace(/-+$/, '');
// }

function blobToBase64(blob, cb) {
    var reader = new FileReader();
    reader.onload = () => {
        var dataURL = reader.result;
        cb(dataURL);
    };
    reader.readAsDataURL(blob);
}

class SockListener {
    constructor(socket) {
        console.log('Creating new SockListener');
        this.socket = socket;
        this.intervalID = 0;
        this.bandName = '';
        this.startTime = 0;
        this.dirName = '';
        this.files = {audio: [], video: []};
        this.setupSocket();
    }

    setupSocket() {
        console.log('A user has connected.');
        this.socket.on('testing-socket', (data) => {
            console.log("Testing socket connection. If you're seeing this, I'm assuming it worked.");
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
            // this.intervalID = setInterval(() => {
            //     this.socket.emit('send-stream');
            // }, 30000);
            var dirName = `${config.get('upload_dir')}/${this.startTime}-${this.bandName}`;
            this.dirName = dirName;
            fs.mkdirSync(`${dirName}`);
        });

        // this.socket.on('stream-sent', (data) => {
        //     console.log('Stream has been sent.');
        //     this.files.audio.push({
        //         fileName: this.writeToDisk(data.audio, data.part),
        //         time: data.time,
        //         part: data.part
        //     });
        //     this.files.video.push({
        //         fileName: this.writeToDisk(data.video, data.part),
        //         time: data.time,
        //         part: data.part
        //     });
        //
        //     if (data.stop) {
        //         this.stopStream(data.time);
        //         this.socket.emit('done-streaming');
        //     }
        // });

        // this.socket.on('stream-sent', (data) => {
        //     console.log('Stream has been sent.');
        //     if (data.band == this.bandName) {
        //         // this.files.audio.push({
        //         //     fileName: this.writeToDisk(data.audio, data.part),
        //         //     time: data.time,
        //         //     part: data.part
        //         // });
        //         // this.files.video.push({
        //         //     fileName: this.writeToDisk(data.video, data.part),
        //         //     time: data.time,
        //         //     part: data.part
        //         // });
        //
        //         this.writeToDisk(data);
        //
        //
        //         if (data.stop) {
        //             this.stopStream(data.time);
        //             this.socket.emit('done-streaming');
        //         }
        //     }
        // });

        this.socket.on('stream-sent', (data) => {
            console.log('Stream has been sent.');
            if (data.band == this.bandName) {
                this.writeToDisk(data);
                if (data.stop) {
                    this.stopStream(data.time);
                    this.socket.emit('done-streaming');
                }
            }
        });

        this.socket.on('stream-sent-new', (data) => {
            console.log('Stream has been sent (new).');
            console.log('My Band:', this.bandName);
            console.log('Sent Band:', data.band);
            console.log('Part:', data.part);
            console.log('Time:', data.time);
            console.log('Stop:', data.stop);
            console.log('Type of Audio:', typeof data.audio);
            console.log('Audio Is Buffer?:', data.audio instanceof Buffer);
            console.log('Type of Video:', typeof data.video);
            console.log('Video Is Buffer?:', data.video instanceof Buffer);
            if (data.band == this.bandName) {
                // this.writeToDisk(data, 'blob');
                this.writeToDisk(data, 'buffer');
                if (data.stop) {
                    this.stopStream(data.time);
                    // this.socket.emit('done-streaming');
                }
            }
        });
    }

    // writeToDisk(data, part) {
    writeToDiskBackup(data, part) {
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

    writeToDisk(data, type = 'base64') {
        var saveBuffer = (buf, filePath) => {
            fs.writeFileSync(filePath, buf);
        };

        var saveBase64 = (dataURL, filePath) => {
            // dataURL = dataURL.split(',').pop();
            // var fileBuffer = new Buffer(dataURL.split(',').pop(), "base64");
            // fs.writeFileSync(filePath, new Buffer(dataURL.split(',').pop(), "base64"));
            saveBuffer(new Buffer(dataURL.split(',').pop(), "base64"), filePath);
        };

        var saveBlob = (blob, filePath) => {
            blobToBase64(blob, (dataURL) => {
                saveBase64(dataURL, filePath);
            });
        };

        var audioFileName = `part-${data.part}-audio.wav`;
        var videoFileName = `part-${data.part}-video.webm`;
        var audioPath = `${this.dirName}/${audioFileName}`;
        var videoPath = `${this.dirName}/${videoFileName}`;
        this.files.audio.push({
            name: audioFileName,
            time: data.time,
            part: data.part
        });
        this.files.video.push({
            name: videoFileName,
            time: data.time,
            part: data.part
        });
        // saveBase64(data.audio, audioPath);
        // saveBase64(data.video, videoPath);
        switch (type) {
            case "blob":
                saveBlob(data.audio, audioPath);
                saveBlob(data.video, videoPath);
                break;
            case "base64":
                saveBase64(data.audio, audioPath);
                saveBase64(data.video, videoPath);
                break;
            case "buffer":
                saveBuffer(data.audio, audioPath);
                saveBuffer(data.video, videoPath);
                break;
        }
        // saveBlob(data.audio, audioPath);
        // saveBlob(data.video, videoPath);
    }

    stopStream(time) {
        console.log('Stopping stream.');
        var jsonObj = {
            endTime: time,
            startTime: this.startTime,
            files: this.files
        };
        // var infoFileName = `${config.get('upload_dir')}/${this.bandName}-info.json`;
        var infoFileName = `${this.dirName}/info.json`;
        jsonfile.writeFileSync(infoFileName, jsonObj, { spaces: "\t" });
        var ffmpegData = {audio: '', video: ''};

        var audioFiles = this.files.audio.sort((a, b) => a.part - b.part);
        var videoFiles = this.files.video.sort((a, b) => a.part - b.part);
        for (var audioFile of audioFiles) {
            ffmpegData.audio += (`file '${audioFile.name}'`+"\n");
        }
        for (var videoFile of videoFiles) {
            ffmpegData.video += (`file '${videoFile.name}'`+"\n");
        }
        fs.writeFileSync(`${this.dirName}/ffmpeg_audio.txt`, ffmpegData.audio);
        fs.writeFileSync(`${this.dirName}/ffmpeg_video.txt`, ffmpegData.video);
        this.startTime = 0;
        clearInterval(this.intervalID);
        this.intervalID = 0;
        this.bandName = '';
        this.files = { audio: [], video: [] };
    }
}

export default SockListener;
export { SockListener };
