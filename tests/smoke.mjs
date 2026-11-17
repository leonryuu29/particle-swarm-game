import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { startServer } from "../scripts/serve.mjs";

test("menu loads and the game scene starts", async (t) => {
  const { server, url } = await startServer({ port: 0 });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.mouse.click(640, 420);
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => ({
    menu: window.__particleSwarmGame.scene.isActive("MainMenuScene"),
    game: window.__particleSwarmGame.scene.isActive("GameScene"),
    ui: window.__particleSwarmGame.scene.isActive("UIScene"),
  }));

  assert.equal(state.menu, false);
  assert.equal(state.game, true);
  assert.equal(state.ui, true);
  assert.deepEqual(pageErrors, []);

  await page.screenshot({ path: "docs/screenshots/gameplay.png", fullPage: true });
});
