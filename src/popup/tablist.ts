// from https://github.com/eoger/tabcenter-redux/tree/master/src

const COMPACT_MODE_OFF = 0;
/*const COMPACT_MODE_DYNAMIC = 1;*/
const COMPACT_MODE_STRICT = 2;

/* @arg {props}
 * openTab
 * search
 * prefs
 */
export class TabList {
  _props: any;
  _tabs: Map<any, any>;
  _active: null | boolean;
  _windowId: number;
  // _filterActive: boolean;
  _view: TabListView;

  constructor(windowId, view: TabListView) {
    this._tabs = new Map();
    this._active = null;
    this._windowId = windowId;
    // this._filterActive = false;
    // default handlers, so we can do this._view.scrollIntoView!() easily
    this._view = Object.assign({
      scrollIntoView(sidetab) {},
      populate(tabs) {},
      appendTab(sidetab) {},
      removeTab(sidetab) {},
      pin(sidetab, tab) {},
      makeActive(sidetab) {},
      invalidateThumbnail(sidetab) {},
      create(tabInfo) {},
      update(tabInfo) {},
      burst(tab) {},
      reload(tabs: browser.tabs.Tab[]) {},
    }, view);
    this._setupListeners();
    this.populate();
  }

  _setupListeners() {
    // Tab events
    browser.tabs.onCreated.addListener(tab => this._onBrowserTabCreated(tab));
    browser.tabs.onActivated.addListener(({tabId}) => this._onBrowserTabActivated(tabId));
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this._onBrowserTabUpdated(tabId, changeInfo, tab));
    browser.tabs.onRemoved.addListener(tabId => this._onBrowserTabRemoved(tabId));
    browser.tabs.onMoved.addListener((tabId, moveInfo) => this._onBrowserTabMoved(tabId, moveInfo));
    browser.tabs.onAttached.addListener((tabId, attachInfo) => this._onBrowserTabAttached(tabId, attachInfo));
    browser.tabs.onDetached.addListener(tabId => this._onBrowserTabRemoved(tabId));
    browser.webNavigation.onCompleted.addListener(details => this._webNavigationOnCompleted(details));
  }

  _markDirty() {
    this._view.reload!(Array.from(this._tabs.values()));
  }

  _onBrowserTabCreated(tab) {
    if (!this._checkWindow(tab)) {
      return;
    }
    this._shiftTabsIndexes(1, tab.index);
    this._tabs.set(tab.id, tab);
    this._onCreate(tab);
    this._markDirty();
  }

  async _onBrowserTabAttached(tabId, {newWindowId, newPosition}) {
    if (newWindowId !== this._windowId) {
      return;
    }
    this._shiftTabsIndexes(1, newPosition);
    let tab = await browser.tabs.get(tabId);
    tab.id = tabId; // Replace the ID by the new tab ID (they are different!).
    this._tabs.set(tab.id, tab);
    this._onCreate(tab);
    this._markDirty();
  }

  _onCreate(tab) {
    // Dispatch to other methods.
    this._view.create!(tab);
    if (tab.active) {
      this._onMakeActive(tab);
    }
    this._view.appendTab!(tab);
  }

  _onBrowserTabRemoved(tabId) {
    let sidetab = this.getTabById(tabId);
    if (!sidetab) { // Could be null because different window.
      return;
    }
    this._shiftTabsIndexes(-1, sidetab.index);
    this._remove(sidetab);
  }

  _onMakeActive(tab) {
    if (this._active) {
      this.getTabById(this._active).active = false;
    }
    this._view.makeActive!(tab);
    this.getTabById(tab.id).active = true;
    this._active = tab.id;
  }

  _onBrowserTabActivated(tabId) {
    const sidetab = this.getTabById(tabId);
    if (!sidetab) { // Could be null because different window.
      return;
    }
    this._onMakeActive!(sidetab);
    this._view.invalidateThumbnail!(sidetab);
    this._view.scrollIntoView!(sidetab);
    this._markDirty();
  }

  _onBrowserTabMoved(tabId, moveInfo) {
    const tab = this.getTabById(tabId);
    if (!tab) { // Could be null because different window.
      return;
    }

    const {fromIndex, toIndex} = moveInfo;
    const direction = fromIndex < toIndex ? -1 : 1;
    const start = direction > 0 ? toIndex : fromIndex + 1;
    const end = direction > 0 ? fromIndex : toIndex + 1;
    this._shiftTabsIndexes(direction, start, end);
    tab.index = toIndex;

    if (tab.hidden) {
      return;
    }

    this._view.appendTab!(tab);
    this._view.scrollIntoView!(tab);
  }

  _onBrowserTabUpdated(tabId, changeInfo, tab) {
    if (!this._checkWindow(tab)) {
      return;
    }
    const sidetab = this.getTabById(tab.id);
    if (!sidetab) {
      return;
    }
    if (changeInfo.hasOwnProperty("hidden")) {
      if (changeInfo.hidden) {
        this._view.removeTab!(sidetab);
      } else {
        this._view.appendTab!(sidetab);
      }
    }
    if (changeInfo.hasOwnProperty("status") && changeInfo.status === "complete") {
      this._view.invalidateThumbnail!(sidetab);
    }

    Object.assign(sidetab, tab);
    this._view.update!(changeInfo);
    this._markDirty();
    if (changeInfo.hasOwnProperty("pinned")) {
      this._view.pin!(tab);
    }
  }

  // Shift tabs indexes with indexes between |start| and |end| (|end| not included)
  // by |offset| (can be a negative number).
  _shiftTabsIndexes(offset, start, end = null) {
    for (const tab of this._tabs.values()) {
      if (tab.index >= start && (end === null || tab.index < end!)) {
        tab.index += offset;
      }
    }
  }

  _webNavigationOnCompleted({tabId, frameId}) {
    if (frameId !== 0) { // We only care about top-level frames.
      return;
    }
    let sidetab = this.getTabById(tabId);
    if (!sidetab) { // Could be null because different window.
      return;
    }
    this._view.burst!(sidetab);
  }

  _checkWindow(tab) {
    return (tab.windowId === this._windowId);
  }

  getTabById(tabId) {
    return this._tabs.get(tabId);
  }

  _remove(sidetab) {
    if (this._active === sidetab.id) {
      this._active = null;
    }
    this._view.removeTab!(sidetab);
    this._tabs.delete(sidetab.id);
    this._markDirty();
  }

  // Tab controller

  closeTabsAfter(tabIndex) {
    const toClose = [...this._tabs.values()]
                    .filter(tab => tab.index > tabIndex && !tab.hidden)
                    .map(tab => tab.id);
    browser.tabs.remove(toClose);
  }

  closeAllTabsExcept(tabId) {
    const toClose = [...this._tabs.values()]
                    .filter(tab => tab.id !== tabId && !tab.pinned && !tab.hidden)
                    .map(tab => tab.id);
    browser.tabs.remove(toClose);
  }

  reloadAllTabs() {
    for (let tab of this._tabs.values()) {
      if (!tab.hidden) {
        browser.tabs.reload(tab.id);
      }
    }
  }

  async hasRecentlyClosedTabs() {
    const undoTabs = await this.getRecentlyClosedTabs();
    return !!undoTabs.length;
  }

  async getRecentlyClosedTabs() {
    const sessions = await browser.sessions.getRecentlyClosed();
    return sessions.reduce((acc: Array<browser.tabs.Tab>, session) => {
      if (session.tab && this._checkWindow(session.tab)) {
        acc.push(session.tab);
      }
      return acc;
    }, []);
  }

  async undoCloseTab() {
    const undoTabs = await this.getRecentlyClosedTabs();
    if (undoTabs.length) {
      browser.sessions.restore(undoTabs[0].sessionId!);
    }
  }

  async moveTabToBottom(tab: browser.tabs.Tab) {
    let sameCategoryTabs = await (browser.tabs as any).query({
      hidden: false,
      pinned: tab.pinned,
      windowId: this._windowId!,
    });
    let lastIndex = sameCategoryTabs[sameCategoryTabs.length - 1].index;
    await browser.tabs.move(tab.id!, {index: lastIndex + 1});
  }

  async moveTabToTop(tab: browser.tabs.Tab) {
    let sameCategoryTabs = await (browser.tabs as any).query({
      hidden: false,
      pinned: tab.pinned,
      windowId: this._windowId!,
    });
    let lastIndex = sameCategoryTabs[0].index;
    await browser.tabs.move(tab.id!, {index: lastIndex});
  }

  async populate() {
    const tabs = await browser.tabs.query({windowId: this._windowId});
    // Sort the tabs by index so we can insert them in sequence.
    tabs.sort((a, b) => a.index - b.index);
    this._view.populate!(tabs);
    let activeTab;
    for (let tab of tabs) {
      if (tab.active) {
        activeTab = tab;
      }
      this._tabs.set(tab.id, tab);
    }
    if (activeTab) {
      this._view.invalidateThumbnail!(activeTab);
      this._view.scrollIntoView!(activeTab);
    }
    this._markDirty();
  }
}


export interface TabListView {
  scrollIntoView?(tab: browser.tabs.Tab);

  populate?(tabs: browser.tabs.Tab[]);

  appendTab?(tab: browser.tabs.Tab);

  removeTab?(tab: browser.tabs.Tab);

  pin?(tab: browser.tabs.Tab);

  makeActive?(tab: browser.tabs.Tab);

  invalidateThumbnail?(tab: browser.tabs.Tab);

  create?(tab: browser.tabs.Tab);

  update?(tab: browser.tabs.Tab);

  burst?(tab: browser.tabs.Tab);

  reload?(tabs: browser.tabs.Tab[]);
}
