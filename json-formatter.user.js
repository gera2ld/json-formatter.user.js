// ==UserScript==
// @name        JSON formatter
// @namespace   http://gerald.top
// @author      Gerald <i@gerald.top>
// @icon        http://cn.gravatar.com/avatar/a0ad718d86d21262ccd6ff271ece08a3?s=80
// @description Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version     1.2
// @match       *://*/*
// @match       file:///*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
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
  function open() {
    if (!isOpen) {
      html.push('<li>');
      isOpen = true;
    }
  }
  function close() {
    if (isOpen) {
      html.push('</li>');
      isOpen = false;
    }
  }
  var html = [];
  var isOpen = false;
  list.forEach(function (item, i) {
    var next = list[i + 1];
    open();
    item.data && html.push(item.data);
    next && item.separator && html.push(item.separator);
    if (
      !next
      || next.type === KEY
      || item.type !== KEY && (
        item.type === SINGLELINE || next.type === SINGLELINE
      )
    ) close();
  });
  return html.join('');
}

function getHtml(data) {
  var type = typeof data.value;
  var html = '<span class="' + (data.cls || 'value ' + type) + '" ' +
    'data-type="' + safeHTML(data.type || type) + '" ' +
    'data-value="' + safeHTML(data.value) + '">' + safeHTML(data.value) + '</span>';
  if ((data.cls === 'key' || !data.cls && type === 'string') && config.showQuotes)
    html = '"' + html + '"';
  return html;
}

function render(data) {
  var ret;
  if (Array.isArray(data)) {
    var arr = [];
    ret = {
      type: MULTILINE,
      separator: getHtml({
        value: config.showSeparators ? ',' : '',
        cls: 'separator',
      }),
    };
    arr.push(getHtml({value: '[', cls: 'operator'}));
    if (data.length) {
      arr.push('<ul>', join(data.map(render)), '</ul>');
    } else {
      arr.push(getHtml({value: '', cls: 'separator'}));
      ret.type = SINGLELINE;
    }
    arr.push(getHtml({value: ']', cls: 'operator'}));
    ret.data = arr.join('');
  } else if (data === null) {
    ret = {
      type: SINGLELINE,
      separator: getHtml({
        value: config.showSeparators ? ',' : '',
        cls: 'separator',
      }),
      data: getHtml({value: data, cls: 'value null'}),
    };
  } else if (typeof data == 'object') {
    var arr = [];
    ret = {
      type: MULTILINE,
      separator: getHtml({
        value: config.showSeparators ? ',' : '',
        cls: 'separator',
      }),
    };
    arr.push(getHtml({value: '{', cls: 'operator'}));
    var objdata = [];
    for (var key in data) {
      objdata.push({
        type: KEY,
        data: getHtml({value: key, cls: 'key'}),
        separator: getHtml({value: ':', cls: 'separator'}),
      }, render(data[key]));
    }
    if (objdata.length) {
      arr.push('<ul>', join(objdata), '</ul>');
    } else {
      arr.push(getHtml({value: '', cls: 'separator'}));
      ret.type = SINGLELINE;
    }
    arr.push(getHtml({value: '}', cls: 'operator'}));
    ret.data = arr.join('');
  } else {
    ret = {
      type: SINGLELINE,
      separator: getHtml({
        value: config.showSeparators ? ',' : '',
        cls: 'separator',
      }),
      data: getHtml({value: data}),
    };
  }
  return ret;
}

function formatJSON() {
  if (formatter.formatted) {
    formatter.tips.hide();
    formatter.menu.detach();
    document.body.innerHTML = formatter.raw;
    formatter.formatted = false;
  } else {
    if (!('raw' in formatter)) {
      formatter.raw = document.body.innerHTML;
      formatter.data = JSON.parse(document.body.innerText);
      formatter.style = GM_addStyle([
        '*{font-family:Microsoft YaHei,Tahoma;font-size:14px;}',
        'body,ul{margin:0;padding:0;}',
        '#root{position:relative;margin:0;padding:1em;}',
        '#root>ul ul{padding-left:2em;}',
        'li{list-style:none;}',
        '.separator{margin-right:.5em;}',
        '.number{color:darkorange;}',
        '.null{color:gray;}',
        '.key{color:brown;}',
        '.string{color:green;}',
        '.boolean{color:dodgerblue;}',
        '.operator{color:blue;}',
        '.value{cursor:pointer;}',
        '.tips{position:absolute;padding:.5em;border-radius:.5em;box-shadow:0 0 1em gray;background:white;z-index:1;white-space:nowrap;color:black;}',
        '.tips-key{font-weight:bold;}',
        '.tips-val{color:dodgerblue;}',
        '.menu{position:fixed;top:0;right:0;background:white;padding:5px;}',
        '.menu>span{margin-right:5px;}',
        '.menu .btn{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#eee;border-radius:4px;cursor:pointer;}',
        '.menu .btn.active{color:white;background:#333;}',
        '.hide{display:none;}',
      ].join(''));
      initTips();
      initMenu();
      formatter.render = function () {
        var root = formatter.root.querySelector('li');
        root.innerHTML = render(formatter.data).data;
      };
    }
    document.body.innerHTML = '<div id="root"><ul><li></li></ul></div>';
    formatter.formatted = true;
    formatter.root = document.querySelector('#root');
    formatter.menu.attach();
    bindEvents();
    formatter.render();
  }
}

function removeEl(el) {
  el && el.parentNode && el.parentNode.removeChild(el);
}

function initMenu() {
  var menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = [
    '<span class="btn" data-key="showQuotes">"</span>',
    '<span class="btn" data-key="showSeparators">,</span>',
  ].join('');
  [].forEach.call(menu.querySelectorAll('[data-key]'), function (el) {
    if (config[el.dataset.key]) el.classList.add('active');
  });
  menu.addEventListener('click', function (e) {
    var el = e.target;
    var key = el.dataset.key;
    if (key) {
      config[key] = !config[key];
      GM_setValue('config', config);
      el.classList.toggle('active');
      formatter.render();
    }
  }, false);
  formatter.menu = {
    node: menu,
    attach: function () {
      formatter.root.appendChild(menu);
    },
    detach: function () {
      removeEl(menu);
    },
  };
}

function initTips() {
  function hide() {
    removeEl(tips);
  }
  var tips = document.createElement('div');
  tips.className = 'tips';
  tips.addEventListener('click', function (e) {
    e.stopPropagation();
  }, false);
  document.addEventListener('click', hide, false);
  formatter.tips = {
    node: tips,
    hide: hide,
    show: function (range) {
      var gap = 5;
      var scrollTop = document.body.scrollTop;
      var rects = range.getClientRects(), rect;
      if (rects[0].top < 100) {
        rect = rects[rects.length - 1];
        tips.style.top = rect.bottom + scrollTop + gap + 'px';
        tips.style.bottom = '';
      } else {
        rect = rects[0];
        tips.style.top = '';
        tips.style.bottom = formatter.root.offsetHeight - rect.top - scrollTop + gap + 'px';
      }
      tips.style.left = rect.left + 'px';
      tips.innerHTML = '<span class="tips-key">type</span>: <span class="tips-val">' + safeHTML(range.startContainer.dataset.type) + '</span>';
      formatter.root.appendChild(tips);
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

function bindEvents() {
  formatter.root.addEventListener('click', function (e) {
    e.stopPropagation();
    var target = e.target;
    if (target.classList.contains('value')) {
      formatter.tips.show(selectNode(target));
    } else
      formatter.tips.hide();
  }, false);
}

var getId = function () {
  var id = 0;
  return function () {
    return ++ id;
  };
}();
var SINGLELINE = getId();
var MULTILINE = getId();
var KEY = getId();

var formatter = {};
var config = GM_getValue('config', {
  showSeparators: true,
  showQuotes: true,
});

~[
  'application/json',
  'text/plain',
].indexOf(document.contentType) && formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);
