import * as React from 'react'
import * as ReactDOM from 'react-dom'
import './style/index.scss'
// Private components
import App from './App'
import {TabList, TabListView} from './tablist';

browser.windows.getCurrent()
.then(win => {
  browser.windows.onFocusChanged.addListener((target: number) => {
    if (target != win.id) {
      // Clear all modifier options.
      Modifiers.up('option');
    }
  });

  const tablist = new TabList(win.id!, {
    reload(tabs: browser.tabs.Tab[]) {
      // console.log('reload...', tabs);
      ReactDOM.render(
        <App
          tabs={tabs}
          refresh={() => window.location.reload()}
        />,
        document.getElementById('root') as HTMLElement
      );
    }
  });
});

ReactDOM.render(
  <div>Loading...</div>,
  document.getElementById('root') as HTMLElement
)

// var background: any = chrome.extension.getBackgroundPage();
// addEventListener("unload", function (event) {
//   background.popupUnload();
// }, true);

const Modifiers = {
  state: {
    option: false,
  },

  down(key: 'option') {
    console.log('down', key);
    Modifiers.state[key] = true;
    (document.getElementById('root') as HTMLElement).classList.add(`key-${key}`);
  },

  up(key: 'option') {
    console.log('up', key);
    Modifiers.state[key] = false;
    (document.getElementById('root') as HTMLElement).classList.remove(`key-${key}`);
  },
};

window.addEventListener('keydown', (e) => {
  if (e.keyCode == 18) {
    Modifiers.down('option');
  }
});
window.addEventListener('keyup', (e) => {
  if (e.keyCode == 18) {
    Modifiers.up('option');
  }
});

browser.runtime.onMessage.addListener((msg) => {
  switch (msg.event) {
    case 'keydown':
      Modifiers.down(msg.key);
      break;
    case 'keyup':
      Modifiers.up(msg.key);
      break;
  }
});
