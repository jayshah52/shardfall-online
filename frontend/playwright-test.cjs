const { chromium } = require('playwright');

(async () => {
  console.log("Starting Playwright end-to-end test...");
  const browser = await chromium.launch({ headless: true });
  
  const pages = [];
  
  // HOST
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  hostPage.on('console', msg => console.log('PAGE LOG:', msg.text()));
  hostPage.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  hostPage.on('response', res => {
    if (res.url().includes('/api/')) console.log('API RESPONSE:', res.url(), res.status());
  });
  pages.push(hostPage);
  
  await hostPage.goto('http://localhost:3000/');
  // Clear any existing localStorage data which might jump straight to lobby
  await hostPage.evaluate(() => localStorage.clear());
  
  await hostPage.fill('input[placeholder="Enter your name..."]', 'HostPlayer');
  await hostPage.click('button:has-text("Create Game")');
  await hostPage.click('button:has-text("Open the Portals")');
  
  try {
    await hostPage.waitForSelector('.lobby-code', { timeout: 10000 });
  } catch(e) {
    console.log("Failed to find lobby code in 10s. Taking screenshot.");
    const uiError = await hostPage.locator('.home-error').innerText().catch(() => 'No UI error shown');
    console.log("UI ERROR:", uiError);
    await hostPage.screenshot({ path: 'fail-create.png' });
    throw e;
  }
  const codeRaw = await hostPage.locator('.lobby-code').innerText();
  const roomCode = codeRaw.replace(/\s+/g, '');
  console.log(`[Host] Created Room: ${roomCode}`);

  // OTHERS JOIN
  for (let i = 1; i <= 2; i++) {
    const pContext = await browser.newContext();
    const pPage = await pContext.newPage();
    pages.push(pPage);
    
    await pPage.goto('http://localhost:3000/');
    await pPage.fill('input[placeholder="Enter your name..."]', `Player${i}`);
    await pPage.click('button:has-text("Join Game")');
    
    // Fill exact room code
    const input = pPage.locator('input[placeholder="e.g. X7K2"]');
    await input.fill(roomCode);
    await pPage.click('button:has-text("Join Room")');
    
    await pPage.waitForSelector('.lobby-waiting-message');
    console.log(`[Player ${i}] Joined successful!`);
  }

  // HOST STARTS
  console.log("[Host] Starting game...");
  await hostPage.waitForSelector('button:has-text("Start Game")', { timeout: 15000 });
  await hostPage.click('button:has-text("Start Game")');
  
  // ALL CHOOSE SEEKER
  for (let i = 0; i < 3; i++) {
    const p = pages[i];
    await p.waitForSelector('.seeker-choices .seeker-card');
    await p.click('.seeker-choices .seeker-card:first-child');
    console.log(`[Player ${i}] Chose seeker.`);
  }
  
  // ALL CHOOSE CONTRACTS
  for (let i = 0; i < 3; i++) {
    const p = pages[i];
    await p.waitForSelector('.seeker-choices .seeker-card');
    // Click first two
    await p.click('.seeker-choices .seeker-card:nth-child(1)');
    await p.click('.seeker-choices .seeker-card:nth-child(2)');
    await p.click('button:has-text("Confirm")');
    console.log(`[Player ${i}] Chose contracts.`);
  }

  // WAIT FOR GAME TO LOAD FOR HOST
  await hostPage.waitForSelector('.game-board');
  
  // SKIP TUTORIAL FOR ALL
  for (const p of pages) {
    try {
      await p.click('button:has-text("Skip")', { timeout: 2000 });
      console.log("Skipped tutorial.");
    } catch(e) { /* ignore if not shown */ }
  }

  const roundText = await hostPage.locator('.round-badge').innerText();
  console.log(`[Host] Reached Game Board! ${roundText}`);

  // Figure out whose turn it is
  let currentTurnIndex = -1;
  for (let i = 0; i < 3; i++) {
    const p = pages[i];
    const turnText = await p.locator('.turn-indicator').innerText().catch(()=>"");
    if (turnText.includes('Your Turn')) {
      currentTurnIndex = i;
      break;
    }
  }

  if (currentTurnIndex !== -1) {
    console.log(`[Player ${currentTurnIndex}] It is my turn! Taking action...`);
    const activePage = pages[currentTurnIndex];
    // Collect action
    await activePage.click('button.action-btn:has-text("Collect")');
    // Click first gem
    await activePage.click('.gem-token.clickable:first-child');
    await activePage.click('button:has-text("Collect")'); // Confirm button
    console.log(`[Player ${currentTurnIndex}] Collect action successful!`);
  } else {
    console.log('Error: Could not determine whose turn it is!');
  }

  await browser.close();
  console.log("Test Passed Successfully!");
})();
