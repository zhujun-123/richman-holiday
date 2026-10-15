import { CARDS, CHARACTERS, createTiles, LAP_BONUS, MAX_CARDS, MAX_LEVEL, START_CASH, START_SAVINGS } from './data';
import type { Action, CardId, GameState, Player, Tile } from './model';

/** Pure state machine: all randomness is seeded and every money movement happens here. */
export function createGame(character = 0, roundLimit = 20, seed = Date.now()): GameState {
  const order = [character, ...CHARACTERS.map((_, i) => i).filter(i => i !== character)];
  return {
    version: 2, seed: seed >>> 0, current: 0, round: 1, roundLimit,
    phase: 'ready', tiles: createTiles(),
    players: order.map((char, id) => ({
      id, character: char, name: CHARACTERS[char].name, color: CHARACTERS[char].color,
      cash: START_CASH, savings: START_SAVINGS, position: 0,
      cards: ['control', 'shield'], stocks: [0, 0, 0], shield: false, skip: 0, bankrupt: false,
    })),
    stocks: [
      { name: '海风建设', symbol: 'SEA', price: 100, history: [91, 94, 89, 96, 93, 99, 96, 100], color: '#629995' },
      { name: '桔子汽水', symbol: 'SUN', price: 80, history: [72, 76, 78, 73, 82, 79, 84, 80], color: '#d9a15c' },
      { name: '云朵科技', symbol: 'SKY', price: 160, history: [142, 151, 147, 158, 149, 155, 164, 160], color: '#9b8bb3' },
    ],
    dice: 1, steps: 0, controlledDice: null, usedCard: false,
    message: '欢迎来到海风小镇！掷出骰子，开启你的富翁假日。',
    logs: [{ id: 0, round: 1, text: '海风小镇开张了。每人带着 $24,000，出发！', tone: 'good' }],
    logId: 1, winners: [],
  };
}

function random(state: GameState): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function log(state: GameState, text: string, tone: 'normal' | 'good' | 'bad' = 'normal') {
  state.message = text;
  state.logs.unshift({ id: state.logId++, round: state.round, text, tone });
  state.logs.length = Math.min(state.logs.length, 80);
}

export function upgradeCost(tile: Tile): number {
  return Math.round(tile.price * 0.65);
}

export function propertyValue(tile: Tile): number {
  return tile.price + tile.level * upgradeCost(tile);
}

export function rentFor(tile: Tile, tiles?: Tile[]): number {
  const base = (t: Tile) => Math.round(t.price * [0.18, 0.36, 0.7, 1.1, 1.65, 2.4][t.level]);
  if (!tiles || tile.owner === null) return base(tile);
  // The supplied tile may be a projected upgrade used by the UI or the AI.
  return tiles.filter(t => t.kind === 'property' && t.owner === tile.owner && t.district === tile.district)
    .reduce((sum, t) => sum + base(t.id === tile.id ? tile : t), 0);
}

export function netWorth(state: GameState, player: Player): number {
  return player.cash + player.savings
    + player.stocks.reduce((sum, shares, i) => sum + shares * state.stocks[i].price, 0)
    + state.tiles.filter(t => t.owner === player.id).reduce((sum, t) => sum + propertyValue(t), 0);
}

function finishIfNeeded(state: GameState) {
  const active = state.players.filter(p => !p.bankrupt);
  if (active.length > 1 && state.round <= state.roundLimit) return;
  const top = Math.max(...active.map(p => netWorth(state, p)));
  state.winners = active.filter(p => netWorth(state, p) === top).map(p => p.id);
  state.phase = 'over';
  log(state, `${state.winners.map(id => state.players[id].name).join('、')}赢得了这场富翁假日！`, 'good');
}

/** Automatic liquidation keeps a player alive if deposits / stocks / land can cover a bill. */
function pay(state: GameState, player: Player, amount: number, receiver?: Player) {
  if (player.cash < amount && player.savings > 0) {
    const withdrawal = Math.min(player.savings, amount - player.cash);
    player.savings -= withdrawal;
    player.cash += withdrawal;
    log(state, `${player.name}自动取出存款 $${withdrawal.toLocaleString()}。`);
  }
  for (let i = 0; i < player.stocks.length && player.cash < amount; i++) {
    const sold = Math.min(player.stocks[i], Math.ceil((amount - player.cash) / state.stocks[i].price));
    if (sold > 0) {
      player.stocks[i] -= sold;
      player.cash += sold * state.stocks[i].price;
      log(state, `${player.name}变卖了 ${sold} 股${state.stocks[i].name}。`);
    }
  }
  const properties = state.tiles.filter(t => t.owner === player.id).sort((a, b) => propertyValue(a) - propertyValue(b));
  for (const tile of properties) {
    if (player.cash >= amount) break;
    player.cash += Math.floor(propertyValue(tile) * 0.7);
    tile.owner = null;
    tile.level = 0;
    log(state, `${player.name}折价出售了${tile.name}。`, 'bad');
  }
  const paid = Math.min(player.cash, amount);
  player.cash -= paid;
  if (receiver) receiver.cash += paid;
  if (paid < amount) {
    player.bankrupt = true;
    player.cards = [];
    log(state, `${player.name}资金耗尽，遗憾离开小镇。`, 'bad');
  }
  finishIfNeeded(state);
}

function land(state: GameState) {
  const player = state.players[state.current];
  const tile = state.tiles[player.position];
  state.phase = 'end';
  if (tile.kind === 'property') {
    if (tile.owner === null) {
      state.phase = 'purchase';
      log(state, `${player.name}来到${tile.name}，这块地正在出售。`);
    } else if (tile.owner === player.id) {
      state.phase = tile.level < MAX_LEVEL ? 'upgrade' : 'end';
      log(state, `${player.name}回到自己的${tile.name}${tile.level < MAX_LEVEL ? '，可以继续盖房' : ''}。`, 'good');
    } else if (state.players[tile.owner].skip > 0) {
      log(state, `${state.players[tile.owner].name}正在住院，${player.name}免付${tile.name}的过路费。`);
    } else if (player.shield) {
      player.shield = false;
      log(state, `${player.name}使用免租金卡，免付${tile.name}的过路费。`, 'good');
    } else {
      const rent = rentFor(tile, state.tiles);
      const owner = state.players[tile.owner];
      pay(state, player, rent, owner);
      if (!state.winners.length) log(state, `${player.name}向${owner.name}支付 ${tile.name} 过路费 $${rent.toLocaleString()}。`, 'bad');
    }
  } else if (tile.kind === 'chance') {
    const event = Math.floor(random(state) * 7);
    if (event === 0) {
      player.cash += 2000;
      log(state, `${player.name}收到一笔意外奖金，现金 +$2,000！`, 'good');
    } else if (event === 1) {
      pay(state, player, 1200);
      if (!state.winners.length) log(state, `${player.name}的单车需要维修，支付 $1,200。`, 'bad');
    } else if (event === 2) {
      if (player.cards.length < MAX_CARDS) {
        const card = (Object.keys(CARDS) as CardId[])[Math.floor(random(state) * 4)];
        player.cards.push(card);
        log(state, `${player.name}收到一张${CARDS[card].name}！`, 'good');
      } else log(state, `${player.name}的卡包已满，和邮递员交换了一个微笑。`);
    } else if (event === 3) {
      player.cash += 1000;
      log(state, `${player.name}帮助邻居找到小猫，收到 $1,000 谢礼。`, 'good');
    } else if (event === 4) {
      player.position = 10;
      player.skip = 1;
      pay(state, player, 500);
      if (!state.winners.length) log(state, `${player.name}中暑住院，支付 $500，下次休息一回合。`, 'bad');
    } else if (event === 5) {
      state.stocks.forEach(stock => {
        stock.price = Math.round(stock.price * 1.15);
        stock.history = [...stock.history.slice(-13), stock.price];
      });
      log(state, '小镇发布利好消息，所有股票上涨 15%！', 'good');
    } else {
      player.cash += 1500;
      log(state, `${player.name}赢得社区烘焙比赛，奖金 +$1,500！`, 'good');
    }
  } else if (tile.kind === 'bank') {
    state.phase = 'bank';
    log(state, `${player.name}来到小镇银行，可以办理存取款。`);
  } else if (tile.kind === 'shop') {
    state.phase = 'shop';
    log(state, `${player.name}走进卡片商店，看看有什么好东西。`);
  } else if (tile.kind === 'hospital') {
    log(state, `${player.name}经过医院，体检一切正常。`);
  } else if (tile.kind === 'tax') {
    const tax = Math.max(500, Math.floor(netWorth(state, player) * 0.04));
    pay(state, player, tax);
    if (!state.winners.length) log(state, `${player.name}缴纳市政税 $${tax.toLocaleString()}。`, 'bad');
  } else if (tile.kind === 'park') {
    log(state, `${player.name}在公园休息，平安度过这一回合。`);
  } else {
    log(state, `${player.name}回到了假日起点。`, 'good');
  }
}

export function gameReducer(previous: GameState, action: Action): GameState {
  if (previous.phase === 'over') return previous;
  // Validate before cloning: stale / repeated clicks are cheap no-ops.
  if (action.type === 'ROLL' && previous.phase !== 'ready') return previous;
  if (action.type === 'STEP' && previous.phase !== 'moving') return previous;
  if (action.type === 'BUY' && previous.phase !== 'purchase') return previous;
  if (action.type === 'UPGRADE' && previous.phase !== 'upgrade') return previous;
  if (action.type === 'END' && previous.phase !== 'end') return previous;
  if (action.type === 'PASS' && !['purchase', 'upgrade', 'shop', 'bank'].includes(previous.phase)) return previous;
  if (action.type === 'BANK' && previous.phase !== 'bank') return previous;
  if (['TRADE', 'SELL_PROPERTY'].includes(action.type)
    && (previous.current !== 0 || !['ready', 'end'].includes(previous.phase))) return previous;

  const state: GameState = structuredClone(previous);
  const player = state.players[state.current];
  const tile = state.tiles[player.position];

  switch (action.type) {
    case 'ROLL': {
      if (player.skip > 0) {
        player.skip--;
        state.phase = 'end';
        log(state, `${player.name}在医院休息，本回合暂停。`);
        break;
      }
      state.dice = state.controlledDice ?? (Math.floor(random(state) * 6) + 1);
      state.controlledDice = null;
      state.steps = state.dice;
      state.phase = 'moving';
      log(state, `${player.name}掷出了 ${state.dice} 点。`);
      break;
    }
    case 'STEP': {
      player.position = (player.position + 1) % state.tiles.length;
      if (player.position === 0) {
        player.cash += LAP_BONUS;
        log(state, `${player.name}经过起点，收到 $3,000 旅行奖励。`, 'good');
      }
      state.steps--;
      if (state.steps <= 0) land(state);
      else if (state.tiles[player.position].kind === 'bank') {
        state.phase = 'bank';
        log(state, `${player.name}经过小镇银行，办理完存取款后还可前进 ${state.steps} 格。`);
      }
      break;
    }
    case 'BUY': {
      if (tile.owner !== null || tile.kind !== 'property' || player.cash < tile.price) return previous;
      player.cash -= tile.price;
      tile.owner = player.id;
      state.phase = 'end';
      log(state, `${player.name}花费 $${tile.price.toLocaleString()} 买下${tile.name}！`, 'good');
      break;
    }
    case 'UPGRADE': {
      const cost = upgradeCost(tile);
      if (tile.owner !== player.id || tile.level >= MAX_LEVEL || player.cash < cost) return previous;
      player.cash -= cost;
      tile.level++;
      state.phase = 'end';
      log(state, `${player.name}把${tile.name}升级为 ${tile.level} 级建筑！`, 'good');
      break;
    }
    case 'PASS':
      state.phase = state.phase === 'bank' && state.steps > 0 ? 'moving' : 'end';
      break;
    case 'END': {
      let next = (state.current + 1) % state.players.length;
      while (state.players[next].bankrupt) next = (next + 1) % state.players.length;
      if (next <= state.current) {
        state.round++;
        if (state.round <= state.roundLimit) {
          state.stocks.forEach(stock => {
            const change = 0.88 + random(state) * 0.25;
            stock.price = Math.max(20, Math.min(9999, Math.round(stock.price * change)));
            stock.history = [...stock.history.slice(-13), stock.price];
          });
          state.players.filter(p => !p.bankrupt).forEach(p => { p.savings += Math.floor(p.savings * 0.015); });
          log(state, `第 ${state.round} 天开始，股价已更新，存款获得 1.5% 利息。`);
        }
      }
      state.current = next;
      state.phase = 'ready';
      state.usedCard = false;
      state.controlledDice = null;
      finishIfNeeded(state);
      break;
    }
    case 'CARD': {
      if (state.phase !== 'ready' || state.usedCard || player.skip > 0) return previous;
      const index = player.cards.indexOf(action.card);
      if (index < 0) return previous;
      if (action.card === 'control') {
        if (!Number.isInteger(action.target) || action.target! < 1 || action.target! > 6) return previous;
        state.controlledDice = action.target!;
      } else if (action.card === 'shield') {
        if (player.shield) return previous;
        player.shield = true;
      } else if (action.card === 'renovate') {
        const target = state.tiles.find(t => t.id === action.target);
        if (!target || target.owner !== player.id || target.level >= MAX_LEVEL) return previous;
        target.level++;
      } else if (action.card === 'gift') player.cash += 1500;
      else return previous;
      player.cards.splice(index, 1);
      state.usedCard = true;
      log(state, `${player.name}使用了${CARDS[action.card].name}${action.card === 'control' ? `，下一次前进 ${action.target} 格` : ''}。`, 'good');
      break;
    }
    case 'SHOP_BUY': {
      if (state.phase !== 'shop' || !CARDS[action.card] || player.cards.length >= MAX_CARDS || player.cash < CARDS[action.card].price) return previous;
      player.cash -= CARDS[action.card].price;
      player.cards.push(action.card);
      log(state, `${player.name}买了一张${CARDS[action.card].name}。`, 'good');
      break;
    }
    case 'BANK': {
      if (!Number.isSafeInteger(action.amount) || action.amount === 0) return previous;
      if (action.amount > 0 && action.amount > player.cash) return previous;
      if (action.amount < 0 && -action.amount > player.savings) return previous;
      player.cash -= action.amount;
      player.savings += action.amount;
      log(state, `${player.name}${action.amount > 0 ? '存入' : '取出'} $${Math.abs(action.amount).toLocaleString()}。`);
      break;
    }
    case 'TRADE': {
      const stock = state.stocks[action.stock];
      if (!stock || !Number.isSafeInteger(action.shares) || action.shares === 0) return previous;
      const cost = stock.price * action.shares;
      if (!Number.isSafeInteger(cost) || cost > player.cash || player.stocks[action.stock] + action.shares < 0) return previous;
      player.cash -= cost;
      player.stocks[action.stock] += action.shares;
      log(state, `${player.name}${action.shares > 0 ? '买入' : '卖出'} ${Math.abs(action.shares)} 股${stock.name}。`);
      break;
    }
    case 'SELL_PROPERTY': {
      const target = state.tiles.find(t => t.id === action.tile);
      if (!target || target.owner !== player.id) return previous;
      const proceeds = Math.floor(propertyValue(target) * 0.7);
      player.cash += proceeds;
      target.owner = null;
      target.level = 0;
      log(state, `${player.name}出售了${target.name}，收回 $${proceeds.toLocaleString()}。`);
      break;
    }
  }
  return state;
}
