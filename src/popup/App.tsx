import * as React from 'react'
const logo = require('../assets/logo.svg')

class Comp extends React.Component<{
  tabs: browser.tabs.Tab[],
  refresh: () => void,
}, {
  checked: Set<number>,
}> {
  state = {
    checked: new Set(),
  };

  render () {
    return (
      <div id="app">
        <div id="controls">
          <div>
            <button onClick={e => this.gather()} disabled={this.state.checked.size == 0} className="browser-style">Gather</button>
            <button onClick={e => this.exportURLs()} disabled={this.state.checked.size == 0} className="browser-style">URLs</button>
            <button onClick={e => this.closeGroup()} disabled={this.state.checked.size == 0} className="browser-style danger">Close</button>
          </div>
          <button onClick={e => this.discardAll()} className="browser-style">DiscardAll</button>
          <button onClick={e => this.props.refresh()}>😕</button>
        </div>
        <div id="app-body">
          <ol id="tabs-list">
            {this.props.tabs.map(x => {
              if (!x.id) {
                return <div />
              }
              return <li key={x.id}>
                <label
                  onClick={e => {
                    if ((e.target as any).tagName.match(/INPUT/i)) { 
                      this.toggle(x);
                    }
                  } }
                  className={[
                    x.active ? 'active' : '',
                    this.state.checked.has(x.id) ? 'checked' : '',
                    x.discarded ? 'discarded' : '',
                  ].join(' ')}
                  ref={e => {
                    if (x.active) {
                      requestAnimationFrame(() => {
                        if (e) {
                          (e as HTMLElement).scrollIntoView();
                        }
                      });
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={this.state.checked.has(x.id)}
                  />
                  <span className="tab-image">
                    {x.favIconUrl
                      ? <img src={x.favIconUrl} width="20" height="20" />
                      : "🗒"}
                  </span>
                  <span className="tab-title">{x.title}</span>
                  <span className="tab-controls">
                    <a className="opt-disabled" onClick={e => { this.switchToTab(x); e.preventDefault(); }}>▶️</a>
                    <a className="opt-enabled" onClick={e => { this.closeTab(x); e.preventDefault(); }}>🗑</a>
                  </span>
                </label>
              </li>;
            })}
          </ol>
        </div>
      </div>
    )
  }

  discardAll() {
    (browser.tabs as any).discard(this.props.tabs.map(tab => tab.id));
  }

  switchToTab(x: browser.tabs.Tab) {
    browser.tabs.update(x.id, { active: true });
  }

  closeTab(x: browser.tabs.Tab) {
    if (x.id) {
      browser.tabs.remove(x.id);
    }
  }

  toggle(x: browser.tabs.Tab) {
    let checked = this.state.checked;
    checked.has(x.id) ? checked.delete(x.id) : checked.add(x.id);
    this.setState({
      checked,
    });
    console.log(x.active);
    (browser.tabs as any).update(x.id, { highlighted: checked.has(x.id), active: x.active, });
  }

  gather() {
    let indexes: Array<number> = [];
    this.props.tabs.forEach(tab => {
      if (this.state.checked.has(tab.id)) {
        indexes.push(tab.index);
      }
    })
    if (indexes.length == 0) {
      indexes.push(0);
    }
    indexes.sort();

    if (indexes.every((index, i) => i > 0 ? index - indexes[i - 1] == 1 : true)) {
      // Skip any moving.
      console.info('Skipping gather, tabs are sequential.');
      return;
    }

    // Leftmost index
    browser.tabs.move(Array.from(this.state.checked), { index: indexes[0] });
  }

  closeGroup() {
    browser.tabs.remove(Array.from(this.state.checked));
  }

  exportURLs() {
    console.log('export');
    let urls: Array<string> = [];
    this.props.tabs.forEach(tab => {
      if (this.state.checked.has(tab.id) && tab.url) {
        urls.push(tab.url);
      }
    });
    (navigator as any).clipboard.writeText(urls.join("\n"));

    document.querySelector('#notification')!.innerHTML = 'Copied URLs to your clipboard.';
    document.querySelector('#notification')!.className = '';
    requestAnimationFrame(() => document.querySelector('#notification')!.className = 'hide');
  }
}

export default Comp
