var Resize = (function(){

    var camera_vp_size = 46, // percentage
        slides_vp_size = 52; // percentage

    handler = function(container_width, container_height){
        if(!globals.camera_vp_ready || !globals.slides_vp_ready) return;

        // add a margin
        container_width -= 40;
        container_height -= 40;

        var camera = { w: 0, h: 0 },
            slides = { w: 0, h: 0 };

        // check which player exists
        if (globals.camera_vp_visible && globals.slides_vp_visible){
            // both players are there
            camera = calculate_new_dims(container_width, container_height, globals.camera_vp_ar, camera_vp_size, 'camera');
            slides = calculate_new_dims(container_width, container_height, globals.slides_vp_ar, slides_vp_size, 'slides');

            $(globals.camera_vp_container).css('float', 'left').css('position', 'relative').css('top', '').css('left', '');
            $(globals.slides_vp_container).css('float', 'right').css('position', 'relative').css('top', '').css('left', '');

            globals.jw_camera_vp.resize(camera.w, camera.h);
            globals.jw_slides_vp.resize(slides.w, slides.h);
        } else {
            if (globals.camera_vp_visible){
                // only camera will be visible
                // hide slides
                globals.jw_slides_vp.resize(1, 1);
                $(globals.slides_vp_container).css('position', 'absolute').css('top', 0).css('left', 0);
                // resize camera videoplayer to fit the screen
                camera = calculate_new_dims(container_width, container_height, globals.camera_vp_ar, 90, 'camera');
                $(globals.camera_vp_container).css('position', 'relative').css('top', '').css('left', '');
                globals.jw_camera_vp.resize(camera.w, camera.h);
                // align to center
                $(globals.camera_vp_container).css('float', 'none');
                $('#camera_vp_wrapper').css('margin', '0 auto');
            } else if (globals.slides_vp_visible){
                // only slides will be visible
                // hide camera
                globals.jw_camera_vp.resize(1, 1);
                $(globals.camera_vp_container).css('position', 'absolute').css('top', 0).css('left', 0);
                // resize slides videoplayer to fit the screen
                slides = calculate_new_dims(container_width, container_height, globals.slides_vp_ar, 90, 'slides');
                $(globals.slides_vp_container).css('position', 'relative').css('top', '').css('left', '');
                globals.jw_slides_vp.resize(slides.w, slides.h);
                // align to center
                $(globals.slides_vp_container).css('float', 'none');
                $('#slides_vp_wrapper').css('margin', '0 auto');
            }
        }

        // Resize the container of the player(s) / This will center the players in the middle of the page
        $('#videoplayers').css('width', camera.w + slides.w + 10);
    };

    calculate_new_dims = function(W, H, aspectRatio, percentage, type){
        var object = { w: 0, h: 0 },
            videoPlayerW = (W * percentage) / 100,
            videoPlayerH = videoPlayerW / aspectRatio;

        if (videoPlayerH >= H - globals.crop_adjustment){
            videoPlayerH = H - globals.crop_adjustment;
            videoPlayerW = videoPlayerH * aspectRatio;
        }

        // set min size to w: 300 and h: 200
        object.w = Math.max(Math.floor(videoPlayerW), 300);
        object.h = Math.max(Math.floor(videoPlayerH), 200);

        return object;
    };

    return {
        handler: handler,
    };

})();
