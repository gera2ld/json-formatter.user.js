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
// ==/UserScript==

let id = 0;
const getId = () => (id += 1);
const SINGLELINE = getId();
const MULTILINE = getId();
const KEY = getId();
const gap = 5;

const createQuote = () => createElement('span', {
  className: 'subtle quote',
  textContent: '"',
});
const createComma = () => createElement('span', {
  className: 'subtle comma',
  textContent: ',',
});
const createSpace = (n = 1) => createElement('span', {
  className: 'space',
  textContent: ' '.repeat(n),
});
const createIndent = (n = 1) => createSpace(2 * n);
const createBr = () => createElement('br');

const formatter = {
  options: [{
    key: 'hide-quotes',
    title: '"',
    def: false,
  }, {
    key: 'hide-commas',
    title: ',',
    def: false,
  }],
};

const config = GM_getValue('config', formatter.options.reduce((res, item) => {
  res[item.key] = item.def;
  return res;
}, {}));

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

function join(rendered, level = 0) {
  const arr = [];
  for (let i = 0; i < rendered.length; i += 1) {
    const item = rendered[i];
    const next = rendered[i + 1];
    if (item.data) arr.push(...item.data);
    if (next) {
      if (item.separator) arr.push(...item.separator);
      if (
        next.type === KEY ||
        (item.type !== KEY && (
          item.type === SINGLELINE || next.type === SINGLELINE
        ))
      ) {
        arr.push(createBr(), createIndent(level));
      } else {
        arr.push(createSpace(1));
      }
    }
  }
  return arr;
}

function createNodes(data) {
  const valueType = typeof data.value;
  const type = data.type || valueType;
  const el = createElement('span', {
    className: data.cls || `item ${type}`,
    textContent: `${data.value}`,
  });
  el.dataset.type = valueType;
  el.dataset.value = data.value;
  const els = [el];
  if (data.type === 'key' || (!data.cls && type === 'string')) {
    els.unshift(createQuote());
    els.push(createQuote());
  }
  return els;
}

function render(data, level = 0) {
  if (Array.isArray(data)) {
    const arr = [];
    const ret = {
      type: MULTILINE,
      separator: [createComma()],
    };
    arr.push(...createNodes({ value: '[', cls: 'bracket' }));
    if (data.length) {
      const rendered = data.reduce((res, item) => res.concat([
        render(item, level + 1),
      ]), []);
      arr.push(
        createBr(),
        createIndent(level + 1),
        ...join(rendered, level + 1),
        createBr(),
        createIndent(level),
      );
    } else {
      arr.push(...createNodes({ value: '', cls: 'subtle' }));
      ret.type = SINGLELINE;
    }
    arr.push(...createNodes({ value: ']', cls: 'bracket' }));
    ret.data = arr;
    return ret;
  }
  if (data === null) {
    return {
      type: SINGLELINE,
      separator: [createComma()],
      data: createNodes({ value: data, type: 'null' }),
    };
  }
  if (typeof data === 'object') {
    const arr = [];
    const ret = {
      type: MULTILINE,
      separator: [createComma()],
    };
    arr.push(...createNodes({ value: '{', cls: 'bracket' }));
    const rendered = Object.keys(data).reduce((res, key) => res.concat([
      {
        type: KEY,
        data: createNodes({ value: key, type: 'key' }),
        separator: createNodes({ value: ':', cls: 'subtle' }),
      },
      render(data[key], level + 1),
    ]), []);
    if (rendered.length) {
      arr.push(
        createBr(),
        createIndent(level + 1),
        ...join(rendered, level + 1),
        createBr(),
        createIndent(level),
      );
    } else {
      arr.push(...createNodes({ value: '', cls: 'subtle' }));
      ret.type = SINGLELINE;
    }
    arr.push(...createNodes({ value: '}', cls: 'bracket' }));
    ret.data = arr;
    return ret;
  }
  return {
    type: SINGLELINE,
    separator: [createComma()],
    data: createNodes({ value: data }),
  };
}

function loadJSON() {
  const text = document.body.innerText;
  try {
    // JSON
    const content = JSON.parse(text);
    return { prefix: '', suffix: '', content };
  } catch (e) {
    // not JSON
  }
  try {
    // JSONP
    const parts = text.match(/^(.*?\w\s*\()(.+)(\)[;\s]*)$/);
    const content = JSON.parse(parts[2]);
    const prefix = parts[1];
    const suffix = parts[3];
    return { prefix, content, suffix };
  } catch (e) {
    // not JSONP
  }
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
      formatter.data = loadJSON();
      if (!formatter.data) return;
      formatter.style = GM_addStyle(process.env.CSS);
      initTips();
      initMenu();
      formatter.render = () => {
        const { pre } = formatter;
        const { prefix, content, suffix } = formatter.data;
        pre.innerHTML = '';
        [
          createElement('span', {
            className: 'subtle',
            textContent: prefix,
          }),
          ...render(content).data,
          createElement('span', {
            className: 'subtle',
            textContent: suffix,
          }),
        ].forEach(el => {
          pre.appendChild(el);
        });
        formatter.update();
      };
      formatter.update = () => {
        formatter.options.forEach(({ key }) => {
          formatter.pre.classList[config[key] ? 'add' : 'remove'](key);
        });
      };
    }
    formatter.formatted = true;
    formatter.root = createElement('div', { id: 'root' });
    document.body.innerHTML = '';
    document.body.appendChild(formatter.root);
    formatter.pre = createElement('pre');
    formatter.root.appendChild(formatter.pre);
    formatter.menu.attach();
    bindEvents();
    formatter.render();
  }
}

function removeEl(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function initMenu() {
  const menu = createElement('div', {
    className: 'menu',
  });
  formatter.options.forEach(item => {
    const span = createElement('span', {
      className: `btn${config[item.key] ? ' active' : ''}`,
      innerHTML: item.title,
    });
    span.dataset.key = item.key;
    menu.appendChild(span);
  });
  menu.addEventListener('click', e => {
    const el = e.target;
    const key = el.dataset.key;
    if (key) {
      config[key] = !config[key];
      GM_setValue('config', config);
      el.classList.toggle('active');
      formatter.update();
    }
  }, false);
  formatter.menu = {
    node: menu,
    attach() {
      formatter.root.appendChild(menu);
    },
    detach() {
      removeEl(menu);
    },
  };
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
      formatter.root.appendChild(tips);
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
  }, false);
}
