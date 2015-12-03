// ==UserScript==
// @name JSON formatter
// @namespace http://gerald.top
// @description Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version 1.1.4
// @match *://*/*
// @grant GM_addStyle
// @grant GM_registerMenuCommand
// ==/UserScript==

function safeHTML(html) {
  return String(html).replace(/[<&"]/g, function (key) {
    return {
      '<': '&lt;',
      '&': '&amp;',
      '"': '&quot;',
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

function getHtml(data) {
  var html = '<span class="' + (data.cls || 'value ' + typeof data.value) + '" ' +
    'data-type="' + safeHTML(data.type || typeof data.value) + '" ' +
    'data-value="' + safeHTML(data.value) + '">' + safeHTML(data.value) + '</span>';
  return html;
}

function render(data) {
  if (Array.isArray(data)) {
    var arr = [];
    var ret = {
      backwards: true,
      forwards: true,
      separator: getHtml({value: ',', cls: 'separator'}),
    };
    arr.push(getHtml({value: '[', cls: 'operator'}));
    if (data.length) {
      arr.push('<ul>');
      arr.push(join(data.map(render)));
      arr.push('</ul>');
    } else {
      arr.push(getHtml({value: '', cls: 'separator'}));
      ret.forwards = false;
    }
    arr.push(getHtml({value: ']', cls: 'operator'}));
    ret.data = arr.join('');
    return ret;
  } else if (data === null)
    return {data: getHtml({value: data, cls: 'value null'}), backwards: true};
  else if (typeof data == 'object') {
    var arr = [];
    var ret = {
      backwards: true,
      forwards: true,
      separator: getHtml({value: ',', cls: 'separator'}),
    };
    arr.push(getHtml({value: '{', cls: 'operator'}));
    var objdata = [];
    for (var key in data) {
      objdata.push({
        data: getHtml({value: key, cls: 'key'}),
        forwards: true,
        separator: getHtml({value: ':', cls: 'separator'}),
      });
      objdata.push(render(data[key]));
    }
    if (objdata.length) {
      arr.push('<ul>');
      arr.push(join(objdata));
      arr.push('</ul>');
    } else {
      arr.push(getHtml({value: '', cls: 'separator'}));
      ret.forwards = false;
    }
    arr.push(getHtml({value: '}', cls: 'operator'}));
    ret.data = arr.join('');
    return ret;
  } else
    return {
      backwards: true,
      data: getHtml({value: data}),
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
        '*{font-family:Microsoft YaHei,Tahoma;font-size:15px;}' +
        'ul.root{padding-left:0;}' +
        'li{list-style:none;}' +
        '.separator{margin-right:.5em;}' +
        '.number{color:darkorange;}' +
        '.null{color:gray;}' +
        '.key{color:brown;}' +
        '.string{color:green;}' +
        '.operator{color:blue;}' +
        '.value{position:relative;cursor:pointer;}' +
        '.popup{position:absolute;top:0;left:0;right:0;bottom:0;}' +
        '.popup-data{position:absolute;top:0;left:0;width:100%;bottom:0;border:none;cursor:pointer;box-sizing:content-box;padding:2px;margin:-2px;outline:1px dotted gray;}' +
        '.popup-info{position:absolute;top:100%;margin-top:.5em;padding:.5em;border-radius:.5em;box-shadow:0 0 1em gray;background:white;z-index:1;white-space:nowrap;color:black;}' +
        '.info-key{font-weight:bold;}' +
        '.info-val{color:dodgerblue;}' +
        '.hide{display:none;}'
      );
      initPopup();
    }
    var ret = render(config.data);
    document.body.innerHTML = '<ul class="root"><li>' + ret.data + '</li></ul>';
    config.formatted = true;
    bindEvents(document.body.querySelector('.root'));
  }
}

function initPopup() {
  var popup = document.createElement('div');
  popup.className = 'popup';
  var input = document.createElement('input');
  input.className = 'popup-data';
  input.readOnly = true;
  popup.appendChild(input);
  var info = document.createElement('div');
  info.className = 'popup-info';
  popup.appendChild(info);
  var hide = function () {
    var parent = popup.parentNode;
    if (parent) parent.removeChild(popup);
  };
  input.addEventListener('mouseup', function (e) {
    e.preventDefault();
    this.select();
  }, false);
  popup.addEventListener('click', function (e) {
    e.stopPropagation();
  }, false);
  document.addEventListener('click', hide, false);
  config.popup = {
    node: popup,
    hide: hide,
    show: function (target) {
      target.appendChild(popup);
      input.value = target.dataset.value || '';
      input.select();
      input.focus();
      info.innerHTML = '<span class="info-key">type</span>: <span class="info-val">' + safeHTML(target.dataset.type) + '</span>';
    },
  };
}

function bindEvents(root) {
  root.addEventListener('click', function (e) {
    e.stopPropagation();
    var target = e.target;
    if (target.classList.contains('value'))
      config.popup.show(target);
    else
      config.popup.hide();
  }, false);
}

var config = {};
if (/\/json$/.test(document.contentType))
  formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);
