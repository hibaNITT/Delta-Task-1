// Creating the initial state of the game with a fresh empty board to start playing
// Main function that creates the game state when the game starts

export function createInitialState(playerCount = 2) {
  // to verify the number of players

  if (playerCount < 2 || playerCount > 6) {
    throw new Error("Player count must be between 2 and 6");
  }

  // Creating an empty board: 12 rows by 6 columns

  const board = [];

  // Build the board grid
  //increment ++ is not working - god knows y

  for (let row = 0; row < 12; row = row + 1) {
    const boardRow = [];

    for (let col = 0; col < 6; col = col + 1) {
      // Create one cell with all its properties
      const newCell = {
        row: row,
        col: col,
        capacity: getCellCapacity(row, col, 12, 6), // How many pieces fit here
        owner: null, // No owner yet (null = unclaimed)
        count: 0, // No pieces in the cell yet
        teleportId: null, // Not a teleport cell yet
        teleportPair: null, // No partner teleport yet
        isFortress: false, // Not a fortress cell yet
      };

      boardRow.push(newCell);
    }

    board.push(boardRow);
  }

  //Creating transport pairs
  // Each pair connects two cells - exploding from one takes you to the other
  assignTeleportPair(board, "A", 1, 1, 10, 4);
  assignTeleportPair(board, "B", 2, 3, 9, 2);
  assignTeleportPair(board, "C", 4, 0, 7, 5);
  assignTeleportPair(board, "D", 0, 2, 11, 3);
  assignTeleportPair(board, "E", 3, 5, 8, 0);

  // Adding fortress cells randomly to the board
  assignFortressCells(board);

  //creating the dynamic scores and penalties and storing in array for the multiplayer mode
  //basically storing then in an array
  const scores = {};
  const timeoutPenalties = {};

  for (let i = 1; i <= playerCount; i++) {
    scores[i] = 0;
    timeoutPenalties[i] = 0;
  }

  // Return the complete starting game state
  return {
    board: board,
    playerCount,
    currentPlayer: 1, // Player 1 starts first
    scores, // Both players start with 0 score
    timeoutPenalties, // No penalties yet
    gameOver: false,
    message: "Player 1's turn",
    rowRipperCurrentRow: 0, // Row ripper starts at top
    turnsCompleted: 0,
    powerups: {
      lockdown: { player: null, turnsLeft: 0 },
      chaosDrift: { pendingForPlayer: null },
    },
  };
}

// Function to determine how many pieces can fit in a cell
// Corner cells hold 2 pieces, edge cells hold 3, middle cells hold 4 - orthogonally opposite

function getCellCapacity(row, col, totalRows, totalCols) {
  // Check if the cell is in a corner
  const isCorner =
    (row === 0 || row === totalRows - 1) &&
    (col === 0 || col === totalCols - 1); //accessing the row dataset

  // Check if the cell is on an edge

  const isEdge =
    row === 0 || row === totalRows - 1 || col === 0 || col === totalCols - 1;

  // Return capacity based on position
  if (isCorner) {
    return 2;
  }

  if (isEdge) {
    return 3;
  }

  return 4;
}

// Function to connect two cells as teleport partners
// This means when a cell explodes and has a teleport, pieces move to its partner
function assignTeleportPair(
  board,
  pairId,
  firstRow,
  firstCol,
  secondRow,
  secondCol,
) {
  // Mark both cells with the same ID so we know they're connected
  board[firstRow][firstCol].teleportId = pairId;
  board[firstRow][firstCol].teleportPair = { row: secondRow, col: secondCol };

  board[secondRow][secondCol].teleportId = pairId;
  board[secondRow][secondCol].teleportPair = { row: firstRow, col: firstCol };
}

// Function to randomly place Fortress Cells on the board

function assignFortressCells(board) {
  const fortressCount = 8;
  let placedCount = 0;

  // Keep placing fortress cells until we have 8
  while (placedCount < fortressCount) {
    // Pick a random row and column
    const randomRow = Math.floor(Math.random() * 12);
    const randomCol = Math.floor(Math.random() * 6);
    const cell = board[randomRow][randomCol];

    // Only placingfortress on cells that don't already have teleport or fortress
    if (!cell.teleportId && !cell.isFortress) {
      cell.isFortress = true;
      placedCount = placedCount + 1;
    }
  }
}
