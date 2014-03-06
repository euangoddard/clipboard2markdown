(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var paste_bin = document.querySelector('#paste-bin');
        var output = document.querySelector('#output');
        var clear = document.querySelector('#clear');

        document.addEventListener('keydown', function () {
            if (event.ctrlKey || event.metaKey) {
                switch (String.fromCharCode(event.which).toLowerCase()) {
                case 'v':
                    paste_bin.innerHTML = '';
                    paste_bin.focus();
                    output.classList.add('hidden');
                    break;
                }
            }
        });

        paste_bin.addEventListener('paste', function () {
            setTimeout(read_paste_bin, 200);
        });

        var read_paste_bin = function () {
            var html = paste_bin.innerHTML;
            output.classList.remove('hidden');
            output.textContent = html2markdown(html, {
                inlineStyle: true
            });
            clear.classList.remove('hidden');
        };

        clear.addEventListener('click', function () {
            output.innerHTML = '';
            output.classList.add('hidden');
            clear.classList.add('hidden');
        });

    });
})();
