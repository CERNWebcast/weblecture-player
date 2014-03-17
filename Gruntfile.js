/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        env : {
            dev: {
                NODE_ENV : 'DEVELOPMENT'
            },
            prod : {
                NODE_ENV : 'PRODUCTION'
            }
        },
        clean: {
            dist: [ 'dist/*', '!dist/.gitkeep' ],
            prod: [ 'dist/js/libs.js', 'dist/js/weblecture-player.js', 'dist/videoplayer/jwplayer-5.10/jwplayer.js', '!dist/.gitkeep' ]
        },
        copy: {
            dev: {
                files: [
                    { expand: true, cwd: 'src/css/', src: [ '**' ], dest: 'dist/css' },
                    { expand: true, cwd: 'src/images/', src: [ '**' ], dest: 'dist/images' },
                    { expand: true, cwd: 'src/js/', src: [ '**', '!config.sample.js' ], dest: 'dist/js' },
                    { expand: true, cwd: 'src/libs/', src: [ '**' ], dest: 'dist/libs' },
                    { expand: true, cwd: 'src/videoplayer/', src: [ '**' ], dest: 'dist/videoplayer' },
                    { expand: true, cwd: 'src/', src: [ 'crossdomain.xml' ], dest: 'dist' },
                ]
            },
            prod: {
                files: [
                    { 'dist/js/config.js': [ 'src/js/config.js' ] },
                    { expand: true, cwd: 'src/videoplayer/', src: [ '**' ], dest: 'dist/videoplayer' },
                    { expand: true, cwd: 'src/', src: [ 'crossdomain.xml' ], dest: 'dist' }
                ]
            }
        },
        preprocess : {
            index : {
                src : 'src/index.html',
                dest : 'dist/index.html'
            }
        },
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            prod: {
                files: [
                    {
                        'dist/js/weblecture-player.js': [ // order is important
                            'src/js/helpers.js',
                            'src/js/lecture_parser.js',
                            'src/js/resize.js',
                            'src/js/videoplayers_keepinsync.js',
                            'src/js/controller.js'
                        ]
                    },
                    {
                        'dist/js/libs.js': [
                            'src/libs/html5shiv-3.7.1/html5shiv.js',
                            'src/libs/respond-1.4.2/respond.js',
                            'src/libs/jquery.ba-throttle-debounce.js',
                            'src/libs/jquery.tinyscrollbar.js',
                            'src/libs/bootstrap-slider-2.0.0/js/bootstrap-slider.js',
                            'src/libs/bootstrap-tour-0.9.1/js/bootstrap-tour.js'
                        ]
                    }
                ]
            }
        },
        uglify: {
            options: {
                banner: '<%= banner %>',
                mangle: false // do not change var and function names
            },
            prod: {
                files: [
                    { 'dist/js/libs.min.js': ['dist/js/libs.js'] },
                    { 'dist/js/weblecture-player.min.js': ['dist/js/weblecture-player.js'] },
                    { 'dist/videoplayer/jwplayer-5.10/jwplayer.min.js': ['src/videoplayer/jwplayer-5.10/jwplayer.js'] }
                ]
            }
        },
        cssmin: {
            options: {
                keepBreaks: true
            },
            minify: {
                files: [
                    { 'dist/css/weblecture-player.min.css': [ 'src/css/weblecture-player.css' ] },
                    { 'dist/css/libs.min.css': [
                            'src/libs/bootstrap-slider-2.0.0/css/bootstrap-slider.css',
                            'src/libs/bootstrap-tour-0.9.1/css/bootstrap-tour.css'
                        ]
                    }
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
        },
        watch: {
            dev: {
                files: ['src/**/*.*'],
                tasks: ['env:dev', 'clean:dist', 'copy:dev', 'preprocess'],  // dev version
                options: {
                    livereload: true,
                }
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-preprocess');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mkdir');

    grunt.registerTask('prod', ['env:prod', 'clean:dist', 'copy:prod', 'preprocess', 'concat:prod', 'uglify:prod', 'cssmin', 'imagemin', 'clean:prod']);

    grunt.registerTask('dev', ['env:dev', 'clean:dist', 'copy:dev', 'preprocess']);

    grunt.registerTask('jshint', ['jshint']);

    grunt.registerTask('clean_all', ['clean:dist']);

};
