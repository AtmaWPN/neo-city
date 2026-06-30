(() => {
  class NMosaic {
    PALETTE = [
      "#000000",
      "#ffffff",
      "#e74c3c",
      "#2ecc71",
      "#3498db",
      "#f1c40f",
      "#9b59b6"
    ];
    ctx;
    board;
    solution;
    clues;
    HEIGHT;
    WIDTH;
    BOARD_HEIGHT;
    BOARD_WIDTH;
    BOARD_COLORS;
    showSolution = false;
    puzzleComplete = false;
    incorrectClues = 0;
    constructor(height = 9, width = 9, colors = 2, canvas) {
      this.ctx = canvas.getContext("2d");
      this.WIDTH = canvas.width;
      this.HEIGHT = canvas.height;
      this.BOARD_HEIGHT = height;
      this.BOARD_WIDTH = width;
      this.BOARD_COLORS = colors;
      this.board = [];
      this.solution = [];
      this.clues = [];
      this.regenerate(this.BOARD_HEIGHT, this.BOARD_WIDTH, this.BOARD_COLORS);
    }
    regenerate(height = 9, width = 9, colors = 2) {
      this.BOARD_HEIGHT = height;
      this.BOARD_WIDTH = width;
      this.BOARD_COLORS = colors;
      this.board = Array(this.BOARD_HEIGHT).fill(null).map(() => Array(this.BOARD_WIDTH).fill(null).map(() => null));
      this.solution = Array(this.BOARD_HEIGHT).fill(null).map(() => Array(this.BOARD_WIDTH).fill(null).map(() => Math.floor(Math.random() * this.BOARD_COLORS)));
      this.clues = [];
      this.puzzleComplete = false;
      this.showSolution = false;
      for (let row = 0; row < this.BOARD_HEIGHT; row++) {
        for (let col = 0; col < this.BOARD_WIDTH; col++) {
          const clue = new NMosaicClue(
            row,
            col,
            1,
            this.getNeighbors(row, col).filter((it) => this.solution[it[0]][it[1]] === 1).length
          );
          this.clues.push(clue);
        }
      }
      console.log(this.clues);
    }
    getNeighbors(row, col) {
      if (row < 0 || row >= this.BOARD_HEIGHT || col < 0 || col >= this.BOARD_WIDTH) return [];
      const output = [];
      for (let subrow = -1; subrow <= 1; subrow++) {
        for (let subcol = -1; subcol <= 1; subcol++) {
          if (row + subrow < this.BOARD_HEIGHT && row + subrow >= 0 && col + subcol < this.BOARD_WIDTH && col + subcol >= 0) {
            output.push([row + subrow, col + subcol]);
          }
        }
      }
      console.log(output);
      return output;
    }
    drawBackground() {
      this.ctx.fillStyle = "#aaeeee";
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      const squareWidth = this.WIDTH / this.BOARD_WIDTH;
      const squareHeight = this.HEIGHT / this.BOARD_HEIGHT;
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      for (let row = 0; row <= this.BOARD_HEIGHT; row++) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, row * squareHeight);
        this.ctx.lineTo(this.WIDTH, row * squareHeight);
        this.ctx.stroke();
      }
      for (let col = 0; col <= this.BOARD_WIDTH; col++) {
        this.ctx.beginPath();
        this.ctx.moveTo(col * squareWidth, 0);
        this.ctx.lineTo(col * squareWidth, this.HEIGHT);
        this.ctx.stroke();
      }
    }
    drawBoard() {
      const squareWidth = this.WIDTH / this.BOARD_WIDTH;
      const squareHeight = this.HEIGHT / this.BOARD_HEIGHT;
      const fontSize = Math.max(10, Math.min(squareWidth, squareHeight) * 0.45);
      for (let row = 0; row < this.BOARD_HEIGHT; row++) {
        for (let col = 0; col < this.BOARD_WIDTH; col++) {
          const value = this.showSolution ? this.solution[row][col] : this.board[row][col];
          if (value !== null) {
            this.ctx.fillStyle = this.PALETTE[value];
            this.ctx.fillRect(
              col * squareWidth + 1,
              row * squareHeight + 1,
              squareWidth - 2,
              squareHeight - 2
            );
          }
        }
      }
      this.ctx.font = `${fontSize}px "Roboto Mono", monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.incorrectClues = 0;
      this.clues.forEach((clue) => {
        let positiveGuessCount = 0;
        let negativeGuessCount = 0;
        let totalSpaces = 0;
        for (let subrow = -1; subrow <= 1; subrow++) {
          for (let subcol = -1; subcol <= 1; subcol++) {
            if (this.board[clue.row + subrow] !== void 0 && this.board[clue.row + subrow][clue.col + subcol] !== void 0) {
              totalSpaces += 1;
              if (this.board[clue.row + subrow][clue.col + subcol] === 1) {
                positiveGuessCount += 1;
              }
              if (this.board[clue.row + subrow][clue.col + subcol] !== null && this.board[clue.row + subrow][clue.col + subcol] !== 1) {
                negativeGuessCount += 1;
              }
            }
          }
        }
        this.ctx.fillStyle = "#808080";
        if (positiveGuessCount > clue.count || totalSpaces - negativeGuessCount < clue.count) {
          this.ctx.fillStyle = "#ff0000";
          this.incorrectClues += 1;
        }
        this.ctx.fillText(clue.count.toString(), (clue.col + 0.5) * squareWidth, (clue.row + 0.5) * squareHeight);
      });
      if (this.puzzleComplete) {
        this.ctx.font = `bold 96px "Roboto Mono", monospace`;
        this.ctx.fillStyle = "#00ffff";
        this.ctx.fillText("YOU WIN", this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH);
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;
        this.ctx.strokeText("YOU WIN", this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH);
      }
    }
  }
  class NMosaicClue {
    row;
    col;
    color;
    count;
    constructor(row, col, color, count) {
      this.row = row;
      this.col = col;
      this.color = color;
      this.count = count;
    }
  }
  function nMosaicMain() {
    const regenerateButton = document.getElementById("n_mosaic_regenerate");
    const revealSolutionButton = document.getElementById("n_mosaic_reveal_solution");
    const heightInput = document.getElementById("n_mosaic_height");
    const widthInput = document.getElementById("n_mosaic_width");
    const colorsInput = document.getElementById("n_mosaic_colors");
    const canvas = document.getElementById("n_mosaic_board");
    const nMosaic = new NMosaic(parseInt(heightInput.value), parseInt(widthInput.value), parseInt(colorsInput.value), canvas);
    canvas.addEventListener("mousedown", (e) => {
      if (nMosaic.puzzleComplete) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const squareWidth = nMosaic.WIDTH / nMosaic.BOARD_WIDTH;
      const squareHeight = nMosaic.HEIGHT / nMosaic.BOARD_HEIGHT;
      const col = Math.floor(x / squareWidth);
      const row = Math.floor(y / squareHeight);
      if (row >= 0 && row < nMosaic.BOARD_HEIGHT && col >= 0 && col < nMosaic.BOARD_WIDTH) {
        const mouseState = e.button === 2 ? 0 : 1;
        if (nMosaic.board[row][col] === mouseState) {
          nMosaic.board[row][col] = null;
        } else {
          nMosaic.board[row][col] = mouseState;
        }
        if (nMosaic.board.every((row2) => row2.every((cell) => cell !== null)) && nMosaic.incorrectClues === 0) {
          nMosaic.puzzleComplete = true;
        }
      }
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    function regenerate() {
      nMosaic.regenerate(parseInt(heightInput.value), parseInt(widthInput.value), parseInt(colorsInput.value));
    }
    regenerateButton.onclick = regenerate;
    revealSolutionButton.onclick = (() => {
      nMosaic.showSolution = !nMosaic.showSolution;
      if (nMosaic.showSolution) {
        revealSolutionButton.textContent = "HideSolution()";
      } else {
        revealSolutionButton.textContent = "ShowSolution()";
      }
    });
    function gameLoop() {
      nMosaic.drawBackground();
      nMosaic.drawBoard();
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
  nMosaicMain();
})();
