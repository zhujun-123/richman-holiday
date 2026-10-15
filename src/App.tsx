import { useEffect, useReducer, useState } from 'react';
import type { CSSProperties } from 'react';
import { Avatar } from './components/Avatar';
import { Board } from './components/Board';
import { Dialog } from './components/Dialog';
import { Icon } from './components/Icon';
import { CARDS, CHARACTERS, DISTRICTS, MAX_LEVEL } from './game/data';
import { createGame, gameReducer, netWorth, propertyValue, rentFor, upgradeCost } from './game/engine';
import type { Action, CardId, GameState } from './game/model';
import { loadGame, saveGame } from './game/storage';
import { computerAction } from './game/strategy';
import { playChime } from './sound';

type Panel = 'cards' | 'properties' | 'bank' | 'stocks' | 'help' | 'new' | 'logs' | null;
type GameAction = Action | { type: 'RESET'; character: number; rounds: number; seed: number };
const money = (value: number) => `$${value.toLocaleString('en-US')}`;
const kindNames = { start: '旅行起点', property: '可购地产', bank: '银行', chance: '机会事件', shop: '卡片商店', hospital: '医院', tax: '市政税务', park: '公园' };
const kindIcons = { start: 'flag', property: 'house', bank: 'bank', chance: 'mail', shop: 'cards', hospital: 'hospital', tax: 'coin', park: 'tree' };

function reducer(state: GameState, action: GameAction): GameState {
  return action.type === 'RESET' ? createGame(action.character, action.rounds, action.seed) : gameReducer(state, action);
}

function Dice({ value, rolling = false, small = false }: { value: number; rolling?: boolean; small?: boolean }) {
  const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  return <span className={`dice ${rolling ? 'dice-rolling' : ''} ${small ? 'dice-small' : ''}`} aria-label={`${value} 点`}>
    {Array.from({ length: 9 }, (_, i) => <i key={i} className={pips[value].includes(i) ? 'pip on' : 'pip'} />)}
  </span>;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values) * .96;
  const max = Math.max(...values) * 1.04;
  const coords = values.map((value, i) => `${(i / Math.max(1, values.length - 1)) * 150},${43 - ((value - min) / (max - min)) * 39}`).join(' ');
  return <svg viewBox="0 0 150 48" width="150" height="48" aria-label="近期股价走势"><polygon points={`0,48 ${coords} 150,48`} fill={color} opacity=".1" /><polyline points={coords} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /></svg>;
}

export default function App() {
  const [saved] = useState(loadGame);
  const [state, dispatch] = useReducer(reducer, saved, initial => initial ?? createGame());
  const [started, setStarted] = useState(Boolean(saved));
  const [panel, setPanel] = useState<Panel>(saved ? null : 'new');
  const [selected, setSelected] = useState<number | null>(null);
  const [character, setCharacter] = useState(saved?.players[0].character ?? 0);
  const [rounds, setRounds] = useState(saved?.roundLimit ?? 20);
  const [speed, setSpeed] = useState(1);
  const [sound, setSound] = useState(false);
  const [activeCard, setActiveCard] = useState<CardId | null>(null);
  const [bankAmount, setBankAmount] = useState('1000');
  const [saveOk, setSaveOk] = useState(true);
  const [showResult, setShowResult] = useState(true);
  const me = state.players[0];
  const current = state.players[state.current];
  const myTurn = state.current === 0 && !me.bankrupt;
  const canManage = myTurn && ['ready', 'end'].includes(state.phase);
  const canCard = myTurn && state.phase === 'ready' && !state.usedCard && me.skip === 0;
  const owned = state.tiles.filter(t => t.owner === 0);
  const tile = state.tiles[current.position];
  const inspected = selected === null ? null : state.tiles[selected];
  const rankings = [...state.players].sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || netWorth(state, b) - netWorth(state, a));
  const rank = rankings.findIndex(p => p.id === 0) + 1;
  const paused = panel !== null || !started;

  useEffect(() => { if (started) setSaveOk(saveGame(state)); }, [state, started]);

  useEffect(() => {
    if (paused || state.phase === 'over') return;
    let action: Action | null = null;
    let delay = 800 / speed;
    if (state.phase === 'moving') {
      action = { type: 'STEP' };
      delay = (state.steps === state.dice ? 680 : 260) / speed;
    } else if (state.current !== 0 || me.bankrupt) {
      action = computerAction(state);
    }
    if (!action) return;
    const timeout = window.setTimeout(() => dispatch(action!), delay);
    return () => clearTimeout(timeout);
  }, [state, paused, speed, current, tile, me.bankrupt]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' || paused || !myTurn || e.repeat) return;
      if ((e.target as HTMLElement).closest('button, input, select, textarea, a, [role="button"]')) return;
      if (state.phase === 'ready' || state.phase === 'end') {
        e.preventDefault();
        dispatch({ type: state.phase === 'ready' ? 'ROLL' : 'END' });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, myTurn, state.phase]);

  function act(action: Action) {
    if (sound && action.type === 'ROLL') playChime('roll');
    if (sound && ['BUY', 'UPGRADE', 'CARD'].includes(action.type)) playChime();
    dispatch(action);
  }

  function openPanel(value: Panel) { setActiveCard(null); setPanel(value); }
  function closePanel() { setActiveCard(null); setPanel(null); }
  function useCard(card: CardId, target?: number) { act({ type: 'CARD', card, target }); closePanel(); }

  function newGame() {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    dispatch({ type: 'RESET', character, rounds, seed });
    setStarted(true);
    setSelected(null);
    setShowResult(true);
    closePanel();
  }

  const headline = !myTurn ? `${current.name}${state.phase === 'moving' ? '正在旅行' : '的回合'}`
    : state.phase === 'ready' ? (me.skip > 0 ? '先休息一下，明天再出发' : '轮到你啦，出发吧！')
      : state.phase === 'moving' ? `掷出了 ${state.dice} 点，去看看新风景`
        : state.phase === 'purchase' ? `把${tile.name}收入囊中？`
          : state.phase === 'upgrade' ? '自己的地盘，再添一层好光景'
            : state.phase === 'shop' ? '欢迎光临，带张好运卡回去吧'
              : state.phase === 'over' ? '这次假日，收获满满' : '这一站的故事，告一段落';

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Icon name="house" size={27} /></span><div><h1>富翁假日<span className="brand-sun">✦</span></h1><span>把日子过成一场小小的冒险</span></div></div>
      <div className="topbar-center"><span className="map-location"><span className="location-dot" />海风小镇</span><span className="header-divider" /><Icon name="sun" size={21} /><span className="day-number">第 {Math.min(state.round, state.roundLimit)} 天 <span>/ {state.roundLimit} 天</span></span></div>
      <div className="header-actions"><button className="icon-button" aria-label={sound ? '关闭音效' : '开启音效'} title={sound ? '关闭音效' : '开启音效'} onClick={() => { if (!sound) playChime(); setSound(!sound); }}><Icon name={sound ? 'sound' : 'mute'} /></button><button className="icon-button" aria-label="游戏规则" title="游戏规则" onClick={() => openPanel('help')}><Icon name="help" /></button><span className="header-divider" /><button className="new-game-button" aria-label="新的一局" title="新的一局" onClick={() => openPanel('new')}><Icon name="reset" size={16} /><span>新的一局</span></button></div>
    </header>

    <div className="game-layout">
      <aside className="sidebar">
        <div className="section-label"><h2>假日同行人</h2><span>1 位玩家 · 3 位电脑</span></div>
        <div className="player-list">
          {state.players.map(player => {
            const active = player.id === state.current && state.phase !== 'over';
            const count = state.tiles.filter(t => t.owner === player.id).length;
            return <article className={`player-card ${active ? 'player-active' : ''} ${player.bankrupt ? 'player-bankrupt' : ''}`} style={{ '--player-color': player.color } as CSSProperties} key={player.id}>
              <div className="player-top"><Avatar character={player.character} size={43} /><div className="player-name"><strong>{player.name}<small>{player.id === 0 ? '你' : '电脑'}</small></strong><span>{player.bankrupt ? '下次假日再见' : active ? '正在行动' : CHARACTERS[player.character].trait}</span></div>{active ? <span className="turn-indicator" /> : null}</div>
              <div className="player-cash"><span>现金</span><strong>{money(player.cash)}</strong></div>
              <div className="player-facts"><span>存款 <b>{money(player.savings)}</b></span><span><Icon name="house" size={13} /> {count} 处</span></div>
            </article>;
          })}
        </div>
        <div className="my-ranking"><Icon name="flag" size={18} /><span>我的总资产<strong>{money(netWorth(state, me))}</strong></span><b>{rank}<small> / 4</small></b></div>
        <div className="sidebar-footer"><span className={`save-dot ${saveOk ? '' : 'save-error'}`} />{saveOk ? '本地自动存档，随时回来' : '无法存档，请检查浏览器存储权限'}</div>
      </aside>

      <main className="main-area">
        <section className="map-area" aria-label="游戏地图">
          <div className="map-heading"><div><span className="small-map-icon"><Icon name="tree" size={15} /></span><h2>海风小镇</h2><span className="weather">晴 · 适合发财</span></div><p>海风刚刚好，好运在路上。</p></div>
          <div className="map-utility"><button className="speed-button" onClick={() => setSpeed(v => v === 1 ? 2 : v === 2 ? 4 : 1)} title="调整动画和电脑速度" aria-label={`游戏速度 ${speed} 倍，点击切换`}><Icon name="fast" size={15} />{speed}×</button></div>
          <div className="board-wrap"><Board state={state} selected={selected} onSelect={id => setSelected(id === selected ? null : id)} /></div>
          {inspected ? <div className="property-inspector" style={{ '--district-color': DISTRICTS[inspected.district].color } as CSSProperties}>
            <button className="inspector-close icon-button" aria-label="关闭地块详情" onClick={() => setSelected(null)}><Icon name="close" size={15} /></button>
            <span className="inspector-kind"><Icon name={kindIcons[inspected.kind]} size={14} />{inspected.kind === 'property' ? DISTRICTS[inspected.district].name : kindNames[inspected.kind]}</span>
            <h3>{inspected.name}</h3>
            {inspected.kind === 'property' ? <><div className="inspector-value"><span>{inspected.owner === null ? '地价' : '资产价值'}</span><strong>{money(propertyValue(inspected))}</strong></div><div className="inspector-detail"><span>过路费 {money(rentFor(inspected))}</span><span>{inspected.owner === null ? '待售中' : `${state.players[inspected.owner].name} · ${inspected.level} 级`}</span></div></> : <p>{{ start: '经过这里可领 $3,000 旅行奖励。', bank: '停留时，额外获得存款的 5% 利息。', chance: '拆开一封信，看看今天有什么奇遇。', shop: '停留时可购买卡片，卡包最多 8 张。', hospital: '路过可以免费体检；事件住院会暂停一回合。', tax: '缴纳总资产的 4%，最低 $500。', park: '在公园摆摊，赚取 $800。' }[inspected.kind]}</p>}
          </div> : <div className="map-note"><span className="note-dot" />点击任意地块，看看小镇的故事</div>}
          <div className="map-legend">{DISTRICTS.map(d => <span key={d.name}><i style={{ background: d.color }} />{d.name}</span>)}</div>
        </section>

        <div className="news-strip"><span className="news-title"><Icon name="mail" size={16} />小镇播报</span><p key={state.logId} role="status">{state.message}</p><button className="text-button" onClick={() => openPanel('logs')}>查看记录<Icon name="chevron" size={14} /></button></div>

        <div className="bottom-panel">
          <nav className="toolbox" aria-label="我的工具"><button onClick={() => openPanel('cards')}><span className="tool-icon card-tool"><Icon name="cards" size={22} /></span><span>我的卡片<small>{me.cards.length} 张好牌</small></span><b className="tool-count">{me.cards.length}</b></button><button onClick={() => openPanel('properties')}><span className="tool-icon property-tool"><Icon name="house" size={22} /></span><span>我的地产<small>小镇置业计划</small></span><b className="tool-count">{owned.length}</b></button><button onClick={() => openPanel('bank')}><span className="tool-icon bank-tool"><Icon name="bank" size={22} /></span><span>小镇银行<small>让零钱歇一歇</small></span></button><button onClick={() => openPanel('stocks')}><span className="tool-icon stock-tool"><Icon name="stock" size={22} /></span><span>小镇股市<small>投资一点可能</small></span></button></nav>
          <div className="turn-bar">
            <div className="turn-avatar"><Avatar character={current.character} size={52} />{current.shield ? <span className="shield-badge"><Icon name="shield" size={12} /></span> : null}</div>
            <div className="turn-copy"><span className="turn-eyebrow">{myTurn ? '你的回合' : '电脑回合'}<span />{state.phase === 'moving' ? `还有 ${state.steps} 步` : tile.name}</span><h2>{headline}</h2><p>{state.phase === 'purchase' ? `买地 ${money(tile.price)}，基础过路费 ${money(rentFor(tile))}` : state.phase === 'upgrade' ? `升级 ${money(upgradeCost(tile))}，下一等级过路费 ${money(rentFor({ ...tile, level: tile.level + 1 }))}` : me.shield ? '免租金卡生效中 · 下一次收租有备无患' : '走走停停，赚点小钱，也赚点开心。'}</p></div>
            <div className="turn-controls">
              {state.phase === 'over' ? <button className="primary-button" onClick={() => setShowResult(true)}><Icon name="flag" />查看结果</button>
                : !myTurn || state.phase === 'moving' ? <div className="waiting-action"><Dice value={state.dice} rolling={state.phase === 'moving'} /><span>{state.phase === 'moving' ? '旅行中…' : '稍等一下…'}</span></div>
                  : state.phase === 'ready' ? <button className="roll-button" onClick={() => act({ type: 'ROLL' })}><Dice value={state.controlledDice ?? state.dice} /><span>{me.skip > 0 ? '休息一回合' : '掷骰子'}<small>{state.controlledDice ? `已锁定 ${state.controlledDice} 点` : '空格键也可以'}</small></span><Icon name="arrow" size={21} /></button>
                    : state.phase === 'purchase' || state.phase === 'upgrade' ? <><button className="secondary-button" onClick={() => act({ type: 'PASS' })}>先路过</button><button className="primary-button" disabled={me.cash < (state.phase === 'purchase' ? tile.price : upgradeCost(tile))} onClick={() => act({ type: state.phase === 'purchase' ? 'BUY' : 'UPGRADE' })}><Icon name="house" size={19} />{me.cash < (state.phase === 'purchase' ? tile.price : upgradeCost(tile)) ? '现金不足' : state.phase === 'purchase' ? '买下这块地' : '升级建筑'}</button></>
                      : state.phase === 'shop' ? <><button className="secondary-button" onClick={() => act({ type: 'PASS' })}>离开商店</button><button className="primary-button" onClick={() => openPanel('cards')}><Icon name="cards" />挑选卡片</button></>
                        : <button className="primary-button end-button" onClick={() => act({ type: 'END' })}>结束回合<Icon name="arrow" size={20} /></button>}
            </div>
          </div>
        </div>
      </main>
    </div>
    <footer className="app-footer"><span>原创规则与画面 · React 学习项目</span><span>愿每一次出发，都有好事发生。<span className="footer-flower">✳</span></span><a href="https://github.com/zhujun-123/richman-holiday" target="_blank" rel="noreferrer"><Icon name="github" size={13} />MIT 开源</a></footer>

    {panel === 'new' ? <Dialog title={started ? '再去小镇度一次假' : '欢迎来到，富翁假日。'} onClose={started ? closePanel : undefined} wide>
      <div className="welcome-intro"><span className="welcome-house"><Icon name="house" size={36} /></span><p>在海风小镇，买下第一块地，盖起第一栋小楼。<br />和三位朋友一起，把一点点好运变成大大的梦想。</p></div>
      <h3 className="field-title">这次，想成为谁？</h3>
      <div className="character-picker">{CHARACTERS.map((char, i) => <button key={char.name} className={character === i ? 'chosen' : ''} onClick={() => setCharacter(i)} aria-pressed={character === i}><Avatar character={i} size={77} /><strong>{char.name}</strong><span>{char.subtitle}</span>{character === i ? <i><Icon name="check" size={12} /></i> : null}</button>)}</div>
      <div className="round-picker"><span><strong>假日时长</strong><small>到期按总资产排名，也可能提前决出胜负</small></span><div>{[20, 30, 50].map(n => <button key={n} className={rounds === n ? 'chosen' : ''} onClick={() => setRounds(n)} aria-pressed={rounds === n}>{n} 天</button>)}</div></div>
      {started ? <p className="muted">开始新一局会替换当前自动存档。</p> : <p className="welcome-note">单人游玩 · 三位电脑对手 · 自动存档 · 无需登录</p>}
      <button className="primary-button welcome-start" onClick={newGame}>开启我的富翁假日<Icon name="arrow" /></button>
    </Dialog> : null}

    {panel === 'cards' ? <Dialog title={state.phase === 'shop' && myTurn ? '小镇卡片商店' : '我的好运卡片'} onClose={closePanel} wide>
      <p className="panel-description">{state.phase === 'shop' && myTurn ? '挑一张好牌带回去吧，卡包最多放 8 张。' : canCard ? '掷骰前可以使用一张卡片，让旅程多一点惊喜。' : '每回合掷骰前可使用一张卡片。现在可以先看看手里的好牌。'}</p>
      <div className="cards-grid">{(Object.entries(CARDS) as [CardId, typeof CARDS[CardId]][]).map(([id, card]) => {
        const count = me.cards.filter(c => c === id).length;
        const shop = state.phase === 'shop' && myTurn;
        const disabled = shop ? me.cash < card.price || me.cards.length >= 8 : !canCard || count === 0 || (id === 'renovate' && !owned.some(t => t.level < MAX_LEVEL)) || (id === 'shield' && me.shield);
        return <article className={`item-card ${count === 0 && !shop ? 'no-card' : ''}`} key={id} style={{ '--card-color': card.color } as CSSProperties}><span className="card-art"><Icon name={card.icon} size={39} /><i>✦</i></span><div className="card-title"><h3>{card.name}</h3><span>× {count}</span></div><p>{card.description}</p><button className="secondary-button" disabled={disabled} onClick={() => shop ? act({ type: 'SHOP_BUY', card: id }) : id === 'control' || id === 'renovate' ? setActiveCard(id) : useCard(id)}>{shop ? `购买 ${money(card.price)}` : count > 0 ? id === 'shield' && me.shield ? '已经生效' : '使用卡片' : '还没收集到'}</button></article>;
      })}</div>
      {activeCard === 'control' ? <div className="card-target"><h3>下一次，想走几步？</h3><div className="dice-choices">{[1, 2, 3, 4, 5, 6].map(n => <button key={n} onClick={() => useCard('control', n)}><Dice value={n} small /><span>{state.tiles[(me.position + n) % 36].name}</span></button>)}</div></div> : null}
      {activeCard === 'renovate' ? <div className="card-target"><h3>给哪处地产添一层？</h3><div className="renovation-choices">{owned.filter(t => t.level < MAX_LEVEL).map(t => <button className="secondary-button" key={t.id} onClick={() => useCard('renovate', t.id)}>{t.name}<Icon name="arrow" size={14} />{t.level + 1} 级</button>)}</div></div> : null}
    </Dialog> : null}

    {panel === 'properties' ? <Dialog title={`我的小镇地产 · ${owned.length} 处`} onClose={closePanel} wide>
      <div className="panel-summary"><span>地产总价值<strong>{money(owned.reduce((sum, t) => sum + propertyValue(t), 0))}</strong></span><Icon name="house" size={36} /></div>
      {owned.length === 0 ? <div className="empty-state"><Icon name="house" size={47} /><h3>第一栋小楼，正在等你。</h3><p>停在无主地产上时，就能买下它。<br />再次停留可盖房升级，收取更多过路费。</p></div> : <div className="property-list">{owned.map(t => <div className="owned-property" key={t.id}><span className="property-color" style={{ background: DISTRICTS[t.district].color }} /><div><strong>{t.name}</strong><span>{t.level === 0 ? '空地' : `${t.level} 级建筑`} · 过路费 {money(rentFor(t))}</span></div><b>{money(propertyValue(t))}</b><button className="small-button" disabled={!canManage} onClick={() => act({ type: 'SELL_PROPERTY', tile: t.id })}>出售 {money(Math.floor(propertyValue(t) * .7))}</button></div>)}</div>}
      <p className="muted">出售按资产价值的 70% 回收；可在自己的回合开始或结束时操作。</p>
    </Dialog> : null}

    {panel === 'bank' ? <Dialog title="小镇银行" onClose={closePanel}>
      <div className="bank-summary"><Icon name="bank" size={43} /><span>我的存款<strong>{money(me.savings)}</strong><small>每天利息 1.5% · 停在银行额外获 5%</small></span></div>
      <p className="panel-description">小镇手机银行随时可查看，在你的回合开始或结束时可存取。需要付账时，会自动取款。</p>
      <label className="amount-label" htmlFor="bank-amount">存取金额<span>可用现金 {money(me.cash)}</span></label><div className="amount-input"><span>$</span><input id="bank-amount" inputMode="numeric" type="number" min="1" step="100" value={bankAmount} onChange={e => setBankAmount(e.target.value)} /></div>
      <div className="quick-amounts">{[1000, 3000, 5000].map(n => <button key={n} onClick={() => setBankAmount(String(n))}>{money(n)}</button>)}</div>
      <div className="bank-buttons"><button className="secondary-button" disabled={!canManage || !Number.isSafeInteger(Number(bankAmount)) || Number(bankAmount) <= 0 || Number(bankAmount) > me.savings} onClick={() => act({ type: 'BANK', amount: -Number(bankAmount) })}>取出现金</button><button className="primary-button" disabled={!canManage || !Number.isSafeInteger(Number(bankAmount)) || Number(bankAmount) <= 0 || Number(bankAmount) > me.cash} onClick={() => act({ type: 'BANK', amount: Number(bankAmount) })}>存入银行<Icon name="arrow" size={16} /></button></div>
      {!canManage ? <p className="muted">等到你的回合开始或结束时，就可以办理啦。</p> : null}
    </Dialog> : null}

    {panel === 'stocks' ? <Dialog title="小镇股市" onClose={closePanel} wide>
      <p className="panel-description">每天开盘更新价格，涨跌由游戏随机生成。每次交易 10 股，和现金、地产一起计入总资产。</p>
      <div className="stock-list">{state.stocks.map((stock, i) => {
        const change = stock.price - stock.history[Math.max(0, stock.history.length - 2)];
        return <article className="stock-row" key={stock.symbol}><div className="stock-brand" style={{ background: `${stock.color}20`, color: stock.color }}>{stock.symbol.slice(0, 1)}</div><div className="stock-name"><h3>{stock.name}<small>{stock.symbol}</small></h3><span>持有 {me.stocks[i]} 股 · 市值 {money(me.stocks[i] * stock.price)}</span></div><Sparkline values={stock.history} color={stock.color} /><div className="stock-price"><strong>{money(stock.price)}</strong><span className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change} 今日</span></div><div className="trade-actions"><button className="small-button" disabled={!canManage || me.stocks[i] < 10} onClick={() => act({ type: 'TRADE', stock: i, shares: -10 })}>卖出 10 股</button><button className="small-button buy-stock" disabled={!canManage || me.cash < stock.price * 10} onClick={() => act({ type: 'TRADE', stock: i, shares: 10 })}>买入 10 股</button></div></article>;
      })}</div><div className="stock-total"><span>股票总市值 <strong>{money(me.stocks.reduce((sum, n, i) => sum + n * state.stocks[i].price, 0))}</strong></span><span>可用现金 {money(me.cash)}</span></div>
      {!canManage ? <p className="muted">交易在你的回合开始或结束时开放。</p> : null}
    </Dialog> : null}

    {panel === 'logs' ? <Dialog title="小镇的假日记事" onClose={closePanel}><div className="log-list">{state.logs.map(entry => <div key={entry.id} className={`log-entry log-${entry.tone}`}><span>第 {entry.round} 天</span><p>{entry.text}</p></div>)}</div></Dialog> : null}

    {panel === 'help' ? <Dialog title="这场假日，怎么玩？" onClose={closePanel} wide><p className="panel-description">这是一款受经典大富翁启发的原创单机游戏。你和三位电脑，在同一座小镇经营自己的小日子。</p><div className="rules-grid">{[
      ['dice', '掷骰出发', '每人每天行动一次，前进 1–6 格。经过起点领取 $3,000。空格键可掷骰或结束回合。'],
      ['house', '买地盖房', '停在空地上可以买地，再次停在自己的地上可付费升级，最高三级。别人经过时向你付租金。'],
      ['cards', '卡片添好运', '每回合掷骰前可用一张卡。遥控骰子指定步数，免租卡抵消一次租金，建房卡免费升级。'],
      ['bank', '给零钱放个假', '手机银行可存取；每天存款增值 1.5%，停在银行额外增值 5%。付账时会自动取款。'],
      ['stock', '投资小镇生意', '每次买卖 10 股，日常价格随机变化约 −12% 到 +13%。股票按当前价格计入总资产。'],
      ['flag', '谁是小镇富翁', '假日到期按现金、存款、股票与地产总价值排名。付账不足时依次取存款、卖股票、按七折卖地；仍不够则破产。最后一人也会提前获胜。'],
    ].map(([icon, title, content]) => <div className="rule-item" key={title}><span><Icon name={icon} size={23} /></span><div><h3>{title}</h3><p>{content}</p></div></div>)}</div><div className="help-note">浏览器自动保存进度。此版本使用原创人物和 SVG 画面，采用 MIT 许可，适合阅读源码与改规则。</div></Dialog> : null}

    {state.phase === 'over' && showResult && panel === null ? <Dialog title={state.winners.includes(0) ? '恭喜，小镇新富翁！' : '假日结束，下次再出发。'} onClose={() => setShowResult(false)}><div className="result-hero"><Avatar character={state.players[state.winners[0]].character} size={112} /><h3>{state.message}</h3><p>经营了 {Math.min(state.round, state.roundLimit)} 天，一起来看看大家的收获。</p></div><div className="result-rankings">{rankings.map((p, i) => <div key={p.id}><b>{i + 1}</b><Avatar character={p.character} size={36} /><span>{p.name}{p.id === 0 ? '（你）' : ''}{p.bankrupt ? ' · 已破产' : ''}</span><strong>{money(netWorth(state, p))}</strong></div>)}</div><button className="primary-button welcome-start" onClick={() => openPanel('new')}>再度一次假<Icon name="arrow" /></button></Dialog> : null}
  </div>;
}
