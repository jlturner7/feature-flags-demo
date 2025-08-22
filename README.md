# Playwright + GitHub Actions Exercise: Step-by-Step Guide

## 1) Create the project

1. Make a folder and initialize an npm project.
2. Install Express for a tiny demo app.
3. Add TypeScript tooling and initialize a `tsconfig.json`.

```
mkdir feature-flags-demo && cd feature-flags-demo
npm init -y
npm i express
npm i -D typescript ts-node @types/node @types/express
npx tsc --init
```

## 2) Add a minimal demo app

Create `app/server.js`:

```js
const express = require('express');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let pluginOn = false;

app.get('/', (_, res) => res.status(200).send('OK'));
app.get('/login', (_, res) => {
  res.send(`<form method="post" action="/login">
    <input name="user" placeholder="user"/>
    <input name="pass" placeholder="pass" type="password"/>
    <button type="submit">Login</button>
  </form>`);
});
app.post('/login', (_, res) => res.redirect('/dashboard'));
app.get('/dashboard', (_, res) => {
  res.send(`<h1>Dashboard</h1>
    <p id="status">Plugin A: ${pluginOn ? 'ON' : 'OFF'}</p>
    <form method="post" action="/toggle"><button type="submit">Toggle</button></form>`);
});
app.post('/toggle', (_, res) => { pluginOn = !pluginOn; res.redirect('/dashboard'); });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on ' + port));
```

Optional: add a dev script in `package.json` so you can start the app quickly:

```json
"scripts": {
  "dev": "node app/server.js"
}
```

## 3) Install Playwright (test runner + browsers)

```
npm i -D @playwright/test
npx playwright install
```

## 4) Add Playwright config

Create `playwright.config.ts` **at the repo root**:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node app/server.js',
    url: 'http://127.0.0.1:3000',    // Playwright waits for a 200 here (we added a root route)
    env: { PORT: '3000' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
```

## 5) Write two E2E tests

Create folder `e2e/tests/` and add:

**`e2e/tests/login.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('login navigates to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('user').fill('demo');
  await page.getByPlaceholder('pass').fill('demo');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

**`e2e/tests/toggle.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('toggle plugin status reflects in UI', async ({ page }) => {
  await page.goto('/dashboard');
  const status = page.locator('#status');
  const before = await status.textContent();
  await page.getByRole('button', { name: 'Toggle' }).click();
  await expect(status).not.toHaveText(before!);
});
```

Add test scripts to `package.json`:

```json
"scripts": {
  "dev": "node app/server.js",
  "test:e2e": "playwright test",
  "test:e2e:report": "playwright show-report"
}
```

## 6) Run tests locally

* Standard run:

  ```
  npm run test:e2e
  ```
* Headed Chromium (watch it):

  ```
  npm run test:e2e -- --project=chromium --headed --workers=1
  ```
* Run one spec:

  ```
  npm run test:e2e -- --project=chromium e2e/tests/login.spec.ts
  ```
* Open the HTML report:

  ```
  npm run test:e2e:report
  ```

### Terminal A/B pattern (optional for local)

* Terminal A: `npm run dev` (start app)
* Terminal B: `PW_SKIP_WS=1 npx playwright test e2e/tests/login.spec.ts --project=chromium --workers=1 --headed`
  (if you add a guard in config to skip the `webServer` when `PW_SKIP_WS=1`)

## 7) Capture videos & traces (already enabled)

We set `video: 'retain-on-failure'`, `trace: 'on-first-retry'`, and `screenshot: 'only-on-failure'`. Artifacts land in `test-results/` and appear in the HTML report.

To always record video, temporarily use:

```ts
test.use({ video: 'on' });
```

or set `video: 'on'` in the config while debugging.

## 8) Add GitHub Actions CI

Create `.github/workflows/e2e.yml`:

```yml
name: E2E
on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run E2E tests
        env:
          CI: true
          BASE_URL: http://127.0.0.1:3000
        run: npx playwright test --reporter=line,html
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
      - name: Upload traces & media
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results
          if-no-files-found: ignore
```

## 9) Initialize Git and push to GitHub

From the project root:

```bash
git config --global init.defaultBranch main
git init
printf "node_modules/\nplaywright-report/\ntest-results/\n.DS_Store\n" >> .gitignore
git add .
git commit -m "chore: initial commit (Playwright demo app + tests)"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(If you prefer GitHub CLI: `brew install gh`, `gh auth login`, then `gh repo create <user>/<repo> --public --source=. --remote=origin --push`.)

## 10) Open a PR and require checks (optional but recommended)

* Create a branch, push, open a PR; the **E2E** workflow will run.
* In repo **Settings → Branches → Branch protection rules**, require the E2E checks to pass before merging.

---

## Command-Line Commands Used (quick reference)

**Project setup**

* `mkdir feature-flags-demo && cd feature-flags-demo`
* `npm init -y`
* `npm i express`
* `npm i -D typescript ts-node @types/node @types/express`
* `npx tsc --init`

**Playwright**

* `npm i -D @playwright/test`
* `npx playwright install`
* `npm run test:e2e`
* `npm run test:e2e -- --project=chromium --headed --workers=1`
* `npm run test:e2e -- --project=chromium e2e/tests/login.spec.ts`
* `npm run test:e2e:report`

**Server + debugging**

* `node app/server.js`
* `curl -I http://127.0.0.1:3000/login`
* `lsof -ti :3000` (macOS — find process on port 3000)
* `kill -15 $(lsof -ti :3000)` / `kill -9 $(lsof -ti :3000)`
* `PW_SKIP_WS=1 npx playwright test e2e/tests/login.spec.ts --project=chromium --workers=1 --headed`

**Git & GitHub**

* `git config --global init.defaultBranch main`
* `git init`
* `git add .`
* `git commit -m "chore: initial commit (Playwright demo app + tests)"`
* `git remote add origin https://github.com/<user>/<repo>.git`
* `git push -u origin main`
* *(optional)* `mkdir -p .github/workflows`
* *(optional)* `git checkout -b e2e-setup`
* *(optional)* `git push -u origin e2e-setup`
* *(optional)* `gh auth login` / `gh auth status` / `gh repo create …` (if using GitHub CLI)


