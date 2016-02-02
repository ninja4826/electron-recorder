/* globals navigator */
/* globals document */
/* globals $ */
/* globals io */
/* globals alert */
/* globals window */
/* globals RecordRTC */
/* globals getUserMedia */

var config = require('config');

class Recorder {
    constructor() {
        this.bandName = config.get('Client.bandName');
        document.title = this.bandName;
        $('#band-name').text(this.bandName);
        this.statusElement = $('span#status');
        this.videoElement = $('video#videoElement');
        this.btnStart = $('button.btn.btn-success#record_start');
        this.btnStop = $('button.btn.btn-danger#record_stop');
        this.btnRefresh = $('button.btn.btn-default#refresh');
        this.audioSelect = $('select#audio-select');
        this.videoSelect = $('select#video-select');
        this.recordAudio = undefined;
        this.recordVideo = undefined;
        this.partCount = 0;
        this.setSocketIO();
        this.setHandlers();
    }

    setSocketIO() {
        var sockURL = config.get('Client.host');
        if (sockURL.split('.').length === 4) {
            sockURL += `:${config.get('Client.port')}`;
        }

        this.sock = io(sockURL);

        this.sock.on('connect', () => {
            this.btnStart.prop('disabled', false);
            this.statusElement.text('Connected');
        });

        this.sock.on('send-stream', () => {
            this.sendStream();
        });
    }

    testSocket() {
        var obj = {
            audio: {
                type: 'audio/wav',
                name: 'blah.wav'
            },
            video: {
                type: 'video/webm',
                name: 'blah.webm'
            }
        };

        this.sock.emit('message', obj);
    }

    // getAvailableSources(refresh = false, types = {audio: true, video: true}) {
    getAvailableSources(types = {audio: true, video: true}) {
        var addOption = (info, select) => {
            select.append($(`<option value="${info.deviceId}">${info.label}</option>`));
        };

        if (types.audio) {
            this.audioSelect.html('');
        }
        if (types.video) {
            this.videoSelect.html('');
        }

        navigator.mediaDevices.enumerateDevices().then((infos) => {
            infos.forEach((info) => {
                if (types.audio && info.kind === 'audioinput') {
                    if (info.label && info.deviceId !== 'default' && info.deviceId !== 'communications') {
                        addOption(info, this.audioSelect);
                    }
                } else if (types.video && info.kind === 'videoinput') {
                    if (info.label) {
                        addOption(info, this.videoSelect);
                    }
                }
            });
        });
    }

    sendStream(restart = true) {
        this.partCount += 1;
        var now = Date.now();
        this.recordAudio.stopRecording(() => {
            this.recordVideo.stopRecording(() => {
                this.recordAudio.getDataURL((audioDataURL) => {
                    this.recordVideo.getDataURL((videoDataURL) => {
                        if (restart) {
                            this.startRecording();
                        }
                        this.sock.emit('stream-sent', {
                            audio: {
                                name: `${this.slugify(this.bandName)}-audio.wav`,
                                type: 'video/webm',
                                contents: audioDataURL
                            },
                            video: {
                                name: `${this.slugify(this.bandName)}-video.wav`,
                                type: 'video/webm',
                                contents: videoDataURL
                            },
                            part: this.partCount,
                            time: now
                        });
                    });
                });
            });
        });
    }

    startRecording() {
        getUserMedia(this.getSelectedSources(), (err, stream) => {
            this.recordVideo = RecordRTC(stream, { type: 'video' });
            this.recordAudio = RecordRTC(stream, {
                bufferSize: 16384,
                onAudioProcessStarted: () => {
                    this.recordVideo.startRecording();

                    this.videoElement.attr('src', window.URL.createObjectURL(stream));
                    this.videoElement.get(0).play();

                    this.videoElement.get(0).muted = true;
                    this.videoElement.get(0).controls = false;
                }
            });
            this.recordAudio.startRecording();
            this.btnStop.prop('disabled', false);
        });
    }

    setHandlers() {
        console.log(this);

        this.btnRefresh.on('click', () => {
            this.getAvailableSources(true);
        });

        $(document).on('click', 'button.refresh', (e) => {
            var btn = $(e.currentTarget);
            var refType = btn.attr('refresh-type');
            var obj = (refType === 'audio' ? {audio:true,video:false} : {audio:false,video:true});
            this.getAvailableSources(true, obj);
        });

        this.btnStart.on('click', () => {
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
            this.startRecording();
            this.sock.emit('started-recording', {
                name: this.bandName,
                time: Date.now()
            });

            // console.log(this.audioSelect);
            // if (this.audioSelect.find('option').length < 1) {
            //     alert('You have no audio devices :(');
            //     return;
            // }
            // console.log(this.videoSelect);
            // if (this.videoSelect.find('option').length < 1) {
            //     alert('You have no video devices :(');
            //     return;
            // }
            //
            // this.btnStart.prop('disabled', true);
            // getUserMedia(this.getSelectedSources(), (err, stream) => {
            //     this.recordVideo = RecordRTC(stream, { type: 'video' });
            //     this.recordAudio = RecordRTC(stream, {
            //         bufferSize: 16384,
            //         onAudioProcessStarted: () => {
            //             this.recordVideo.startRecording();
            //
            //             this.videoElement.attr('src', window.URL.createObjectURL(stream));
            //             this.videoElement.get(0).play();
            //
            //             this.videoElement.get(0).muted = true;
            //             this.videoElement.get(0).controls = false;
            //         }
            //     });
            //     this.recordAudio.startRecording();
            //     this.btnStop.prop('disabled', false);
            // });
        });

        this.btnStop.on('click', () => {
            this.sendStream(false);
            this.sock.emit('stop-recording', {
                time: Date.now()
            });

            // var onStopRecording = () => {
            //     console.log('onStopRecording() has been called.');
            //     this.recordAudio.getDataURL((audioDataURL) => {
            //         console.log('audioDataURL:', audioDataURL);
            //         this.recordVideo.getDataURL((videoDataURL) => {
            //             console.log('videoDataURL:', videoDataURL);
            //             this.postFiles(audioDataURL, videoDataURL);
            //         });
            //     });
            // };
            //
            // this.btnStart.prop('disabled', false);
            // this.btnStop.prop('disabled', true);
            //
            // this.recordAudio.stopRecording(() => {
            //     this.recordVideo.stopRecording(() => {
            //         console.log('onStopRecording() is about to be called.');
            //         onStopRecording();
            //     });
            // });
        });
    }

    postFiles(audioDataURL, videoDataURL) {
        console.log('Posting files.');
        var fileName = this.slugify(this.bandName);
        var files = {
            audio: {
                name: fileName + '-audio.wav',
                type: 'video/webm',
                contents: audioDataURL
            },
            video: {
                name: fileName + '-video.webm',
                type: 'video/webm',
                contents: videoDataURL
            }
        };

        this.videoElement.attr('src', '');
        var hostName = config.get('Client.host');
        if (hostName.split('.').length === 4) {
            hostName += `:${config.get('Client.port')}`;
        }
        console.log(hostName);
        console.log(files);
        $.post(`${hostName}/upload`, files, (data) => {
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
