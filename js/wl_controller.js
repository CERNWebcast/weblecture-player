/* 
 * WebLecture Controller
 *
 * @author Simon Vocella
 * <simon.vocella@cern.ch>
 */

var WLP_debug = false;

var WebLectureController = (function() {
	/** The object itself */
	var proxy = {};
	
	/** Array of players */
	proxy.players = Array();
	
	/** Array of thumbs */
	proxy.thumbs = new Array();
	
	/** Which slide is choosed */
	proxy.choosedSlide = 0;
	
	/** Which slide is choosed */
	proxy.choosedChapter = 0;
	
	/** Last known  position */
	proxy.lastPosition = 0;
	
	/** If the slide is clicked */
	proxy.clicking = false;
	
	/** Size of the image, for example we show that size when it's clicked */
	proxy.slideWidth;
	proxy.slideHeight;
	
	/** Size of the thumb when hover in is fired */
	proxy.hoverWidth;
	proxy.hoverHeight;
	
	/** Size of the thumb */
	proxy.thumbWidth;
	proxy.thumbHeight;
	
	/** Padding of the thumbs */
	proxy.paddingLeft = 5;
	proxy.paddingRight = 5;
	proxy.paddingBottom = 3;
	proxy.paddingTop = 0;
	
	/** Sizes with padding useful for calculations */
	proxy.slideWidthWithPadding;
	proxy.slideHeightWithPadding;
	proxy.hoverWidthWithPadding;
	proxy.hoverHeightWithPadding;
	proxy.thumbWidthWithPadding;
	proxy.thumbHeightWithPadding;
	
	/** The slideContainer */
	proxy.slideContainer;
	
	/** The viewportContainer */
	proxy.viewportContainer;
	
	/** The thumbContainer */
	proxy.thumbContainer;
	
	/** The thumbContainer width */
	proxy.thumbContainerWidth;
	
	/** Delay in animation */
	proxy.delay = 50;
	
	/** In this array we memorize which thumb.begin */
	proxy.whichThumbs = new Array();
	
	/** The maximum difference between videos' position */
	proxy.rangePosition = 1;
	
	/** how many time handling event to set to false the clicking parameter */
	proxy.howmanyTimeHandling = 3;
	
	/** Control bar */
	proxy.controlbar;
	
	/** Div of play button */
	proxy.playDiv;
	
	/** Array of chapters */
	proxy.chapters = new Array();
	
	/** In this array we memorize which chapter.begin */
	proxy.whichChapters = new Array();
	
	/** Duration of the video lecture */
	proxy.duration = -1;
	
	/** Dir of lecture.xml */
	proxy.lectureDir;
	
	/** In this function first we search if match the object.lastMiddle set and if not the simple binary_search */
	proxy.chachedBinarySetSearch = function(lastMiddle, array, key, low, high) {
		if(WLP_debug) console.log("chachedBinarySetSearch");
		if(lastMiddle == -1) return proxy.binarySetSearch(array, key, low, high);
		else {
			if((key >= array[lastMiddle] && lastMiddle == array.length-1) || (key >= array[lastMiddle] && key < array[lastMiddle+1])) 
				return lastMiddle;
			if(array[lastMiddle] >= key) {
				return proxy.binarySetSearch(array, key, low, lastMiddle-1);
			} else {
				return proxy.binarySetSearch(array, key, lastMiddle+1, high);
			}
		}
	}
	
	/** Function that search in O(square(n)) the key in the set */
	proxy.binarySetSearch = function(array, key, low, high) {
		if(WLP_debug) console.log("binarySetSearch");
		if(low > high) return -1;
		var middle = parseInt((low+high)/2, 10);
		if((key >= array[middle] && middle == array.length-1) || (key >= array[middle] && key < array[middle+1])) 
			return middle;
		if(array[middle] >= key)
			return proxy.binarySetSearch(array, key, low, middle-1);
		else
			return proxy.binarySetSearch(array, key, middle+1, high);
	}
	
	/** Function that format time from seconds to h m s */
	proxy.formatTime = function(time) {
		if(WLP_debug) console.log("formatTime");
		if(!time) return;
		var stime = "";
		if(time%60!=0) stime = parseInt((time%60), 10) + "s" + stime;
		if(time%3600!=0 && time > 60) stime = parseInt((time%3600)/60, 10) + "m " + stime;
		if(time > 3600) stime = parseInt(time/3600, 10) + "h " + stime;
		return stime;
	}
	
	/** Function that format time from seconds to 00:00:00 */
	proxy.formatTime2 = function(time) {
		if(WLP_debug) console.log("formatTime2");
		if(!time) return;
		var stime = "";
		var seconds = '00';
		if(time%60!=0) {
			seconds = parseInt((time%60), 10);
			if(seconds < 10) seconds = '0' + seconds;
		}
		stime = seconds + stime;
		
		var minutes = '00';
		if(time%3600!=0 && time > 60) {
			minutes = parseInt((time%3600)/60, 10);
			if(minutes < 10) minutes = '0' + minutes;
		}
		stime = minutes + ":" + stime;
		
		var hours = '00';
		if(time > 3600) {
			hours = parseInt(time/3600, 10);
			if(hours < 10) hours = '0' + hours;
		}
		stime = hours + ":" + stime;
		return stime;
	}
	
	/** 
		Change slide function:
		@param:
		- newSlide: the new slide selected
		@operation:
		- Set proxy.choosedSlide
		- Set the info in slideInfoDiv
		- Enlarge the slide choosed
		- Shrink the previous slide
	*/
	proxy.changeSlide = function(newSlide) {
		if(WLP_debug) console.log("CHANGE SLIDE in: "+(newSlide+1));
		if(newSlide < 0 || newSlide >= proxy.thumbs.length) return;
		if(newSlide == proxy.choosedSlide) return;
		var prevSlide = proxy.choosedSlide;
		proxy.choosedSlide = newSlide;
		proxy.slideInfoDiv.html('Slide '+(proxy.choosedSlide+1)+'/'+proxy.thumbs.length);
		$("#thumb"+newSlide).animate({width: proxy.slideWidth, height: proxy.slideHeight, top: 0}, proxy.delay);
		$("#divTime"+newSlide).animate({top: 0}, proxy.delay);
		$("#thumb"+prevSlide).animate({width: proxy.thumbWidth, height: proxy.thumbHeight, top: proxy.slideHeight - proxy.thumbHeight}, proxy.delay);
		$("#divTime"+prevSlide).animate({top: proxy.slideHeight - proxy.thumbHeight}, proxy.delay);
	}
	
	/** 
		Change chapter function:
		@param:
		- newChapter: the new chapter selected
		@operation:
		- Set proxy.choosedChapter
		- Set the value in proxy.chaptersContainer
		- Set the info in proxy.nameInfoDiv for the Chapter Title
		- Set the info in proxy.speakerInfoDiv for the Speaker Name
	*/
	proxy.changeChapter = function(newChapter) {
		if(WLP_debug) console.log("CHANGE CHAPTER in: "+(newChapter+1));
		if(newChapter < 0 || newChapter >= proxy.chapters.length) return;
		if(newChapter == proxy.choosedChapter) return;
		proxy.choosedChapter = newChapter;
		proxy.chaptersContainer.find('select').val(newChapter);
		proxy.nameInfoDiv.html('Chapter: '+proxy.chapters[newChapter].title);
		proxy.speakerInfoDiv.html('Speaker: '+proxy.chapters[newChapter].speaker);
	}
	
	/**
		Click position function:
		@param:
		- newPosition: the new position selected
		@operation:
		- Set proxy.lastPosition to newPosition
		- Set progressDiv info
		- Set playhead in track div
		- Call proxy.changeSlide
		- Call proxy.changeChapter
	*/
	proxy.changePosition = function(newPosition) {
		if(WLP_debug) console.log("changePosition in: "+newPosition);
		proxy.lastPosition = newPosition;
		proxy.progressDiv.html(proxy.formatTime2(proxy.lastPosition));
		var playhead = parseInt(proxy.lastPosition/proxy.duration * proxy.trackWidth, 10);
		proxy.playhead.css('width', playhead);
		var choosingSlide = proxy.chachedBinarySetSearch(proxy.choosedSlide, proxy.whichThumbs, proxy.lastPosition, 0, proxy.whichThumbs.length);
		proxy.changeSlide(choosingSlide);
		
		if(proxy.chapterExists) {
			var choosingChapter = proxy.chachedBinarySetSearch(proxy.choosedChapter, proxy.whichChapters, proxy.lastPosition, 0, proxy.whichChapters.length);
			proxy.changeChapter(choosingChapter);
		}
	}
	
	proxy.updateScrollbar = function(newLeft) {
		if(WLP_debug) console.log("updateScrollbar in: "+newLeft);
		if(typeof proxy.slideContainer.data('tsb') === "undefined") return;
		if(newLeft < 0 || newLeft > proxy.thumbContainerWidth) return;
		if(newLeft > proxy.thumbContainerWidth - proxy.slideContainer.width()) {
			proxy.slideContainer.tinyscrollbar_update(proxy.thumbContainerWidth - proxy.slideContainer.width());
		} else {
			proxy.slideContainer.tinyscrollbar_update(newLeft);
		}
	}
	
	/**
		Click slide function:
		@param:
		- newSlide: the new slide selected
		- newPosition: the new position selected
		@operation:
		- Set proxy.clicking to proxy.howmanyTimeHandling for buggy seeking
		- Set proxy.lastPosition to the beginning of the slide or the newPosition
		- Seek every player to proxy.lastPosition
		- Call proxy.changePosition
		- Change slider left property
	*/
	proxy.clickSlide = function(newSlide, newPosition) {
		if(WLP_debug) console.log("CLICK SLIDE: "+(newSlide+1)+", begin: "+proxy.thumbs[newSlide].begin+" and go to "+(newSlide*proxy.thumbWidthWithPadding));
		if(newSlide < 0 || newSlide >= proxy.thumbs.length) return;
		if(newSlide == proxy.choosedSlide && proxy.lastPosition == newPosition) return;
		proxy.clicking = proxy.howmanyTimeHandling;
		if(typeof newPosition === "undefined") 
			newPosition = proxy.thumbs[newSlide].begin;
		for(var i=0; i<proxy.players.length; i++) {
			proxy.players[i].seek(newPosition);
		}
		proxy.changePosition(newPosition);
		proxy.updateScrollbar(newSlide*proxy.thumbWidthWithPadding);
	}
	
	/**
		Click chapter function 
		@param:
		- newChapter: the new chapter selected
		@operation:
		- Call clickSlide with slide of the newChapter.begin at position newChapter.begin
	*/
	proxy.clickChapter = function(newChapter) {
		if(WLP_debug) console.log("CLICK CHAPTER: "+(newChapter+1)+" "+proxy.chapters[newChapter].begin);
		if(newChapter < 0 || newChapter >= proxy.chapters.length) return;
		if(newChapter == proxy.choosedChapter) return;
		var choosingSlide = proxy.chachedBinarySetSearch(proxy.choosedSlide, proxy.whichThumbs, proxy.chapters[newChapter].begin, 0, proxy.whichThumbs.length);
		proxy.clickSlide(choosingSlide, proxy.chapters[newChapter].begin);
	}
	
	/** Hover In slide function */
	proxy.hoverInSlide = function() {
		var slide = this.id.replace("divThumb", "");
		slide = parseInt(slide, 10);
		if(WLP_debug) console.log("HOVER IN SLIDE: "+slide);
		if(proxy.choosedSlide == slide) return;
		$("#thumb"+slide).animate({width: proxy.hoverWidth, height: proxy.hoverHeight, top: proxy.slideHeight - proxy.hoverHeight}, proxy.delay);
		$("#divTime"+slide).animate({top: proxy.slideHeight - proxy.hoverHeight}, proxy.delay);
	}
	
	/** Hover Out slide function */
	proxy.hoverOutSlide = function() {
		var slide = this.id.replace("divThumb", "");
		slide = parseInt(slide, 10);
		if(WLP_debug) console.log("HOVER OUT SLIDE: "+slide);
		if(proxy.choosedSlide == slide) return;
		$("#thumb"+slide).animate({width: proxy.thumbWidth, height: proxy.thumbHeight, top: proxy.slideHeight - proxy.thumbHeight}, proxy.delay);
		$("#divTime"+slide).animate({top: proxy.slideHeight - proxy.thumbHeight}, proxy.delay);
	}
	
	/** OnTime Handler */
	proxy.onTime = function(event) {
		if(WLP_debug) console.log("onTime");
		
		var newPosition = parseInt(event.position, 10);
		
		//Workaround for buggy seeking in jwplayer http streaming for key stream
		if(proxy.clicking > 0 && newPosition <= proxy.lastPosition) return;
		if(proxy.clicking > 0) {
			proxy.clicking = proxy.clicking - 1;
			return;
		}
		
		proxy.changePosition(newPosition);
	}
	
	/** Play all players */
	proxy.play = function(state) {
		if(WLP_debug) console.log("play: "+STATE);
		for(var i=0; i<proxy.players.length; i++) {
			if(proxy.players[i].getState() == 'PAUSED' &&  state == false)
				continue;
			if((proxy.players[i].getState() == 'PLAYING' || proxy.players[i].getState() == 'BUFFERING') &&  state == true)
				continue;
			proxy.players[i].play(state);
		}
	}

	/** onResize Handler */
	proxy.onResize = function() {
		if(WLP_debug) console.log("onResize");
		proxy.trackWidth = proxy.controlbar.width() - proxy.trackLeft;
		proxy.trackDiv.css('width', proxy.trackWidth);
		var playhead = parseInt(proxy.lastPosition/proxy.duration * proxy.trackWidth, 10);
		proxy.playhead.css('width', playhead);
		//proxy.slideContainer.tinyscrollbar({axis: 'x'});
		proxy.slideContainer.tinyscrollbar_update('relative');
	}

	/** Setup of proxy.players */
	proxy.setupPlayers = function(players) {
		if(WLP_debug) console.log("setupPlayers");
		
		var player_0 = $(players[0]);
		var player_1 = $(players[1]);
		
		if(player_0.length == 0 && player_1.length == 0) throw "No players div founded";
			
		/** Clear the player array */
		proxy.players.splice(0, proxy.players.length);
	
		/** Add the players */
		if(player_0) proxy.players.push(jwplayer(player_0[0]));
		if(player_1) proxy.players.push(jwplayer(player_1[0]));

		/** Modding of the players */
		for(var i=0; i<proxy.players.length; i++)
			proxy.players[i].onTime(proxy.onTime);
		
		proxy.players[0]
			.onPlay(function(e) {
				proxy.playDiv[0].className = "pause";
			})
			.onPause(function() {
				proxy.playDiv[0].className = "play";
			})
			.onMute(function(e) {
				if(e.mute == true)
					proxy.sound[0].className = "unmute";
				else
					proxy.sound[0].className = "mute";
			});
	}
	
	/** Setup of the proxy.controlbar */
	proxy.setupControlbar = function(controlbar) {
		if(WLP_debug) console.log("setupControlbar");
	
		proxy.controlbar = $(controlbar);
		proxy.playDiv = proxy.controlbar.children("#play");
		proxy.playDiv.bind('click', function() {
			proxy.play(this.className == "play");
		});
		proxy.sound = proxy.controlbar.children("#sound");
		proxy.sound.bind('click', function() {
			if(this.className == "mute") this.className = "unmute";
			else this.className = "mute";
			proxy.players[0].setMute(this.className == "unmute");
		});
		
		var time = proxy.controlbar.children(".time");
		proxy.durationDiv = time.children(".duration");
		proxy.durationDiv.html('00:00:00');
		proxy.progressDiv = time.children(".progress");
		proxy.progressDiv.html('00:00:00');
		proxy.trackDiv = proxy.controlbar.children(".track");
		proxy.trackLeft = proxy.playDiv.width() + time.width() + proxy.sound.width() + 10;
		
		proxy.trackDiv.on('click', function(e) {
			if(proxy.duration != -1) {
				var offset = $(this).offset();
				var position = parseInt((e.clientX - offset.left)/proxy.trackWidth * proxy.duration, 10);
				var choosingSlide = proxy.chachedBinarySetSearch(proxy.choosedSlide, proxy.whichThumbs, position, 0, proxy.whichThumbs.length);
				proxy.clickSlide(choosingSlide, position);
			}
		});
		
		proxy.playhead = proxy.trackDiv.children(".playhead");
		proxy.controlbar.css('display', 'inline-block');
		proxy.trackWidth = proxy.controlbar.width() - proxy.trackLeft;
		proxy.trackDiv.css('width', proxy.trackWidth);
	}
	
	/** Setup of proxy.hightoolbar */
	proxy.setupHightoolbar = function(hightoolbar) {
		if(WLP_debug) console.log("setupHightoolbar");
		
		proxy.hightoolbar = $(hightoolbar);
		proxy.previousChapter = proxy.hightoolbar.children("#previous_chapter");
		proxy.previousChapter.bind('click', function() {
			proxy.clickChapter(proxy.choosedChapter-1);
		});
		var previousSlide = proxy.hightoolbar.children("#previous_slide");
		previousSlide.bind('click', function() {
			proxy.clickSlide(proxy.choosedSlide-1);
		});
		var nextSlide = proxy.hightoolbar.children("#next_slide");
		nextSlide.bind('click', function() {
			proxy.clickSlide(proxy.choosedSlide+1);
		});
		proxy.nextChapter = proxy.hightoolbar.children("#next_chapter");
		proxy.nextChapter.bind('click', function() {
			proxy.clickChapter(proxy.choosedChapter+1);
		});
		proxy.chaptersContainer = $("#list_chapter");
		proxy.slideInfoDiv = proxy.hightoolbar.children("#slide_info");
		proxy.chapterInfoDiv = proxy.hightoolbar.children("#chapter_info");
		proxy.nameInfoDiv = proxy.hightoolbar.find("#name_info");
		proxy.speakerInfoDiv = proxy.hightoolbar.find("#speaker_info");
		var videos = proxy.hightoolbar.children("#videos");
		videos.bind('click', function() {
			if(this.className == "hide_camera") {
				this.className = "hide_slides";
				$('#cameraPlayer_container').hide();
			} else {
				if(this.className == "hide_slides") {
					this.className = "show_both";
					$('#slidesPlayer_container').hide();
					$('#cameraPlayer_container').show();
				} else {
					this.className = "hide_camera";
					$('#slidesPlayer_container').show();
				}
			}
			$(window).trigger('resize');
		});
		var thumbs = proxy.hightoolbar.children("#thumbs");
		thumbs.bind('click', function() {
			if(this.className == "hide_thumbs") {
				this.className = "show_thumbs";
				proxy.slideContainer.hide();
			} else {
				this.className = "hide_thumbs";
				proxy.slideContainer.show();
			}
		});
	}

	proxy.setupWeblecturePlayer = function(data) {
		if(WLP_debug) console.log("setupWeblecturePlayer");
		
		var lecture = data.getElementsByTagName("LECTURE")[0];

		if(lecture === undefined) {
			return;
		}

		if(WLP_debug) console.log("SUCCESS LOAD LECTURE");

		// Set duration
		var duration = data.getElementsByTagName("DURATION")[0];
		proxy.durationDiv.html(duration.firstChild.nodeValue);
		proxy.duration = data.getElementsByTagName("DURATIONSEC")[0].firstChild.nodeValue;
		
		var slides = data.getElementsByTagName("SLIDE");
		proxy.slideWidth = parseInt(slides[0].getAttribute("WIDTH"), 10);
		proxy.slideHeight = parseInt(slides[0].getAttribute("HEIGHT"), 10);
		proxy.hoverWidth = parseInt(proxy.slideWidth * 3/4, 10);
		proxy.hoverHeight = parseInt(proxy.slideHeight * 3/4, 10);
		proxy.thumbWidth = parseInt(proxy.slideWidth * 2/3, 10);
		proxy.thumbHeight = parseInt(proxy.slideHeight * 2/3, 10);
		
		proxy.slideWidthWithPadding = proxy.slideWidth + proxy.paddingLeft + proxy.paddingRight;
		proxy.hoverWidthWithPadding = proxy.hoverWidth + proxy.paddingLeft + proxy.paddingRight;
		proxy.thumbWidthWithPadding = proxy.thumbWidth + proxy.paddingLeft + proxy.paddingRight;
		proxy.thumbContainerWidth = ((slides.length-1) * proxy.thumbWidthWithPadding + proxy.slideWidthWithPadding + proxy.hoverWidthWithPadding);
		
		proxy.slideHeightWithPadding = proxy.slideHeight + proxy.paddingBottom + proxy.paddingTop;
		proxy.hoverHeightWithPadding = proxy.hoverHeight + proxy.paddingBottom + proxy.paddingTop;
		proxy.thumbHeightWithPadding = proxy.thumbHeight + proxy.paddingBottom + proxy.paddingTop;
		
		proxy.thumbContainer.css('width', proxy.thumbContainerWidth);
		proxy.thumbContainer.css('height', proxy.slideHeightWithPadding);
		proxy.viewportContainer.css('height', proxy.slideHeightWithPadding);
		
		for(var index=0; index<slides.length; index++) {
			var thumb = {src: slides[index].getAttribute("SRC"), begin: parseInt(slides[index].getAttribute("BEGINSEC"), 10)};
			var time;
			if(index < slides.length - 1) {
				time = parseInt(slides[index+1].getAttribute("BEGINSEC"), 10) - thumb.begin;
			} else {
				time = proxy.duration - thumb.begin;
			}
			
			var div  = 	'<div class="noSelect" id="divThumb'+index+'"><img id="thumb'+index+'" src="'+proxy.lectureDir+'/'+thumb.src+'" />'
						+ '<div id="divTime'+index+'" class="time"> '+(index+1)+' | '+proxy.formatTime(time)+'</div></div>';
						
			proxy.thumbContainer.append(div);
			proxy.thumbs[index] = thumb;
			proxy.whichThumbs[index] = thumb.begin;
			
			var divImage = $("#divThumb"+index);
			divImage[0].index = index;
			divImage.css('height', proxy.slideHeight);
			divImage.css('padding-left', proxy.paddingLeft);
			divImage.css('padding-right', proxy.paddingRight);
			divImage.click(function() { proxy.clickSlide(this.index); });
			divImage.hover(proxy.hoverInSlide, proxy.hoverOutSlide);
			
			var image = $("#thumb"+index);
			var divTime = $("#divTime"+index);
			
			if(index > 0) {
				image.css('width', proxy.thumbWidth);
				image.css('height', proxy.thumbHeight);
				image.css('top', proxy.slideHeight - proxy.thumbHeight);
				divTime.css('top', proxy.slideHeight - proxy.thumbHeight);
				divTime.css('left', proxy.paddingLeft);
			} else {
				image.css('width', proxy.slideWidth);
				image.css('height', proxy.slideHeight);
				divTime.css('top', 0);
				divTime.css('left', proxy.paddingLeft);
			}
		}
		proxy.slideInfoDiv.html('Slide 1/'+proxy.thumbs.length);
		proxy.slideContainer.tinyscrollbar({axis: 'x'});
		
		var chapters = data.getElementsByTagName("CHAPTER");
		proxy.chapterExists = chapters.length > 0;
		if(proxy.chapterExists) {
			for(var index=0; index<chapters.length; index++) {
				var chapter = {
					title: chapters[index].getAttribute("TITLE"), 
					speaker: chapters[index].getAttribute("SPEAKERS"), 
					begin: parseInt(chapters[index].getAttribute("BEGINSEC"), 10)
				};
				proxy.chaptersContainer.children('select').append('<option value="'+index+'">'+(index+1)+" - "+chapter.title+'</option>');
				proxy.chapters[index] = chapter;
				proxy.whichChapters[index] = chapter.begin;
			}
			
			proxy.chaptersContainer.find('select').change(function() {
				proxy.clickChapter(parseInt(this.value, 10));
			});
			
			proxy.nameInfoDiv.html('Chapter: '+proxy.chapters[0].title);
			proxy.speakerInfoDiv.html('Speaker: '+proxy.chapters[0].speaker);
			proxy.chapterInfoDiv.show();
			proxy.chaptersContainer.show();
			proxy.previousChapter.show();
			proxy.nextChapter.show();
		}
	}

	/** global methods to be returned */
	global = {};
	
	/** 
	* Initialize function:
	* 	DTOObject: data transfer object
	*/
	global.initialize = function(DTOObject) {
		if(WLP_debug) console.log("WebLecture Controller: DEBUG MODE ON");
		
		if(!DTOObject.lectureData) console.log("No lecture data founded");
		var lectureData = DTOObject.lectureData;

		if(!DTOObject.players) console.log("No players founded");
		var players = DTOObject.players;
		
		if(!DTOObject.slideContainer) console.log("No slideContainer founded");
		var slideContainer = DTOObject.slideContainer;
		
		if(!DTOObject.controlbar) console.log("No controlbar founded");
		var controlbar = DTOObject.controlbar;
		
		if(!DTOObject.hightoolbar) console.log("No hightoolbar founded");
		var hightoolbar = DTOObject.hightoolbar;
		
		if(!DTOObject.lectureDir) console.log("No lectureDir founded");
		proxy.lectureDir = DTOObject.lectureDir;
		
		/** Setup of proxy.slideContainer */
		proxy.slideContainer = $(slideContainer);
		proxy.viewportContainer = proxy.slideContainer.children(".viewport");
		proxy.thumbContainer = proxy.viewportContainer.children(".overview");
		var scrollbarContainer = proxy.slideContainer.children(".scrollbar");
		$(window).wresize(proxy.onResize);
		
		var dfd = $.Deferred().done( 
			function() { proxy.setupPlayers(players); },
			function() { proxy.setupControlbar(controlbar); },
			function() { proxy.setupHightoolbar(hightoolbar); }
		).done(function() { proxy.setupWeblecturePlayer(lectureData); });
		
		dfd.resolve();
	}
	
	return global;
}());