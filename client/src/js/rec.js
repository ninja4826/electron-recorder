// import test from './test';
var config = require('config');

class Recorder {
    constructor() {
        var bandName = config.get('Client.bandName');
        document.title = bandName;
        $('#band-name').text(bandName);
        this.videoElement = $('video#videoElement');
        this.btnStart = $('button.btn.btn-success#record_start');
        this.btnStop = $('button.btn.btn-danger#record_stop');
        this.btnRefresh = $('button.btn.btn-default#refresh');
        this.audioSelect = $('select#audio-select');
        this.videoSelect = $('select#video-select');
        this.recordAudio = undefined;
        this.recordVideo = undefined;
        console.log(this);

        this.setHandlers();
    }

    getAvailableSources(refresh = false) {

        if (refresh) {
            this.audioSelect.html('');
            this.videoSelect.html('');
        }

        navigator.mediaDevices.enumerateDevices().then((infos) => {
            for (var info of infos) {
                var option = $('<option>');
                option.val(info.deviceId);
                var options;
                if (info.kind === 'audioinput') {
                    options = this.audioSelect.find('option');
                    option.text(info.label || 'Microphone ' + (options.length + 1));
                    this.audioSelect.append(option);
                } else if (info.kind === 'videoinput') {
                    options = this.videoSelect.find('option');
                    option.text(info.label || 'Camera ' + (options.length + 1));
                    this.videoSelect.append(option);
                } else {
                    console.log('Some other kind of source:', info);
                }
            }
        });
    }

    setHandlers() {
        console.log(this);

        this.btnRefresh.on('click', () => {
            this.getAvailableSources(true);
        });

        this.btnStart.on('click', () => {

            console.log(this.audioSelect);
            if (this.audioSelect.find('option').length < 1) {
                alert('You have no audio devices :(');
                return;
            }
            console.log(this.videoSelect);
            if (this.videoSelect.find('option').length < 1) {
                alert('You have no video devices :(');
                return;
            }

            this.btnStart.prop('disabled', true);
            getUserMedia(this.getSelectedSources(), (err, stream) => {
                this.videoElement.attr('src', window.URL.createObjectURL(stream));
                this.videoElement.play();
                this.recordAudio = RecordRTC(stream, { bufferSize: 16384 });
                this.recordVideo = RecordRTC(stream, { type: 'video' });

                this.recordAudio.startRecording();
                this.recordVideo.startRecording();
                this.btnStop.prop('disabled', false);
            });
        });

        this.btnStop.on('click', () => {
            var onStopRecording = () => {
                this.recordAudio.getDataURL((audioDataURL) => {
                    recordVideo.getDataURL((videoDataURL) => {
                        this.postFiles(audioDataURL, videoDataURL);
                    });
                });
            };

            this.btnStart.prop('disabled', false);
            this.btnStop.prop('disabled', true);

            this.recordAudio.stopRecording(() => {
                this.recordVideo.stopRecording(() => {
                    onStopRecording();
                });
            });
        });
    }

    postFiles(audioDataURL, videoDataURL) {
        var fileName = this.slugify(config.get('Client.bandName'));
        var files = {
            audio: {
                name: fileName + '.webm',
                type: 'video/webm',
                contents: audioDataURL
            },
            video: {
                name: fileName + '.webm',
                type: 'video/webm',
                contents: videoDataURL
            }
        };

        this.videoElement.attr('src', '');
        var hostName = config.get('Client.host');
        if (hostName.split('.').length === 4) {
            hostName += `:${config.get('Client.port')}`;
        }
        $.post(hostName, files, (data) => {
            console.log(data);
            alert('Done!');
        });
    }

    getSelectedSources() {
        var audioSource = this.audioSelect.val();
        var videoSource = this.videoSelect.val();
        var constraints = {
            audio: {
                optional: [{
                    sourceId: audioSource
                }]
            },
            video: {
                optional: [{
                    sourceId: videoSource
                }]
            }
        };

        return constraints;
    }

    // gotSources(infos) {
    //     console.log(this);
    //     console.log('ugh');
    //     for (var info of infos) {
    //         var option = $('<option>');
    //         option.val(info.id);
    //         if (info.kind === 'audio') {
    //             option.text(info.label || 'microphone ' + (this.audioSelect.options.length + 1));
    //             this.audioSelect.append(option);
    //         } else if (info.kind === 'video') {
    //             option.text(info.label || 'camera ' + (this.videoSelect.options.length + 1));
    //             this.videoSelect.append(option);
    //         } else {
    //             console.log('Some other kind of source:', info);
    //         }
    //     }
    // }

    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
}

// var Recorder = function() {
//     this.videoElement = $('video#videoElement');
//     this.btnStart = $('button.btn.btn-success#record_start');
//     this.btnStop = $('button.btn.btn-danger#record_stop');
//     this.audioSelect = $('select#audio-select');
//     this.videoSelect = $('select#video-select');
//     this.recordAudio = undefined;
//     this.recordVideo = undefined;
//
//     MediaStreamTrack.getSources(this.gotSources);
//
//     this.setHandlers();
// };
//
// Recorder.prototype = {
//     setHandlers: function() {
//         var that = this;
//         this.btnStart.on('click', function() {
//             that.btnStart.prop('disabled', true);
//             getUserMedia(that.getSelectedSources(), function(err, stream) {
//                 that.videoElement.attr('src', window.URL.createObjectURL(stream));
//                 that.videoElement.play();
//                 that.recordAudio = RecordRTC(stream, { bufferSize: 16384 });
//                 that.recordVideo = RecordRTC(stream, { type: 'video' });
//
//                 that.recordAudio.startRecording();
//                 that.recordVideo.startRecording();
//                 that.btnStop.prop('disabled', false);
//             });
//         });
//
//         this.btnStop.on('click', function() {
//             var onStopRecording = function() {
//                 that.recordAudio.getDataURL(function(audioDataURL) {
//                     that.recordVideo.getDataURL(function(videoDataURL) {
//                         that.postFiles(audioDataURL, videoDataURL);
//                     });
//                 });
//             };
//
//             that.btnStart.prop('disabled', false);
//             that.btnStop.prop('disabled', true);
//
//             that.recordAudio.stopRecording(function() {
//                 that.recordVideo.stopRecording(function() {
//                     onStopRecording();
//                 });
//             });
//         });
//     },
//     postFiles: function(audioDataURL, videoDataURL) {
//         var fileName = this.slugify(config.get('Client.bandName'));
//         var files = {
//             audio: {
//                 name: fileName + '.webm',
//                 type: 'video/webm',
//                 contents: audioDataURL
//             },
//             video: {
//                 name: fileName + '.webm',
//                 type: 'video/webm',
//                 contents: videoDataURL
//             }
//         };
//
//         this.videoElement.attr('src', '');
//         $.post('rec.ninja4826.me', files, function(data) {
//             alert('Done!');
//         });
//     },
//     getSelectedSources: function() {
//         var audioSource = this.audioSelect.val();
//         var videoSource = this.videoSelect.val();
//         var constraints = {
//             audio: {
//                 optional: [{
//                     sourceId: audioSource
//                 }]
//             },
//             video: {
//                 optional: [{
//                     sourceId: videoSource
//                 }]
//             }
//         };
//
//         return constraints;
//     },
//     gotSources: function(infos) {
//         console.dir(this);
//         console.log('ugh');
//         // for (var info of infos) {
//         for (var i = 0; i < infos.length; i++) {
//             var info = infos[i];
//             var option = $('<option>');
//             option.val(info.id);
//             if (info.kind === 'audio') {
//                 option.text(info.label || 'microphone ' + (this.audioSelect.options.length + 1));
//                 this.audioSelect.append(option);
//             } else if (info.kind === 'video') {
//                 option.text(info.label || 'camera ' + (this.videoSelect.options.length + 1));
//                 this.videoSelect.append(option);
//             } else {
//                 console.log('Some other kind of source:', info);
//             }
//         }
//     },
//     slugify: function(text) {
//         return text.toString().toLowerCase()
//             .replace(/\s+/g, '-')
//             .replace(/[^\w\-]+/g, '')
//             .replace(/\-\-+/g, '-')
//             .replace(/^-+/, '')
//             .replace(/-+$/, '');
//     }
// };

// export default Recorder;
module.exports = Recorder;
global.Recorder = Recorder;
