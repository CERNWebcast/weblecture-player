
var Videoplayers_KeepInSync = (function(){

    var interval_keep_sync = 100, // milliseconds. it sets how often should be ckecked if player are in sync
        max_delay = 1000, // milliseconds. it sets the max delay between players
        // private vars
        _controller = {},
        _jw_camera_vp = null,
        _jw_slides_vp = null,
        _jw_videoplayers = [],
        _videoplayers_autostart = false,
        _videoplayers_ready = 0,
        _clicked_for_playing = false,
        _paused_for_buffering = false,
        _timecodes = [],
        _current_times = [];

    /********************************************************************************************/

    _controller.parse_timecode = function(date, timecode){
        var ds = date.split("-"),
            ts = timecode.split(":"),
            tz = ts[2].split("."),
            month = parseInt(ds[1], 10)-1;
        return new Date(ds[2], month, ds[0], ts[0], ts[1], tz[0], tz[1]).valueOf();
    };

    /* Get the lowest level of the adaptive bitrate qualities set */
    _controller.lowest_level = function(player){
        var levels = player.getPlaylistItem()['levels'],
            lowest = 0;

        for (var i=1; i<levels.length; i++){
            if (levels[i].bitrate < levels[lowest].bitrate)
                lowest = i;
        }
        return levels[lowest];
    };

    /**
     * When one videoplayers goes fullscreen, assign the lowest quality/bandwidth to the player
     * in normal state and let the other get the best quality on fullscreen
     */
    _controller.change_videoplayers_bandwidth = function(total_bw) {
        total_bw = parseInt(total_bw, 10);
        if (isNaN(total_bw) || total_bw === 0) return;

        var all_normal = true;
        for(var i=0; i<_jw_videoplayers.length; i++){
            if (_jw_videoplayers[i].getFullscreen()){
                // one player has changed to fullscreen
                all_normal = false;

                if (_jw_videoplayers[i].getBandwidthPercentage() === 50){
                    // before, they had both 50% of bandwidth each
                    // calculate the bandwidth for the lowest quality
                    var lowest = _controller.lowest_level(_jw_videoplayers[1-i]),
                        lowest_percent = Math.round(lowest.bitrate * 100 / total_bw);

                    // do not go below 5% of bandwidth
                    if (lowest_percent < 5) lowest_percent = 5;

                    // assign the lowest to the player in normal state
                    _jw_videoplayers[1-i].setBandwidthPercentage(lowest_percent);
                    // assing the remaining to the player in fullscreen state
                    _jw_videoplayers[i].setBandwidthPercentage(100 - lowest_percent);
                }
            }
        }

        if (all_normal && _jw_videoplayers[0].getBandwidthPercentage() != 50){
            // if now all are normale state and before one was fullscreen, put back the situation with both at 50%
            _jw_videoplayers[0].setBandwidthPercentage(50);
            _jw_videoplayers[1].setBandwidthPercentage(50);
        }
    };

    /** Function that syncronize the status between videos */
    _controller.sync = function(){
        if (_jw_videoplayers[0].getState() === 'IDLE' && _jw_videoplayers[1].getState() === 'IDLE')
            return;

        /*
         * When both players are playing, check the timecode sent in the stream.
         * The difference between timenow and timecode for camera player should be the same
         * (in a range 0 - max_delay) for slides players.
         * If outiside the range, adjust the videoplayers.
         *
         *    TIMECODE = CCODE          NOW = CNOW
         * CAMERA   |-----------------------|
         *
         *    TIMECODE = SCODE          NOW = SNOW
         * SLIDES   |-----------------------|
         *
         * CCODE - CNOW = SCODE - SNOW
         * max_delay > (diff = CCODE - CNOW - SCODE + SNOW)
         */

        if (_jw_videoplayers[0].getState() === 'PLAYING' && _jw_videoplayers[1].getState() === 'PLAYING'){
            // if we have the timecode, we proceed
            if (typeof _timecodes[_jw_videoplayers[0].id] !== "undefined" && _timecodes[_jw_videoplayers[0].id] !== null &&
                typeof _timecodes[_jw_videoplayers[1].id] !== "undefined" && _timecodes[_jw_videoplayers[1].id] !== null){

                var timenow_diff = _current_times[_jw_videoplayers[0].id] - _current_times[_jw_videoplayers[1].id],
                    timecode_diff = _timecodes[_jw_videoplayers[0].id] - _timecodes[_jw_videoplayers[1].id],
                    delay = timecode_diff - timenow_diff;

                if (Math.abs(delay) > max_delay){
                    // adjust buffering
                    if (delay > 0){
                        if (_jw_videoplayers[0].getBufferTime() === 10) return;
                        var new_buffer_time = Math.round((_jw_videoplayers[0].getBufferTime()*1000 + delay)/1000);
                        if (new_buffer_time > 10) new_buffer_time = 10;
                        _jw_videoplayers[0].setBufferTime(new_buffer_time);
                    } else {
                        if (_jw_videoplayers[1].getBufferTime() === 10) return;
                        var new_buffer_time = Math.round((_jw_videoplayers[1].getBufferTime()*1000 + delay)/1000);
                        if (new_buffer_time < 0) new_buffer_time = 0;
                        _jw_videoplayers[1].setBufferTime(new_buffer_time);
                    }
                }
            }
        } else {
            for (var i=0; i<_jw_videoplayers.length; i++){
                // if one videoplayer is IDLE and the other playing, start the one on IDLE
                if (_jw_videoplayers[i].getState() === 'IDLE' && _jw_videoplayers[1-i].getState() === 'PLAYING'){
                    _jw_videoplayers[i].pause(false);
                    return;
                }
                // if one videoplayer is buffering, pause the other
                if (_jw_videoplayers[i].getState() === 'PLAYING' && _jw_videoplayers[1-i].getState() === 'BUFFERING'){
                    _jw_videoplayers[i].pause(true);
                    _jw_videoplayers[i].waitingFor();
                    _paused_for_buffering = true;
                    return;
                }

                // if one videoplayer in now playing after buffering, start the other
                if (_jw_videoplayers[i].getState() === 'PAUSED' && _jw_videoplayers[1-i].getState() === 'PLAYING' && (_paused_for_buffering || _clicked_for_playing)){
                    _jw_videoplayers[i].pause(false);
                    _paused_for_buffering = false;
                    _clicked_for_playing = false;
                    return;
                }

                // if one videoplayer is paused, the other will pause too
                if(_jw_videoplayers[i].getState() === 'PLAYING' && _jw_videoplayers[1-i].getState() === 'PAUSED' && !_paused_for_buffering && !_clicked_for_playing) {
                    _jw_videoplayers[i].pause(true);
                    return;
                }
            }
        }
    };

    /********************************************************************************************/
    // Video players event handlers

    _controller.play = function(state){
        for (var i=0; i<_jw_videoplayers.length; i++){
            if (_jw_videoplayers[i].getState() === 'PAUSED' && !state)
                continue;
            if ((_jw_videoplayers[i].getState() === 'PLAYING' || _jw_videoplayers[i].getState() === 'BUFFERING') &&  state)
                continue;
            _jw_videoplayers[i].play(state);
        }
    };

    _controller.stop = function() {
        for (var i=0; i<_jw_videoplayers.length; i++)
            _jw_videoplayers[i].stop();
    };

    _controller.onReady = function() {
        // if autostart is true and all players are ready, start the players
        _videoplayers_ready += 1;
        if (_videoplayers_ready === _jw_videoplayers.length && _videoplayers_autostart){
            _controller.play(true);
            setInterval(_controller.sync, interval_keep_sync);
        }
    };

    _controller.onFullscreen = function(event){
        // change the bandwidth percent assingned to the players due to the fullscreen change
        _controller.change_videoplayers_bandwidth(this.getBandwidthCalculated());
    };

    _controller.onBeforePlay = function(){
        // this is needed to resolve some issues for the method sync_status
        _clicked_for_playing = true;
    };

    _controller.onMeta = function(event) {
        var metadata = event.metadata;
        if (metadata.type){
            // on timecode event, save the received time
            if (metadata.type === 'timecode'){
                console.log(event);
                _current_times[this.id] = Date.now();
                _timecodes[this.id] = _controller.parse_timecode(metadata.sd, metadata.st);
            }
            // on bandwidth event, change videoplayers bandwidth
            if (metadata.type === 'bandwidth'){
                _controller.change_videoplayers_bandwidth(metadata.bandwidthcalculated);
            }
            //if (metadata.type === 'resize'){}
        }
        /*if (metadata.code) {
            if (metadata.code === 'NetStream.Play.Transition') {}
            if (metadata.code === 'NetStream.Play.TransitionComplete'){}
        }*/
    };

    /********************************************************************************************/

    init = function(jw_camera_vp, jw_slides_vp, autostart){
        _jw_camera_vp = jw_camera_vp;
        _jw_slides_vp = jw_slides_vp;
        _videoplayers_autostart = autostart;

        _jw_videoplayers.push(_jw_camera_vp);
        _jw_videoplayers.push(_jw_slides_vp);

        _jw_camera_vp
            .setBandwidthPercentage(50)
            .onMeta(_controller.onMeta)
            .onFullscreen(_controller.onFullscreen)
            .onBeforePlay(_controller.onBeforePlay)
            .setVolume(100)
            .setMute(false);

        _jw_slides_vp
            .setBandwidthPercentage(50)
            .onMeta(_controller.onMeta)
            .onFullscreen(_controller.onFullscreen)
            .onBeforePlay(_controller.onBeforePlay)
            .setMute(true);

        /**
         * Sometimes the dispatch of onReady event is too fast
         * so we need this workaround
         */
        for (var i=0; i<_jw_videoplayers.length; i++){
            if (_jw_videoplayers[i].isReady()){
                _controller.onReady();
            } else {
                _jw_videoplayers[i].onReady(_controller.onReady);
            }
        }
    };

    return {
        init: init
    };

}());
