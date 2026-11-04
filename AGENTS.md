# Project conventions

- Static portfolio: `index.html`, vanilla JavaScript in `js/main.js`, indented Sass in `sass/`.
- Edit Sass sources, then regenerate the tracked CSS and source map with `npx --yes sass@1.77.8 --style=compressed sass/style.sass css/style.css`.
- Check JavaScript with `node --check js/main.js` and whitespace with `git diff --check`.
- Serve locally with `python3 -m http.server 4173 --bind 127.0.0.1`.
- Desktop starts at 741px; the mobile layout is a vertical image list with a services rail.
- GSAP 3.13.0 is loaded from a pinned CDN URL. Keep the native horizontal scrolling fallback usable if the CDN is unavailable.
- There is no package manifest or automated test suite. Browser checks should cover wheel/trackpad, drag, looping both ways, keyboard arrows, reduced motion, the about dialog, and resizing across the desktop breakpoint.
