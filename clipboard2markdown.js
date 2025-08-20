(function () {
  'use strict';

  // http://pandoc.org/README.html#pandocs-markdown
  var pandoc = [
    {
      filter: 'h1',
      replacement: function (content, node) {
        var underline = Array(content.length + 1).join('=');
        return '\n\n' + content + '\n' + underline + '\n\n';
      }
    },

    {
      filter: 'h2',
      replacement: function (content, node) {
        var underline = Array(content.length + 1).join('-');
        return '\n\n' + content + '\n' + underline + '\n\n';
      }
    },

    {
      filter: 'sup',
      replacement: function (content) {
        return '^' + content + '^';
      }
    },

    {
      filter: 'sub',
      replacement: function (content) {
        return '~' + content + '~';
      }
    },

    {
      filter: 'br',
      replacement: function () {
        return '\\\n';
      }
    },

    {
      filter: 'hr',
      replacement: function () {
        return '\n\n* * * * *\n\n';
      }
    },

    {
      filter: ['em', 'i', 'cite', 'var'],
      replacement: function (content) {
        return '*' + content + '*';
      }
    },

    {
      filter: function (node) {
        var hasSiblings = node.previousSibling || node.nextSibling;
        var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
        var isCodeElem = node.nodeName === 'CODE' ||
            node.nodeName === 'KBD' ||
            node.nodeName === 'SAMP' ||
            node.nodeName === 'TT';

        return isCodeElem && !isCodeBlock;
      },
      replacement: function (content) {
        return '`' + content + '`';
      }
    },

    {
      filter: function (node) {
        return node.nodeName === 'A' && node.getAttribute('href');
      },
      replacement: function (content, node) {
        var url = node.getAttribute('href');
        var titlePart = node.title ? ' "' + node.title + '"' : '';
        if (content === url) {
          return '<' + url + '>';
        } else if (url === ('mailto:' + content)) {
          return '<' + content + '>';
        } else {
          return '[' + content + '](' + url + titlePart + ')';
        }
      }
    },

    {
      filter: 'li',
      replacement: function (content, node) {
        content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ');
        var prefix = '-   ';
        var parent = node.parentNode;

        if (/ol/i.test(parent.nodeName)) {
          var index = Array.prototype.indexOf.call(parent.children, node) + 1;
          prefix = index + '. ';
          while (prefix.length < 4) {
            prefix += ' ';
          }
        }

        return prefix + content;
      }
    }
  ];

  // http://pandoc.org/README.html#smart-punctuation
  var escape = function (str) {
    return str.replace(/[\u2018\u2019\u00b4]/g, "'")
              .replace(/[\u201c\u201d\u2033]/g, '"')
              .replace(/[\u2212\u2022\u00b7\u25aa]/g, '-')
              .replace(/[\u2013\u2015]/g, '--')
              .replace(/\u2014/g, '---')
              .replace(/\u2026/g, '...')
              .replace(/[ ]+\n/g, '\n')
              .replace(/\s*\\\n/g, '\\\n')
              .replace(/\s*\\\n\s*\\\n/g, '\n\n')
              .replace(/\s*\\\n\n/g, '\n\n')
              .replace(/\n-\n/g, '\n')
              .replace(/\n\n\s*\\\n/g, '\n\n')
              .replace(/\n\n\n*/g, '\n\n')
              .replace(/[ ]+$/gm, '')
              .replace(/^\s+|[\s\\]+$/g, '');
  };

  var fixDivBasedTable = function(markdown) {
    // This function detects and fixes div-based table structures that look like:
    // |
    // ### Header
    // |
    // content
    // |
    
    var lines = markdown.split('\n');
    var result = [];
    var i = 0;
    
    while (i < lines.length) {
      var line = lines[i].trim();
      
      // Look for table pattern: standalone | followed by content
      if (line === '|' && i + 1 < lines.length) {
        // Check if this is the start of a table
        var tableCells = [];
        var currentCell = [];
        
        i++; // Skip the initial |
        
        while (i < lines.length) {
          var currentLine = lines[i].trim();
          
          if (currentLine === '|') {
            // End of current cell
            if (currentCell.length > 0) {
              tableCells.push(currentCell.join('\n').trim());
              currentCell = [];
            }
          } else if (currentLine === '' && i + 1 < lines.length && lines[i + 1].trim() === '|') {
            // Empty line before |, continue
          } else if (currentLine === '' && i + 1 < lines.length && lines[i + 1].trim() !== '|') {
            // Empty line not followed by |, end of table
            break;
          } else {
            // Content line, add to current cell
            currentCell.push(currentLine);
          }
          
          i++;
        }
        
        // Add any remaining content to the last cell
        if (currentCell.length > 0) {
          tableCells.push(currentCell.join('\n').trim());
        }
        
        // Try to determine column count from headers (look for ### patterns)
        var headerCount = 0;
        for (var h = 0; h < tableCells.length && h < 10; h++) { // Check first 10 cells max
          if (tableCells[h].match(/^### /)) {
            headerCount++;
          } else {
            break;
          }
        }
        
        // If we found headers and have enough cells for at least one complete row
        if (headerCount > 0 && tableCells.length >= headerCount) {
          result.push(''); // Empty line before table
          
          // Create header row
          var headerRow = '|';
          for (var h = 0; h < headerCount; h++) {
            var headerText = tableCells[h].replace(/^### /, '');
            headerRow += ' ' + headerText + ' |';
          }
          result.push(headerRow);
          
          // Create separator row
          var separatorRow = '|';
          for (var s = 0; s < headerCount; s++) {
            separatorRow += '---|';
          }
          result.push(separatorRow);
          
          // Create data rows
          for (var d = headerCount; d < tableCells.length; d += headerCount) {
            var dataRow = '|';
            for (var c = 0; c < headerCount; c++) {
              var cellData = tableCells[d + c] || '';
              dataRow += ' ' + cellData + ' |';
            }
            result.push(dataRow);
          }
          
          result.push(''); // Empty line after table
        } else {
          // Not a valid table, add back as is
          result.push('|');
          for (var t = 0; t < tableCells.length; t++) {
            result.push(tableCells[t]);
            result.push('|');
          }
        }
        
        i--; // Adjust because we'll increment at end of loop
      } else {
        // Not a table line, add as is
        result.push(lines[i]);
      }
      
      i++;
    }
    
    return result.join('\n');
  };

  var fixMultilineTableCells = function(markdown) {
    // Step 1: Fix individual cells first
    markdown = markdown.replace(/\|\s*\n+([^|]+?)\n+\s*\|/g, function(match, content) {
      var cleaned = content.trim()
        .replace(/\n+/g, ' ')
        .replace(/^\s*###\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
      return '| ' + cleaned + ' |';
    });
    
    // Step 2: Look for table patterns and reconstruct entire tables
    var lines = markdown.split('\n');
    var result = [];
    var i = 0;
    
    while (i < lines.length) {
      var line = lines[i].trim();
      
      // Look for the start of a broken table (lines with pipes)
      if (line.match(/^\|.*\|$/)) {
        // Found a potential table row, determine column count
        var firstRowCells = line.split('|').slice(1, -1); // Remove empty first/last
        var columnCount = firstRowCells.length;
        
        if (columnCount > 0) {
          var tableData = [];
          var currentRow = [];
          
          // Add the first row
          for (var fc = 0; fc < firstRowCells.length; fc++) {
            currentRow.push(firstRowCells[fc].trim());
          }
          tableData.push(currentRow);
          currentRow = [];
          
          // Process the rest of the table section
          i++;
          while (i < lines.length) {
            var currentLine = lines[i].trim();
            
            if (currentLine.match(/^\|.*\|$/)) {
              // This is a table row
              var cells = currentLine.split('|').slice(1, -1); // Remove empty first/last
              for (var c = 0; c < cells.length && c < columnCount; c++) {
                currentRow.push(cells[c].trim());
              }
              
              // Pad row to match column count
              while (currentRow.length < columnCount) {
                currentRow.push('');
              }
              
              tableData.push(currentRow);
              currentRow = [];
            } else if (currentLine === '' && tableData.length > 0) {
              break; // End of table
            } else if (currentLine && !currentLine.includes('|') && tableData.length > 0) {
              // Content that belongs to the last cell
              var lastRow = tableData[tableData.length - 1];
              if (lastRow && lastRow.length > 0) {
                lastRow[lastRow.length - 1] += ' ' + currentLine;
              }
            }
            
            i++;
          }
          
          // Reconstruct the table
          if (tableData.length > 0) {
            result.push('');
            for (var r = 0; r < tableData.length; r++) {
              var row = tableData[r];
              var rowString = '|';
              
              for (var col = 0; col < columnCount; col++) {
                var cellContent = (row[col] || '').replace(/^\s*###\s*/, '').trim();
                rowString += ' ' + cellContent + ' |';
              }
              
              result.push(rowString);
              
              // Add separator after header row
              if (r === 0) {
                var separator = '|';
                for (var sep = 0; sep < columnCount; sep++) {
                  separator += '---|';
                }
                result.push(separator);
              }
            }
            result.push('');
          }
        
        i--; // Adjust for loop increment
      } else {
        result.push(lines[i]);
      }
      
      i++;
    }
    
    return result.join('\n');
  };

  var fixHeaderSequenceTable = function(markdown) {
    // This function detects sequences of consecutive ### headers
    // followed by content and converts them to table format
    
    var lines = markdown.split('\n');
    var result = [];
    var i = 0;
    
    while (i < lines.length) {
      var line = lines[i].trim();
      
      // Look for sequences of consecutive ### headers
      if (line.match(/^### .+/)) {
        var headers = [];
        var startIndex = i;
        
        // Collect consecutive headers
        while (i < lines.length && lines[i].trim().match(/^### .+/)) {
          headers.push(lines[i].trim().replace(/^### /, ''));
          i += 2; // Skip header and empty line
        }
        
        // Only process if we have at least 2 headers
        if (headers.length >= 2) {
          var tableData = [];
          var currentRow = [];
          var cellContent = '';
          var cellIndex = 0;
          
          // Process content after headers
          while (i < lines.length) {
            var currentLine = lines[i].trim();
            
            if (currentLine === '' && cellContent.trim() !== '') {
              // End of current cell content
              currentRow[cellIndex] = cellContent.trim();
              cellContent = '';
              cellIndex++;
              
              if (cellIndex >= headers.length) {
                // Complete row
                tableData.push(currentRow);
                currentRow = [];
                cellIndex = 0;
              }
            } else if (currentLine !== '') {
              // Add to current cell content
              if (cellContent) cellContent += ' ';
              cellContent += currentLine;
            }
            
            i++;
            
            // Stop if we hit another header section
            if (currentLine.match(/^#{1,6}\s/)) {
              break;
            }
          }
          
          // Add any remaining content
          if (cellContent.trim()) {
            currentRow[cellIndex] = cellContent.trim();
            if (currentRow.length > 0) {
              // Pad row to match header count
              while (currentRow.length < headers.length) {
                currentRow.push('');
              }
              tableData.push(currentRow);
            }
          }
          
          // Generate the table
          if (tableData.length > 0) {
            result.push('');
            
            // Create header row
            var headerRow = '|';
            for (var h = 0; h < headers.length; h++) {
              headerRow += ' ' + headers[h] + ' |';
            }
            result.push(headerRow);
            
            // Create separator row
            var separatorRow = '|';
            for (var s = 0; s < headers.length; s++) {
              separatorRow += '---|';
            }
            result.push(separatorRow);
            
            // Create data rows
            for (var r = 0; r < tableData.length; r++) {
              var row = tableData[r];
              var dataRow = '|';
              for (var c = 0; c < headers.length; c++) {
                var cellData = (row[c] || '').trim();
                dataRow += ' ' + cellData + ' |';
              }
              result.push(dataRow);
            }
            result.push('');
          }
          
          i--; // Adjust for loop increment
        } else {
          // Not enough headers, add back as-is
          i = startIndex;
          result.push(lines[i]);
        }
      } else {
        result.push(lines[i]);
      }
      
      i++;
    }
    
    return result.join('\n');
  };

  var convert = function (str) {
    // First, convert with GFM (which includes table support)
    var gfmResult = toMarkdown(str, { gfm: true });
    
    // Then apply pandoc-specific formatting rules manually
    gfmResult = gfmResult.replace(/^# (.+)$/gm, function(match, content) {
      var underline = Array(content.length + 1).join('=');
      return '\n\n' + content + '\n' + underline + '\n\n';
    });
    
    gfmResult = gfmResult.replace(/^## (.+)$/gm, function(match, content) {
      var underline = Array(content.length + 1).join('-');
      return '\n\n' + content + '\n' + underline + '\n\n';
    });
    
    // Apply escape and then fix tables
    var escaped = escape(gfmResult);
    var fixed = fixDivBasedTable(escaped);
    fixed = fixMultilineTableCells(fixed);
    fixed = fixHeaderSequenceTable(fixed);
    
    return fixed;
  }

  var insert = function (myField, myValue) {
      if (document.selection) {
          myField.focus();
          sel = document.selection.createRange();
          sel.text = myValue;
          sel.select()
      } else {
          if (myField.selectionStart || myField.selectionStart == "0") {
              var startPos = myField.selectionStart;
              var endPos = myField.selectionEnd;
              var beforeValue = myField.value.substring(0, startPos);
              var afterValue = myField.value.substring(endPos, myField.value.length);
              myField.value = beforeValue + myValue + afterValue;
              myField.selectionStart = startPos + myValue.length;
              myField.selectionEnd = startPos + myValue.length;
              myField.focus()
          } else {
              myField.value += myValue;
              myField.focus()
          }
      }
  };

  // http://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
  document.addEventListener('DOMContentLoaded', function () {
    var info = document.querySelector('#info');
    var pastebin = document.querySelector('#pastebin');
    var output = document.querySelector('#output');
    var wrapper = document.querySelector('#wrapper');

    document.addEventListener('keydown', function (event) {
      if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which).toLowerCase() === 'v') {
          pastebin.innerHTML = '';
          pastebin.focus();
          info.classList.add('hidden');
          wrapper.classList.add('hidden');
        }
      }
    });

    pastebin.addEventListener('paste', function () {
      setTimeout(function () {
        var html = pastebin.innerHTML;
        var markdown = convert(html);
        // output.value = markdown;
        insert(output, markdown);
        wrapper.classList.remove('hidden');
        output.focus();
        output.select();
      }, 200);
    });
  });
})();
