// 💧 Drink Water reminder — pops up every 30 mins while you're playing.
// Works with notification.js (showNotification) if present, otherwise falls back
// to a built-in toast so it works on every page.
// Uses localStorage so the 30-min timer survives navigating between games.

(function () {
  var INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  var STORAGE_KEY = 'ctf_last_water_reminder';
  var TITLE = '💧 Drink Water!';
  var BODY = 'You\'ve been playing for 30 minutes — time to drink some water!';
  var DURATION_MS = 10000; // notification stays 10s so you actually see it

  function now() { return Date.now(); }

  function getLast() {
    try {
      var v = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      return isNaN(v) ? 0 : v;
    } catch (e) { return 0; }
  }

  function setLast(t) {
    try { localStorage.setItem(STORAGE_KEY, String(t)); } catch (e) {}
  }

  // Fallback toast if showNotification isn't loaded (yet)
  function fallbackToast(title, body) {
    var existing = document.getElementById('water-reminder-fallback');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'water-reminder-fallback';
    el.textContent = title + ' ' + body;
    el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;' +
      'background:rgba(9,0,0,.9);color:#fff;font-family:sans-serif;' +
      'padding:14px 18px;border-radius:14px;max-width:320px;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.3);font-size:15px;';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, DURATION_MS);
  }

  function showDrinkReminder() {
    setLast(now());
    if (typeof window.showNotification === 'function') {
      window.showNotification(TITLE, BODY, DURATION_MS);
    } else {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { fallbackToast(TITLE, BODY); });
      } else {
        fallbackToast(TITLE, BODY);
      }
    }
  }

  function scheduleNext() {
    var last = getLast();
    if (!last) {
      // First visit: start the 30-min clock now, don't nag immediately.
      setLast(now());
      last = getLast();
    }
    var delay = INTERVAL_MS - (now() - last);
    if (delay < 0) delay = 0;
    if (delay > INTERVAL_MS) delay = INTERVAL_MS;
    setTimeout(function checkAndRemind() {
      // Only pop up if the tab is visible — no point nagging a background tab.
      // It will retry in 1 min if hidden, so you still get it when you come back.
      if (document.hidden) {
        setTimeout(checkAndRemind, 60 * 1000);
        return;
      }
      showDrinkReminder();
      setInterval(showDrinkReminder, INTERVAL_MS);
    }, delay);
  }

  // Keep multiple open tabs from double-nagging: only fire if we're the tab
  // that most recently claimed the slot (simple leader election via storage).
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) { /* another tab showed it — our interval stays in sync via timestamp */ }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleNext);
  } else {
    scheduleNext();
  }
})();
