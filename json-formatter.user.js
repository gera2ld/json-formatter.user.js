// ==UserScript==
// @name              JSON formatter
// @namespace         https://gera2ld.space
// @author            Gerald <gera2ld@live.com>
// @icon              http://cn.gravatar.com/avatar/a0ad718d86d21262ccd6ff271ece08a3?s=80
// @description       Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version           2.0.10
// @require           https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @match             *://*/*
// @match             file:///*
// @grant             GM_addElement
// @grant             GM_registerMenuCommand
// ==/UserScript==

(function () {
'use strict';

let iframe;
if (testRules([
// text/javascript - file:///foo/bar.js
/^(?:text|application)\/(?:.*?\+)?(?:plain|json|javascript)$/], document.contentType)) formatJSON();
GM_registerMenuCommand('Format JSON', formatJSON);
function testRules(rules, contentType) {
  for (const rule of rules) {
    if (typeof rule === 'string') {
      if (rule === contentType) return true;
    } else if (typeof (rule == null ? void 0 : rule.test) === 'function') {
      if (rule.test(contentType)) return true;
    }
  }
  return false;
}
function formatJSON() {
  if (iframe) return;
  const content = JSON.parse(document.body.textContent);
  document.body.innerHTML = '';
  iframe = GM_addElement(document.body, 'iframe', {
    sandbox: 'allow-scripts',
    src: 'https://json.gera2ld.space/embed',
    style: `position:fixed;width:100vw;height:100vh;inset:0;border:none`
  });
  const setData = () => {
    iframe.contentWindow.postMessage({
      type: 'setData',
      payload: content
    }, '*');
  };
  iframe.addEventListener('load', () => {
    setData();
  });
  window.addEventListener('message', e => {
    const {
      type
    } = e.data;
    switch (type) {
      case 'ready':
        {
          setData();
          break;
        }
    }
  });
}

})();
