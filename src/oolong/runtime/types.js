"use strict";

const DOUBLE_QUOTE = "\"";
const ESCAPED_DOUBLE_QUOTE = "\"\"";
const CHARACTERS_THAT_MUST_BE_QUOTED = /,|"|\n/;

exports.escapeCsv = function (s) {
    if (s.indexOf(DOUBLE_QUOTE) !== -1) {
        s = s.replace(DOUBLE_QUOTE, ESCAPED_DOUBLE_QUOTE);
    }

    if (s.search(CHARACTERS_THAT_MUST_BE_QUOTED) !== -1) {
        s = DOUBLE_QUOTE + s + DOUBLE_QUOTE;
    }

    return s;
};

exports.unescapeCsv = function (s) {
    if (s.startsWith(DOUBLE_QUOTE) && s.endsWith(DOUBLE_QUOTE)) {
        s = s.substr(1, s.Length - 2);

        if (s.indexOf(ESCAPED_DOUBLE_QUOTE) !== -1) {
            s = s.replace(ESCAPED_DOUBLE_QUOTE, DOUBLE_QUOTE);
        }
    }

    return s;
};

exports.TYPE_INT = 'int';
exports.TYPE_FLOAT = 'float';
exports.TYPE_BOOL = 'bool';
exports.TYPE_TEXT = 'text';
exports.TYPE_BINARY = 'binary';
exports.TYPE_DATETIME = 'datetime';
exports.TYPE_JSON = 'json';
exports.TYPE_XML = 'xml';
exports.TYPE_ENUM = 'enum';
exports.TYPE_CSV = 'csv';