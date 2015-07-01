// ==UserScript==
// @name JSON formatter
// @namespace http://gerald.top
// @description Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version 1.0
// @match *://*/*
// @grant GM_addStyle
// @grant GM_registerMenuCommand
// ==/UserScript==

function safeHTML(html) {
  return html.replace(/[<&]/g, function (key) {
    return {
      '<': '&lt;',
      '&': '&amp;',
    }[key];
  });
}

function join(list) {
  var html = [];
  var open = false;
  var last = null;
  var close = function () {
    html.push('</li>');
    open = false;
    last = null;
  };
  list.forEach(function (item) {
    if (open && !item.backwards)
      close();
    if (!open) {
      html.push('<li>');
      open = true;
    }
    if (item.backwards && last && last.forwards)
      html.push(last.separator);
    html.push(item.data);
    if (!item.forwards)
      close();
    else
      last = item;
  });
  if (open) html.push('</li>');
  return html.join('');
}

function getHtml(data, cls) {
  return '<span class="' + (cls || typeof data) + '">' + data + '</span>';
}

function render(data) {
  if (Array.isArray(data)) {
    var arr = [];
    var ret = {
      backwards: true,
      forwards: true,
      separator: getHtml(',', 'separator'),
    };
    arr.push(getHtml('[', 'operator'));
    if (data.length) {
      arr.push('<ul>');
      arr.push(join(data.map(render)));
      arr.push('</ul>');
    } else {
      arr.push(getHtml('', 'separator'));
      ret.backwards = ret.forwards = false;
    }
    arr.push(getHtml(']', 'operator'));
    ret.data = arr.join('');
    return ret;
  } else if (data === null)
    return {data: getHtml('null', 'null'), backwards: true};
  else if (typeof data == 'object') {
    var arr = [];
    var ret = {
      backwards: true,
      forwards: true,
      separator: getHtml(',', 'separator'),
    };
    arr.push(getHtml('{', 'operator'));
    var objdata = [];
    for (var key in data) {
      objdata.push({
        data: getHtml(key, 'key'),
        forwards: true,
        separator: getHtml(':', 'separator'),
      });
      objdata.push(render(data[key]));
    }
    if (objdata.length) {
      arr.push('<ul>');
      arr.push(join(objdata));
      arr.push('</ul>');
    } else {
      arr.push(getHtml('', 'separator'));
      ret.backwards = ret.forwards = false;
    }
    arr.push(getHtml('}', 'operator'));
    ret.data = arr.join('');
    return ret;
  } else
    return {
      backwards: true,
      data: getHtml(data),
    };
}

function formatJSON() {
  if (config.formatted) {
    document.body.innerHTML = config.raw;
    config.formatted = false;
  } else {
    if (!('raw' in config)) {
      config.raw = document.body.innerHTML;
      config.data = JSON.parse(document.body.innerText);
      config.style = GM_addStyle(
        'ul.root{padding-left:0;}' +
        'li{list-style:none;}' +
        '.separator{margin-right:.5em;}' +
        '.number{color:darkorange;}' +
        '.key{color:brown;}' +
        '.string{color:green;}' +
        '.operator{color:blue;}'
      );
    }
    var ret = render(config.data);
    document.body.innerHTML = '<ul class="root"><li>' + ret.data + '</li></ul>';
    config.formatted = true;
  }
}

var config = {};
if (/\/json$/.test(document.contentType))
  formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);
