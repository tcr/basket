import * as React from 'react'
import * as ReactDOM from 'react-dom'
import './style/index.scss'
// Private components
import App from './App'
import {TabList, TabListView} from './tablist';

browser.windows.getCurrent()
.then(win => {
  const tablist = new TabList(win.id!, {
    reload(tabs: browser.tabs.Tab[]) {
      // console.log('reload...', tabs);
      ReactDOM.render(
        <App tabs={tabs} />,
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
