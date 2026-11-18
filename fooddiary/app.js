/* FoodDiary — our table, remembered.
   One page app: IndexedDB on the phone is the source of truth, Firestore keeps both phones in sync. */
(function () {
'use strict';

var CFG = window.FD_CONFIG || {};
var VERSION = CFG.version || '0.1.1';
var NATIVE = window.FDNative || null;
try { if (NATIVE && NATIVE.version) VERSION = NATIVE.version() || VERSION; } catch (e) {}
var $app = document.getElementById('app');
var $ov = document.getElementById('overlay');

/* ---------------- Icons (same set as the mockup) ---------------- */
var P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  stack: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M6 6h12M8 3h8"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
  home: '<path d="M3.5 11 12 4l8.5 7v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/>',
  sticky: '<path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v9l-6 6H5a1 1 0 0 1-1-1z"/><path d="M14 20v-5a1 1 0 0 1 1-1h5"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  user: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.8"/>',
  fork: '<path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M8 3v6"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  bag: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  chevl: '<path d="M15 5l-7 7 7 7"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.5L20 16M20 20v-4h-4"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
  nav: '<path d="M12 2.5 19.5 21 12 17l-7.5 4z"/>'
};
function ic(name, size, color, sw) {
  return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' +
    (color || 'currentColor') + '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
}
var BLUE = '#1E3FAE', INK = '#14161F', GREY = '#5B6275';
var LOGO = '<div class="logo"><div class="ring">' + ic('fork', 15, '#fff', 2.2) + '</div></div>';
var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ECEEF4"/><circle cx="50" cy="50" r="27" fill="none" stroke="#D5D9E4" stroke-width="3"/></svg>');

/* ---------------- Small helpers ---------------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function p2(n) { return (n < 10 ? '0' : '') + n; }
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var WDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
function keyDate(k) { var a = k.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
function fmtTime(ts) { var d = new Date(ts); return p2(d.getHours()) + '.' + p2(d.getMinutes()); }
function fmtDay(ts) { var d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
function fmtShort(ts) { var d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
function dayTitle(k) {
  var d = keyDate(k), t = WDAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  if (k === dayKey(Date.now())) return 'Today, ' + WDAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  return t;
}
function daysAgo(ts) { return Math.round((keyDate(dayKey(Date.now())) - keyDate(dayKey(ts))) / 864e5); }
function rel(ts) { var n = daysAgo(ts); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 7 ? n + ' days ago' : fmtShort(ts); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
function dist(a, b) {
  var R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km'; }
var toastT;
function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
var KIND = { food: { label: 'Food', icon: 'fork' }, drink: { label: 'Drink', icon: 'cup' }, other: { label: 'Other', icon: 'bag' } };

/* ---------------- Settings ---------------- */
var S = null;
try { S = JSON.parse(localStorage.getItem('fd.settings') || 'null'); } catch (e) { S = null; }
function saveSettings() { localStorage.setItem('fd.settings', JSON.stringify(S)); }
function meName() { return (S && S.me) || 'Me'; }
function partnerName() { return (S && S.partner) || 'Partner'; }
function isMe(save) { return norm(save.who) === norm(meName()); }
function initial(n) { return (String(n || '?').trim()[0] || '?').toUpperCase(); }

/* ---------------- IndexedDB ---------------- */
var DB = null;
function openDB() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('fooddiary', 1);
    r.onupgradeneeded = function () { var d = r.result; d.createObjectStore('saves', { keyPath: 'id' }); d.createObjectStore('images'); };
    r.onsuccess = function () { DB = r.result; res(DB); };
    r.onerror = function () { rej(r.error); };
  });
}
function tx(store, mode, fn) {
  return new Promise(function (res, rej) {
    var t = DB.transaction(store, mode), s = t.objectStore(store), out = fn(s);
    t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
    t.onerror = function () { rej(t.error); };
  });
}
function idbAll(store) { return tx(store, 'readonly', function (s) { return s.getAll(); }); }
function idbKeys(store) { return tx(store, 'readonly', function (s) { return s.getAllKeys(); }); }
function idbGet(store, k) { return tx(store, 'readonly', function (s) { return s.get(k); }); }
function idbPut(store, v, k) { return tx(store, 'readwrite', function (s) { return k === undefined ? s.put(v) : s.put(v, k); }); }
function idbDel(store, k) { return tx(store, 'readwrite', function (s) { return s.delete(k); }); }

var SAVES = [];             // visible saves, newest first
var IMG = new Map();        // id -> sticker data URL
async function loadAll() {
  var all = await idbAll('saves');
  SAVES = all.filter(function (s) { return !s.deleted; }).sort(function (a, b) { return b.ts - a.ts; });
  var keys = await idbKeys('images');
  for (var i = 0; i < keys.length; i++) if (!IMG.has(keys[i])) IMG.set(keys[i], await idbGet('images', keys[i]));
}
function img(id) { return IMG.get(id) || PLACEHOLDER; }

/* ---------------- Online sync (Firestore) ---------------- */
var Sync = { state: 'local', db: null, unsub: null, got: false };
function syncEnabled() { return !!(CFG.firebase && S && S.code && window.firebase); }
function col(prefix) { return Sync.db.collection('families').doc(prefix + S.code).collection('items'); }
function startSync() {
  stopSync();
  if (!syncEnabled()) { Sync.state = 'local'; renderStatus(); return; }
  try {
    if (!firebase.apps.length) firebase.initializeApp(CFG.firebase);
    Sync.db = firebase.firestore();
  } catch (e) { Sync.state = 'offline'; renderStatus(); return; }
  Sync.state = navigator.onLine ? 'connecting' : 'offline';
  renderStatus();
  Sync.unsub = col('fd-').onSnapshot({ includeMetadataChanges: true }, function (snap) {
    Sync.state = snap.metadata.fromCache ? (navigator.onLine ? 'connecting' : 'offline') : 'online';
    renderStatus();
    var changes = snap.docChanges();
    if (!changes.length) return;
    mergeRemote(changes.map(function (c) { return c.doc.data(); }));
  }, function () { Sync.state = 'offline'; renderStatus(); });
  pushPending();
}
function stopSync() { if (Sync.unsub) { try { Sync.unsub(); } catch (e) {} } Sync.unsub = null; }
async function mergeRemote(list) {
  var changed = false;
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r || !r.id) continue;
    var l = await idbGet('saves', r.id);
    if (!l || (r.updated || 0) > (l.updated || 0)) {
      r.pending = false; r.pendingImg = false;
      await idbPut('saves', r);
      changed = true;
      if (r.deleted) { IMG.delete(r.id); await idbDel('images', r.id); }
      else if (!IMG.has(r.id)) fetchImage(r.id);
    } else if (!r.deleted && !IMG.has(r.id)) fetchImage(r.id);
  }
  if (changed) { await loadAll(); refresh(); }
}
var fetching = {};
function fetchImage(id, tries) {
  if (!Sync.db || fetching[id]) return;
  fetching[id] = 1;
  tries = tries || 0;
  col('fdimg-').doc(id).get().then(async function (d) {
    delete fetching[id];
    var v = d.exists && d.data();
    if (v && v.data) { await idbPut('images', v.data, id); IMG.set(id, v.data); refresh(); }
    else if (tries < 4) setTimeout(function () { fetchImage(id, tries + 1); }, 4000 * (tries + 1));   // partner's picture may still be uploading
  }).catch(function () { delete fetching[id]; });
}
function clean(s) {
  return { id: s.id, name: s.name || '', kind: s.kind || 'food', note: s.note || '', rating: s.rating || 0, ts: s.ts,
    place: s.place ? { name: s.place.name || '', lat: s.place.lat == null ? null : s.place.lat, lng: s.place.lng == null ? null : s.place.lng } : null,
    who: s.who || '', updated: s.updated, deleted: !!s.deleted };
}
function push(s) {
  if (!syncEnabled() || !Sync.db) return;
  col('fd-').doc(s.id).set(clean(s)).then(async function () {
    var cur = await idbGet('saves', s.id);
    if (cur && cur.updated === s.updated) { cur.pending = false; await idbPut('saves', cur); }
  }).catch(function () {});
  if (s.pendingImg) {
    var data = IMG.get(s.id);
    var p = s.deleted ? col('fdimg-').doc(s.id).delete() : (data ? col('fdimg-').doc(s.id).set({ id: s.id, data: data }) : null);
    if (p) p.then(async function () {
      var cur = await idbGet('saves', s.id);
      if (cur) { cur.pendingImg = false; await idbPut('saves', cur); }
    }).catch(function () {});
  }
}
async function pushPending() {
  var all = await idbAll('saves');
  all.forEach(function (s) { if (s.pending || s.pendingImg) push(s); });
}
window.addEventListener('online', function () { if (syncEnabled()) startSync(); });
window.addEventListener('offline', function () { if (Sync.state !== 'local') { Sync.state = 'offline'; renderStatus(); } });

/* ---------------- Data writes ---------------- */
async function writeSave(s, newImage) {
  s.updated = Date.now();
  s.pending = true;
  if (newImage) { IMG.set(s.id, newImage); await idbPut('images', newImage, s.id); s.pendingImg = true; }
  await idbPut('saves', s);
  await loadAll();
  push(s);
  refresh();
}
async function deleteSave(id) {
  var s = await idbGet('saves', id);
  if (!s) return;
  s.deleted = true; s.updated = Date.now(); s.pending = true; s.pendingImg = true;
  await idbPut('saves', s);
  IMG.delete(id); await idbDel('images', id);
  await loadAll();
  push(s);
  refresh();
}

/* ---------------- Derived numbers ---------------- */
function filtered(list) {
  var f = UI.filter;
  return (list || SAVES).filter(function (s) {
    if (f === 'all') return true;
    if (f === 'notes') return !!(s.note && s.note.trim());
    return s.kind === f;
  });
}
function inMonth(list, m) { return list.filter(function (s) { var d = new Date(s.ts); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); }); }
function momentKey(s) { return dayKey(s.ts) + '|' + norm(s.place && s.place.name); }
function countMoments(list) { var o = {}; list.forEach(function (s) { o[momentKey(s)] = 1; }); return Object.keys(o).length; }
function countDays(list) { var o = {}; list.forEach(function (s) { o[dayKey(s.ts)] = 1; }); return Object.keys(o).length; }
function placesOf(list) {
  var map = {};
  list.forEach(function (s) {
    if (!s.place || !s.place.name) return;
    var k = norm(s.place.name);
    var p = map[k] || (map[k] = { key: k, name: s.place.name, saves: [], days: {}, lat: null, lng: null, last: 0 });
    p.saves.push(s); p.days[dayKey(s.ts)] = 1;
    if (s.ts > p.last) { p.last = s.ts; p.name = s.place.name; }
    if (p.lat == null && s.place.lat != null) { p.lat = s.place.lat; p.lng = s.place.lng; }
  });
  return Object.keys(map).map(function (k) {
    var p = map[k];
    p.visits = Object.keys(p.days).length;
    var best = p.saves.slice().sort(function (a, b) { return (b.rating || 0) - (a.rating || 0) || b.ts - a.ts; })[0];
    p.loved = best ? best.name : '';
    p.cover = p.saves[0];
    return p;
  });
}
function groupsByName(list) {
  var map = {};
  list.forEach(function (s) {
    var k = norm(s.name); if (!k) return;
    var g = map[k] || (map[k] = { key: k, name: s.name, saves: [] });
    g.saves.push(s);
  });
  return Object.keys(map).map(function (k) { return map[k]; });
}
function tagsOf(list) {
  var map = {};
  list.forEach(function (s) {
    var m = String(s.note || '').match(/#[\p{L}\p{N}_-]+/gu) || [];
    m.forEach(function (t) { var k = t.toLowerCase(); (map[k] = map[k] || { tag: k, saves: [] }).saves.push(s); });
  });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.saves.length - a.saves.length; });
}

/* ---------------- UI state ---------------- */
var now0 = new Date();
var UI = {
  tab: 'table', view: localStorage.getItem('fd.view') || 'month', filter: 'all',
  month: new Date(now0.getFullYear(), now0.getMonth(), 1), selDay: dayKey(Date.now()),
  psort: 'most', period: 'month', here: null, stack: []
};
var mapObj = null;

/* ---------------- Shared pieces ---------------- */
function statusHtml() {
  var st = Sync.state, cls = st === 'online' ? '' : st === 'local' ? 'local' : 'off';
  var label = st === 'online' ? 'ONLINE' : st === 'local' ? 'LOCAL' : st === 'connecting' ? 'CONNECTING' : 'OFFLINE';
  return '<div class="status ' + cls + '" id="status"><div class="dot"></div><span>' + label + '</span></div>';
}
function renderStatus() { var el = document.getElementById('status'); if (el) el.outerHTML = statusHtml(); }
function avatars(size) {
  var f = Math.round(size * 0.45);
  return '<div class="avs"><div class="av" style="width:' + size + 'px;height:' + size + 'px;font-size:' + f + 'px">' + esc(initial(meName())) + '</div>' +
    '<div class="av p" style="width:' + size + 'px;height:' + size + 'px;font-size:' + f + 'px">' + esc(initial(partnerName())) + '</div></div>';
}
function header(title, sub, right) {
  return '<div class="hdr">' + statusHtml() + '<div class="hrow">' + LOGO +
    '<div class="htext"><div class="htitle">' + title + '<b>.</b></div><div class="hsub">' + sub + '</div></div>' +
    (right != null ? right :
      '<button class="ibtn" aria-label="Search" data-act="search">' + ic('search') + '</button>' +
      '<button class="ibtn" aria-label="Settings" data-act="settings">' + ic('gear') + '</button>') +
    '</div></div>';
}
function switcher() {
  var items = [['stack', 'stack', 'Stack'], ['month', 'cal', 'Month'], ['list', 'list', 'List'], ['places', 'pin', 'Places'], ['shared', 'users', 'Shared']];
  return '<div class="switch">' + items.map(function (it) {
    var on = UI.view === it[0];
    return '<button class="' + (on ? 'on' : '') + '" aria-label="' + it[2] + '" data-act="view:' + it[0] + '">' +
      ic(it[1], 20, on ? BLUE : GREY, on ? 2 : 1.8) + (on ? it[2] : '') + '</button>';
  }).join('') + '</div>';
}
function chips() {
  var items = [['all', 'grid', 'All'], ['food', 'fork', 'Food'], ['drink', 'cup', 'Drinks'], ['other', 'bag', 'Others'], ['notes', 'note', 'Notes']];
  return '<div class="chips">' + items.map(function (it) {
    var on = UI.filter === it[0];
    return '<button class="chip ' + (on ? 'on' : '') + '" data-act="filter:' + it[0] + '">' + ic(it[1], 16, on ? '#fff' : GREY, on ? 2 : 1.8) + it[2] + '</button>';
  }).join('') + '</div>';
}
function nav() {
  var items = [['table', 'home', 'Table'], ['collections', 'sticky', 'Collections'], ['tags', 'tag', 'Tags'], ['you', 'user', 'You']];
  return '<div class="navfade"></div><div class="nav"><div class="navbar">' + items.map(function (it) {
    var on = UI.tab === it[0];
    return '<button class="' + (on ? 'on' : '') + '" data-act="tab:' + it[0] + '">' + ic(it[1], 22, on ? BLUE : GREY, on ? 2 : 1.8) + it[2] + '</button>';
  }).join('') + '</div><button class="fab" aria-label="Add a save" data-act="capture">' + ic('camera', 26, '#fff', 2) + '</button></div>';
}
function whoBadge(s) { return '<span class="who ' + (isMe(s) ? '' : 'p') + '" title="' + esc(s.who) + '">' + esc(initial(s.who)) + '</span>'; }
function itemCard(s) {
  var k = KIND[s.kind] || KIND.food;
  return '<button class="item" data-act="open:' + s.id + '"><img src="' + img(s.id) + '" alt="">' +
    '<div class="b"><div class="r1"><div class="nm">' + esc(s.name || 'Untitled') + '</div>' +
    (s.rating ? '<div class="st">' + ic('star', 15, BLUE, 2) + s.rating + '</div>' : '') + '</div>' +
    '<div class="meta"><span>' + ic(k.icon, 14, GREY) + k.label + '</span><span>' + ic('clock', 14, GREY) + fmtTime(s.ts) + '</span></div>' +
    (s.place && s.place.name ? '<div class="meta"><span class="ell">' + ic('pin', 14, GREY) + '<span class="ell">' + esc(s.place.name) + '</span></span></div>' : '') +
    '<div class="nt"><span>' + (s.note ? ic('note', 14, GREY) + '<span class="ell">' + esc(s.note) + '</span>' : '') + '</span>' + whoBadge(s) + '</div>' +
    '</div></button>';
}
function dayhead(k, n) { return '<div class="dayhead"><div class="bul"></div><div class="t">' + dayTitle(k) + '</div><div class="c">' + plural(n, 'save') + '</div></div>'; }
function empty(icon, t, s) { return '<div class="empty">' + ic(icon, 30, '#A9AFBF') + '<div class="t">' + t + '</div><div class="s">' + s + '</div></div>'; }
function monthSec(list, right) {
  return '<div class="sec"><div><div class="sec-t">' + MONTHS[UI.month.getMonth()] + ' ' + UI.month.getFullYear() + '</div>' +
    '<div class="sec-s">' + plural(list.length, 'save') + ' · ' + plural(countMoments(list), 'moment') + '</div></div>' + (right || '') + '</div>';
}
function monthArrows() {
  return '<div style="display:flex;gap:4px"><button class="ibtn" style="width:40px;height:40px" aria-label="Previous month" data-act="month:-1">' + ic('chevl', 18, INK) + '</button>' +
    '<button class="ibtn" style="width:40px;height:40px" aria-label="Next month" data-act="month:1">' + ic('chev', 18, INK) + '</button></div>';
}

/* ---------------- Table views ---------------- */
function viewMonth() {
  var m = UI.month, list = inMonth(filtered(), m), byDay = {};
  list.forEach(function (s) { (byDay[dayKey(s.ts)] = byDay[dayKey(s.ts)] || []).push(s); });
  var first = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
  var nd = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  var today = dayKey(Date.now()), cells = '';
  for (var i = 0; i < first; i++) cells += '<div style="height:50px"></div>';
  for (var d = 1; d <= nd; d++) {
    var k = m.getFullYear() + '-' + p2(m.getMonth() + 1) + '-' + p2(d), arr = byDay[k], cls = 'day';
    if (k > today) cls += ' fut';
    if (k === today) cls += ' today';
    if (k === UI.selDay) cls += ' sel';
    if (arr) {
      cls += ' has';
      cells += '<button class="' + cls + '" data-act="day:' + k + '" aria-label="' + d + ' ' + MONTHS[m.getMonth()] + ', ' + plural(arr.length, 'save') + '"><img src="' + img(arr[0].id) + '" alt=""><span class="n">' + d + '</span>' +
        (arr.length > 1 ? '<span class="more">+' + (arr.length - 1) + '</span>' : '') + '</button>';
    } else cells += '<button class="' + cls + '" data-act="day:' + k + '">' + d + '</button>';
  }
  var sel = (byDay[UI.selDay] || []);
  var selIn = UI.selDay.slice(0, 7) === m.getFullYear() + '-' + p2(m.getMonth() + 1);
  var h = monthSec(list, avatars(26)) +
    '<div class="cal" id="cal"><div class="dow">' + 'MTWTFSS'.split('').map(function (x) { return '<div>' + x + '</div>'; }).join('') + '</div>' +
    '<div class="days">' + cells + '</div>' +
    '<div class="calfoot">' + ic('cal', 16, GREY) + '<span>' + plural(countDays(list), 'day') + ' at the table</span><span class="sp"></span>' +
    '<button class="ibtn" aria-label="Previous month" data-act="month:-1">' + ic('chevl', 18, INK) + '</button>' +
    '<button class="ibtn" aria-label="Next month" data-act="month:1">' + ic('chev', 18, INK) + '</button></div></div>';
  if (selIn) {
    h += '<div class="stackcol"><div class="dayhead"><div class="bul"></div><div class="t">' + dayTitle(UI.selDay) + '</div><div class="c">' + plural(sel.length, 'save') + '</div></div>' +
      (sel.length ? sel.map(itemCard).join('') : empty('camera', 'Nothing saved this day', 'Tap the camera to save what you are eating or drinking.')) + '</div>';
  }
  return h;
}
function viewList() {
  var list = inMonth(filtered(), UI.month), days = {}, order = [];
  list.forEach(function (s) { var k = dayKey(s.ts); if (!days[k]) { days[k] = []; order.push(k); } days[k].push(s); });
  var h = monthSec(list, monthArrows()) + '<div class="stackcol">';
  if (!list.length) h += empty('list', 'No saves this month', 'Your saves appear here as a timeline, day by day.');
  order.forEach(function (k) { h += dayhead(k, days[k].length) + days[k].map(itemCard).join(''); });
  return h + '</div>';
}
function viewStack() {
  var list = inMonth(filtered(), UI.month);
  var h = monthSec(list, monthArrows());
  if (!list.length) return h + empty('stack', 'Your sticker book is empty', 'Every save becomes a sticker here.');
  return h + '<div class="book">' + list.map(function (s) {
    return '<button class="stk" data-act="open:' + s.id + '"><img src="' + img(s.id) + '" alt=""><span>' + esc(s.name || 'Untitled') + '</span></button>';
  }).join('') + '</div>';
}
function sortedPlaces() {
  var ps = placesOf(filtered());
  if (UI.psort === 'latest') ps.sort(function (a, b) { return b.last - a.last; });
  else if (UI.psort === 'nearby' && UI.here) {
    ps.forEach(function (p) { p.d = p.lat != null ? dist(UI.here, p) : 1e12; });
    ps.sort(function (a, b) { return a.d - b.d; });
  } else ps.sort(function (a, b) { return b.visits - a.visits || b.last - a.last; });
  return ps;
}
function viewPlaces() {
  var ps = sortedPlaces();
  var h = '<div class="map" id="mapbox">' +
    (ps.some(function (p) { return p.lat != null; }) ? '<div id="map" style="position:absolute;inset:0"></div>' +
      '<button class="mapbtn" data-act="bigmap">' + ic('expand', 15, INK) + 'Enlarge map</button>'
      : '<div class="mapempty">Saves with a location show up on this map.</div>') + '</div>' +
    '<div class="seg">' + [['most', 'Most visited'], ['latest', 'Latest'], ['nearby', 'Nearby']].map(function (x) {
      return '<button class="' + (UI.psort === x[0] ? 'on' : '') + '" data-act="psort:' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div><div class="list">';
  if (!ps.length) h += empty('pin', 'No places yet', 'FoodDiary saves where you were when you take a photo.');
  ps.forEach(function (p) {
    var second = UI.psort === 'nearby' && p.d != null && p.d < 1e12 ? ic('nav', 14, GREY) + fmtDist(p.d) : ic('clock', 14, GREY) + rel(p.last);
    h += '<button class="prow" data-act="place:' + encodeURIComponent(p.key) + '"><img src="' + img(p.cover.id) + '" alt="">' +
      '<div class="b"><div class="nm ell">' + esc(p.name) + '</div><div class="meta"><span>' + ic('stack', 14, GREY) + plural(p.visits, 'visit') + '</span><span>' + second + '</span></div>' +
      '<div class="lv ell">Loved · <b>' + esc(p.loved) + '</b></div></div>' + ic('chev', 18, GREY) + '</button>';
  });
  return h + '</div>';
}
function viewShared() {
  var list = inMonth(filtered(), UI.month);
  var mine = list.filter(isMe), theirs = list.filter(function (s) { return !isMe(s); });
  function card(name, arr, p) {
    return '<div class="pcard"><div class="top"><span class="who ' + p + '" style="width:26px;height:26px;border-radius:13px;font-size:12px">' + esc(initial(name)) + '</span><span class="ell">' + esc(name) + '</span></div>' +
      '<div><div class="big">' + arr.length + '</div><div class="sm">SAVES</div></div>' +
      '<div class="minis">' + (arr.length ? arr.slice(0, 4).map(function (s) { return '<img src="' + img(s.id) + '" alt="">'; }).join('') : '<span style="font-size:12px;color:#5B6275">Nothing yet</span>') + '</div></div>';
  }
  var h = monthSec(list, monthArrows()) + '<div class="pair">' + card(meName(), mine, '') + card(partnerName(), theirs, 'p') + '</div>';
  h += '<div class="label">Latest from ' + esc(partnerName()) + '</div><div class="stackcol" style="margin-top:10px">' +
    (theirs.length ? theirs.slice(0, 5).map(itemCard).join('') : empty('users', 'Nothing from ' + esc(partnerName()) + ' yet', 'When your partner saves something, it shows up here.')) + '</div>';
  h += '<div class="label">Latest from you</div><div class="stackcol" style="margin-top:10px">' +
    (mine.length ? mine.slice(0, 5).map(itemCard).join('') : empty('camera', 'Nothing from you yet', 'Tap the camera to add your first save.')) + '</div>';
  return h;
}

/* ---------------- Tabs ---------------- */
function tabTable() {
  var v = UI.view, body = v === 'list' ? viewList() : v === 'stack' ? viewStack() : v === 'places' ? viewPlaces() : v === 'shared' ? viewShared() : viewMonth();
  return header('FoodDiary', 'Our table, remembered') + switcher() + (v === 'places' ? '' : chips()) + body;
}
function tabCollections() {
  var gs = groupsByName(filtered()).sort(function (a, b) { return b.saves.length - a.saves.length || b.saves[0].ts - a.saves[0].ts; });
  var h = header('Collections', 'Dishes you keep coming back to') + chips() + '<div class="list" style="margin-top:16px">';
  if (!gs.length) h += empty('sticky', 'No collections yet', 'Saves with the same name are collected here, so you can see how often you had them.');
  gs.forEach(function (g) {
    var s = g.saves[0], rated = g.saves.filter(function (x) { return x.rating; });
    var avg = rated.length ? (rated.reduce(function (a, x) { return a + x.rating; }, 0) / rated.length) : 0;
    h += '<button class="prow" data-act="coll:' + encodeURIComponent(g.key) + '"><img src="' + img(s.id) + '" alt="">' +
      '<div class="b"><div class="nm ell">' + esc(g.name) + '</div><div class="meta"><span>' + ic('stack', 14, GREY) + 'had ' + g.saves.length + '×</span>' +
      (avg ? '<span>' + ic('star', 14, GREY) + avg.toFixed(1) + '</span>' : '') + '<span>' + ic('clock', 14, GREY) + rel(s.ts) + '</span></div>' +
      (s.place && s.place.name ? '<div class="lv ell">Last at · <b>' + esc(s.place.name) + '</b></div>' : '') + '</div>' + ic('chev', 18, GREY) + '</button>';
  });
  return h + '</div>';
}
function tabTags() {
  var ts = tagsOf(filtered());
  var h = header('Tags', 'Find saves by tag') + chips() + '<div class="list" style="margin-top:16px">';
  if (!ts.length) h += empty('hash', 'No tags yet', 'Add #tags in a note, for example #breakfast or #datenight, and they collect here.');
  ts.forEach(function (t) {
    h += '<button class="prow" data-act="tag:' + encodeURIComponent(t.tag) + '"><img src="' + img(t.saves[0].id) + '" alt="">' +
      '<div class="b"><div class="nm ell" style="color:#1E3FAE">' + esc(t.tag) + '</div><div class="meta"><span>' + ic('stack', 14, GREY) + plural(t.saves.length, 'save') + '</span><span>' + ic('clock', 14, GREY) + rel(t.saves[0].ts) + '</span></div></div>' + ic('chev', 18, GREY) + '</button>';
  });
  return h + '</div>';
}
function tabYou() {
  var all = SAVES, nowD = new Date(), list, label;
  if (UI.period === 'month') { list = inMonth(all, new Date(nowD.getFullYear(), nowD.getMonth(), 1)); label = MONTHS[nowD.getMonth()] + ' ' + nowD.getFullYear(); }
  else if (UI.period === 'year') { list = all.filter(function (s) { return new Date(s.ts).getFullYear() === nowD.getFullYear(); }); label = String(nowD.getFullYear()); }
  else { list = all; var f = all[all.length - 1]; label = f ? 'Since ' + MONTHS[new Date(f.ts).getMonth()] + ' ' + new Date(f.ts).getFullYear() : 'All time'; }
  var food = list.filter(function (s) { return s.kind === 'food'; }).length, drink = list.filter(function (s) { return s.kind === 'drink'; }).length, other = list.length - food - drink;
  var tot = list.length || 1, mine = list.filter(isMe).length;
  var h = header('Us', esc(meName()) + ' &amp; ' + esc(partnerName()) + ' · shared diary', avatars(30)) +
    '<div class="seg">' + [['all', 'All time'], ['year', 'This year'], ['month', 'This month']].map(function (x) {
      return '<button class="' + (UI.period === x[0] ? 'on' : '') + '" data-act="period:' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>' +
    '<div class="statcard"><div class="label" style="margin:0">' + esc(label) + '</div><div class="kpis">' +
    '<div class="kpi"><div class="v">' + list.length + '</div><div class="k">SAVES</div></div>' +
    '<div class="kpi"><div class="v">' + countMoments(list) + '</div><div class="k">MOMENTS</div></div>' +
    '<div class="kpi"><div class="v">' + placesOf(list).length + '</div><div class="k">PLACES</div></div></div>' +
    '<div class="bar"><div style="width:' + (food / tot * 100) + '%;background:#1E3FAE"></div><div style="width:' + (drink / tot * 100) + '%;background:#8FA3E6"></div><div style="width:' + (other / tot * 100) + '%;background:#C9CEDB"></div></div>' +
    '<div class="legend"><span><i style="background:#1E3FAE"></i>' + food + ' food</span><span><i style="background:#8FA3E6"></i>' + plural(drink, 'drink') + '</span><span><i style="background:#C9CEDB"></i>' + plural(other, 'other') + '</span></div>' +
    '<div class="split"><div><span class="who">' + esc(initial(meName())) + '</span><b>' + mine + '</b> saves</div><div><span class="who p">' + esc(initial(partnerName())) + '</span><b>' + (list.length - mine) + '</b> saves</div></div></div>';
  var favs = groupsByName(list).sort(function (a, b) {
    var ra = Math.max.apply(null, a.saves.map(function (s) { return s.rating || 0; })), rb = Math.max.apply(null, b.saves.map(function (s) { return s.rating || 0; }));
    return b.saves.length - a.saves.length || rb - ra;
  }).slice(0, 5);
  h += '<div class="label">Favorites</div><div style="margin:4px 20px 0 20px">';
  if (!favs.length) h += '<div style="font-size:13px;color:#5B6275;padding:10px 0">Your most-had dishes and drinks show here.</div>';
  favs.forEach(function (g, i) {
    var s = g.saves[0];
    h += '<button class="fav" data-act="coll:' + encodeURIComponent(g.key) + '"><div class="n">' + p2(i + 1) + '</div><img src="' + img(s.id) + '" alt="">' +
      '<div class="b"><div class="nm ell">' + esc(g.name) + '</div><div class="ell" style="font-size:12px;color:#5B6275">' + esc(s.place && s.place.name || (KIND[s.kind] || KIND.food).label) + '</div></div><div class="x">had ' + g.saves.length + '×</div></button>';
  });
  h += '</div>';
  var old = SAVES.filter(function (s) { return daysAgo(s.ts) >= 3; });
  if (old.length) {
    var mem = old[(new Date().getDate()) % old.length], n = daysAgo(mem.ts);
    h += '<div class="label">A memory</div><button class="memory" data-act="open:' + mem.id + '"><img src="' + img(mem.id) + '" alt="">' +
      '<div style="min-width:0"><div class="k">' + n + ' DAYS AGO</div><div class="t ell">' + esc(mem.name) + '</div><div class="s ell">' + esc((mem.place && mem.place.name ? mem.place.name + ' · ' : '') + fmtShort(mem.ts)) + '</div></div></button>';
  }
  return h;
}

/* ---------------- Main render ---------------- */
function render(keepScroll) {
  if (!S) { renderSetup(); return; }
  var sc = document.getElementById('scroll'), top = keepScroll && sc ? sc.scrollTop : 0;
  if (mapObj) { mapObj.remove(); mapObj = null; }
  var body = UI.tab === 'collections' ? tabCollections() : UI.tab === 'tags' ? tabTags() : UI.tab === 'you' ? tabYou() : tabTable();
  $app.innerHTML = '<div class="scroll" id="scroll"><div class="wrap">' + body + '</div></div>' + nav();
  document.getElementById('scroll').scrollTop = top;
  if (UI.tab === 'table' && UI.view === 'places') drawMap('map', false);
  if (UI.tab === 'table' && UI.view === 'month') bindSwipe();
}
function refresh() {
  render(true);
  var top = UI.stack[UI.stack.length - 1];
  if (top && top.refresh) top.refresh();
}
function bindSwipe() {
  var el = document.getElementById('cal'); if (!el) return;
  var x0 = null, y0 = null;
  el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', function (e) {
    if (x0 == null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}
function shiftMonth(n) {
  UI.month = new Date(UI.month.getFullYear(), UI.month.getMonth() + n, 1);
  var t = new Date(), same = UI.month.getFullYear() === t.getFullYear() && UI.month.getMonth() === t.getMonth();
  UI.selDay = same ? dayKey(Date.now()) : dayKey(UI.month.getTime());
  render();
}

/* ---------------- Map ---------------- */
function drawMap(elId, big) {
  if (!window.L) return null;
  var el = document.getElementById(elId); if (!el) return null;
  var ps = placesOf(filtered()).filter(function (p) { return p.lat != null; });
  if (!ps.length) return null;
  var m = L.map(el, { zoomControl: big, attributionControl: true });
  m.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap © CARTO'
  }).addTo(m);
  var pts = [];
  ps.forEach(function (p) {
    var html = '<div class="pin"><img src="' + img(p.cover.id) + '" alt="">' + (p.saves.length > 1 ? '<b>' + p.saves.length + '</b>' : '') + '</div>';
    var mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ html: html, className: '', iconSize: [52, 52], iconAnchor: [26, 26] }) }).addTo(m);
    mk.on('click', function () { openPlace(p.key); });
    pts.push([p.lat, p.lng]);
  });
  if (pts.length === 1) m.setView(pts[0], 15); else m.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  if (!big) mapObj = m;
  setTimeout(function () { m.invalidateSize(); }, 60);
  return m;
}

/* ---------------- Overlays (stack) ---------------- */
function pushOv(o) { UI.stack.push(o); paintOv(); }
function popOv() { var o = UI.stack.pop(); if (o && o.close) o.close(); paintOv(); }
function paintOv() {
  var top = UI.stack[UI.stack.length - 1];
  $ov.innerHTML = top ? top.html() : '';
  if (top && top.after) top.after();
}
window.FD_back = function () {
  if (UI.stack.length) { popOv(); return true; }
  if (UI.tab !== 'table') { UI.tab = 'table'; render(); return true; }
  return false;
};
window.addEventListener('popstate', function () { if (UI.stack.length) popOv(); });

function topbar(title, right) {
  return '<div class="topbar"><button class="rbtn" aria-label="Back" data-act="back">' + ic('back', 20, INK, 2) + '</button><div class="t ell">' + title + '</div>' + (right || '') + '</div>';
}
function listScreen(title, getList) {
  var o = {
    html: function () {
      var l = getList();
      return '<div class="screen"><div class="wrap">' + topbar(esc(title)) + '<div class="stackcol" style="margin-top:4px;padding-bottom:40px">' +
        (l.length ? l.map(itemCard).join('') : empty('stack', 'Nothing here', 'These saves were removed.')) + '</div></div></div>';
    }
  };
  o.refresh = paintOv;
  pushOv(o);
}
function openPlace(key) {
  var p = placesOf(SAVES).filter(function (x) { return x.key === key; })[0];
  listScreen(p ? p.name : 'Place', function () { var q = placesOf(SAVES).filter(function (x) { return x.key === key; })[0]; return q ? q.saves : []; });
}

/* ---------------- Detail ---------------- */
var delArm = false;
function openDetail(id) {
  delArm = false;
  var o = {
    html: function () {
      var s = SAVES.filter(function (x) { return x.id === id; })[0];
      if (!s) return '<div class="screen"><div class="wrap">' + topbar('Removed') + empty('trash', 'This save was removed', '') + '</div></div>';
      var k = KIND[s.kind] || KIND.food;
      return '<div class="screen"><div class="wrap">' + topbar(k.label) +
        '<div class="hero"><img src="' + img(s.id) + '" alt=""></div>' +
        '<div class="dtitle"><div class="t">' + esc(s.name || 'Untitled') + '</div>' + (s.rating ? '<div class="st" style="display:flex;gap:4px;align-items:center;color:#1E3FAE;font-weight:800;font-size:18px">' + ic('star', 20, BLUE, 2) + s.rating + '</div>' : '') + '</div>' +
        '<div class="dcard"><div class="rows" style="border:none">' +
        '<div class="rowi">' + ic('clock', 18, BLUE) + '<span style="flex-grow:1">' + WDAYS[new Date(s.ts).getDay()] + ', ' + fmtDay(s.ts) + ' ' + new Date(s.ts).getFullYear() + ' · ' + fmtTime(s.ts) + '</span></div>' +
        (s.place && s.place.name ? '<div class="rowi">' + ic('pin', 18, BLUE) + '<span style="flex-grow:1">' + esc(s.place.name) + '</span></div>' : '') +
        '<div class="rowi">' + ic(k.icon, 18, BLUE) + '<span style="flex-grow:1">' + k.label + '</span></div>' +
        '<div class="rowi">' + whoBadge(s) + '<span style="flex-grow:1">Saved by ' + esc(s.who) + '</span></div>' +
        '</div></div>' + (s.note ? '<div class="dnote">' + esc(s.note) + '</div>' : '') +
        '<div class="dbtns"><button class="btn2" data-act="edit:' + s.id + '">' + ic('edit', 18, INK) + 'Edit</button>' +
        '<button class="btn2" id="delbtn" style="color:#B42318" data-act="del:' + s.id + '">' + ic('trash', 18, '#B42318') + (delArm ? 'Tap again' : 'Delete') + '</button></div></div></div>';
    }
  };
  o.refresh = paintOv;
  pushOv(o);
}

/* ---------------- Search ---------------- */
function openSearch() {
  var q = '';
  var o = {
    html: function () {
      return '<div class="screen"><div class="wrap"><div class="topbar"><button class="rbtn" aria-label="Back" data-act="back">' + ic('back', 20, INK, 2) + '</button>' +
        '<label class="sbox">' + ic('search', 18, GREY) + '<input id="q" type="search" placeholder="Search name, place or note" value="' + esc(q) + '" autocomplete="off"></label></div>' +
        '<div class="stackcol" id="sres" style="margin-top:4px;padding-bottom:40px"></div></div></div>';
    },
    after: function () {
      var inp = document.getElementById('q');
      function run() {
        q = inp.value; var n = norm(q), res = !n ? [] : SAVES.filter(function (s) {
          return norm(s.name).indexOf(n) >= 0 || norm(s.note).indexOf(n) >= 0 || norm(s.place && s.place.name).indexOf(n) >= 0;
        });
        document.getElementById('sres').innerHTML = !n ? '' : res.length ? res.map(itemCard).join('') : empty('search', 'No matches', 'Try another word.');
      }
      inp.addEventListener('input', run); run(); setTimeout(function () { inp.focus(); }, 50);
    }
  };
  pushOv(o);
}

/* ---------------- Settings & setup ---------------- */
function openSettings() {
  var o = {
    html: function () {
      var st = Sync.state === 'online' ? 'Online · synced with ' + esc(partnerName()) : Sync.state === 'local' ? 'This phone only (no diary code)' : Sync.state === 'connecting' ? 'Connecting…' : 'Offline · changes sync when back online';
      return '<div class="screen"><div class="wrap">' + topbar('Settings') + '<div class="set">' +
        '<div class="card"><div class="t">Names</div>' +
        '<label class="fl">Your name<input class="inp" id="s-me" value="' + esc(S.me) + '" autocomplete="off"></label>' +
        '<label class="fl">Partner\'s name<input class="inp" id="s-pa" value="' + esc(S.partner) + '" autocomplete="off"></label></div>' +
        '<div class="card"><div class="t">Shared diary</div><div class="s">Both phones use the same diary code to share one diary.</div>' +
        '<label class="fl">Diary code<input class="inp" id="s-code" value="' + esc(S.code) + '" autocomplete="off" autocapitalize="off"></label>' +
        '<div class="s" style="display:flex;align-items:center;gap:8px">' + ic('sync', 16, GREY) + st + '</div>' +
        '<button class="btn2" data-act="syncnow" style="flex:none">' + ic('sync', 18, INK) + 'Sync now</button></div>' +
        '<div class="card"><div class="t">App</div><div class="s">FoodDiary v' + VERSION + '</div>' +
        (NATIVE && NATIVE.checkUpdate ? '<button class="btn2" data-act="checkupdate" style="flex:none">' + ic('sync', 18, INK) + 'Check for update</button>'
          : '<a class="btn2" style="flex:none;text-decoration:none;color:#14161F" href="FoodDiary.apk" download>' + ic('image', 18, INK) + 'Get the Android app</a>') + '</div>' +
        '<button class="btn1" style="flex:none" data-act="savesettings">Save</button>' +
        '<div class="ver">FoodDiary v' + VERSION + ' · ' + plural(SAVES.length, 'save') + ' on this phone</div></div></div></div>';
    }
  };
  o.refresh = function () {};
  pushOv(o);
}
function renderSetup() {
  $app.innerHTML = '<div class="scroll" style="padding-bottom:0"><div class="setup">' + LOGO +
    '<div class="hello">Welcome to FoodDiary<b>.</b></div><div class="s">Save what you eat and drink, as stickers on your shared calendar.</div>' +
    '<label class="fl">Your name<input class="inp" id="u-me" autocomplete="off" placeholder="e.g. Dennis"></label>' +
    '<label class="fl">Partner\'s name<input class="inp" id="u-pa" autocomplete="off"></label>' +
    '<label class="fl">Diary code<input class="inp" id="u-code" autocomplete="off" autocapitalize="off" placeholder="Same code on both phones"></label>' +
    '<div class="s" style="font-size:12px">Use the same diary code on both phones to share one diary. Leave it empty to keep it on this phone only.</div>' +
    '<button class="btn1" style="flex:none;margin-top:6px" data-act="start">Start</button></div></div>';
}

/* ---------------- Capture & editor ---------------- */
var Ed = null;   // editor state
function chooseSource() {
  pushOv({
    html: function () {
      return '<div class="sheetbg" data-act="back"><div class="sheet" data-stop="1"><div class="grab"></div><h3>New save</h3>' +
        '<button class="optbtn" data-act="src:camera">' + ic('camera', 22, BLUE) + 'Take a photo</button>' +
        '<button class="optbtn" data-act="src:gallery">' + ic('image', 22, BLUE) + 'Choose from gallery</button>' +
        '<button class="btn2" style="flex:none;margin-top:4px" data-act="back">Cancel</button></div></div>';
    }
  });
}
function startCapture(src, existing) {
  if (!existing) {
    Ed = { id: uid(), isNew: true, name: '', kind: 'food', note: '', rating: 0, ts: Date.now(), place: null, sticker: null, busy: true, cut: false, msg: '' };
    locate(function (loc) {
      if (!Ed || !loc) return;
      if (Ed.place && Ed.place.edited) return;
      Ed.place = { name: nearestKnown(loc) || loc.name || '', lat: loc.lat, lng: loc.lng };
      var el = document.getElementById('e-place'); if (el && !el.value) el.value = Ed.place.name;
    });
  } else { Ed.busy = true; }
  if (UI.stack.length && !UI.stack[UI.stack.length - 1].editor) UI.stack.pop();
  if (!UI.stack.length || !UI.stack[UI.stack.length - 1].editor) pushOv(editorOv()); else paintOv();
  if (NATIVE && NATIVE.capture) NATIVE.capture(src);
  else webPick(src);
}
function nearestKnown(loc) {
  var best = null, bd = 150;
  placesOf(SAVES).forEach(function (p) { if (p.lat != null) { var d = dist(loc, p); if (d < bd) { bd = d; best = p.name; } } });
  return best;
}
window.FD_onPhoto = function (json) {
  var r; try { r = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { r = { ok: false }; }
  if (!Ed) return;
  if (!r || !r.ok) {
    if (r && r.error === 'cancel') { if (!Ed.sticker) closeEditor(); else { Ed.busy = false; paintOv(); } return; }
    Ed.busy = false; paintOv(); toast('Could not read the photo. Try again.'); return;
  }
  makeSticker(r.data, !!r.cut).then(function (url) {
    if (!Ed) return;
    Ed.sticker = url; Ed.cut = !!r.cut; Ed.busy = false;
    Ed.msg = r.cut ? 'Sticker cut out' : (r.note || 'Saved as photo');
    paintOv();
  });
};
function webPick(src) {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; if (src === 'camera') inp.setAttribute('capture', 'environment');
  var picked = false;
  inp.onchange = function () {
    picked = true;
    var f = inp.files && inp.files[0]; if (!f) { window.FD_onPhoto({ ok: false, error: 'cancel' }); return; }
    var rd = new FileReader();
    rd.onload = function () { window.FD_onPhoto({ ok: true, data: rd.result, cut: false, note: 'Photo (cut-out works in the Android app)' }); };
    rd.readAsDataURL(f);
  };
  window.addEventListener('focus', function onf() {
    window.removeEventListener('focus', onf);
    setTimeout(function () { if (!picked) window.FD_onPhoto({ ok: false, error: 'cancel' }); }, 800);
  });
  inp.click();
}
function locate(cb) {
  if (NATIVE && NATIVE.locate) { window.FD_onLocation = function (j) { var r; try { r = JSON.parse(j); } catch (e) { r = null; } cb(r && r.ok ? r : null); }; NATIVE.locate(); return; }
  if (!navigator.geolocation) { cb(null); return; }
  navigator.geolocation.getCurrentPosition(function (pos) {
    var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: '' };
    fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=' + loc.lat + '&lon=' + loc.lng)
      .then(function (r) { return r.json(); }).then(function (j) {
        var a = j.address || {};
        loc.name = a.road ? a.road + (a.house_number ? ' No. ' + a.house_number : '') : (a.village || a.suburb || a.city_district || a.town || a.city || '');
        cb(loc);
      }).catch(function () { cb(loc); });
  }, function () { cb(null); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
function toLocalInput(ts) { var d = new Date(ts); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function readEditor() {
  if (!Ed) return;
  var g = function (id) { var el = document.getElementById(id); return el ? el.value : null; };
  if (g('e-name') != null) Ed.name = g('e-name');
  if (g('e-note') != null) Ed.note = g('e-note');
  var pl = g('e-place');
  if (pl != null) {
    if (!Ed.place) Ed.place = { name: '', lat: null, lng: null };
    if (pl !== Ed.place.name) { Ed.place.name = pl; Ed.place.edited = true; }
  }
  var t = g('e-time'); if (t) { var v = new Date(t).getTime(); if (!isNaN(v)) Ed.ts = v; }
}
function editorOv() {
  return {
    editor: true,
    close: function () { Ed = null; },
    html: function () {
      var e = Ed; if (!e) return '';
      var stars = '';
      for (var i = 1; i <= 5; i++) stars += '<button data-act="rate:' + i + '" aria-label="' + i + ' stars">' + ic('star', 20, i <= e.rating ? BLUE : '#C9CEDB', 2) + '</button>';
      return '<div class="screen dark"><div class="capbar"><button class="rbtn" aria-label="Close" data-act="back">' + ic('x', 20, '#fff', 2) + '</button>' +
        '<div class="t">' + (e.isNew ? 'New save' : 'Edit save') + '</div><div style="width:44px"></div></div>' +
        '<div class="stage" style="bottom:470px">' + (e.busy ? '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff;font-size:13px;font-weight:600"><div class="spinner"></div>Cutting out the sticker…</div>' :
          e.sticker ? '<img src="' + e.sticker + '" alt="">' + (e.msg ? '<div class="badge">' + ic('check', 14, '#7EE2A8', 2.4) + esc(e.msg) + '</div>' : '') :
          '<div style="color:#fff;font-size:13px">No photo yet</div>') + '</div>' +
        '<div class="form" style="height:470px">' +
        '<label class="fl">Name<input class="inp big" id="e-name" value="' + esc(e.name) + '" placeholder="What is it?" autocomplete="off"></label>' +
        '<div class="kinds">' + ['food', 'drink', 'other'].map(function (k) {
          var on = e.kind === k; return '<button class="' + (on ? 'on' : '') + '" data-act="kind:' + k + '">' + ic(KIND[k].icon, 16, on ? '#fff' : GREY, on ? 2 : 1.8) + KIND[k].label + '</button>';
        }).join('') + '</div>' +
        '<div class="rows">' +
        '<div class="rowi">' + ic('pin', 18, BLUE) + '<input id="e-place" value="' + esc(e.place ? e.place.name : '') + '" placeholder="Finding your place…" autocomplete="off"><span class="hint">' + (e.place && e.place.lat != null ? 'GPS' : '') + '</span></div>' +
        '<div class="rowi">' + ic('clock', 18, BLUE) + '<input id="e-time" type="datetime-local" value="' + toLocalInput(e.ts) + '"></div>' +
        '<div class="rowi">' + ic('star', 18, BLUE) + '<span style="flex-grow:1">Rating</span><span class="stars">' + stars + '</span></div>' +
        '<div class="rowi">' + ic('note', 18, BLUE) + '<input id="e-note" value="' + esc(e.note) + '" placeholder="Note, #tags welcome" autocomplete="off"></div>' +
        '</div>' +
        '<div class="btns"><button class="btn2" data-act="retake">' + ic('image', 18, INK) + (e.sticker ? 'Retake' : 'Photo') + '</button>' +
        '<button class="btn1" data-act="savenew"' + (e.busy || !e.sticker ? ' disabled' : '') + '>' + (e.isNew ? 'Save to our table' : 'Save changes') + '</button></div>' +
        '</div></div>';
    }
  };
}
function closeEditor() {
  while (UI.stack.length && UI.stack[UI.stack.length - 1].editor) UI.stack.pop();
  Ed = null; paintOv();
}
function editExisting(id) {
  var s = SAVES.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  Ed = { id: s.id, isNew: false, name: s.name, kind: s.kind, note: s.note, rating: s.rating || 0, ts: s.ts,
    place: s.place ? { name: s.place.name, lat: s.place.lat, lng: s.place.lng } : null, sticker: img(s.id), orig: s, busy: false, changedImg: false, msg: '' };
  pushOv(editorOv());
}
async function commitEditor() {
  readEditor();
  var e = Ed; if (!e || !e.sticker) return;
  if (!e.name.trim()) { toast('Give it a name first'); var n = document.getElementById('e-name'); if (n) n.focus(); return; }
  var s = e.isNew ? { id: e.id, who: meName() } : Object.assign({}, e.orig);
  s.name = e.name.trim(); s.kind = e.kind; s.note = (e.note || '').trim(); s.rating = e.rating; s.ts = e.ts;
  s.place = e.place && e.place.name ? { name: e.place.name.trim(), lat: e.place.lat == null ? null : e.place.lat, lng: e.place.lng == null ? null : e.place.lng } : null;
  s.deleted = false;
  var newImg = e.isNew || e.changedImg ? e.sticker : null;
  closeEditor();
  await writeSave(s, newImg);
  if (e.isNew) {
    UI.tab = 'table'; UI.selDay = dayKey(s.ts);
    UI.month = new Date(new Date(s.ts).getFullYear(), new Date(s.ts).getMonth(), 1);
    render();
    toast('Saved to our table');
  }
}

/* ---------------- Sticker maker (white outline + soft shadow) ---------------- */
function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
function makeSticker(src, cut) {
  return loadImg(src).then(function (im) {
    var MAX = 460, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, MAX / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    var PAD = 18, R = 9;
    var c = document.createElement('canvas'); c.width = w + PAD * 2; c.height = h + PAD * 2 + 6;
    var x = c.getContext('2d');
    var shape = document.createElement('canvas'); shape.width = c.width; shape.height = c.height;
    var sx = shape.getContext('2d');
    if (cut) {
      var sil = document.createElement('canvas'); sil.width = w; sil.height = h;
      var lx = sil.getContext('2d'); lx.drawImage(im, 0, 0, w, h);
      lx.globalCompositeOperation = 'source-in'; lx.fillStyle = '#fff'; lx.fillRect(0, 0, w, h);
      for (var a = 0; a < 36; a++) { var t = a / 36 * Math.PI * 2; sx.drawImage(sil, PAD + Math.cos(t) * R, PAD + Math.sin(t) * R); }
      sx.drawImage(sil, PAD, PAD);
    } else {
      sx.fillStyle = '#fff'; roundRect(sx, PAD - 8, PAD - 8, w + 16, h + 16, 24); sx.fill();
    }
    var sh = document.createElement('canvas'); sh.width = c.width; sh.height = c.height;
    var hx = sh.getContext('2d'); hx.drawImage(shape, 0, 0); hx.globalCompositeOperation = 'source-in'; hx.fillStyle = '#141E3C'; hx.fillRect(0, 0, sh.width, sh.height);
    x.save(); x.filter = 'blur(5px)'; x.globalAlpha = 0.28; x.drawImage(sh, 0, 4); x.restore();
    x.drawImage(shape, 0, 0);
    if (cut) x.drawImage(im, PAD, PAD, w, h);
    else { x.save(); roundRect(x, PAD, PAD, w, h, 16); x.clip(); x.drawImage(im, PAD, PAD, w, h); x.restore(); }
    var url = c.toDataURL('image/webp', 0.86);
    if (url.indexOf('data:image/webp') !== 0) url = c.toDataURL('image/png');
    return url;
  });
}
function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }

/* ---------------- Big map ---------------- */
function openBigMap() {
  var m = null;
  pushOv({
    html: function () { return '<div class="bigmap"><div class="mapel" id="bigmap"></div><button class="rbtn" aria-label="Back" data-act="back">' + ic('back', 20, INK, 2) + '</button></div>'; },
    after: function () { m = drawMap('bigmap', true); },
    close: function () { if (m) m.remove(); }
  });
}

/* ---------------- App update (Android) ---------------- */
var Upd = { manual: false, info: null, pct: -1, error: '', shown: false };
window.FD_onUpdate = function (json) {
  var r; try { r = JSON.parse(json); } catch (e) { r = { ok: false }; }
  var manual = Upd.manual; Upd.manual = false;
  if (!r.ok) { if (manual) toast('Could not check for updates. Are you online?'); return; }
  if (!r.available) { if (manual) toast('You have the latest version (v' + VERSION + ')'); return; }
  Upd.info = r; Upd.pct = -1; Upd.error = '';
  if (Upd.shown && !manual) return;
  Upd.shown = true;
  if (!S) return;
  pushOv({ upd: true, html: updateHtml, refresh: paintOv });
};
window.FD_onUpdateProgress = function (json) {
  var r; try { r = JSON.parse(json); } catch (e) { r = {}; }
  if (r.error) { Upd.error = r.error; Upd.pct = -1; }
  else if (r.pct != null) { Upd.pct = r.pct; Upd.error = ''; }
  else if (r.installing) { Upd.pct = 100; }
  var top = UI.stack[UI.stack.length - 1];
  if (top && top.upd) paintOv();
};
function updateHtml() {
  var i = Upd.info || {}, busy = Upd.pct >= 0;
  return '<div class="sheetbg" data-act="back"><div class="sheet" data-stop="1"><div class="grab"></div>' +
    '<div style="display:flex;align-items:center;gap:12px">' + LOGO + '<div><h3 style="margin:0">Update available</h3><div style="font-size:13px;color:#5B6275">FoodDiary v' + esc(i.versionName) + ' · you have v' + esc(VERSION) + '</div></div></div>' +
    (i.notes ? '<div style="font-size:14px;line-height:20px;white-space:pre-wrap;padding:4px 0">' + esc(i.notes) + '</div>' : '') +
    (busy ? '<div class="bar" style="margin:6px 0"><div style="width:' + Upd.pct + '%;background:#1E3FAE"></div></div><div style="font-size:12px;color:#5B6275">' + (Upd.pct >= 100 ? 'Opening the installer…' : 'Downloading… ' + Upd.pct + '%') + '</div>' : '') +
    (Upd.error ? '<div style="font-size:13px;color:#B42318">' + esc(Upd.error) + '</div>' : '') +
    '<div class="btns"><button class="btn2" data-act="back">Later</button><button class="btn1" data-act="doupdate"' + (busy && Upd.pct < 100 ? ' disabled' : '') + '>' + (Upd.error ? 'Try again' : 'Update now') + '</button></div></div></div>';
}

/* ---------------- Events ---------------- */
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'back' && ev.target.closest('[data-stop]') && !ev.target.closest('button')) return;
  var a = el.dataset.act, i = a.indexOf(':'), cmd = i < 0 ? a : a.slice(0, i), arg = i < 0 ? '' : a.slice(i + 1);
  switch (cmd) {
    case 'tab': UI.tab = arg; render(); break;
    case 'view': UI.view = arg; localStorage.setItem('fd.view', arg); render(); break;
    case 'filter': UI.filter = arg; render(true); break;
    case 'day': UI.selDay = arg; render(true); break;
    case 'month': shiftMonth(+arg); break;
    case 'psort':
      UI.psort = arg;
      if (arg === 'nearby' && !UI.here) { toast('Finding where you are…'); locate(function (l) { if (l) { UI.here = l; render(true); } else toast('Location is off'); }); }
      render(true); break;
    case 'period': UI.period = arg; render(true); break;
    case 'open': openDetail(arg); break;
    case 'place': openPlace(decodeURIComponent(arg)); break;
    case 'coll': (function (k) { var g = groupsByName(SAVES).filter(function (x) { return x.key === k; })[0]; listScreen(g ? g.name : 'Collection', function () { var q = groupsByName(SAVES).filter(function (x) { return x.key === k; })[0]; return q ? q.saves : []; }); })(decodeURIComponent(arg)); break;
    case 'tag': (function (t) { listScreen(t, function () { var q = tagsOf(SAVES).filter(function (x) { return x.tag === t; })[0]; return q ? q.saves : []; }); })(decodeURIComponent(arg)); break;
    case 'bigmap': openBigMap(); break;
    case 'search': openSearch(); break;
    case 'settings': openSettings(); break;
    case 'back': if (UI.stack.length) popOv(); break;
    case 'capture': chooseSource(); break;
    case 'src': startCapture(arg, false); break;
    case 'retake':
      readEditor();
      if (Ed) Ed.changedImg = true;
      pushOv({ html: function () {
        return '<div class="sheetbg" data-act="back"><div class="sheet" data-stop="1"><div class="grab"></div><h3>New photo</h3>' +
          '<button class="optbtn" data-act="resrc:camera">' + ic('camera', 22, BLUE) + 'Take a photo</button>' +
          '<button class="optbtn" data-act="resrc:gallery">' + ic('image', 22, BLUE) + 'Choose from gallery</button>' +
          '<button class="btn2" style="flex:none;margin-top:4px" data-act="back">Cancel</button></div></div>'; } });
      break;
    case 'resrc': UI.stack.pop(); Ed.busy = true; paintOv(); if (NATIVE && NATIVE.capture) NATIVE.capture(arg); else webPick(arg); break;
    case 'kind': readEditor(); Ed.kind = arg; paintOv(); break;
    case 'rate': readEditor(); Ed.rating = Ed.rating === +arg ? 0 : +arg; paintOv(); break;
    case 'savenew': commitEditor(); break;
    case 'edit': editExisting(arg); break;
    case 'del':
      if (!delArm) { delArm = true; paintOv(); setTimeout(function () { delArm = false; }, 3000); }
      else { delArm = false; UI.stack.pop(); paintOv(); deleteSave(arg); toast('Deleted'); }
      break;
    case 'savesettings':
      S.me = document.getElementById('s-me').value.trim() || S.me;
      S.partner = document.getElementById('s-pa').value.trim();
      var oldCode = S.code; S.code = document.getElementById('s-code').value.trim();
      saveSettings(); popOv(); render();
      if (oldCode !== S.code) { markAllPending().then(startSync); } else startSync();
      toast('Saved'); break;
    case 'checkupdate': Upd.manual = true; toast('Checking…'); NATIVE.checkUpdate(); break;
    case 'doupdate': Upd.error = ''; Upd.pct = 0; paintOv(); NATIVE.installUpdate(); break;
    case 'syncnow': startSync(); toast(syncEnabled() ? 'Syncing…' : 'Add a diary code to sync'); break;
    case 'start':
      var me = document.getElementById('u-me').value.trim();
      if (!me) { toast('Type your name first'); return; }
      S = { me: me, partner: document.getElementById('u-pa').value.trim(), code: document.getElementById('u-code').value.trim() };
      saveSettings(); render(); startSync(); break;
  }
});
async function markAllPending() {
  var all = await idbAll('saves');
  for (var i = 0; i < all.length; i++) { all[i].pending = true; all[i].pendingImg = true; await idbPut('saves', all[i]); }
}

/* ---------------- Start ---------------- */
openDB().then(loadAll).then(function () {
  render(); startSync();
  if (NATIVE && NATIVE.checkUpdate) setTimeout(function () { NATIVE.checkUpdate(); }, 1500);
}).catch(function (e) {
  $app.innerHTML = '<div class="setup"><div class="hello">Something went wrong<b>.</b></div><div class="s">' + esc(e && e.message || e) + '</div></div>';
});
document.addEventListener('visibilitychange', function () { if (!document.hidden && syncEnabled() && Sync.state !== 'online') startSync(); });
})();
