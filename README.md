WebLecture Player
===
## What is

At [CERN](www.cern.ch) we record hundreds of lectures per year. To give the possibility to anyone to watch the lecture afterwards, we have created a custom videoplayer, web based, a web lecture player.

![player screenshot](player.jpg)

## Features

* Full size web lecture player
* Camera and slides players are in-sync
* Fully HTML5, switching back to Flash in case of not supported browser
* List of thumbails with timing information
* Auto-resize following browser dimensions
* Tested on IE (8 or higher), Chrome, Firefox and Safari

## What you needed

The player will look for a folder which contains:

* 1 video for the camera or speaker, called camera.mp4.
* 1 video for the slides of the lecture, called slides.mp4.
* thumbnails, a collections of screenshot (resized) taken from the slides video, thumbs/timing.jpg.
* a JSON file (or XML), called lecture.json, describing the lecture: title, speakers, date, series of slides with timing info.

Paths to files and folders can be changed in **config.js**.

Note: you need to set correctly the file **crossdomain.xml** (required by Flash) and allow JS to access to folders on the webservers by setting:

* Access-Control-Allow-Origin: *.yourdomain.com
* Access-Control-Allow-Methods: GET, POST
* Access-Control-Allow-Headers: Authorization

## Develop

You are free and welcome to use and contribute to the project.
You can find all the source code in **src** folder, and it is probably where to put the hands on.
To build the **dist** version, use [Grunt](http://gruntjs.com/).

### SOFTWARE INCLUDED AND LICENSES

The player is released with GPLv3 license and comes with:

* [jQuery](https://jquery.org/license/) and a couple of plugins, MIT License:
    + [Tiny Scrollbar](http://baijs.nl/tinyscrollbar/) customized.
    + [jQuery debounce](http://benalman.com/projects/jquery-throttle-debounce-plugin/).
* [Bootstrap](http://getbootstrap.com) and a couple of plugins, Apache 2 License:
    + [Slider for Bootstrap](http://www.eyecon.ro/bootstrap-slider/) customized.
    + [Bootstrap Tour](http://bootstraptour.com/).
* [JWPlayer 5.10](http://developer.longtailvideo.com) free version, [CC License](http://creativecommons.org/licenses/by-nc-sa/3.
0/), customized.
* [Font Awesome](http://fortawesome.github.io/Font-Awesome/license/), GPL compatible License.
