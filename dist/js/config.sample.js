var config = {
    // set the domain path to the weblectures folders
    weblectures_domain: 'https://mediastream.cern.ch/MediaArchive/',
    // jwplayer parameters
    provider: 'rtmp',
    streamer: 'rtmp://wowzauds17.cern.ch:1935/vod/',
    relative_path: 'Video/Public/WebLectures/',
    camera_file: 'camera.mp4',
    slides_file: 'slides.mp4',

    debug: Helpers.param_by_name('debug') == "TRUE",

    support_email: 'webcast-support@cern.ch',

    /*
     * Define the path to the lecture's folder, reading params from the url.
     * If protection module is enabled, challenge the folder to check if it is
     * protected.
     * Display the lecture with the 2 players.
     */
    set_paths: function(){
        /************************************************************/
        // Params handling. Read your params and set the correct sub_path
        // to the folder of the lecture

        // get the year param of the lecture
        config.year = Helpers.param_by_name('year');

        // check if year has any non-numeric characters
        if(/\D/.test(config.year))
            throw "year param: only digits accepted";

        config.lecture_id = Helpers.param_by_name('lecture');

        // check if lecture has any non-alfanumeric characters
        if(!(/^[A-Za-z0-9]+$/.test(config.lecture_id)))
            throw "lecture param: only alphanumeric characters accepted";

        config.test = Helpers.param_by_name('test');

        config.sub_path = '';
        if (config.test.toUpperCase() == 'TRUE')
            config.sub_path = 'test/'+config.year+'/'+config.lecture_id+'/';
        else
            config.sub_path = config.year+'/'+config.lecture_id+'/';

        /************************************************************/

        // append the year and lecture id to the path of the lecture
        config.relative_path = config.relative_path+config.sub_path;
        config.full_url = config.weblectures_domain+config.relative_path;
        config.lecture_file = { filepath: config.full_url+'lecture.json', type: "JSON" };
    }
};
