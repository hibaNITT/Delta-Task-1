import { createInitialState } from "./state-manager.js";
import { playSound } from "./sound-manager.js";

// Adding this for debugging
//const playSound = () => console.log(" Sound skipped (file missing)");

// IMPORTANT: Game state is NOW DELAYED until player selection

// what is modal ?
// A modal is a UI element that appears on top of the main content.
// It usually dims the background and forces the user to interact with it before returning to the page.
// Commonly used for login forms, alerts, or confirmations.

//==============================================================================================================

//HELPER FUNCTIONS

let state = null;
// to count the number of explosions
let reactionScoreContext = null;

// Track whether each player has made their personal initial placement
let playedFirstMoveByPlayer = {};

//=========================================================================================================

//RULES MODAL

function rulesModal(visible) {
  const modal = document.getElementById("rulesModal");
  if (!modal) {
    console.error("rules modal not found in HTML");
    return;
  }

  // Display modal as flex overlay (centered) or hide it completely
  modal.style.display = visible ? "flex" : "none";
}

// Function to show the player selection modal
function showRulesModal() {
  rulesModal(true);
}

// Function to hide the player selection modal
function hideRulesModal() {
  rulesModal(false);
}

//Fuctions to set up the click handler to button in rules modal!!

function setRulesModalButton() {
  const button = document.querySelector(".play-btn");
  if (!button) {
    return;
  }

  //this is to wire the button to this flow
  button.addEventListener("click", () => {
    hideRulesModal();
    showPlayerSelectionModal();
  });
}

// ==========================================================================================================

//PLAYER SELECTION MODAL
function playerSelectionModal(visible) {
  const modal = document.getElementById("playerSelectionModal");
  if (!modal) {
    console.error("Player selection modal not found in HTML");
    return;
  }

  // Display modal as flex overlay (centered) or hide it completely
  modal.style.display = visible ? "flex" : "none";
}

// Function to show the player selection modal
function showPlayerSelectionModal() {
  playerSelectionModal(true);
}

// Function to hide the player selection modal
function hidePlayerSelectionModal() {
  playerSelectionModal(false);
}

// Function to set up click handlers on all player selection buttons
// This runs when page loads

function setupPlayerSelectionButtons() {
  const buttons = document.querySelectorAll(".player-btn");

  // Add click event listener to each button
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      // inside the handler, we already know exactly which button was clicked
      const playerCount = Number(button.dataset.players);

      // Validate the number
      if (
        !Number.isInteger(playerCount) ||
        playerCount < 2 ||
        playerCount > 6
      ) {
        alert("Invalid player count. Must be 2-6.");
        return;
      }

      // Start the game with this player count

      //error handling - this is the format
      try {
        initializeGame(playerCount);
      } catch (err) {
        console.error("initializeGame failed:", err);
        // Ensure modal is hidden so user can see console and page state
        try {
          hidePlayerSelectionModal();
        } catch (e) {
          // swallow
        }
        alert("Failed to start game. See console for details.");
      }
    });
  });
}

//==========================================================================================================

//wiring modals

// DOMContentLoaded - It makes your code run only after the HTML is fully loaded, but before images, CSS, and other resources finish loading.
document.addEventListener("DOMContentLoaded", () => {
  // Show the rules first, then reveal player selection only after Start Playing.
  showRulesModal();
  hidePlayerSelectionModal();

  setupPlayerSelectionButtons(); //this function itself hides rules modal and displays player selection modal

  setRulesModalButton(); //this itself hides the selection modal after the no of players are selected
});

//MULTIPLAYER MODE
// Function to initialize the game after player count is selected
// Game was starting immediately on page load; now it waits for player selection
// This function is called when user clicks a player count button

function initializeGame(playerCount = 2) {
  // Validate and create game state with selected player count
  // This initializes scores, penalties, board, etc but not for 2 players but for N players

  //error handling function
  try {
    state = createInitialState(playerCount);
  } catch (error) {
    alert("Error: " + error.message);
    return;
  }

  //  Hide the player selection modal to show the game board
  hidePlayerSelectionModal();

  //  Build the 12x6 board grid with cell divs
  initializeBoardGrid();

  //  Reset all timer variables to starting values
  timeLeft = GAME_DURATION_SECONDS;
  moveTimeLeft = MOVE_DURATION_SECONDS;
  isPaused = false;
  resetPlayedFirstMoveByPlayer(playerCount);

  //  Render the initial board state and all UI elements
  renderBoard(state);
  updatePowerupPanel();

  // Initialize/clear move history UI for a new game
  initMoveHistoryUI();
  updatePlayerDisplay();

  // Set up and start both timers (game timer + move timer)
  updateTimerDisplay();
  startTimer();
  updateMoveTimerDisplay();
  startMoveTimer();

  //  Start the Row Ripper animation
  initRowRipperIndicator();

  // Making sure to remove old listener first to avoid double-clicks
  board.removeEventListener("click", handleBoardClick);

  //Attach click listener to board so clicks place pieces
  board.addEventListener("click", handleBoardClick);
}

//=========================================================================================================

//CREATE THE BOARD GRID

// Function to initialize the board grid with 12 rows and 6 columns
// This must be called AFTER player count is selected, not on page load

function initializeBoardGrid() {
  // Clear any existing cells first (in case user restarts game)
  board.innerHTML = "";

  // Build the game board with 12 rows and 6 columns of cells
  for (let row = 0; row < 12; row = row + 1) {
    for (let col = 0; col < 6; col = col + 1) {
      // Create a new cell div element
      const newCell = document.createElement("div");
      newCell.className = "cell";
      newCell.dataset.row = row; //Creates a data-row attribute on the element
      newCell.dataset.col = col;

      // Add this cell to the game board
      board.appendChild(newCell);
    }
  }
}

//===========================================================================================================

// Function that redraws the board with current player colors and piece counts
function renderBoard(currentState) {
  // Get all the cell elements from the HTML
  const allCells = document.querySelectorAll(".cell");

  // Go through each cell element and update it
  for (let i = 0; i < allCells.length; i = i + 1) {
    const cellElement = allCells[i];

    // Convert the cell's index position to row and column
    // Since we have 6 columns
    const cellRow = Math.floor(i / 6);
    const cellCol = i % 6;

    // Geting the cell's data from our game state
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
      // dynamically building class name
      // Build the CSS class for this player's pieces (e.g. "player-1")

      const playerClass = "player-" + cellData.owner;

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

//======================================================================================================

//   GAME LOGIC AND CLICK HANDLER FUNCTIONS FOR PLACEMENT OF PIECES

// Function that handles when a player clicks on a cell

function handleBoardClick(event) {
  // First Finding  which cell was clicked
  const clickedCell = event.target.closest(".cell");

  if (!clickedCell) {
    return; // Click was not on a cell
  }

  // Don't allow moves if game is over or paused, basically disabling clicks
  if (state.gameOver || isPaused) {
    return;
  }

  if (playerIsEliminated(state.currentPlayer)) {
    renderBoard(state);
    endGame(determineWinnerMessage());
    return;
  }

  // Get the row and column of the clicked cell
  let row = Number(clickedCell.dataset.row);
  let col = Number(clickedCell.dataset.col);

  console.log(`Clicked cell at row ${row}, col ${col}`);

  // If Chaos Drift is pending for this player, override their chosen cell
  const chaosPending =
    state.powerups &&
    state.powerups.chaosDrift &&
    state.powerups.chaosDrift.pendingForPlayer === state.currentPlayer;

  if (chaosPending) {
    // Pick a random valid cell for this player and ignore the clicked target
    const valid = getValidCellsForPlayer(state.currentPlayer);
    if (!valid || valid.length === 0) {
      // No valid moves available under constraints
      alert(
        `No valid cells available for Player ${state.currentPlayer} (Chaos Drift).`,
      );
      return;
    }
    const pick = valid[Math.floor(Math.random() * valid.length)];
    row = pick.row;
    col = pick.col;
    state.powerups.chaosDrift.pendingForPlayer = null;
    showPowerupIcon(
      "chaosDrift.png",
      `P${state.currentPlayer} forced to (${row},${col})`,
      1800,
    );
    updatePowerupPanel();
  }

  // Geting  the cell data from our game state
  const cellData = state.board[row][col];

  //STARTING LOGIC
  /* - On the very first turn of the game (state.turnsCompleted === 0) a player
     may place on an empty cell. That placement should add (capacity - 1)
     pieces into that cell. */

  // - After the first turn, players may only click cells they already own.
  let canPlayHere = false;
  const isEmpty = cellData.count === 0; //boolean value
  const isOwner = cellData.owner === state.currentPlayer;

  //DEALING WITH THE FIRST MOVE
  if (isEmpty) {
    // Allow clicking empty cells only if this player hasn't yet made their
    //initial placement.

    //if its his first move then canplayhere = true
    canPlayHere = !playedFirstMoveByPlayer[state.currentPlayer];
  } else {
    // If the cell has pieces, only allow the owning player to click it
    //if he is the owner then canplayhere = truw
    canPlayHere = isOwner;
  }

  // reactionScoreContext is like a structure with some properties that will help us calculate the score

  if (canPlayHere) {
    reactionScoreContext = {
      player: state.currentPlayer,
      capturedPieces: 0,
      chainReactions: 0,
      explosionCount: 0,
    };

    // Remember if this was a new Fortress Cell claim
    const wasFortressEmpty = cellData.isFortress && cellData.count === 0;

    // Determine if this is the player's personal first placement
    const isFirstPlacement =
      isEmpty && !playedFirstMoveByPlayer[state.currentPlayer];

    // Enforce Lockdown: if this player is targeted by lockdown, prevent
    // any placement that would reach or exceed capacity

    const lockdownActive =
      state.powerups &&
      state.powerups.lockdown &&
      state.powerups.lockdown.player === state.currentPlayer &&
      state.powerups.lockdown.turnsLeft > 0;

    const increment = getPlacementIncrement(cellData, isFirstPlacement);
    if (lockdownActive && cellData.count + increment >= cellData.capacity) {
      //FIXINH THE END GAME LOGIC FOR FORTRESS CELLS

      // If the lockdown blocks this placement, check whether the player
      // has any other valid cells. If not, end the game.

      const validCells = getValidCellsForPlayer(state.currentPlayer);
      if (!validCells || validCells.length === 0) {
        renderBoard(state);
        endGame(determineWinnerMessage());
        return;
      }

      // Otherwise simply block this move and inform the player

      playSound("click");
      alert(
        `Player ${state.currentPlayer} is under LOCKDOWN and cannot trigger explosions.`,
      );
      return;
    }

    // Applying the first move

    if (isFirstPlacement) {
      cellData.owner = state.currentPlayer;
      cellData.count = Math.max(1, cellData.capacity - 1);
      playedFirstMoveByPlayer[state.currentPlayer] = true;
    } else {
      cellData.owner = state.currentPlayer;
      cellData.count = cellData.count + 1;
    }
    playSound("click");
    console.log("after move:", { row, col, cell: state.board[row][col] });

    // Check if player just claimed a Fortress Cell
    if (wasFortressEmpty) {
      activateFortressCell(state.currentPlayer, row, col);
    }

    // Check if the cell is full and needs to explode (normal behavior)
    //  Lockdown has already prevented a placement that would explode. so no need to worry
    explodeCell(row, col, state.currentPlayer);

    // Commit the points earned during this move's reaction chain

    let explosionsThisMove = 0;

    if (
      reactionScoreContext &&
      reactionScoreContext.player === state.currentPlayer
    ) {
      //SCORING LOGIC -Points are calculated ie, sum of number of pieces captured in a reaction and the number of chain reactions.

      const pointsEarnedThisTurn =
        reactionScoreContext.capturedPieces +
        reactionScoreContext.chainReactions;

      //we are accessing the players score array
      state.scores[state.currentPlayer] =
        (state.scores[state.currentPlayer] || 0) + pointsEarnedThisTurn;

      // capture explosions count before clearing context so we can award powerups
      explosionsThisMove = reactionScoreContext.explosionCount || 0;
    }

    reactionScoreContext = null;

    // Record this move in the Move History
    // The history shows this completed move until the next move occurs
    // this is why we add this function to handle click function - to stimulate this function every time

    addMoveToHistory(state.currentPlayer, row, col);

    // Handle turn switching
    const previousPlayer = state.currentPlayer;
    handleTurnSwitch();

    // Award power-ups based on exact explosion counts achieved during this move.
    // If the moving player caused exactly 3 explosions, grant Lockdown against the next player.
    if (explosionsThisMove === 3) {
      activateLockdown(previousPlayer, state.currentPlayer);
    }

    // If the moving player caused exactly 5 explosions, force Chaos Drift on the next player.
    if (explosionsThisMove === 5) {
      activateChaosDrift(previousPlayer, state.currentPlayer);
    }

    // NOTE: lockdown turns are decremented in handleTurnSwitch so they count
    // even when the targeted player cannot make a placement. See handleTurnSwitch().

    if (playerIsEliminated(state.currentPlayer)) {
      renderBoard(state);
      endGame(determineWinnerMessage());
      return;
    }

    // Update all displays
    updatePlayerDisplay();

    // Reset the per-move timer for the next player
    stopMoveTimer();
    moveTimeLeft = MOVE_DURATION_SECONDS;
    startMoveTimer();

    // Check if the new current player can make any moves
    // MULTIPLAYER: if current player has no pieces left, the game ends
    if (playerIsEliminated(state.currentPlayer)) {
      // No moves available - determine winner by highest score
      // This works for any number of players (2, 3, 4, 5, 6)
      renderBoard(state);
      endGame(determineWinnerMessage());
      return;
    }

    // Redraw the board with new state
    renderBoard(state);
  }
}

// This Returns the number of pieces that would be added by this placement
// (normal move = 1, first placement = capacity-1 (minimum 1)).

function getPlacementIncrement(cell, isFirstPlacement) {
  if (isFirstPlacement) return Math.max(1, cell.capacity - 1);
  return 1;
}

// Get a list of valid cells (row/col objects) where `player` may place.
// This respects the game's first-placement rule and also Lockdown restrictions.

function getValidCellsForPlayer(player) {
  const valid = [];
  for (let r = 0; r < 12; r = r + 1) {
    for (let c = 0; c < 6; c = c + 1) {
      const cell = state.board[r][c];
      const isEmpty = cell.count === 0;
      const isOwner = cell.owner === player;

      // First placement may allow placing on empty cell
      const firstPlacementAllowed = isEmpty && !playedFirstMoveByPlayer[player];

      if (isOwner || firstPlacementAllowed) {
        // Enforce Lockdown: if player is under lockdown, they may not place
        // in a cell that would reach capacity

        const isUnderLockdown =
          state.powerups &&
          state.powerups.lockdown &&
          state.powerups.lockdown.player === player &&
          state.powerups.lockdown.turnsLeft > 0;

        const inc = getPlacementIncrement(cell, firstPlacementAllowed);

        if (isUnderLockdown && cell.count + inc >= cell.capacity) {
          // not valid while lockdown blocks explosions
          continue;
        }

        valid.push({ row: r, col: c, isFirstPlacement: firstPlacementAllowed });
      }
    }
  }
  return valid;
}

// Return whether the player currently has any valid moves
function playerHasValidMoves(player) {
  const valid = getValidCellsForPlayer(player);
  return valid && valid.length > 0;
}

// Function to handle switching turns between players
function handleTurnSwitch() {
  // Determine the player who is finishing their turn
  const previousPlayer = state.currentPlayer;

  // Normal turn switch
  state.currentPlayer = getNextPlayer(state.currentPlayer, state.playerCount);

  // Update the message and turn counter
  state.message = `Player ${state.currentPlayer}'s turn`;
  state.turnsCompleted = state.turnsCompleted + 1;

  // If a lockdown was active against the player who just finished a turn,
  // decrement the remaining turns. This ensures the lockdown counts the
  // locked player's actual turns (including turns where they couldn't place).

  if (
    state.powerups &&
    state.powerups.lockdown &&
    state.powerups.lockdown.player === previousPlayer &&
    state.powerups.lockdown.turnsLeft > 0
  ) {
    state.powerups.lockdown.turnsLeft = state.powerups.lockdown.turnsLeft - 1;

    if (state.powerups.lockdown.turnsLeft <= 0) {
      showPowerupIcon(
        "lockdown.png",
        `LOCKDOWN ended for P${previousPlayer}`,
        2200,
      );
      state.powerups.lockdown.player = null;
      state.powerups.lockdown.turnsLeft = 0;
      updatePowerupPanel();
    } else {
      updatePowerupPanel();
    }
  }
}

//   EVENT LISTENERS FOR BUTTONS

// Add listener for the restart button
const restartBtn = document.getElementById("restartBtn");
if (restartBtn) {
  restartBtn.addEventListener("click", restartGame);
}

const gameOverRestartBtn = document.getElementById("gameOverRestartBtn");
if (gameOverRestartBtn) {
  gameOverRestartBtn.addEventListener("click", restartGame);
}

// Add listener for the pause button
const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) {
  pauseBtn.addEventListener("click", togglePause);
}

//==========================================================================================================

//EXPLOSION LOGIC

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

// Function that makes a cell explode and spread pieces to neighbors

function triggerExplosionAt(row, col, currentPlayer, allowTeleport) {
  const currentCell = state.board[row][col];
  const isFortressExplosion = currentCell.isFortress;

  if (reactionScoreContext && reactionScoreContext.player === currentPlayer) {
    //incrementing the chainreactions constant after every explosion
    if (reactionScoreContext.explosionCount > 0) {
      reactionScoreContext.chainReactions =
        reactionScoreContext.chainReactions + 1;
    }

    reactionScoreContext.explosionCount =
      reactionScoreContext.explosionCount + 1;
  }

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

  //to avoid capturing the contents of fortress cell if in case they belong to the other player
  const fortressOwnedByOther =
    isFortress && neighbor.owner !== null && neighbor.owner !== currentPlayer;

  if (fortressOwnedByOther) {
    return;
  }

  if (
    reactionScoreContext &&
    reactionScoreContext.player === currentPlayer &&
    neighbor.owner !== null &&
    neighbor.owner !== currentPlayer
  ) {
    reactionScoreContext.capturedPieces =
      reactionScoreContext.capturedPieces + neighbor.count;
  }

  // Add one piece from the current player to this neighbor
  neighbor.owner = currentPlayer;
  neighbor.count = neighbor.count + 1;

  // Check if the neighbor cell now needs to explode too
  explodeCell(row, col, currentPlayer);
}

//=============================================================================================================

//SCORING LOGIC

function getPlayerNetScore(currentState, playerNumber) {
  const rawScore = currentState.scores?.[playerNumber] || 0;
  const penalty = currentState.timeoutPenalties?.[playerNumber] || 0;
  return Math.max(0, rawScore - penalty);
}

//======================================================================================================

//GAME ENDING LOGIC - game ends if the player has no pieces on board
//                   - timer runs out

//to check if the game has ended if player has no pieces
function playerHasPiecesOnBoard(playerNumber) {
  for (let row = 0; row < 12; row = row + 1) {
    for (let col = 0; col < 6; col = col + 1) {
      const cell = state.board[row][col];
      if (cell.owner === playerNumber && cell.count > 0) {
        return true;
      }
    }
  }

  return false;
}

function playerIsEliminated(playerNumber) {
  return (
    playedFirstMoveByPlayer[playerNumber] === true &&
    !playerHasPiecesOnBoard(playerNumber)
  );
}

// Function to decide the winner when time runs out
function determineWinnerMessage() {
  // MULTIPLAYER: support any number of players (not just 1 vs 2)
  let maxScore = -1; //this is to set it to a min valuee
  let winningPlayers = [];

  // Loop through all players to find the highest score
  for (let i = 1; i <= state.playerCount; i = i + 1) {
    const finalScore = getPlayerNetScore(state, i);

    // Track players with the highest score
    if (finalScore > maxScore) {
      maxScore = finalScore;
      winningPlayers = [i]; // Reset list with just this player
    } else if (finalScore === maxScore) {
      winningPlayers.push(i); // Add to list of tied winners
    }
  }

  // MULTIPLAYER: handle single winner or multiple tied winners
  if (winningPlayers.length === 1) {
    return `Time is up! Player ${winningPlayers[0]} WINS with ${maxScore} points!`;
  } else {
    // Multiple players tied - to show all of them
    //why join operation -It takes all the elements of the list and concatenates them into a single string

    const playerList = winningPlayers.join(", ");
    return `Time is up! TIE between Players ${playerList} with ${maxScore} points!`;
  }
}
//=====================================================================================================

//HELPER FUNCTIONS

function resetPlayedFirstMoveByPlayer(playerCount) {
  playedFirstMoveByPlayer = {};
  for (let i = 1; i <= playerCount; i = i + 1) {
    playedFirstMoveByPlayer[i] = false;
  }
}

// Function to toggle between paused and playing
function togglePause() {
  // Ignore pause clicks before a game has been initialized
  if (!state) {
    return;
  }

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

//======================================================================================================

//IMPLEMENTING MOVE HISTORY FEATURE
// Move history tracking keeps a short list of recent moves
//we store the datat in array

const movesHistory = [];
const MAX_HISTORY_ITEMS = 5; // keep last 5 moves

// Initialize the Move History UI (clear previous entries)
function initMoveHistoryUI() {
  const list = document.getElementById("moveHistoryList");
  if (list) list.innerHTML = "";
  movesHistory.length = 0;
}

// Adding a move to history and update the visible list
// player: number, row/col: coordinates where the move was made
function addMoveToHistory(player, row, col) {
  // Creating a simple record with time
  const time = new Date();
  const entry = {
    player,
    row,
    col,
    // we use toLocaleTimeString to store the datat along with time this Converts a time to a string by using the current or specified locale.
    time: time.toLocaleTimeString(),
  };

  // Push and trim...these functions help the array to have exactly 5 items
  movesHistory.push(entry);
  if (movesHistory.length > MAX_HISTORY_ITEMS) movesHistory.shift();

  // Update UI
  renderMoveHistory();
}

// Rendering the move history list into the DOM
function renderMoveHistory() {
  const list = document.getElementById("moveHistoryList");
  if (!list) return;

  // Build list items; we have to have newest at top so

  // First Make a copy of the history so we don’t change the original so we use slice
  const copiedHistory = movesHistory.slice();

  // Reverse it so the latest move comes first so we use reverse()
  const reversedHistory = copiedHistory.reverse();

  // Building the list step by step
  let items = "";
  for (let i = 0; i < reversedHistory.length; i++) {
    const m = reversedHistory[i];

    // Highlight the most recent move (first one in the reversed list)
    // i is the loop counter (starts at 0).
    // i === 0 means “is this the first item?”
    // So isLatest will be true only for the first item, and false for all the others.

    const isLatest = i === 0;

    const cls = isLatest ? "move-item latest" : "move-item";

    // Add this move to the list string
    items += `<li class="${cls}">Player ${m.player} placed at (${m.row}, ${m.col}) <span class="move-time">${m.time}</span></li>`;
  }

  list.innerHTML = items;
}

//===========================================================================================================

//MULTIPLAYER HELPER FUNCTION

// Function to get the next player in turn order
// For N players we need to cycle through 1 to N then back to 1

function getNextPlayer(currentPlayer, playerCount) {
  return (currentPlayer % playerCount) + 1;
}

//============================================================================================================

//TIMER FUNCTIONS

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

// Function to format seconds as MM:SS (like 05:00, 04:59, etc)
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Pad minutes and seconds with leading zeros if needed
  const minutesString = String(minutes).padStart(2, "0");
  const secondsString = String(seconds).padStart(2, "0");

  return `${minutesString}:${secondsString}`;
}

//   MAIN GAME TIMER (10 MINUTES)

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
//   PER-MOVE TIMER (10 SECONDS PER PLAYER)
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

      // MULTIPLAYER: switch to next player using getNextPlayer
      // Instead of hardcoded 1/2 ternary, we use function that works for any player count
      state.currentPlayer = getNextPlayer(timedOutPlayer, state.playerCount);
      state.message = `Player ${state.currentPlayer}'s turn`;
      updatePlayerDisplay();

      // Reset timer for next player
      moveTimeLeft = MOVE_DURATION_SECONDS;
      updateMoveTimerDisplay();

      //this is applied to avoid the case that if the player takes more than 10s to place a piece on board
      // and it shows a tie
      // Check if the new current player is eliminated (has played first move and has no pieces)
      if (playerIsEliminated(state.currentPlayer)) {
        renderBoard(state);
        endGame(determineWinnerMessage());
        return;
      }

      // Start timer for next player
      startMoveTimer();
    }
  }, 1000); // Every 1000 milliseconds (1 second)
}

// Function to format time as SS (like 09, 08, etc)
function formatTimeShort(seconds) {
  return String(seconds).padStart(2, "0");
}

//===============================================================================================================

//   DISPLAY UPDATE FUNCTIONS

// Function to update the display showing whose turn it is
function updatePlayerDisplay() {
  const statusElement = document.getElementById("status");
  if (statusElement) {
    statusElement.textContent = `Player ${state.currentPlayer}'s turn`;
  }
}

// Function to display the current point totals for each player
function updateScoreDisplay(currentState) {
  // Build score display text for all players
  // MULTIPLAYER MODE: loop through all players to build display string
  const scoreElement = document.getElementById("score");
  if (scoreElement) {
    let scoreText = "Score - ";
    const scoreParts = [];

    for (let i = 1; i <= currentState.playerCount; i++) {
      const displayScore = getPlayerNetScore(currentState, i);
      scoreParts.push(`Player ${i}: ${displayScore}`);
    }

    scoreText = scoreText + scoreParts.join(" | ");
    scoreElement.textContent = scoreText;
  }
}

// Update the persistent powerup panel in the HUD
function updatePowerupPanel() {
  const panel = document.getElementById("powerupPanel");
  if (!panel) return;
  panel.innerHTML = "";

  // Lockdown display
  if (
    state.powerups &&
    state.powerups.lockdown &&
    state.powerups.lockdown.turnsLeft > 0
  ) {
    const ld = state.powerups.lockdown;
    const entry = document.createElement("div");
    entry.className = "powerup-entry";
    const img = document.createElement("img");
    img.src = "powerUpIcons/lockdown.png";
    img.alt = "Lockdown";
    const txt = document.createElement("div");
    txt.className = "ptext";
    txt.textContent = `LOCKDOWN: P${ld.player} (${ld.turnsLeft} turns)`;
    entry.appendChild(img);
    entry.appendChild(txt);
    panel.appendChild(entry);
  }

  // Chaos Drift display
  if (
    state.powerups &&
    state.powerups.chaosDrift &&
    state.powerups.chaosDrift.pendingForPlayer
  ) {
    const cd = state.powerups.chaosDrift;
    const entry = document.createElement("div");
    entry.className = "powerup-entry";
    const img = document.createElement("img");
    img.src = "powerUpIcons/chaosDrift.png";
    img.alt = "Chaos Drift";
    const txt = document.createElement("div");
    txt.className = "ptext";
    txt.textContent = `CHAOS DRIFT: P${cd.pendingForPlayer} (next move)`;
    entry.appendChild(img);
    entry.appendChild(txt);
    panel.appendChild(entry);
  }

  if (panel.childElementCount === 0) {
    panel.textContent = "No active power-ups";
  }
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

// Function to update the per-move timer display
function updateMoveTimerDisplay() {
  const moveTimerElement = document.getElementById("moveTimer");
  if (moveTimerElement) {
    moveTimerElement.textContent = `Move Time: ${formatTimeShort(moveTimeLeft)}s`;
  }
}

//=========================================================================================================

//TELEPORTATION LOGIC

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
  // Keep the banner visible longer for power-up messages (8 seconds)
  transitionFxTimeoutId = setTimeout(() => {
    transitionFx.classList.remove("active");
    if (label) {
      label.textContent = "TRANSPORTATON";
    }
  }, 8000); // 8 seconds visible
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

//==========================================================================================================

//ROW RIPPER POWER-UP LOGIC

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

      // Update the indicator position (left position is set in CSS)
      indicator.style.top = `${topOffset}px`;
    }
  };

  // Move row-ripper to the next row every 800 milliseconds
  setInterval(() => {
    state.rowRipperCurrentRow = (state.rowRipperCurrentRow + 1) % 12;
    updateIndicatorPosition();
  }, 800);

  updateIndicatorPosition();
}

// Function that activates when an explosion happens on the Row Ripper's current row
function activateRowRipper(row, currentPlayer) {
  // Check if the explosion happened on the same row as the Row Ripper indicator
  if (state.rowRipperCurrentRow !== row) {
    return; // Row ripper is not active for this row
  }

  //error handling
  console.log(
    ` ROW RIPPER ACTIVATED on row ${row} by Player ${currentPlayer}!`,
  );

  // Apply row-ripper effect to every cell in this row
  for (let col = 0; col < state.board[row].length; col = col + 1) {
    const cell = state.board[row][col];

    // fortress protection: skip enemy-owned fortress cells
    const isFortress = cell.isFortress;
    const fortressOwnedByOther =
      isFortress && cell.owner !== null && cell.owner !== currentPlayer;

    if (fortressOwnedByOther) {
      // Fortress blocks row-ripper captures for enemy-owned fortress
      continue;
    }

    // If this is an unclaimed fortress that will be claimed by row-ripper,
    // remember that so we can trigger the fortress claim UI.

    const willClaimUnclaimedFortress =
      isFortress && cell.owner === null && cell.count === 0;

    if (cell.count === 0) {
      // Empty cell: place one piece for the current player
      cell.owner = currentPlayer;
      cell.count = 1;

      // If this was an unclaimed fortress, trigger the fortress claim effects
      if (willClaimUnclaimedFortress) {
        try {
          activateFortressCell(currentPlayer, row, col);
        } catch (e) {
          console.warn("Failed to activate fortress UI:", e);
        }
      }
    } else if (cell.owner === currentPlayer) {
      // Already owned by current player: add one more piece
      cell.count = cell.count + 1;
    } else {
      if (
        reactionScoreContext &&
        reactionScoreContext.player === currentPlayer
      ) {
        reactionScoreContext.capturedPieces =
          reactionScoreContext.capturedPieces + cell.count;
      }

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

//===========================================================================================================

//   FORTRESS CELL POWER-UP LOGIC

// Function called when a player claims a Fortress Cell
function activateFortressCell(player, row, col) {
  playSound("click");

  console.log(
    ` FORTRESS CELL CLAIMED by Player ${player} at (${row}, ${col})!`,
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

  // Keep the fortress indicator visible longer so player notices it (5 seconds)
  setTimeout(() => {
    indicator.style.display = "none";
  }, 5000);
}

//=========================================================================================================

//LOCKDOWN SABOTAGE LOGIC

// Activate Lockdown: targetPlayer cannot trigger explosions for next 3 turns.
// byPlayer is the player who used the power-up (for logging/UX purposes).
function activateLockdown(byPlayer, targetPlayer) {
  if (!state.powerups) state.powerups = {};
  state.powerups.lockdown = { player: targetPlayer, turnsLeft: 3 };
  showPowerupIcon("lockdown.png", `LOCKDOWN on P${targetPlayer}`, 3000);
  playSound("teleport");
  updatePowerupPanel();
}

//==========================================================================================================

//CHAOS DRIFT SABOTAGE LOGIC

// Activate Chaos Drift: the target player's NEXT move is randomized.
function activateChaosDrift(byPlayer, targetPlayer) {
  if (!state.powerups) state.powerups = {};
  state.powerups.chaosDrift = { pendingForPlayer: targetPlayer };
  showPowerupIcon("chaosDrift.png", `CHAOS DRIFT for P${targetPlayer}`, 3000);
  playSound("teleport");
  updatePowerupPanel();
}

//===========================================================================================================

// Power-up helperfunctions

// Show a small power-up icon near the top to indicate activation
function showPowerupIcon(iconFileName, message = "", duration = 3000) {
  const container = document.createElement("div");
  container.className = "powerup-indicator";
  const img = document.createElement("img");
  img.src = `powerUpIcons/${iconFileName}`;
  img.alt = message || iconFileName;
  img.className = "powerup-icon";
  container.appendChild(img);
  if (message) {
    const span = document.createElement("span");
    span.textContent = message;
    span.className = "powerup-text";
    container.appendChild(span);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), duration);
}

//===========================================================================================================

//RESTART GAME FUNCTION

// Function to restart the game and reset everything to initial state
function restartGame() {
  // Ignore restart clicks before a game has been initialized
  if (!state) {
    return;
  }

  console.log("Restarting game...");

  hideGameOverModal();

  // MULTIPLAYER MODE :  preserve the current player count when restarting
  // Instead of createInitialState() which defaults to 2 players,

  const freshState = createInitialState(state.playerCount);

  // Copy the new state values into the current game state
  state.board = freshState.board;
  state.currentPlayer = freshState.currentPlayer;
  state.scores = freshState.scores;
  state.timeoutPenalties = freshState.timeoutPenalties;
  state.rowRipperCurrentRow = freshState.rowRipperCurrentRow;
  state.turnsCompleted = freshState.turnsCompleted;
  state.gameOver = false;
  state.message = "Player 1's turn";

  resetPlayedFirstMoveByPlayer(state.playerCount);

  // Reset timer variables
  isPaused = false;
  timeLeft = GAME_DURATION_SECONDS;

  // Rebuild the board DOM to ensure cells/dataset attributes are consistent
  initializeBoardGrid();

  // Reattach the board click handler to guarantee it is active - to avoid cases where it is not detecting clicks
  // after clicking play again

  try {
    board.removeEventListener("click", handleBoardClick);
  } catch (e) {
    // ignore if not attached
  }
  board.addEventListener("click", handleBoardClick);

  // Reset and start the per-move timer
  stopMoveTimer();
  moveTimeLeft = MOVE_DURATION_SECONDS;
  updateMoveTimerDisplay();
  startMoveTimer();

  // Reset and start the game timer
  updateTimerDisplay();
  startTimer();

  // Redraw everything on screen
  // Clear move history when restarting the game
  initMoveHistoryUI();
  renderBoard(state);
  updatePlayerDisplay();
  updatePauseButton();
}

//===========================================================================================================

//END GAME FUNCTIONS

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
  showGameOverModal(finalMessage);

  // Remove click listener so no more moves can be made
  board.removeEventListener("click", handleBoardClick);
  updatePauseButton();
}

//GAME OVER MODALS

function setGameOverModal(visible, message = "") {
  const modal = document.getElementById("gameOverModal");
  if (!modal) {
    console.error("Game over modal not found in HTML");
    return;
  }

  const messageElement = document.getElementById("gameOverMessage");
  if (messageElement && message) {
    messageElement.textContent = message;
  }

  modal.style.display = visible ? "flex" : "none";
  modal.setAttribute("aria-hidden", String(!visible));
}

function burstGameOverConfetti() {
  const existingConfetti = document.querySelectorAll(".confetti");
  existingConfetti.forEach((piece) => piece.remove());

  const colors = ["#f59e0b", "#22d3ee", "#fb7185", "#a78bfa", "#f8fafc"];
  const pieceCount = 28;

  for (let index = 0; index < pieceCount; index += 1) {
    const confettiPiece = document.createElement("div");
    confettiPiece.className = "confetti";
    confettiPiece.style.left = `${Math.random() * 100}vw`;
    confettiPiece.style.backgroundColor = colors[index % colors.length];
    confettiPiece.style.width = `${8 + Math.random() * 8}px`;
    confettiPiece.style.height = `${12 + Math.random() * 10}px`;
    confettiPiece.style.borderRadius = index % 3 === 0 ? "999px" : "2px";
    confettiPiece.style.animationDuration = `${2.6 + Math.random() * 1.2}s`;
    confettiPiece.style.animationDelay = `${Math.random() * 0.35}s`;
    confettiPiece.style.transform = `translateY(0) rotate(${Math.random() * 180}deg)`;

    document.body.appendChild(confettiPiece);

    window.setTimeout(() => {
      confettiPiece.remove();
    }, 4000);
  }
}

function showGameOverModal(finalMessage) {
  setGameOverModal(true, finalMessage);
  burstGameOverConfetti();
}

function hideGameOverModal() {
  setGameOverModal(false);
}

//===========================================================================================================
