/*
 * Debug URL format (zero-based coordinates, mines separated by semicolons):
 * http://localhost:8000/?debug=1
 * http://localhost:8000/?debug=1&mines=0,0;0,1;0,2;0,3;0,4;0,5;0,6;0,7;0,8;1,0&liar=4,4&shown=1
 * Hover any cell for trueValue, displayedValue, isMine, and isLiar.
 * Fixed layouts require mines, liar, and shown together; mines= allows no mines.
 * Coordinates must be 0..8; shown must be 0..8 and off the liar's true value by 1.
 * Custom fixtures may have fewer than 10 mines; the counter shows their actual count.
 * Fixtures load on the first safe reveal. Clicking a fixture mine first asks for
 * another cell, preserving both the exact fixture and the safe-first-click rule.
 * New Game keeps the URL configuration and defers generation again.
 */
import {
  gameState,
  newGame,
  handleReveal,
  handleFlag,
  handleVerify,
} from './game.js';
import { attachEventHandlers, renderGame } from './ui.js';

const parameters = new URLSearchParams(window.location.search);
gameState.debugMode = parameters.get('debug') === '1';
if (gameState.debugMode && ['mines', 'liar', 'shown'].some((key) => parameters.has(key))) {
  try {
    if (!['mines', 'liar', 'shown'].every((key) => parameters.has(key))) {
      throw new Error('provide mines, liar, and shown together.');
    }
    const parseCoordinate = (coordinate) => {
      if (!/^[0-8],[0-8]$/.test(coordinate)) {
        throw new Error('coordinates must be row,column pairs from 0 to 8.');
      }
      return coordinate.split(',').map(Number);
    };
    const mines = parameters.get('mines');
    const shown = parameters.get('shown');
    if (!/^[0-8]$/.test(shown)) throw new Error('shown must be an integer from 0 to 8.');
    gameState.fixedLayout = {
      mineCoordinates: mines === '' ? [] : mines.split(';').map(parseCoordinate),
      liarCoordinate: parseCoordinate(parameters.get('liar')),
      liarDisplayedValue: Number(shown),
    };
  } catch (error) {
    gameState.debugError = `Invalid debug URL: ${error.message}`;
  }
}

// Rendering after each action keeps DOM code out of the game-state module.
function runAction(action, ...coordinates) {
  action(...coordinates);
  renderGame(gameState);
}

runAction(newGame);
attachEventHandlers({
  onReveal: (row, column) => runAction(handleReveal, row, column),
  onFlag: (row, column) => runAction(handleFlag, row, column),
  onVerify: () => runAction(handleVerify),
  onNewGame: () => runAction(newGame),
});
