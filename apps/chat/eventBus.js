(function() {
  'use strict';
  window.EventBus = {
    _events: {},
    on: function(name, fn) {
      if (!name || typeof fn !== 'function') return;
      if (!this._events[name]) this._events[name] = [];
      this._events[name].push(fn);
    },
    emit: function(name, payload) {
      if (!this._events[name]) return;
      this._events[name].slice().forEach(function(fn) {
        try { fn(payload); } catch(e) { console.error('[EventBus]', e); }
      });
    }
  };
  console.log('[EventBus] 已就绪');
})();