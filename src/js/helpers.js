var Helpers = (function(){

    var months = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
        //days = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");

    current_url = function(){
        return document.location.href.match(/(^[^#]*)/)[0];
    };

    param_by_name = function(name){
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    /* input format YYYY-MM-DD */
    format_date = function(date){
        var d = new Date(date.split('-')),
            day = d.getDate();
        if (day === 1 || day === 21 || day === 31)
            day += 'st';
        else if (day === 2 || day === 22)
            day += 'nd';
        else if (day === 3 || day === 23)
            day += 'rd';
        else day += 'th';
        return day +' '+months[d.getMonth()]+' '+d.getFullYear();
    };

    /* input format HH:MM:SS */
    format_time = function(time){
        var t = time.split(':');
        return t[0]+':'+t[1];
    };

    format_duration_thumbs = function(duration){
        var fduration = "";
        if (!duration) return 0;
        if (duration % 60 !== 0) fduration = parseInt((duration % 60), 10) + "s" + fduration;
        if (duration % 3600 !== 0 && duration > 60) fduration = parseInt((duration % 3600) / 60, 10) + "m " + fduration;
        if (duration > 3600) fduration = parseInt(duration/3600, 10) + "h " + fduration;
        return fduration;
    };

    format_sec2time = function(secs){
        var ftime = "",
            s = '00',
            m = '00',
            h = '00';

        if (!secs) return "00:00:00";

        if (secs % 60 !== 0) {
            s = parseInt((secs % 60), 10);
            if (s < 10) s = '0' + s;
        }
        ftime = s + ftime;

        if (secs % 3600 !== 0 && secs > 60) {
            m = parseInt((secs % 3600) / 60, 10);
            if (m < 10) m = '0' + m;
        }
        ftime = m + ":" + ftime;

        if (secs > 3600) {
            h = parseInt(secs / 3600, 10);
            if (h < 10) h = '0' + h;
        }
        ftime = h + ":" + ftime;
        return ftime;
    };

    format_time2sec = function(ftime){
        var t = ftime.split(':');
        return parseInt(t[0], 10) * 3600 + parseInt(t[1], 10) * 60 + parseInt(t[2], 10);
    };

    return {
        current_url: current_url,
        param_by_name: param_by_name,
        format_date: format_date,
        format_time: format_time,
        format_duration_thumbs: format_duration_thumbs,
        format_sec2time: format_sec2time,
        format_time2sec: format_time2sec,
    };

}());
