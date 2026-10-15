import { createTiles, MAX_CARDS, MAX_LEVEL, SAVE_KEY } from './data';
import type { GameState } from './model';

/** Reject corrupt / incompatible local saves rather than crashing the renderer. */
export function readSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as GameState;
    if (![1, 2].includes(state.version) || state.players?.length !== 4 || state.tiles?.length !== 36 || state.stocks?.length !== 3) return null;
    if (!['ready', 'moving', 'purchase', 'upgrade', 'shop', 'bank', 'end', 'over'].includes(state.phase)) return null;
    if (!Number.isInteger(state.current) || state.current < 0 || state.current > 3 || !Number.isInteger(state.round) || state.round < 1) return null;
    if (![20, 30, 50].includes(state.roundLimit) || !Number.isInteger(state.seed) || state.seed < 0 || state.seed > 4294967295) return null;
    if (!Array.isArray(state.logs) || state.logs.length > 80 || !state.logs.every(l => typeof l.text === 'string'
      && Number.isInteger(l.id) && Number.isInteger(l.round) && ['normal', 'good', 'bad'].includes(l.tone))) return null;
    if (!Array.isArray(state.winners) || !state.winners.every(id => Number.isInteger(id) && id >= 0 && id < 4)
      || (state.phase === 'over' && state.winners.length === 0) || (state.phase !== 'over' && state.winners.length !== 0)
      || !Number.isSafeInteger(state.logId) || typeof state.message !== 'string' || typeof state.usedCard !== 'boolean') return null;
    if (state.controlledDice !== null && (!Number.isInteger(state.controlledDice) || state.controlledDice < 1 || state.controlledDice > 6)) return null;
    if (!state.players.every((p, i) => p.id === i && Number.isInteger(p.position) && p.position >= 0 && p.position < 36
      && Number.isInteger(p.character) && p.character >= 0 && p.character < 4
      && typeof p.name === 'string' && typeof p.color === 'string'
      && Number.isSafeInteger(p.cash) && p.cash >= 0 && Number.isSafeInteger(p.savings) && p.savings >= 0
      && Array.isArray(p.cards) && p.cards.length <= MAX_CARDS && p.cards.every(c => ['control', 'shield', 'renovate', 'gift'].includes(c))
      && Array.isArray(p.stocks) && p.stocks.length === 3 && p.stocks.every(n => Number.isSafeInteger(n) && n >= 0)
      && typeof p.bankrupt === 'boolean' && typeof p.shield === 'boolean' && Number.isInteger(p.skip) && p.skip >= 0)) return null;
    const canonical = createTiles();
    if (!state.tiles.every((t, i) => t.id === i && (t.owner === null || (Number.isInteger(t.owner) && t.owner >= 0 && t.owner < 4))
      && Number.isInteger(t.level) && t.level >= 0 && t.level <= MAX_LEVEL
      && t.price === canonical[i].price && t.x === canonical[i].x && t.y === canonical[i].y
      && t.name === canonical[i].name && t.kind === canonical[i].kind && t.district === canonical[i].district)) return null;
    if (!state.stocks.every(s => Number.isFinite(s.price) && s.price >= 20 && Array.isArray(s.history)
      && s.history.length > 0 && s.history.length <= 14 && s.history.every(n => Number.isFinite(n) && n > 0)
      && typeof s.name === 'string' && typeof s.symbol === 'string' && typeof s.color === 'string')) return null;
    if (!Number.isInteger(state.dice) || state.dice < 1 || state.dice > 6
      || !Number.isInteger(state.steps) || state.steps < 0 || state.steps > 6
      || (state.phase === 'moving' && state.steps === 0)) return null;
    if (state.phase === 'bank' && state.tiles[state.players[state.current].position].kind !== 'bank') return null;
    // Version 1 has the same shape. Keep its progress and balances when upgrading rules.
    state.version = 2;
    return state;
  } catch { return null; }
}

export function loadGame(): GameState | null {
  try { return readSave(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

export function saveGame(state: GameState): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
