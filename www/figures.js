/* DS Family - animated exercise figures. A rounded mannequin is posed with simple two-bone IK and
   tweened between key poses, so each move shows how it looks. Pure drawing, no network. */
(function (root) {
  'use strict';
  var L = { thigh: 46, shin: 44, torso: 56, ua: 30, fa: 28, neck: 23, hr: 13 };
  var LEG = L.thigh + L.shin, BODY = LEG + L.torso;
  var D2R = Math.PI / 180;

  function ik(r, t, l1, l2, sign) {
    var dx = t[0] - r[0], dy = t[1] - r[1], d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.01);
    var ux = dx / (Math.sqrt(dx * dx + dy * dy) || 1), uy = dy / (Math.sqrt(dx * dx + dy * dy) || 1);
    var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return { j: [r[0] + ux * a - uy * h * sign, r[1] + uy * a + ux * h * sign], e: [r[0] + ux * d, r[1] + uy * d] };
  }
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpP(p, q, t) {
    var o = {};
    ['hip', 'hn', 'hf', 'fn', 'ff'].forEach(function (k) { o[k] = [lerp(p[k][0], q[k][0], t), lerp(p[k][1], q[k][1], t)]; });
    o.ang = lerp(p.ang, q.ang, t); o.hd = lerp(p.hd || 0, q.hd || 0, t);
    o.fl = t < 0.5 ? p.fl : q.fl;
    return o;
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* ---------- pose builders ---------- */
  function stand(o) { return mix({ hip: [200, 108], ang: -90, hd: 0, hn: [204, 108], hf: [196, 108], fn: [206, 194], ff: [194, 194] }, o || {}); }
  function pivot(ank, sy) { var dy = ank[1] - sy; return [ank[0] + Math.sqrt(BODY * BODY - dy * dy), sy]; }
  function bodyLine(ank, sh) {
    var f = LEG / BODY, hip = [ank[0] + (sh[0] - ank[0]) * f, ank[1] + (sh[1] - ank[1]) * f];
    return { hip: hip, ang: Math.atan2(sh[1] - hip[1], sh[0] - hip[0]) / D2R };
  }
  function plankPose(ank, sy, hand, o) {                    // straight body from toes to head, arms to a fixed hand spot
    var sh = pivot(ank, sy), b = bodyLine(ank, sh);
    return mix({ hip: b.hip, ang: b.ang, hd: 0, hn: hand, hf: [hand[0] - 5, hand[1]], fn: ank, ff: [ank[0] - 5, ank[1]] }, o || {});
  }
  function lying(o) {                                       // on the back, head to the left
    return mix({ hip: [270, 186], ang: 180, hd: 0, hn: [262, 190], hf: [256, 190], fn: [330, 194], ff: [338, 194], fl: 'flat' }, o || {});
  }

  /* ---------- props ---------- */
  var MAT = '<rect x="14" y="199" width="372" height="8" rx="4" fill="var(--chip)" stroke="var(--line)"/>';
  function sofa(x1, x2, h) {
    var y = 200 - h;
    return '<rect x="' + (x1 + 6) + '" y="' + (y + 8) + '" width="' + (x2 - x1 - 12) + '" height="' + (h - 8) + '" rx="6" fill="var(--primary)" opacity=".92"/>' +
      '<rect x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="16" rx="8" fill="var(--primary)"/>' +
      '<rect x="' + (x1 + 6) + '" y="' + (y + 2) + '" width="' + (x2 - x1 - 12) + '" height="4" rx="2" fill="#fff" opacity=".22"/>';
  }
  function table(x1, x2, y) {
    return '<rect x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="9" rx="3" fill="#8B5E34"/><rect x="' + (x1 + 8) + '" y="' + (y + 9) + '" width="6" height="' + (200 - y - 9) + '" fill="#6F4826"/>' +
      '<rect x="' + (x2 - 14) + '" y="' + (y + 9) + '" width="6" height="' + (200 - y - 9) + '" fill="#6F4826"/>';
  }
  function step(x1, x2, h) {
    return '<rect x="' + x1 + '" y="' + (200 - h) + '" width="' + (x2 - x1) + '" height="' + h + '" rx="4" fill="#B9A98C"/><rect x="' + x1 + '" y="' + (200 - h) + '" width="' + (x2 - x1) + '" height="6" rx="3" fill="#D6C8AA"/>';
  }
  function pack(c) {
    return '<g transform="translate(' + (c[0] - 17) + ' ' + (c[1] - 22) + ')"><rect width="34" height="44" rx="10" fill="#8B5E34" stroke="#5D3C1E" stroke-width="1.5"/>' +
      '<rect x="6" y="22" width="22" height="14" rx="5" fill="#A97B4D" stroke="#5D3C1E"/><rect x="4" y="6" width="26" height="4" rx="2" fill="#5D3C1E" opacity=".5"/></g>';
  }
  function jug(c) {
    return '<g transform="translate(' + (c[0] - 8) + ' ' + (c[1] - 6) + ')"><rect width="16" height="26" rx="5" fill="#8FC1E3" stroke="#4F86AD" stroke-width="1.5"/>' +
      '<rect x="4" y="-4" width="8" height="5" rx="2" fill="#fff" stroke="#4F86AD"/><rect x="3" y="8" width="3" height="10" rx="1.5" fill="#fff" opacity=".5"/></g>';
  }

  /* ---------- the moves ---------- */
  var M = {};
  function push(top, bot, extra) { return mix({ frames: [top, bot], caps: ['Start', 'Lower'] }, extra || {}); }

  (function () {
    var ank = [58, 194], hand = [190, 158];
    M.pushup = { frames: [plankPose(ank, 100, hand), plankPose(ank, 138, hand)], caps: ['Press up', 'Lower'], props: sofa(150, 250, 40), pbb: [150, 160, 250, 200], held: null };
    var h2 = [190, 158];
    M.mountain = { frames: [plankPose(ank, 100, h2, { fn: [150, 150], ff: [58, 194] }), plankPose(ank, 100, h2, { fn: [58, 194], ff: [150, 150] })], caps: ['Drive one knee', 'Switch'], props: sofa(150, 250, 40), pbb: [150, 160, 250, 200] };
  })();
  (function () {
    var top = stand({ hn: [214, 62], hf: [220, 62] }), up = stand({ hn: [206, -4], hf: [212, -4] });
    M.press = { frames: [top, up], caps: ['Pack at chest', 'Press up'], held: 'pack' };
    M.babymarch = { frames: [stand({ hn: [214, 72], hf: [220, 72], fn: [250, 154] }), stand({ hn: [214, 72], hf: [220, 72], ff: [250, 154] })], caps: ['Knee up', 'Switch'], held: 'pack' };
    var walk = [stand({ fn: [226, 194], ff: [176, 194], hn: [208, 108], hf: [194, 108] }), stand({ fn: [176, 194], ff: [226, 194], hn: [194, 108], hf: [208, 108] })];
    M.carry = { frames: walk, caps: ['Step', 'Step'], held: 'jugs' };
    M.curl = { frames: [stand({ hn: [204, 108], hf: [196, 108] }), stand({ hn: [226, 66], hf: [219, 66] })], caps: ['Arms long', 'Curl up'], held: 'jugs' };
    M.highknee = { frames: [stand({ fn: [246, 150], hn: [190, 100], hf: [226, 82] }), stand({ ff: [246, 150], hn: [226, 82], hf: [190, 100] })], caps: ['Knee high', 'Switch'] };
    M.farmerMarch = { frames: [stand({ fn: [246, 152] }), stand({ ff: [246, 152] })], caps: ['Knee up', 'Switch'], held: 'jugs' };
    M.stepjack = { frames: [stand({ fn: [204, 194], ff: [196, 194] }), stand({ fn: [244, 194], ff: [156, 194], hn: [206, -2], hf: [194, -2] })], caps: ['Feet together', 'Step out, arms up'] };
    M.shadow = { frames: [stand({ hip: [200, 110], hn: [226, 42], hf: [212, 38], fn: [226, 194], ff: [176, 194] }), stand({ hip: [200, 110], hn: [276, 40], hf: [206, 40], fn: [226, 194], ff: [176, 194] }),
      stand({ hip: [200, 110], hn: [226, 42], hf: [212, 38], fn: [226, 194], ff: [176, 194] }), stand({ hip: [200, 110], hn: [222, 44], hf: [280, 38], fn: [226, 194], ff: [176, 194] })], caps: ['Guard', 'Jab', 'Guard', 'Cross'] };
    var sx = 252;
    M.stepup = { frames: [stand({ hip: [190, 108], fn: [206, 194], ff: [176, 194] }), stand({ hip: [212, 104], fn: [252, 154], ff: [188, 194], hn: [212, 100], hf: [190, 112] }),
      stand({ hip: [258, 66], fn: [254, 154], ff: [226, 112], hn: [232, 68], hf: [248, 68] }), stand({ hip: [220, 100], fn: [252, 154], ff: [196, 194], hn: [212, 100], hf: [190, 112] })], caps: ['Start', 'Foot on step', 'Stand tall', 'Step down'], props: step(236, 300, 40), pbb: [236, 160, 300, 200] };
  })();
  (function () {
    var hip = [196, 110], ang = -28, sh = [196 + Math.cos(ang * D2R) * L.torso, 110 + Math.sin(ang * D2R) * L.torso];
    var base = { hip: hip, ang: ang, hd: 12, fn: [200, 194], ff: [190, 194], fl: 'flat' };
    M.row = { frames: [mix(base, { hn: [sh[0] + 4, sh[1] + 56], hf: [sh[0] - 2, sh[1] + 56] }), mix(base, { hn: [sh[0] - 6, sh[1] + 30], hf: [sh[0] - 12, sh[1] + 30] })], caps: ['Arms long', 'Pull to belly'], held: 'pack', sg: { sn: 1, sf: 1 } };
  })();
  (function () {
    var ank = [96, 192], hand = [232, 108];
    function t(sy) { var sh = pivot(ank, sy), b = bodyLine(ank, sh); return { hip: b.hip, ang: b.ang, hd: -20, hn: hand, hf: [hand[0] - 5, hand[1]], fn: ank, ff: [ank[0] - 5, ank[1]], fl: 'flat' }; }
    M.tablerow = { frames: [t(170), t(132)], caps: ['Hang under the edge', 'Pull chest up'], props: table(110, 238, 100), pbb: [110, 100, 238, 200], sg: { sn: 1, sf: 1 } };
  })();
  (function () {
    var f = { fn: [60, 185], ff: [54, 185], fl: 'flat' };
    function pr(hy, hd) { return mix(f, { hip: [168, 184], ang: 0, hd: hd, hn: [296, hy], hf: [292, hy + 2] }); }
    M.prone = { frames: [pr(184, 0), pr(146, -28)], caps: ['Arms long', 'Lift arms, thumbs up'], mat: true };
  })();
  (function () {
    var near = [226, 190], base = { hip: [172, 136], ang: 0, hd: 0, hn: [228, 192], hf: [222, 192], fn: [128, 190], ff: [122, 190], fl: 'flat' };
    M.birddog = { frames: [base, mix(base, { hf: [300, 128], ff: [76, 136] }), base, mix(base, { hn: [300, 128], fn: [76, 136] })], caps: ['All fours', 'Reach long', 'All fours', 'Switch sides'], mat: true };
    function hp(o) { return plankPose([58, 192], 138, [190, 194], o); }
    M.shouldertap = { frames: [hp(), hp({ hf: [200, 130] }), hp(), hp({ hn: [208, 130] })], caps: ['Strong plank', 'Tap shoulder', 'Strong plank', 'Switch'], mat: true };
    M.plankreach = { frames: [hp(), hp({ hf: [262, 132] }), hp(), hp({ hn: [266, 130] })], caps: ['Strong plank', 'Reach forward', 'Strong plank', 'Switch'], mat: true };
    var fp = plankPose([44, 190], 150, [200, 178], { hf: [196, 178] });
    M.plank = { frames: [fp, mix(fp, { hip: [fp.hip[0], fp.hip[1] - 3] })], caps: ['Hold', 'Breathe'], mat: true };
    var sp = plankPose([44, 190], 150, [200, 178], { hf: [196, 178] });
    M.sideplank = { frames: [mix(sp, { hip: [sp.hip[0], sp.hip[1] + 10] }), mix(sp, { hip: [sp.hip[0], sp.hip[1] - 8] })], caps: ['Hips low', 'Hips high'], mat: true };
  })();
  (function () {
    var tt = { fl: 'flat' };
    var A = lying(mix(tt, { hn: [214, 128], hf: [220, 130], fn: [316, 140], ff: [322, 140] }));
    var B = lying(mix(tt, { hn: [160, 180], hf: [220, 130], fn: [316, 140], ff: [356, 178] }));
    var C = lying(mix(tt, { hn: [214, 128], hf: [160, 182], fn: [356, 176], ff: [322, 140] }));
    M.deadbug = { frames: [A, B, A, C], caps: ['Tabletop', 'Opposite arm and leg out', 'Tabletop', 'Switch'], mat: true };
    var down = lying(mix(tt, { fn: [316, 194], ff: [324, 194], hip: [270, 186] }));
    var up = lying(mix(tt, { fn: [316, 194], ff: [324, 194], hip: [248, 142], ang: 126.5, hd: 0, hn: [262, 190], hf: [256, 190] }));
    M.bridge = { frames: [down, up], caps: ['Lie flat', 'Squeeze hips up'], mat: true };
    M.bridgemarch = { frames: [up, mix(up, { fn: [286, 112] }), up, mix(up, { ff: [292, 112] })], caps: ['Bridge up', 'Lift one foot', 'Bridge up', 'Switch'], mat: true };
  })();

  var KEYS = {
    'Incline push-up': 'pushup', 'Close-grip incline push-up': 'pushup', 'Backpack overhead press': 'press', 'Forearm plank': 'plank', 'Dead bug': 'deadbug', 'Glute bridge': 'bridge',
    'Backpack bent-over row': 'row', 'Table row': 'tablerow', 'Prone Y-T-W raise': 'prone', 'Hammer curl': 'curl', 'Farmer carry': 'carry', 'Bird dog': 'birddog',
    'High-knee march': 'highknee', 'Slow mountain climber': 'mountain', 'Side plank': 'sideplank', 'Plank shoulder tap': 'shouldertap', 'Shadow boxing': 'shadow', 'Glute bridge march': 'bridgemarch',
    'Backpack row': 'row', 'Step jacks': 'stepjack', 'Baby-hold march': 'babymarch', 'Plank reach': 'plankreach', 'Low step-up': 'stepup', 'Farmer march': 'farmerMarch', 'Prone Y raise': 'prone'
  };

  /* ---------- drawing ---------- */
  var SK = '#EBC6A7', SKF = '#D2A586', OUT = '#A9785A', SHIRT = 'var(--primary)', SHORTS = '#4A3B3C';
  function seg(a, b, w, col, outline) {
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1, nx = dy / len, ny = -dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    var o = (outline === false ? '' : '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="' + OUT + '" stroke-width="' + (w + 2.5) + '" stroke-linecap="round"/>');
    o += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    var k = w * 0.2;
    o += '<line x1="' + (a[0] + nx * k).toFixed(1) + '" y1="' + (a[1] + ny * k).toFixed(1) + '" x2="' + (b[0] + nx * k).toFixed(1) + '" y2="' + (b[1] + ny * k).toFixed(1) + '" stroke="#fff" stroke-opacity=".28" stroke-width="' + (w * 0.3).toFixed(1) + '" stroke-linecap="round"/>';
    return o;
  }
  function limbs(p, sg) {
    var hip = p.hip, a = p.ang * D2R, sh = [hip[0] + Math.cos(a) * L.torso, hip[1] + Math.sin(a) * L.torso];
    var ha = a + (p.hd || 0) * D2R, head = [sh[0] + Math.cos(ha) * (L.neck), sh[1] + Math.sin(ha) * L.neck];
    sg = sg || {};
    var an = ik(sh, p.hn, L.ua, L.fa, sg.sn || 1), af = ik(sh, p.hf, L.ua, L.fa, sg.sf || 1);
    var ln = ik(hip, p.fn, L.thigh, L.shin, sg.kn || -1), lf = ik(hip, p.ff, L.thigh, L.shin, sg.kf || -1);
    return { hip: hip, sh: sh, head: head, an: an, af: af, ln: ln, lf: lf, ang: a };
  }
  function leg(h, g, far, flat) {
    var skin = far ? SKF : SK, o = seg(h, g.j, 15, skin) + seg(g.j, g.e, 12, skin);
    o += seg(h, [h[0] + (g.j[0] - h[0]) * 0.62, h[1] + (g.j[1] - h[1]) * 0.62], 16, far ? '#3A2D2E' : SHORTS, false);
    var dx = g.e[0] - g.j[0], dy = g.e[1] - g.j[1], len = Math.sqrt(dx * dx + dy * dy) || 1, fx = dy / len, fy = -dx / len;
    if (flat) { fx = 1; fy = 0; }
    var toe = [g.e[0] + fx * 14, g.e[1] + fy * 14 + (flat ? 3 : 0)], heel = [g.e[0] - 1, g.e[1] + (flat ? 3 : 0)];
    o += '<circle cx="' + g.j[0].toFixed(1) + '" cy="' + g.j[1].toFixed(1) + '" r="6.5" fill="' + skin + '" stroke="' + OUT + '" stroke-width="1"/>';
    o += seg(heel, toe, 9, far ? '#E3D9C4' : '#F6EFE0');
    return o;
  }
  function arm(s, g, far) {
    var skin = far ? SKF : SK;
    return seg(s, g.j, 11, skin) + seg(g.j, g.e, 9, skin) + '<circle cx="' + g.e[0].toFixed(1) + '" cy="' + g.e[1].toFixed(1) + '" r="5.4" fill="' + skin + '" stroke="' + OUT + '" stroke-width="1"/>';
  }
  function vbFor(key) {
    var m = M[key]; if (m.vb) return m.vb;
    var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    function add(pt, r) { x1 = Math.min(x1, pt[0] - r); x2 = Math.max(x2, pt[0] + r); y1 = Math.min(y1, pt[1] - r); y2 = Math.max(y2, pt[1] + r); }
    m.frames.forEach(function (f) { var q = limbs(f, m.sg); [q.hip, q.sh, q.an.e, q.af.e, q.ln.e, q.lf.e, q.ln.j, q.lf.j, q.an.j].forEach(function (pt) { add(pt, 12); }); add(q.head, 17); });
    if (m.pbb) { add([m.pbb[0], m.pbb[1]], 0); add([m.pbb[2], m.pbb[3]], 0); }
    if (m.held) { y1 -= 14; x2 += 12; }
    y2 = Math.max(y2, 212);
    var cx = (x1 + x2) / 2, need = (y2 + 14) - (y1 - 12), w = Math.max(x2 - x1 + 56, 250, need * 400 / 252), h = w * 252 / 400;
    var cy = y2 + 14 - h;
    m.vb = [cx - w / 2, cy, w, h].map(function (n) { return Math.round(n * 10) / 10; });
    return m.vb;
  }
  function draw(key, p) {
    var m = M[key], q = limbs(p, m.sg), flat = p.fl === 'flat' || (m.frames[0].fl === 'flat'), held = '';
    if (m.held === 'pack') held = pack([(q.an.e[0] + q.af.e[0]) / 2 + (key === 'row' ? 0 : 10), (q.an.e[1] + q.af.e[1]) / 2 + (key === 'row' ? 12 : 0)]);
    else if (m.held === 'jugs') held = jug(q.af.e) + jug(q.an.e);
    var bx = [q.ln.e[0], q.lf.e[0], q.an.e[0], q.hip[0], q.sh[0]], cx = (Math.min.apply(null, bx) + Math.max.apply(null, bx)) / 2, rx = (Math.max.apply(null, bx) - Math.min.apply(null, bx)) / 2 + 30;
    var s = '<svg viewBox="' + vbFor(key).join(' ') + '" role="img" aria-label="Animated figure showing the move" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="hg" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#F6DCC4"/><stop offset="1" stop-color="' + SK + '"/></radialGradient></defs>' +
      '<rect x="-600" y="-600" width="1600" height="1600" fill="var(--bg)"/>' +
      '<ellipse cx="' + cx.toFixed(0) + '" cy="203" rx="' + Math.min(rx, 170).toFixed(0) + '" ry="7" fill="#000" opacity=".12"/>' +
      '<line x1="-600" y1="200" x2="1000" y2="200" stroke="var(--line)" stroke-width="2"/>' + (m.mat ? MAT : '') + (m.props || '');
    s += leg(q.hip, q.lf, true, flat) + arm(q.sh, q.af, true);
    s += seg(q.hip, q.sh, 26, SHIRT) + '<circle cx="' + q.hip[0].toFixed(1) + '" cy="' + q.hip[1].toFixed(1) + '" r="13" fill="' + SHORTS + '"/>';
    s += leg(q.hip, q.ln, false, flat);
    s += seg(q.sh, q.head, 8, SK, false) + '<circle cx="' + q.head[0].toFixed(1) + '" cy="' + q.head[1].toFixed(1) + '" r="' + L.hr + '" fill="url(#hg)" stroke="' + OUT + '" stroke-width="1.5"/>';
    s += arm(q.sh, q.an, false) + held + '</svg>';
    return s;
  }

  /* ---------- playback ---------- */
  var token = 0;
  var F = {
    keyFor: function (name) { return KEYS[name] || null; },
    svg: function (key, frameIdx) { var m = M[key]; return draw(key, m.frames[frameIdx || 0]); },
    play: function (boxSel, capSel, key) {
      var m = M[key], box = document.querySelector(boxSel), cap = capSel ? document.querySelector(capSel) : null, me = ++token;
      if (!m || !box) return;
      var frames = m.frames, n = frames.length, seg = frames.length === 2 ? 1500 : 1000, hold = 350, t0 = null, lastCap = -1;
      function step(ts) {
        if (me !== token || !document.body.contains(box)) return;
        if (t0 === null) t0 = ts;
        var total = n * (seg + hold), t = (ts - t0) % total, i = Math.floor(t / (seg + hold)), r = t - i * (seg + hold);
        var a = frames[i], b = frames[(i + 1) % n], k = r < hold ? 0 : ease(Math.min(1, (r - hold) / seg));
        box.innerHTML = draw(key, k === 0 ? a : lerpP(a, b, k));
        var ci = k < 0.5 ? i : (i + 1) % n;
        if (cap && ci !== lastCap) { cap.textContent = m.caps[ci] || ''; lastCap = ci; }
        root.requestAnimationFrame(step);
      }
      root.requestAnimationFrame(step);
    },
    stop: function () { token++; },
    keys: function () { return Object.keys(M); }
  };
  root.DSFig = F;
})(window);
