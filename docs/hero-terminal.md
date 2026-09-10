# Homepage terminal

The homepage renders a Preact terminal with a virtual filesystem populated at build time from Astro's blog collection and the existing GitHub project feed. It starts with a welcome message and an empty prompt; no commands run automatically. Blog files contain the full Markdown body in the current locale. Project files contain descriptions and repository links. Commands never execute a real shell or evaluate input.

The input prompt follows the last output line inside the scrollback, with no separate input bar. It receives focus when the homepage loads, without scrolling the page, so typing can begin immediately. Enter submits the command and reveals a new prompt beneath the result. Long output scrolls to the new prompt; scroll up to read earlier content. Clicking empty space in the terminal focuses the prompt.

The welcome banner includes a rotating ASCII torus. Its animation runs at 20 fps, pauses when offscreen or the tab is hidden, and stops when the banner unmounts. The play/pause button is always available. Reduced-motion preferences start with a static frame, but pressing play explicitly enables rotation; changing the system preference resets this override. Character updates stay inside the artwork and do not rerender the command input.

Try:

```sh
ls
cd blog
cat hello-world.md
open hello-world.md
cd ~/project
ls
man
man cat
ls -a /
cat /.secret
coffee
neofetch
play invaders
```

`project` aliases `projects` at the root. `cat` accepts Markdown filenames with or without `.md`. Use Tab to complete commands and paths, ↑/↓ for history, Ctrl+C to cancel input, and Ctrl+L to clear output. With multiple matches, Tab extends the input to their longest common prefix; when it cannot extend further, Tab lists the candidates. Shift+Tab always leaves the input normally. Directory rows and the command chips also work with a mouse or touch.

The arcade uses ←/→ or A/D to move, Space to fire, P to pause, and Escape to return. Onscreen controls support touch and keyboard. It pauses on focus loss or when the browser tab is hidden. Closing or minimizing the terminal exits the game and preserves terminal history for the current page session.

Implementation: `src/components/HeroTerminal.tsx`, `Invaders.tsx`, `terminal-copy.ts`, `src/lib/terminal.ts`, and `src/styles/terminal.css`. File data is assembled in `src/pages/[locale]/index.astro`; add new virtual files there. Terminal output is rendered as escaped text, not HTML. Existing page links remain available without JavaScript.

Validation (Node 22.6+):

```sh
node --experimental-strip-types --test tests/terminal.test.mjs
pnpm build
```
