/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
        options: {
            banner: '<%= banner %>',
            stripBanners: true
        },
        task1: {
            files: [
                {
                    src: [ // order is important
                        'src/js/helpers.js',
                        'src/js/lecture_parser.js',
                        'src/js/resize.js',
                        'src/js/videoplayers_keepinsync.js',
                        'src/js/controller.js'
                    ],
                    dest: 'src/js/weblecture-player.js'
                },
                {
                    src: [
                        'src/js/libs/jquery-1.10.2.min.js',
                        'src/js/libs/jquery.ba-throttle-debounce.min.js',
                        'src/js/libs/jquery.tinyscrollbar.min.js',
                        'src/js/libs/bootstrap.min.js',
                        'src/js/libs/bootstrap-slider.min.js',
                        'src/js/libs/bootstrap-tour.min.js'
                    ],
                    dest: 'dist/js/libs.min.js'
                }
            ]
        }
    },
    uglify: {
        options: {
            banner: '<%= banner %>',
            mangle: false // do not change var and function names
        },
        task1: {
            files: [
                {
                    src: ['src/js/libs/jquery.tinyscrollbar.js'],
                    dest: 'src/js/libs/jquery.tinyscrollbar.min.js'
                },
                {
                    src: ['src/js/libs/jquery.ba-throttle-debounce.js'],
                    dest: 'src/js/libs/jquery.ba-throttle-debounce.min.js'
                }
            ]
        },
        task2: {
            files: [
                {
                    src: ['src/js/weblecture-player.js'],
                    dest: 'dist/js/weblecture-player.min.js'
                },
                {
                    src: ['src/videoplayer/jwplayer-5.10/jwplayer.js'],
                    dest: 'dist/videoplayer/jwplayer-5.10/jwplayer.min.js'
                }
            ]
        }
    },
    cssmin: {
        options: {
            keepBreaks: true
        },
        combine: {
            files: [
                {
                    src: [
                        'src/css/bootstrap.min.css',
                        'src/css/bootstrap-tour.min.css',
                        'src/css/bootstrap-slider.min.css'
                    ],
                    dest: 'dist/css/libs.min.css'
                }
            ]
        },
        minify: {
            files: [
                {
                    src: [ 'src/css/weblecture-player.css' ],
                    dest: 'dist/css/weblecture-player.min.css'
                }
            ]
        }
    },
    copy: {
        task1: {
            files: [
                { src: [ 'src/js/config.js' ], dest: 'dist/js/config.js' },
                { src: [ 'src/js/libs/html5shiv.js' ], dest: 'dist/js/html5shiv.js' },
                { src: [ 'src/js/libs/respond.min.js' ], dest: 'dist/js/respond.min.js' },
            ]
        }
    },
    clean: {
        task1: {
            files: [
                { src: ['src/js/weblecture-player.js', 'src/js/libs/jquery.tinyscrollbar.min.js', 'src/js/libs/jquery.ba-throttle-debounce.min.js'] }
            ]
        }
    },
    imagemin: {
        dynamic: {
            files: [{
                expand: true,
                cwd: 'src/images/',
                src: ['**/*.{png,jpg,gif}'],
                dest: 'dist/images/'
            }]
        }
    },
    jshint: {
        options: {
            bitwise: true,
            curly: false,
            eqeqeq: true,
            immed: true,
            latedef: true,
            newcap: true,
            noarg: true,
            nonew: true,
            sub: true,
            undef: true,
            unused: true,
            eqnull: true,
            browser: true,
            devel: true,
            jquery: true
        },
        all: ['src/js/src/*.js']
    }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-imagemin');

    // Default task.
    grunt.registerTask('default', ['uglify:task1', 'concat', 'uglify:task2', 'cssmin', 'copy', 'imagemin', 'clean']);

    grunt.registerTask('debug', ['concat']);

    grunt.registerTask('jshint', ['jshint']);

};
