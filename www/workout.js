/* DS Family - Workout Plan data for November 2026. Pure data and helpers, no DOM. */
(function (root) {
  'use strict';
  var U = root.DS;
  var W = {};
  W.START = '2026-11-01';
  W.END = '2026-11-30';

  var NAMES = { A: 'Push + Core', B: 'Pull + Grip', C: 'Core + Stamina', D: 'Full-body Stamina', R: 'Recovery', S: 'Partner Day', X: 'Rest day', T: 'Test day' };
  var PHASES = ['Baseline test', 'Foundation', 'Build', 'Strengthen', 'Peak', 'Retest'];
  var MINS = { A: 45, B: 45, C: 40, D: 40, R: 25, S: 60, T: 30, X: 0 };
  W.NAMES = NAMES;

  /* one entry per day of the program: code A B C D R S X(rest) T(test) */
  W.day = function (ds) {
    var d = U.parseYmd(ds);
    if (!d || d.getFullYear() !== 2026 || d.getMonth() !== 10) return null;
    var n = d.getDate(), dow = d.getDay();
    var code = (n === 1 || n === 30) ? 'T' : ['X', 'A', 'C', 'R', 'B', 'D', 'S'][dow];
    var week = n === 1 ? 0 : n === 30 ? 5 : Math.floor((n - 2) / 7) + 1;
    var time = code === 'X' ? '' : ((dow === 6 || n === 1) ? '15:00' : '19:45');
    var mins = MINS[code];
    if ((code === 'C' || code === 'D') && week === 1) mins = 32;
    return { date: ds, n: n, dow: dow, code: code, week: week, phase: PHASES[week], time: time, mins: mins,
      name: n === 1 ? 'Baseline test' : n === 30 ? 'Retest' : NAMES[code] };
  };
  W.days = function () {
    var out = [];
    for (var n = 1; n <= 30; n++) out.push(W.day('2026-11-' + (n < 10 ? '0' : '') + n));
    return out;
  };

  /* sets, reps and holds by week (index 0 = week 1) */
  var SETS = [2, 3, 3, 3];
  var KIND = { main: [8, 10, 10, 12], alt1: [6, 8, 8, 10], ytw: [6, 7, 7, 8], bridge: [10, 12, 12, 15], hold: [20, 30, 40, 45] };
  var REST = [60, 60, 45, 45];
  var CIRC = { rounds: [2, 3, 3, 3], on: [40, 40, 45, 50], off: [20, 20, 15, 10] };
  function wi(wk) { return Math.min(Math.max(wk, 1), 4) - 1; }
  W.sets = function (wk) { return SETS[wi(wk)]; };
  W.rest = function (wk) { return REST[wi(wk)]; };
  W.dose = function (m, wk) {
    var i = wi(wk);
    return SETS[i] + ' × ' + KIND[m.kind][i] + (m.kind === 'hold' ? ' s' : '');
  };
  W.circuit = function (wk) { var i = wi(wk); return { rounds: CIRC.rounds[i], on: CIRC.on[i], off: CIRC.off[i] }; };

  /* ---------- strength sessions A and B ---------- */
  W.moves = {
    A: [
      { name: 'Incline push-up', kind: 'main', unit: 'sets × reps',
        steps: ['Body in one straight line from head to heels.', 'Elbows about 45° from your ribs.', 'Lower for 2 seconds, then press up.'],
        why: 'pushing strength for lifting a baby out of a cot.', him: 'Hands on a low sofa seat.', her: 'Hands on a table edge.' },
      { name: 'Backpack overhead press', kind: 'main', unit: 'sets × reps',
        steps: ['Hold the pack at your chest with both hands.', 'Squeeze your glutes and keep your ribs down.', 'Press straight up past your ears.'],
        why: 'overhead lifting and shoulder stability.', him: 'Backpack 8 to 10 kg.', her: 'Backpack 3 to 5 kg.' },
      { name: 'Close-grip incline push-up', kind: 'alt1', unit: 'sets × reps',
        steps: ['Hands under your shoulders.', 'Elbows brush your sides on the way down.', 'Press up without letting your hips sag.'],
        why: 'triceps, which finish every push.', him: 'Same height as move 1.', her: 'Same height as move 1.' },
      { name: 'Forearm plank', kind: 'hold', unit: 'sets × seconds',
        steps: ['Elbows under your shoulders.', 'Squeeze glutes and thighs, breathe normally.', 'Look at the floor and keep one straight line.'],
        why: 'a core that stays firm while your arms hold weight.', him: 'Straight body, no sagging.', her: 'Drop to knees if hips sag.' },
      { name: 'Dead bug', kind: 'alt1', unit: 'sets × reps each side',
        steps: ['Lie on your back, lower back flat on the floor.', 'Reach the opposite arm and leg out slowly.', 'Exhale as you reach, return and switch.'],
        why: 'deep core control that protects your lower back.', him: 'Slow, 3 seconds per rep.', her: 'Shorter reach if your back lifts.' },
      { name: 'Glute bridge', kind: 'bridge', unit: 'sets × reps',
        steps: ['Feet flat, knees bent.', 'Push through your heels and lift your hips.', 'Squeeze at the top for 2 seconds.'],
        why: 'light leg and hip work without taxing your legs.', him: 'Bodyweight only.', her: 'Bodyweight only.' }
    ],
    B: [
      { name: 'Backpack bent-over row', kind: 'main', unit: 'sets × reps',
        steps: ['Hinge at the hips with a flat back, knees soft.', 'Pull the pack to your belly button.', 'Elbows go past your ribs, then lower slowly.'],
        why: 'carrying a baby close to your chest.', him: 'Backpack 8 to 10 kg.', her: 'Backpack 3 to 5 kg.' },
      { name: 'Table row', kind: 'alt1', unit: 'sets × reps',
        steps: ['Test that a sturdy dining table is stable first.', 'Lie under it, grip the edge, knees bent.', 'Pull your chest up to the edge.'],
        why: 'upper back and biceps using only your bodyweight.', him: 'Knees bent, feet flat.', her: 'Knees bent, feet closer in.' },
      { name: 'Prone Y-T-W raise', kind: 'ytw', unit: 'sets × reps each shape',
        steps: ['Lie face down, forehead off the floor.', 'Lift your arms into a Y, then a T, then a W.', 'Thumbs up, move slowly.'],
        why: 'posture, so you do not hunch over the baby.', him: 'No weight.', her: 'No weight.' },
      { name: 'Hammer curl', kind: 'main', unit: 'sets × reps',
        steps: ['Elbows pinned to your sides.', 'Thumbs up, curl the weights.', 'Lower for 2 seconds.'],
        why: 'biceps and forearms for cradling.', him: 'Two 5 L jugs.', her: 'Two 1.5 L bottles.' },
      { name: 'Farmer carry', kind: 'hold', unit: 'sets × seconds',
        steps: ['Hold a jug or bottle in each hand.', 'Walk the hallway, shoulders back, ribs down.', 'Do not lean. Turn around and keep walking.'],
        why: 'grip endurance, the thing that runs out first.', him: 'Two 5 L jugs.', her: 'Two 1.5 L bottles.' },
      { name: 'Bird dog', kind: 'alt1', unit: 'sets × reps each side',
        steps: ['On hands and knees, back flat.', 'Reach one arm and the opposite leg long, hips level.', 'Pause 2 seconds, switch sides.'],
        why: 'back and core, with no leg strain.', him: 'Pause 2 seconds.', her: 'Pause 2 seconds.' }
    ]
  };

  /* ---------- stamina circuits C and D (8 stations each) ---------- */
  W.stations = {
    C: [
      { name: 'High-knee march', cue: 'March in place, knees to hip height, swing your arms. Easier: lower knees.' },
      { name: 'Dead bug', cue: 'Back flat on the floor. Opposite arm and leg reach out slowly.' },
      { name: 'Slow mountain climber', cue: 'Hands on the sofa seat, drive one knee at a time toward your chest.' },
      { name: 'Bird dog', cue: 'Reach arm and opposite leg long, hips level. Switch sides every rep.' },
      { name: 'Side plank', cue: 'Forearm down, hips high. Switch sides at the halfway point. Easier: knees down.' },
      { name: 'Plank shoulder tap', cue: 'Hands under shoulders, feet wide. Tap each shoulder without rocking your hips.' },
      { name: 'Shadow boxing', cue: 'Light jabs and crosses, knees soft, fists up. Great arm stamina.' },
      { name: 'Glute bridge march', cue: 'Hold a bridge and lift one foot at a time. Keep your hips level.' }
    ],
    D: [
      { name: 'Incline push-up', cue: 'Hands on the sofa or table. Straight line from head to heels.' },
      { name: 'Backpack row', cue: 'Hinge at the hips, flat back, pull the pack to your belly button.' },
      { name: 'Step jacks', cue: 'Step one foot out at a time with arms overhead. No jumping.' },
      { name: 'Baby-hold march', cue: 'Hug the backpack to your chest like a baby and march in place. Stay tall.' },
      { name: 'Plank reach', cue: 'In a high plank, reach one arm forward at a time. Hips stay still.' },
      { name: 'Low step-up', cue: 'Use the bottom stair. Step up, stand tall, step down. Switch legs halfway.' },
      { name: 'Farmer march', cue: 'Hold a jug or bottle in each hand and march in place. Shoulders back.' },
      { name: 'Prone Y raise', cue: 'Face down, lift both arms into a Y, thumbs up. Pause at the top.' }
    ]
  };

  /* ---------- Saturday partner day and Wednesday recovery ---------- */
  W.saturday = function (wk) {
    var i = wi(wk), reps = KIND.main[i], tap = [20, 25, 25, 30][i];
    var him = [3, 4, 5, 6][i], her = [3, 3.5, 4, 4.5][i];
    return [
      { at: '3:00', len: '8 min', name: 'Warm-up together', cue: 'The same 8-minute warm-up as every session.' },
      { at: '3:08', len: '12 min', name: 'Push-pull superset', cue: '3 rounds: ' + reps + ' incline push-ups then ' + reps + ' backpack rows, with no rest between the two and 60 s rest after. Backpack 8 to 10 kg for him, 3 to 5 kg for her.' },
      { at: '3:20', len: '10 min', name: 'Baby-hold practice', cue: 'Hold a bag in the crook of one arm like a baby. Stand tall, sway gently for 60 s, switch arms. 4 rounds each side. This week: ' + him + ' kg for him, ' + her + ' kg for her.' },
      { at: '3:30', len: '6 min', name: 'Partner plank taps', cue: 'Face each other in a high plank and tap hands. 3 rounds of ' + tap + ' s on with 30 s rest. Drop to knees whenever hips sag.' },
      { at: '3:36', len: '15 min', name: 'Easy walk together', cue: 'Chat pace, indoors on the spot or in the shade. It builds your stamina base without tiring your legs.' },
      { at: '3:51', len: '9 min', name: 'Cool-down and breathing', cue: 'The 6-minute cool-down, then 3 more minutes of slow belly breathing side by side.' }
    ];
  };
  W.recovery = [
    { at: '7:45', len: '10 min', name: 'Easy walk or march', cue: 'Walk around the house or march in place at a pace where you could sing along.' },
    { at: '7:55', len: '8 min', name: 'Mobility flow', cue: 'Cat-cow 10 reps, thread-the-needle 5 each side, hip circles 10 each way, wall slides 10 reps, shoulder rolls 10 each way.' },
    { at: '8:03', len: '5 min', name: 'Breathing and pelvic floor', cue: 'Lie on your back, knees bent. Breathe into your belly for 2 minutes. Then gently squeeze the muscles you would use to stop urine flow for 3 s, release fully for 3 s, 10 times.' },
    { at: '8:08', len: '2 min', name: 'Forearm and wrist stretch', cue: 'Arm straight, palm up, gently pull the fingers back 30 s each side, then palm down 30 s each side. These are your holding muscles.' }
  ];

  W.warmup = [
    { len: '2:00', name: 'March in place', cue: 'Swing your arms and lift your knees a little higher each 30 seconds.' },
    { len: '1:00', name: 'Arm circles and shoulder rolls', cue: '30 s of each, big and slow.' },
    { len: '1:00', name: 'Cat-cow', cue: '10 slow reps on hands and knees, breathing with the movement.' },
    { len: '1:00', name: 'Wall slides', cue: 'Back to the wall, slide your arms up and down like a goalpost. 10 reps.' },
    { len: '1:00', name: 'Hip circles', cue: 'Hands on hips, 30 s each direction.' },
    { len: '1:00', name: 'Glute bridge', cue: '10 reps, pause at the top.' },
    { len: '1:00', name: 'Easy step jacks', cue: 'Step out, arms overhead, no jumping. Heart rate rising.' }
  ];
  W.cooldown = [
    { len: '1:00', name: 'Doorway chest stretch', cue: 'Forearm on the door frame, step through. 30 s each side.' },
    { len: '1:00', name: "Child's pose", cue: 'Sit back on your heels, arms long, breathe into your back.' },
    { len: '1:00', name: 'Thread-the-needle', cue: 'On hands and knees, slide one arm under the other. 30 s each side.' },
    { len: '1:00', name: 'Forearm stretch', cue: 'Arm straight, palm up, gently pull the fingers back. 30 s each side.' },
    { len: '2:00', name: 'Belly breathing', cue: 'Lie down, one hand on your belly. Breathe in for 4, out for 6, so your heart rate settles.' }
  ];

  /* ---------- test days (Nov 1 and Nov 30) ---------- */
  W.tests = [
    { id: 'push', name: 'Incline push-ups', how: 'Max in a row, hands on the sofa or table', unit: 'reps', type: 'num' },
    { id: 'plank', name: 'Forearm plank', how: 'Hold until your form breaks', unit: 'min : sec', type: 'time' },
    { id: 'carry', name: 'Farmer carry', how: 'Walk holding the jugs or bottles', unit: 'min : sec', type: 'time' },
    { id: 'march', name: '2-minute march', how: 'Count your knee raises', unit: 'knee raises', type: 'num' }
  ];
  W.parseVal = function (type, s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return null;
    var m = /^(\d+):(\d{1,2})$/.exec(s);
    if (type === 'time' && m) return +m[1] * 60 + +m[2];
    var d = s.replace(/[^\d]/g, '');
    return d ? parseInt(d, 10) : null;
  };
  W.diff = function (type, a, b) {      // retest minus baseline, as text
    var x = W.parseVal(type, a), y = W.parseVal(type, b);
    if (x == null || y == null) return '';
    var d = y - x, sign = d > 0 ? '+' : d < 0 ? '−' : '';
    d = Math.abs(d);
    if (type === 'time') return sign + Math.floor(d / 60) + ':' + ('0' + (d % 60)).slice(-2);
    return sign + d;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = W;
  else root.DSW = W;
})(typeof window !== 'undefined' ? window : globalThis);
