const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createServer } = require("../server.cjs");
let browser, server, url;
before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    channel:
      process.env.BROWSER_CHANNEL ||
      (process.platform === "win32" ? "msedge" : "chromium"),
    headless: true,
  });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
});
async function setup(
  t,
  { storage, blocked = false, width = 1440, height = 900 } = {},
) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  t.after(() => ctx.close());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  if (storage !== undefined)
    await page.addInitScript(
      (value) => localStorage.setItem("emdr_session_history", value),
      storage,
    );
  if (blocked)
    await page.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException("Blocked", "SecurityError");
      };
    });
  await page.goto(url);
  return page;
}
const click = (p, action) =>
  p.locator(`[data-action="${action}"]`).last().click();
async function start(p, value = 6) {
  await click(p, "start");
  await click(p, "before");
  assert.equal(await p.locator('[data-action="rated"]').isDisabled(), true);
  await p.locator(`[data-action="rate"][data-value="${value}"]`).click();
  await click(p, "rated");
}
async function summary(p, value = 3) {
  await click(p, "reflection");
  await click(p, "after");
  await p.locator(`[data-action="rate"][data-value="${value}"]`).click();
  await click(p, "summary");
}
async function saved(p) {
  return p.evaluate(() =>
    JSON.parse(localStorage.getItem("emdr_session_history") || "[]"),
  );
}

test("Responsive layouts, functional first viewport and local-only requests", async (t) => {
  const p = await setup(t);
  const outside = [];
  p.on("request", (r) => {
    if (!r.url().startsWith(url)) outside.push(r.url());
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await p.setViewportSize({ width, height: 900 });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `overflow at ${width}`,
    );
    const box = await p.locator('[data-action="start"]').boundingBox();
    assert.ok(
      box.y + box.height < 900,
      `start below first viewport at ${width}`,
    );
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.screenshot({ path: "docs/desktop.png", fullPage: true });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: "docs/mobile.png", fullPage: true });
  assert.deepEqual(outside, []);
});

test("Timer, pause, navigation, preview isolation, completion and local save", async (t) => {
  const p = await setup(t);
  await p.clock.install();
  await p.locator('[data-action="duration"][data-value="30"]').click();
  await start(p);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "toggle-stim");
  await p.clock.runFor(2200);
  assert.match(await p.locator("#toggle-stim").innerText(), /Pause/);
  await click(p, "toggle-stim");
  const time = await p.locator("#timer").innerText();
  await p.clock.runFor(5000);
  assert.equal(await p.locator("#timer").innerText(), time);
  await click(p, "home");
  await click(p, "preview");
  await p.clock.runFor(100);
  await p.clock.fastForward(11000);
  assert.match(await p.locator("#preview-button").innerText(), /Try/);
  await click(p, "resume-session");
  assert.equal(await p.locator("#timer").innerText(), time);
  await click(p, "toggle-stim");
  await p.clock.runFor(100);
  await p.clock.fastForward(31000);
  await p.locator("#breath-label").waitFor();
  await p.clock.runFor(100);
  await p.clock.fastForward(49000);
  assert.equal(await p.locator("#breath-label").innerText(), "At your pace");
  await summary(p, 3);
  await click(p, "finish");
  assert.deepEqual(
    (await saved(p)).map(({ initial, final }) => ({ initial, final })),
    [{ initial: 6, final: 3 }],
  );
  await click(p, "history");
  assert.equal(await p.locator("tbody tr").count(), 1);
});

test("Advanced notes, all nine images, Gamut and optional visualization", async (t) => {
  const p = await setup(t);
  await p.locator("#advanced").check();
  await start(p);
  const note = "<img src=x onerror=alert(1)> private note";
  await p.locator("#sensory-note").fill(note);
  await p.locator('[data-action="sense"][data-value="1"]').click();
  await p.locator("#sensory-note").fill("suono");
  await p.locator('[data-action="sense"][data-value="0"]').click();
  assert.equal(await p.locator("#sensory-note").inputValue(), note);
  for (let i = 0; i < 5; i++) await click(p, "sense-next");
  for (let i = 0; i < 9; i++) {
    await p.locator(`[data-action="tap"][data-value="${i}"]`).click();
    await p.locator("#tapping-image").evaluate((img) => img.decode());
    assert.ok(
      await p.locator("#tapping-image").evaluate((img) => img.naturalWidth > 0),
    );
  }
  await click(p, "gamut");
  await p.locator('[data-gamut="0"]').check();
  await click(p, "tapping");
  await click(p, "gamut");
  assert.equal(await p.locator('[data-gamut="0"]').isChecked(), true);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "end-set");
  await click(p, "reflection");
  for (let i = 0; i < 3; i++) await click(p, "reflect-next");
  assert.match(
    await p.locator(".reflection").innerText(),
    /Return to the present/,
  );
  await click(p, "after");
  await p.locator('[data-action="rate"][data-value="4"]').click();
  await click(p, "summary");
  await click(p, "finish");
  assert.equal(JSON.stringify(await saved(p)).includes("private note"), false);
  assert.deepEqual(Object.keys((await saved(p))[0]).sort(), [
    "date",
    "final",
    "initial",
  ]);
});

test("Repeat saves each set once, baseline changes, early exit keeps saved sets", async (t) => {
  const p = await setup(t);
  await start(p, 7);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "end-set");
  await summary(p, 5);
  await click(p, "repeat");
  assert.equal((await saved(p)).length, 1);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "end-set");
  await summary(p, 8);
  assert.match(await p.locator(".summary-point").first().innerText(), /5/);
  assert.match(await p.locator(".step-card").innerText(), /greater distress/);
  await click(p, "repeat");
  assert.deepEqual(
    (await saved(p)).map((x) => [x.initial, x.final]),
    [
      [5, 8],
      [7, 5],
    ],
  );
  await click(p, "end");
  await click(p, "confirm-end");
  assert.equal((await saved(p)).length, 2);
  await click(p, "home");
  await click(p, "start");
  await click(p, "before");
  assert.equal(await p.locator('[data-action="rated"]').isDisabled(), true);
});

test("Untrusted legacy history is escaped, migrated and capped to 20", async (t) => {
  const records = Array.from({ length: 20 }, () => ({
    date: "<img src=x onerror=alert(1)>",
    initial: 6,
    final: 4,
    images: "old personal memory",
  }));
  const p = await setup(t, { storage: JSON.stringify(records) });
  await click(p, "history");
  assert.equal(await p.locator("tbody img").count(), 0);
  assert.equal(await p.locator("tbody tr").count(), 20);
  await click(p, "home");
  await start(p);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "end-set");
  await summary(p);
  await click(p, "finish");
  const h = await saved(p);
  assert.equal(h.length, 20);
  assert.equal(JSON.stringify(h).includes("old personal memory"), false);
  await click(p, "history");
  await click(p, "clear-history");
  await p.locator("#dialog-close").click();
  assert.equal((await saved(p)).length, 20);
  await click(p, "clear-history");
  await click(p, "confirm-clear");
  assert.equal((await saved(p)).length, 0);
});

test("Malformed storage and storage-write failure are visible and nonblocking", async (t) => {
  const p = await setup(t, { storage: "invalid json", blocked: true });
  await click(p, "history");
  assert.match(await p.locator("main").innerText(), /unavailable/);
  await click(p, "start");
  await click(p, "before");
  await p.locator('[data-action="rate"][data-value="4"]').click();
  await click(p, "rated");
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "end-set");
  await summary(p, 4);
  await click(p, "finish");
  assert.match(await p.locator("main").innerText(), /did not allow saving/);
  await click(p, "history");
  assert.equal(await p.locator("tbody tr").count(), 1);
});

test("Keyboard, hidden-page pause and reduced motion", async (t) => {
  const p = await setup(t);
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.clock.install();
  await start(p);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await p.locator("main").focus();
  await p.keyboard.press("Space");
  await p.clock.runFor(1200);
  assert.match(await p.locator("#toggle-stim").innerText(), /Pause/);
  await p.keyboard.press("Escape");
  assert.match(await p.locator("#toggle-stim").innerText(), /Resume/);
  await p.keyboard.press("Space");
  await p.clock.runFor(100);
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const time = await p.locator("#timer").innerText();
  await p.clock.runFor(3000);
  assert.equal(await p.locator("#timer").innerText(), time);
  assert.match(await p.locator("#toggle-stim").innerText(), /Resume/);
  await p.evaluate(() => {
    delete document.hidden;
  });
  await click(p, "end-set");
  assert.equal(
    await p
      .locator("#breath-circle")
      .evaluate((e) => getComputedStyle(e).transform),
    "none",
  );
});

test("Local server excludes repository metadata and reports missing assets", async () => {
  for (const route of [
    "/.git/config",
    "/docs/original-code-graph.json",
    "/assets/missing.png",
    "/assets/../package.json",
  ]) {
    const r = await fetch(url + route);
    assert.equal(r.status, 404);
  }
  assert.equal((await fetch(url + "/favicon.svg")).status, 200);
});

test("Theme follows the system, persists a choice, and keeps a running set intact", async (t) => {
  const p = await setup(t);
  await p.emulateMedia({ colorScheme: "dark" });
  await p.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await p.locator("html").getAttribute("lang"), "en");
  assert.equal(await p.title(), "EMDR — Your space");
  assert.match(await p.locator("h1").innerText(), /Your space/);
  await p.emulateMedia({ colorScheme: "light" });
  await p.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  await p.getByRole("button", { name: "Switch to dark mode" }).click();
  assert.equal(
    await p.locator("#theme-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await p.reload();
  assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
  await p.screenshot({ path: "docs/desktop-dark.png", fullPage: true });
  await p.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  assert.equal(await p.locator("#theme-toggle").isVisible(), true);
  await p.screenshot({ path: "docs/mobile-dark.png", fullPage: true });
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.clock.install();
  await start(p);
  await click(p, "stimulation");
  await click(p, "begin-set");
  await click(p, "toggle-stim");
  await p.clock.runFor(2200);
  const before = await p.locator("#timer").innerText();
  await p.getByRole("button", { name: "Switch to light mode" }).click();
  assert.match(await p.locator("#toggle-stim").innerText(), /Pause/);
  await p.clock.runFor(1200);
  assert.notEqual(await p.locator("#timer").innerText(), before);
  await p.getByRole("button", { name: "Switch to dark mode" }).click();
  await p.locator("#toggle-stim").click();
  await p.screenshot({ path: "docs/stimulation-dark.png", fullPage: true });
});

test("Theme works when local storage is blocked, including keyboard controls", async (t) => {
  const p = await setup(t, { blocked: true });
  await p.emulateMedia({ colorScheme: "light" });
  await p.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await p.locator("#theme-toggle").focus();
  await p.keyboard.press("Enter");
  assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
  assert.match(
    await p.locator("#toast").innerText(),
    /could not save the preference/,
  );
  await click(p, "guide");
  assert.match(
    await p.locator("h1").innerText(),
    /A few things before you begin/,
  );
  assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
  await p.locator("#theme-toggle").focus();
  await p.keyboard.press("Space");
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
});

test("Butterfly Hug practice, pause, review and live guidance preserve the set", async (t) => {
  const p = await setup(t);
  await p.clock.install();
  await p.locator('[data-action="duration"][data-value="30"]').click();
  await start(p);
  await click(p, "gamut");
  await click(p, "stimulation");
  assert.match(await p.locator("h1").innerText(), /hands find a rhythm/);
  assert.equal(await p.locator(".illustrated-steps li").count(), 3);
  await click(p, "hug-demo");
  await p.clock.runFor(150);
  assert.equal(await p.locator("[data-hug]").getAttribute("data-side"), "left");
  await p.clock.runFor(850);
  assert.equal(
    await p.locator("[data-hug]").getAttribute("data-side"),
    "right",
  );
  await p.locator("main").focus();
  await p.keyboard.press("Escape");
  assert.match(await p.locator("#hug-demo-button").innerText(), /Resume/);
  assert.equal(await p.locator("[data-hug]").getAttribute("data-side"), "rest");
  await p.clock.fastForward(40000);
  await click(p, "begin-set");
  assert.equal(await p.locator("#timer").innerText(), "00:30");
  await click(p, "toggle-stim");
  await p.clock.runFor(1200);
  assert.equal(
    await p.locator("[data-hug]").getAttribute("data-side"),
    "right",
  );
  await p.locator("#hug-enabled").uncheck();
  assert.equal(await p.locator("#live-hug-guide").isVisible(), false);
  await p.clock.runFor(1000);
  const time = await p.locator("#timer").innerText();
  await click(p, "review-hug");
  assert.equal(await p.locator("#hug-enabled").isChecked(), false);
  await click(p, "hug-demo");
  await p.clock.runFor(100);
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await p.locator("[data-hug]").getAttribute("data-side"), "rest");
  assert.match(await p.locator("#hug-demo-button").innerText(), /Resume/);
  await p.evaluate(() => {
    delete document.hidden;
  });
  await p.locator("#hug-enabled").check();
  await click(p, "begin-set");
  assert.equal(await p.locator("#timer").innerText(), time);
  await click(p, "toggle-stim");
  await p.clock.runFor(100);
  await p.clock.fastForward(31000);
  await p.locator("#breath-label").waitFor();
  assert.equal(await p.locator("[data-hug]").count(), 0);
  await summary(p);
  await click(p, "finish");
  assert.equal((await saved(p)).length, 1);
});

test("Illustrated steps fit mobile and dark mode, with reduced motion support", async (t) => {
  const p = await setup(t);
  await p.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await p.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await click(p, "start");
  await p.screenshot({ path: "docs/preparation.png", fullPage: true });
  await click(p, "before");
  await p.locator('[data-action="rate"][data-value="7"]').click();
  assert.match(await p.locator("#feeling-visual").innerText(), /7/);
  assert.equal(await p.locator(".feeling-meter .filled").count(), 7);
  await p.screenshot({ path: "docs/check-in.png", fullPage: true });
  await click(p, "rated");
  await click(p, "stimulation");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await click(p, "theme");
    for (const width of [1440, 768, 390, 320]) {
      await p.setViewportSize({ width, height: 900 });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${theme} butterfly at ${width}`,
      );
    }
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.screenshot({ path: `docs/butterfly-${theme}.png`, fullPage: true });
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: "docs/butterfly-mobile.png", fullPage: true });
  await p.clock.install();
  await click(p, "hug-demo");
  await p.clock.runFor(100);
  assert.equal(
    await p
      .locator(".hand-left")
      .evaluate((e) => getComputedStyle(e).transform),
    "none",
  );
  await click(p, "begin-set");
  for (const width of [390, 320]) {
    await p.setViewportSize({ width, height: 844 });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `live guide at ${width}`,
    );
  }
  await p.screenshot({ path: "docs/stimulation-mobile.png", fullPage: true });
  await click(p, "fullscreen");
  await p.waitForFunction(() => document.fullscreenElement !== null);
  const guideBox = await p.locator("#live-hug-guide").boundingBox();
  const viewportHeight = await p.evaluate(() => innerHeight);
  await p.screenshot({ path: "docs/fullscreen-mobile.png", fullPage: true });
  assert.ok(
    guideBox.y + guideBox.height <= viewportHeight,
    `fullscreen keeps the hand guide visible: ${JSON.stringify(guideBox)}, viewport ${viewportHeight}`,
  );
  await click(p, "fullscreen");
  await p.waitForFunction(() => document.fullscreenElement === null);
  await click(p, "end-set");
  await click(p, "reflection");
  await p.screenshot({ path: "docs/reflection-mobile.png", fullPage: true });
  await click(p, "guide");
  assert.doesNotMatch(
    await p.locator("main").innerText(),
    /therapist|qualified professional|agreed plan/i,
  );
  assert.match(await p.locator("main").innerText(), /Butterfly Hug/);
});
