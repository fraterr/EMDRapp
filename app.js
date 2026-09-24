"use strict";
const $ = (s, r = document) => r.querySelector(s);
const icons = {
  moon: '<path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  session:
    '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8 12h8m-5-3-3 3 3 3m2-6 3 3-3 3"/>',
  chart: '<path d="M4 4v16h16M8 15v-4m5 4V7m5 8V4"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1v1m0 3h.01"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  expand: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sliders:
    '<path d="M4 7h7m4 0h5M4 17h3m4 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.info}</svg>`;
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const KEY = "emdr_session_history";
const themeMedia = matchMedia("(prefers-color-scheme: dark)");
let explicitTheme = null;
try {
  const savedTheme = localStorage.getItem("emdr_theme");
  if (["light", "dark"].includes(savedTheme)) explicitTheme = savedTheme;
} catch {}
function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = dark ? "#10131c" : "#f7f8fc";
  $("#theme-toggle").setAttribute("aria-pressed", String(dark));
  $("#theme-toggle").setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode",
  );
  $("#theme-label").textContent = dark ? "Light mode" : "Dark mode";
  $("#theme-icon").innerHTML = icon(dark ? "sun" : "moon");
}
themeMedia.addEventListener("change", (event) => {
  if (!explicitTheme) applyTheme(event.matches ? "dark" : "light");
});
applyTheme(explicitTheme || (themeMedia.matches ? "dark" : "light"));
const steps = [
  "Preparation",
  "Check-in",
  "Stimulation",
  "Breathing",
  "Reflection",
];
const sensory = [
  ["images", "Images", "What images do you notice?"],
  ["sounds", "Sounds", "What sounds do you remember?"],
  ["tactile", "Body", "What sensations do you notice in your body?"],
  ["tastes", "Tastes", "Do you notice a particular taste?"],
  ["smells", "Smells", "Do you notice a particular smell?"],
];
const tapping = [
  [
    "Side of hand",
    "karate chop.jpg",
    "The outer edge of your hand, below your little finger.",
  ],
  ["Top of head", "Top head.jpg", "The centre of the top of your head."],
  ["Eyebrow", "eyebrows.jpg", "The start of your eyebrow, near your nose."],
  [
    "Side of eye",
    "side eye.jpg",
    "The bone beside the outer corner of your eye.",
  ],
  [
    "Under eye",
    "under eye.jpg",
    "The bone directly below the centre of your eye.",
  ],
  [
    "Under nose",
    "under nose.jpg",
    "The space between your nose and upper lip.",
  ],
  ["Chin", "chin point.jpg", "The crease between your lower lip and chin."],
  ["Collarbone", "collarbone.jpg", "The area just below your collarbone."],
  ["Under arm", "under arm.jpg", "The side of your chest, below your armpit."],
];
const gamut = [
  "Open your eyes.",
  "Close your eyes.",
  "Open your eyes and look down to the left, keeping your head still.",
  "Look down to the right.",
  "Move your eyes in a circle.",
  "Repeat the circle in the opposite direction.",
  "Hum a few notes.",
  "Count from 1 to 5, then from 5 to 1.",
  "Hum again.",
];
const state = {
  view: "home",
  route: "prepare",
  active: false,
  duration: 90,
  speed: 3,
  sound: false,
  advanced: false,
  pattern: "dynamic",
  hugEnabled: true,
  initial: null,
  final: null,
  set: 1,
  sensory: {},
  sensoryIndex: 0,
  tap: 0,
  gamut: [],
  reflect: 0,
  saved: false,
  history: [],
  storageMessage: "",
};
let frame = 0,
  lastTime = null,
  elapsed = 0,
  previewElapsed = 0,
  previewAngle = 0,
  angle = 0,
  running = false,
  preview = false,
  breathTime = 0,
  audioContext = null,
  toastTimeout,
  trackerWidth = 0;
let hugDemo = false,
  demoElapsed = 0;
const TAP_INTERVAL = 900;
const observer = new ResizeObserver((entries) => {
  trackerWidth = entries[0].contentRect.width;
});
function readHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) throw Error();
    state.history = raw
      .filter(
        (x) =>
          x &&
          typeof x.date === "string" &&
          x.date.length < 150 &&
          Number.isInteger(x.initial) &&
          x.initial >= 1 &&
          x.initial <= 10 &&
          Number.isInteger(x.final) &&
          x.final >= 1 &&
          x.final <= 10,
      )
      .slice(0, 20);
  } catch {
    state.history = [];
    state.storageMessage =
      "Your local journal is unavailable or could not be read. You can still use the session.";
  }
}
readHistory();
function toast(message) {
  clearTimeout(toastTimeout);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    5000,
  );
}
function modal(title, body) {
  $("#dialog-content").innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  $("#dialog").setAttribute("aria-labelledby", "dialog-title");
  $("#dialog").showModal();
}
function stopMotion() {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = null;
  running = false;
  preview = false;
  hugDemo = false;
  observer.disconnect();
}
function clearSession() {
  Object.assign(state, {
    active: false,
    route: "prepare",
    initial: null,
    final: null,
    set: 1,
    sensory: {},
    sensoryIndex: 0,
    tap: 0,
    gamut: [],
    reflect: 0,
    saved: false,
  });
  elapsed = 0;
  angle = 0;
}
function stepIndex() {
  return (
    {
      prepare: 0,
      before: 1,
      sensory: 1,
      tapping: 1,
      gamut: 1,
      butterfly: 2,
      stimulation: 2,
      breath: 3,
      reflection: 4,
      after: 4,
      summary: 4,
      finish: 4,
    }[state.route] || 0
  );
}
function header(title, desc, kicker = "YOUR SESSION") {
  return `<div class="step-heading"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div>`;
}
function button(label, action, primary = false, extra = "") {
  return `<button class="button ${primary ? "primary" : "secondary"}" data-action="${action}" ${extra}>${label}${primary ? icon("arrow") : ""}</button>`;
}
function actions(back, next, label = "Continue", disabled = false) {
  return `<div class="step-actions">${back ? button("Back", back) : ""}<button class="text-button end-action" data-action="end">Finish here</button>${button(label, next, true, disabled ? "disabled" : "")}</div>`;
}
function notice() {
  return `<div class="notice">${icon("info")}<p><strong>Your comfort comes first.</strong> Choose what feels manageable. You can pause, skip an exercise or stop whenever you need.</p></div>`;
}
// Inline illustrations stay sharp in both themes and require no asset requests.
function butterflyArt() {
  return `<svg class="hug-art" viewBox="0 0 320 300" role="img" aria-label="Mirror view of a person with crossed arms, each hand resting on the opposite upper chest. Left and right hands tap in turn.">
    <circle class="art-halo" cx="160" cy="147" r="124"/>
    <path class="art-body" d="M130 112v24c-54 3-75 30-80 72l-5 62h230l-5-62c-5-42-26-69-80-72v-24"/>
    <path class="art-head" d="M121 67c0-29 78-29 78 0v26c0 48-78 48-78 0Z"/>
    <path class="art-line" d="M141 88q5 4 10 0m18 0q5 4 10 0m-30 19q11 7 22 0"/>
    <path class="hug-arm arm-right" d="M78 178q-24 77 26 73l106-57"/>
    <path class="hug-arm arm-left" d="M242 178q24 77-26 73l-106-57"/>
    <g class="hug-hand hand-left"><circle class="tap-ripple" cx="105" cy="167" r="32"/><path d="m118 197-27-17c-10-7-17-25-10-28 4-2 10 10 13 13l-5-28c-1-8 6-10 8-2l6 22-2-31c0-9 8-10 9-1l3 30 3-28c1-8 9-8 8 1l-1 29 5-18c3-7 9-4 7 3l-8 38q-2 12-9 17Z"/><path class="finger-line" d="m102 176 12 7m-15-26 5 14m8-16 2 14m9-12-2 16"/></g>
    <g class="hug-hand hand-right"><circle class="tap-ripple" cx="215" cy="167" r="32"/><path d="m202 197 27-17c10-7 17-25 10-28-4-2-10 10-13 13l5-28c1-8-6-10-8-2l-6 22 2-31c0-9-8-10-9-1l-3 30-3-28c-1-8-9-8-8 1l1 29-5-18c-3-7-9-4-7 3l8 38q2 12 9 17Z"/><path class="finger-line" d="m218 176-12 7m15-26-5 14m-8-16-2 14m-9-12 2 16"/></g>
    <text x="43" y="164" class="hand-marker">L</text><text x="267" y="164" class="hand-marker">R</text>
  </svg>`;
}
function exerciseArt(kind) {
  if (kind === "hug") return butterflyArt();
  const shapes = {
    eyes: '<path d="M35 90Q110 5 185 90Q110 175 35 90Z"/><circle cx="110" cy="90" r="29"/><circle class="art-fill" cx="110" cy="90" r="12"/><path d="M35 155h150m-10-7 10 7-10 7m-130-14-10 7 10 7"/>',
    breath:
      '<circle cx="110" cy="92" r="68" opacity=".15"/><circle cx="110" cy="92" r="49" opacity=".35"/><circle class="art-fill" cx="110" cy="92" r="29"/><path d="M45 165h40m10 0h30m10 0h40"/>',
    settle:
      '<path d="M62 96v58h96V96m-96 58v18m96-18v18M75 110h70"/><circle cx="110" cy="41" r="17"/><path d="M93 64v49h42v42h19M93 84l-22 23m45-43 13 35h27M44 176h133"/>',
    focus:
      '<circle cx="110" cy="90" r="58" opacity=".2"/><circle cx="110" cy="90" r="35"/><circle class="art-fill" cx="110" cy="90" r="10"/><path d="M110 17v18m0 110v18M37 90h18m110 0h18"/>',
    pause:
      '<circle cx="110" cy="90" r="62" opacity=".3"/><rect class="art-fill" x="85" y="60" width="16" height="60" rx="5"/><rect class="art-fill" x="119" y="60" width="16" height="60" rx="5"/>',
  };
  return `<svg class="exercise-art" viewBox="0 0 220 190" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[kind] || shapes.focus}</svg>`;
}
function visualJourney() {
  return `<section class="visual-journey" aria-labelledby="visual-title"><div class="section-heading"><div><span class="eyebrow">SEE YOUR SESSION</span><h2 id="visual-title">A rhythm you can follow.</h2></div><p>Look. Tap. Breathe.</p></div><div class="exercise-cards">${[
    [
      "eyes",
      "01",
      "Follow the point",
      "A simple left-to-right movement for your eyes.",
    ],
    [
      "hug",
      "02",
      "Butterfly Hug",
      "Cross your arms. Alternate a gentle tap on each side.",
    ],
    [
      "breath",
      "03",
      "Find your breath",
      "An expanding circle guides your next pause.",
    ],
  ]
    .map(
      ([art, n, title, copy]) =>
        `<article class="exercise-card exercise-${art}"><div class="exercise-picture">${exerciseArt(art)}</div><div class="exercise-copy"><span>${n}</span><h3>${title}</h3><p>${copy}</p></div></article>`,
    )
    .join("")}</div></section>`;
}
function feelingVisual(value) {
  const bend = value === null ? 70 : 92 - value * 4;
  return `<div class="feeling-visual" id="feeling-visual"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45"/><path d="M31 39v5m38-5v5M30 68Q50 ${bend} 70 68"/></svg><div><span class="eyebrow">RIGHT NOW</span><strong>${value === null ? "How does it feel?" : `${value}<small> / 10</small>`}</strong><div class="feeling-meter" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${value > i ? "filled" : ""}"></i>`).join("")}</div></div></div>`;
}
function hugGuide() {
  return `<div class="hug-guide" data-hug data-side="rest">${butterflyArt()}<div class="hand-cues" aria-hidden="true"><span class="cue-left">L · Left hand</span><span class="cue-right">R · Right hand</span></div><p class="hug-cue">Ready when you are</p></div>`;
}
function reflectionArt(step) {
  return `<div class="reflection-art reflection-phase-${step}" aria-hidden="true"><div class="scene-window"><svg viewBox="0 0 300 160"><rect width="300" height="160" rx="16" fill="#b5d9e6"/><circle cx="226" cy="43" r="23" fill="#ffe6a6"/><path d="M0 124 80 44 165 132 223 80 300 135v25H0Z" fill="#9a9bd2"/><path d="M0 143q90-84 181-13t119-10v40H0Z" fill="#63a69a"/></svg></div><span>${["Notice the scene", "Let the colours soften", "Give the scene some distance", "Come back to the room"][step]}</span></div>`;
}
function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function tracker(isPreview) {
  return `<div class="tracker" id="tracker"><div class="tracker-meta"><span>${isPreview ? "BILATERAL STIMULATION" : `SET ${String(state.set).padStart(2, "0")}`}</span><span class="timer" id="timer">${isPreview ? "PREVIEW" : formatTime(state.duration - elapsed / 1000)}</span></div><div class="track-line"></div><div class="track-dot" id="track-dot" aria-hidden="true"></div><div class="tracker-caption" id="tracker-caption">${isPreview ? "One movement. One point of focus." : "Follow the point with your eyes, keeping your head still."}</div>${isPreview ? "" : '<div class="stim-progress"><div class="stim-progress-fill" id="stim-progress"></div></div>'}</div>`;
}
function speedLabel() {
  return ["Very slow", "Slow", "Moderate", "Fast", "Very fast"][
    state.speed - 1
  ];
}
function home() {
  return `<div class="intro"><div><div class="eyebrow">A SPACE FOR YOU</div><h1>Your space.<br>Your <em>pace.</em></h1><p>Take a moment. Find a comfortable position.<br>Your session starts here.</p></div><div class="intro-actions"><span class="private-badge">${icon("lock")} Private, on your device</span>${button(state.active ? "Resume your session" : "Prepare your session", state.active ? "resume-session" : "start", true)}</div></div>${visualJourney()}<div class="dashboard"><section class="card"><div class="card-head"><h2>A point to focus on</h2><span class="small-label">01 — 05</span></div>${tracker(true)}<div class="preview-footer"><p>Try the movement before you begin.</p><button class="preview-button" data-action="preview" id="preview-button">${icon("play")} Try for 10 seconds</button></div></section><section class="card settings" aria-labelledby="settings-title"><h2 id="settings-title">Set your pace</h2><div class="field"><div class="field-label" id="duration-label">Set duration <output id="duration-value">${state.duration} seconds</output></div><div class="segmented" role="group" aria-labelledby="duration-label">${[30, 60, 90].map((n) => `<button class="${state.duration === n ? "selected" : ""}" data-action="duration" data-value="${n}" aria-pressed="${state.duration === n}">${n} sec</button>`).join("")}</div></div><div class="field"><label class="field-label" for="speed">Speed <output id="speed-value">${speedLabel()}</output></label><input type="range" id="speed" min="1" max="5" value="${state.speed}" aria-valuetext="${speedLabel()}"><div class="range-labels"><span>Slower</span><span>Faster</span></div></div><label class="switch-row" for="sound"><span>End-of-set sound<small>A gentle signal when the set ends</small></span><input id="sound" type="checkbox" class="switch" ${state.sound ? "checked" : ""}></label><label class="switch-row" for="pattern"><span>Variable pace<small>Gradual changes in movement</small></span><input id="pattern" type="checkbox" class="switch" ${state.pattern === "dynamic" ? "checked" : ""}></label></section></div><label class="mode-card" for="advanced"><span class="mode-icon">${icon("sliders")}</span><span class="mode-copy"><strong>Sensory exploration</strong><p>Take a moment to note images, sounds and sensations.</p></span><input type="checkbox" class="switch" id="advanced" ${state.advanced ? "checked" : ""}></label><div class="start-row"><small>At your pace. You can stop at any time.</small></div>${notice()}`;
}
function render(focus = true) {
  stopMotion();
  const nav = ["history", "guide"].includes(state.view) ? state.view : "home";
  ["home", "history", "guide"].forEach((v) => {
    const el = $(`#nav-${v}`);
    el.classList.toggle("active", v === nav);
    if (v === nav) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  $("#breadcrumb").innerHTML =
    `Your space <span class="slash">/</span> <strong>${{ history: "Session journal", guide: "User guide" }[state.view] || "Your session"}</strong>`;
  $("#journey").innerHTML = steps
    .map(
      (s, i) =>
        `<li class="journey-item ${i === stepIndex() ? "current" : i < stepIndex() ? "done" : ""}" ${i === stepIndex() ? 'aria-current="step"' : ""}><span class="journey-number">${i < stepIndex() ? "✓" : String(i + 1).padStart(2, "0")}</span>${s}</li>`,
    )
    .join("");
  $("#main").innerHTML =
    state.view === "home"
      ? home()
      : state.view === "history"
        ? historyView()
        : state.view === "guide"
          ? guideView()
          : sessionView();
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  if ($("#tracker")) {
    trackerWidth = $("#tracker").clientWidth;
    observer.observe($("#tracker"));
    if (
      state.view === "session" &&
      state.route === "stimulation" &&
      elapsed > 0
    ) {
      const x =
        Math.sin(angle) *
        Math.max(0, trackerWidth * 0.4 - 16) *
        Math.min(elapsed / 1500, 1);
      $("#track-dot").style.transform = `translate3d(${x}px,0,0)`;
      $("#stim-progress").style.transform =
        `scaleX(${Math.min(1, elapsed / (state.duration * 1000))})`;
    }
  }
  if (state.view === "session" && state.route === "breath") {
    breathTime = 0;
    startBreath();
  }
  if (focus) {
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
function go(route) {
  state.route = route;
  state.view = "session";
  render();
}
function sessionView() {
  switch (state.route) {
    case "prepare":
      return (
        header(
          "Before you begin.",
          "Give yourself this moment. There is no rush.",
          "01 / PREPARATION",
        ) +
        `<section class="card step-card"><div class="prepare-grid">${[
          [
            "settle",
            "Get comfortable",
            "Sit down, rest your feet on the floor and let your shoulders relax.",
          ],
          [
            "focus",
            "One thing at a time",
            "Choose something manageable to focus on. Notice what you feel without forcing the experience.",
          ],
          [
            "pause",
            "Stay in control",
            "Pause, skip a step or finish whenever you wish.",
          ],
        ]
          .map(
            ([art, title, copy]) =>
              `<article>${exerciseArt(art)}<h2>${title}</h2><p>${copy}</p></article>`,
          )
          .join(
            "",
          )}</div><details class="guide-section"><summary>Complementary exercises from the original project</summary><p>The project also includes EFT/TFT tapping, 9 Gamut and visualisation. These are separate from EMDR and can be skipped in the following steps.</p></details>${notice()}${actions("home", "before", "Check in with myself")}</section>`
      );
    case "before":
    case "after": {
      const after = state.route === "after",
        value = after ? state.final : state.initial;
      return (
        header(
          after ? "How do you feel now?" : "Check in with yourself.",
          after
            ? "Notice your level of distress right now. Every answer is valid."
            : "How much distress do you feel right now, on a scale of 1 to 10?",
          after ? "05 / REFLECTION" : "02 / CHECK-IN",
        ) +
        `<section class="card step-card"><h2>Your level of distress</h2>${feelingVisual(value)}<div class="rating-grid" role="group" aria-label="Distress level from 1 to 10">${Array.from({ length: 10 }, (_, i) => `<button class="rating ${value === i + 1 ? "selected" : ""}" data-action="rate" data-value="${i + 1}" aria-pressed="${value === i + 1}">${i + 1}</button>`).join("")}</div><div class="scale-ends"><span>1 · Lowest</span><span>10 · Highest</span></div><p class="rating-note" id="rating-note" role="status">${value ? `You selected ${value} out of 10` : "Choose the number that feels closest."}</p>${actions(after ? "reflection" : "prepare", after ? "summary" : "rated", "Continue", value === null)}</section>`
      );
    }
    case "sensory": {
      const [key, , prompt] = sensory[state.sensoryIndex];
      return (
        header(
          "Make room for sensations.",
          "Notes are optional and stay only in this page’s memory.",
          "02 / CHECK-IN",
        ) +
        `<section class="card step-card"><div class="sensory-tabs" role="group" aria-label="Senses">${sensory.map((s, i) => `<button class="chip ${i === state.sensoryIndex ? "selected" : ""}" data-action="sense" data-value="${i}" aria-pressed="${i === state.sensoryIndex}">${s[1]}</button>`).join("")}</div><label for="sensory-note">${prompt}</label><textarea id="sensory-note" placeholder="Write only what you feel comfortable sharing…" maxlength="5000">${esc(state.sensory[key] || "")}</textarea><p class="hint">No personal descriptions are saved in your journal.</p>${actions("sense-back", "sense-next", state.sensoryIndex === 4 ? "Continue" : "Next sense")}</section>`
      );
    }
    case "tapping":
      return (
        header(
          "A moment for tapping.",
          "EFT / TFT · Optional complementary exercise.",
          "02 / CHECK-IN",
        ) +
        `<section class="card step-card"><p>Gently tap each point 15 times at your own pace, with your thumb, index and middle fingers together.</p><div class="tapping-layout"><div><img id="tapping-image" class="tapping-image" src="assets/EFT%20points/${encodeURIComponent(tapping[state.tap][1])}" alt="${tapping[state.tap][0]}" width="320" height="280"><p class="tap-description" id="tap-description">${tapping[state.tap][2]}</p></div><div class="tapping-list" role="group" aria-label="Tapping points">${tapping.map((p, i) => `<button class="${state.tap === i ? "selected" : ""}" data-action="tap" data-value="${i}" aria-pressed="${state.tap === i}"><span>${String(i + 1).padStart(2, "0")}</span>${p[0]}</button>`).join("")}</div></div>${actions(state.advanced ? "sensory" : "before", "gamut", "Continue")}<button class="text-button" data-action="stimulation">Skip complementary exercises</button></section>`
      );
    case "gamut":
      return (
        header(
          "The 9 Gamut sequence.",
          "TFT · Optional complementary exercise.",
          "02 / CHECK-IN",
        ) +
        `<section class="card step-card"><p>If you choose this exercise, gently tap the back of your hand between the knuckles of your ring and little fingers during the sequence.</p><div class="gamut-list">${gamut.map((g, i) => `<label><input type="checkbox" data-gamut="${i}" ${state.gamut[i] ? "checked" : ""}><span>${i + 1}. ${g}</span></label>`).join("")}</div>${actions("tapping", "stimulation", "Continue to stimulation")}<p class="hint">You do not need to complete the sequence to continue.</p></section>`
      );
    case "butterfly":
      return (
        header(
          "Let your hands find a rhythm.",
          "The Butterfly Hug · a gentle tap on one side, then the other.",
          "03 / STIMULATION",
        ) +
        `<section class="card butterfly-card"><div class="butterfly-layout"><div class="butterfly-demo">${hugGuide()}<button class="button secondary" id="hug-demo-button" data-action="hug-demo">${icon("play")} Try the rhythm</button><p class="hint">A mirror view · follow at your own pace</p></div><div class="butterfly-instructions"><span class="eyebrow">BUTTERFLY HUG</span><h2>A little movement.<br> One side at a time.</h2><ol class="illustrated-steps"><li><span>01</span><div><h3>Cross your arms</h3><p>Rest each hand on the opposite upper chest or upper arm, just below the shoulder.</p></div></li><li><span>02</span><div><h3>Make your butterfly</h3><p>Let your fingers point upwards. If comfortable, link your thumbs where your hands meet.</p></div></li><li><span>03</span><div><h3>Alternate gentle taps</h3><p>Tap with your left hand, then your right. Keep the pace comfortable; the rhythm is a guide.</p></div></li></ol><p class="hint">During the set, you can combine tapping with the moving point, or choose only the point.</p><label class="switch-row" for="hug-enabled"><span>Show the tapping guide<small>Keep the hand illustration visible during the set</small></span><input class="switch" type="checkbox" id="hug-enabled" ${state.hugEnabled ? "checked" : ""}></label></div></div>${actions("gamut", "begin-set", elapsed ? "Return to the set" : "I’m ready")}</section>`
      );
    case "stimulation":
      return (
        header(
          "One point at a time.",
          "Start when you are ready. You can pause or end the set at any time.",
          "03 / STIMULATION",
        ) +
        `<section class="stim-stage" id="stim-stage">${tracker(false)}<div class="stim-controls"><button class="button primary" data-action="toggle-stim" id="toggle-stim">${icon("play")} ${elapsed ? "Resume" : "Start the set"}</button>${button("End the set", "end-set")}<button class="button secondary" data-action="fullscreen" aria-label="Fullscreen">${icon("expand")}</button></div><p class="hint" style="text-align:center;margin-top:16px" id="stim-hint">Space: pause or resume · Esc: pause</p><div class="live-hug"><label class="switch-row" for="hug-enabled"><span>Butterfly Hug<small>Alternate gentle taps, at a comfortable pace.</small></span><input class="switch" type="checkbox" id="hug-enabled" ${state.hugEnabled ? "checked" : ""}></label><div id="live-hug-guide" ${state.hugEnabled ? "" : "hidden"}>${hugGuide()}</div></div><div class="stim-bottom">${button("Review the hand position", "review-hug")}<button class="text-button" data-action="end">Finish here</button></div></section>`
      );
    case "breath":
      return (
        header(
          "Pause. Breathe.",
          "Follow the rhythm only if it feels comfortable, or breathe naturally.",
          "04 / BREATHING",
        ) +
        `<section class="card step-card"><div class="breath-area"><div class="breath-circle" id="breath-circle"><div><strong id="breath-label">Breathe in</strong><small id="breath-count">4 seconds</small></div></div></div><p class="hint" id="breath-cycle" style="text-align:center" role="status">Breath 1 of 3</p>${actions(null, "reflection", "Continue when ready")}</section>`
      );
    case "reflection": {
      const texts = [
          [
            "Notice.",
            "Notice any images, thoughts or sensations without judging them.",
          ],
          [
            "Change perspective.",
            "If you choose this visualisation, imagine the scene in black and white.",
          ],
          [
            "Take some distance.",
            "Imagine the scene smaller and further away, if that feels comfortable.",
          ],
          [
            "Return to the present.",
            "Let go of the visualisation and bring your attention back to the room.",
          ],
        ],
        t = texts[state.reflect];
      return (
        header(
          "Make room for what is here.",
          "A brief moment to notice before checking in again.",
          "05 / REFLECTION",
        ) +
        `<section class="card step-card"><div class="reflection">${reflectionArt(state.reflect)}<strong>${t[0]}</strong><p style="margin:16px auto 0;max-width:450px">${t[1]}</p></div><p class="hint" style="margin-top:22px">Visualisation is optional. It does not erase memories or measure an outcome.</p>${state.reflect < 3 ? button("Continue the visualisation", "reflect-next") : ""}${actions(null, "after", "Check how you feel")}</section>`
      );
    }
    case "summary":
      return (
        header(
          "Your moment, in perspective.",
          "These numbers reflect how you feel, not a clinical outcome.",
          "05 / REFLECTION",
        ) +
        `<section class="card step-card"><h2>Set summary · ${state.set}</h2><div class="summary-points"><div class="summary-point"><p>Before the set</p><strong>${state.initial}</strong><small> / 10</small></div><div class="summary-point"><p>After the set</p><strong>${state.final}</strong><small> / 10</small></div></div><p>${state.final > state.initial ? "You reported greater distress. You can stop here, take a break and return your attention to the room." : state.final === state.initial ? "Your reported level is unchanged. There is no need to force a change." : "You reported less distress than at the start of this set. Take the time you need."}</p><div class="step-actions">${button("Another set", "repeat")}${button("Finish and save", "finish", true)}</div><p class="hint" style="margin-top:18px">We save only dates and ratings, for up to 20 sets, in this browser.</p></section>`
      );
    case "finish":
      return (
        header(
          "Take your time today.",
          "Your session is complete. Come back whenever you wish.",
          "SESSION COMPLETE",
        ) +
        `<section class="card step-card"><div class="empty-mark">${icon("check")}</div><h2 style="text-align:center">You are here again.</h2><p style="text-align:center">Notice your surroundings and give yourself a break before returning to your day.</p>${state.storageMessage ? `<p role="status">${esc(state.storageMessage)}</p>` : ""}<div class="step-actions">${button("Open your journal", "history")}${button("Back to your space", "new", true)}</div></section>`
      );
    default:
      return home();
  }
}
function historyView() {
  return (
    header(
      "Your moments, over time.",
      "Your journal stays in this browser and keeps ratings from your last 20 sets.",
      "SESSION JOURNAL",
    ) +
    `<section class="card step-card">${state.storageMessage ? `<p role="status">${esc(state.storageMessage)}</p>` : ""}${
      !state.history.length
        ? `<div class="history-empty"><div class="empty-mark">${icon("chart")}</div><h2>Your journal starts here.</h2><p>After a session, you will find your ratings here.</p>${button(state.active ? "Resume your session" : "Prepare your session", state.active ? "resume-session" : "start", true)}</div>`
        : `<h2>Before and after each set</h2><div class="legend"><span>Before</span><span>After</span></div><div class="history-chart" role="img" aria-label="Chart of distress levels before and after each set. Full values are in the table below.">${[
            ...state.history,
          ]
            .reverse()
            .map(
              (h, i) =>
                `<div class="chart-group"><div class="chart-bars"><i style="--bar:${h.initial * 13}px"></i><i style="--bar:${h.final * 13}px"></i></div><span>${i + 1}</span></div>`,
            )
            .join(
              "",
            )}</div><div class="table-wrap"><table><caption class="hint">Saved sets, most recent first</caption><thead><tr><th>Date</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${state.history.map((h) => `<tr><td>${esc(h.date)}</td><td>${h.initial} / 10</td><td>${h.final} / 10</td><td>${h.final - h.initial > 0 ? "+" : ""}${h.final - h.initial}</td></tr>`).join("")}</tbody></table></div><div class="step-actions"><span class="hint">Personal data, stored on your device.</span><button class="text-button" data-action="clear-history">Clear journal</button></div>`
    }</section>`
  );
}
function guideView() {
  return (
    header(
      "A few things before you begin.",
      "How to use this space and manage your sessions.",
      "USER GUIDE",
    ) +
    `<section class="card step-card"><div class="guide-section"><h2>A tool to support your journey</h2><p>This app brings together guided movement, tapping, breathing and personal check-ins. It does not diagnose conditions or measure a clinical outcome. Choose the exercises that feel comfortable and stop if your distress increases.</p></div><div class="guide-section"><h2>Your session in five steps</h2><ol><li>Settle into a quiet environment.</li><li>Rate your distress from 1 to 10. Sensory notes are optional.</li><li>Explore the illustrated Butterfly Hug guide, then start the movement when you are ready.</li><li>Take a break with the breathing guide, or follow your own rhythm.</li><li>Check how you feel again and decide whether to save the set.</li></ol></div><div class="guide-section"><h2>You stay in control</h2><p>Choose the duration and speed before starting. During a set, use Pause, the space bar or Esc. The movement pauses automatically when you switch tabs. The initial preview lasts 10 seconds and is not saved.</p></div><div class="guide-section"><h2>Butterfly Hug</h2><p>Cross your arms over your chest and place each hand on the opposite upper chest or upper arm. Gently tap with one hand, then the other. The illustrated guide shows the alternating rhythm before and during your set. You can turn the guide off and follow only the point.</p></div><div class="guide-section"><h2>Complementary exercises</h2><p>EFT/TFT tapping, 9 Gamut and visualisation come from the original project. They are presented separately and can be skipped. They are not a complete clinical EMDR protocol, and visualisation does not erase memories.</p></div><div class="guide-section"><h2>Your data</h2><p>Sensory descriptions stay in memory only while this page is open. Your journal stores only dates and ratings, without sending them to a server. Local data is not encrypted: anyone with access to this browser profile can read it. We will let you know if saving is unavailable.</p><p>Existing journal entries are compatible. Any descriptions saved by the previous version are removed the next time you save. You can clear the entire journal at any time.</p></div>${button(state.active ? "Resume your session" : "Back to your session", state.active ? "resume-session" : "home", true)}</section>`
  );
}
// Audio is initialized by a gesture and reused; completed oscillators are disconnected.
function unlockAudio() {
  if (!state.sound) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) throw Error();
    audioContext ||= new C();
    if (audioContext.state === "suspended")
      audioContext
        .resume()
        .catch(() =>
          toast("Audio is unavailable. The timer will keep working."),
        );
  } catch {
    toast("Audio is unavailable in this browser.");
  }
}
function chime() {
  if (!state.sound || !audioContext || audioContext.state !== "running") return;
  try {
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain(),
      now = audioContext.currentTime;
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.8);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {}
}
function startMotion(isPreview) {
  cancelAnimationFrame(frame);
  hugDemo = false;
  preview = isPreview;
  running = true;
  lastTime = null;
  if (isPreview) {
    previewElapsed = 0;
    previewAngle = 0;
  }
  unlockAudio();
  if (!isPreview) updateStimButton();
  else $("#preview-button").innerHTML = `${icon("pause")} Stop preview`;
  frame = requestAnimationFrame(animate);
}
function animate(timestamp) {
  if (!running) return;
  if (lastTime === null) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  if (preview) previewElapsed += delta;
  else elapsed += delta;
  const activeElapsed = preview ? previewElapsed : elapsed;
  const duration = (preview ? 10 : state.duration) * 1000;
  if (activeElapsed >= duration) {
    if (preview) {
      stopMotion();
      render(false);
    } else {
      elapsed = duration;
      chime();
      endSet();
    }
    return;
  }
  const variation =
    state.pattern === "dynamic" ? 1 + 0.25 * Math.sin(activeElapsed / 4500) : 1;
  const angleDelta =
    (Math.min(delta, 100) / 1000) *
    Math.PI *
    (0.25 + state.speed * 0.16) *
    variation;
  if (preview) previewAngle += angleDelta;
  else angle += angleDelta;
  const ramp = Math.min(activeElapsed / 1500, 1),
    x =
      Math.sin(preview ? previewAngle : angle) *
      Math.max(0, trackerWidth * 0.4 - 16) *
      ramp;
  $("#track-dot").style.transform = `translate3d(${x}px,0,0)`;
  if (!preview) {
    const text = formatTime(state.duration - elapsed / 1000);
    if ($("#timer").textContent !== text) $("#timer").textContent = text;
    $("#stim-progress").style.transform = `scaleX(${elapsed / duration})`;
    if (state.hugEnabled) updateHug(elapsed, true);
  }
  frame = requestAnimationFrame(animate);
}
function updateStimButton() {
  const el = $("#toggle-stim");
  if (el)
    el.innerHTML = `${icon(running ? "pause" : "play")} ${running ? "Pause" : elapsed ? "Resume" : "Start the set"}`;
  const c = $("#tracker-caption");
  if (c)
    c.textContent = running
      ? "Follow the point with your eyes."
      : "Paused. Resume only when you are ready.";
  updateHug(elapsed, running);
}
function updateHug(time, active) {
  const guide = $("[data-hug]");
  if (!guide) return;
  const side = active
    ? Math.floor(time / TAP_INTERVAL) % 2
      ? "right"
      : "left"
    : "rest";
  if (guide.dataset.side === side) return;
  guide.dataset.side = side;
  $(".hug-cue", guide).textContent = active
    ? `${side === "left" ? "Left" : "Right"} hand · gentle tap`
    : "Paused · rest your hands";
}
function startHugDemo() {
  cancelAnimationFrame(frame);
  running = true;
  preview = false;
  hugDemo = true;
  lastTime = null;
  $("#hug-demo-button").innerHTML = `${icon("pause")} Pause the rhythm`;
  function tick(t) {
    if (!running || !hugDemo) return;
    if (lastTime === null) lastTime = t;
    demoElapsed += t - lastTime;
    lastTime = t;
    updateHug(demoElapsed, true);
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
}
function pause() {
  if (!running) return;
  if (preview) {
    stopMotion();
    render(false);
    return;
  }
  cancelAnimationFrame(frame);
  frame = 0;
  running = false;
  lastTime = null;
  if (hugDemo) {
    $("#hug-demo-button").innerHTML = `${icon("play")} Resume the rhythm`;
    updateHug(demoElapsed, false);
  } else updateStimButton();
}
function endSet() {
  stopMotion();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  go("breath");
}
function startBreath() {
  lastTime = null;
  function tick(t) {
    if (state.route !== "breath" || state.view !== "session") return;
    if (lastTime === null) lastTime = t;
    breathTime += t - lastTime;
    lastTime = t;
    const phase = (breathTime % 16000) / 1000;
    let label, seconds, scale;
    if (breathTime >= 48000) {
      $("#breath-label").textContent = "At your pace";
      $("#breath-count").textContent = "Breathe naturally";
      $("#breath-cycle").textContent = "Three breaths complete";
      $("#breath-circle").style.setProperty("--breath-scale", "1");
      return;
    }
    if (phase < 4) {
      label = "Breathe in";
      seconds = 4 - phase;
      scale = 0.9 + (0.2 * phase) / 4;
    } else if (phase < 8) {
      label = "Hold";
      seconds = 8 - phase;
      scale = 1.1;
    } else {
      label = "Breathe out";
      seconds = 16 - phase;
      scale = 1.1 - (0.2 * (phase - 8)) / 8;
    }
    $("#breath-label").textContent = label;
    $("#breath-count").textContent = `${Math.ceil(seconds)} seconds`;
    $("#breath-circle").style.setProperty("--breath-scale", scale);
    const cycle = `Breath ${Math.floor(breathTime / 16000) + 1} of 3`;
    if ($("#breath-cycle").textContent !== cycle)
      $("#breath-cycle").textContent = cycle;
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
}
function saveSet() {
  if (state.saved || state.initial === null || state.final === null) return;
  const record = {
    date: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    initial: state.initial,
    final: state.final,
  };
  state.history = [
    record,
    ...state.history.map((h) => ({
      date: h.date,
      initial: h.initial,
      final: h.final,
    })),
  ].slice(0, 20);
  try {
    localStorage.setItem(KEY, JSON.stringify(state.history));
    state.storageMessage = "";
  } catch {
    state.storageMessage =
      "Your browser did not allow saving. Your summary is available only while this page stays open.";
    toast(state.storageMessage);
  }
  state.saved = true;
}
function handleAction(action, el) {
  switch (action) {
    case "theme":
      explicitTheme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(explicitTheme);
      try {
        localStorage.setItem("emdr_theme", explicitTheme);
      } catch {
        toast(
          "Theme changed for this visit. Your browser could not save the preference.",
        );
      }
      break;
    case "home":
    case "history":
    case "guide":
      state.view = action;
      render();
      break;
    case "resume-session":
      state.view = "session";
      render();
      break;
    case "start":
      stopMotion();
      clearSession();
      state.active = true;
      go("prepare");
      break;
    case "new":
      clearSession();
      state.view = "home";
      render();
      break;
    case "duration":
      state.duration = Number(el.dataset.value);
      render(false);
      break;
    case "preview":
      if (running && preview) {
        stopMotion();
        render(false);
      } else startMotion(true);
      break;
    case "rate": {
      const val = Number(el.dataset.value);
      state[state.route === "after" ? "final" : "initial"] = val;
      document.querySelectorAll(".rating").forEach((b) => {
        const selected = Number(b.dataset.value) === val;
        b.classList.toggle("selected", selected);
        b.setAttribute("aria-pressed", selected);
      });
      $("#feeling-visual").outerHTML = feelingVisual(val);
      $("#rating-note").textContent = `You selected ${val} out of 10`;
      $(".step-actions .primary").disabled = false;
      break;
    }
    case "rated":
      go(state.advanced ? "sensory" : "tapping");
      break;
    case "sense":
      state.sensoryIndex = Number(el.dataset.value);
      render(false);
      $(".chip.selected").focus();
      break;
    case "sense-back":
      if (state.sensoryIndex > 0) {
        state.sensoryIndex--;
        render();
      } else go("before");
      break;
    case "sense-next":
      if (state.sensoryIndex < 4) {
        state.sensoryIndex++;
        render();
      } else go("tapping");
      break;
    case "tap":
      state.tap = Number(el.dataset.value);
      $("#tapping-image").src =
        `assets/EFT%20points/${encodeURIComponent(tapping[state.tap][1])}`;
      $("#tapping-image").alt = tapping[state.tap][0];
      $("#tap-description").textContent = tapping[state.tap][2];
      document.querySelectorAll('[data-action="tap"]').forEach((b) => {
        const selected = Number(b.dataset.value) === state.tap;
        b.classList.toggle("selected", selected);
        b.setAttribute("aria-pressed", selected);
      });
      break;
    case "stimulation":
      elapsed = 0;
      angle = 0;
      demoElapsed = 0;
      go("butterfly");
      break;
    case "begin-set":
      go("stimulation");
      updateHug(elapsed, false);
      break;
    case "review-hug":
      demoElapsed = 0;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      go("butterfly");
      break;
    case "hug-demo":
      if (running) pause();
      else startHugDemo();
      break;
    case "toggle-stim":
      if (running) pause();
      else startMotion(false);
      break;
    case "end-set":
      endSet();
      break;
    case "fullscreen": {
      const stage = $("#stim-stage");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (stage.requestFullscreen)
        stage
          .requestFullscreen()
          .catch(() =>
            toast("Fullscreen is unavailable. You can continue on this page."),
          );
      else toast("Fullscreen is unavailable in this browser.");
      break;
    }
    case "reflect-next":
      state.reflect = Math.min(3, state.reflect + 1);
      render();
      break;
    case "repeat":
      saveSet();
      state.initial = state.final;
      state.final = null;
      state.saved = false;
      state.set++;
      state.reflect = 0;
      state.gamut = [];
      state.tap = 0;
      elapsed = 0;
      go("tapping");
      break;
    case "finish":
      saveSet();
      state.active = false;
      state.sensory = {};
      go("finish");
      break;
    case "end":
      modal(
        "Finish here?",
        `<p>The current set will not be saved. Previously saved sets will remain in your journal.</p><button class="button primary" data-action="confirm-end">Finish session</button>`,
      );
      break;
    case "confirm-end":
      $("#dialog").close();
      state.active = false;
      state.sensory = {};
      go("finish");
      break;
    case "privacy":
      modal(
        "Private, on your device.",
        `<p>Your journal contains dates and ratings for up to 20 sets. New sensory notes stay only in memory and are not saved. No session data is sent to a server.</p><p>Your local journal is not encrypted and can be accessed from this browser profile. You can clear it in the Journal section. External links open sites with their own privacy policies.</p>`,
      );
      break;
    case "clear-history":
      modal(
        "Clear your journal?",
        `<p>This removes the sets saved in this browser. It cannot be undone.</p><button class="button primary" data-action="confirm-clear">Delete permanently</button>`,
      );
      break;
    case "confirm-clear":
      try {
        localStorage.removeItem(KEY);
        state.history = [];
        state.storageMessage = "";
        $("#dialog").close();
        render();
        toast("Your journal has been cleared.");
      } catch {
        toast("Your browser did not allow the journal to be cleared.");
      }
      break;
    default:
      if (
        [
          "prepare",
          "before",
          "tapping",
          "gamut",
          "reflection",
          "after",
          "summary",
        ].includes(action)
      )
        go(action);
  }
}
// A single delegated listener per event type survives view changes without duplication.
document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  event.preventDefault();
  if (!el.disabled) handleAction(el.dataset.action, el);
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "speed") {
    state.speed = Number(el.value);
    $("#speed-value").textContent = speedLabel();
    el.setAttribute("aria-valuetext", speedLabel());
  }
  if (el.id === "sensory-note")
    state.sensory[sensory[state.sensoryIndex][0]] = el.value;
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "sound") {
    state.sound = el.checked;
    if (state.sound) {
      unlockAudio();
      setTimeout(chime, 100);
    }
  }
  if (el.id === "pattern") state.pattern = el.checked ? "dynamic" : "constant";
  if (el.id === "advanced") state.advanced = el.checked;
  if (el.id === "hug-enabled") {
    state.hugEnabled = el.checked;
    const guide = $("#live-hug-guide");
    if (guide) guide.hidden = !el.checked;
    updateHug(elapsed, running);
  }
  if (el.dataset.gamut !== undefined)
    state.gamut[Number(el.dataset.gamut)] = el.checked;
});
$("#dialog-close").addEventListener("click", () => $("#dialog").close());
document.addEventListener("keydown", (event) => {
  if (
    $("#dialog").open ||
    state.view !== "session" ||
    !["stimulation", "butterfly"].includes(state.route)
  )
    return;
  if (event.key === "Escape") {
    pause();
    return;
  }
  if (
    event.code === "Space" &&
    !event.repeat &&
    !event.target.closest("button,input,textarea,select,a,summary")
  ) {
    event.preventDefault();
    if (running) pause();
    else if (state.route === "butterfly") startHugDemo();
    else startMotion(false);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (state.view === "session" && state.route === "breath") {
      cancelAnimationFrame(frame);
      lastTime = null;
    } else pause();
  } else if (state.view === "session" && state.route === "breath")
    startBreath();
});
window.addEventListener("pagehide", () => {
  stopMotion();
  if (audioContext) audioContext.close().catch(() => {});
  audioContext = null;
});
render(false);
