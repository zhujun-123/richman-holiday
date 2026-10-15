import type { CardId, Tile, TileKind } from './model';

export const CHARACTERS = [
  { name: '小满', subtitle: '今天也要赚一点', color: '#e38a59', trait: '好奇的旅行家' },
  { name: '阿橘', subtitle: '好运总会找上门', color: '#6196b4', trait: '乐观的冒险家' },
  { name: '米粒', subtitle: '每一笔都算得清', color: '#a18ac0', trait: '精明的收藏家' },
  { name: '老金', subtitle: '慢慢来，比较快', color: '#659572', trait: '沉稳的实业家' },
] as const;

export const DISTRICTS = [
  { name: '日光街区', color: '#e9b46c' },
  { name: '海湾街区', color: '#72b3c1' },
  { name: '花园街区', color: '#cb8ba7' },
  { name: '山丘街区', color: '#9aa982' },
] as const;

export const CARDS: Record<CardId, { name: string; description: string; price: number; color: string; icon: string }> = {
  control: { name: '遥控骰子', description: '指定下一次的骰子点数，想去哪里就去哪里。', price: 900, color: '#719da6', icon: 'dice' },
  shield: { name: '免租金卡', description: '抵消下一次过路费，使用后持续到触发。', price: 700, color: '#9b8bb2', icon: 'shield' },
  renovate: { name: '建房卡', description: '免费升级自己的一处地产，最高升至五级。', price: 1200, color: '#d49a65', icon: 'house' },
  gift: { name: '小小财运', description: '领一份小镇见面礼，立即获得 $1,500。', price: 1800, color: '#8da77d', icon: 'gift' },
};

const names = [
  '假日起点', '海风路', '向阳街', '命运邮局', '桔子巷', '小镇银行', '咖啡街', '卡片商店', '彩虹路',
  '滨海大道', '小镇医院', '椰林路', '贝壳街', '帆船巷', '命运邮局', '灯塔路', '珊瑚街', '港湾路',
  '中央公园', '樱花路', '薄荷巷', '花园街', '风铃路', '小镇银行', '梧桐街', '月光路', '星河巷',
  '卡片商店', '山丘路', '云朵街', '市政税务', '松果巷', '森林路', '命运邮局', '晴空街', '回家路',
];
const special: Partial<Record<number, TileKind>> = {
  0: 'start', 3: 'chance', 5: 'bank', 7: 'shop', 10: 'hospital', 14: 'chance',
  18: 'park', 23: 'bank', 27: 'shop', 30: 'tax', 33: 'chance',
};
const route: [number, number][] = [];
for (let x = 0; x <= 10; x++) route.push([x, 0]);
for (let y = 1; y <= 8; y++) route.push([10, y]);
for (let x = 9; x >= 0; x--) route.push([x, 8]);
for (let y = 7; y >= 1; y--) route.push([0, y]);

export function createTiles(): Tile[] {
  return route.map(([x, y], id) => ({
    id, x, y, name: names[id], kind: special[id] ?? 'property',
    district: Math.floor(id / 9), price: 1800 + (id % 9) * 220 + Math.floor(id / 9) * 450,
    owner: null, level: 0,
  }));
}

export const START_CASH = 18000;
export const START_SAVINGS = 6000;
export const LAP_BONUS = 3000;
export const MAX_LEVEL = 5;
export const MAX_CARDS = 15;
export const SAVE_KEY = 'richman-holiday:v1';
