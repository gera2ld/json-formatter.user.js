// ==UserScript==
// @name        JSON formatter
// @namespace   http://gerald.top
// @author      Gerald <i@gerald.top>
// @icon        http://cn.gravatar.com/avatar/a0ad718d86d21262ccd6ff271ece08a3?s=80
// @description Format JSON data in a beautiful way.
// @description:zh-CN 更加漂亮地显示JSON数据。
// @version     process.env.VERSION
// @match       *://*/*
// @match       file:///*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_setClipboard
// ==/UserScript==

const gap = 5;

const formatter = {
  options: [{
    key: 'show-quotes',
    title: '"',
    def: true,
  }, {
    key: 'show-commas',
    title: ',',
    def: true,
  }],
};

const config = {
  ...formatter.options.reduce((res, item) => {
    res[item.key] = item.def;
    return res;
  }, {}),
  ...GM_getValue('config'),
};

if ([
  'application/json',
  'text/plain',
  'application/javascript',
  'text/javascript',    // file:///foo/bar.js
].includes(document.contentType)) formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);

function safeHTML(html) {
  return String(html).replace(/[<&"]/g, key => ({
    '<': '&lt;',
    '&': '&amp;',
    '"': '&quot;',
  }[key]));
}

function createElement(tag, props) {
  const el = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(key => {
      el[key] = props[key];
    });
  }
  return el;
}

function createQuote() {
  return createElement('span', {
    className: 'subtle quote',
    textContent: '"',
  });
}

function createComma() {
  return createElement('span', {
    className: 'subtle comma',
    textContent: ',',
  });
}

function loadJSON() {
  const raw = document.body.innerText;
  try {
    // JSON
    const content = JSON.parse(raw);
    return { raw, content };
  } catch (e) {
    // not JSON
  }
  try {
    // JSONP
    const parts = raw.match(/^(.*?\w\s*\()(.+)(\)[;\s]*)$/);
    const content = JSON.parse(parts[2]);
    return {
      raw,
      content,
      prefix: createElement('span', {
        className: 'subtle',
        textContent: parts[1].trim(),
      }),
      suffix: createElement('span', {
        className: 'subtle',
        textContent: parts[3].trim(),
      }),
    };
  } catch (e) {
    // not JSONP
  }
}

function formatJSON() {
  if (formatter.formatted) return;
  formatter.formatted = true;
  formatter.data = loadJSON();
  if (!formatter.data) return;
  formatter.style = GM_addStyle(process.env.CSS);
  formatter.root = createElement('div', { id: 'json-formatter' });
  document.body.innerHTML = '';
  document.body.append(formatter.root);
  initTips();
  initMenu();
  bindEvents();
  generateNodes(formatter.data, formatter.root);
}

function generateNodes(data, container) {
  const pre = createElement('pre');
  formatter.pre = pre;
  const root = createElement('div');
  const rootSpan = createElement('span');
  root.append(rootSpan);
  pre.append(root);
  const queue = [{ el: rootSpan, elBlock: root, ...data }];
  while (queue.length) {
    const item = queue.shift();
    const { el, content, prefix, suffix } = item;
    if (prefix) el.append(prefix);
    if (Array.isArray(content)) {
      queue.push(...generateArray(item));
    } else if (content && typeof content === 'object') {
      queue.push(...generateObject(item));
    } else {
      const type = content == null ? 'null' : typeof content;
      if (type === 'string') el.append(createQuote());
      const node = createElement('span', {
        className: `${type} item`,
        textContent: `${content}`,
      });
      node.dataset.type = type;
      node.dataset.value = content;
      el.append(node);
      if (type === 'string') el.append(createQuote());
    }
    if (suffix) el.append(suffix);
  }
  container.append(pre);
  updateView();
}

function setFolder(el, length) {
  if (length) {
    el.classList.add('complex');
    el.append(createElement('div', {
      className: 'folder',
      textContent: '\u25b8',
    }));
    el.append(createElement('span', {
      textContent: `// ${length} items`,
      className: 'summary',
    }));
  }
}

function generateArray({ el, elBlock, content }) {
  const elContent = content.length && createElement('div', {
    className: 'content',
  });
  setFolder(elBlock, content.length);
  el.append(
    createElement('span', {
      textContent: '[',
      className: 'bracket',
    }),
    elContent || ' ',
    createElement('span', {
      textContent: ']',
      className: 'bracket',
    }),
  );
  return content.map((item, i) => {
    const elChild = createElement('div');
    elContent.append(elChild);
    const elValue = createElement('span');
    elChild.append(elValue);
    if (i < content.length - 1) elChild.append(createComma());
    return {
      el: elValue,
      elBlock: elChild,
      content: item,
    };
  });
}

function generateObject({ el, elBlock, content }) {
  const keys = Object.keys(content);
  const elContent = keys.length && createElement('div', {
    className: 'content',
  });
  setFolder(elBlock, keys.length);
  el.append(
    createElement('span', {
      textContent: '{',
      className: 'bracket',
    }),
    elContent || ' ',
    createElement('span', {
      textContent: '}',
      className: 'bracket',
    }),
  );
  return keys.map((key, i) => {
    const elChild = createElement('div');
    elContent.append(elChild);
    const elValue = createElement('span');
    const node = createElement('span', {
      className: 'key item',
      textContent: key,
    });
    node.dataset.type = typeof key;
    elChild.append(
      createQuote(),
      node,
      createQuote(),
      ': ',
      elValue,
    );
    if (i < keys.length - 1) elChild.append(createComma());
    return { el: elValue, content: content[key], elBlock: elChild };
  });
}

function updateView() {
  formatter.options.forEach(({ key }) => {
    formatter.pre.classList[config[key] ? 'add' : 'remove'](key);
  });
}

function removeEl(el) {
  el.remove();
}

function initMenu() {
  const menu = createElement('div', {
    className: 'menu',
  });
  const btnCopy = createElement('span', {
    textContent: 'Copy',
  });
  btnCopy.addEventListener('click', () => {
    GM_setClipboard(formatter.data.raw);
  }, false);
  menu.append(btnCopy);
  formatter.options.forEach(item => {
    const span = createElement('span', {
      className: `toggle${config[item.key] ? ' active' : ''}`,
      innerHTML: item.title,
    });
    span.dataset.key = item.key;
    menu.append(span);
  });
  menu.addEventListener('click', e => {
    const el = e.target;
    const { key } = el.dataset;
    if (key) {
      config[key] = !config[key];
      GM_setValue('config', config);
      el.classList.toggle('active');
      updateView();
    }
  }, false);
  formatter.root.append(menu);
}

function initTips() {
  const tips = createElement('div', {
    className: 'tips',
  });
  const hide = () => removeEl(tips);
  tips.addEventListener('click', e => {
    e.stopPropagation();
  }, false);
  document.addEventListener('click', hide, false);
  formatter.tips = {
    node: tips,
    hide,
    show(range) {
      const scrollTop = document.body.scrollTop;
      const rects = range.getClientRects();
      let rect;
      if (rects[0].top < 100) {
        rect = rects[rects.length - 1];
        tips.style.top = `${rect.bottom + scrollTop + gap}px`;
        tips.style.bottom = '';
      } else {
        rect = rects[0];
        tips.style.top = '';
        tips.style.bottom = `${formatter.root.offsetHeight - rect.top - scrollTop + gap}px`;
      }
      tips.style.left = `${rect.left}px`;
      const { type, value } = range.startContainer.dataset;
      const html = [
        `<span class="tips-key">type</span>: <span class="tips-val">${safeHTML(type)}</span>`,
      ];
      if (type === 'string' && /^(https?|ftps?):\/\/\S+/.test(value)) {
        html.push('<br>', `<a class="tips-link" href="${encodeURI(value)}" target="_blank">Open link</a>`);
      }
      tips.innerHTML = html.join('');
      formatter.root.append(tips);
    },
  };
}

function selectNode(node) {
  const selection = window.getSelection();
  selection.removeAllRanges();
  const range = document.createRange();
  range.setStartBefore(node.firstChild);
  range.setEndAfter(node.firstChild);
  selection.addRange(range);
  return range;
}

function bindEvents() {
  formatter.root.addEventListener('click', e => {
    e.stopPropagation();
    const { target } = e;
    if (target.classList.contains('item')) {
      formatter.tips.show(selectNode(target));
    } else {
      formatter.tips.hide();
    }
    if (target.classList.contains('folder')) {
      target.parentNode.classList.toggle('collapse');
    }
  }, false);
}
