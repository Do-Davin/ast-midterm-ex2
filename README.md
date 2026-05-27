# Midterm-Exercise 2 — Frontend (React + Vite)

## Setup

```bash
npm ci
```

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Playwright Tests

```bash
npx playwright install --with-deps
npm run test:e2e
```

## Playwright Tests with Screenshots

```bash
npm run test:e2e:screenshot
```

Screenshots and report are saved to `test-results/` and `playwright-report/`.

## GitHub Actions

Workflow: `.github/workflows/test-and-email.yml`

Triggers on push to `main`. Runs build + tests, uploads Playwright report as artifact, and emails results.

Required repository secrets:
- `MAIL_USERNAME` — Gmail address
- `MAIL_PASSWORD` — Gmail App Password
