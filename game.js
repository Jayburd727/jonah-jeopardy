// ============================================================
//  JONAH JEOPARDY — GAME LOGIC
//  (Questions live in questions.js)
// ============================================================

const SAVE_KEY = "jonahJeopardySave.v1";
const DEFAULT_TEAM_NAMES = ["Sailors", "Ninevites", "Big Fish", "Tarshish Travelers", "Sackcloth Squad", "Joppa Jumpers"];
const CLUE_SECONDS = 15;
const FINAL_SECONDS = 30;

const $ = (id) => document.getElementById(id);

let state = null;
let current = null;      // { c, r, key } for the open clue
let soundOn = true;
let setupTeamCount = 3;
let ddPickedTeam = null;

// ------------------------------------------------------------
//  Save / load
// ------------------------------------------------------------
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadSaved() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function newState(teamNames) {
  // Pick random Daily Double spots (never in the top 100-point row)
  const spots = [];
  CATEGORIES.forEach((cat, c) => cat.clues.forEach((_, r) => { if (r > 0) spots.push(`${c}-${r}`); }));
  spots.sort(() => Math.random() - 0.5);

  return {
    teams: teamNames.map((name) => ({ name })),
    used: {},
    results: {},          // key -> { teamIndex: 1 | -1 }
    dailyDoubles: spots.slice(0, DAILY_DOUBLE_COUNT),
    ddWagers: {},         // key -> { team, wager }
    adjust: teamNames.map(() => 0),
    final: { locked: false, wagers: teamNames.map(() => 0), results: {} },
  };
}

// ------------------------------------------------------------
//  Scoring
// ------------------------------------------------------------
function clueValue(key) {
  const r = Number(key.split("-")[1]);
  return POINT_VALUES[r];
}

function boardScore(i) {
  let total = state.adjust[i] || 0;
  for (const key in state.results) {
    const res = state.results[key][i];
    if (!res) continue;
    const dd = state.ddWagers[key];
    if (dd) { if (dd.team === i) total += res * dd.wager; }
    else total += res * clueValue(key);
  }
  return total;
}

function totalScore(i) {
  const fr = state.final.results[i];
  return boardScore(i) + (fr ? fr * state.final.wagers[i] : 0);
}

function maxWager(i) {
  // Like the real show: you can always bet at least the top board value
  return Math.max(boardScore(i), POINT_VALUES[POINT_VALUES.length - 1]);
}

// ------------------------------------------------------------
//  Sound (all synthesized — no audio files needed)
// ------------------------------------------------------------
let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, start, dur, { type = "sine", vol = 0.2, slideTo = null } = {}) {
  const ac = ctx();
  if (!ac || !soundOn) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const sfx = {
  open()   { tone(250, 0, 0.3, { type: "triangle", slideTo: 900, vol: 0.15 }); },
  reveal() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.3, { type: "triangle", vol: 0.18 })); },
  right()  { tone(880, 0, 0.15, { vol: 0.25 }); tone(1319, 0.12, 0.4, { vol: 0.25 }); },
  wrong()  { tone(140, 0, 0.55, { type: "sawtooth", vol: 0.18 }); tone(147, 0, 0.55, { type: "sawtooth", vol: 0.12 }); },
  tick()   { tone(1200, 0, 0.05, { type: "square", vol: 0.06 }); },
  timesUp(){ [0, 0.22, 0.44].forEach((s) => tone(220, s, 0.18, { type: "square", vol: 0.15 })); },
  dd() {
    [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.06, 0.25, { type: "triangle", vol: 0.15 }));
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.55 + i * 0.09, 0.5, { vol: 0.12 }));
  },
  win() {
    const notes = [[392, 0, .18], [523, .18, .18], [659, .36, .18], [784, .54, .45], [659, .99, .18], [784, 1.17, .9]];
    notes.forEach(([f, s, d]) => { tone(f, s, d, { type: "triangle", vol: 0.2 }); tone(f / 2, s, d, { vol: 0.1 }); });
  },
};

// ------------------------------------------------------------
//  Intro music (intro.mp3 in the game folder)
// ------------------------------------------------------------
const MUSIC_PREF_KEY = "jonahJeopardyMusic";
let musicOn = (() => { try { return localStorage.getItem(MUSIC_PREF_KEY) !== "off"; } catch (e) { return true; } })();

const intro = new Audio("intro.mp3");
intro.preload = "auto";
let introFade = null;

function playIntro() {
  if (!musicOn) return;
  clearInterval(introFade);
  intro.volume = 1;
  intro.currentTime = 0;
  intro.play().catch(() => {});   // missing file or blocked autoplay: just stay quiet
}

function fadeOutIntro() {
  if (intro.paused) return;
  clearInterval(introFade);
  introFade = setInterval(() => {
    intro.volume = Math.max(0, intro.volume - 0.08);
    if (intro.volume <= 0) { clearInterval(introFade); intro.pause(); }
  }, 60);
}

function toggleMusic() {
  musicOn = !musicOn;
  try { localStorage.setItem(MUSIC_PREF_KEY, musicOn ? "on" : "off"); } catch (e) {}
  updateMusicButtons();
  if (musicOn) playIntro();
  else fadeOutIntro();
}

function updateMusicButtons() {
  document.querySelectorAll(".music-btn").forEach((b) => {
    b.classList.toggle("off", !musicOn);
    b.title = musicOn ? "Intro music on (M)" : "Intro music off (M)";
  });
}

// ------------------------------------------------------------
//  Timer
// ------------------------------------------------------------
let timerRAF = null;
function startTimer(barEl, seconds, onDone = null) {
  stopTimer();
  const wrap = barEl.parentElement;
  wrap.classList.add("on");
  const start = performance.now();
  let lastTick = -1;
  const step = (now) => {
    const elapsed = (now - start) / 1000;
    const left = Math.max(0, seconds - elapsed);
    barEl.style.transform = `scaleX(${left / seconds})`;
    barEl.classList.toggle("low", left <= 5);
    const whole = Math.ceil(left);
    if (left <= 5 && whole !== lastTick && left > 0) { lastTick = whole; sfx.tick(); }
    if (left <= 0) { if (onDone) onDone(); sfx.timesUp(); timerRAF = null; return; }
    timerRAF = requestAnimationFrame(step);
  };
  timerRAF = requestAnimationFrame(step);
}
function stopTimer() {
  if (timerRAF) cancelAnimationFrame(timerRAF);
  timerRAF = null;
  document.querySelectorAll(".timer-wrap").forEach((w) => w.classList.remove("on"));
  document.querySelectorAll(".timer-bar").forEach((b) => { b.style.transform = "scaleX(1)"; b.classList.remove("low"); });
}

// ------------------------------------------------------------
//  Setup screen
// ------------------------------------------------------------
function renderLogo() {
  const logo = $("logo");
  logo.innerHTML = "";
  GAME_TITLE.split(" ").forEach((word, wi) => {
    if (wi) logo.appendChild(document.createElement("br"));
    [...word].forEach((ch, i) => {
      const s = document.createElement("span");
      s.textContent = ch;
      s.style.animationDelay = `${(wi * 6 + i) * 0.12}s`;
      logo.appendChild(s);
    });
  });
  $("subtitle").textContent = GAME_SUBTITLE;
}

function renderTeamInputs() {
  const box = $("teamInputs");
  const existing = [...box.querySelectorAll("input")].map((inp) => inp.value);
  box.innerHTML = "";
  for (let i = 0; i < setupTeamCount; i++) {
    const inp = document.createElement("input");
    inp.maxLength = 22;
    inp.value = existing[i] ?? DEFAULT_TEAM_NAMES[i];
    inp.setAttribute("aria-label", `Team ${i + 1} name`);
    box.appendChild(inp);
  }
  $("teamCountLabel").textContent = setupTeamCount;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}

function startGame() {
  const names = [...$("teamInputs").querySelectorAll("input")].map((inp, i) => inp.value.trim() || `Team ${i + 1}`);
  state = newState(names);
  save();
  ctx();
  sfx.reveal();
  enterBoard();
}

function enterBoard() {
  showScreen("boardScreen");
  renderBoard();
  renderScores();
}

// ------------------------------------------------------------
//  Board + scoreboard
// ------------------------------------------------------------
function renderBoard() {
  $("boardTitle").textContent = `${GAME_TITLE} · ${GAME_SUBTITLE}`;
  const board = $("board");
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${CATEGORIES.length}, 1fr)`;
  board.style.gridTemplateRows = `1.15fr repeat(${POINT_VALUES.length}, 1fr)`;

  CATEGORIES.forEach((cat) => {
    const el = document.createElement("div");
    el.className = "cat";
    el.textContent = cat.name;
    board.appendChild(el);
  });

  POINT_VALUES.forEach((val, r) => {
    CATEGORIES.forEach((_, c) => {
      const key = `${c}-${r}`;
      const el = document.createElement("div");
      el.className = "tile" + (state.used[key] ? " used" : "");
      el.textContent = val;
      el.addEventListener("click", () => openClue(c, r));
      board.appendChild(el);
    });
  });

  const total = CATEGORIES.length * POINT_VALUES.length;
  $("finalBtn").classList.toggle("ready", Object.keys(state.used).length >= total);
}

function renderScores(bumpTeam = null) {
  const box = $("scoreboard");
  box.innerHTML = "";
  const scores = state.teams.map((_, i) => totalScore(i));
  const best = Math.max(...scores);
  state.teams.forEach((team, i) => {
    const card = document.createElement("div");
    card.className = "score-card";
    if (best > 0 && scores[i] === best) card.classList.add("leader");
    if (bumpTeam === i) card.classList.add("bump");
    card.title = "Click to adjust score";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = team.name;
    const pts = document.createElement("div");
    pts.className = "pts" + (scores[i] < 0 ? " neg" : "");
    pts.textContent = scores[i].toLocaleString();
    card.append(name, pts);
    card.addEventListener("click", () => adjustScore(i));
    box.appendChild(card);
  });
}

function adjustScore(i) {
  const input = prompt(`Adjust ${state.teams[i].name}'s score by how much?\n(e.g. 100 or -200)`, "100");
  if (input === null) return;
  const n = parseInt(input, 10);
  if (Number.isNaN(n)) return;
  state.adjust[i] += n;
  save();
  renderScores(i);
}

// ------------------------------------------------------------
//  Clue overlay
// ------------------------------------------------------------
function openClue(c, r) {
  const key = `${c}-${r}`;
  const clue = CATEGORIES[c].clues[r];
  current = { c, r, key };
  stopTimer();
  fadeOutIntro();

  $("clueCategory").textContent = CATEGORIES[c].name;
  $("clueText").textContent = clue.q;
  $("answerText").textContent = clue.a;
  $("answerRef").textContent = clue.ref || "";
  $("answerBox").classList.add("hidden");

  const overlay = $("clueOverlay");
  overlay.classList.remove("hidden");
  // restart the zoom animation
  overlay.style.animation = "none"; void overlay.offsetWidth; overlay.style.animation = "";

  const isDD = state.dailyDoubles.includes(key);
  if (isDD && !state.ddWagers[key]) {
    showDailyDouble();
    return;
  }

  showClueStage();
  if (state.used[key]) {
    // Re-opening a finished clue: show the answer so scoring can be fixed
    $("answerBox").classList.remove("hidden");
  } else {
    sfx.open();
  }
}

function showClueStage() {
  const { key } = current;
  const dd = state.ddWagers[key];
  $("clueValue").textContent = dd ? `Daily Double · ${dd.wager.toLocaleString()}` : clueValue(key);
  $("ddStage").classList.add("hidden");
  $("clueStage").classList.remove("hidden");
  document.querySelector(".clue-controls").classList.remove("hidden");
  renderJudgeButtons();
}

function renderJudgeButtons() {
  const { key } = current;
  const box = $("scoreButtons");
  box.innerHTML = "";
  box.classList.remove("hidden");
  const dd = state.ddWagers[key];
  const res = state.results[key] || {};

  state.teams.forEach((team, i) => {
    if (dd && dd.team !== i) return;
    const wrap = document.createElement("div");
    wrap.className = "team-judge";
    const name = document.createElement("span");
    name.className = "tname";
    name.textContent = team.name;
    const right = document.createElement("button");
    right.className = "judge-btn right" + (res[i] === 1 ? " on" : "");
    right.textContent = "✓";
    right.title = "Correct";
    right.addEventListener("click", () => judge(i, 1));
    const wrong = document.createElement("button");
    wrong.className = "judge-btn wrong" + (res[i] === -1 ? " on" : "");
    wrong.textContent = "✗";
    wrong.title = "Wrong";
    wrong.addEventListener("click", () => judge(i, -1));
    wrap.append(name, right, wrong);
    box.appendChild(wrap);
  });
}

function judge(team, value) {
  const { key } = current;
  const res = state.results[key] || (state.results[key] = {});
  if (res[team] === value) {
    delete res[team];          // clicking again undoes it
  } else {
    res[team] = value;
    value === 1 ? sfx.right() : sfx.wrong();
    if (value === 1) { stopTimer(); revealAnswer(true); }
  }
  save();
  renderJudgeButtons();
  renderScores(team);
}

function revealAnswer(silent = false) {
  const box = $("answerBox");
  if (!box.classList.contains("hidden")) return;
  stopTimer();
  box.classList.remove("hidden");
  if (!silent) sfx.reveal();
}

function closeClue() {
  if (!current) return;
  stopTimer();
  const { key } = current;
  // A Daily Double closed before wagering stays on the board
  if (!state.dailyDoubles.includes(key) || state.ddWagers[key]) state.used[key] = true;
  current = null;
  save();
  $("clueOverlay").classList.add("hidden");
  renderBoard();
  renderScores();
}

// ------------------------------------------------------------
//  Daily Double
// ------------------------------------------------------------
function showDailyDouble() {
  $("clueValue").textContent = "";
  $("clueStage").classList.add("hidden");
  document.querySelector(".clue-controls").classList.add("hidden");
  const stage = $("ddStage");
  stage.classList.remove("hidden");
  // restart animations
  stage.querySelectorAll(".dd-title, .dd-wager").forEach((el) => {
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  });
  sfx.dd();
  confetti(1500, 90);

  ddPickedTeam = null;
  const teamsBox = $("ddTeams");
  teamsBox.innerHTML = "";
  state.teams.forEach((team, i) => {
    const b = document.createElement("button");
    b.className = "pill";
    b.textContent = `${team.name} (${boardScore(i)})`;
    b.addEventListener("click", () => {
      ddPickedTeam = i;
      teamsBox.querySelectorAll(".pill").forEach((p, j) => p.classList.toggle("on", j === i));
      $("ddMax").textContent = `(0 – ${maxWager(i).toLocaleString()})`;
      $("ddWagerInput").max = maxWager(i);
      $("ddWagerInput").focus();
    });
    teamsBox.appendChild(b);
  });
  $("ddMax").textContent = "";
  $("ddWagerInput").value = "";
}

function lockDailyDouble() {
  if (ddPickedTeam === null) { alert("Pick which team is playing the Daily Double!"); return; }
  const max = maxWager(ddPickedTeam);
  let wager = parseInt($("ddWagerInput").value, 10);
  if (Number.isNaN(wager) || wager < 0) { alert("Enter a wager."); return; }
  if (wager > max) { alert(`The most this team can wager is ${max}.`); return; }
  state.ddWagers[current.key] = { team: ddPickedTeam, wager };
  save();
  sfx.open();
  showClueStage();
}

// ------------------------------------------------------------
//  Final Jeopardy
// ------------------------------------------------------------
function openFinal() {
  const remaining = CATEGORIES.length * POINT_VALUES.length - Object.keys(state.used).length;
  if (remaining > 0 && !state.final.locked &&
      !confirm(`There are still ${remaining} clues on the board. Go to Final Jeopardy anyway?`)) return;

  fadeOutIntro();
  const ov = $("finalOverlay");
  ov.classList.remove("hidden");
  ov.style.animation = "none"; void ov.offsetWidth; ov.style.animation = "";
  $("finalCategory").textContent = FINAL_JEOPARDY.category;
  $("finalCatSmall").textContent = FINAL_JEOPARDY.category;
  $("finalClueText").textContent = FINAL_JEOPARDY.q;
  $("finalAnswerText").textContent = FINAL_JEOPARDY.a;
  $("finalAnswerRef").textContent = FINAL_JEOPARDY.ref || "";

  if (state.final.locked) {
    showFinalClue(true);
    return;
  }

  $("finalCatStage").classList.remove("hidden");
  $("finalClueStage").classList.add("hidden");
  const box = $("finalWagers");
  box.innerHTML = "";
  state.teams.forEach((team, i) => {
    const label = document.createElement("label");
    const name = document.createElement("span");
    name.textContent = team.name;
    const inp = document.createElement("input");
    inp.type = "number"; inp.min = 0; inp.step = 100; inp.max = maxWager(i);
    inp.inputMode = "numeric";
    inp.value = state.final.wagers[i] || "";
    inp.dataset.team = i;
    const hint = document.createElement("small");
    hint.textContent = `max ${maxWager(i).toLocaleString()}`;
    label.append(name, inp, hint);
    box.appendChild(label);
  });
  sfx.dd();
}

function lockFinalWagers() {
  const inputs = [...$("finalWagers").querySelectorAll("input")];
  for (const inp of inputs) {
    const i = Number(inp.dataset.team);
    const w = parseInt(inp.value || "0", 10);
    const max = maxWager(i);
    if (Number.isNaN(w) || w < 0 || w > max) {
      alert(`${state.teams[i].name}'s wager must be between 0 and ${max}.`);
      inp.focus();
      return;
    }
    state.final.wagers[i] = w;
  }
  state.final.locked = true;
  save();
  showFinalClue(false);
}

function showFinalClue(resumed) {
  $("finalCatStage").classList.add("hidden");
  $("finalClueStage").classList.remove("hidden");
  const revealed = resumed && Object.keys(state.final.results).length > 0;
  $("finalAnswerBox").classList.toggle("hidden", !revealed);
  $("finalJudging").classList.toggle("hidden", !revealed);
  $("finalWinnerBtn").classList.toggle("hidden", !revealed);
  $("finalRevealBtn").classList.toggle("hidden", revealed);
  renderFinalJudging();
  if (!resumed) sfx.open();
}

function revealFinal() {
  stopTimer();
  sfx.reveal();
  $("finalAnswerBox").classList.remove("hidden");
  $("finalJudging").classList.remove("hidden");
  $("finalWinnerBtn").classList.remove("hidden");
  $("finalRevealBtn").classList.add("hidden");
}

function renderFinalJudging() {
  const box = $("finalJudging");
  box.innerHTML = "";
  state.teams.forEach((team, i) => {
    const wrap = document.createElement("div");
    wrap.className = "team-judge";
    const name = document.createElement("span");
    name.className = "tname";
    name.textContent = `${team.name} · ${state.final.wagers[i]}`;
    const res = state.final.results[i];
    const right = document.createElement("button");
    right.className = "judge-btn right" + (res === 1 ? " on" : "");
    right.textContent = "✓";
    right.addEventListener("click", () => judgeFinal(i, 1));
    const wrong = document.createElement("button");
    wrong.className = "judge-btn wrong" + (res === -1 ? " on" : "");
    wrong.textContent = "✗";
    wrong.addEventListener("click", () => judgeFinal(i, -1));
    wrap.append(name, right, wrong);
    box.appendChild(wrap);
  });
}

function judgeFinal(i, value) {
  if (state.final.results[i] === value) delete state.final.results[i];
  else { state.final.results[i] = value; value === 1 ? sfx.right() : sfx.wrong(); }
  save();
  renderFinalJudging();
}

function showWinner() {
  stopTimer();
  $("finalOverlay").classList.add("hidden");
  const ranked = state.teams
    .map((t, i) => ({ name: t.name, score: totalScore(i) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0].score;
  const winners = ranked.filter((t) => t.score === top).map((t) => t.name);
  $("winnerName").textContent = winners.join(" & ");
  const standings = $("finalStandings");
  standings.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉"];
  ranked.forEach((t, idx) => {
    const d = document.createElement("div");
    d.textContent = `${medals[idx] || "🐟"} ${t.name}: ${t.score.toLocaleString()}`;
    standings.appendChild(d);
  });
  $("teaser").textContent = FINAL_JEOPARDY.teaser || "";
  const ov = $("winnerOverlay");
  ov.classList.remove("hidden");
  ov.querySelectorAll(".winner-name, .teaser").forEach((el) => {
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  });
  sfx.win();
  confetti(7000, 260);
  renderScores();
}

// ------------------------------------------------------------
//  Confetti (with fish!)
// ------------------------------------------------------------
let confettiRAF = null;
function confetti(duration = 5000, count = 200) {
  const canvas = $("confetti");
  const c2d = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ["#ffcc00", "#ffffff", "#0ea5e9", "#22c55e", "#f472b6", "#060ce9"];
  const emoji = ["🐟", "🐠", "🐡", "🌊"];
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.6,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.25,
    size: 6 + Math.random() * 8,
    color: colors[(Math.random() * colors.length) | 0],
    emoji: Math.random() < 0.12 ? emoji[(Math.random() * emoji.length) | 0] : null,
  }));

  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  const start = performance.now();
  const frame = (now) => {
    const t = now - start;
    c2d.clearRect(0, 0, innerWidth, innerHeight);
    const fade = t > duration - 800 ? Math.max(0, (duration - t) / 800) : 1;
    c2d.globalAlpha = fade;
    for (const p of parts) {
      p.x += p.vx + Math.sin((t / 400) + p.rot) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > innerHeight + 30 && t < duration - 1500) { p.y = -20; p.x = Math.random() * innerWidth; }
      c2d.save();
      c2d.translate(p.x, p.y);
      c2d.rotate(p.rot);
      if (p.emoji) {
        c2d.font = `${p.size * 3}px serif`;
        c2d.fillText(p.emoji, -p.size, p.size);
      } else {
        c2d.fillStyle = p.color;
        c2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      c2d.restore();
    }
    if (t < duration) confettiRAF = requestAnimationFrame(frame);
    else { c2d.clearRect(0, 0, innerWidth, innerHeight); confettiRAF = null; }
  };
  confettiRAF = requestAnimationFrame(frame);
}

// ------------------------------------------------------------
//  Misc controls
// ------------------------------------------------------------
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
}

function newGame() {
  if (!confirm("Start a brand new game? Current scores will be erased.")) return;
  clearSave();
  state = null;
  $("resumeBtn").classList.add("hidden");
  showScreen("setup");
}

// ------------------------------------------------------------
//  Wire up events
// ------------------------------------------------------------
function init() {
  renderLogo();
  renderTeamInputs();

  const saved = loadSaved();
  if (saved && saved.teams) $("resumeBtn").classList.remove("hidden");

  $("teamMinus").onclick = () => { setupTeamCount = Math.max(1, setupTeamCount - 1); renderTeamInputs(); };
  $("teamPlus").onclick = () => { setupTeamCount = Math.min(6, setupTeamCount + 1); renderTeamInputs(); };
  $("startBtn").onclick = startGame;
  $("resumeBtn").onclick = () => { state = loadSaved(); if (state) enterBoard(); };

  $("finalBtn").onclick = openFinal;
  $("fsBtn").onclick = toggleFullscreen;
  $("newGameBtn").onclick = newGame;
  $("soundBtn").onclick = () => { soundOn = !soundOn; $("soundBtn").textContent = soundOn ? "🔊" : "🔇"; };

  $("revealBtn").onclick = () => revealAnswer();
  $("backBtn").onclick = closeClue;
  $("timerBtn").onclick = () => startTimer($("timerBar"), CLUE_SECONDS);
  $("ddGoBtn").onclick = lockDailyDouble;
  $("ddWagerInput").addEventListener("keydown", (e) => { if (e.key === "Enter") lockDailyDouble(); });

  $("finalShowClueBtn").onclick = lockFinalWagers;
  $("finalTimerBtn").onclick = () => {
    startTimer($("finalTimerBar"), FINAL_SECONDS);
  };
  $("finalRevealBtn").onclick = revealFinal;
  $("finalWinnerBtn").onclick = showWinner;
  $("finalCloseBtn").onclick = () => { stopTimer(); $("finalOverlay").classList.add("hidden"); renderScores(); };

  document.querySelectorAll(".music-btn").forEach((b) => (b.onclick = toggleMusic));
  updateMusicButtons();

  // Browsers only allow audio after the first click, so start the intro then
  const kickoff = (e) => {
    document.removeEventListener("pointerdown", kickoff);
    if (e.target.closest(".music-btn")) return;
    playIntro();
  };
  document.addEventListener("pointerdown", kickoff);
  $("winnerCloseBtn").onclick = () => $("winnerOverlay").classList.add("hidden");

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const clueOpen = !$("clueOverlay").classList.contains("hidden");
    const clueVisible = clueOpen && !$("clueStage").classList.contains("hidden");
    if (e.key === "f" || e.key === "F") toggleFullscreen();
    else if (e.key === "m" || e.key === "M") toggleMusic();
    else if ((e.key === "Escape" || e.key === "b" || e.key === "B") && clueOpen) closeClue();
    else if (e.key === " " && clueVisible) { e.preventDefault(); revealAnswer(); }
    else if ((e.key === "t" || e.key === "T") && clueVisible) startTimer($("timerBar"), CLUE_SECONDS);
  });
}

init();
