(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var paste_bin = document.querySelector('#paste-bin');
        var output = document.querySelector('#output');
        var output_wrapper = document.querySelector('#output-wrapper');

        document.addEventListener('keydown', function () {
            if (event.ctrlKey || event.metaKey) {
                if (String.fromCharCode(event.which).toLowerCase() === 'v') {
                    paste_bin.innerHTML = '';
                    paste_bin.focus();
                    output_wrapper.classList.add('hidden');
                }
            }
        });

        paste_bin.addEventListener('paste', function () {
            setTimeout(read_paste_bin, 200);
        });

        var read_paste_bin = function () {
            var text_html = paste_bin.innerHTML;
            var text_markdown = html2markdown(text_html, {
                inlineStyle: true
            });
            output.textContent = text_markdown;
            output_wrapper.classList.remove('hidden');
        };

    });
})();
