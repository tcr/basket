// Forward key modifiers.
window.addEventListener('keydown', (e) => {
  if (e.keyCode == 18) {
    browser.runtime.sendMessage({"event": "keydown", key: "option"});
  }
});
window.addEventListener('keyup', (e) => {
  if (e.keyCode == 18) {
    browser.runtime.sendMessage({"event": "keyup", key: "option"});
  }
});
