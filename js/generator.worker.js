import {generateSolvableBoard} from './generator.js';

self.onmessage = ({data}) => {
  try {
    const {rows, columns, mineCount, row, column} = data;
    const {board} = generateSolvableBoard(rows, columns, mineCount, row, column);
    self.postMessage({board});
  } catch (error) {
    self.postMessage({error: error.message});
  }
};
