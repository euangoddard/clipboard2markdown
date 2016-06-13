function trim(value) {
    return value.replace(/^\s+|\s+$/g, "");
}

function asciify(str) {
    return str.replace(/[\u2018\u2019\u00b4]/g, "'")
              .replace(/[\u201c\u201d\u2033]/g, '"')
              .replace(/[\u2212\u2022\u00b7]/g, "-")
              .replace(/[\u2013\u2015]/g, "--")
              .replace(/\u2014/g, "---")
              .replace(/\u2026/g, "...")
              .replace(/[ ]+\n/g, "\n")
              .replace(/\n\n\n*/g, "\n\n");
}

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
            var text_markdown = trim(asciify(toMarkdown(trim(text_html))));
            output.value = text_markdown;
            output_wrapper.classList.remove('hidden');
            output.focus();
        };

        clear.addEventListener('click', function () {
            output.value = '';
            output_wrapper.classList.add('hidden');
        });

    });
})();
