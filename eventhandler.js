import { createInitialState } from "./state_manager.js";
import { playSound } from "./soundmanager.js";

// ========== GAME STATE AND SETUP ==========

// Create the initial game state when the page loads
const state = createInitialState();

// Timer variables - game runs for 10 minutes total
const GAME_DURATION_SECONDS = 10 * 60; // 10 minutes
let timeLeft = GAME_DURATION_SECONDS;
let timerId = null;
let isPaused = false;

// Timer variables for individual player moves - each player gets 10 seconds
const MOVE_DURATION_SECONDS = 10;
let moveTimeLeft = MOVE_DURATION_SECONDS;
let moveTimerId = null;

// Get the board element from the HTML
const board = document.getElementById("board");
const transitionFx = document.getElementById("transitionFx");
let transitionFxTimeoutId = null;

// ========== CREATE THE BOARD GRID ==========

// Build the game board with 12 rows and 6 columns of cells
for (let row = 0; row < 12; row = row + 1) {
  for (let col = 0; col < 6; col = col + 1) {
    // Create a new cell div element
    const newCell = document.createElement("div");
    newCell.className = "cell";
    newCell.dataset.row = row;
    newCell.dataset.col = col;

    // Add this cell to the game board
    board.appendChild(newCell);
  }
}

// ========== DISPLAY FUNCTIONS ==========

// Function that redraws the board with current player colors and piece counts
function renderBoard(currentState) {
  // Get all the cell elements from the HTML
  const allCells = document.querySelectorAll(".cell");

  // Go through each cell element and update it
  for (let i = 0; i < allCells.length; i = i + 1) {
    const cellElement = allCells[i];

    // Convert the cell's index position to row and column
    // Since we have 6 columns, we can calculate position this way
    const cellRow = Math.floor(i / 6);
    const cellCol = i % 6;

    // Get the cell's data from our game state
    const cellData = currentState.board[cellRow][cellCol];

    // Remove all special CSS classes from previous state
    cellElement.classList.remove(
      "teleport-a",
      "teleport-b",
      "teleport-c",
      "teleport-d",
      "teleport-e",
      "fortress-cell",
    );

    // Add the teleport class if this is a teleport cell
    if (cellData.teleportId) {
      cellElement.classList.add(
        `teleport-${cellData.teleportId.toLowerCase()}`,
      );
      cellElement.dataset.teleportId = cellData.teleportId;
    } else {
      delete cellElement.dataset.teleportId;
    }

    // Add fortress class if this is a fortress cell
    if (cellData.isFortress) {
      cellElement.classList.add("fortress-cell");
    }

    // Update the cell display based on piece count
    if (cellData.count > 0) {
      // Determine which player owns this cell
      const playerClass = cellData.owner === 1 ? "player-1" : "player-2";

      // Clear old content
      cellElement.innerHTML = "";

      // Create a container for the piece circles
      const piecesContainer = document.createElement("div");
      piecesContainer.className = "pieces-wrap";

      // Create one circle for each piece in the cell
      for (let j = 0; j < cellData.count; j = j + 1) {
        const piece = document.createElement("span");
        piece.className = `piece ${playerClass}`;
        piecesContainer.appendChild(piece);
      }

      cellElement.appendChild(piecesContainer);

      // Add the count label showing current/max capacity
      const label = document.createElement("span");
      label.className = "cell-label";
      label.textContent = `${cellData.count}/${cellData.capacity}`;
      cellElement.appendChild(label);
    } else {
      // Cell is empty, just show the capacity
      cellElement.innerHTML = `<span class="cell-label">0/${cellData.capacity}</span>`;
    }
  }

  // Update the score display to match the board state
  updateScoreDisplay(currentState);
}

// ========== ROW RIPPER POWER-UP LOGIC ==========

// Function that activates when an explosion happens on the Row Ripper's current row
function activateRowRipper(row, currentPlayer) {
  // Check if the explosion happened on the same row as the Row Ripper indicator
  if (state.rowRipperCurrentRow !== row) {
    return; // Row ripper is not active for this row
  }

  console.log(
    `🔥 ROW RIPPER ACTIVATED on row ${row} by Player ${currentPlayer}!`,
  );

  // Apply row-ripper effect to every cell in this row
  for (let col = 0; col < state.board[row].length; col = col + 1) {
    const cell = state.board[row][col];

    if (cell.count === 0) {
      // Empty cell: place one piece for the current player
      cell.owner = currentPlayer;
      cell.count = 1;
    } else if (cell.owner === currentPlayer) {
      // Already owned by current player: add one more piece
      cell.count = cell.count + 1;
    } else {
      // Owned by another player: take over with one piece
      cell.owner = currentPlayer;
      cell.count = 1;
    }
  }

  // Show visual effects and message
  showRowRipperEffect(row);
  showTransitionEffect("ROW RIPPER");
  playSound("teleport"); // Play a special sound for row-ripper
}

// Function that handles what happens when pieces spread to neighboring cells
// This is called after a cell explodes to add pieces to adjacent cells
function spreadToNeighbor(row, col, currentPlayer) {
  // Make sure the neighboring cell is on the board
  if (row < 0 || row >= 12 || col < 0 || col >= 6) {
    return; // Out of bounds, can't spread here
  }

  const neighbor = state.board[row][col];

  // Check if this is a Fortress Cell that belongs to the other player
  const isFortress = neighbor.isFortress;
  const fortressOwnedByOther =
    isFortress && neighbor.owner !== null && neighbor.owner !== currentPlayer;

  // If it's an enemy's fortress, don't add pieces (fortress protects it)
  if (fortressOwnedByOther) {
    return;
  }

  // Add one piece from the current player to this neighbor
  neighbor.owner = currentPlayer;
  neighbor.count = neighbor.count + 1;

  // Check if the neighbor cell now needs to explode too
  explodeCell(row, col, currentPlayer);
}

// Function that makes a cell explode and spread pieces to neighbors
function triggerExplosionAt(row, col, currentPlayer, allowTeleport) {
  const currentCell = state.board[row][col];
  const isFortressExplosion = currentCell.isFortress;

  // Check if we should teleport pieces instead of exploding
  if (allowTeleport && currentCell.teleportPair) {
    // This is a teleport cell - send pieces to the partner cell
    const targetRow = currentCell.teleportPair.row;
    const targetCol = currentCell.teleportPair.col;

    showTransitionEffect();
    playSound("teleport");

    // Clear this cell
    currentCell.count = 0;
    currentCell.owner = null;

    // Trigger explosion at the teleport destination
    triggerExplosionAt(targetRow, targetCol, currentPlayer, false);
    return;
  }

  // Normal explosion - clear this cell
  playSound("explosion");
  currentCell.count = 0;
  currentCell.owner = null;

  // Spread pieces to all 4 neighbors (up, down, left, right)
  spreadToNeighbor(row - 1, col, currentPlayer); // Spread up
  spreadToNeighbor(row + 1, col, currentPlayer); // Spread down
  spreadToNeighbor(row, col - 1, currentPlayer); // Spread left
  spreadToNeighbor(row, col + 1, currentPlayer); // Spread right
}

// Function that checks if a cell is full and needs to explode
// If the cell has reached its capacity, it explodes
function explodeCell(row, col, currentPlayer, allowTeleport = true) {
  const currentCell = state.board[row][col];

  // Check if the cell has reached its capacity limit
  if (currentCell.count < currentCell.capacity) {
    return; // Not full yet, don't explode
  }

  // Cell is full - try to activate row ripper if active
  activateRowRipper(row, currentPlayer);

  // Trigger the explosion at this cell
  triggerExplosionAt(row, col, currentPlayer, allowTeleport);
}

// ========== VISUAL EFFECTS ==========

// Function to show the transportation/teleport effect banner
function showTransitionEffect(message = "TRANSPORTATON") {
  if (!transitionFx) {
    return;
  }

  // Update the banner message
  const label = transitionFx.querySelector(".transition-label");
  if (label) {
    label.textContent = message;
  }

  // Reset the animation by removing and re-adding the class
  transitionFx.classList.remove("active");
  void transitionFx.offsetWidth; // Force a reflow to restart animation
  transitionFx.classList.add("active");

  // Show pulse effect on all teleport cells
  showTeleportPulseEffect();

  // Clear any existing timeout
  if (transitionFxTimeoutId) {
    clearTimeout(transitionFxTimeoutId);
  }

  // Hide the banner after a short visible time (3 seconds)
  transitionFxTimeoutId = setTimeout(() => {
    transitionFx.classList.remove("active");
    if (label) {
      label.textContent = "TRANSPORTATON";
    }
  }, 3000); // 3 seconds visible
}

// Function to show pulse animation on all cells (teleport effect)
function showTeleportPulseEffect() {
  const allCells = document.querySelectorAll(".cell");

  for (let i = 0; i < allCells.length; i = i + 1) {
    const cell = allCells[i];
    cell.classList.add("teleport-pulse");

    // Remove the effect after animation completes
    setTimeout(() => {
      cell.classList.remove("teleport-pulse");
    }, 1200);
  }
}

// Function to show pulse animation on a specific row (row ripper effect)
function showRowRipperEffect(row) {
  const allCells = document.querySelectorAll(".cell");

  for (let i = 0; i < allCells.length; i = i + 1) {
    const cell = allCells[i];
    const cellRow = Math.floor(i / 6);

    // Only add effect to cells in the row that exploded
    if (cellRow === row) {
      cell.classList.add("row-ripper-active");
      cell.classList.add("row-ripper-pulse");

      // Remove effect after animation
      setTimeout(() => {
        cell.classList.remove("row-ripper-active");
        cell.classList.remove("row-ripper-pulse");
      }, 500); // Match animation duration
    }
  }
}

// ========== SECOND WIND POWER-UP LOGIC ==========

// Function to activate Second Wind for a player
// Gives them 2 extra turns to play
function activateSecondWind(player) {
  state.secondWind.active = true;
  state.secondWind.player = player;
  state.secondWind.chancesLeft = 2;
  showSecondWindEffect();
  playSound("powerup");
  console.log(
    `🎯 SECOND WIND ACTIVATED for Player ${player}! They get 2 extra chances!`,
  );
  showTransitionEffect("SECOND WIND");
}

// Function to update the Second Wind display on the screen
function updateSecondWindDisplay() {
  const indicator = document.getElementById("secondWindIndicator");
  if (!indicator) return;

  // Show the indicator if Second Wind is active for the current player
  if (
    state.secondWind.active &&
    state.secondWind.player === state.currentPlayer
  ) {
    indicator.style.display = "block";

    // Update the player text
    const playerSpan = indicator.querySelector(".second-wind-player");
    if (playerSpan) {
      playerSpan.textContent = `Player ${state.secondWind.player} gets 2 turns`;
    }

    // Update the chances left
    const chancesSpan = indicator.querySelector(".second-wind-chances");
    if (chancesSpan) {
      const plural = state.secondWind.chancesLeft !== 1 ? "s" : "";
      chancesSpan.textContent = `${state.secondWind.chancesLeft} chance${plural} left`;
    }
  } else {
    // Hide if not active or not current player
    indicator.style.display = "none";
  }
}

// Function to show visual effect for Second Wind activation
function showSecondWindEffect() {
  const allCells = document.querySelectorAll(".cell");

  for (let i = 0; i < allCells.length; i = i + 1) {
    const cell = allCells[i];
    cell.classList.add("second-wind-pulse");

    // Remove effect after animation
    setTimeout(() => {
      cell.classList.remove("second-wind-pulse");
    }, 1500);
  }
}

// Function to turn off Second Wind when it's used up
function deactivateSecondWind() {
  state.secondWind.active = false;
  state.secondWind.player = null;
  state.secondWind.chancesLeft = 0;
  updateSecondWindDisplay();
}

// ========== FORTRESS CELL POWER-UP LOGIC ==========

// Function called when a player claims a Fortress Cell
function activateFortressCell(player, row, col) {
  playSound("click");
  console.log(
    `🏰 FORTRESS CELL CLAIMED by Player ${player} at (${row}, ${col})!`,
  );
  showTransitionEffect("FORTRESS CLAIMED");
  showFortressCellEffect(row, col);
  displayFortressIndicator(player, row, col);
}

// Function to show pulse animation on a fortress cell
function showFortressCellEffect(row, col) {
  const allCells = document.querySelectorAll(".cell");

  for (let i = 0; i < allCells.length; i = i + 1) {
    const cell = allCells[i];
    const cellRow = Math.floor(i / 6);
    const cellCol = i % 6;

    // Only add effect to the fortress cell that was claimed
    if (cellRow === row && cellCol === col) {
      cell.classList.add("fortress-pulse");

      // Remove effect after animation
      setTimeout(() => {
        cell.classList.remove("fortress-pulse");
      }, 1200);
    }
  }
}

// Function to show the fortress indicator message at the top right
function displayFortressIndicator(player, row, col) {
  const indicator = document.getElementById("fortressCellIndicator");
  if (!indicator) return;

  // Show the indicator
  indicator.style.display = "flex";
  indicator.style.position = "fixed";
  indicator.style.top = "20px";
  indicator.style.right = "20px";

  // Update the player text
  const playerSpan = indicator.querySelector(".fortress-cell-player");
  if (playerSpan) {
    playerSpan.textContent = `Player ${player}`;
  }

  // Hide the indicator after 3 seconds
  setTimeout(() => {
    indicator.style.display = "none";
  }, 3000);
}

// ========== GAME LOGIC AND CLICK HANDLER ==========

// Function that handles when a player clicks on a cell
function handleBoardClick(event) {
  // Find which cell was clicked
  const clickedCell = event.target.closest(".cell");

  if (!clickedCell) {
    return; // Click was not on a cell
  }

  // Don't allow moves if game is over or paused
  if (state.gameOver || isPaused) {
    return;
  }

  // Get the row and column of the clicked cell
  const row = Number(clickedCell.dataset.row);
  const col = Number(clickedCell.dataset.col);

  console.log(`Clicked cell at row ${row}, col ${col}`);

  // Get the cell data from our game state
  const cellData = state.board[row][col];

  // Check if this cell can be played on
  // Players can click on empty cells or cells that already have their pieces
  const canPlayHere =
    cellData.count === 0 || cellData.owner === state.currentPlayer;

  if (canPlayHere) {
    // Remember if this was a new Fortress Cell claim
    const wasFortressEmpty = cellData.isFortress && cellData.count === 0;

    // Add a piece to this cell
    cellData.owner = state.currentPlayer;
    cellData.count = cellData.count + 1;
    playSound("click");
    console.log("after move:", { row, col, cell: state.board[row][col] });

    // Check if player just claimed a Fortress Cell
    if (wasFortressEmpty) {
      activateFortressCell(state.currentPlayer, row, col);
    }

    // Check if the cell is full and needs to explode
    explodeCell(row, col, state.currentPlayer);

    // Handle turn switching and Second Wind logic
    handleTurnSwitch();

    // Update all displays
    updatePlayerDisplay();

    // Reset the per-move timer for the next player
    stopMoveTimer();
    moveTimeLeft = MOVE_DURATION_SECONDS;
    startMoveTimer();

    // Check if we need to activate Second Wind after every 4 turns
    if (state.turnsCompleted >= 4) {
      checkAndActivateSecondWind();
    }

    // Update the Second Wind display
    updateSecondWindDisplay();

    // Check if the new current player can make any moves
    if (!canPlayerMove(state.currentPlayer)) {
      // No moves available - other player wins
      const winner = state.currentPlayer === 1 ? 2 : 1;
      endGame(`Game Over! Player ${winner} wins!`);
      return;
    }

    // Redraw the board with new state
    renderBoard(state);
  }
}

// Function to handle switching turns between players
function handleTurnSwitch() {
  // Check if Second Wind is active for the current player
  if (
    state.secondWind.active &&
    state.secondWind.player === state.currentPlayer &&
    state.secondWind.chancesLeft > 0
  ) {
    // Player has extra turns left
    state.secondWind.chancesLeft = state.secondWind.chancesLeft - 1;
    updateSecondWindDisplay();

    if (state.secondWind.chancesLeft === 0) {
      // Second Wind is used up - switch to other player
      state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
      deactivateSecondWind();
    }
    // If chances left, same player plays again
  } else {
    // No Second Wind or it's inactive - normal turn switch
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  }

  // Update the message and turn counter
  state.message = `Player ${state.currentPlayer}'s turn`;
  state.turnsCompleted = state.turnsCompleted + 1;
}

// Add click listener to the board
board.addEventListener("click", handleBoardClick);

// ========== DISPLAY UPDATE FUNCTIONS ==========

// Function to update the display showing whose turn it is
function updatePlayerDisplay() {
  const statusElement = document.getElementById("status");
  if (statusElement) {
    statusElement.textContent = `Player ${state.currentPlayer}'s turn`;
  }
}

// Function to count pieces for each player and update the score display
function updateScoreDisplay(currentState) {
  let player1Pieces = 0;
  let player2Pieces = 0;

  // Count all pieces on the board for each player
  for (let row = 0; row < 12; row = row + 1) {
    for (let col = 0; col < 6; col = col + 1) {
      const cell = currentState.board[row][col];

      if (cell.owner === 1) {
        player1Pieces = player1Pieces + cell.count;
      }

      if (cell.owner === 2) {
        player2Pieces = player2Pieces + cell.count;
      }
    }
  }

  // Store the scores in the game state
  currentState.scores[1] = player1Pieces;
  currentState.scores[2] = player2Pieces;

  // Get timeout penalties (if any player timed out)
  const player1Penalty = currentState.timeoutPenalties?.[1] || 0;
  const player2Penalty = currentState.timeoutPenalties?.[2] || 0;

  // Calculate display scores (don't go below 0)
  const displayScore1 = Math.max(0, player1Pieces - player1Penalty);
  const displayScore2 = Math.max(0, player2Pieces - player2Penalty);

  // Update the score display element
  const scoreElement = document.getElementById("score");
  if (scoreElement) {
    scoreElement.textContent = `Score - Player 1: ${displayScore1} | Player 2: ${displayScore2}`;
  }
}

// ========== GAME STATE CHECKING FUNCTIONS ==========

// Function to check if Second Wind should be activated
// Activates for a player if the other player has 0 score
function checkAndActivateSecondWind() {
  // Don't activate if Second Wind is already active
  if (state.secondWind.active) {
    return;
  }

  // Update scores first to make sure they're current
  updateScoreDisplay(state);

  // Check how many pieces the current player has
  const currentScore = state.scores[state.currentPlayer] || 0;

  // If current player has no pieces, give Second Wind to the other player
  if (currentScore === 0) {
    const otherPlayer = state.currentPlayer === 1 ? 2 : 1;
    activateSecondWind(otherPlayer);
  }
}

// Function to decide the winner when time runs out
function determineWinnerMessage() {
  // Get raw scores
  const rawScore1 = state.scores ? state.scores[1] || 0 : 0;
  const rawScore2 = state.scores ? state.scores[2] || 0 : 0;

  // Get any timeout penalties
  const penalty1 = state.timeoutPenalties?.[1] || 0;
  const penalty2 = state.timeoutPenalties?.[2] || 0;

  // Calculate final scores with penalties
  const finalScore1 = Math.max(0, rawScore1 - penalty1);
  const finalScore2 = Math.max(0, rawScore2 - penalty2);

  // Check for a tie
  if (finalScore1 === finalScore2) {
    return `Time is up! It's a tie: ${finalScore1} - ${finalScore2}`;
  }

  // Determine the winner
  const winner = finalScore1 > finalScore2 ? 1 : 2;
  const winScore = Math.max(finalScore1, finalScore2);
  const loseScore = Math.min(finalScore1, finalScore2);
  return `Time is up! Player ${winner} wins ${winScore} to ${loseScore}!`;
}

// Function to check if a player can make any moves
// A player can move if there's at least one empty cell or a cell they own
function canPlayerMove(playerNumber) {
  for (let row = 0; row < 12; row = row + 1) {
    for (let col = 0; col < 6; col = col + 1) {
      const cell = state.board[row][col];

      // Check if this cell is empty or owned by this player
      if (cell.count === 0 || cell.owner === playerNumber) {
        return true; // Found a playable cell
      }
    }
  }

  // No playable cells found
  return false;
}

// ========== GAME CONTROL FUNCTIONS ==========

// Function to restart the game and reset everything to initial state
function restartGame() {
  console.log("Restarting game...");

  // Create a fresh game state
  const freshState = createInitialState();

  // Copy the new state values into the current game state
  state.board = freshState.board;
  state.currentPlayer = freshState.currentPlayer;
  state.scores = freshState.scores;
  state.timeoutPenalties = freshState.timeoutPenalties;
  state.rowRipperCurrentRow = freshState.rowRipperCurrentRow;
  state.turnsCompleted = freshState.turnsCompleted;
  state.secondWind = freshState.secondWind;
  state.gameOver = false;
  state.message = "Player 1's turn";

  // Reset timer variables
  isPaused = false;
  timeLeft = GAME_DURATION_SECONDS;

  // Reset and start the per-move timer
  stopMoveTimer();
  moveTimeLeft = MOVE_DURATION_SECONDS;
  updateMoveTimerDisplay();
  startMoveTimer();

  // Reset and start the game timer
  updateTimerDisplay();
  startTimer();

  // Redraw everything on screen
  renderBoard(state);
  updatePlayerDisplay();
  updateSecondWindDisplay();
  updatePauseButton();
}

// Function to set up the Row Ripper indicator animation
function initRowRipperIndicator() {
  const indicator = document.getElementById("rowRipperIndicator");
  const boardContainer = document.querySelector(".board-container");

  if (!indicator) return;

  // Function to move the indicator to match the row ripper's position
  const updateIndicatorPosition = () => {
    // Find the first cell in the row
    const firstCellInRow = document.querySelector(
      `.cell[data-row="${state.rowRipperCurrentRow}"][data-col="0"]`,
    );

    if (firstCellInRow && boardContainer) {
      // Get position of the cell
      const cellPosition = firstCellInRow.getBoundingClientRect();
      const boardPosition = boardContainer.getBoundingClientRect();

      // Calculate where to place the indicator vertically
      const indicatorHeight = 56;
      const topOffset =
        cellPosition.top -
        boardPosition.top +
        (cellPosition.height - indicatorHeight) / 2;

      // Update the indicator position
      indicator.style.top = `${topOffset}px`;
      indicator.style.left = "-72px";
    }
  };

  // Move row-ripper to the next row every 800 milliseconds
  setInterval(() => {
    state.rowRipperCurrentRow = (state.rowRipperCurrentRow + 1) % 12;
    updateIndicatorPosition();
  }, 800);

  updateIndicatorPosition();
}

// ========== START THE GAME ==========

// Set up the timer display
updateTimerDisplay();
startTimer();

// Render the initial board
renderBoard(state);
updatePlayerDisplay();
updateMoveTimerDisplay();
startMoveTimer();

// Start the Row Ripper animation
initRowRipperIndicator();

// Expose state for debugging in the console
if (typeof window !== "undefined") {
  window._gameState = state;
}

// ========== EVENT LISTENERS FOR BUTTONS ==========

// Add listener for the restart button
const restartBtn = document.getElementById("restartBtn");
if (restartBtn) {
  restartBtn.addEventListener("click", restartGame);
}

// Add listener for the pause button
const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) {
  pauseBtn.addEventListener("click", togglePause);
}

// ========== TIMER FUNCTIONS ==========

// Function to format seconds as MM:SS (like 05:00, 04:59, etc)
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Pad minutes and seconds with leading zeros if needed
  const minutesString = String(minutes).padStart(2, "0");
  const secondsString = String(seconds).padStart(2, "0");

  return `${minutesString}:${secondsString}`;
}

// Function to update the game timer display
function updateTimerDisplay() {
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.textContent = `Time Left: ${formatTime(timeLeft)}`;
  }
}

// Function to update the pause button text and appearance
function updatePauseButton() {
  if (!pauseBtn) {
    return;
  }

  // Change button text based on pause state
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  pauseBtn.setAttribute("aria-pressed", String(isPaused));

  // Add/remove visual class to show paused state
  board.classList.toggle("paused", isPaused);
}

// Function to toggle between paused and playing
function togglePause() {
  // Don't allow pause if game is already over
  if (state.gameOver) {
    return;
  }

  if (isPaused) {
    // Resume the game
    isPaused = false;
    state.message = `Player ${state.currentPlayer}'s turn`;
    updatePlayerDisplay();
    startTimer();
    startMoveTimer();
  } else {
    // Pause the game
    isPaused = true;
    stopTimer();
    stopMoveTimer();
    state.message = `Game paused. Player ${state.currentPlayer}'s turn`;
    updatePlayerDisplay();
  }

  updatePauseButton();
}

// ========== MAIN GAME TIMER (10 MINUTES) ==========

// Function to start the countdown timer
function startTimer() {
  stopTimer(); // Stop any existing timer first
  updateTimerDisplay();

  // Decrease time every second
  timerId = setInterval(() => {
    timeLeft = timeLeft - 1;
    updateTimerDisplay();

    // Check if time ran out
    if (timeLeft <= 0) {
      endGame(determineWinnerMessage());
    }
  }, 1000); // Every 1000 milliseconds (1 second)
}

// Function to stop the countdown timer
function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

// Function to end the game with a message
function endGame(finalMessage) {
  // Only end if not already ended
  if (state.gameOver) return;

  state.gameOver = true;
  isPaused = false;
  stopTimer();
  stopMoveTimer();
  playSound("gameover");

  // Show the final message
  const statusElement = document.getElementById("status");
  if (statusElement) {
    statusElement.textContent = finalMessage;
  }

  // Remove click listener so no more moves can be made
  board.removeEventListener("click", handleBoardClick);
  updatePauseButton();
}

// ========== PER-MOVE TIMER (10 SECONDS PER PLAYER) ==========

// Function to format time as SS (like 09, 08, etc)
function formatTimeShort(seconds) {
  return String(seconds).padStart(2, "0");
}

// Function to update the per-move timer display
function updateMoveTimerDisplay() {
  const moveTimerElement = document.getElementById("moveTimer");
  if (moveTimerElement) {
    moveTimerElement.textContent = `Move Time: ${formatTimeShort(moveTimeLeft)}s`;
  }
}

// Function to stop the per-move timer
function stopMoveTimer() {
  if (moveTimerId) {
    clearInterval(moveTimerId);
    moveTimerId = null;
  }
}

// Function to start the per-move timer
function startMoveTimer() {
  stopMoveTimer(); // Stop any existing timer first
  updateMoveTimerDisplay();

  // Decrease move time every second
  moveTimerId = setInterval(() => {
    moveTimeLeft = moveTimeLeft - 1;
    updateMoveTimerDisplay();

    // Check if the player ran out of time
    if (moveTimeLeft <= 0) {
      stopMoveTimer();

      // The current player timed out
      const timedOutPlayer = state.currentPlayer;
      alert(`Player ${timedOutPlayer} timed out. -5 points.`);

      // Apply penalty
      state.timeoutPenalties[timedOutPlayer] =
        state.timeoutPenalties[timedOutPlayer] + 5;
      updateScoreDisplay(state);

      // Switch to other player
      state.currentPlayer = timedOutPlayer === 1 ? 2 : 1;
      state.message = `Player ${state.currentPlayer}'s turn`;
      updatePlayerDisplay();

      // Reset timer for next player
      moveTimeLeft = MOVE_DURATION_SECONDS;
      updateMoveTimerDisplay();

      // Check if the new current player can move
      if (!canPlayerMove(state.currentPlayer)) {
        const winner = state.currentPlayer === 1 ? 2 : 1;
        endGame(`Game Over! Player ${winner} wins!`);
        return;
      }

      // Start timer for next player
      startMoveTimer();
    }
  }, 1000); // Every 1000 milliseconds (1 second)
}
