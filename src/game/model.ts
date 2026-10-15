export type TileKind = 'start' | 'property' | 'chance' | 'bank' | 'shop' | 'hospital' | 'park' | 'tax';
export type CardId = 'control' | 'shield' | 'renovate' | 'gift';
export type Phase = 'ready' | 'moving' | 'purchase' | 'upgrade' | 'shop' | 'bank' | 'end' | 'over';

export interface Tile {
  id: number;
  name: string;
  kind: TileKind;
  x: number;
  y: number;
  district: number;
  price: number;
  owner: number | null;
  level: number;
}

export interface Player {
  id: number;
  name: string;
  character: number;
  color: string;
  cash: number;
  savings: number;
  position: number;
  cards: CardId[];
  stocks: number[];
  shield: boolean;
  skip: number;
  bankrupt: boolean;
}

export interface Stock {
  name: string;
  symbol: string;
  price: number;
  history: number[];
  color: string;
}

export interface GameLog {
  id: number;
  round: number;
  text: string;
  tone: 'normal' | 'good' | 'bad';
}

export interface GameState {
  version: 2;
  seed: number;
  current: number;
  round: number;
  roundLimit: number;
  phase: Phase;
  tiles: Tile[];
  players: Player[];
  stocks: Stock[];
  dice: number;
  steps: number;
  controlledDice: number | null;
  usedCard: boolean;
  message: string;
  logs: GameLog[];
  logId: number;
  winners: number[];
}

export type Action =
  | { type: 'ROLL' }
  | { type: 'STEP' }
  | { type: 'BUY' }
  | { type: 'UPGRADE' }
  | { type: 'PASS' }
  | { type: 'END' }
  | { type: 'CARD'; card: CardId; target?: number }
  | { type: 'SHOP_BUY'; card: CardId }
  | { type: 'BANK'; amount: number }
  | { type: 'TRADE'; stock: number; shares: number }
  | { type: 'SELL_PROPERTY'; tile: number };
