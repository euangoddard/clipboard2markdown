(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var button = document.querySelector('#start');
        var paste_bin = document.querySelector('#paste-bin');
        var paste_info = document.querySelector('#paste-info');
        var output = document.querySelector('#output');

        button.addEventListener('click', function () {
            button.classList.add('hidden');
            paste_info.classList.remove('hidden');
            paste_bin.innerHTML = '';
            paste_bin.focus();
            output.classList.add('hidden');
        });

        paste_bin.addEventListener('paste', function () {
            setTimeout(read_paste_bin, 200);
        });

        var read_paste_bin = function () {
            var html = paste_bin.innerHTML;
            button.classList.remove('hidden');
            paste_info.classList.add('hidden');
            output.classList.remove('hidden');
            output.textContent = html2markdown(html);

        };

    });
})();
