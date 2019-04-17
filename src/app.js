const $ = (selector, container = document) => container.querySelector(selector);
const $$ = (selector, container = document) => container.querySelectorAll(selector);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// eslint-disable-next-line no-unused-vars
class ApiDev {
  constructor() {
    this.table = [
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
    ];

    /* this.table = [
      ['O', 'O', 'O', 'O'],
      ['O', 'O', 'O', 'O'],
      ['O', 'O', 'O', 'O'],
      ['O', 'O', 'O', 'O'],
    ]; */

    this.steps = [[0, 0], [1, 1], [2, 2], [3, 3]]; // d1
    this.steps = [[0, 3], [1, 2], [2, 1], [3, 0]]; // d2
    this.steps = [[0, 0], [1, 0], [2, 0], [3, 0]]; // v
    this.steps = [[1, 0], [1, 1], [1, 2], [1, 3]]; // h

    this.stepper = this.stepper();
  }

  async fetch() {
    const { value, done } = this.stepper.next();
    await delay(100);
    return { board: value, done };
  }

  *stepper() {
    const copy = [
      [' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' '],
    ];

    for (const [x, y] of this.steps) {
      copy[x][y] = this.table[x][y];
      yield copy;
    }

    return copy;
  }
}

// eslint-disable-next-line no-unused-vars
class PubNubApi {
  constructor({ subscribeKey }) {
    this.subscribeKey = subscribeKey;
    this.time = 0;

    this.emptyBoard = Array(16).fill('');
    this.board = this.emptyBoard;
  }

  fetch() {
    const url = `https://ps.pndsn.com/subscribe/${this.subscribeKey}/ch1/0/${this.time}`;

    return fetch(url)
      .then(res => res.json())
      .then(([boards, time = 0]) => {
        const { board = this.emptyBoard } = boards[boards.length - 1] || {};

        this.time = time;
        this.board = [];

        for (let i = 0, j = board.length; i < j; i += 4) {
          this.board.push(board.slice(i, i + 4));
        }

        return { board: this.board };
      })
      .catch(err => {
        console.error(err);
      });
  }
}

// eslint-disable-next-line no-unused-vars
class DevPubNubApi extends PubNubApi {
  constructor({ subscribeKey, publishKey }) {
    super({ subscribeKey });

    this.publishKey = publishKey;

    this.start();
  }

  reset() {
    console.log('reset');

    return this.push(Array(16).fill(''));
  }

  start() {
    console.log('start');

    const steps = this.generateSteps();

    this.loop(steps)
      .then(() => delay(2000))
      .then(() => this.reset())
      .then(() => delay(2000))
      .then(() => this.start());
  }

  loop(steps) {
    const runPromisesInSeries = ps => ps.reduce((p, next) => p.then(next), Promise.resolve());

    return runPromisesInSeries(
      // eslint-disable-next-line no-use-before-define
      steps.map(step => () => delay(config.delayBeforeDrawSymbol).then(() => this.push(step))),
    );
  }

  generateSteps() {
    const shuffle = ([...arr]) => {
      let m = arr.length;
      while (m) {
        const i = Math.floor(Math.random() * m--); // eslint-disable-line no-plusplus
        [arr[m], arr[i]] = [arr[i], arr[m]];
      }
      return arr;
    };

    const board = shuffle([...Array(8).fill('X'), ...Array(8).fill('O')]);
    const steps = board.map((_, i) =>
      [...board.slice(0, i + 1), ...Array(16).fill('')].slice(0, 16),
    );

    return steps;
  }

  push(data) {
    const url = `https://ps.pndsn.com/publish/${this.publishKey}/${this.subscribeKey}/0/ch1/0`;

    fetch(url, {
      method: 'POST',
      body: JSON.stringify({ board: data }),
      headers: {
        'content-type': 'application/json',
      },
      mode: 'no-cors',
    });
  }
}

const config = {
  size: 4,
  delayBeforeDrawSymbol: 1500,
  crossOut: {
    width: 20,
    delayBeforeShow: 500,
    durationDraw: 100,
    delayBeforeCollapse: 1000,
    durationCollapse: 250,
  },
  delayBeforeUpdateScores: 500,
  delayBeforeResetGame: 4000,
  pubNubKeys: {
    publishKey: '',
    subscribeKey: '',
  },
  apisClasses: {
    ApiDev,
    DevPubNubApi,
    PubNubApi,
  },
  useApi: 'ApiDev',
  videos: {
    X: [
      { src: '../assets/google-wins/1.mp4', hasTitle: true },
      { src: '../assets/google-wins/2.mp4' },
      { src: '../assets/google-wins/3.mp4' },
      { src: '../assets/google-wins/4.mp4' },
      { src: '../assets/google-wins/5.mp4' },
    ],
    O: [
      { src: '../assets/alexa-wins/1.mp4', hasTitle: true },
      { src: '../assets/alexa-wins/2.mp4' },
      { src: '../assets/alexa-wins/3.mp4' },
      { src: '../assets/alexa-wins/4.mp4' },
      { src: '../assets/alexa-wins/5.mp4' },
      { src: '../assets/alexa-wins/6.mp4' },
    ],
    XO: [
      { src: '../assets/draw/1.mp4' },
      { src: '../assets/draw/2.mp4' },
      { src: '../assets/draw/3.mp4' },
      { src: '../assets/draw/4.mp4' },
    ],
  },
};

class StoreScores {
  constructor() {
    this.key = 'scores';
    this.def = { X: 0, O: 0 };
  }

  add(player) {
    const scores = this.get();

    scores[player] += 1;

    this.save(scores);
  }

  get() {
    return JSON.parse(localStorage.getItem(this.key)) || this.def;
  }

  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  reset() {
    this.save(this.def);
  }
}

class WinnerScreenRenderer {
  constructor(element) {
    this.element = element;
  }

  render(winner, coords) {
    this.element.innerHTML = `
      <div id="winner-screen" class="center anim-hide" role="button" style="color: rgb(84, 84, 84); opacity: 0; line-height: 230px; visibility: inherit;">
        <div class="win-symbols  ${winner}" style="opacity: 0;">
          ${this.renderWinnerSymbols(winner, coords)}
        </div>
        <div class="win-player full-width" style="opacity: 0;">${this.renderWinner(winner)}</div>
      </div>
      `;
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

  renderWinner(winner) {
    const video = this.getRandomVideo(winner);
    switch (winner) {
      case 'X':
        return this.renderVideo(video, 'GOOGLE HOME WINS!');
      case 'O':
        return this.renderVideo(video, 'ALEXA WINS!');
      default:
        return this.renderVideo(video, 'DRAW!');
    }
  }

  getRandomVideo(winner) {
    const videos = config.videos[winner];
    const randomArrayIndex = Math.floor(Math.random() * videos.length);
    return videos[randomArrayIndex];
  }

  renderVideo(video, defaultTitle) {
    const title = video.hasTitle ? '' : defaultTitle;
    return `
      <div class="congrats-container">
        <video autoplay loop muted src="${video.src}" class="full-width"></video>      
        <div class="label congrats-container__label meme-text" style="opacity: 0;">${title}</div>
      </div>
    `;
  }
}

class App {
  constructor() {
    this.$board = $('#board');
    this.$win = $('#win');
    this.size = config.size;
    this.state = {
      board: null,
      finish: false,
      winner: {
        path: [],
        player: '',
        direction: '',
      },
      scores: new StoreScores(),
    };

    this.winnerScreen = new WinnerScreenRenderer(this.$win);
    this.api = new config.apisClasses[config.useApi](config.pubNubKeys);

    $('#alexa').ondblclick = () => {
      this.resetScores();
    };
    $('#google-home').ondblclick = () => {
      this.resetScores();
    };

    this.init();
  }

  resetScores() {
    this.state.scores.reset();
    this.renderScores();
  }

  init() {
    this.render();
    this.fill([
      [' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' '],
    ]);

    this.renderScores();
    this.loop();
  }

  /* async waitNewGame() {
    const { board } = await this.api.fetch();
    const count = [].concat(...board).filter(x => x).length;

    console.log('waitNewGame', {
      board,
      count,
    });

    if (board.length && (!count || count === 1)) {
      this.newGame();
    } else {
      this.waitNewGame();
    }
  } */

  newGame() {
    const $t = $('table');

    $t.style.transform = '';
    $t.style.opacity = 1;

    $$('.cell svg').forEach($el => {
      $el.style.display = 'none';

      $$('path', $el).forEach($path => {
        $path.style.strokeDashoffset = $path.style.strokeDasharray;
      });
    });

    const $win = $(`#winner-screen`);
    $win.style.opacity = 0;

    this.loop();
  }

  async loop() {
    try {
      const { board, done = false } = await this.api.fetch();

      if (!done) {
        if (board) {
          this.state.board = board;
        }

        await delay(config.delayBeforeDrawSymbol);
        await this.fill(this.state.board);

        this.state.winner = this.checkWin(this.state.board);

        if (this.state.winner.player) {
          this.state.scores.add(this.state.winner.player);
          this.finish();
        } else {
          this.loop();
        }
      } else {
        this.finish();
      }
    } catch (err) {
      console.error('loop', err);

      this.loop();
    }
  }

  checkWin(board) {
    const arr = Array.from({ length: this.size });

    const rows = arr.map((_, x) => ({ direction: 'h', coords: arr.map((__, y) => [x, y]) }));
    const cols = arr.map((_, x) => ({ direction: 'v', coords: arr.map((__, y) => [y, x]) }));
    const d1 = { direction: 'd1', coords: arr.map((_, i) => [i, i]) };
    const d2 = { direction: 'd2', coords: arr.map((_, i) => [i, this.size - 1 - i]) };

    const checks = [...rows, ...cols, d1, d2];

    const found = checks.find(({ coords }) => {
      const p = board[coords[0][0]][coords[0][1]];
      return coords.every(([x, y]) => board[x][y] === p && board[x][y] !== ' ');
    });

    let player = '';

    const { coords: path = [], direction = '' } = found || {};

    if (found) {
      player = path && board[path[0][0]][path[0][1]];
    } else if ([].concat(...board).filter(x => x.trim()).length === 16) {
      player = 'XO';
    }

    return { path, direction, player };
  }

  render() {
    const arr = Array.from({ length: this.size });

    const X = () => `
      <svg class="X" viewBox="0 0 128 128" style="visibility: visible; display: none;">
        <path class="path" d="M16,16L112,112" style="stroke-dasharray: 135.764; stroke-dashoffset: 135.764;"></path>
        <path class="path" d="M112,16L16,112" style="stroke-dasharray: 135.764; stroke-dashoffset: 135.764;"></path>
      </svg>`;

    const O = () => `
      <svg class="O" viewBox="0 0 128 128" style="visibility: visible; display: none;">
        <path class="path" d="M64,16A48,48 0 1,0 64,112A48,48 0 1,0 64,16" style="stroke-dasharray: 301.635; stroke-dashoffset: 301.635;"></path>
      </svg>`;

    const cell = (x, y) => `
      <td id="cell-${x}-${y}" class="cell" role="button">
        ${X()}
        ${O()}
      </td>`;

    const board = `
      <table class="anim-hide">
        <tbody>
          <tr><td></td><td>A</td><td>B</td><td>C</td><td>D</td></tr>
          ${arr
            .map((_, x) => `<tr><td>${x + 1}</td>${arr.map((__, y) => cell(x, y)).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>`;

    this.$board.innerHTML = board;
  }

  renderScores() {
    const scores = this.state.scores.get();

    $('#alexa .score').innerText = scores.O;
    $('#google-home .score').innerText = scores.X;
  }

  renderWinScreen({ player = 'XO', path = [] }) {
    const coords = path.map(([x, y]) => {
      const { left, top } = $(`#cell-${x}-${y} svg.${player}`).getBoundingClientRect();

      return { left, top };
    });

    this.winnerScreen.render(player, coords);
  }

  async showWinner({ player = 'XO', path = [], direction = '' }) {
    await delay(config.crossOut.delayBeforeShow);

    this.renderWinScreen({ player, path });

    const $win = $(`#winner-screen`);
    const $winPlayer = $('.win-player', this.$win);
    const $winLabel = $('.label', this.$win);

    $win.style.opacity = 1;

    if (player !== 'XO') {
      const $winSymbols = $('.win-symbols', this.$win);
      const $animSymbols = [...$$(`.${player}`, $winSymbols)];
      const $crossOut = $('.cross-out', this.$win);
      const $firstAnimSymbol = $animSymbols[0];
      const $lastAnimSymbol = $animSymbols[$animSymbols.length - 1];

      const firstAnimRect = $firstAnimSymbol.getBoundingClientRect();
      const lastAnimRect = $lastAnimSymbol.getBoundingClientRect();
      const animSymbolHalfWidth = firstAnimRect.width / 2;

      let crossOutCoords = { x1: 0, y1: 0, x2: 0, y2: 0 };

      switch (direction) {
        case 'h':
          {
            const y = firstAnimRect.y + animSymbolHalfWidth;

            crossOutCoords = {
              x1: firstAnimRect.x - 6,
              y1: y,
              x2: lastAnimRect.right + config.crossOut.width,
              y2: y,
            };
          }
          break;
        case 'v':
          {
            const x = firstAnimRect.x + animSymbolHalfWidth;
            const y1 = firstAnimRect.top - config.crossOut.width / 2;
            const y2 = lastAnimRect.bottom + config.crossOut.width;

            crossOutCoords = { x1: x, y1, x2: x, y2 };
          }
          break;
        case 'd1':
          crossOutCoords = {
            x1: firstAnimRect.x,
            y1: firstAnimRect.y,
            x2: lastAnimRect.right,
            y2: lastAnimRect.bottom,
          };
          break;
        case 'd2':
          crossOutCoords = {
            x1: firstAnimRect.right,
            y1: firstAnimRect.top,
            x2: lastAnimRect.left,
            y2: lastAnimRect.bottom,
          };

          break;

        default:
          break;
      }

      $winSymbols.style.opacity = 1;

      const winnerScreenOffsetLeft = $win.getBoundingClientRect().left;
      $crossOut.setAttribute('x1', crossOutCoords.x1 - winnerScreenOffsetLeft);
      $crossOut.setAttribute('y1', crossOutCoords.y1);
      $crossOut.setAttribute('x2', crossOutCoords.x1 - winnerScreenOffsetLeft);
      $crossOut.setAttribute('y2', crossOutCoords.y1);

      $crossOut.velocity(
        {
          x2: crossOutCoords.x2 - winnerScreenOffsetLeft,
          y2: crossOutCoords.y2,
        },
        {
          duration: config.crossOut.durationDraw,
        },
      );

      if (path.length) {
        path.forEach(([x, y]) => {
          this.hideCell({ x, y });
        });
      }

      await delay(config.crossOut.delayBeforeCollapse);

      $winSymbols.style.opacity = 0;
    }

    $winPlayer.style.opacity = 1;

    this.hideBoard();

    $winLabel.style.opacity = 1;

    await delay(config.delayBeforeUpdateScores);
    this.renderScores();

    return delay(config.delayBeforeResetGame);
  }

  async fill(data) {
    for (let x = 0; x < data.length; x += 1) {
      for (let y = 0; y < data[x].length; y += 1) {
        const cell = data[x][y];

        if (cell && cell !== ' ') {
          this.showCell({ x, y, cell });
        }
      }
    }
  }

  async showCell({ x, y, cell }) {
    const $svg = $(`#cell-${x}-${y} svg.${cell}`);

    if ($svg.style.display) {
      $svg.style.display = '';

      const $paths = $$('path', $svg);

      await delay(100);
      $paths[0].style.strokeDashoffset = 0;

      if ($paths[1]) {
        await delay(100);
        $paths[1].style.strokeDashoffset = 0;
      }
    }
  }

  hideCell({ x, y }) {
    const $svgs = $$(`#cell-${x}-${y} svg`);

    if ($svgs.length) {
      $svgs.forEach($svg => {
        $svg.style.display = 'none';
      });
    }
  }

  hideBoard() {
    const $t = $('table');

    $t.style.transform = 'translateZ(-50px)';
    $t.style.opacity = 0;
  }

  async finish() {
    this.state.finish = true;
    await this.showWinner(this.state.winner);
    this.newGame();
  }
}

window.onload = () => {
  window.app = new App();
}
