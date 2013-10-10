var LectureParser = (function(){

    /* Parse old style XML lecture file: legacy format, deprecated */
    parse_xml = function(xml_data){
        if (config.debug) console.log("Parsing lecture XML data");
        var $xml = $(xml_data);

        if (!$xml.find('LECTURE')) console.error("lecture XML data not well formed!");

        globals.lecture.fduration = $xml.find('FDURATION').text();
        globals.lecture.duration = parseInt($xml.find('DURATION').text(), 10);
        globals.lecture.title = $xml.find('LECTURE').attr('TITLE');
        $xml.find('AUTHOR').each(function(){
            globals.lecture.speakers.push($(this).text().replace(',', ''));
        });
        globals.lecture.date = $xml.find('DATE').text();
        globals.lecture.time = $xml.find('TIME').text();

        globals.lecture.thumbs_width = parseInt($xml.find('SLIDE').first().attr('WIDTH'), 10);
        globals.lecture.thumbs_height = parseInt($xml.find('SLIDE').first().attr('HEIGHT'), 10);

        // add thumbs to the player
        $xml.find('SLIDE').each(function(i, _){
            // save it in the lecture object
            globals.lecture.thumbs.push({
                begin: $(this).attr('FBEGIN'),
                beginsec: parseInt($(this).attr('BEGIN'), 10),
                duration: parseInt($(this).attr('DURATION'), 10),
                src: $(this).attr('SRC'),
            });
        });

        $xml.find('CHAPTER').each(function(i, _){
            var speakers = [];
            speakers.push($(this).attr('SPEAKERS'));
            // save it in the lecture object
            globals.lecture.chapters.push({
                begin: $(this).attr('FBEGIN'),
                beginsec: parseInt($(this).attr('BEGIN'), 10),
                duration: parseInt($(this).attr('DURATION'), 10),
                speakers: speakers,
                title: $(this).attr('TITLE'),
            });
        });

    };

    /* Parse new style JSON lecture file */
    parse_json = function(json_data){
        if (config.debug) console.log("Parsing lecture XML data");

        globals.lecture.title = json_data.lecture.title;
        globals.lecture.speakers = json_data.lecture.speakers;
        globals.lecture.date = json_data.lecture.date;
        globals.lecture.time = json_data.lecture.time;
        globals.lecture.fduration = json_data.lecture.fduration;
        globals.lecture.duration = json_data.lecture.duration;

        globals.lecture.thumbs_width = json_data.lecture.thumbs_w;
        globals.lecture.thumbs_height = json_data.lecture.thumbs_h;
        globals.lecture.thumbs = json_data.lecture.thumbs;

        globals.lecture.chapters = json_data.lecture.chapters;
    };

    parse = function(data){
        if (config.lecture_file['type'] === "XML")
            return parse_xml(data);
        else if (config.lecture_file['type'] === "JSON")
            return parse_json(data);
        else console.error("No parser for lecture file format ", config.lecture_file[type]);
    };

    return {
        parse: parse,
    };

}());
