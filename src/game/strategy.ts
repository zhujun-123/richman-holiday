import type { Action, GameState, Player, Tile } from './model';

/**
 * 电脑的现金储备策略。学习练习：在这里用 5–10 行改变它的投资风格。
 * reserve 越高越保守；更低的储备会买下更多地产，也更容易现金不足。
 * 返回 true 只表示愿意投资，最终金额、归属和回合仍由引擎校验。
 */
export function shouldInvest(player: Player, tile: Tile, cost: number): boolean {
  // TODO(学习练习，可选)：让不同角色对同街区连片地产有不同的偏好。
  const reserve = [3500, 2200, 4500, 6000][player.character];
  const affordable = player.cash - cost >= reserve;
  const developed = tile.level > 0;
  return affordable && (!developed || player.cash > cost * 2.2);
}

/** One legal computer action; the React timer only decides when to dispatch it. */
export function computerAction(state: GameState): Action | null {
  const player = state.players[state.current];
  const tile = state.tiles[player.position];
  if (state.phase === 'ready') {
    if (!state.usedCard && player.skip === 0) {
      if (player.cards.includes('gift')) return { type: 'CARD', card: 'gift' };
      if (player.cards.includes('shield') && !player.shield) return { type: 'CARD', card: 'shield' };
      const build = state.tiles.find(t => t.owner === player.id && t.level < 3);
      if (build && player.cards.includes('renovate')) return { type: 'CARD', card: 'renovate', target: build.id };
      if (player.cards.includes('control')) {
        const choices = [1, 2, 3, 4, 5, 6].map(steps => {
          const next = state.tiles[(player.position + steps) % state.tiles.length];
          const score = next.owner === player.id ? 4 : next.kind === 'property' && next.owner === null && shouldInvest(player, next, next.price) ? 6 : next.kind === 'tax' ? -3 : next.owner !== null ? -2 : 1;
          return { steps, score: score + (player.position + steps >= state.tiles.length ? 3 : 0) };
        });
        choices.sort((a, b) => b.score - a.score);
        return { type: 'CARD', card: 'control', target: choices[0].steps };
      }
    }
    return { type: 'ROLL' };
  }
  if (state.phase === 'purchase') return shouldInvest(player, tile, tile.price) ? { type: 'BUY' } : { type: 'PASS' };
  if (state.phase === 'upgrade') return shouldInvest(player, tile, Math.round(tile.price * .65)) ? { type: 'UPGRADE' } : { type: 'PASS' };
  if (state.phase === 'shop') return player.cards.length < 4 && player.cash > 7000 ? { type: 'SHOP_BUY', card: 'gift' } : { type: 'PASS' };
  if (state.phase === 'end') return { type: 'END' };
  return null;
}
