// ==UserScript==
// @name JSON formatter
// @namespace http://gerald.top
// @description Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version 0.1
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

function render(data) {
  if (Array.isArray(data)) {
    var ret = [];
    ret.push({data: '[', cls: 'opr'});
    data.forEach(function (item) {
      ret = ret.concat(render(item));
    });
    ret.push({data: ']', cls: 'opr', back: true});
    return ret;
  } else if (data === null)
    return {data: data.toString(), cls: 'null'};
  else if (typeof data == 'object') {
    var ret = [];
    ret.push({data: '{', cls: 'opr'});
    for (var key in data) {
      ret.push({data: key.toString(), cls: 'key'});
      ret = ret.concat(render(data[key]));
    }
    ret.push({data: '}', cls: 'opr', back: true});
    return ret;
  } else
    return {data: data.toString(), cls: typeof data};
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
        '.comma,.colon{margin-right:1em;}' +
        '.number{color:darkorange;}' +
        '.key{color:brown;}' +
        '.string{color:green;}' +
        '.opr{color:blue;}'
      );
    }
    var ret = render(config.data);
    var html = ['<ul class="root">'];
    var lastCls;
    var open = false;
    ret.forEach(function (item) {
      if (item.cls == 'opr') {
        if (item.back) html.push('</ul>');
        if (open) {
          if(!item.back && lastCls == 'opr')
            html.push('<span class="comma">,</span>');
        } else {
          html.push('<li>');
          open = true;
        }
        html.push('<span class="' + item.cls + '">' + safeHTML(item.data) + '</span>');
        if (!item.back) {
          html.push('<ul>');
          open = false;
        }
      } else if (item.cls == 'key') {
        // assert(open == false);
        html.push('<li>');
        open = true;
        html.push('<span class="key">' + safeHTML(item.data) + '</span>');
        html.push('<span class="colon">:</span>');
      } else {
        if (lastCls != 'key') {
          html.push('<li>');
          open = true;
        }
        html.push('<span class="' + item.cls + '">' + safeHTML(item.data) + '</span>');
      }
      lastCls = item.cls;
    });
    html.push('</ul>');
    document.body.innerHTML = html.join('');
    config.formatted = true;
  }
}

var config = {};
if (/\/json$/.test(document.contentType))
  formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);
