import css from './style.css';
import theme from './material-darker.css';

const React = VM;

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
const classMap = {
  boolean: 'cm-atom',
  null: 'cm-atom',
  number: 'cm-number',
  string: 'cm-string',
};

const config = {
  ...formatter.options.reduce((res, item) => {
    res[item.key] = item.def;
    return res;
  }, {}),
  ...GM_getValue('config'),
};

if (testRules([
  // text/javascript - file:///foo/bar.js
  /^(?:text|application)\/(?:.*?\+)?(?:plain|json|javascript)$/,
], document.contentType)) formatJSON();
GM_registerMenuCommand('Toggle JSON format', formatJSON);

function testRules(rules, contentType) {
  for (const rule of rules) {
    if (typeof rule === 'string') {
      if (rule === contentType) return true;
    } else if (typeof rule?.test === 'function') {
      if (rule.test(contentType)) return true;
    }
  }
  return false;
}

function createQuote() {
  return <span className="subtle quote">&quot;</span>;
}

function createComma() {
  return <span className="subtle comma">,</span>;
}

function isColor(str) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(str);
}

function tokenize(raw) {
  const skipWhitespace = index => {
    while (index < raw.length && ' \t\r\n'.includes(raw[index])) index += 1;
    return index;
  };
  const expectIndex = index => {
    if (index < raw.length) return index;
    throw new Error('Unexpected end of input');
  };
  const expectChar = (index, white, black) => {
    const ch = raw[index];
    if (white && !white.includes(ch) || black && black.includes(ch)) {
      throw new Error(`Unexpected token "${ch}" at ${index}`);
    }
    return ch;
  };
  const findWord = (index, words) => {
    for (const word of words) {
      if (raw.slice(index, index + word.length) === word) {
        return word;
      }
    }
  };
  const expectSpaceAndCharIndex = (index, white, black) => {
    const i = expectIndex(skipWhitespace(index));
    expectChar(i, white, black);
    return i;
  };
  const parseString = start => {
    let j;
    for (j = start + 1; true; j = expectIndex(j + 1)) {
      const ch = raw[j];
      if (ch === '"') break;
      if (ch === '\\') {
        j = expectIndex(j + 1);
        const ch2 = raw[j];
        if (ch2 === 'x') {
          j = expectIndex(j + 2);
        } else if (ch2 === 'u') {
          j = expectIndex(j + 4);
        }
      }
    }
    const source = raw.slice(start + 1, j);
    return {
      type: 'string',
      source,
      data: JSON.parse(raw.slice(start, j + 1)),
      color: isColor(source),
      start,
      end: j + 1,
    };
  };
  const parseKeyword = (start) => {
    const nullWord = findWord(start, ['null']);
    if (nullWord) {
      return {
        type: 'null',
        source: 'null',
        data: null,
        start,
        end: start + 4,
      };
    }
    const bool = findWord(start, ['true', 'false']);
    if (bool) {
      return {
        type: 'boolean',
        source: bool,
        data: bool === 'true',
        start,
        end: start + bool.length,
      };
    }
    expectChar(start, '0');
  };
  const DIGITS = '0123456789';
  const findDecimal = (start, fractional) => {
    let i = start;
    if ('+-'.includes(raw[i])) i += 1;
    let j;
    let dot = -1;
    for (j = i; true; j = expectIndex(j + 1)) {
      const ch = expectChar(
        j,
        // there must be at least one digit
        // dot must not be the last character of a number, expecting a digit
        j === i || dot >= 0 && dot === j - 1 ? DIGITS : null,
        // there can be at most one dot
        !fractional || dot >= 0 ? '.' : null,
      );
      if (ch === '.') dot = j;
      else if (!DIGITS.includes(ch)) break;
    }
    return j;
  };
  const parseNumber = (start) => {
    let i = findDecimal(start, true);
    const ch = raw[i];
    if (ch && ch.toLowerCase() === 'e') {
      i = findDecimal(i + 1);
    }
    const source = raw.slice(start, i);
    return {
      type: 'number',
      source,
      data: +source,
      start,
      end: i,
    };
  };
  let parseItem;
  const parseArray = (start) => {
    const result = {
      type: 'array',
      data: [],
      start,
    };
    let i = start + 1;
    while (true) {
      i = expectIndex(skipWhitespace(i));
      if (raw[i] === ']') break;
      if (result.data.length) i = expectSpaceAndCharIndex(i, ',') + 1;
      const item = parseItem(i);
      result.data.push(item);
      i = item.end;
    }
    result.end = i + 1;
    return result;
  };
  const parseObject = (start) => {
    const result = {
      type: 'object',
      data: [],
      start,
    };
    let i = start + 1;
    while (true) {
      i = expectIndex(skipWhitespace(i));
      if (raw[i] === '}') break;
      if (result.data.length) i = expectSpaceAndCharIndex(i, ',') + 1;
      i = expectSpaceAndCharIndex(i, '"');
      const key = parseString(i);
      i = expectSpaceAndCharIndex(key.end, ':') + 1;
      const value = parseItem(i);
      result.data.push({ key, value });
      i = value.end;
    }
    result.end = i + 1;
    return result;
  };
  parseItem = (start) => {
    const i = expectIndex(skipWhitespace(start));
    const ch = raw[i];
    if (ch === '"') return parseString(i);
    if (ch === '[') return parseArray(i);
    if (ch === '{') return parseObject(i);
    if ('-0123456789'.includes(ch)) return parseNumber(i);
    return parseKeyword(i);
  };
  const result = parseItem(0);
  const end = skipWhitespace(result.end);
  if (end < raw.length) expectChar(end, []);
  return result;
}

function loadJSON() {
  const raw = document.body.innerText;
  try {
    // JSON
    const content = tokenize(raw);
    return { raw, content };
  } catch (e) {
    // not JSON
    console.error('Not JSON', e);
  }
  try {
    // JSONP
    const parts = raw.match(/^(.*?\w\s*\()(.+)(\)[;\s]*)$/);
    const content = tokenize(parts[2]);
    return {
      raw,
      content,
      prefix: <span className="subtle">{parts[1].trim()}</span>,
      suffix: <span className="subtle">{parts[3].trim()}</span>,
    };
  } catch (e) {
    // not JSONP
    console.error('Not JSONP', e);
  }
}

function formatJSON() {
  if (formatter.formatted) return;
  formatter.formatted = true;
  formatter.data = loadJSON();
  if (!formatter.data) return;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  formatter.style = GM_addStyle(css + theme);
  formatter.root = <div id="json-formatter" />;
  document.body.append(formatter.root);
  initTips();
  initMenu();
  bindEvents();
  generateNodes(formatter.data, formatter.root);
}

function generateNodes(data, container) {
  const rootSpan = <span />;
  const root = <div>{rootSpan}</div>;
  const pre = <pre className="CodeMirror cm-s-material-darker">{root}</pre>;
  formatter.pre = pre;
  const queue = [{ el: rootSpan, elBlock: root, ...data }];
  while (queue.length) {
    const item = queue.shift();
    const {
      el, content, prefix, suffix,
    } = item;
    if (prefix) el.append(prefix);
    if (content.type === 'array') {
      queue.push(...generateArray(item));
    } else if (content.type === 'object') {
      queue.push(...generateObject(item));
    } else {
      const { type, color } = content;
      const children = [];
      if (type === 'string') children.push(createQuote());
      if (color) children.push(<span className="color" style={`background-color: ${content.data}`} />);
      children.push(toString(content));
      if (type === 'string') children.push(createQuote());
      const className = [
        classMap[type],
        'item',
      ].filter(Boolean).join(' ');
      el.append((
        <span className={className} data-type={type} data-value={content.data}>
          {children}
        </span>
      ));
    }
    if (suffix) el.append(suffix);
  }
  container.append(pre);
  updateView();
}

function toString(content) {
  return `${content.source}`;
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
  const elContent = content.data.length && <div className="content" />;
  setFolder(elBlock, content.data.length);
  el.append(
    <span className="bracket">[</span>,
    elContent || ' ',
    <span className="bracket">]</span>,
  );
  return content.data.map((item, i) => {
    const elValue = <span />;
    const elChild = <div>{elValue}</div>;
    elContent.append(elChild);
    if (i < content.data.length - 1) elChild.append(createComma());
    return {
      el: elValue,
      elBlock: elChild,
      content: item,
    };
  });
}

function generateObject({ el, elBlock, content }) {
  const elContent = content.data.length && <div className="content" />;
  setFolder(elBlock, content.data.length);
  el.append(
    <span className="bracket">{'{'}</span>,
    elContent || ' ',
    <span className="bracket">{'}'}</span>,
  );
  return content.data.map(({ key, value }, i) => {
    const elValue = <span />;
    const elChild = (
      <div>
        <span className="cm-property item" data-type={key.type}>
          {createQuote()}
          {key.data}
          {createQuote()}
        </span>
        {': '}
        {elValue}
      </div>
    );
    if (i < content.data.length - 1) elChild.append(createComma());
    elContent.append(elChild);
    return { el: elValue, content: value, elBlock: elChild };
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
  const handleMenuClick = (e) => {
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
  const tips = <div className="tips" onClick={(e) => { e.stopPropagation(); }} />;
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
        <span className="tips-key">type</span>,
        ': ',
        <span className="tips-val" dangerouslySetInnerHTML={{ __html: type }} />,
      );
      if (type === 'string') {
        const handleCopyParsed = () => {
          GM_setClipboard(value);
        };
        tips.append(
          <br />,
          <span className="tips-link" onClick={handleCopyParsed}>Copy parsed</span>,
        );
        if (/^(https?|ftps?):\/\/\S+/.test(value)) {
          tips.append(
            <br />,
            <a className="tips-link" href={value} target="_blank" rel="noopener noreferrer">Open link</a>,
          );
        }
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
  range.setEndAfter(node.lastChild);
  selection.addRange(range);
  return range;
}

function bindEvents() {
  formatter.root.addEventListener('click', (e) => {
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
