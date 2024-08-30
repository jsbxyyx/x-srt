(function (xhr) {

    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;
    var setRequestHeader = XHR.setRequestHeader;

    XHR.open = function (method, url) {
        this._method = method;
        this._url = url;
        this._requestHeaders = {};
        this._startTime = (new Date()).toISOString();

        return open.apply(this, arguments);
    };

    XHR.setRequestHeader = function (header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
    };

    XHR.send = function (postData) {

        this.addEventListener('load', function () {
            var endTime = (new Date()).toISOString();
            var url_ = this._url;
            if (url_.indexOf(".baidu.com/") > -1) {
                baidu_handle(this)
            }
        });

        return send.apply(this, arguments);
    };

})(XMLHttpRequest);

var tag = '[x-srt]'
var vmap = {}

function baidu_handle(xhr) {
    var url_ = xhr._url;
    var responseType_ = xhr.responseType
    var response_ = xhr.response
    var status_ = xhr.status
    if (url_.indexOf("/video/netdisk-videotran") > -1) {
        var responseURL_ = xhr.responseURL
        baidu_disk_video(status_, responseType_, response_, responseURL_)
    }
}

function baidu_disk_video(status, responseType, response, responseURL) {
    console.log('x-srt', status, responseType, response, responseURL)

    function show_srt(video, srt_text) {
        document.querySelector(".vp-video__subtitle-text").style.display = "block";
        var subtitle = document.querySelector(".vp-video__subtitle-text-first")
        subtitle.innerText = srt_text
    }

    var videos = document.querySelectorAll('video')
    if (!videos) {
        console.log(tag, 'video not found')
        return
    }

    var searchParams = new URLSearchParams(new URL(responseURL).search.substring(1))
    var ts_size = searchParams.get("ts_size")
    var len = searchParams.get("len")
    var dtime = searchParams.get("dtime")
    var range = searchParams.get("range")
    var range_split = range.split("-")
    var range_min = parseInt(range_split[0])
    var range_max = parseInt(range_split[1])
    var fsid = searchParams.get("fsid")
    var fn = searchParams.get("fn")
    if (vmap[fsid] == null) {
        vmap[fsid] = {}
    }
    vmap[fsid]['ts_size'] = ts_size
    vmap[fsid]['len'] = len
    vmap[fsid]['dtime'] = dtime
    vmap[fsid]['range_min'] = range_min
    vmap[fsid]['range_max'] = range_max
    vmap[fsid]['fn'] = fn

    var play_time = document.querySelector(".vp-video__control-bar--play-time-all .vp-video__control-bar--play-time")
    var total_play_time = 0
    if (play_time) {
        var split = play_time.innerText.split(":")
        total_play_time = parseInt(split[0]) * 60 * 60 + (parseInt(split[1]) * 60) + parseInt(split[2])
    }
    vmap[fsid]['play_time'] = total_play_time

    for (var idx in videos) {
        var video = videos[idx]
        if (!video.getAttribute) {
            continue
        }
        var hasListener = video.getAttribute("x-srt")
        if (hasListener == null) {
            video.setAttribute("x-srt", "1")
            video.addEventListener('timeupdate', () => {
                var currentTime = video.currentTime
                var bitrate = parseInt(vmap[fsid]['bitrate'])
                if (bitrate == null || isNaN(bitrate)) {
                    console.log(tag, "bitrate is NaN")
                    return
                }
                var byte_position = Math.floor(currentTime * bitrate / 8)
                console.log(tag, 'currentTime:' + currentTime, 'byte_position:' + byte_position)
                var srt_list = vmap[fsid]['srt']
                for (var idx in srt_list) {
                    var item = srt_list[idx]
                    if (item[0] <= byte_position && byte_position <= item[1]) {
                        console.log(tag, 'show srt ' + item[2])
                        show_srt(video, item[2])
                    }
                }
            }, {once: true})
        }
    }

    fetch(responseURL, {
        method: 'GET'
    }).then(res => res.arrayBuffer())
        .then(res => {
            var formData = new FormData();
            var fileBlob = new Blob([res], {type: 'application/octet-stream'});
            formData.append('file', fileBlob, fsid + "-" + range_min + "-" + range_max + "-" + fn);
            fetch('http://127.0.0.1:20000/stt', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    console.log('x-srt:', data);
                    if (vmap[fsid]['srt'] == null) {
                        vmap[fsid]['srt'] = []
                    }
                    vmap[fsid]['srt'].push([range_min, range_max, data.text])
                    vmap[fsid]['bitrate'] = data.bitrate
                    console.log(tag, vmap[fsid])
                })
                .catch((error) => {
                    console.error(tag, error);
                });
        })
        .catch((err) => {
            console.log(err)
        })
}
