import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../src/game/data';
import { createGame, gameReducer, netWorth, rentFor } from '../src/game/engine';
import type { GameState } from '../src/game/model';
import { readSave } from '../src/game/storage';
import { computerAction, shouldInvest } from '../src/game/strategy';

function arrive(state: GameState, id: number): GameState {
  state.players[state.current].position = (id + 35) % 36;
  state.phase = 'moving';
  state.steps = 1;
  state.dice = 1;
  return gameReducer(state, { type: 'STEP' });
}

function passBank(): GameState {
  let state = createGame();
  state.controlledDice = 6;
  state = gameReducer(state, { type: 'ROLL' });
  while (state.phase === 'moving') state = gameReducer(state, { type: 'STEP' });
  return state;
}

describe('bank stops and saved progress', () => {
  it('pauses at a bank along a six-step route and preserves the remaining step', () => {
    const state = passBank();
    expect(state.phase).toBe('bank');
    expect(state.players[0].position).toBe(5);
    expect(state.steps).toBe(1);
    expect(state.dice).toBe(6);
    expect(gameReducer(state, { type: 'ROLL' })).toBe(state);
    expect(gameReducer(state, { type: 'END' })).toBe(state);
  });

  it('can transact, then resume the same roll without paying or moving twice', () => {
    let state = passBank();
    state = gameReducer(state, { type: 'BANK', amount: 1000 });
    expect(state.players[0].cash).toBe(17000);
    expect(state.players[0].savings).toBe(7000);
    expect(netWorth(state, state.players[0])).toBe(24000);
    state = gameReducer(state, { type: 'PASS' });
    expect(state.phase).toBe('moving');
    expect(state.steps).toBe(1);
    state = gameReducer(state, { type: 'STEP' });
    expect(state.players[0].position).toBe(6);
    expect(state.phase).toBe('purchase');
    expect(state.steps).toBe(0);
    expect(state.current).toBe(0);
  });

  it('ends the movement when the bank is the final destination', () => {
    let state = arrive(createGame(), 5);
    expect(state.phase).toBe('bank');
    expect(state.steps).toBe(0);
    state = gameReducer(state, { type: 'PASS' });
    expect(state.phase).toBe('end');
    expect(gameReducer(state, { type: 'END' }).current).toBe(1);
  });

  it('does not allow manual banking away from a bank stop', () => {
    const state = createGame();
    expect(gameReducer(state, { type: 'BANK', amount: 1000 })).toBe(state);
    state.phase = 'end';
    state.players[0].position = 5;
    expect(gameReducer(state, { type: 'BANK', amount: 1000 })).toBe(state);
  });

  it('preserves an in-progress bank visit across a save and reload', () => {
    const state = passBank();
    const loaded = readSave(JSON.stringify(state));
    expect(loaded).toEqual(state);
    expect(gameReducer(loaded!, { type: 'PASS' })).toEqual(gameReducer(state, { type: 'PASS' }));
  });

  it('rejects a bank phase attached to a non-bank tile', () => {
    const state = createGame();
    state.phase = 'bank';
    expect(readSave(JSON.stringify(state))).toBeNull();
  });

  it('migrates the previous version without losing balances or owned land', () => {
    const expected = createGame();
    expected.players[0].cash = 15980;
    expected.tiles[1].owner = 0;
    expected.players[0].position = 1;
    expected.stocks[0].price = 118;
    const legacy = { ...expected, version: 1 };
    expect(readSave(JSON.stringify(legacy))).toEqual(expected);
  });
});

describe('classic land rules', () => {
  it('supports all five construction levels and refuses a sixth', () => {
    let state = createGame();
    state.tiles[1].owner = 0;
    let lastRent = rentFor(state.tiles[1]);
    for (let level = 1; level <= MAX_LEVEL; level++) {
      state = arrive(state, 1);
      state = gameReducer(state, { type: 'UPGRADE' });
      expect(state.tiles[1].level).toBe(level);
      expect(rentFor(state.tiles[1])).toBeGreaterThan(lastRent);
      lastRent = rentFor(state.tiles[1]);
    }
    expect(readSave(JSON.stringify(state))).toEqual(state);
    state = arrive(state, 1);
    expect(state.phase).toBe('end');
    expect(gameReducer(state, { type: 'UPGRADE' })).toBe(state);
  });

  it('charges combined rent only for the same owner in the same district', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    state.tiles[1].level = 2;
    state.tiles[2].owner = 1;
    state.tiles[2].level = 1;
    state.tiles[4].owner = 2;
    state.tiles[11].owner = 1;
    const bill = rentFor(state.tiles[1]) + rentFor(state.tiles[2]);
    expect(rentFor(state.tiles[1], state.tiles)).toBe(bill);
    const result = arrive(state, 1);
    expect(result.players[0].cash).toBe(18000 - bill);
    expect(result.players[1].cash).toBe(18000 + bill);
  });

  it('shows a projected upgraded rent identical to the eventual charge', () => {
    const state = createGame();
    state.tiles[1].owner = 0;
    state.tiles[2].owner = 0;
    const projected = rentFor({ ...state.tiles[1], level: 1 }, state.tiles);
    const upgraded = gameReducer(arrive(state, 1), { type: 'UPGRADE' });
    expect(rentFor(upgraded.tiles[1], upgraded.tiles)).toBe(projected);
  });

  it('a hospitalised owner cannot collect rent or consume a visitor shield', () => {
    const state = createGame();
    state.tiles[1].owner = 1;
    state.tiles[1].level = 5;
    state.players[1].skip = 1;
    state.players[0].shield = true;
    const result = arrive(state, 1);
    expect(result.players[0].cash).toBe(18000);
    expect(result.players[1].cash).toBe(18000);
    expect(result.players[0].shield).toBe(true);
  });

  it('the park is a safe rest stop without an invented cash reward', () => {
    const result = arrive(createGame(), 18);
    expect(result.players[0].cash).toBe(18000);
    expect(result.phase).toBe('end');
  });
});

describe('computer decisions', () => {
  it('favours completing a road while still retaining cash', () => {
    const state = createGame();
    const player = state.players[0];
    player.cash = 5500;
    const target = state.tiles[2];
    expect(shouldInvest(player, target, target.price, state.tiles)).toBe(false);
    state.tiles[1].owner = 0;
    expect(shouldInvest(player, target, target.price, state.tiles)).toBe(true);
    expect(player.cash - target.price).toBeGreaterThan(1500);
  });

  it('reserves cash for an expensive road ahead, accounting for a shield', () => {
    const state = createGame();
    const player = state.players[0];
    player.cash = 8000;
    state.tiles[4].owner = 1;
    state.tiles[4].level = 5;
    expect(shouldInvest(player, state.tiles[2], state.tiles[2].price, state.tiles)).toBe(false);
    player.shield = true;
    expect(shouldInvest(player, state.tiles[2], state.tiles[2].price, state.tiles)).toBe(true);
  });

  it('keeps cards when none of the next six cells offers a useful advantage', () => {
    const state = createGame();
    state.current = 1;
    state.tiles.filter(t => t.kind === 'property').forEach(t => { t.owner = 1; t.level = MAX_LEVEL; });
    expect(computerAction(state)).toEqual({ type: 'ROLL' });
  });

  it('uses controlled dice to avoid a high rent and reach a useful property', () => {
    const state = createGame();
    state.current = 1;
    state.players[1].cards = ['control'];
    state.tiles[4].owner = 0;
    state.tiles[4].level = 5;
    const action = computerAction(state)!;
    expect(action.type).toBe('CARD');
    if (action.type !== 'CARD') throw new Error('Expected a card decision');
    expect(action.card).toBe('control');
    expect(action.target).not.toBe(4);
    expect(gameReducer(state, action)).not.toBe(state);
  });

  it('uses a shield when rent is ahead and no controlled dice is available', () => {
    const state = createGame();
    state.current = 1;
    state.players[1].cards = ['shield'];
    state.tiles[1].owner = 0;
    expect(computerAction(state)).toEqual({ type: 'CARD', card: 'shield' });
  });

  it('uses the building card on the property with the largest rent increase', () => {
    const state = createGame();
    state.current = 1;
    state.players[1].cards = ['renovate'];
    state.tiles[1].owner = 1;
    state.tiles[12].owner = 1;
    state.tiles[12].level = 4;
    expect(computerAction(state)).toEqual({ type: 'CARD', card: 'renovate', target: 12 });
  });

  it('buys useful cards once, avoids loss-making cash cards, and leaves the shop', () => {
    let state = createGame();
    state.current = 1;
    state.phase = 'shop';
    state.players[1].position = 7;
    state.players[1].cards = [];
    state.players[1].cash = 20000;
    for (let i = 0; i < 5 && state.phase === 'shop'; i++) {
      const action = computerAction(state)!;
      expect(action).not.toEqual({ type: 'SHOP_BUY', card: 'gift' });
      const next = gameReducer(state, action);
      expect(next).not.toBe(state);
      state = next;
    }
    expect(state.phase).toBe('end');
    expect(new Set(state.players[1].cards).size).toBe(state.players[1].cards.length);
    expect(state.players[1].cash).toBeGreaterThan(2200);
  });

  it('balances cash at a bank in one transaction and then continues movement', () => {
    const state = createGame();
    state.current = 1;
    state.phase = 'bank';
    state.players[1].position = 5;
    state.players[1].cash = 500;
    state.players[1].savings = 20000;
    state.steps = 2;
    const first = computerAction(state)!;
    expect(first.type).toBe('BANK');
    const balanced = gameReducer(state, first);
    expect(balanced.players[1].cash).toBeGreaterThan(500);
    expect(balanced.players[1].cash + balanced.players[1].savings).toBe(20500);
    expect(computerAction(balanced)).toEqual({ type: 'PASS' });
    const resumed = gameReducer(balanced, computerAction(balanced)!);
    expect(resumed.phase).toBe('moving');
    expect(resumed.steps).toBe(2);
  });
});
