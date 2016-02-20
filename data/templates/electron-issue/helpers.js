function formatNumber(data) {
    if (data !== null)
    {
        data = data.toFixed(2);
        data = addCommas(data);
        data = replaceBy(data, "-", " ")
        data = replaceBy(data, ".", ",");
        return data;
    }
}

function addCommas(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + '-' + '$2');
    }
    return x1 + x2;
}

function replaceBy(data, search, replacement) {
    return data.split(search).join(replacement);
}