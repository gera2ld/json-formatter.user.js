import './meta';
import { css } from './style.css';

const h = VM.createElement;

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
  'text/javascript', // file:///foo/bar.js
].includes(document.contentType)) formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);

function createQuote() {
  return <span className="subtle quote">"</span>;
}

function createComma() {
  return <span className="subtle comma">,</span>;
}

function loadJSON() {
  const raw = document.body.innerText;
  // LosslessJSON is much slower than native JSON, so we just use it for small JSON files.
  const JSON = raw.length > 1024000 ? window.JSON : window.LosslessJSON;
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
      prefix: <span className="subtle">{parts[1].trim()}</span>,
      suffix: <span className="subtle">{parts[3].trim()}</span>,
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
  formatter.style = GM_addStyle(css);
  formatter.root = <div id="json-formatter" />;
  document.body.innerHTML = '';
  document.body.append(formatter.root);
  initTips();
  initMenu();
  bindEvents();
  generateNodes(formatter.data, formatter.root);
}

function generateNodes(data, container) {
  const rootSpan = <span />;
  const root = <div>{rootSpan}</div>;
  const pre = <pre>{root}</pre>;
  formatter.pre = pre;
  const queue = [{ el: rootSpan, elBlock: root, ...data }];
  while (queue.length) {
    const item = queue.shift();
    const {
      el, content, prefix, suffix,
    } = item;
    if (prefix) el.append(prefix);
    if (Array.isArray(content)) {
      queue.push(...generateArray(item));
    } else if (isObject(content)) {
      queue.push(...generateObject(item));
    } else {
      const type = typeOf(content);
      if (type === 'string') el.append(createQuote());
      const node = <span className={`${type} item`} data-type={type} data-value={content}>{toString(content)}</span>;
      el.append(node);
      if (type === 'string') el.append(createQuote());
    }
    if (suffix) el.append(suffix);
  }
  container.append(pre);
  updateView();
}

function isObject(item) {
  if (item instanceof window.LosslessJSON.LosslessNumber) return false;
  return item && typeof item === 'object';
}

function typeOf(item) {
  if (item == null) return 'null';
  if (item instanceof window.LosslessJSON.LosslessNumber) return 'number';
  return typeof item;
}

function toString(content) {
  if (content instanceof window.LosslessJSON.LosslessNumber) return content.toString();
  return `${content}`;
}

function setFolder(el, length) {
  if (length) {
    el.classList.add('complex');
    el.append(
      <div className="folder">{'\u25b8'}</div>,
      <span className="summary">{`// ${length} items`}</span>,
    );
  }
}

function generateArray({ el, elBlock, content }) {
  const elContent = content.length && <div className="content" />;
  setFolder(elBlock, content.length);
  el.append(
    <span className="bracket">[</span>,
    elContent || ' ',
    <span className="bracket">]</span>,
  );
  return content.map((item, i) => {
    const elValue = <span />;
    const elChild = <div>{elValue}</div>;
    elContent.append(elChild);
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
  const elContent = keys.length && <div className="content" />;
  setFolder(elBlock, keys.length);
  el.append(
    <span className="bracket">{'{'}</span>,
    elContent || ' ',
    <span className='bracket'>{'}'}</span>,
  );
  return keys.map((key, i) => {
    const elValue = <span />;
    const elChild = (
      <div>
        {createQuote()}
        <span className="key item" data-type={typeof key}>{key}</span>
        {createQuote()}
        {': '}
        {elValue}
      </div>
    );
    if (i < keys.length - 1) elChild.append(createComma());
    elContent.append(elChild);
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
  const handleCopy = () => {
    GM_setClipboard(formatter.data.raw);
  };
  const handleMenuClick = e => {
    const el = e.target;
    const { key } = el.dataset;
    if (key) {
      config[key] = !config[key];
      GM_setValue('config', config);
      el.classList.toggle('active');
      updateView();
    }
  };
  formatter.root.append((
    <div className="menu" onClick={handleMenuClick}>
      <span onClick={handleCopy}>Copy</span>
      {formatter.options.map(item => (
        <span
          className={`toggle${config[item.key] ? ' active' : ''}`}
          dangerouslySetInnerHTML={{ __html: item.title }}
          data-key={item.key}
        />
      ))}
    </div>
  ));
}

function initTips() {
  const tips = <div className="tips" onClick={e => { e.stopPropagation(); }} />;
  const hide = () => removeEl(tips);
  document.addEventListener('click', hide, false);
  formatter.tips = {
    node: tips,
    hide,
    show(range) {
      const { scrollTop } = document.body;
      const rects = range.getClientRects();
      let rect;
      if (rects[0].top < 100) {
        rect = rects[rects.length - 1];
        tips.style.top = `${rect.bottom + scrollTop + gap}px`;
        tips.style.bottom = '';
      } else {
        ([rect] = rects);
        tips.style.top = '';
        tips.style.bottom = `${formatter.root.offsetHeight - rect.top - scrollTop + gap}px`;
      }
      tips.style.left = `${rect.left}px`;
      const { type, value } = range.startContainer.dataset;
      tips.innerHTML = '';
      tips.append(
        <span class="tips-key">type</span>,
        ': ',
        <span class="tips-val" dangerouslySetInnerHTML={{ __html: type }} />,
      );
      if (type === 'string' && /^(https?|ftps?):\/\/\S+/.test(value)) {
        tips.append(
          <br />,
          <a class="tips-link" href={value} target="_blank">Open link</a>,
        );
      }
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
