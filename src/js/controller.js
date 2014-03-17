var globals = {
    // note: vp used for videoplayer
    jw_videoplayers: [],
    jw_camera_vp: null,
    jw_slides_vp: null,
    camera_vp_ready: false,
    slides_vp_ready: false,
    camera_vp_container: document.getElementById('camera_vp_container'),
    slides_vp_container: document.getElementById('slides_vp_container'),
    camera_vp_visible: true,
    slides_vp_visible: true,
    player_mode: "html5",
    crop_adjustment: 0,
    // lecture xml params
    lecture: {
        fduration: "",
        duration: 0,
        title: "",
        speakers: [],
        date: "",
        time: "",
        thumbs_width: 0,
        thumbs_height: 0,
        thumbs: [],
        chapters: [],
    },
};

var Player = (function(){

    var p = { // set thumbs size compared to slides
        thumbs_small: { c: 0.80 }, // size of small thumbnail [0.1, 1]
        thumbs_hover: { c: 0.90 }, // size of thumbnail on hover [0.1, 1]
        thumbs_current: { c: 1 }, // size of current thumbnail [0.1, 1]
        thumbs_effect_delay: 100, // transition delay on mouse hover on thumbnails
        thumbs_padding_bottom: 5,
        // helper vars
        current_thumb: 0,
        current_chapter: 0,
        previous_seek_time: 0,
        controlbar_btns_width: 0,
        $scrollbar: null,
        current_centered: 0,
        cursor_vol_btn: false,
        cursor_vol_slider: false,
        first_onmute_event: true
    };

    /********************************************************************************************/

    init_topbar = function(){
        if (config.debug) console.log("Init topbar");

        $('#title').html(globals.lecture.title);
        $('#speakers').html(globals.lecture.speakers.join(', '));
        $('#when').html(Helpers.format_date(globals.lecture.date)+' at '+Helpers.format_time(globals.lecture.time));

        $('#previous_slide').click(function(){
            btn_prev_thumb_onClick();
        });
        $('#previous_slide').tooltip({placement: 'bottom', container: 'body'});

        $('#next_slide').click(function(){
            btn_next_thumb_onClick();
        });
        $('#next_slide').tooltip({placement: 'bottom', container: 'body'});

        $('#current_slide').html('1');
        $('#total_slides').html(globals.lecture.thumbs.length);

        // chapters
        if (globals.lecture.chapters.length > 0){
            $('#chaptersbar').show();
            // fill the chapters menu
            $(globals.lecture.chapters).each(function(i, _){
                $('<li>')
                    .attr('id', 'chapter_'+i)
                    .append(
                        $('<a>')
                            .attr('href', '#')
                            .html((i+1)+' - '+this.title+' ['+this.speakers.join(',')+']')
                            .click(function(){
                                btn_chapter_onClick(i);
                            })
                    ).appendTo('#chapters');
            });
            $('#chapter_0').addClass('active');
        } else {
            $('#chaptersbar').remove();
        }

        $('#toggles input:radio').change(function(){
            toggle_videos($(this).val());
        });
        $('#camera_only').parent().tooltip({placement: 'bottom', container: 'body', title: 'Show only camera videoplayer'});
        $('#slides_only').parent().tooltip({placement: 'bottom', container: 'body', title: 'Show only slides videoplayer'});
        $('#both_videos').parent().tooltip({placement: 'bottom', container: 'body', title: 'Show both camera and slides videoplayers'});

        $('#toggle_thumbs').click(function(){
            btn_toggle_thumbs_onClick();
        });
        $('#toggle_thumbs').tooltip({placement: 'bottom', container: 'body', title: 'Hide thumbnails'});

        $('#btn_link').tooltip({placement: 'bottom', container: 'body'});
        $('#btn_help').tooltip({placement: 'bottom', container: 'body'});

        $('#get-link').on('show.bs.modal', function(){
            var t = (p.previous_seek_time > 0) ? Helpers.format_sec2time(p.previous_seek_time) : '00:00:00',
                s = (p.current_thumb+1 < globals.lecture.thumbs.length) ? p.current_thumb+1 : globals.lecture.thumbs.length;
            $('#link1').val(Helpers.current_url());
            $('#link2').val(Helpers.current_url() + '&ftime=' + t);
            $('#link3').val(Helpers.current_url() + '&slide=' + s);
        });

    };

    init_videoplayers = function(){
        if (config.debug) console.log("Init videoplayers");

        globals.jw_camera_vp
            .onTime(onTime)
            .onSeek(onTime)
            .onPlay(function(){
                $('#btn_play').data('current', 'play');
                $('#btn_play span').removeClass('fa-play').addClass('fa-pause');
                $('#btn_play').tooltip('hide').attr('data-original-title', 'Click to pause').tooltip('fixTitle');
            })
            .onPause(function(){
                $('#btn_play').data('current', 'pause');
                $('#btn_play span').removeClass('fa-pause').addClass('fa-play');
                $('#btn_play').tooltip('hide').attr('data-original-title', 'Click to play').tooltip('fixTitle');
            })
            .onMute(function(e){
                if (e.mute === true){
                    $('#btn_volume').data('current', 'muted');
                    $('#btn_volume span').removeClass('fa-volume-up').addClass('fa-volume-off');
                    $('#btn_volume').tooltip('hide').attr('data-original-title', 'Click to unmute').tooltip('fixTitle');
                    $('#volume-slider').hide();
                } else {
                    $('#btn_volume').data('current', 'unmuted');
                    $('#btn_volume span').removeClass('fa-volume-off').addClass('fa-volume-up');
                    $('#btn_volume').tooltip('hide').attr('data-original-title', 'Click to mute').tooltip('fixTitle');
                    if (p.first_onmute_event)
                        volume_slider_show();
                }
                if (p.first_onmute_event) p.first_onmute_event = false;
            })
            .onBufferChange(function(e){
                //console.log(e);
            })
            .onComplete(function(){
                globals.jw_camera_vp.stop();
                globals.jw_slides_vp.stop();
            });
    };

    init_thumbnails = function(){
        if (config.debug) console.log("Init thumbails");

        p.thumbs_current.w = Math.round(globals.lecture.thumbs_width*p.thumbs_current.c);
        p.thumbs_current.h = Math.round(globals.lecture.thumbs_height*p.thumbs_current.c);
        p.thumbs_small.w = Math.round(globals.lecture.thumbs_width*p.thumbs_small.c);
        p.thumbs_small.h = Math.round(globals.lecture.thumbs_height*p.thumbs_small.c);
        p.thumbs_hover.w = Math.round(globals.lecture.thumbs_width*p.thumbs_hover.c);
        p.thumbs_hover.h = Math.round(globals.lecture.thumbs_height*p.thumbs_hover.c);

        $('#thumbnails_container').height(p.thumbs_current.h + p.thumbs_padding_bottom);

        // max width is the sum of widths for: 1 current, 1 hover, all rest small (+ padding 10px) + 50 of extra space
        var thumbs_width = Math.round(p.thumbs_current.w + p.thumbs_hover.w + (globals.lecture.thumbs.length-2) * p.thumbs_small.w + globals.lecture.thumbs.length * 10 + 50);
        $('#thumbnails').width(thumbs_width);
        $('#thumbnails').height(p.thumbs_current.h + p.thumbs_padding_bottom);

        $(globals.lecture.thumbs).each(function(i, _){
            if (config.debug) console.log("Draw thumbail #", i);
            var size = (i === 0) ? { w: p.thumbs_current.w, h: p.thumbs_current.h, top: 0, cl: 'current'} : { w: p.thumbs_small.w, h: p.thumbs_small.h, top: p.thumbs_current.h-p.thumbs_small.h, cl: ''},
                img = '<img style="width: '+size.w+'px; height: '+size.h+'px; top: '+size.top+'px;" src="'+config.full_url+'/'+this.src+'" />',
                lbl = '<span class="label label-default thumb_details" style="top: '+size.top+'px;">'+(i+1)+' | '+Helpers.format_duration_thumbs(globals.lecture.thumbs[i].duration)+'</span>',
                grayed = '<div class="thumb_grayed" style="width: 0; height: '+size.h+'px; top: '+size.top+'px;"></div>',
                div = '<div id="thumb_'+i+'" data-id="'+i+'" class="thumb '+size.cl+'" style="height: '+p.thumbs_current.h+'px;"></div>';
            $('#thumbnails').append($(div).append(img, lbl, grayed));
        });
        // mouse hover handler
        $(".thumb").hover(function(){
            if (!$(this).hasClass('current')){
                $(this).children('img').animate({ width: p.thumbs_hover.w, height: p.thumbs_hover.h, top: p.thumbs_hover.h-p.thumbs_small.h }, p.thumbs_effect_delay);
                $(this).children('.thumb_grayed').animate({ height: p.thumbs_hover.h, top: p.thumbs_hover.h-p.thumbs_small.h }, p.thumbs_effect_delay);
                $(this).children('.thumb_details').animate({ top: p.thumbs_hover.h-p.thumbs_small.h }, p.thumbs_effect_delay);
            }
        }, function(){
            if (!$(this).hasClass('current')){
                $(this).children('img').animate({ width: p.thumbs_small.w, height: p.thumbs_small.h, top: p.thumbs_current.h-p.thumbs_small.h }, p.thumbs_effect_delay);
                $(this).children('.thumb_grayed').animate({ height: p.thumbs_small.h, top: p.thumbs_current.h-p.thumbs_small.h }, p.thumbs_effect_delay);
                $(this).children('.thumb_details').animate({ top: p.thumbs_current.h-p.thumbs_small.h }, p.thumbs_effect_delay);
            }
        }).click(function(){
            btn_thumb_onClick($(this).data('id'));
        });

        p.$scrollbar = $('#thumbs_scrollbar');
        p.$scrollbar.tinyscrollbar({ axis: 'x', sizethumb: '100'});
        p.current_centered = Math.round($('#scrollbar').width() / 2 - p.thumbs_current.w / 2);

    };

    init_controlbar = function(){
        if (config.debug) console.log("Init controlbar");

        $('#btn_play').click(function(){
            // play or pause the player
            play_controller($('#btn_play').data('current') !== "play");
        });
        $('#btn_play').tooltip({container: 'body'});

        // volume btn and slider ------------------------------------
        $('.vslider').slider({ max: 100, orientation: 'vertical', value: 100-80, selection: 'after', tooltip: 'hide' }).on('slide', function(e){
            // bootstrap-slider works from 0 to 100, but we want from 100 to 0 to have the correct the visualization
            $('#lbl_volume').html(100-e.value);
            globals.jw_camera_vp.setVolume(100-e.value);
        });
        $('#volume-slider').hover(function(e){
            p.cursor_vol_slider = true;
        }, function(){
            p.cursor_vol_slider = false;
            volume_slider_hide();
        });

        $('#btn_volume').data('current', 'unmuted');
        $('#btn_volume').click(function(){
            // mute/unmute camera videoplayer, slides videoplayer is always muted
            globals.jw_camera_vp.setMute($('#btn_volume').data('current') === "unmuted");
        }).hover(function(e){
            p.cursor_vol_btn = true;
            volume_slider_show();
        }, function(){
            p.cursor_vol_btn = false;
            volume_slider_hide();
        });
        $('#btn_volume').tooltip({ placement: 'left', container: 'body' });
        // -------------------------------------------------------------

        $('#lbl_current').html('00:00:00');
        $('#lbl_duration').html(Helpers.format_sec2time(globals.lecture.duration));

        p.controlbar_btns_width = 0;
        $('#controlbar .controls').each(function(){ p.controlbar_btns_width += $(this).width(); });
        // calculate progress bar width
        $('#progressbar_container').width($('#controlbar').width() - p.controlbar_btns_width);
        $('#progressbar').click(function(e){
            var seconds = Math.round((e.clientX - $(this).offset().left) * globals.lecture.duration / $('#progressbar').width());
            if (0 <= seconds <= globals.lecture.duration){
                if (config.debug) console.log("Click on progress bar. Seeking to:", seconds);
                _seek_videoplayers(seconds);
            }
        });
        $('#progressbar').tooltip({container: 'body', animation: 'false', title: '<span id="progressbar_tooltip">00:00:01</span>', trigger: 'manual', html: true});
        $("#progressbar").mousemove(function(e){
            var seconds = Math.round((e.clientX - $(this).offset().left) * globals.lecture.duration / $('#progressbar').width()),
                fsecs = Helpers.format_sec2time(seconds);

            if ($(this).tooltip()){
                var $tooltip_inner = $('#progressbar_tooltip'),
                    $tooltip = $tooltip_inner.parents('.tooltip');
                $tooltip.css('left', (e.pageX - Math.round($tooltip.width() / 2))+'px');
                $tooltip_inner.html(fsecs);
            }
        }).hover(function(e){
            $(this).tooltip('show');
        }, function(){
            $(this).tooltip('hide');
        });

        // set the padding bottom for the body
        $('body').css('padding-bottom', $('#thumbs_scrollbar').height() + $('#controlbar').height() + 10);
    };

    init_tour = function(){
        // show tour
        var tour = new Tour({ template: "<div class='popover tour'>"+
            "<div class='arrow'></div>"+
            "<h3 class='popover-title'></h3>"+
            "<div class='popover-content'></div>"+
            "<nav class='popover-navigation'>"+
                "<div class='btn-group'>"+
                    "<button class='btn btn-default' data-role='prev'>« Prev</button>"+
                    "<button class='btn btn-default' data-role='next'>Next »</button>"+
                "</div>"+
                "<button class='btn btn-default btn-primary' data-role='end'>End tour</button>"+
            "</nav>"+
        "</div>" });
        tour.addSteps([
            {
                element: "#topbar-right",
                placement: 'bottom',
                title: "Controls",
                content: "Use this control bar to change slide and chapter (if present), hide/show videoplayers and thumbnails, get help."
            },
            {
                element: "#camera_vp_container",
                placement: 'right',
                title: "Camera videoplayer",
                content: "This is the camera videoplayer where usually the speaker is shown.<br />Click on the <strong>fullscreen</strong> icon on the bottom of the player to enlarge the video."
            },
            {
                element: "#slides_vp_container",
                placement: 'left',
                title: "Slides videoplayer",
                content: "This is the slides videoplayer where usually the slides are shown.<br />Click on the <strong>fullscreen</strong> icon on the bottom of the player to enlarge the video."
            },
            {
                element: "#thumbs_scrollbar",
                placement: 'top',
                title: "Thumnbnails",
                content: "Here you have the list of thumbnails for this  web lecture.<br />You can click on a thumb to seek the video.<br />Current thumb is bigger than the others."
            },
            {
                element: "#controlbar",
                placement: 'top',
                title: "Controls",
                content: "Use this control to <strong>start/pause</strong> the player, to <strong>seek</strong> the video to a specific time and adjust the <strong>volume</strong>."
            }
        ]);
        tour.start();
    };

    /********************************************************************************************/
    // controller methods

    // after seeking the video, progress bar, thumbs and chapter status have to be checked
    time_controller = function(seek_time){
        if (seek_time && !isNaN(seek_time) && seek_time >= 0 && seek_time !== p.previous_seek_time){
            p.previous_seek_time = seek_time;
            $('#lbl_current').html(Helpers.format_sec2time(seek_time));

            progressbar_controller(seek_time);
            thumb_controller(seek_time);

            if (globals.lecture.chapters.length > 0)
                chapter_controller(seek_time);
        }
    };

    // pause/play videoplayers
    play_controller = function(state){
        $(globals.jw_videoplayers).each(function(){
            if (this.getState() === 'PAUSED' &&  state === false)
                return true; // jQuery each continue
            if ((this.getState() === 'PLAYING' || this.getState() === 'BUFFERING') && state === true)
                return true; // jQuery each continue
            this.play(state);
        });
    };

    scrollbar_controller = function(){
        if (p.current_thumb >= 0){
            // try to keep the current thumb always in the center
            var new_x = Math.round($('#thumb_'+p.current_thumb).position().left),
                track_x = Math.round( (new_x - p.current_centered) * $('#track').width() / $('#thumbnails').width() ),
                max_x = $('#track').width() - $('#track-thumb').width();

            // if new_x is less than p.current_centered, we are still at the beginning of the lecture, so do not move the scrollbar
            if (new_x > p.current_centered){
                if (track_x < max_x){
                    // move the scrollabar of new_x - p.current_centered
                    p.$scrollbar.tinyscrollbar_update(new_x - p.current_centered);
                } else {
                    // move the scroll at the end
                    p.$scrollbar.tinyscrollbar_update('bottom');
                }
            } else {
                p.$scrollbar.tinyscrollbar_update(0);
            }
        }
    };

    // set the progress bar to the new time
    progressbar_controller = function(new_time){
        var new_width = Math.round(p.previous_seek_time * 100 / globals.lecture.duration);
        $('#playhead').css('width', new_width+'%').attr('aria-valuenow', new_width);
    };

    // handle which thumb should be displayed as current
    thumb_controller = function(new_time){
        // find which thumb should be the current
        var tmp_thumb = 0;
        $(globals.lecture.thumbs).each(function(i, _){
            if (new_time < this.begin)
                return false; // break statement
            tmp_thumb = i;
        });

        if (tmp_thumb !== p.current_thumb){
            // current becomes small
            $('#thumb_'+p.current_thumb).removeClass('current');
            $('#thumb_'+p.current_thumb).children('img').animate({ width: p.thumbs_small.w, height: p.thumbs_small.h, top: p.thumbs_current.h-p.thumbs_small.h }, p.thumbs_effect_delay);
            $('#thumb_'+p.current_thumb).children('.thumb_grayed')
                .width(p.thumbs_current.w)
                .animate({ width: 0, height: p.thumbs_small.h, top: p.thumbs_current.h-p.thumbs_small.h }, p.thumbs_effect_delay);
            $('#thumb_'+p.current_thumb).children('.thumb_details').animate({ top: p.thumbs_current.h-p.thumbs_small.h }, p.thumbs_effect_delay);
            // change current to the new one
            p.current_thumb = tmp_thumb;
            $('#current_slide').html(p.current_thumb+1);
            if (config.debug) console.log("Thumb changed: ", p.current_thumb);
            // new current small become current
            $('#thumb_'+p.current_thumb).addClass('current');
            $('#thumb_'+p.current_thumb).children('img').animate({ width: p.thumbs_current.w, height: p.thumbs_current.h, top: 0 }, p.thumbs_effect_delay);
            $('#thumb_'+p.current_thumb).children('.thumb_grayed').animate({ height: p.thumbs_current.h, top: 0 }, p.thumbs_effect_delay);
            $('#thumb_'+p.current_thumb).children('.thumb_details').animate({ top: 0 }, p.thumbs_effect_delay);
            // move scrollbar
            scrollbar_controller();
        }

        // color thumb
        var t = (new_time - globals.lecture.thumbs[p.current_thumb].begin) * p.thumbs_current.w / globals.lecture.thumbs[p.current_thumb].duration;
        $('#thumb_'+p.current_thumb).children('.thumb_grayed').animate({ width: t}, p.thumbs_effect_delay);

        // buttons prev-next slide
        if (p.current_thumb === 0){
            $('#previous_slide').addClass('disabled');
            $('#next_slide').removeClass('disabled');
        } else if (p.current_thumb === globals.lecture.thumbs.length-1){
            $('#previous_slide').removeClass('disabled');
            $('#next_slide').addClass('disabled');
        } else {
            $('#previous_slide').removeClass('disabled');
            $('#next_slide').removeClass('disabled');
        }
    };

    // handle which chapter should be displayed as current
    chapter_controller = function(new_time){
         // find which chapter should be the current
        var tmp_chapter = -1;
        $(globals.lecture.chapters).each(function(i, _){
            if (new_time < this.begin)
                return false; // break statement
            tmp_chapter = i;
        });

        if (tmp_chapter !== p.current_chapter){
            p.current_chapter = tmp_chapter;
            if (config.debug) console.log("Chapter changed: ", p.current_chapter);
            $('#chaptersbar li').removeClass('active');
            $('#chapter_'+p.current_chapter).addClass('active');
        }
    };

    _seek_videoplayers = function(new_time){
        seeking_start();
        globals.jw_camera_vp.seek(new_time);
        globals.jw_slides_vp.seek(new_time);
        play_controller(true);
    };

    seeking_start = function(){
        $('#progressbar').addClass('progress-striped active');
        $('#playhead').html('Seeking...');
    };
    seeking_stop = function(){
        $('#progressbar').removeClass('progress-striped active');
        $('#playhead').html('');
    };

    volume_slider_show = function(){
        // if muted, do not show the slider
        if ($('#btn_volume').data('current') === 'unmuted' && !$('#volume-slider').is(':visible')){
            $('#volume-slider')
                .css('top', $('#btn_volume').offset().top - $('#volume-slider').height() - 16)
                .css('left', $('#btn_volume').offset().left + 2)
                .fadeIn('fast');
        }
    };

    volume_slider_hide = function(){
        if ($('#volume-slider').is(':visible')){
            setTimeout(function(){
                if (!p.cursor_vol_btn && !p.cursor_vol_slider)
                    $('#volume-slider').fadeOut('fast');
            }, 1000);
        }
    };

    /********************************************************************************************/
    // Event handlers

    // videoplayer onTime
    onTime = function(event){
        seeking_stop(); // remove seeking effect on the progress bar
        // position in event object contains the seconds of video player, the current time of the video
        var new_time = parseInt(event.position, 10);
        if (config.debug) console.debug("Time event: ", new_time);
        time_controller(new_time);
    };

    // Resize event
    onResize = function(){
        if (config.debug) console.log("Resize event");

        if ($(window).width() > 0 && $(window).height() > 0){
            // players container height
            var ts_height = ($('#thumbs_scrollbar').is(':visible')) ? $('#thumbs_scrollbar').height() : 0,
                vp_height = $(window).height() - $('#topbar').height() - ts_height - $('#controlbar').height();
            $('#videoplayers').height(vp_height);

            // resize title and speakers
            var controls_width = $('#topbar').width() - $('#logo').width() - $('#topbar-right').width() - 30; // 30 margin
            $('#title').css('max-width', controls_width);
            $('#speakers').css('max-width', controls_width - $('#when').width());

            // scrollbar repositioning
            if ( $('#thumbnails').width() < $(window).width() )
                $('#scrollbar').hide();
            else if ($('#thumbs_scrollbar').is(':visible')){
                $('#scrollbar').show();
                p.$scrollbar.tinyscrollbar_update('relative');
                p.current_centered = Math.round($('#scrollbar').width() / 2 - p.thumbs_current.w / 2);
                scrollbar_controller();
            }

            // resize progress bar
            $('#progressbar_container').width($('#controlbar').width() - p.controlbar_btns_width);

            // resize videoplayers
            Resize.handler($(window).width(), vp_height);
        }
    };

    // click event on a thumbail
    btn_thumb_onClick = function(id){
        if (config.debug) console.log("BTN click: thumb");
        // just seek the videoplayer, all the rest comes automatically
        if (config.debug) console.log("Go to thumb: ", id, globals.lecture.thumbs[id].begin);
        _seek_videoplayers(globals.lecture.thumbs[id].begin);
    };
    btn_next_thumb_onClick = function(){
        if (config.debug) console.log("BTN click: next thumb");
        if (p.current_thumb+1 < globals.lecture.thumbs.length){
            if (config.debug) console.log("Go to thumb: ", p.current_thumb+1, globals.lecture.thumbs[p.current_thumb+1].begin);
            _seek_videoplayers(globals.lecture.thumbs[p.current_thumb+1].begin);
        }
    };
    btn_prev_thumb_onClick = function(){
        if (config.debug) console.log("BTN click: previous thumb");
        if (p.current_thumb-1 >= 0){
            if (config.debug) console.log("Go to thumb: ", p.current_thumb-1, globals.lecture.thumbs[p.current_thumb-1].begin);
            _seek_videoplayers(globals.lecture.thumbs[p.current_thumb-1].begin);
        }
    };

    btn_chapter_onClick = function(id){
        if (config.debug) console.log("Chapter changed");
        if (config.debug) console.log("Go to chapter: ", id, globals.lecture.chapters[id].begin);
        if (p.current_chapter !== id)
            _seek_videoplayers(globals.lecture.chapters[id].begin);
    };

    toggle_videos = function(sel){
        if (sel === "0"){
            // show camera only
            if (globals.slides_vp_visible){
                // hide logo and control bar of the player
                if (globals.player_mode == 'html5'){
                    $('#slides_vp_jwplayer_logo').width(0).height(0);
                    $('#slides_vp_jwplayer_controlbar').width(0).height(0);
                }
                // force resize with only camera visible
                globals.slides_vp_visible = false;
                globals.camera_vp_visible = true;
                $(window).trigger('resize');
                // adjust buttons
                $('#camera_only').parent().removeClass('btn-default').addClass('btn-primary');
                $('#slides_only').parent().removeClass('btn-primary').addClass('btn-default');
                $('#both_videos').parent().removeClass('btn-primary').addClass('btn-default');
            }
        } else if (sel === "1"){
            // show slides only
            if (globals.camera_vp_visible){
                // hide logo and control bar of the player
                if (globals.player_mode == 'html5'){
                    $('#camera_vp_jwplayer_logo').width(0).height(0);
                    $('#camera_vp_jwplayer_controlbar').width(0).height(0);
                }
                // force resize with only slides visible
                globals.camera_vp_visible = false;
                globals.slides_vp_visible = true;
                $(window).trigger('resize');
                // adjust buttons
                $('#slides_only').parent().removeClass('btn-default').addClass('btn-primary');
                $('#camera_only').parent().removeClass('btn-primary').addClass('btn-default');
                $('#both_videos').parent().removeClass('btn-primary').addClass('btn-default');
            }
        } else if (sel === "2"){
            // show camera and slides, restoring dimensions
            globals.camera_vp_visible = true;
            globals.slides_vp_visible = true;
            $(window).trigger('resize');
            // adjust buttons
            $('#both_videos').parent().removeClass('btn-default').addClass('btn-primary');
            $('#camera_only').parent().removeClass('btn-primary').addClass('btn-default');
            $('#slides_only').parent().removeClass('btn-primary').addClass('btn-default');
        }
    };

    btn_toggle_thumbs_onClick = function(){
        if (config.debug) console.log("BTN click: toggle thumbs");
        if ($('#thumbs_scrollbar').is(':visible')){
            $('#thumbs_scrollbar').hide();
            $(window).trigger('resize');
            $('#toggle_thumbs').removeClass('btn-primary').addClass('btn-default');
            $('#toggle_thumbs').tooltip('hide').attr('data-original-title', 'Show thumbnails').tooltip('fixTitle');
        } else {
            $('#thumbs_scrollbar').show();
            $(window).trigger('resize');
            $('#toggle_thumbs').removeClass('btn-default').addClass('btn-primary');
            $('#toggle_thumbs').tooltip('hide').attr('data-original-title', 'Hide thumbnails').tooltip('fixTitle');
        }
    };

    /********************************************************************************************/

    init = function(){

        try {

            // first of all try to read the xml
            $.ajax(config.lecture_file['filepath'])
            .fail(function (xhr, ajaxconfig, thrownError){
                console.error("Error: "+xhr.status+" "+thrownError);
                $('.loading_modal').css('background', '#333');
                $('#loading_content')
                    .css('width', '60%')
                    .css('left', '20%')
                    .html('<strong>Error loading the player for this lecture.</strong><br />Please check if your browser version supports HTML5 video, with format H.264/MP4, <a href="http://www.jwplayer.com/html5/formats/" target="_blank">here</a>.<br />If not, please check that you have installed and enabled <a href="http://get.adobe.com/flashplayer/">Adobe Flash Player</a>.<br /><br />You contact support by email at <a href="mailto:'+config.support_email+'">'+config.support_email+'</a>.');
            })
            .done(function(data){
                $('#container').show();
                LectureParser.parse(data);

                // replace the page title and the support link
                document.title = globals.lecture.title;
                $('.contact-email').attr("href", "mailto:"+config.support_email).html(config.support_email);

                // set HTML5 video tags
                $('#camera_vp_source').attr('src', config.full_url + 'camera.mp4');
                $('#slides_vp_source').attr('src', config.full_url + 'slides.mp4');

                // now init videoplayers
                globals.jw_camera_vp = jwplayer('camera_vp').setup({
                    skin: 'videoplayer/jwplayer-5.10/skin/nacht_fullscreen_only/nacht_fullscreen_only.xml',
                    /*controlbar: {
                        position: 'bottom'
                    },*/
                    volume: 80,
                    width: 640,
                    height: 360,
                    timeinterval: 1000,
                    screencolor: '000000',
                    modes: [
                    {
                        type: 'html5'
                    },
                    {
                        type: 'flash',
                        src: 'videoplayer/jwplayer-5.10/player.swf',
                        config: { // change this if you are not using streaming
                            provider: config.provider,
                            streamer: config.streamer,
                            file: config.relative_path+config.camera_file
                        }
                    }
                    ]
                }).onReady(function(){
                    globals.camera_vp_ready = true;
                    globals.camera_vp_ar = this.getWidth() / this.getHeight();
                    $('body').trigger("jw_camera_vp.ready");
                });

                globals.jw_slides_vp = jwplayer('slides_vp').setup({
                    skin: 'videoplayer/jwplayer-5.10/skin/nacht_fullscreen_only/nacht_fullscreen_only.xml',
                    /*controlbar: {
                        position: 'bottom'
                    },*/
                    mute: true,
                    width: 1024,
                    height: 768,
                    timeinterval: 1000,
                    screencolor: '000000',
                    modes: [
                    {
                        type: 'html5'
                    },
                    {
                        type: 'flash',
                        src: 'videoplayer/jwplayer-5.10/player.swf',
                        config: { // change this if you are not using streaming
                            provider: config.provider,
                            streamer: config.streamer,
                            file: config.relative_path+config.slides_file
                        },
                    }
                    ]
                }).onReady(function(){
                    globals.slides_vp_ready = true;
                    globals.slides_vp_ar = this.getWidth() / this.getHeight();
                    $('body').trigger("jw_slides_vp.ready");
                });

                globals.jw_videoplayers.push(globals.jw_camera_vp);
                globals.jw_videoplayers.push(globals.jw_slides_vp);

                // wait for players ready
                $('body').on('jw_camera_vp.ready jw_slides_vp.ready', function(){
                    // wait for both players ready
                    if (globals.camera_vp_ready && globals.slides_vp_ready){

                        globals.player_mode = globals.jw_camera_vp.getRenderingMode();

                        init_topbar();
                        init_videoplayers();
                        init_thumbnails();
                        init_controlbar();

                        // init sync videoplayers
                        Videoplayers_KeepInSync.init(globals.jw_camera_vp, globals.jw_slides_vp, true);

                        // bind the resize at the very end. Fire the resize event only one time after 200ms to avoid multiple fires
                        $(window).resize($.debounce(200, onResize));
                        $(window).trigger('resize');

                        $('#volume-slider').hide(); // override the first mute event
                        $('body').removeClass("loading");

                        // start the tour
                        init_tour();

                        // check url params if there is a starting param and seek there
                        var slide = Helpers.param_by_name('slide'),
                            chapter = Helpers.param_by_name('chapter'),
                            time = Helpers.param_by_name('time'),
                            ftime = Helpers.param_by_name('ftime');
                        if (slide){
                            slide = parseInt(slide, 10) - 1;
                            if (0 <= slide && slide <= globals.lecture.thumbs.length)
                                _seek_videoplayers(globals.lecture.thumbs[slide].begin);
                        } else if (chapter){
                            chapter = parseInt(chapter, 10) - 1;
                            if (0 <= chapter && chapter <= globals.lecture.chapters.length)
                                _seek_videoplayers(globals.lecture.chapters[chapter].begin);
                        } else if (time) {
                            time = parseInt(time, 10);
                            if (0 < time && time < globals.lecture.duration)
                                _seek_videoplayers(time);
                        } else if (ftime) {
                            time = Helpers.format_time2sec(ftime);
                            if (0 < time && time < globals.lecture.duration)
                                _seek_videoplayers(time);
                        }
                    }
                });

            });
        } catch(err){ console.error(err); }

    };

    return {
        init: init
    };

}());
