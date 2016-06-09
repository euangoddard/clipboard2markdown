(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var instructions = document.querySelector('#instructions');
        var paste_bin = document.querySelector('#paste-bin');
        var output = document.querySelector('#output');
        var output_wrapper = document.querySelector('#output-wrapper');
        var clear = document.querySelector('#clear');

        document.addEventListener('keydown', function (event) {
            if (event.ctrlKey || event.metaKey) {
                if (String.fromCharCode(event.which).toLowerCase() === 'v') {
                    paste_bin.innerHTML = '';
                    paste_bin.focus();
                    instructions.classList.add('hidden');
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
            output.value = text_markdown;
            output_wrapper.classList.remove('hidden');
        };

        clear.addEventListener('click', function () {
            output.value = '';
            output_wrapper.classList.add('hidden');
        });

    });
})();
