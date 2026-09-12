# Doomsday Desk

A self-contained, mobile-friendly practice app for learning to calculate the day of the week for any Gregorian date using the Doomsday algorithm.

## What it does

- Generates a random date within a chosen year range
- Lets you choose the weekday, then immediately checks the answer
- Shows a step-by-step walkthrough of the algorithm for each date you answer
- Keeps attempts and success rate only in your browser's local storage
- Includes century anchors, month anchor dates, leap-year guidance, memory hooks, and a worked example
- Works without a server, account, or external data

## Use it locally

Open [`dist/index.html`](dist/index.html) in a modern browser. No install or build step is needed.

## GitHub Pages

This repository is configured to publish the same standalone app from the `dist` directory through GitHub Pages. Unknown paths fall back to `dist/404.html`, which redirects to the app.

## Development

The app is one hand-edited file, `dist/index.html`. The test suite has no dependencies and runs on Node 18+:

```sh
node tests/run-tests.js
```

It syntax-checks the inline script, loads the page under DOM stubs, compares the Doomsday math against the JavaScript engine for every date from 1583 through 2400, verifies the solution walkthrough, and asserts the page carries its required metadata. CI runs it before every deployment.
