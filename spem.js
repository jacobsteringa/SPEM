(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SPEM = factory();
    }
}(this, function () {

    var SPEM = function(options, callback) {
        var $passwordField, $outputContainer, zxcvbnUrl;

        zxcvbnUrl = options.zxcvbnUrl || 'https://dl.dropboxusercontent.com/u/209/zxcvbn/zxcvbn.js';

        if (!options.passwordField || !options.outputContainer) {
            throw new Error('passwordField and outputContainer are required options');
        }

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

        var initStrengthMeter = function() {
            var _this = this;

            ensureZxcvbn(zxcvbnUrl, function() {
                updateStrengthMeter(_this.value);

                if (callback) callback();

                $passwordField.addEventListener('keyup', function() {
                    updateStrengthMeter(this.value);
                });

                $passwordField.removeEventListener('focus', initStrengthMeter);
            });
        };

        var updateStrengthMeter = function(value) {
            var result = zxcvbn(value);

            $progressBar.style.width = '' + result.score * 25 + '%';
            $progressBar.className = 'progress-bar progress-bar-' + scoreMap[result.score].className;
            $progressBar.innerHTML = scoreMap[result.score].message;
        };

        $passwordField.addEventListener('focus', initStrengthMeter);
    };

    var ensureZxcvbn = function(src, callback) {
        var scriptId = 'zxcvbn-script';

        if (document.getElementById(scriptId)) {
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

    var scoreMap = [{
        className: 'danger',
        message: 'Zwak'
    }, {
        className: 'danger',
        message: 'Zwak'
    }, {
        className: 'warning',
        message: 'Middelmatig'
    }, {
        className: 'info',
        message: 'Sterk'
    }, {
        className: 'success',
        message: 'Zeer sterk'
    }];

    return SPEM;
}));
