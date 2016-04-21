(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        var zxcvbnLoader = function(cb) {
            require.ensure(['zxcvbn'], function(require) {
                window.zxcvbn = require('zxcvbn');

                cb();
            });
        };

        module.exports = factory(require('underscore'), zxcvbnLoader);
    } else if (typeof define === 'function' && define.amd) {
        define(['underscore'], factory);
    } else {
        root.Spem = factory(root._);
    }
}(this, function (_, nodeLoader) {

    var Spem = function(options, loader, onUpdate) {
        var oldOptions = options;

        if (typeof options === 'string') {
            options = {
                input: oldOptions
            };

            if (typeof loader === 'undefined') {
                return;
            }

            if (typeof onUpdate === 'undefined') {
                options.onUpdate = loader;
            } else {
                options.onUpdate = onUpdate;
            }
        }

        var spem = initialize(options);

        if (loader) return defer(spem, loader);

        if (nodeLoader) return defer(spem, nodeLoader);

        return spem.start();
    };

    /**
     * Start the password entropy meter.
     *
     * This method requires the zxcvbn to be loaded.
     */
    var initialize = function(options) {
        var $input = getInputElement(options.input);
        var $output = getElement(options.output);
        var userData = getUserData(options.userData);
        var formatting = options.formatting || 'bs3';

        if ($output) {
            var $progress = createProgressBar(formatting, options.minWidth);
            var $progressBar = $progress.querySelector('div');

            $output.appendChild($progress);
        }

        var updateStrengthMeter = function(flags, result) {
            $progressBar.style.width = '' + result.score * 25 + '%';
            $progressBar.className = getProgressBarClass(formatting, result.score);

            if (options.scoreMessages && formatting !== 'materialize') {
                $progressBar.innerHTML = options.scoreMessages[result.score];
            }
        };

        var onChange = function() {
            var result = zxcvbn(this.value, userData);
            var flags  = getFlags(result);

            if ($output) {
                updateStrengthMeter(flags, result);
            }

            if (options.onUpdate) options.onUpdate(flags, result);
        };

        var started    = false;
        var isDeferred = false;

        return {
            defer: function() {
                isDeferred = true;
            },

            start: function(deferred) {
                deferred = !!deferred;

                if (started || isDeferred !== deferred) {
                    return false;
                }

                if (options.debounce) {
                    onChange = _.debounce(onChange, options.debounce);
                }

                $input.addEventListener('keyup', onChange);
                $input.addEventListener('change', onChange);

                var result = zxcvbn($input.value, userData);
                var flags  = getFlags(result);

                if ($output) {
                    updateStrengthMeter(flags, result);
                }

                if (options.onStart) options.onStart(flags, result);

                started = true;

                return this;
            },

            stop: function() {
                started    = false;
                isDeferred = false;
            },

            updateUserData: function(data) {
                userData = getUserData(data);

                var result = zxcvbn($input.value, userData);
                var flags  = getFlags(result);

                updateStrengthMeter(flags, result);
            }
        };
    };

    var getInputElement = function(input) {
        if (!input) throw new Error('No input element specified');

        return getElement(input);
    };

    var getElement = function(selector) {
        if (!selector) return false;

        if (!(selector instanceof Node) && typeof selector !== 'string') {
            throw new Error('Argument must be a selector or a DOM Node');
        }

        if (typeof selector === 'string') {
            var el = document.querySelector(selector);

            if (!el) throw new Error(selector + ' does not exist');

            return el;
        }

        return selector;
    };

    var getUserData = function(userData) {
        if (!userData) return [];

        var row, dictionary = [], splitter = /( |\.|@)/;

        for (var i = 0; i < userData.length; i++) {
            row = userData[i];

            dictionary.push(row);

            if (splitter.test(row)) {
                row = row.split(splitter);

                dictionary = dictionary.concat(row);
            } else {
                dictionary.push(row);
            }
        }

        return dictionary.reduce(function(prev, cur) {
            if (prev.indexOf(cur) === -1) prev.push(cur);

            return prev;
        }, []);
    };

    var getFlags = function(zxcvbnData) {
        var userInputs = zxcvbnData.sequence.filter(function(step) {
            return step.pattern === 'dictionary' && step.dictionary_name === 'user_inputs';
        });

        var popularPasswords = zxcvbnData.sequence.filter(function(step) {
            return step.pattern === 'dictionary' && step.dictionary_name === 'passwords';
        });

        return {
            emptyPassword: !zxcvbnData.password.length,
            userInput: !!userInputs.length,
            userInputMatches: userInputs.map(function(step) {
                return step.token;
            }),
            popularPassword: !!popularPasswords.length,
        };
    };

    var createProgressBar = function(formatting, minWidth) {
        minWidth = minWidth || '48px';

        var progress = document.createElement('div');
        progress.className = 'progress';
        progress.innerHTML = [
            '<div class="' + getProgressBarClass(formatting, 0) + '"',
            'role="progressbar"',
            'aria-valuenow="0" aria-valuemin="0" aria-valuemax="4"',
            'style="width: 0%; min-width:' + minWidth + '"></div>'
        ].join(' ');

        return progress;
    };

    var progressBarClassMap = {
        'bs2': 'bar',
        'bs3': 'progress-bar',
        'materialize': 'determinate',
    };

    /**
     * Holds bootstrap classes corresponding to zxcvbn score levels.
     */
    var scoreClassMap = ['danger', 'danger', 'warning', 'info', 'success'];

    var getProgressBarClass = function(formatting, score) {
        var className = progressBarClassMap[formatting];

        if (formatting === 'materialize') {
            return className;
        }

        return className + ' ' + className + '-' + scoreClassMap[score];
    };

    /**
     * Defer SPEM initialisation.
     *
     * This function can be used to wait for zxcvbn being loaded.
     */
    var defer = function(spem, loader) {
        spem.defer();

        if (typeof loader === 'string') {
            loader = createInjectLoader(loader);
        }

        loader(function() {
            spem.start(true);
        });

        return spem;
    };

    /**
     * Creates a loader for defer which uses a dynamically injected script tag.
     */
    var createInjectLoader = function(src) {
        return function(cb) {
            injectZxcvbnScript(src, cb);
        };
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

    return Spem;
}));
