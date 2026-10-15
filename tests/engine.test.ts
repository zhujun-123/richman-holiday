import { describe, expect, it } from 'vitest';
import { CARDS, createTiles, LAP_BONUS, MAX_CARDS, MAX_LEVEL } from '../src/game/data';
import { createGame, gameReducer, netWorth, propertyValue, rentFor, upgradeCost } from '../src/game/engine';
import type { GameState } from '../src/game/model';
import { readSave } from '../src/game/storage';
import { computerAction } from '../src/game/strategy';

function arrive(state: GameState, index: number): GameState {
  state.players[state.current].position = (index + 35) % 36;
  state.phase = 'moving';
  state.dice = 1;
  state.steps = 1;
  return gameReducer(state, { type: 'STEP' });
}

function walk(state: GameState): GameState {
  let next = gameReducer(state, { type: 'ROLL' });
  while (next.phase === 'moving') next = gameReducer(next, { type: 'STEP' });
  return next;
}

describe('board and turns', () => {
  it('has 36 unique, adjacent cells in a closed loop', () => {
    const tiles = createTiles();
    expect(tiles).toHaveLength(36);
    expect(new Set(tiles.map(t => `${t.x},${t.y}`)).size).toBe(36);
    tiles.forEach((t, i) => {
      const next = tiles[(i + 1) % tiles.length];
      expect(Math.abs(t.x - next.x) + Math.abs(t.y - next.y)).toBe(1);
    });
  });

  it('replays the same dice and events from the same seed', () => {
    expect(walk(createGame(0, 20, 17))).toEqual(walk(createGame(0, 20, 17)));
  });

  it('never mutates the previous state', () => {
    const before = createGame(0, 20, 17);
    const copy = structuredClone(before);
    walk(before);
    expect(before).toEqual(copy);
  });

  it('ignores double rolls while moving', () => {
    const state = gameReducer(createGame(), { type: 'ROLL' });
    expect(gameReducer(state, { type: 'ROLL' })).toBe(state);
  });

  it('pays the lap bonus exactly once when crossing the start', () => {
    const state = createGame();
    state.players[0].position = 35;
    state.controlledDice = 2;
    const result = walk(state);
    expect(result.players[0].position).toBe(1);
    expect(result.players[0].cash).toBe(state.players[0].cash + LAP_BONUS);
  });

  it('only advances the day after all four turns', () => {
    let state = createGame();
    for (let i = 0; i < 4; i++) {
      state.phase = 'end';
      state = gameReducer(state, { type: 'END' });
      expect(state.round).toBe(i === 3 ? 2 : 1);
    }
    expect(state.current).toBe(0);
    expect(state.players[0].savings).toBe(6090);
  });

  it('skips bankrupt players without losing the next day', () => {
    const state = createGame();
    state.current = 2;
    state.players[3].bankrupt = true;
    state.phase = 'end';
    const result = gameReducer(state, { type: 'END' });
    expect(result.current).toBe(0);
    expect(result.round).toBe(2);
  });
});

describe('property and money', () => {
  it('purchases once, conserves net worth, and rejects duplicate purchases', () => {
    const state = arrive(createGame(), 1);
    const result = gameReducer(state, { type: 'BUY' });
    expect(result.tiles[1].owner).toBe(0);
    expect(result.players[0].cash).toBe(18000 - state.tiles[1].price);
    expect(netWorth(result, result.players[0])).toBe(24000);
    expect(gameReducer(result, { type: 'BUY' })).toBe(result);
  });

  it('does not buy a property with insufficient cash', () => {
    const state = arrive(createGame(), 1);
    state.players[0].cash = 100;
    expect(gameReducer(state, { type: 'BUY' })).toBe(state);
  });

  it('upgrades an owned property and raises its rent', () => {
    const state = createGame();
    state.tiles[1].owner = 0;
    const landed = arrive(state, 1);
    const result = gameReducer(landed, { type: 'UPGRADE' });
    expect(result.tiles[1].level).toBe(1);
    expect(result.players[0].cash).toBe(18000 - upgradeCost(state.tiles[1]));
    expect(rentFor(result.tiles[1])).toBeGreaterThan(rentFor(state.tiles[1]));
  });

  it('cannot upgrade above the maximum level', () => {
    const state = createGame();
    state.tiles[1].owner = 0;
    state.tiles[1].level = MAX_LEVEL;
    const result = arrive(state, 1);
    expect(result.phase).toBe('end');
    expect(gameReducer(result, { type: 'UPGRADE' })).toBe(result);
  });

  it('transfers the exact rent to the owner', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    state.tiles[1].level = 2;
    const result = arrive(state, 1);
    const rent = rentFor(state.tiles[1]);
    expect(result.players[0].cash).toBe(18000 - rent);
    expect(result.players[1].cash).toBe(18000 + rent);
  });

  it('automatically withdraws only the missing cash', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    state.tiles[1].level = 1;
    state.players[0].cash = 500;
    const result = arrive(state, 1);
    expect(result.players[0].cash).toBe(0);
    expect(result.players[0].savings).toBe(6000 - (rentFor(state.tiles[1]) - 500));
    expect(result.players[0].bankrupt).toBe(false);
  });

  it('sells stocks then property at 70% to cover a bill', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    state.tiles[1].level = 3;
    state.tiles[2].owner = 0;
    state.players[0].cash = 0;
    state.players[0].savings = 0;
    state.players[0].stocks[0] = 10;
    const result = arrive(state, 1);
    expect(result.players[0].stocks[0]).toBe(0);
    expect(result.tiles[2].owner).toBeNull();
    expect(result.players[0].cash).toBe(1000 + Math.floor(propertyValue(state.tiles[2]) * .7) - rentFor(state.tiles[1]));
    expect(result.players[0].bankrupt).toBe(false);
  });

  it('transfers only actual funds when the debtor goes bankrupt', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    state.players[0].cash = 10;
    state.players[0].savings = 0;
    const result = arrive(state, 1);
    expect(result.players[0].bankrupt).toBe(true);
    expect(result.players[1].cash).toBe(18010);
    expect(result.players[0].cash).toBe(0);
  });

  it('sells owned property, clears its building, and cannot sell twice', () => {
    const state = createGame();
    state.tiles[1].owner = 0;
    state.tiles[1].level = 2;
    const result = gameReducer(state, { type: 'SELL_PROPERTY', tile: 1 });
    expect(result.players[0].cash).toBe(18000 + Math.floor(propertyValue(state.tiles[1]) * .7));
    expect(result.tiles[1].owner).toBeNull();
    expect(result.tiles[1].level).toBe(0);
    expect(gameReducer(result, { type: 'SELL_PROPERTY', tile: 1 })).toBe(result);
  });
});

describe('bank, stocks, and cards', () => {
  it('deposits and withdraws without changing total wealth', () => {
    const state = arrive(createGame(), 5);
    const deposit = gameReducer(state, { type: 'BANK', amount: 1000 });
    expect(deposit.players[0].cash).toBe(17000);
    expect(deposit.players[0].savings).toBe(7000);
    expect(netWorth(deposit, deposit.players[0])).toBe(24000);
    const withdraw = gameReducer(deposit, { type: 'BANK', amount: -500 });
    expect(withdraw.players[0].cash).toBe(17500);
    expect(withdraw.players[0].savings).toBe(6500);
  });

  it('rejects overdrafts, fractional amounts, and nonfinite bank input', () => {
    const state = arrive(createGame(), 5);
    for (const amount of [19000, -7000, 0, NaN, Infinity, 1.5]) {
      expect(gameReducer(state, { type: 'BANK', amount })).toBe(state);
    }
  });

  it('buys and sells shares at the current price', () => {
    const state = createGame();
    const bought = gameReducer(state, { type: 'TRADE', stock: 0, shares: 10 });
    expect(bought.players[0].cash).toBe(17000);
    expect(bought.players[0].stocks[0]).toBe(10);
    expect(netWorth(bought, bought.players[0])).toBe(24000);
    const sold = gameReducer(bought, { type: 'TRADE', stock: 0, shares: -10 });
    expect(sold.players[0].cash).toBe(18000);
    expect(sold.players[0].stocks[0]).toBe(0);
  });

  it('rejects short selling, unaffordable shares, and invalid input', () => {
    const state = createGame();
    for (const shares of [-1, 181, Infinity, NaN, .5, Number.MAX_SAFE_INTEGER]) {
      expect(gameReducer(state, { type: 'TRADE', stock: 0, shares })).toBe(state);
    }
    expect(gameReducer(state, { type: 'TRADE', stock: 99, shares: 10 })).toBe(state);
  });

  it('blocks money actions while moving or during an AI turn', () => {
    const state = gameReducer(createGame(), { type: 'ROLL' });
    expect(gameReducer(state, { type: 'BANK', amount: 1000 })).toBe(state);
    expect(gameReducer(state, { type: 'TRADE', stock: 0, shares: 10 })).toBe(state);
    state.phase = 'ready';
    state.current = 1;
    expect(gameReducer(state, { type: 'BANK', amount: 1000 })).toBe(state);
  });

  it('opens the bank without inventing an arrival bonus', () => {
    const result = arrive(createGame(), 5);
    expect(result.players[0].savings).toBe(6000);
    expect(result.phase).toBe('bank');
  });

  it('sets controlled dice and consumes just one card', () => {
    const state = createGame();
    const card = gameReducer(state, { type: 'CARD', card: 'control', target: 4 });
    expect(card.controlledDice).toBe(4);
    expect(card.players[0].cards).toEqual(['shield']);
    expect(gameReducer(card, { type: 'CARD', card: 'shield' })).toBe(card);
    const result = walk(card);
    expect(result.dice).toBe(4);
    expect(result.players[0].position).toBe(4);
    expect(result.controlledDice).toBeNull();
  });

  it('does not consume a card with an invalid target', () => {
    const state = createGame();
    for (const target of [0, 7, 1.5, undefined]) expect(gameReducer(state, { type: 'CARD', card: 'control', target })).toBe(state);
  });

  it('a shield cancels exactly one rent payment', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    const shield = gameReducer(state, { type: 'CARD', card: 'shield' });
    const result = arrive(shield, 1);
    expect(result.players[0].cash).toBe(18000);
    expect(result.players[0].shield).toBe(false);
    expect(result.players[1].cash).toBe(18000);
    const again = arrive(result, 1);
    expect(again.players[0].cash).toBe(18000 - rentFor(state.tiles[1]));
  });

  it('renovation only upgrades owned property below max level', () => {
    const state = createGame();
    state.players[0].cards = ['renovate'];
    expect(gameReducer(state, { type: 'CARD', card: 'renovate', target: 1 })).toBe(state);
    state.tiles[1].owner = 0;
    const result = gameReducer(state, { type: 'CARD', card: 'renovate', target: 1 });
    expect(result.tiles[1].level).toBe(1);
    expect(result.players[0].cash).toBe(18000);
  });

  it('the shop enforces location, price, and card capacity', () => {
    const state = createGame();
    expect(gameReducer(state, { type: 'SHOP_BUY', card: 'shield' })).toBe(state);
    const shop = arrive(state, 7);
    const bought = gameReducer(shop, { type: 'SHOP_BUY', card: 'shield' });
    expect(bought.players[0].cards).toHaveLength(3);
    expect(bought.players[0].cash).toBe(18000 - CARDS.shield.price);
    bought.players[0].cards = Array(MAX_CARDS).fill('shield');
    expect(gameReducer(bought, { type: 'SHOP_BUY', card: 'shield' })).toBe(bought);
  });

  it('hospital rest costs exactly one turn', () => {
    const state = createGame();
    state.players[0].skip = 1;
    const result = gameReducer(state, { type: 'ROLL' });
    expect(result.phase).toBe('end');
    expect(result.players[0].skip).toBe(0);
    expect(result.players[0].position).toBe(0);
  });
});

describe('results and persistence', () => {
  it('ends after the configured final day and supports tied winners', () => {
    const state = createGame();
    state.round = 20;
    state.current = 3;
    state.phase = 'end';
    const result = gameReducer(state, { type: 'END' });
    expect(result.phase).toBe('over');
    expect(result.winners).toEqual([0, 1, 2, 3]);
    expect(gameReducer(result, { type: 'ROLL' })).toBe(result);
  });

  it('finishes immediately when the last opponent goes bankrupt', () => {
    const state = createGame();
    state.players[2].bankrupt = true;
    state.players[3].bankrupt = true;
    state.players[0].cash = 0;
    state.players[0].savings = 0;
    state.tiles[1].owner = 1;
    const result = arrive(state, 1);
    expect(result.phase).toBe('over');
    expect(result.winners).toEqual([1]);
  });

  it('restores a valid save, including a game saved halfway through movement', () => {
    const state = gameReducer(createGame(), { type: 'ROLL' });
    const restored = readSave(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(gameReducer(restored!, { type: 'STEP' })).toEqual(gameReducer(state, { type: 'STEP' }));
  });

  it('rejects corrupt saves and incomplete nested objects', () => {
    for (const raw of [null, '', '{}', 'broken', 'null', '[]']) expect(readSave(raw)).toBeNull();
    const changes = [
      (s: GameState) => { s.players[0].cash = -1; },
      (s: GameState) => { s.players[0].position = 36; },
      (s: GameState) => { s.tiles[0].district = 99; },
      (s: GameState) => { s.tiles[1].price = 1; },
      (s: GameState) => { s.phase = 'over'; },
      (s: GameState) => { s.stocks[0].history = []; },
      (s: GameState) => { s.stocks[0].symbol = undefined as unknown as string; },
      (s: GameState) => { s.controlledDice = 9; },
    ];
    for (const mutate of changes) { const state = createGame(); mutate(state); expect(readSave(JSON.stringify(state))).toBeNull(); }
  });

  it('completes 80 seeded full games without stalls or invalid money', () => {
    for (let seed = 1; seed <= 80; seed++) {
      let state = createGame(seed % 4, [20, 30, 50][seed % 3], seed * 983);
      let steps = 0;
      while (state.phase !== 'over' && steps < 5000) {
        const action = state.phase === 'moving' ? { type: 'STEP' as const } : computerAction(state);
        if (!action) throw new Error(`No action at seed ${seed}: ${state.phase}`);
        const next = gameReducer(state, action);
        if (next === state) throw new Error(`Stalled at seed ${seed}: ${JSON.stringify(action)}`);
        if (next.players.some(p => p.cash < 0 || p.savings < 0 || !Number.isSafeInteger(p.cash) || !Number.isSafeInteger(p.savings))) throw new Error(`Invalid money at seed ${seed}`);
        if (steps % 30 === 0 && !readSave(JSON.stringify(next))) throw new Error(`Invalid save at seed ${seed}`);
        state = next;
        steps++;
      }
      expect(state.phase).toBe('over');
      expect(state.winners.length).toBeGreaterThan(0);
      expect(steps).toBeLessThan(5000);
    }
  }, 45000);
});
