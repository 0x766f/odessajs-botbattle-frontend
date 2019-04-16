class WinnerScreenRenderer {
  constructor(element) {
    this.element = element;

    this.symbolsBig = {
      X: `<svg class="X" aria-label="O" role="img" viewBox="0 0 128 128" style="width: 10rem; height: 10rem;">
            <path class="path" d="M16,16L112,112"></path>
            <path class="path" d="M112,16L16,112"></path>
          </svg>`,
      O: `<svg class="O" aria-label="O" role="img" viewBox="0 0 128 128" style="width: 10rem; height: 10rem;">
            <path class="path" d="M64,16A48,48 0 1,0 64,112A48,48 0 1,0 64,16"></path>
          </svg>`,
    };
  }

  render(winner, coords) {
    this.element.innerHTML = `
      <div id="winner-screen" class="center anim-hide" role="button" style="color: rgb(84, 84, 84); opacity: 0; z-index: 4; line-height: 230px; visibility: inherit; position: fixed;">
        <div class="win-symbols  ${winner}" style="opacity: 0;">
          ${this.renderWinnerSymbols(winner, coords)}
        </div>
        <div class="win-player" style="opacity: 0;">${this.renderWinner(winner)}</div>
      </div>
      `;
  }

  renderWinner(winner) {
    switch (winner) {
      case 'X':
        return this.renderXWinnerScreen();
      case 'O':
        return this.renderOWinnerScreen();
      default:
        return this.renderDrawScreen();
    }
  }

  renderWinnerSymbols(winner, coords) {
    const xWinnerSymbol = '<path class="path" d="M16,16L112,112"></path><path class="path" d="M112,16L16,112"></path>';
    const oWinnerSymbol = '<path class="path" d="M64,16A48,48 0 1,0 64,112A48,48 0 1,0 64,16"></path>';

    const symbols = coords
      .map(({ left, top }) => `
         <svg class="${winner} win-symbol" viewBox="0 0 128 128" style="left: ${left}px; top: ${top}px;">
           ${(winner === 'X' && xWinnerSymbol) || ''}
           ${(winner === 'O' && oWinnerSymbol) || ''}
         </svg>`)
      .join('');

    return `
    <svg class="symbol">
      <line class="cross-out player-${winner} path" />
    </svg>
    ${symbols}`;
  }

  renderXWinnerScreen() {
    return `
      ${this.symbolsBig.X}
      <div class="label" style="opacity: 0;">WINNER!</div>
    `;
  }

  renderOWinnerScreen() {
    return `
      ${this.symbolsBig.O}
      <div class="label" style="opacity: 0;">WINNER!</div>
    `;
  }

  renderDrawScreen() {
    return `
      ${this.symbolsBig.X}
      ${this.symbolsBig.O}
      <div class="label" style="opacity: 0;">DRAW!</div>
    `;
  }
}
