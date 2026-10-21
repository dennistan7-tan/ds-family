/* DS Family - pure helpers (dates, money, typo-tolerant matching). No DOM here, so it can be tested in Node. */
(function (root) {
  'use strict';
  var DS = {};

  /* ---------- ids, money ---------- */
  DS.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };
  DS.group = function (n) {
    return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  DS.money = function (n, withSign) {
    var s = 'Rp ' + DS.group(n);
    if (withSign) return (n < 0 ? '− ' : '+ ') + s;
    return n < 0 ? '−' + s : s;
  };
  DS.parseAmount = function (s) {
    var d = String(s == null ? '' : s).replace(/[^\d]/g, '');
    return d ? parseInt(d, 10) : 0;
  };
  DS.amountInput = function (s) {
    var n = DS.parseAmount(s);
    return n ? DS.group(n) : '';
  };

  /* ---------- dates (all local time) ---------- */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  DS.DOW = DOW; DS.MON = MON; DS.MONFULL = MONFULL;
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  DS.ymd = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  DS.ym = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1); };
  DS.parseYmd = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  DS.localDate = function (date, time) {
    var d = DS.parseYmd(date);
    if (!d) return null;
    var t = /^(\d{1,2}):(\d{2})/.exec(time || '');
    d.setHours(t ? +t[1] : 0, t ? +t[2] : 0, 0, 0);
    return d;
  };
  DS.localDateTime = function (s) {           // "YYYY-MM-DDTHH:MM"
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{1,2}:\d{2})/.exec(s || '');
    return m ? DS.localDate(m[1], m[2]) : null;
  };
  DS.mondayOf = function (d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var back = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - back);
    return x;
  };
  DS.addDays = function (d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  };
  DS.countdown = function (ms) {
    if (ms <= 0) return 'now';
    var m = Math.floor(ms / 60000);
    var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + mi + 'm';
    return Math.max(mi, 1) + 'm';
  };
  DS.dayLabel = function (dateStr) {
    var d = DS.parseYmd(dateStr);
    return d ? DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] : '';
  };

  /* ---------- typo-tolerant matching ---------- */
  DS.norm = function (s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  };
  DS.stem = function (w) {
    if (w.length > 3 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 3 && /(o|s|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  };
  DS.tokens = function (s) {
    var n = DS.norm(s);
    return n ? n.split(' ').map(DS.stem) : [];
  };
  // optimal string alignment distance (insert, delete, substitute, swap neighbours)
  DS.osa = function (a, b) {
    var al = a.length, bl = b.length, i, j, cost;
    if (!al) return bl;
    if (!bl) return al;
    var d = [];
    for (i = 0; i <= al; i++) { d[i] = [i]; }
    for (j = 0; j <= bl; j++) { d[0][j] = j; }
    for (i = 1; i <= al; i++) {
      for (j = 1; j <= bl; j++) {
        cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[al][bl];
  };
  DS.tokSim = function (a, b) {
    if (a === b) return 1;
    var min = Math.min(a.length, b.length), L = Math.max(a.length, b.length);
    if (min >= 3 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)) return 0.9;   // partly typed
    var allowed = L <= 3 ? 0 : (L <= 6 ? 1 : 2);
    var d = DS.osa(a, b);
    return d <= allowed ? 1 - d / L : 0;
  };
  // 0..1, ignores word order and small typos
  DS.phraseSim = function (query, cand) {
    var qt = DS.tokens(query), ct = DS.tokens(cand);
    if (!qt.length || !ct.length) return 0;
    var used = {}, sum = 0;
    qt.forEach(function (q) {
      var best = 0, bi = -1;
      ct.forEach(function (c, i) {
        if (used[i]) return;
        var s = DS.tokSim(q, c);
        if (s > best) { best = s; bi = i; }
      });
      if (bi >= 0) { used[bi] = true; sum += best; }
    });
    return 0.7 * (sum / qt.length) + 0.3 * (sum / ct.length);
  };
  // best candidates for what was typed; hides ones that already match exactly
  DS.suggest = function (query, candidates, limit, min) {
    limit = limit || 3; min = min == null ? 0.6 : min;
    var qn = DS.tokens(query).join(' ');
    if (!qn) return [];
    var seen = {}, out = [];
    candidates.forEach(function (c) {
      var key = DS.tokens(c).join(' ');
      if (!key || seen[key]) return;
      seen[key] = true;
      if (key === qn) return;
      var s = DS.phraseSim(query, c);
      if (s >= min) out.push({ text: c, score: s });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit).map(function (o) { return o.text; });
  };

  /* ---------- seed words ---------- */
  DS.GROCERY_SEED = ['Milk', 'Fresh milk', 'Eggs', 'Rice', 'Cooking oil', 'Sugar', 'Salt', 'Flour', 'Bread', 'Butter', 'Cheese',
    'Chicken', 'Beef', 'Fish', 'Shrimp', 'Tofu', 'Tempeh', 'Noodles', 'Instant noodles', 'Pasta', 'Tomatoes', 'Onions', 'Shallots',
    'Garlic', 'Potatoes', 'Carrots', 'Cabbage', 'Spinach', 'Broccoli', 'Cucumber', 'Chili', 'Ginger', 'Lemon', 'Lime', 'Bananas',
    'Apples', 'Oranges', 'Mangoes', 'Grapes', 'Watermelon', 'Coffee', 'Tea', 'Soy sauce', 'Sweet soy sauce', 'Chili sauce', 'Ketchup',
    'Mayonnaise', 'Cereal', 'Biscuits', 'Snacks', 'Mineral water', 'Juice', 'Soda', 'Dish soap', 'Laundry detergent', 'Fabric softener',
    'Shampoo', 'Soap', 'Toothpaste', 'Toothbrush', 'Tissue', 'Toilet paper', 'Diapers', 'Baby formula', 'Trash bags', 'Sponge',
    'Cooking gas', 'Telur', 'Beras', 'Minyak goreng', 'Gula', 'Garam', 'Tepung', 'Roti', 'Mentega', 'Ayam', 'Daging sapi', 'Ikan',
    'Udang', 'Tahu', 'Tempe', 'Mie instan', 'Tomat', 'Bawang merah', 'Bawang putih', 'Kentang', 'Wortel', 'Kol', 'Bayam', 'Cabai',
    'Jahe', 'Jeruk', 'Pisang', 'Kopi', 'Teh', 'Kecap manis', 'Saus sambal', 'Susu'];

  DS.SPEND_CATS = ['Groceries', 'Food', 'Bills', 'Transport', 'Health', 'Kids', 'Shopping', 'Other'];
  DS.INCOME_CATS = ['Salary', 'Business', 'Gift', 'Other income'];
  DS.KEYWORDS = {
    Groceries: ['grocery', 'groceries', 'supermarket', 'market', 'pasar', 'belanja', 'alfamart', 'indomaret', 'sayur', 'vegetables', 'fruit', 'buah'],
    Food: ['lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'takeaway', 'delivery', 'makan', 'warung', 'gofood', 'grabfood', 'bakso', 'pizza', 'burger', 'meal', 'snack'],
    Bills: ['electricity', 'listrik', 'pln', 'water bill', 'pdam', 'internet', 'wifi', 'phone', 'pulsa', 'rent', 'sewa', 'insurance', 'tax', 'pajak', 'installment', 'cicilan', 'loan', 'subscription', 'netflix', 'bill'],
    Transport: ['fuel', 'petrol', 'bensin', 'toll', 'parking', 'parkir', 'grab', 'gojek', 'taxi', 'bus', 'train', 'mrt', 'ojek', 'car service', 'oil change', 'transport'],
    Health: ['doctor', 'dokter', 'medicine', 'obat', 'pharmacy', 'apotek', 'hospital', 'clinic', 'vitamin', 'dentist', 'health'],
    Kids: ['school', 'sekolah', 'tuition', 'spp', 'toys', 'mainan', 'kids', 'baby', 'uniform', 'course', 'kindergarten'],
    Shopping: ['clothes', 'shirt', 'shoes', 'bag', 'furniture', 'electronics', 'gadget', 'shopee', 'tokopedia', 'lazada', 'gift', 'kado', 'shopping'],
    Salary: ['salary', 'gaji', 'payroll', 'wage'],
    Business: ['business', 'usaha', 'sales', 'penjualan', 'order', 'customer', 'profit'],
    Gift: ['gift', 'hadiah', 'angpao', 'allowance', 'transfer from'],
    'Other income': ['refund', 'interest', 'bonus', 'cashback', 'dividend']
  };

  // pick a category for what was typed. history = [{desc, cat}] learned from past entries.
  DS.detectCategory = function (text, kind, history) {
    var cats = kind === 'income' ? DS.INCOME_CATS : DS.SPEND_CATS;
    if (!DS.norm(text)) return null;
    var best = null, bs = 0.84;
    (history || []).forEach(function (h) {
      if (cats.indexOf(h.cat) < 0) return;
      var s = DS.phraseSim(text, h.desc);
      if (s > bs) { bs = s; best = h.cat; }
    });
    if (best) return best;
    var qt = DS.tokens(text), score = {}, top = null, ts = 0.8;
    cats.forEach(function (c) {
      var words = (DS.KEYWORDS[c] || []).slice();
      if (c === 'Groceries') words = words.concat(DS.GROCERY_SEED);
      var cs = 0;
      words.forEach(function (w) {
        var wt = DS.tokens(w);
        if (!wt.length) return;
        if (wt.length > 1) {                       // multi-word keyword: compare as phrase
          var ps = DS.phraseSim(text, w);
          if (ps > cs) cs = ps;
          return;
        }
        qt.forEach(function (q) { var s = DS.tokSim(q, wt[0]); if (s > cs) cs = s; });
      });
      score[c] = cs;
      if (cs > ts) { ts = cs; top = c; }
    });
    return top;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DS;
  else root.DS = DS;
})(typeof window !== 'undefined' ? window : globalThis);
