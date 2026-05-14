# ENTROPY - Chain Reaction Strategy Game

A modern, browser-based strategy game inspired by chain-reaction mechanics, built with vanilla JavaScript, HTML, and CSS.

Players take turns placing pieces on a 6 x 12 board, triggering explosions, capturing cells, and chaining reactions to outscore opponents before time runs out.

## Live Website

Play here: [https://hibanitt.github.io/Delta-Task-1/](https://hibanitt.github.io/Delta-Task-1/)

## Project Highlights

- Multiplayer support for 2 to 6 players
- Chain-reaction explosion engine with capture logic
- Teleportation cells with paired portals
- Fortress Cells that resist enemy takeover
- Row Ripper power-up with moving row indicator
- Sabotage mechanics:
  - Lockdown (3-turn anti-explosion constraint)
  - Chaos Drift (randomized next move)
- Dual timer system:
  - Global game timer (10 minutes)
  - Per-move timer (10 seconds)
- Timeout penalties integrated into scoring
- Move history panel and active power-up HUD
- Pause/resume and replay flow with game-over modal
- Sound feedback for core game events

## Gameplay Rules- Quick Summary

1. Cell capacity is based on position:
   - Corner = 2
   - Edge = 3
   - Inner cell = 4
2. First placement for each player can be on any empty cell, with boosted initial count.
3. After first placement, a player can place only on their own cells.
4. Cells explode at capacity and distribute pieces to orthogonal neighbors.
5. Explosions can cascade into chain reactions.
6. Captured pieces are converted to the current player.
7. Winner is decided by highest score when game ends.

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES Modules)

## Project Structure

- [index.html](index.html) - Main page layout, game HUD, modals, board container
- [styles.css](styles.css) - Full styling, responsive layout, effects, power-up visuals
- [script.js](script.js) - Core game loop, UI updates, rules, timers, power-up logic
- [state-manager.js](state-manager.js) - Initial state creation and board metadata setup
- [sound-manager.js](sound-manager.js) - Audio asset wiring and playback utility
- [rules.js](rules.js) - Reserved rules-related module
- [powerUpIcons/](powerUpIcons/) - Icons for power-ups and UI indicators
- [sounds/](sounds/) - Audio effects

## Running Locally

Option 1: VS Code Live Server

1. Open the project folder in VS Code.
2. Start Live Server on [index.html](index.html).
3. Open the generated localhost URL.

Option 2: Python HTTP server

```bash
python -m http.server 5500
```

Then open:

- `http://localhost:5500/`

## Deployment

This project is deployed via GitHub Pages from the `main` branch.

Live URL:

- [https://hibanitt.github.io/Delta-Task-1/](https://hibanitt.github.io/Delta-Task-1/)

## Acknowledgements

Developed by Hiba for Delta Task 1
Thanks to the Delta Force team for the inspiration.
