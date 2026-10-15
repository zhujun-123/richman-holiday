import { CARDS, MAX_CARDS, MAX_LEVEL } from './data';
import { rentFor, upgradeCost } from './engine';
import type { Action, CardId, GameState, Player, Tile } from './model';

/** Visible road risk, without looking at future dice or random events. */
function upcomingRent(player: Player, tiles: Tile[]): number {
  let risk = 0;
  for (let steps = 1; steps <= 6 && tiles.length; steps++) {
    const next = tiles[(player.position + steps) % tiles.length];
    if (next.kind === 'property' && next.owner !== null && next.owner !== player.id) {
      risk = Math.max(risk, rentFor(next, tiles));
    }
  }
  return risk;
}

function cashReserve(player: Player, tiles: Tile[]): number {
  const base = [3500, 2200, 4500, 6000][player.character];
  return Math.max(base, player.shield ? 0 : Math.ceil(upcomingRent(player, tiles) * 1.2));
}

/** Expand property income while keeping enough cash for the next stretch of road. */
export function shouldInvest(player: Player, tile: Tile, cost: number, tiles: Tile[] = []): boolean {
  if (!Number.isSafeInteger(cost) || cost <= 0 || player.bankrupt) return false;
  const completingRoad = tiles.some(t => t.id !== tile.id && t.owner === player.id && t.district === tile.district);
  const reserve = cashReserve(player, tiles);
  const safeReserve = completingRoad ? Math.max(1500, reserve * .8) : reserve;
  return player.cash - cost >= safeReserve;
}

function destinationScore(state: GameState, steps: number): number {
  const player = state.players[state.current];
  const next = state.tiles[(player.position + steps) % state.tiles.length];
  let score = player.position + steps >= state.tiles.length ? 2 : 0;
  if (next.kind === 'property') {
    if (next.owner === null && shouldInvest(player, next, next.price, state.tiles)) {
      score += 5 + (state.tiles.some(t => t.owner === player.id && t.district === next.district) ? 3 : 0);
    } else if (next.owner === player.id && next.level < MAX_LEVEL && shouldInvest(player, next, upgradeCost(next), state.tiles)) {
      score += 4 + next.level * .5;
    } else if (next.owner !== null && next.owner !== player.id && !player.shield && state.players[next.owner].skip === 0) {
      score -= 2 + rentFor(next, state.tiles) / Math.max(500, player.cash) * 10;
    }
  } else if (next.kind === 'tax') score -= 4;
  else if (next.kind === 'chance') score += .5;
  for (let i = 1; i <= steps; i++) {
    if (state.tiles[(player.position + i) % state.tiles.length].kind === 'bank' && player.cash < cashReserve(player, state.tiles)) {
      score += 4;
      break;
    }
  }
  return score;
}

function shopChoice(state: GameState): CardId | null {
  const player = state.players[state.current];
  if (player.cards.length >= Math.min(MAX_CARDS, 4)) return null;
  const candidates: CardId[] = [];
  const bestUpgrade = Math.max(0, ...state.tiles.filter(t => t.owner === player.id && t.level < MAX_LEVEL).map(upgradeCost));
  if (bestUpgrade > CARDS.renovate.price) candidates.push('renovate');
  if (!player.shield && upcomingRent(player, state.tiles) >= CARDS.shield.price) candidates.push('shield');
  const scores = [1, 2, 3, 4, 5, 6].map(n => destinationScore(state, n));
  if (Math.max(...scores) - Math.min(...scores) >= 4) candidates.push('control');
  // A guaranteed payout below the purchase price is never a sensible cash investment.
  if (CARDS.gift.price < 1500) candidates.push('gift');
  return candidates.find(card => !player.cards.includes(card) && player.cash - CARDS[card].price >= cashReserve(player, state.tiles)) ?? null;
}

/** One legal computer action. Timers determine when to act; rules determine what happens. */
export function computerAction(state: GameState): Action | null {
  const player = state.players[state.current];
  const tile = state.tiles[player.position];
  if (state.phase === 'ready') {
    if (!state.usedCard && player.skip === 0) {
      if (player.cards.includes('gift')) return { type: 'CARD', card: 'gift' };
      const build = state.tiles.filter(t => t.owner === player.id && t.level < MAX_LEVEL)
        .sort((a, b) => rentFor({ ...b, level: b.level + 1 }, state.tiles) - rentFor(b, state.tiles)
          - (rentFor({ ...a, level: a.level + 1 }, state.tiles) - rentFor(a, state.tiles)))[0];
      if (build && player.cards.includes('renovate')) return { type: 'CARD', card: 'renovate', target: build.id };
      if (player.cards.includes('control')) {
        const choices = [1, 2, 3, 4, 5, 6].map(steps => ({ steps, score: destinationScore(state, steps) }));
        choices.sort((a, b) => b.score - a.score);
        if (choices[0].score >= 3 || choices[0].score - choices[5].score >= 3) {
          return { type: 'CARD', card: 'control', target: choices[0].steps };
        }
      }
      if (player.cards.includes('shield') && !player.shield && upcomingRent(player, state.tiles) > 0) return { type: 'CARD', card: 'shield' };
    }
    return { type: 'ROLL' };
  }
  if (state.phase === 'purchase') return shouldInvest(player, tile, tile.price, state.tiles) ? { type: 'BUY' } : { type: 'PASS' };
  if (state.phase === 'upgrade') return shouldInvest(player, tile, upgradeCost(tile), state.tiles) ? { type: 'UPGRADE' } : { type: 'PASS' };
  if (state.phase === 'bank') {
    const total = player.cash + player.savings;
    const targetCash = Math.min(total, Math.max(cashReserve(player, state.tiles), Math.round(total * .55 / 100) * 100));
    const amount = player.cash - targetCash;
    return amount === 0 ? { type: 'PASS' } : { type: 'BANK', amount };
  }
  if (state.phase === 'shop') {
    const card = shopChoice(state);
    return card ? { type: 'SHOP_BUY', card } : { type: 'PASS' };
  }
  if (state.phase === 'end') return { type: 'END' };
  return null;
}
