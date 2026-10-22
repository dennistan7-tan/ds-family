/* DS Family v0.1.0 - shared calendar, groceries, money and to-do for two. Plain JS, no build step. */
(function () {
  'use strict';
  var U = window.DS;
  var VERSION = '0.2.2';

  /* ---------- tiny helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
  };
  function svg(inner) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  var IC = {
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    cart: svg('<path d="M3 4h2l2.5 11h10L20 8H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>'),
    wallet: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1"/>'),
    list: svg('<path d="M4 6l2 2 3-3M4 14l2 2 3-3M12 7h8M12 15h8"/>'),
    palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="10" cy="7.5" r=".8"/><circle cx="14.5" cy="7.5" r=".8"/>'),
    sliders: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>'),
    left: svg('<path d="M15 6l-6 6 6 6"/>'),
    right: svg('<path d="M9 6l6 6-6 6"/>'),
    caret: svg('<path d="M6 9l6 6 6-6"/>'),
    eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeoff: svg('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.8 8.3 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>')
  };

  /* ---------- state ---------- */
  var THEMES = [
    { id: 'burgundy', name: 'Burgundy', primary: '#6B1F2E', bg: '#F7F1E3', ink: '#F7F1E3' },
    { id: 'navy', name: 'Navy', primary: '#14284B', bg: '#F3F1EA', ink: '#F3F1EA' },
    { id: 'green', name: 'Green', primary: '#1F4D3A', bg: '#F4F2E6', ink: '#F4F2E6' }
  ];
  var profile = LS.get('ds.profile', null);              // { name, partner, code }
  var prefs = Object.assign({ theme: 'burgundy', tab: 'calendar' }, LS.get('ds.prefs', {}));
  var items = LS.get('ds.items', {});                    // id -> record, shared through the cloud
  var fired = LS.get('ds.fired', {});
  var today = function () { return U.ymd(new Date()); };
  var ui = {
    weekStart: U.mondayOf(new Date()), selDay: null, calMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1), month: U.ym(new Date()), todoFilter: 'all',
    draft: { kind: 'spend', desc: '', amount: '', cat: '', catManual: false },
    g: { name: '', qty: '' }, reveal: false
  };
  var sync = { mode: 'local', ready: false, error: false, col: null };

  function saveLocal() { LS.set('ds.items', items); }
  function savePrefs() { LS.set('ds.prefs', prefs); }
  function list(type) {
    return Object.keys(items).map(function (k) { return items[k]; })
      .filter(function (x) { return x.type === type && !x.del; });
  }
  function put(obj, silent) {
    obj.u = Date.now();
    items[obj.id] = obj;
    saveLocal();
    if (sync.col) { try { sync.col.doc(obj.id).set(obj).catch(function () { }); } catch (e) { } }
    if (!silent) renderMain();
    return obj;
  }
  function remove(id) {
    var o = items[id];
    if (!o) return;
    put(Object.assign({}, o, { del: true }));
  }
  function meta() { return items.meta || { id: 'meta', type: 'meta', openBal: 0 }; }
  function myName() { return (profile && profile.name) || 'Me'; }
  function initials(n) { n = String(n || '?').trim(); return n.charAt(0).toUpperCase() + n.slice(1, 2).toLowerCase(); }

  /* ---------- theme ---------- */
  function applyTheme() {
    var t = THEMES.filter(function (x) { return x.id === prefs.theme; })[0] || THEMES[0];
    document.documentElement.setAttribute('data-theme', t.id);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t.primary);
  }

  /* ---------- cloud sync (Firebase Firestore, optional) ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function initSync() {
    var cfg = window.DS_CONFIG && window.DS_CONFIG.firebase;
    if (!cfg || !cfg.apiKey || !profile || sync.col) { updateStatus(); return; }
    sync.mode = 'cloud';
    var base = 'https://www.gstatic.com/firebasejs/10.14.1/';
    loadScript(base + 'firebase-app-compat.js').then(function () {
      return loadScript(base + 'firebase-firestore-compat.js');
    }).then(function () {
      if (!window.firebase.apps.length) window.firebase.initializeApp(cfg);
      var db = window.firebase.firestore();
      try { db.enablePersistence({ synchronizeTabs: true }).catch(function () { }); } catch (e) { }
      var col = db.collection('families').doc(profile.code).collection('items');
      col.onSnapshot(function (snap) {
        var changed = false, remote = {};
        snap.forEach(function (d) { remote[d.id] = d.data(); });
        Object.keys(remote).forEach(function (id) {
          var r = remote[id], l = items[id];
          if (!l || (r.u || 0) > (l.u || 0)) { items[id] = r; changed = true; }
        });
        if (!sync.ready) {                                   // first load: send anything newer we hold locally
          sync.col = col; sync.ready = true;
          Object.keys(items).forEach(function (id) {
            if (!remote[id] || (remote[id].u || 0) < (items[id].u || 0)) {
              try { col.doc(id).set(items[id]).catch(function () { }); } catch (e) { }
            }
          });
        }
        sync.error = false;
        if (changed) { saveLocal(); renderMain(); }
        updateStatus();
      }, function () { sync.error = true; updateStatus(); });
    }).catch(function () { sync.error = true; updateStatus(); });
    updateStatus();
  }
  function updateStatus() {
    var el = $('#status');
    if (!el) return;
    var label, on;
    if (sync.mode === 'local') { label = 'LOCAL'; on = false; }
    else if (sync.ready && navigator.onLine && !sync.error) { label = 'ONLINE'; on = true; }
    else { label = 'OFFLINE'; on = false; }
    el.className = 'status' + (on ? '' : ' off');
    el.innerHTML = '<i></i><span>' + label + '</span>';
  }
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);

  /* ---------- views ---------- */
  function viewCalendar() {
    var nowMs = Date.now();
    var evs = list('event').map(function (e) { return { e: e, s: U.localDate(e.date, e.time) }; })
      .filter(function (x) { return x.s; }).sort(function (a, b) { return a.s - b.s; });
    var next = evs.filter(function (x) { return x.s.getTime() >= nowMs; })[0];
    var hero;
    if (next) {
      hero = '<section class="hero"><div class="col"><span class="lab">NEXT EVENT</span><span class="big" style="font-size:24px">' + esc(next.e.title) +
        '</span><span class="soft">' + U.dayLabel(next.e.date) + (next.e.time ? ' · ' + esc(next.e.time) : '') + ' · for ' + esc(next.e.owner || 'Both') + '</span></div>' +
        '<div class="col r"><span class="big" style="font-size:44px">' + U.countdown(next.s.getTime() - nowMs) + '</span><span class="soft" style="font-size:12px">until the event</span></div></section>';
    } else {
      hero = '<section class="hero"><div class="col"><span class="lab">NEXT EVENT</span><span class="big" style="font-size:24px">Nothing planned</span>' +
        '<span class="soft">Add your first event</span></div><div class="col r"><span class="big" style="font-size:44px">—</span></div></section>';
    }
    var ws = ui.weekStart, td = today(), days = '';
    for (var i = 0; i < 7; i++) {
      var d = U.addDays(ws, i), ds = U.ymd(d);
      var has = evs.some(function (x) { return x.e.date === ds; });
      days += '<button class="day' + (ds === td ? ' today' : '') + (has ? ' has' : '') + (ui.selDay === ds ? ' sel' : '') +
        '" data-act="day-sel" data-v="' + ds + '" aria-label="' + U.dayLabel(ds) + '"><span class="d">' + 'MTWTFSS'.charAt(i) + '</span><span class="n">' + d.getDate() +
        '</span><span class="dot' + (has ? '' : ' none') + '"></span></button>';
    }
    var we = U.addDays(ws, 6);
    var wlabel = ws.getDate() + (ws.getMonth() !== we.getMonth() ? ' ' + U.MON[ws.getMonth()] : '') + ' – ' + we.getDate() + ' ' + U.MON[we.getMonth()] + ' ' + we.getFullYear();
    var shown, heading;
    if (ui.selDay) {
      shown = evs.filter(function (x) { return x.e.date === ui.selDay; });
      heading = U.dayLabel(ui.selDay);
    } else {
      var start = new Date(); start.setHours(0, 0, 0, 0);
      shown = evs.filter(function (x) { return x.s >= start; }).slice(0, 30);
      heading = 'Upcoming';
    }
    var thisYear = new Date().getFullYear();
    var cards = shown.map(function (x) {
      var e = x.e, d = x.s;
      return '<button class="row ev" data-act="ev-edit" data-id="' + e.id + '"><div class="date"><b>' + d.getDate() + '</b><span>' + U.DOW[d.getDay()].toUpperCase() +
        '</span><span class="mo">' + U.MON[d.getMonth()] + (d.getFullYear() !== thisYear ? ' ' + d.getFullYear() : '') + '</span></div><div class="grow"><span class="t">' + esc(e.title) + (e.time ? ' · ' + esc(e.time) : '') + ' <span class="chip tag">' + esc(e.owner || 'Both') + '</span></span>' +
        (e.detail ? '<span class="sub">' + esc(e.detail) + '</span>' : '') +
        (e.remark ? '<span class="rem">Remark: ' + esc(e.remark) + '</span>' : '') + '</div></button>';
    }).join('') || '<div class="empty card">' + (ui.selDay ? 'Nothing on this day.' : 'No upcoming events yet.') + '</div>';
    var more = (!ui.selDay && evs.filter(function (x) { return x.s >= new Date(new Date().setHours(0, 0, 0, 0)); }).length > 30) ? '<p class="note-s">Showing the next 30 events. Pick a date to see others.</p>' : '';
    // month grid (wide screens) and jump-to-date (phones) so any date up to 2030 and beyond is one tap away
    var cm = ui.calMonth, first = new Date(cm.getFullYear(), cm.getMonth(), 1), gridStart = U.addDays(first, -((first.getDay() + 6) % 7));
    var mcells = '';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (n) { mcells += '<span class="mdow">' + n + '</span>'; });
    for (var k = 0; k < 42; k++) {
      var md = U.addDays(gridStart, k), mds = U.ymd(md);
      var dayEvs = evs.filter(function (x) { return x.e.date === mds; });
      mcells += '<button class="mday' + (md.getMonth() !== cm.getMonth() ? ' out' : '') + (mds === td ? ' today' : '') + (ui.selDay === mds ? ' sel' : '') +
        '" data-act="day-sel" data-v="' + mds + '" aria-label="' + U.dayLabel(mds) + (dayEvs.length ? ', ' + dayEvs.length + ' events' : '') + '"><span class="n">' + md.getDate() + '</span>' +
        dayEvs.slice(0, 2).map(function (x) { return '<span class="mev">' + esc(x.e.title) + '</span>'; }).join('') +
        (dayEvs.length > 2 ? '<span class="mev more">+' + (dayEvs.length - 2) + ' more</span>' : '') + '</button>';
    }
    var yFrom = Math.min(thisYear - 1, cm.getFullYear()), yTo = Math.max(2035, cm.getFullYear()), ysel = '';
    for (var y = yFrom; y <= yTo; y++) ysel += '<option value="' + y + '"' + (y === cm.getFullYear() ? ' selected' : '') + '>' + y + '</option>';
    var msel = U.MONFULL.map(function (n, i) { return '<option value="' + i + '"' + (i === cm.getMonth() ? ' selected' : '') + '>' + n + '</option>'; }).join('');
    var monthCard = '<section class="month card" aria-label="Month"><div class="month-head"><button class="icon-btn sm" data-act="cal-prev" aria-label="Previous month">' + IC.left + '</button>' +
      '<select class="in sm" data-chg="cal-month" aria-label="Month">' + msel + '</select><select class="in sm" data-chg="cal-year" aria-label="Year">' + ysel + '</select>' +
      '<button class="icon-btn sm" data-act="cal-next" aria-label="Next month">' + IC.right + '</button><button class="btn ghost sm" data-act="cal-today">Today</button></div>' +
      '<div class="mgrid">' + mcells + '</div></section>';
    var jump = '<label class="jump"><span>Go to date</span><input class="in sm" type="date" data-chg="jump" value="' + (ui.selDay || td) + '"></label>';
    return '<div class="title-row"><h1>Calendar</h1><button class="btn" data-act="ev-add">+ Add event</button></div><div class="cal-grid">' + hero +
      '<div class="picker"><div class="week-wrap"><div class="week-head"><button class="icon-btn sm" data-act="week-prev" aria-label="Previous week">' + IC.left + '</button><span class="lbl">' + wlabel +
      '</span><button class="icon-btn sm" data-act="week-next" aria-label="Next week">' + IC.right + '</button></div><section class="week" aria-label="Week">' + days + '</section>' + jump + '</div>' + monthCard + '</div>' +
      '<div class="cal-list"><h2 class="sec">' + heading + '</h2><section class="stack">' + cards + '</section>' + more + '</div></div>';
  }

  function groceryNames() {
    var names = list('grocery').map(function (g) { return g.name; });
    Object.keys(items).forEach(function (k) { if (items[k].type === 'grocery') names.push(items[k].name); });
    return names.concat(U.GROCERY_SEED);
  }
  function sugHtml(label, arr, act) {
    if (!arr.length) return '';
    return label + arr.map(function (t) { return '<button class="chip" data-act="' + act + '" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
  }
  function groceryTotal() {
    return list('grocery').filter(function (g) { return !g.archived; })
      .reduce(function (s, g) { return s + (g.price || 0); }, 0);
  }
  function viewGroceries() {
    var act = list('grocery').filter(function (g) { return !g.archived; });
    act.sort(function (a, b) { return (a.checked ? 1 : 0) - (b.checked ? 1 : 0) || a.u - b.u; });
    var rows = act.map(function (g) {
      return '<div class="row"><input type="checkbox" data-act="g-toggle" data-id="' + g.id + '"' + (g.checked ? ' checked' : '') + ' aria-label="' + esc(g.name) + ' bought">' +
        '<button class="grow" style="background:none;border:0;padding:0;text-align:left" data-act="g-edit" data-id="' + g.id + '"><span class="t' + (g.checked ? ' done' : '') + '">' + esc(g.name) +
        '</span>' + (g.qty ? '<span class="s">' + esc(g.qty) + '</span>' : '') + '</button>' +
        '<input class="in price" inputmode="numeric" data-in="g-price" data-id="' + g.id + '" aria-label="Final price for ' + esc(g.name) + '" placeholder="Rp 0" value="' + (g.price ? 'Rp ' + U.group(g.price) : '') + '"></div>';
    }).join('') || '<div class="empty card">Your list is empty. Type an item above.</div>';
    return '<div class="title-row"><h1>Groceries</h1></div>' +
      '<section class="field"><label for="g-name">Type an item</label><div class="addbar"><input id="g-name" class="in hl" data-in="g-name" autocomplete="off" autocapitalize="sentences" value="' + esc(ui.g.name) + '" placeholder="e.g. tomatoes">' +
      '<input id="g-qty" class="in qty" data-in="g-qty" autocomplete="off" aria-label="Quantity" placeholder="Qty" value="' + esc(ui.g.qty) + '"><button class="btn" data-act="g-add">Add</button></div>' +
      '<div class="chips" id="g-sug"></div></section>' +
      '<h2 class="sec">Shopping list</h2><section class="stack" id="g-list">' + rows + '</section>' +
      '<section class="hero" style="margin-top:auto"><div class="col"><span class="lab">FINAL TOTAL</span><span class="big" style="font-size:34px" id="g-total">' + U.money(groceryTotal()) +
      '</span></div><button class="btn light" id="g-save" data-act="g-save"' + (groceryTotal() > 0 ? '' : ' disabled') + '>Save to spending</button></section>';
  }

  function entryStats(ym) {
    var inc = 0, exp = 0, all = 0;
    list('entry').forEach(function (e) {
      var v = e.kind === 'income' ? e.amount : -e.amount;
      all += v;
      if ((e.date || '').slice(0, 7) === ym) { if (e.kind === 'income') inc += e.amount; else exp += e.amount; }
    });
    return { inc: inc, exp: exp, balance: all + (meta().openBal || 0) };
  }
  function monthLabel(ym) { var p = ym.split('-'); return U.MONFULL[+p[1] - 1] + ' ' + p[0]; }
  function catOptions(kind, sel, withBlank) {
    var cats = kind === 'income' ? U.INCOME_CATS : U.SPEND_CATS;
    return (withBlank ? '<option value=""' + (sel ? '' : ' selected') + '>Category</option>' : '') +
      cats.map(function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; }).join('');
  }
  function mm(n, signed) { return ui.reveal ? U.money(n, signed) : 'Rp \u2022\u2022\u2022\u2022\u2022\u2022'; }
  function viewMoney() {
    var st = entryStats(ui.month), d = ui.draft;
    var mon = U.MON[+ui.month.split('-')[1] - 1].toUpperCase();
    var rows = list('entry').filter(function (e) { return (e.date || '').slice(0, 7) === ui.month; })
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || b.u - a.u; }).slice(0, 60)
      .map(function (e) {
        var inc = e.kind === 'income';
        return '<button class="row" data-act="m-edit" data-id="' + e.id + '"><span class="who">' + esc(initials(e.by)) + '</span><span class="grow"><span class="t">' + esc(e.desc) +
          '</span><span class="s">' + esc(e.cat || 'Other') + ' · ' + U.dayLabel(e.date) + '</span></span><span class="amt ' + (inc ? 'inc' : 'exp') + '">' + mm(inc ? e.amount : -e.amount, true) + '</span></button>';
      }).join('') || '<div class="empty card">No entries this month.</div>';
    return '<div class="title-row"><h1>Money</h1><button class="btn ghost icon" data-act="m-reveal" aria-pressed="' + ui.reveal + '" aria-label="' + (ui.reveal ? 'Hide amounts' : 'Show amounts') + '">' + (ui.reveal ? IC.eyeoff + 'Hide' : IC.eye + 'Show') + '</button></div>' +
      '<section class="hero"><div class="col"><span class="lab">SHARED BALANCE</span><span class="big" style="font-size:42px">' + mm(st.balance) + '</span></div></section>' +
      '<div class="week-head"><button class="icon-btn sm" data-act="m-prev" aria-label="Previous month">' + IC.left + '</button><span class="lbl">' + monthLabel(ui.month) +
      '</span><button class="icon-btn sm" data-act="m-next" aria-label="Next month">' + IC.right + '</button></div>' +
      '<section class="grid2"><div class="card mini"><span class="lab">INCOME · ' + mon + '</span><span class="val inc">' + mm(st.inc) + '</span></div>' +
      '<div class="card mini"><span class="lab">SPENDING · ' + mon + '</span><span class="val exp">' + mm(st.exp) + '</span></div></section>' +
      '<section class="card pad stack"><div class="seg"><button data-act="m-kind" data-v="spend" class="' + (d.kind === 'spend' ? 'on' : '') + '">Spending</button>' +
      '<button data-act="m-kind" data-v="income" class="' + (d.kind === 'income' ? 'on' : '') + '">Income</button></div>' +
      '<input id="m-desc" class="in hl" data-in="m-desc" autocomplete="off" aria-label="What was it for" placeholder="What was it for? e.g. groceries" value="' + esc(d.desc) + '">' +
      '<div class="chips" id="m-sug"></div>' +
      '<div class="grid2"><input id="m-amt" class="in" data-in="m-amt" inputmode="numeric" aria-label="Amount" placeholder="Rp 0" value="' + (d.amount ? 'Rp ' + d.amount : '') + '">' +
      '<select id="m-cat" class="in" data-in="m-cat" aria-label="Category">' + catOptions(d.kind, d.cat, true) + '</select></div>' +
      '<button class="btn" data-act="m-add">Save</button></section>' +
      '<h2 class="sec">Entries</h2><section class="stack">' + rows + '</section>';
  }

  function viewTodo() {
    var all = list('todo'), td = today(), f = ui.todoFilter, me = myName(), pr = profile.partner || 'Partner';
    var open = all.filter(function (t) { return !t.done; });
    var dueToday = open.filter(function (t) { return t.due && t.due <= td; }).length;
    var weekAgo = Date.now() - 7 * 86400000;
    var doneWeek = all.filter(function (t) { return t.done && (t.doneAt || 0) > weekAgo; }).length;
    var shown = all.filter(function (t) {
      if (f === 'done') return t.done;
      if (f === 'me') return t.owner === me || t.owner === 'Both';
      if (f === 'partner') return t.owner === pr || t.owner === 'Both';
      return true;
    });
    if (f === 'me' || f === 'partner') shown = shown.filter(function (t) { return !t.done; });
    shown.sort(function (a, b) {
      return (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.due || '9999').localeCompare(b.due || '9999') || a.u - b.u;
    });
    var cards = shown.map(function (t) {
      var over = t.due && t.due < td, isToday = t.due === td;
      var dueTxt = t.due ? (over ? 'Overdue · ' + U.dayLabel(t.due) : (isToday ? 'Due today' : 'Due ' + U.dayLabel(t.due))) : 'No due date';
      var rem = t.remindAt ? U.localDateTime(t.remindAt) : null;
      return '<div class="row" style="min-height:78px;' + ((over || isToday) && !t.done ? 'border-color:var(--gold)' : '') + (t.done ? ';background:var(--chip)' : '') + '">' +
        '<input type="checkbox" data-act="t-toggle" data-id="' + t.id + '"' + (t.done ? ' checked' : '') + ' aria-label="' + esc(t.title) + ' done">' +
        '<button class="grow" style="background:none;border:0;padding:0;text-align:left;gap:6px;display:flex;flex-direction:column" data-act="t-edit" data-id="' + t.id + '">' +
        '<span class="t' + (t.done ? ' done' : '') + '">' + esc(t.title) + '</span>' +
        '<span class="s" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px"><span class="chip tag">' + esc(t.owner || 'Both') + '</span><span>' + dueTxt + '</span>' +
        (rem && !t.done ? '<span style="color:var(--gold-text);font-weight:700">Remind ' + U.DOW[rem.getDay()] + ' ' + ('0' + rem.getHours()).slice(-2) + ':' + ('0' + rem.getMinutes()).slice(-2) + '</span>' : '') +
        (t.follow && !t.done ? '<span style="color:var(--gold-text);font-weight:700">Follow up</span>' : '') + '</span></button></div>';
    }).join('') || '<div class="empty card">' + (f === 'done' ? 'Nothing done yet.' : 'No tasks here.') + '</div>';
    function fb(id, label) { return '<button data-act="t-filter" data-v="' + id + '" class="' + (f === id ? 'on' : '') + '">' + esc(label) + '</button>'; }
    return '<div class="title-row"><h1>To-do</h1><button class="btn" data-act="t-add">+ Add task</button></div>' +
      '<section class="hero"><div class="col"><span class="lab">OPEN TASKS</span><span class="big" style="font-size:40px">' + open.length + ' open</span></div>' +
      '<div class="col r"><span class="big" style="font-size:24px">' + dueToday + ' due today</span><span class="soft" style="font-size:12px">' + doneWeek + ' done this week</span></div></section>' +
      '<section class="seg s4" aria-label="Filter">' + fb('all', 'All') + fb('me', 'Me') + fb('partner', pr.length > 8 ? pr.slice(0, 7) + '…' : pr) + fb('done', 'Done') + '</section>' +
      '<section class="stack">' + cards + '</section>';
  }

  /* ---------- shell and navigation ---------- */
  var TABS = [['calendar', 'Calendar', IC.cal], ['groceries', 'Groceries', IC.cart], ['money', 'Money', IC.wallet], ['todo', 'To-do', IC.list]];
  function shellHtml() {
    return '<div class="shell"><header class="top"><button class="brand" id="brandBtn" data-act="menu" aria-haspopup="true" aria-expanded="false" aria-label="DS Family menu">' +
      '<span class="logo">DS</span><span class="brand-name">DS Family</span><span class="caret">' + IC.caret + '</span></button>' +
      '<nav class="topnav" aria-label="Main">' + TABS.map(function (t) {
        return '<button data-act="tab" data-v="' + t[0] + '" class="' + (prefs.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') + '</nav>' +
      '<div class="topright"><div class="tdots" role="group" aria-label="Theme">' + THEMES.map(function (t) {
        return '<button class="tdot' + (prefs.theme === t.id ? ' on' : '') + '" data-act="theme-set" data-v="' + t.id + '" title="' + t.name + '" aria-label="' + t.name + ' theme" aria-pressed="' + (prefs.theme === t.id) + '" style="background:' + t.primary + '"></button>';
      }).join('') + '</div><button class="tbtn" data-act="open-settings" title="Settings" aria-label="Settings">' + IC.sliders + '<span>Settings</span></button>' +
      '<button class="tbtn" data-act="open-about" title="About" aria-label="About">' + IC.info + '<span>About</span></button><div class="status" id="status"></div></div></header>' +
      '<div class="scrim" id="scrim" data-act="menu-close"></div>' +
      '<div class="menu" id="menu" role="menu"><button role="menuitem" data-act="open-theme">' + IC.palette + 'Theme</button>' +
      '<button role="menuitem" data-act="open-settings">' + IC.sliders + 'Settings</button><button role="menuitem" data-act="open-about">' + IC.info + 'About</button></div>' +
      '<div class="toast" id="toast" role="status"></div><main id="main"></main>' +
      '<nav class="tabs" aria-label="Main">' + TABS.map(function (t) {
        return '<button data-act="tab" data-v="' + t[0] + '" class="' + (prefs.tab === t[0] ? 'on' : '') + '">' + t[2] + t[1] + '</button>';
      }).join('') + '</nav><div id="sheet"></div></div>';
  }
  function renderMain() {
    var m = $('#main');
    if (!m || !profile) return;
    var scroll = m.scrollTop;
    m.innerHTML = prefs.tab === 'groceries' ? viewGroceries() : prefs.tab === 'money' ? viewMoney() : prefs.tab === 'todo' ? viewTodo() : viewCalendar();
    m.scrollTop = scroll;
    m.className = 'tab-' + prefs.tab;
    Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button, nav.topnav button'), function (b) {
      b.className = b.getAttribute('data-v') === prefs.tab ? 'on' : '';
    });
    if (prefs.tab === 'groceries') updateGrocerySug();
    if (prefs.tab === 'money') updateMoneySug(false);
  }
  function render() {
    applyTheme();
    var app = $('#app');
    if (!profile) { app.innerHTML = welcomeHtml(); return; }
    app.innerHTML = shellHtml();
    updateStatus();
    renderMain();
  }
  function setMenu(open) {
    var b = $('#brandBtn'), mn = $('#menu'), sc = $('#scrim');
    if (!b) return;
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    mn.className = 'menu' + (open ? ' open' : '');
    sc.className = 'scrim' + (open ? ' open' : '');
  }

  /* ---------- sheets ---------- */
  function openSheet(html) {
    var s = $('#sheet');
    s.innerHTML = '<div class="overlay" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">' + html + '</div></div>';
  }
  function closeSheet() { var s = $('#sheet'); if (s) s.innerHTML = ''; }
  function markThemeDots() {
    Array.prototype.forEach.call(document.querySelectorAll('.tdot'), function (b) {
      var on = b.getAttribute('data-v') === prefs.theme;
      b.className = 'tdot' + (on ? ' on' : ''); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function sheetOpen() { var s = $('#sheet'); return !!(s && s.innerHTML); }
  function fld(id, label, input) { return '<div class="field"><label for="' + id + '">' + label + '</label>' + input + '</div>'; }
  function inp(id, type, val, extra) { return '<input id="' + id + '" class="in" type="' + type + '" value="' + esc(val || '') + '" ' + (extra || '') + '>'; }
  function opts(arr, sel) { return arr.map(function (a) { return '<option value="' + esc(a[0]) + '"' + (String(a[0]) === String(sel) ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join(''); }

  function openThemeSheet() {
    openSheet('<h2>Theme</h2><p class="note">Pick the look you want today. It is saved on this phone only.</p><div class="themes">' +
      THEMES.map(function (t) {
        return '<button class="theme' + (prefs.theme === t.id ? ' on' : '') + '" data-act="theme-set" data-v="' + t.id + '" aria-pressed="' + (prefs.theme === t.id) + '">' +
          '<span class="sw" style="background:' + t.primary + ';color:' + t.ink + '">DS</span>' + t.name + '</button>';
      }).join('') + '</div><div class="actions"><button class="btn ghost" data-act="sheet-close" style="grid-column:1/-1">Close</button></div>');
  }
  function openAboutSheet() {
    var s = sync.mode === 'local' ? 'Local only' : (sync.ready && navigator.onLine && !sync.error ? 'Online' : 'Offline');
    openSheet('<h2>About</h2><div><div class="kv"><span>App</span><span>DS Family</span></div><div class="kv"><span>Version</span><span>v' + VERSION + '</span></div>' +
      '<div class="kv"><span>Sync</span><span>' + s + '</span></div></div>' +
      '<p class="note" id="upd-msg">Tap the button to check for a newer version.</p>' +
      '<div class="actions"><button class="btn" id="upd-btn" data-act="update-check" style="grid-column:1/-1">Check for update</button></div>' +
      '<p class="note">Install it like an app: on iPhone open this page in Safari, tap Share, then Add to Home Screen. On Android open it in Chrome, tap the menu, then Install app.</p>' +
      '<div class="actions"><button class="btn ghost" data-act="sheet-close" style="grid-column:1/-1">Close</button></div>');
  }
  function newer(a, b) {                       // is version a newer than b
    var x = String(a).split('.'), y = String(b).split('.');
    for (var i = 0; i < 3; i++) { var d = (+x[i] || 0) - (+y[i] || 0); if (d) return d > 0; }
    return false;
  }
  function applyUpdate() {                      // drop cached copies and reload to get the new files
    var done = function () { location.reload(); };
    var clear = (window.caches && caches.keys) ? caches.keys().then(function (k) { return Promise.all(k.map(function (n) { return caches.delete(n); })); }) : Promise.resolve();
    var unreg = (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) ? navigator.serviceWorker.getRegistrations().then(function (r) { return Promise.all(r.map(function (x) { return x.unregister(); })); }) : Promise.resolve();
    Promise.all([clear, unreg]).then(done, done);   // your data stays: it lives in storage, not in the cache
  }
  function updateCheck(btn) {
    var msg = $('#upd-msg');
    if (btn.getAttribute('data-ready')) { msg.textContent = 'Updating...'; applyUpdate(); return; }
    msg.textContent = 'Checking...';
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (newer(j.version, VERSION)) {
        msg.textContent = 'Version v' + j.version + ' is available' + (j.notes ? ': ' + j.notes : '') + '.';
        btn.textContent = 'Update now'; btn.setAttribute('data-ready', '1');
      } else { msg.textContent = 'You have the latest version (v' + VERSION + ').'; }
    }).catch(function () { msg.textContent = 'Could not check. Connect to the internet and try again.'; });
  }
  function notifState() {
    if (typeof Notification === 'undefined') return 'Not supported on this browser';
    return Notification.permission === 'granted' ? 'Allowed' : Notification.permission === 'denied' ? 'Blocked in browser settings' : 'Not allowed yet';
  }
  function openSettingsSheet() {
    openSheet('<h2>Settings</h2>' + fld('s-name', 'Your name', inp('s-name', 'text', profile.name, 'autocomplete="off"')) +
      fld('s-partner', 'Partner name', inp('s-partner', 'text', profile.partner, 'autocomplete="off"')) +
      fld('s-open', 'Opening balance (shared)', inp('s-open', 'text', meta().openBal ? 'Rp ' + U.group(meta().openBal) : '', 'inputmode="numeric" data-in="f-amt" placeholder="Rp 0"')) +
      fld('s-code', 'Login code', '<div class="codebox"><input id="s-code" class="in" type="password" readonly value="' + esc(profile.code) + '"><button class="btn ghost" data-act="copy-code">Copy</button></div>') +
      '<div class="kv"><span>Reminders</span><span>' + notifState() + '</span></div>' +
      '<div class="actions"><button class="btn ghost" data-act="enable-notif">Allow notifications</button><button class="btn danger" data-act="leave">Leave family</button></div>' +
      '<div class="actions"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" data-act="settings-save">Save</button></div>');
  }

  // new events start on the day you picked, else on the month or week you are looking at, else today
  function newEventDate() {
    if (ui.selDay) return ui.selDay;
    var now = new Date();
    if (window.matchMedia && window.matchMedia('(min-width:900px)').matches) {
      var cm = ui.calMonth;
      if (cm.getFullYear() !== now.getFullYear() || cm.getMonth() !== now.getMonth()) return U.ymd(cm);
    } else {
      var we = U.addDays(ui.weekStart, 6), t = U.ymd(now);
      if (t < U.ymd(ui.weekStart) || t > U.ymd(we)) return U.ymd(ui.weekStart);
    }
    return today();
  }
  function openEvent(id) {
    var e = id ? items[id] : { date: newEventDate(), time: '', title: '', detail: '', remark: '', remind: 60, owner: 'Both' };
    var owners = [[myName(), myName()]]; if (profile.partner) owners.push([profile.partner, profile.partner]); owners.push(['Both', 'Both']);
    openSheet('<h2>' + (id ? 'Edit event' : 'New event') + '</h2>' + fld('f-title', 'Title', inp('f-title', 'text', e.title, 'autocomplete="off"')) +
      '<div class="grid2">' + fld('f-date', 'Date', inp('f-date', 'date', e.date)) + fld('f-time', 'Time', inp('f-time', 'time', e.time)) + '</div>' +
      fld('f-detail', 'Detail', inp('f-detail', 'text', e.detail, 'autocomplete="off"')) + fld('f-remark', 'Remark', inp('f-remark', 'text', e.remark, 'autocomplete="off"')) +
      '<div class="grid2">' + fld('f-owner', 'For', '<select id="f-owner" class="in">' + opts(owners, e.owner || 'Both') + '</select>') +
      fld('f-remind', 'Remind me', '<select id="f-remind" class="in">' + opts([[0, 'No reminder'], [30, '30 minutes before'], [60, '1 hour before'], [180, '3 hours before'], [1440, '1 day before']], e.remind) + '</select>') + '</div>' +
      '<div class="actions' + (id ? ' three' : '') + '"><button class="btn ghost" data-act="sheet-close">Cancel</button>' + (id ? '<button class="btn danger" data-act="f-delete" data-id="' + id + '">Delete</button>' : '') +
      '<button class="btn" data-act="f-save" data-type="event" data-id="' + (id || '') + '">Save</button></div>');
  }
  function openTodo(id) {
    var t = id ? items[id] : { title: '', owner: 'Both', due: '', remindAt: '', follow: false };
    var owners = [[myName(), myName()]]; if (profile.partner) owners.push([profile.partner, profile.partner]); owners.push(['Both', 'Both']);
    openSheet('<h2>' + (id ? 'Edit task' : 'New task') + '</h2>' + fld('f-title', 'Task', inp('f-title', 'text', t.title, 'autocomplete="off"')) +
      '<div class="grid2">' + fld('f-owner', 'For', '<select id="f-owner" class="in">' + opts(owners, t.owner) + '</select>') + fld('f-due', 'Due date', inp('f-due', 'date', t.due)) + '</div>' +
      fld('f-remindAt', 'Remind me at', inp('f-remindAt', 'datetime-local', t.remindAt)) +
      '<label class="chk"><input type="checkbox" id="f-follow"' + (t.follow ? ' checked' : '') + '> Needs follow-up</label>' +
      '<div class="actions' + (id ? ' three' : '') + '"><button class="btn ghost" data-act="sheet-close">Cancel</button>' + (id ? '<button class="btn danger" data-act="f-delete" data-id="' + id + '">Delete</button>' : '') +
      '<button class="btn" data-act="f-save" data-type="todo" data-id="' + (id || '') + '">Save</button></div>');
  }
  function openGrocery(id) {
    var g = items[id];
    openSheet('<h2>Edit item</h2>' + fld('f-name', 'Item', inp('f-name', 'text', g.name, 'autocomplete="off"')) + fld('f-qty', 'Quantity', inp('f-qty', 'text', g.qty, 'autocomplete="off"')) +
      '<div class="actions three"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn danger" data-act="f-delete" data-id="' + id + '">Delete</button>' +
      '<button class="btn" data-act="f-save" data-type="grocery" data-id="' + id + '">Save</button></div>');
  }
  function openEntry(id) {
    var e = items[id];
    openSheet('<h2>Edit entry</h2>' + fld('f-kind', 'Type', '<select id="f-kind" class="in" data-in="f-kind">' + opts([['spend', 'Spending'], ['income', 'Income']], e.kind) + '</select>') +
      fld('f-desc', 'Description', inp('f-desc', 'text', e.desc, 'autocomplete="off"')) +
      '<div class="grid2">' + fld('f-amount', 'Amount', inp('f-amount', 'text', 'Rp ' + U.group(e.amount), 'inputmode="numeric" data-in="f-amt"')) +
      fld('f-cat', 'Category', '<select id="f-cat" class="in">' + catOptions(e.kind, e.cat, false) + '</select>') + '</div>' +
      fld('f-date', 'Date', inp('f-date', 'date', e.date)) +
      '<div class="actions three"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn danger" data-act="f-delete" data-id="' + id + '">Delete</button>' +
      '<button class="btn" data-act="f-save" data-type="entry" data-id="' + id + '">Save</button></div>');
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function saveForm(type, id) {
    var base = id ? Object.assign({}, items[id]) : { id: U.uid(), type: type };
    if (type === 'event') {
      var title = val('f-title').trim(); if (!title || !val('f-date')) return false;
      Object.assign(base, { title: title, date: val('f-date'), time: val('f-time'), detail: val('f-detail').trim(), remark: val('f-remark').trim(), remind: +val('f-remind') || 0, owner: val('f-owner') || 'Both', by: base.by || myName() });
    } else if (type === 'todo') {
      var tt = val('f-title').trim(); if (!tt) return false;
      var follow = document.getElementById('f-follow').checked;
      Object.assign(base, { title: tt, owner: val('f-owner'), due: val('f-due'), remindAt: val('f-remindAt'), follow: follow, done: !!base.done, by: base.by || myName() });
    } else if (type === 'grocery') {
      var nm = val('f-name').trim(); if (!nm) return false;
      Object.assign(base, { name: nm, qty: val('f-qty').trim() });
    } else if (type === 'entry') {
      var amt = U.parseAmount(val('f-amount')); if (!amt) return false;
      var kind = val('f-kind');
      Object.assign(base, { kind: kind, desc: val('f-desc').trim() || val('f-cat'), amount: amt, cat: val('f-cat'), date: val('f-date') || today() });
    }
    put(base);
    return true;
  }

  /* ---------- smart typing ---------- */
  function updateGrocerySug() {
    var box = $('#g-sug'); if (!box) return;
    var arr = U.suggest(ui.g.name, groceryNames(), 3);
    box.innerHTML = sugHtml('Did you mean ', arr, 'g-sug');
  }
  function updateMoneySug(detect) {
    var d = ui.draft, box = $('#m-sug'); if (!box) return;
    if (detect && !d.catManual) {
      var hist = list('entry').map(function (e) { return { desc: e.desc, cat: e.cat }; });
      d.cat = U.detectCategory(d.desc, d.kind, hist) || '';
      var sel = $('#m-cat'); if (sel) sel.value = d.cat;
    }
    var cands = list('entry').filter(function (e) { return e.kind === d.kind; }).map(function (e) { return e.desc; });
    if (d.kind === 'spend') cands = cands.concat(U.GROCERY_SEED);
    var arr = U.suggest(d.desc, cands, 3);
    var html = sugHtml('Did you mean ', arr, 'm-sug');
    if (d.cat && d.desc.trim()) html += (html ? ' ' : '') + '<span>Category: <b style="color:var(--primary)">' + esc(d.cat) + '</b></span>';
    box.innerHTML = html;
  }

  /* ---------- reminders ---------- */
  function dueReminders() {
    var out = [];
    list('event').forEach(function (e) {
      var s = U.localDate(e.date, e.time || '09:00');
      if (s && e.remind > 0) out.push({ key: 'e:' + e.id + ':' + e.date + e.time + ':' + e.remind, at: s.getTime() - e.remind * 60000, title: e.title, body: U.dayLabel(e.date) + (e.time ? ' · ' + e.time : '') + (e.remark ? ' · ' + e.remark : '') });
    });
    list('todo').forEach(function (t) {
      var s = t.remindAt ? U.localDateTime(t.remindAt) : null;
      if (s && !t.done) out.push({ key: 't:' + t.id + ':' + t.remindAt, at: s.getTime(), title: t.title, body: 'Task for ' + (t.owner || 'Both') + (t.follow ? ' · follow up' : '') });
    });
    return out;
  }
  function showBanner(r) {
    var t = $('#toast'); if (!t) return;
    t.innerHTML = '<div class="m"><b>' + esc(r.title) + '</b>' + esc(r.body) + '</div><button data-act="toast-close">OK</button>';
    t.className = 'toast show';
  }
  function notify(r) {
    showBanner(r);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(r.title, { body: r.body, icon: 'icons/icon-192.png', tag: r.key }); });
        } else { new Notification(r.title, { body: r.body }); }
      }
    } catch (e) { /* notification not available */ }
  }
  function checkReminders() {
    if (!profile) return;
    var now = Date.now(), changed = false;
    dueReminders().forEach(function (r) {
      if (r.at <= now && r.at > now - 86400000 && !fired[r.key]) { fired[r.key] = now; changed = true; notify(r); }
    });
    if (changed) {
      Object.keys(fired).forEach(function (k) { if (fired[k] < now - 14 * 86400000) delete fired[k]; });
      LS.set('ds.fired', fired);
    }
  }

  /* ---------- welcome ---------- */
  function verifyCode(code) {                              // checks against config.js loginCodeHash when set
    var want = window.DS_CONFIG && window.DS_CONFIG.loginCodeHash;
    if (!want || !(window.crypto && window.crypto.subtle) || typeof TextEncoder === 'undefined') return Promise.resolve(true);
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode('ds-family:' + code)).then(function (buf) {
      var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      return hex === want;
    }).catch(function () { return true; });
  }
  function welcomeHtml() {
    return '<div class="shell"><div class="welcome"><span class="logo">DS</span><h1>DS Family</h1>' +
      '<p>Calendar, groceries, money and to-do, shared between the two of you.</p>' +
      fld('w-name', 'Your name', inp('w-name', 'text', '', 'autocomplete="off" placeholder="Your name"')) +
      fld('w-partner', 'Partner name', inp('w-partner', 'text', '', 'autocomplete="off" placeholder="Partner name"')) +
      fld('w-code', 'Login code (6 digits)', '<input id="w-code" class="in" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="6 digits">') +
      '<p class="note" id="w-err" style="color:var(--danger)"></p><button class="btn" data-act="w-start">Start</button>' +
      '<p class="note">You only enter this once on each phone. Both phones use the same code.</p></div></div>';
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) { if ($('#menu') && $('#menu').className.indexOf('open') > -1) setMenu(false); return; }
    var act = el.getAttribute('data-act'), v = el.getAttribute('data-v'), id = el.getAttribute('data-id');
    switch (act) {
      case 'menu': setMenu($('#menu').className.indexOf('open') < 0); break;
      case 'menu-close': setMenu(false); break;
      case 'open-theme': setMenu(false); openThemeSheet(); break;
      case 'open-settings': setMenu(false); openSettingsSheet(); break;
      case 'open-about': setMenu(false); openAboutSheet(); break;
      case 'theme-set': prefs.theme = v; savePrefs(); applyTheme(); if (sheetOpen()) openThemeSheet(); markThemeDots(); break;
      case 'update-check': updateCheck(el); break;
      case 'sheet-close': closeSheet(); break;
      case 'sheet-bg': if (ev.target === el) closeSheet(); break;
      case 'toast-close': $('#toast').className = 'toast'; break;
      case 'tab': prefs.tab = v; ui.reveal = false; savePrefs(); renderMain(); $('#main').scrollTop = 0; break;

      case 'ev-add': openEvent(); break;
      case 'ev-edit': openEvent(id); break;
      case 'week-prev': ui.weekStart = U.addDays(ui.weekStart, -7); renderMain(); break;
      case 'week-next': ui.weekStart = U.addDays(ui.weekStart, 7); renderMain(); break;
      case 'day-sel': ui.selDay = ui.selDay === v ? null : v; if (ui.selDay) { var sd = U.parseYmd(ui.selDay); ui.weekStart = U.mondayOf(sd); ui.calMonth = new Date(sd.getFullYear(), sd.getMonth(), 1); } renderMain(); break;
      case 'cal-prev': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() - 1, 1); renderMain(); break;
      case 'cal-next': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + 1, 1); renderMain(); break;
      case 'cal-today': ui.selDay = null; ui.weekStart = U.mondayOf(new Date()); ui.calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderMain(); break;

      case 'g-add': {
        var name = ui.g.name.trim(); if (!name) break;
        name = name.charAt(0).toUpperCase() + name.slice(1);
        put({ id: U.uid(), type: 'grocery', name: name, qty: ui.g.qty.trim(), checked: false, price: 0, archived: false, by: myName() }, true);
        ui.g = { name: '', qty: '' }; renderMain(); var gi = $('#g-name'); if (gi) gi.focus(); break;
      }
      case 'g-sug': ui.g.name = v; { var gn = $('#g-name'); if (gn) { gn.value = v; gn.focus(); } } updateGrocerySug(); break;
      case 'g-toggle': { var g = items[id]; if (g) put(Object.assign({}, g, { checked: !g.checked })); break; }
      case 'g-edit': openGrocery(id); break;
      case 'g-save': {
        var lines = list('grocery').filter(function (g2) { return !g2.archived && (g2.checked || g2.price > 0); });
        var total = lines.reduce(function (s, g3) { return s + (g3.price || 0); }, 0);
        if (total <= 0) break;
        put({ id: U.uid(), type: 'entry', kind: 'spend', desc: 'Groceries (' + lines.length + (lines.length === 1 ? ' item)' : ' items)'), amount: total, cat: 'Groceries', date: today(), by: myName(),
          lines: lines.map(function (l) { return { n: l.name, p: l.price || 0 }; }) }, true);
        lines.forEach(function (l) { put(Object.assign({}, l, { archived: true }), true); });
        renderMain();
        showBanner({ title: 'Saved to spending', body: U.money(total) + ' for ' + lines.length + (lines.length === 1 ? ' item' : ' items') });
        break;
      }

      case 'm-reveal': ui.reveal = !ui.reveal; renderMain(); break;
      case 'm-kind': ui.draft.kind = v; ui.draft.cat = ''; ui.draft.catManual = false; renderMain(); updateMoneySug(true); break;
      case 'm-sug': ui.draft.desc = v; { var md = $('#m-desc'); if (md) md.value = v; } ui.draft.catManual = false; updateMoneySug(true); break;
      case 'm-add': {
        var d = ui.draft, amt = U.parseAmount(d.amount); if (!amt) { var ma = $('#m-amt'); if (ma) ma.focus(); break; }
        var cat = d.cat || (d.kind === 'income' ? 'Other income' : 'Other');
        put({ id: U.uid(), type: 'entry', kind: d.kind, desc: d.desc.trim() || cat, amount: amt, cat: cat, date: today(), by: myName() }, true);
        ui.draft = { kind: d.kind, desc: '', amount: '', cat: '', catManual: false }; ui.month = U.ym(new Date()); renderMain(); break;
      }
      case 'm-edit': openEntry(id); break;
      case 'm-prev': case 'm-next': {
        var p = ui.month.split('-'), dt = new Date(+p[0], +p[1] - 1 + (act === 'm-next' ? 1 : -1), 1); ui.month = U.ym(dt); renderMain(); break;
      }

      case 't-add': openTodo(); break;
      case 't-edit': openTodo(id); break;
      case 't-toggle': { var t = items[id]; if (t) put(Object.assign({}, t, { done: !t.done, doneAt: !t.done ? Date.now() : 0 })); break; }
      case 't-filter': ui.todoFilter = v; renderMain(); break;

      case 'f-save': if (saveForm(el.getAttribute('data-type'), id)) closeSheet(); break;
      case 'f-delete': remove(id); closeSheet(); break;

      case 'settings-save': {
        var nm = val('s-name').trim(); if (nm) profile.name = nm;
        profile.partner = val('s-partner').trim(); LS.set('ds.profile', profile);
        put(Object.assign({}, meta(), { openBal: U.parseAmount(val('s-open')) }), true);
        closeSheet(); renderMain(); break;
      }
      case 'copy-code':
        try { navigator.clipboard.writeText(profile.code); el.textContent = 'Copied'; } catch (e) { var c = $('#s-code'); c.select(); }
        break;
      case 'enable-notif':
        if (typeof Notification !== 'undefined') { Notification.requestPermission().then(function () { openSettingsSheet(); }); }
        break;
      case 'leave':
        if (window.confirm('Leave this family code? Data stays safe online, but is removed from this phone.')) {
          localStorage.removeItem('ds.profile'); localStorage.removeItem('ds.items'); localStorage.removeItem('ds.fired'); location.reload();
        }
        break;

      case 'w-start': {
        var wn = $('#w-name').value.trim(), wc = $('#w-code').value.replace(/\D/g, ''), wp = $('#w-partner').value.trim();
        if (!wn) { $('#w-err').textContent = 'Please enter your name.'; break; }
        if (wc.length !== 6) { $('#w-err').textContent = 'Enter the 6-digit code.'; break; }
        verifyCode(wc).then(function (ok) {
          if (!ok) { $('#w-err').textContent = 'That code is not right.'; return; }
          profile = { name: wn, partner: wp, code: wc }; LS.set('ds.profile', profile);
          try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
          render(); initSync();
        });
        break;
      }
    }
  });

  document.addEventListener('input', function (ev) {
    var el = ev.target, k = el.getAttribute && el.getAttribute('data-in');
    if (!k) return;
    if (k === 'g-name') { ui.g.name = el.value; updateGrocerySug(); }
    else if (k === 'g-qty') ui.g.qty = el.value;
    else if (k === 'm-desc') { ui.draft.desc = el.value; updateMoneySug(true); }
    else if (k === 'm-amt' || k === 'f-amt' || k === 'g-price') {
      var f = U.amountInput(el.value); el.value = f ? 'Rp ' + f : '';
      if (k === 'm-amt') ui.draft.amount = f;
    }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target, c = el.getAttribute && el.getAttribute('data-chg');
    if (c === 'cal-month') { ui.calMonth = new Date(ui.calMonth.getFullYear(), +el.value, 1); renderMain(); return; }
    if (c === 'cal-year') { ui.calMonth = new Date(+el.value, ui.calMonth.getMonth(), 1); renderMain(); return; }
    if (c === 'jump') {
      var jd = U.parseYmd(el.value);
      if (jd) { ui.selDay = el.value; ui.weekStart = U.mondayOf(jd); ui.calMonth = new Date(jd.getFullYear(), jd.getMonth(), 1); renderMain(); }
      return;
    }
    var k = el.getAttribute && el.getAttribute('data-in');
    if (!k) return;
    if (k === 'm-cat') { ui.draft.cat = el.value; ui.draft.catManual = !!el.value; updateMoneySug(false); }
    else if (k === 'g-price') {
      var g = items[el.getAttribute('data-id')];
      if (g) { put(Object.assign({}, g, { price: U.parseAmount(el.value) }), true); var tot = $('#g-total'); if (tot) tot.textContent = U.money(groceryTotal()); var sv = $('#g-save'); if (sv) sv.disabled = groceryTotal() <= 0; }
    } else if (k === 'f-kind') {
      var cs = $('#f-cat'); if (cs) cs.innerHTML = catOptions(el.value, '', false);
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'g-name') { ev.preventDefault(); var b = document.querySelector('[data-act="g-add"]'); if (b) b.click(); }
    if (ev.key === 'Escape') { setMenu(false); closeSheet(); }
  });

  /* ---------- start ---------- */
  render();
  initSync();
  checkReminders();
  setInterval(function () {
    checkReminders();
    if (profile && prefs.tab === 'calendar' && !sheetOpen() && !document.hidden) renderMain();
  }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { ui.reveal = false; } if (!document.hidden) { checkReminders(); if (!sheetOpen()) renderMain(); } });
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () { }); }
})();
