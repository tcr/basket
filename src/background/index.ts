(window as any).popupUnload = function () {
  browser.tabs.query({
    currentWindow: true
  })
  .then((tabs) => {
    tabs.forEach(tab => {
      (browser.tabs as any).update(tab.id, { highlighted: false, active: tab.active });
    })
  });
};

browser.runtime.onMessage.addListener(message => {
  if (message.type === 'GREETING') {
    console.log('hi');
    // return new Promise(resolve =>
    //   setTimeout(() => resolve('Hi! Got your message a second ago.'), 1000)
    // )
  }
})
