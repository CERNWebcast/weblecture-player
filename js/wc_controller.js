/*
 * Adaptive Streaming and Synchronization Controller
 *
 * @author Simon Vocella
 * <simon.vocella@cern.ch>
 */

var WC_debug = false;
var WC_debug_timecode = false;
var WC_debug_adapstream = false;

//Implement Date.now if it's not exists
if (!Date.now) {
	Date.now = function now() {
		return +(new Date);
	}
}

var AdaSyncController = (function() {
	/** The object itself */
	proxy = {};

	/** Array of players */
	proxy.players = Array();

	/** Number of ready player, useful for autostart */
	proxy.ready = 0;

	/** Boolean for autostart */
	proxy.autostart = true;

	/** Last Timecode arrays for timecode handling */
	proxy.lastTimecode = Array();

	/** Last Time now arrays for timecode handling */
	proxy.lastTimenow = Array();

	/** Boolean that is true when one video is paused for buffering */
	proxy.pausedForBuffering = false;

	/** Boolean that is true when you click to playing */
	proxy.clickForPlaying = false

	/** The maximum difference between videos' timecode and timenow */
	proxy.rangeDiffTmTn = 1000;

	/** The minimal bandwidth percentage for the video */
	proxy.minimalBwPercentage = 5;

	/** The interval for syncStatus */
	proxy.syncedInterval = 100;

	/** Function that parse timecode in Date Javascript Object */
	proxy.parseTimecode = function(date, timecode) {
		ds = date.split("-");
		ts = timecode.split(":");
		tz = ts[2].split(".");
		month = parseInt(ds[1])-1;
		return new Date(ds[2], month, ds[0], ts[0], ts[1], tz[0], tz[1]).valueOf();
	}

	/** Function that syncronize the status between videos */
	proxy.syncStatus = function() {
		if(proxy.players[0].getState() == 'IDLE' && proxy.players[1].getState() == 'IDLE')
			return;

		/**
		* If both videos are playing check the timecode, the difference between timenow and timecode in camera should be the same in slides, if no change the buffer time
		* else check the status and change the status of one video when the another one is changed
		*/

		if(proxy.players[0].getState() == 'PLAYING' && proxy.players[1].getState() == 'PLAYING') {
			if(typeof proxy.lastTimecode[proxy.players[0].id] !== "undefined" && proxy.lastTimecode[proxy.players[0].id] != null
				&& typeof proxy.lastTimecode[proxy.players[1].id] !== "undefined" && proxy.lastTimecode[proxy.players[1].id] != null) {
				var timenowDiff = proxy.lastTimenow[proxy.players[0].id] - proxy.lastTimenow[proxy.players[1].id];
				var timecodeDiff = proxy.lastTimecode[proxy.players[0].id] - proxy.lastTimecode[proxy.players[1].id];
				var enlapsed = timecodeDiff - timenowDiff;

				//if(WC_debug_timecode) console.log(	"timenowdiff: "+proxy.lastTimenow[proxy.players[0].id]+"-"+proxy.lastTimenow[proxy.players[1].id]+"="+timenowDiff+
				//									", timecodeDiff: "+proxy.lastTimecode[proxy.players[0].id]+"-"+proxy.lastTimecode[proxy.players[1].id]+"="+timecodeDiff+
				//									", enlapsed: "+timecodeDiff+"-"+timenowDiff+"="+enlapsed);

				if(Math.abs(enlapsed) > proxy.rangeDiffTmTn) {
					if(enlapsed > 0) {
						if(proxy.players[0].getBufferTime() == 10) return;
						var newBufferTime = Math.round((proxy.players[0].getBufferTime()*1000 + enlapsed)/1000);
						if(newBufferTime > 10) newBufferTime = 10;
						if(WC_debug_timecode) console.log(proxy.players[0].id+", SET bufferTime for "+proxy.players[0].id+" to "+newBufferTime+", past bufferTime: "+proxy.players[0].getBufferTime());
						proxy.players[0].setBufferTime(newBufferTime);
					} else {
						if(proxy.players[1].getBufferTime() == 10) return;
						var newBufferTime = Math.round((proxy.players[1].getBufferTime()*1000 + (enlapsed))/1000);
						if(newBufferTime < 0) newBufferTime = 0;
						if(WC_debug_timecode) console.log(proxy.players[1].id+", SET bufferTime for "+proxy.players[1].id+" to "+newBufferTime+", past bufferTime: "+proxy.players[1].getBufferTime());
						proxy.players[1].setBufferTime(newBufferTime);
					}
				}

				// reset lastTimeNow and lastTimecode
				proxy.lastTimenow[proxy.players[0].id] = null;
				proxy.lastTimenow[proxy.players[1].id] = null;
				proxy.lastTimecode[proxy.players[0].id] = null;
				proxy.lastTimecode[proxy.players[1].id] = null;
			}
		} else {
			for(var i=0; i<proxy.players.length; i++) {
				/** If one video is idle and the other video is playing, this video will start */
				if(proxy.players[i].getState() == 'IDLE' && proxy.players[1-i].getState() == 'PLAYING') {
					if(WC_debug) console.log('PAUSE: '+proxy.players[i].id);
					proxy.players[i].pause(false);
					return;
				}

				/** If one video is buffering, the other video will wait */
				if(proxy.players[i].getState() == 'PLAYING' && proxy.players[1-i].getState() == 'BUFFERING') {
					if(WC_debug) console.log('PAUSE by buffering: '+proxy.players[i].id);
					proxy.players[i].pause(true);
					proxy.players[i].waitingFor();
					proxy.pausedForBuffering = true;
					return;
				}

				/** If one video is playing now after buffering, the other video will start */
				if(proxy.players[i].getState() == 'PAUSED' && proxy.players[1-i].getState() == 'PLAYING' && (proxy.pausedForBuffering || proxy.clickForPlaying)) {
					if(WC_debug) console.log('STOP PAUSE: '+proxy.players[i].id);
					proxy.players[i].pause(false);
					proxy.pausedForBuffering = false;
					proxy.clickForPlaying = false;
					return;
				}

				/** If one video is paused, the other video will pause */
				if(proxy.players[i].getState() == 'PLAYING' && proxy.players[1-i].getState() == 'PAUSED' && !proxy.pausedForBuffering && !proxy.clickForPlaying) {
					if(WC_debug) console.log('PAUSE: '+proxy.players[i].id);
					proxy.players[i].pause(true);
					return;
				}
			}
		}
	}

	/** Play all players */
	proxy.play = function(state) {
		for(var i=0; i<proxy.players.length; i++) {
			if(proxy.players[i].getState() == 'PAUSED' &&  state == false)
				continue;
			if((proxy.players[i].getState() == 'PLAYING' || proxy.players[i].getState() == 'BUFFERING') &&  state == true)
				continue;
			if(WC_debug) console.log(proxy.players[i].id+" play: "+state+" "+proxy.players[i].getState());
			proxy.players[i].play(state);
		}
	}

	/** Stop all players */
	proxy.stop = function() {
		for(var i=0; i<proxy.players.length; i++)
			proxy.players[i].stop();
	}

	/** Get the worst level of the player */
	proxy.getWorstLevel = function(player) {
		var levels = player.getPlaylistItem()['levels'];
		var worstLevel = 0;

		for(var i=1; i<levels.length; i++) {
			//if(WC_debug) console.log(this.id+" -> "+levels[i].bitrate+" "+levels[i].width);
			if(levels[i].bitrate < levels[worstLevel].bitrate)
				worstLevel = i;
		}

		return levels[worstLevel];
	}

	/**
	*	If one of the two videos is fullscreen, then
	*		get the worst level of the another one and then set the bandwidth percentange
	*		set the remaining bandwidth percentage to the fullscreen video that will
	*			choose the best choice with the remaining bandwidth
	*/
	proxy.changeBandwidthPercentage = function(bandwidthcalculated) {
		bandwidthcalculated = parseInt(bandwidthcalculated, 10);
		
		if(isNaN(bandwidthcalculated) || bandwidthcalculated == 0)
			return;
	
		var allNormalState = true;
		for(var i=0; i<proxy.players.length; i++) {
			if(proxy.players[i].getFullscreen()) {
				allNormalState = false;

				if(proxy.players[i].getBandwidthPercentage() == 50) {
					var worstLevel = proxy.getWorstLevel(proxy.players[1-i]);
					var bandwidthPercentageCalculated = worstLevel.bitrate * 100 / bandwidthcalculated;
					var bandwidthPercentage = Math.round(bandwidthPercentageCalculated);

					if(Math.round(bandwidthPercentage) < proxy.minimalBwPercentage) {
						bandwidthPercentage = proxy.minimalBwPercentage;
					}

					proxy.players[i].setBandwidthPercentage(100 - bandwidthPercentage);
					proxy.players[1-i].setBandwidthPercentage(bandwidthPercentage);
				}
			}
		}

		if(allNormalState) {
			if(proxy.players[0].getBandwidthPercentage() != 50) {
				proxy.players[0].setBandwidthPercentage(50);
				proxy.players[1].setBandwidthPercentage(50);
			}
		}
	}

	/** OnReady Handler: all videos start simultaneously if autostart = true */
	proxy.onReady = function() {
		proxy.ready += 1;
		if(WC_debug) console.log(this.id+" is ready: "+proxy.ready);
		if(proxy.ready == proxy.players.length) {
			if(proxy.autostart) {
				proxy.play(true);
			}
			setInterval(proxy.syncStatus, proxy.syncedInterval);
		}
	}

	/** onFullscreen Handler: change the bandwidth percentage */
	proxy.onFullscreen = function(event) {
		if(WC_debug) console.log(this.id+" is fullscreen");
		proxy.changeBandwidthPercentage(this.getBandwidthCalculated());
	}

	/** onBeforePlay Handler: set to true clickForPlaying for syncStatus issue */
	proxy.onBeforePlay = function() {
		if(WC_debug) console.log(this.id+" is onBeforePlay");
		proxy.clickForPlaying = true;
	}

	/** onMeta Handler: check timecode and bandwidth meta event */
	proxy.onMeta = function(event) {
		var metadata = event.metadata;
		//if(WC_debug) console.log(metadata);
		if(metadata.type) {
			if(metadata.type == 'timecode') {
				proxy.lastTimenow[this.id] = Date.now();
				proxy.lastTimecode[this.id] = proxy.parseTimecode(metadata.sd, metadata.st);
			}
			if(metadata.type == 'bandwidth') {
				if(WC_debug_adapstream) console.log(this.id+" -> bandwidthcalculated: "+metadata.bandwidthcalculated+" kbps, bandwidth: "+
								metadata.bandwidth+" kbps, bandwidthPercentage: "+this.getBandwidthPercentage()+", width: "+
								metadata.width+", current level: {id: "+metadata.level+", bitrate: "+
								this.getPlaylistItem()['levels'][metadata.level].bitrate+", width: "+
								this.getPlaylistItem()['levels'][metadata.level].width+"}");
				proxy.changeBandwidthPercentage(metadata.bandwidthcalculated);
			}
			if(metadata.type == 'resize') {
				if(WC_debug_adapstream) console.log(this.id+" ->  after resize, width: "+metadata.width+", configbandwidth: "+
								metadata.configbandwidth+" kbps, configwidth: "+metadata.configwidth+", current level:{id: "+
								metadata.level+", bitrate: "+this.getPlaylistItem()['levels'][metadata.level].bitrate+
								", width: "+this.getPlaylistItem()['levels'][metadata.level].width+"}");
			}
		}
		if(metadata.code) {
			if(metadata.code == 'NetStream.Play.Transition') {
				if(WC_debug_adapstream) console.log(metadata.id+" "+metadata.description);
			}
			if(metadata.code == 'NetStream.Play.TransitionComplete') {
				if(WC_debug_adapstream) console.log("********** "+metadata.id+" "+metadata.description);
			}
		}
	}

	/** global methods to be returned */
	global = {};

	/**
	* Initialize function:
	* 	cameraPlayer: id of camera jwplayer
	*	slidesPlayer: id of slides jwplayer
	*/
	global.initialize = function(cameraPlayer, slidesPlayer, autostart) {
		/** Clear the player array */
		proxy.players.splice(0, proxy.players.length);

		cameraPlayer = document.getElementById(cameraPlayer);
		slidesPlayer = document.getElementById(slidesPlayer);

		if(!cameraPlayer || !slidesPlayer)
			return;

		/** Add the players */
		proxy.players.push(jwplayer(cameraPlayer));
		proxy.players.push(jwplayer(slidesPlayer));

		/** Set autostart */
		proxy.autostart = autostart;

		if(WC_debug) console.log("AdaSyncController: DEBUG MODE ON");

		/** Modding of the players */
		proxy.players[0]
			.setBandwidthPercentage(50)
			.onMeta(proxy.onMeta)
			.onFullscreen(proxy.onFullscreen)
			.onBeforePlay(proxy.onBeforePlay)
			.setVolume(100)
			.setMute(false);

		proxy.players[1]
			.setBandwidthPercentage(50)
			.onMeta(proxy.onMeta)
			.onFullscreen(proxy.onFullscreen)
			.onBeforePlay(proxy.onBeforePlay)
			.setMute(true);

		/**
		*   Sometimes the dispatch of onReady event is too fast
		*	so we need this workaround
		*/
		for(var i=0; i<proxy.players.length; i++) {
			if(proxy.players[i].isReady()) {
				proxy.onReady();
			} else {
				proxy.players[i].onReady(proxy.onReady);
			}
		}
	}

	return global;
}());