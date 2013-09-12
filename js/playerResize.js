/* ------- RESIZE PLAYER FUNCTIONS --------------------------------------------------------------- */
// Percentage of the player size, relative to the screen
var cameraPlayerPercentage = 40;
var slidesPlayerPercentage = 50;

// Height crop of the player 
var crop = 300;

var PR_cameraContainer = null;
var cameraAR = null; // Aspect Ratio
var PR_cameraPlayer = null; // jwplayer

var PR_slideContainer = null;
var slideAR = null; // Aspect Ratio
var PR_slidesPlayer = null;

var cameraPlayerReady = false; // Setted to true if it's ready or if it's not in page
var slidesPlayerReady = false; // Setted to true if it's ready or if it's not in page

// calculate and return new dimensions
function getNewPlayersDims(W, H, aspectRatio, percentage, crop, type){
	var object = {};
	var videoPlayerW = (W * percentage) / 100;
	var videoPlayerH = videoPlayerW / aspectRatio;
	
	if (videoPlayerH >= (H - crop)) {
		videoPlayerH = (H - crop);
		videoPlayerW = videoPlayerH * aspectRatio;
	}
	
	object.width = Math.floor(videoPlayerW);
	object.height = Math.floor(videoPlayerH);
	
	return object;
}

function content_resize(container) {
	if(!cameraPlayerReady || !slidesPlayerReady) return;

	var width = $(container).width() - 50;
	var height = $(container).height();
	
	var cameraResult = {};
	var slideResult = {};
	cameraResult.width = 0; cameraResult.height = 0;
	slideResult.width = 0; slideResult.height = 0;
	
	var cameraExists = document.getElementById('cameraPlayer_container');
	var slidesExists = document.getElementById('slidesPlayer_container');
	
	// check which player exists
	if (cameraExists && $(cameraExists).is(":visible") && slidesExists && $(slidesExists).is(":visible")){
			// both players are there
			cameraResult = getNewPlayersDims(width, height, cameraAR, cameraPlayerPercentage, crop, 'camera');
			slideResult = getNewPlayersDims(width, height, slideAR, slidesPlayerPercentage, crop, 'slides');
			
			$(cameraExists).css('float', 'left');
			$(slidesExists).css('float', 'left');
			
			PR_cameraPlayer.resize(cameraResult.width, cameraResult.height);
			PR_slidesPlayer.resize(slideResult.width, slideResult.height);
	} else {
		if (cameraExists && $(cameraExists).is(":visible")){
			// only camera is there
			cameraResult = getNewPlayersDims(width, height, cameraAR, 90, crop, 'camera');
			PR_cameraPlayer.resize(cameraResult.width, cameraResult.height);
			// align to center
			$(cameraExists).css('float', 'none');
			$('#cameraPlayer_wrapper').css('margin', '0 auto');
		} else if (slidesExists && $(slidesExists).is(":visible")){
			// only slides is there
			slideResult = getNewPlayersDims(width, height, slideAR, 90, crop, 'slides');
			PR_slidesPlayer.resize(slideResult.width, slideResult.height);
			// align to center
			$(slidesExists).css('float', 'none');
			$('#slidesPlayer_wrapper').css('margin', '0 auto');
		}
	}

	// Resize the container of the player(s) / This will center the players in the middle of the page
	$('.player').css('width', cameraResult.width + slideResult.width + 50);
}

// detect browser resize
(function($){
	$.fn.wresize = function(f) {
		version = '1.1';
		wresize = {
			fired : false,
			width : 0
		};

		function resizeOnce() {
			if ($.browser.msie) {
				if (!wresize.fired) {
					wresize.fired = true;
				} else {
					var version = parseInt($.browser.version, 10);
					wresize.fired = false;
					if (version < 7) {
						return false;
					} else if (version == 7) {
						// a vertical resize is fired once, an horizontal resize
						// twice
						var width = $(window).width();
						if (width != wresize.width) {
							wresize.width = width;
							return false;
						}
					}
				}
			}

			return true;
		}

		function handleWResize(e) {
			if (resizeOnce()) {
				return f.apply(this, [ e ]);
			}
		}

		this.each(function() {
			if (this == window) {
				$(this).resize(handleWResize);
			} else {
				$(this).resize(f);
			}
		});

		return this;
	};
})(jQuery);

/* ------- MENU VIEW MODES --------------------------------------------------------------- */
$('#modeCamera').click(function(){
	// reload the page showing only camera
	var view = getURLParameter('view');
	if (view != 'modeCamera')
		window.location.href = buildQueryViewMode() + '&view=modeCamera';
});
$('#modeSlides').click(function(){
	// reload the page showing only camera
	var view = getURLParameter('view');
	if (view != 'modeSlides')
		window.location.href = buildQueryViewMode() + '&view=modeSlides';
});
$('#modeStandard').click(function(){
	// reload the page showing only camera
	var view = getURLParameter('view');
	if (view != 'modeStandard')
		window.location.href = buildQueryViewMode() + '&view=modeStandard';
});

$('#modeSeparate').click(function(){
	var eventId = $('#play_eventId').val();
	var type = $('#play_type').val();

	var cameraWidth = 320;
	var cameraHeight = 240;
	// stop current players
	if ( document.getElementById('cameraPlayer') ){
		var cameraPlayer = jwplayer('cameraPlayer');
		cameraPlayer.stop();
		cameraWidth = cameraPlayer.getWidth();
		cameraHeight = cameraPlayer.getHeight();
	}

	var slidesWidth = 640;
	var slidesHeight = 480;
	if ( document.getElementById('slidesPlayer') ){
		var slidesPlayer = jwplayer('slidesPlayer');
		slidesPlayer.stop();
		slidesWidth = slidesPlayer.getWidth();
		slidesHeight = slidesPlayer.getHeight();
	}

	// close the menu
	$('#viewModes .dropdown.open .dropdown-toggle').dropdown('toggle');

	// open 2 popups, one for camera, one for slides
	var options = 'directories=0, location=0, menubar=0, scrollbars=0, status=0, titlebar=0, toolbar=0, ';

	window.open('playPopup.php?type='+type+'&event='+eventId+'&player=camera', '', options + 'width='+cameraWidth+', height='+(cameraHeight+50) );
	window.open('playPopup.php?type='+type+'&event='+eventId+'&player=slides', '', options + 'width='+slidesWidth+', height='+(slidesHeight+50)+', left='+(cameraWidth+50) );
});