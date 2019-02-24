var convert = require('./color-convert.js');

module.exports = function (cstr) {
    const base = "hsl";
    const size = 3;
    var m, conv, parts, alpha;

    if (m = /^((?:rgb|hs[lv]|cmyk|xyz|lab)a?)\s*\(([^\)]*)\)/.exec(cstr)) {
        var name = m[1];
        conv = convert[base];

        parts = m[2].replace(/^\s+|\s+$/g, '')
            .split(/\s*,\s*/)
            .map(function (x, i) {
                if (/%$/.test(x) && i === size) {
                    return parseFloat(x) / 100;
                }
                else if (/%$/.test(x)) {
                    return parseFloat(x);
                }
                return parseFloat(x);
            });

        if (name === base) parts.push(1);
        alpha = parts[size] === undefined ? 1 : parts[size];
        parts = parts.slice(0, size);

        conv[base] = function () { return parts };
    }

    return {rgb: conv.rgb(parts)};
};
