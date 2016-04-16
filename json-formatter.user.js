// ==UserScript==
// @name JSON formatter
// @namespace http://gerald.top
// @author  Gerald <i@gerald.top>
// @icon  http://cn.gravatar.com/avatar/a0ad718d86d21262ccd6ff271ece08a3?s=80
// @description Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version 1.1.6
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
        'body{position:relative;margin:0;padding:.5em;}' +
        'ul.root{margin:0;padding-left:0;}' +
        'li{list-style:none;}' +
        '.separator{margin-right:.5em;}' +
        '.number{color:darkorange;}' +
        '.null{color:gray;}' +
        '.key{color:brown;}' +
        '.string{color:green;}' +
        '.operator{color:blue;}' +
        '.value{cursor:pointer;}' +
        '.popup{position:absolute;padding:.5em;border-radius:.5em;box-shadow:0 0 1em gray;background:white;z-index:1;white-space:nowrap;color:black;}' +
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
  function hide() {
    popup.remove();
  }
  var popup = document.createElement('div');
  popup.className = 'popup';
  popup.addEventListener('click', function (e) {
    e.stopPropagation();
  }, false);
  document.addEventListener('click', hide, false);
  config.popup = {
    node: popup,
    hide: hide,
    show: function (range) {
      var gap = 5;
      var scrollHeight = document.body.scrollHeight;
      var scrollTop = document.body.scrollTop;
      var rects = range.getClientRects(), rect;
      if (rects[0].top < 100) {
        rect = rects[rects.length - 1];
        popup.style.top = rect.bottom + scrollTop + gap + 'px';
        popup.style.bottom = '';
      } else {
        rect = rects[0];
        popup.style.top = '';
        popup.style.bottom = scrollHeight - rect.top - scrollTop + gap + 'px';
      }
      popup.style.left = rect.left + 'px';
      popup.innerHTML = '<span class="info-key">type</span>: <span class="info-val">' + safeHTML(range.startContainer.dataset.type) + '</span>';
      document.body.appendChild(popup);
    },
  };
}

function selectNode(node) {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.setStartBefore(node.firstChild);
  range.setEndAfter(node.firstChild);
  selection.addRange(range);
  return range;
}

function bindEvents(root) {
  root.addEventListener('click', function (e) {
    e.stopPropagation();
    var target = e.target;
    if (target.classList.contains('value')) {
      config.popup.show(selectNode(target));
    } else
      config.popup.hide();
  }, false);
}

var config = {};
if (/\/json$/.test(document.contentType))
  formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);
