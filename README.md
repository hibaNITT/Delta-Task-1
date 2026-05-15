# ENTROPY - Chain Reaction Strategy Game

A modern, browser-based strategy game inspired by chain-reaction mechanics, built with vanilla JavaScript, HTML, and CSS.

Players take turns placing pieces on a 6 x 12 board, triggering explosions, capturing cells, and chaining reactions to outscore opponents before time runs out.

## Live Website

Play here: [https://hibanitt.github.io/Delta-Task-1/](https://hibanitt.github.io/Delta-Task-1/)

## ScreenShots
<img width="1897" height="865" alt="image" src="https://github.com/user-attachments/assets/2e9658dd-de01-4596-851a-b2d04e3c272d" />
<img width="1852" height="824" alt="image" src="https://github.com/user-attachments/assets/aaff4b38-b9c1-4869-acc8-4f3590bdb246" />
<img width="1876" height="833" alt="image" src="https://github.com/user-attachments/assets/71b4a1c1-e16b-4f50-b7dc-5aa3a47dadf7" />
<img width="1015" height="681" alt="image" src="https://github.com/user-attachments/assets/3c654122-d35a-45e1-8605-83448ae72c37" />
<img width="1744" height="762" alt="image" src="https://github.com/user-attachments/assets/80650b1e-51f9-4f9b-801a-de503f5a2a1c" />



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

## Modes finished

## Normal Mode 

Core Mechanics: Implement the 6x12 grid with "Explode on Cap" logic. Capacity is equal to the number of neighbors (i.e. corner cells have capacity as 2, edge cells 3 and others 4 for a rectangular grid). On every explosion, redistribution occurs and the neighbors must also be checked for possibility of explosion.
Movement: Fully functional turn-based system (2 player).
Responsiveness: A mobile-friendly UI that scales to different screen sizes.
Essentials: Basic sound effects and a functioning scoring system. It must be timer based (both per person and overall), with pause and resume features.

## Hacker Mode

Teleportation: Specific cells act as portals, instantly transporting units across the board.
Move History: A visual display of all previous moves and a leaderboard ranked by the score.
Power-Ups: Implement bombs (that burst and clear out all cells in a predefined radius) and other tactical boosts to disrupt the opponent.
Multiplayer Mode: Support for more than 2 players

## Hacker++ Mode

Animations: Placing, exploding and bonding of elements within a grid must be animated.



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

Developed by Hiba for Delta Task 1 . Thanks to the Delta Force team for the inspiration.
