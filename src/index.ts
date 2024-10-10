import './meta.js?userscript-metadata';

let iframe: HTMLIFrameElement | undefined;

if (
  testRules(
    [
      // text/javascript - file:///foo/bar.js
      /^(?:text|application)\/(?:.*?\+)?(?:plain|json|javascript)$/,
    ],
    document.contentType,
  )
)
  formatJSON();
GM_registerMenuCommand('Format JSON', formatJSON);

function testRules(rules: (string | RegExp)[], contentType: string) {
  for (const rule of rules) {
    if (typeof rule === 'string') {
      if (rule === contentType) return true;
    } else if (typeof rule?.test === 'function') {
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
    sandbox: 'allow-scripts allow-same-origin',
    src: 'https://json.gera2ld.space/embed',
    style: `position:fixed;width:100vw;height:100vh;inset:0;border:none`,
  }) as HTMLIFrameElement;
  const setData = () => {
    iframe.contentWindow.postMessage(
      { type: 'setData', payload: content },
      '*',
    );
  };
  iframe.addEventListener('load', () => {
    setData();
  });
  window.addEventListener('message', (e) => {
    const { type } = e.data;
    switch (type) {
      case 'ready': {
        setData();
        break;
      }
    }
  });
}
