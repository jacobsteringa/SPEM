(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(true);
    } else {
        root.spem = factory();
    }
}(this, function (isNode) {

    var spem = function(options, loader, onUpdate) {
        var oldOptions = options;

        if (typeof options === 'string') {
            options = {
                input: oldOptions
            };

            if (typeof onUpdate === 'undefined') {
                options.onUpdate = loader;

                init(options);

                return;
            } else {
                options.onUpdate = onUpdate;
            }
        }

        defer(options, loader);
    };

    /**
     * Start the password entropy meter.
     *
     * This method requires the zxcvbn to be loaded.
     */
    var init = function(options) {
        var $input, $output;

        if (typeof options.input === 'string') {
            $input = document.querySelector(options.input);
        } else if (options.input instanceof Node) {
            $input = options.input;
        } else {
            throw new Error('input should be a Node or a selector');
        }

        if (typeof options.output === 'string') {
            $output = document.querySelector(options.output);
        } else if (options.output instanceof Node) {
            $output = options.output;
        }

        var bsVersion = options.bsVersion || 3;

        if ($output) {
            var $progress = createProgressBar(bsVersion);
            var $progressBar = $progress.querySelector('div');

            $output.appendChild($progress);
        }

        var updateStrengthMeter = function(value) {
            var result = zxcvbn(value);

            if ($output) {
                $progressBar.style.width = '' + result.score * 25 + '%';
                $progressBar.className = getProgressBarClass(bsVersion, result.score);

                if (options.scoreMessages) {
                    $progressBar.innerHTML = options.scoreMessages[result.score];
                }
            }

            if (options.onUpdate) {
                options.onUpdate(result);
            }

            if (options.onStart) {
                options.onStart(result);

                delete options.onStart;
            }
        };

        var onChange = function() {
            updateStrengthMeter(this.value);
        };

        $input.addEventListener('keyup', onChange);
        $input.addEventListener('change', onChange);

        updateStrengthMeter($input.value);
    };

    var createProgressBar = function(version) {
        var progress = document.createElement('div');
        progress.className = 'progress';
        progress.innerHTML = [
            '<div class="',
            getProgressBarClass(version, 0),
            'danger" role="progressbar"',
            'aria-valuenow="0" aria-valuemin="0" aria-valuemax="4"',
            'style="width: 0%; min-width: 48px">',
            '</div>'
        ].join('');

        return progress;
    };

    var bootstrapClassMap = {
        progressBar: { 2: 'bar', 3: 'progress-bar' },
    };

    /**
     * Holds bootstrap classes corresponding to zxcvbn score levels.
     */
    var scoreClassMap = ['danger', 'danger', 'warning', 'info', 'success'];

    var getProgressBarClass = function(version, score) {
        var className = bootstrapClassMap.progressBar[version];

        return className + ' ' + className + '-' + scoreClassMap[score];
    };

    /**
     * Dynamically injects zxcvbn script and executes callback when script is done loading.
     */
    var injectZxcvbnScript = function(src, callback) {
        var scriptId = 'zxcvbn-script';

        if (document.getElementById(scriptId)) {
            if (window.zxcvbn) {
                callback();
            }

            return;
        }

        var s = document.createElement('script');
        s.id = scriptId;
        s.onload = function() {
            callback();
        };
        s.src = src;

        var fst = document.getElementsByTagName('script')[0];
        fst.parentNode.insertBefore(s, fst);
    };

    /**
     * Defer SPEM initialisation.
     *
     * This function can be used to wait for zxcvbn being loaded.
     */
    var defer = function(options, loader) {
        if (isNode) {
            require.ensure(['zxcvbn'], function(require) {
                window.zxcvbn = require('zxcvbn');

                init(options);
            });
        } else {
            if (typeof loader === 'string') {
                loader = createInjectLoader(loader);
            }

            loader(function() {
                init(options);
            });
        }
    };

    /**
     * Creates a loader for defer which uses a dynamically injected script tag.
     */
    var createInjectLoader = function(src) {
        return function(callback) {
            injectZxcvbnScript(src, callback);
        };
    };

    return spem;
}));
