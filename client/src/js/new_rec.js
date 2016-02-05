/* globals navigator */
/* globals document */
/* globals $ */
/* globals io */
/* globals alert */
/* globals window */
// /* globals RecordRTC */
/* globals getUserMedia */
/* globals MultiStreamRecorder */
/* globals rec */

const config = require('config');

// let instance = null;

class RecorderNew {
    constructor(remote) {
        // if (!instance) {
        //     instance = this;
        // }
        this.remote = remote;
        this.sock = undefined;
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
        this.recorder = undefined;
        this.tempRecorder = undefined;
        this.partCount = 0;
        this.isStopping = false;

        this.sendRate = 30; // seconds

        this.startRecTime = 0;
        this.startRecOtherTime = 0;
        this.endRecTime = 0;
        this.setSocketIO();
        this.setHandlers();
        // return instance;
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

        // this.sock.on('send-stream', () => {
        //     this.sendStream();
        // });

        this.sock.on('done-streaming', () => {
            this.remote.app.quit();
        });
    }

    setHandlers() {
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
            console.log(this.audioSelect);
            if (this.videoSelect.find('option').length < 1) {
                alert('You have no video devices :(');
                return;
            }
            console.log(this.videoSelect);

            this.btnStart.prop('disabled', true);
            this.startRecording();
            this.sock.emit('start-recording', {
                name: this.slugify(this.bandName),
                time: Date.now()
            });
        });

        this.btnStop.on('click', () => {
            this.isStopping = true;
            this.btnStart.prop('disabled', false);
            this.btnStop.prop('disabled', true);
            this.recorder.stop();
        });
    }

    getAvailableSources(types = { audio: true, video: true }) {
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

    startRecording() {
        getUserMedia(this.getSelectedSources(), (err, stream) => {
            // if (err) {
            //     console.error(err);
            // }
            this.recorder = new MultiStreamRecorder(stream);
            this.videoElement.attr('src', window.URL.createObjectURL(stream));
            this.videoElement.get(0).play();

            this.videoElement.get(0).muted = true;
            this.videoElement.get(0).controls = false;
            this.recorder.audioChannels = 1;

            this.recorder.ondataavailable = this.sendStream;

            this.recorder.partCount = 0;
            this.recorder.sock = this.sock;
            this.recorder.bandName =


            this.recorder.start(this.sendRate * 1000);
            this.btnStop.prop('disabled', false);
        });
    }


    // sendStream(stop = false) {
    sendStream(blobs) {
        // this.partCount += 1;
        // this.sock.emit('stream-sent-new', {
        //     audio: blobs.audio,
        //     video: blobs.video,
        //     band: this.bandName,
        //     part: this.partCount,
        //     time: Date.now(),
        //     stop: this.isStopping
        // });

        rec.partCount += 1;
        var audioURL = window.URL.createObjectURL(blobs.audio);
        console.log(audioURL);
        rec.sock.emit('stream-sent-new', {
            audio: blobs.audio,
            video: blobs.video,
            // audio: window.URL.createObjectURL(blobs.audio),
            // video: window.URL.createObjectURL(blobs.video),
            band: rec.slugify(rec.bandName),
            part: rec.partCount,
            time: Date.now(),
            stop: rec.isStopping
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

    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
}

module.exports = RecorderNew;
global.RecorderNew = RecorderNew;
