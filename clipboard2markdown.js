function asciify(str) {
    return str.replace(/[\u2018\u2019\u00b4]/g, "'")
              .replace(/[\u201c\u201d\u2033]/g, '"')
              .replace(/[\u2212\u2022\u00b7]/g, "-")
              .replace(/[\u2013\u2015]/g, "--")
              .replace(/\u2014/g, "---")
              .replace(/\u2026/g, "...")
              .replace(/[ ]+\n/g, "\n")
              .replace(/\s*\\\n/g, "\\\n")
              .replace(/\s*\\\n\s*\\\n/g, "\n\n")
              .replace(/\s*\\\n\n/g, "\n\n")
              .replace(/\n-\n/g, "\n")
              .replace(/\n\n\s*\\\n/g, "\n\n")
              .replace(/\n\n\n*/g, "\n\n")
              .replace(/^\s+|\s+$/g, "");
}

var array = [
  {
    filter: 'h1',
    replacement: function (content, node) {
      var underline = Array(content.length + 1).join("=")
      return '\n\n' + content + '\n' + underline + '\n\n'
    }
  },

  {
    filter: 'h2',
    replacement: function (content, node) {
      var underline = Array(content.length + 1).join("-")
      return '\n\n' + content + '\n' + underline + '\n\n'
    }
  },

  {
    filter: 'sup',
    replacement: function (content) {
      return '^' + content + '^'
    }
  },

  {
    filter: 'sub',
    replacement: function (content) {
      return '~' + content + '~'
    }
  },

  {
    filter: 'br',
    replacement: function () {
      return '\\\n'
    }
  },

  {
    filter: 'hr',
    replacement: function () {
      return '\n\n* * * * *\n\n'
    }
  },

  {
    filter: ['em', 'i'],
    replacement: function (content) {
      return '*' + content + '*'
    }
  },

  {
    filter: function (node) {
      var hasSiblings = node.previousSibling || node.nextSibling
      var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings
      var isCodeElem = node.nodeName === 'CODE' ||
          node.nodeName === 'KBD'  ||
          node.nodeName === 'SAMP' ||
          node.nodeName === 'TT'

      return isCodeElem && !isCodeBlock
    },
    replacement: function (content) {
      return '`' + content + '`'
    }
  },

  {
    filter: function (node) {
      return node.nodeName === 'A' && node.getAttribute('href')
    },
    replacement: function (content, node) {
      var titlePart = node.title ? ' "' + node.title + '"' : ''
      var url = node.getAttribute('href');
      if(content == url) {
        return '<' + url + '>';
      } else {
        return '[' + content + '](' + url + titlePart + ')'
      }
    }
  },

  {
    filter: 'li',
    replacement: function (content, node) {
      content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ')
      var prefix = '-   '
      var parent = node.parentNode

      if(/ol/i.test(parent.nodeName)) {
        var index = Array.prototype.indexOf.call(parent.children, node) + 1
        prefix = index + '. ';
        while(prefix.length < 4) {
          prefix += ' ';
        }
      }

      return prefix + content
    }
  }
];

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
            var text_markdown = asciify(toMarkdown(text_html,
                                                   { converters: array,
                                                     gfm: true }));
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
