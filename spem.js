(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SPEM = factory();
    }
}(this, function () {

    /**
     * Start the password entropy meter.
     *
     * This method requires the zxcvbn to be loaded.
     */
    var init = function(options) {
        var $passwordField, $outputContainer;

        if (typeof options.passwordField === 'string') {
            $passwordField = document.querySelector(options.passwordField);
        } else if (options.passwordField instanceof Node) {
            $passwordField = options.passwordField;
        } else {
            throw new Error('passwordField should be a Node or a selector');
        }

        if (typeof options.outputContainer === 'string') {
            $outputContainer = document.querySelector(options.outputContainer);
        } else if (options.outputContainer instanceof Node) {
            $outputContainer = options.outputContainer;
        } else {
            throw new Error('outputContainer should be a Node or a selector');
        }

        var $progress = createProgressBar();
        var $progressBar = $progress.querySelector('.progress-bar');

        $outputContainer.appendChild($progress);

        var updateStrengthMeter = function(value) {
            var result = zxcvbn(value);

            $progressBar.style.width = '' + result.score * 25 + '%';
            $progressBar.className = 'progress-bar progress-bar-' + scoreClassMap[result.score];

            if (options.onUpdate) {
                options.onUpdate(result);
            }
        };

        var onKeyup = function() {
            updateStrengthMeter(this.value);
        };
        
        $passwordField.addEventListener('keyup', onKeyup);

        updateStrengthMeter($passwordField.value);
    };

    var createProgressBar = function() {
        var progress = document.createElement('div');
        progress.className = 'progress';
        progress.innerHTML = [
            '<div class="progress-bar progress-bar-danger" role="progressbar"',
            'aria-valuenow="0" aria-valuemin="0" aria-valuemax="4"',
            'style="width: 0%; min-width: 48px">',
            '</div>'
        ].join('');

        return progress;
    };

    /**
     * Holds bootstrap classes corresponding to zxcvbn score levels.
     */
    var scoreClassMap = ['danger', 'danger', 'warning', 'info', 'success'];

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
        loader(function() {
            init(options);
        });
    };

    /**
     * Creates a loader for defer which uses a dynamically injected script tag.
     */
    var inject = function(src) {
        return function(callback) {
            injectZxcvbnScript(src, callback);
        };
    };

    return {
        init: init,
        defer: defer,
        inject: inject,
    };
}));
