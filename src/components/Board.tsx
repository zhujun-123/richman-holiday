import { memo } from 'react';
import { DISTRICTS, MAX_LEVEL } from '../game/data';
import type { GameState } from '../game/model';

const UNIT_X = 43;
const UNIT_Y = 24;
function point(x: number, y: number): [number, number] { return [500 + (x - y) * UNIT_X, 130 + (x + y) * UNIT_Y]; }
function diamond(x: number, y: number, w = 40, h = 22) { return `${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}`; }

function Tree({ x, y, size = 1, pink = false }: { x: number; y: number; size?: number; pink?: boolean }) {
  const [px, py] = point(x, y);
  return <g transform={`translate(${px} ${py}) scale(${size})`}>
    <ellipse cy="6" rx="17" ry="8" fill="#4e7559" opacity=".13" />
    <path d="M0 3v-30" stroke="#947954" strokeWidth="5" />
    <path d="m0-60 19 27H11l14 20c-14 8-35 7-49 0l14-20h-8L0-60Z" fill={pink ? '#d7a0ac' : '#83a975'} />
    <path d="m0-60 0 49c-9 1-17 0-24-2l14-20h-8L0-60Z" fill={pink ? '#c58a9b' : '#6a9367'} />
    <path d="m0-60 12 17-12 4-13-3Z" fill={pink ? '#e7b9c0' : '#a2bf84'} />
  </g>;
}

function Building({ x, y, color, level = 0, kind = 'property' }: { x: number; y: number; color: string; level?: number; kind?: string }) {
  const height = kind === 'bank' ? 65 : kind === 'hospital' ? 57 : 22 + level * 15;
  const width = kind === 'bank' ? 33 : 26;
  const depth = width * .52;
  return <g transform={`translate(${x} ${y})`} className="map-building">
    <ellipse cy="5" rx={width + 8} ry="13" fill="#536b58" opacity=".12" />
    <path d={`M${-width} 0 0 ${depth} ${width} 0 0 ${-depth}Z`} fill="#d5cbb5" />
    <path d={`M${-width} 0 0 ${depth}V${depth - height}L${-width} ${-height}Z`} fill="#f5edda" />
    <path d={`M0 ${depth} ${width} 0V${-height}L0 ${depth - height}Z`} fill="#dcd4bf" />
    {kind === 'property' && level < 2 ? <>
      <path d={`M${-width - 4} ${-height} 0 ${-height + depth + 3} ${width + 4} ${-height} 0 ${-height - 24}Z`} fill={color} />
      <path d={`M${-width - 4} ${-height} 0 ${-height + depth + 3}V${-height - 24}Z`} fill="#243b39" opacity=".15" />
      <path d={`M-10 ${4}v-16l8 4V8Z`} fill="#97b9b1" />
      <path d={`m12-12 7-4v10l-7 4Z`} fill="#8fb2ab" />
      <path d={`M16 ${-height - 11}v-13l7 3v16`} fill="#eadfc7" />
    </> : <>
      <path d={`M${-width - 2} ${-height} 0 ${-height + depth} ${width + 2} ${-height} 0 ${-height - depth}Z`} fill={color} />
      <path d={`M${-width} ${-height + 6} 0 ${-height + depth + 6} ${width} ${-height + 6}`} fill="none" stroke={color} strokeWidth="5" />
      {Array.from({ length: Math.max(1, Math.floor(height / 19)) }, (_, row) => <g key={row} fill="#94b2b2">
        <path d={`M-20 ${-height + 11 + row * 17}l6 3v9l-6-3ZM-10 ${-height + 17 + row * 17}l6 3v9l-6-3Z`} />
        <path d={`m7 ${-height + 19 + row * 17} 6-3v9l-6 3Zm11-6 6-3v9l-6 3Z`} />
      </g>)}
      {kind === 'hospital' ? <><path d={`M-16 ${-height - 9}v16m-8-8h16`} stroke="#e88d7b" strokeWidth="5" /><rect x="-10" y={-height - 22} width="22" height="13" rx="2" fill="#f7f2e4" /><path d={`M1 ${-height - 20}v9m-4-4.5h8`} stroke="#ce7769" strokeWidth="3" /></> : null}
      {kind === 'bank' ? <><path d={`M-18 ${-height - 1} 0 ${-height - 25} 20 ${-height - 1}Z`} fill="#eee4cd" /><circle cy={-height - 11} r="5" fill="#d6b26f" /></> : null}
    </>}
    {kind === 'shop' ? <><path d={`M-31 ${-height + 8} 0 ${-height + 24}v7l-31-16Z`} fill="#e7a491" /><path d={`M-25 ${-height + 11}v7m8-3v7m8-3v7`} stroke="#fff1d9" strokeWidth="5" /><path d="m8-25 13-7v16l-13 7Z" fill="#f7d390" /></> : null}
    {level === MAX_LEVEL && kind === 'property' ? <><path d={`M0 ${-height - 6}v-30`} stroke="#8f997b" strokeWidth="2" /><path d={`M0 ${-height - 36} 18 ${-height - 29} 0 ${-height - 23}Z`} fill={color} /></> : null}
  </g>;
}

const Town = memo(function Town() {
  const [cx, cy] = point(4.9, 3.9);
  return <g aria-hidden="true">
    <g transform={`translate(${cx - 40} ${cy + 28})`}>
      <path d="M-156 20Q-182-29-110-64T31-55Q109-33 125 12T53 63Q-19 96-96 66T-156 20" fill="#d6dfbd" />
      <path d="M-143 15Q-156-25-96-48T27-44Q95-26 112 10T48 50Q-15 77-90 53T-143 15" fill="#a4cdca" stroke="#e9e2bf" strokeWidth="9" />
      <path d="M-117 13q40-19 80 0m-58 18q36-12 66 0M15-14q35-15 67 0M4 31q38-15 73 0" stroke="#c2dfd7" strokeWidth="2" fill="none" />
      <ellipse cx="-12" cy="0" rx="39" ry="21" fill="#ebdfbe" />
      <ellipse cx="-12" cy="-4" rx="33" ry="17" fill="#b9d5cb" stroke="#f7efd6" strokeWidth="5" />
      <path d="M-12-6v-38m0 11q-26-9-25 10m25-10q26-9 25 10" stroke="#e9f2e4" strokeWidth="3" fill="none" />
      <path d="M-12-41c-8-3-9-13 0-18 9 5 8 15 0 18Z" fill="#d0ebe1" />
      <g transform="translate(64 17)"><path d="m-13 0 24 0-5 7h-13Z" fill="#d8ac7c" /><path d="M0 0v-23l-13 19H0" fill="#fff5dc" /><path d="M3-23 13-6H3Z" fill="#e4a38b" /></g>
    </g>
    <g transform="translate(610 260)">
      <ellipse cy="13" rx="68" ry="32" fill="#819b73" opacity=".15" />
      <path d="m-31 5 30-75 32 75M-22 5h45" stroke="#d9c9a9" strokeWidth="6" strokeLinejoin="round" fill="none" />
      <g transform="translate(0 -51)" stroke="#eee7d4" strokeWidth="2.5" fill="none">
        <ellipse rx="46" ry="48" /><ellipse rx="37" ry="39" />
        {Array.from({ length: 8 }, (_, i) => { const angle = i * Math.PI / 4; return <path key={i} d={`M0 0 ${Math.sin(angle) * 46} ${Math.cos(angle) * 48}`} />; })}
        <circle r="5" fill="#e7b26c" stroke="none" />
        {Array.from({ length: 8 }, (_, i) => { const angle = i * Math.PI / 4; return <g key={i} transform={`translate(${Math.sin(angle) * 46} ${Math.cos(angle) * 48})`}><rect x="-7" y="-2" width="14" height="12" rx="4" fill={['#d69882', '#8eada3', '#dbbd79', '#a79ab5'][i % 4]} stroke="#f8eedb" strokeWidth="1.5" /><path d="M-4 1h8v4h-8Z" fill="#d8e5da" stroke="none" /></g>; })}
      </g>
    </g>
    <g transform="translate(456 219)">
      <ellipse cy="13" rx="49" ry="24" fill="#9aac7c" opacity=".2" />
      <path d="m-41-5 41 22 41-22-41-23Z" fill="#e5d4ad" />
      <path d="M-25-6v-35m50 35v-35M-25-33 0-18l25-15" stroke="#e9dfc7" strokeWidth="5" fill="none" />
      <path d="m-38-42 38-26 38 26-38 22Z" fill="#b9a589" /><path d="m-38-42 38 22v-48Z" fill="#cbbb98" />
      <path d="M-28-5 0 10 28-5" fill="none" stroke="#c6a776" strokeWidth="4" />
    </g>
    <g transform="translate(706 368)">
      <ellipse cy="3" rx="46" ry="23" fill="#aac48c" />
      <path d="M-20-3v-52m40 52v-52M-20-45h40" stroke="#f0e4c5" strokeWidth="5" />
      <path d="m-29-58 29-18 29 18-29 17Z" fill="#cf9b82" /><path d="M-12-45v29m23-29v29" stroke="#8a8f70" strokeWidth="2" /><path d="m-15-14 15 7 15-7" stroke="#b29874" strokeWidth="4" fill="none" />
    </g>
    <path d="M378 213q44 47 63 87M594 365q65 30 72 49M547 252l-49 23" fill="none" stroke="#dddbb7" strokeWidth="14" strokeLinecap="round" />
    {[ [1.8, 1.4], [2.9, 1.25], [6.8, 1.7], [8.3, 1.5], [8.6, 2.8], [8.3, 5.4], [8.2, 6.4], [6.7, 6.4], [3.1, 6.7], [1.7, 5.9], [1.5, 4.7], [1.4, 2.9], [4.5, 1.45], [4.3, 6.8] ].sort((a, b) => a[0] + a[1] - b[0] - b[1]).map(([x, y], i) => <Tree key={i} x={x} y={y} size={.68 + (i % 3) * .15} pink={i % 4 === 0} />)}
    <g transform="translate(480 452) rotate(29)"><rect x="-26" y="-7" width="52" height="22" rx="3" fill="#c3ad84" /><path d="M-27 0h54m-54 8h54" stroke="#e0ca9d" strokeWidth="3" /><path d="M-19 15v5m38-5v5" stroke="#8d8f70" strokeWidth="3" /></g>
    <g transform="translate(562 426)"><path d="M0 0v-31m-6 0h12l-2-12h-8Z" stroke="#929e84" fill="#f2d899" strokeWidth="3" /><ellipse cy="3" rx="9" ry="4" fill="#98ae7e" /></g>
    <g transform="translate(497 276) rotate(29)"><text textAnchor="middle" fill="#62836d" fontSize="13" fontWeight="700" letterSpacing="5">海风中央公园</text><text y="19" textAnchor="middle" fill="#90a084" fontSize="8" letterSpacing="2">A LITTLE TOWN, A BIG DREAM</text></g>
  </g>;
});

export function Board({ state, selected, onSelect }: { state: GameState; selected: number | null; onSelect: (id: number) => void }) {
  const current = state.players[state.current];
  const ordered = [...state.tiles].sort((a, b) => a.x + a.y - b.x - b.y);
  return <svg className="town-map" viewBox="70 -10 990 660" role="group" aria-label="海风小镇棋盘，点击地块查看详情">
    <defs>
      <pattern id="sea-waves" x="0" y="0" width="100" height="65" patternUnits="userSpaceOnUse"><path d="M10 31q8-5 16 0m38 27q8-5 16 0" fill="none" stroke="#a3c4bf" strokeWidth="1.2" opacity=".4" /></pattern>
      <filter id="island-shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>
    <rect width="1100" height="760" fill="url(#sea-waves)" />
    <ellipse cx="548" cy="440" rx="411" ry="240" fill="#83aaa2" opacity=".2" filter="url(#island-shadow)" />
    <path d="M500 65 1005 342Q1032 363 1005 390L657 600Q637 616 607 601L130 341Q99 321 127 292L475 68Q487 61 500 65Z" fill="#9bb497" transform="translate(0 21)" />
    <path d="M500 65 1005 342Q1032 363 1005 390L657 600Q637 616 607 601L130 341Q99 321 127 292L475 68Q487 61 500 65Z" fill="#e5d9ba" transform="translate(0 10)" />
    <path d="M500 65 1005 342Q1032 363 1005 390L657 600Q637 616 607 601L130 341Q99 321 127 292L475 68Q487 61 500 65Z" fill="#bdce9c" stroke="#e8dfbf" strokeWidth="8" />
    <path d="M500 117 943 363 629 548 199 309Z" fill="#b6c88e" stroke="#d2d8ab" strokeWidth="2" />
    {state.tiles.map(tile => {
      const [x, y] = point(tile.x, tile.y);
      const isActive = current.position === tile.id;
      const owner = tile.owner !== null ? state.players[tile.owner] : null;
      const fill = tile.kind === 'property' ? '#f6eddb' : ({ start: '#e1be79', chance: '#e3d7e6', bank: '#d2e2cb', shop: '#eed6b5', hospital: '#e8dbcc', park: '#d3dcae', tax: '#e5cfc6' }[tile.kind]);
      return <g key={tile.id} role="button" tabIndex={0} aria-label={`${tile.name}${owner ? `，${owner.name}的地产` : ''}`} onClick={() => onSelect(tile.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tile.id); } }} className={`map-tile ${isActive ? 'active-tile' : ''}`}>
        <polygon points={diamond(x, y + 5)} fill="#c8bda5" />
        <polygon points={diamond(x, y)} fill={fill} stroke={selected === tile.id ? '#365d4d' : '#e0d5bc'} strokeWidth={selected === tile.id ? 3 : 1.4} />
        {tile.kind === 'property' ? <path d={`M${x - 31} ${y + 3}l31 17 31-17`} stroke={owner?.color ?? DISTRICTS[tile.district].color} fill="none" strokeWidth="4" /> : null}
        {isActive ? <polygon points={diamond(x, y, 37, 20)} fill={current.color} fillOpacity=".1" stroke={current.color} strokeWidth="2" /> : null}
        {tile.kind !== 'property' ? <text x={x} y={y + 5} textAnchor="middle" fill="#7b7b69" fontSize={tile.kind === 'start' ? 15 : 17} fontWeight="700">{{ start: '出发', chance: '?', bank: '＄', shop: '♧', hospital: '+', park: '♧', tax: '税' }[tile.kind]}</text> : <><circle cx={x} cy={y} r="3" fill={owner?.color ?? '#d4c7a7'} /><text x={x + 14} y={y + 5} textAnchor="middle" fill="#afa080" fontSize="7">{tile.level > 0 ? '★'.repeat(tile.level) : ''}</text></>}
      </g>;
    })}
    <Town />
    {ordered.map(tile => {
      const [x, y] = point(tile.x, tile.y);
      const outward = { x: tile.y === 0 ? 25 : tile.x === 10 ? 45 : tile.y === 8 ? -22 : -44, y: tile.y === 0 ? -25 : tile.x === 10 ? 9 : tile.y === 8 ? 29 : -5 };
      const owner = tile.owner !== null ? state.players[tile.owner] : null;
      const show = tile.kind === 'property' || ['bank', 'shop', 'hospital'].includes(tile.kind);
      return <g key={tile.id} pointerEvents="none">
        {show ? <Building x={x + outward.x} y={y + outward.y} color={owner?.color ?? DISTRICTS[tile.district].color} level={tile.owner !== null ? tile.level : 0} kind={tile.kind} /> : null}
        <g transform={`translate(${x} ${y + 34})`}><text className="tile-label" textAnchor="middle" fontSize="10" fill="#677458" fontWeight={tile.kind === 'property' ? 500 : 700}>{tile.name}</text>{owner ? <circle cy="8" r="2.5" fill={owner.color} /> : null}</g>
      </g>;
    })}
    {state.players.filter(p => !p.bankrupt).sort((a, b) => Number(a.id === state.current) - Number(b.id === state.current)).map(player => {
      const tile = state.tiles[player.position];
      const [x, y] = point(tile.x, tile.y);
      const others = state.players.filter(p => p.position === player.position && !p.bankrupt);
      const offset = others.length > 1 ? (others.indexOf(player) - (others.length - 1) / 2) * 12 : 0;
      const active = player.id === state.current;
      return <g key={player.id} className={`player-token ${active && state.phase === 'moving' ? 'walking' : ''}`} style={{ transform: `translate(${x + offset}px, ${y - 5}px)` }} pointerEvents="none">
        <ellipse cy="6" rx="13" ry="7" fill="#5c7665" opacity=".22" />
        {active ? <ellipse cy="6" rx="17" ry="10" stroke={player.color} strokeWidth="2" fill="none" /> : null}
        <path d="M-7 0v-13h14V0l-7 4Z" fill={player.color} stroke="#fff6df" strokeWidth="1.3" />
        <circle cy="-22" r="9" fill="#f2c8a1" stroke="#fff6df" strokeWidth="1.5" />
        <path d="M-10-24q0-13 12-9l8 6-5 3-4-5-11 5Z" fill={['#c79960', '#6594b0', '#665066', '#74916b'][player.character]} />
        <path d="M-3-21h.1m6 0h.1" stroke="#615241" strokeWidth="2" strokeLinecap="round" />
        {player.shield ? <circle cy="-16" r="25" fill="none" stroke="#a99bbf" strokeWidth="2" strokeDasharray="5 3" opacity=".9" /> : null}
        {active ? <g transform="translate(0 -49)"><path d="m-8-10 8 12 8-12Z" fill={player.color} /><text y="-16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#3f6151" className="tile-label">{player.id === 0 ? '你' : player.name}</text></g> : null}
      </g>;
    })}
    <g transform="translate(929 548)" aria-hidden="true"><circle r="25" fill="#e5eee1" fillOpacity=".65" /><path d="m0-20 6 20-6-4-6 4Z" fill="#6f8e7b" /><path d="m0 20 6-20-6 4-6-4Z" fill="#b9c9b6" /><text y="-29" textAnchor="middle" fill="#75927f" fontSize="10">北</text></g>
    <g transform="translate(199 499)" aria-hidden="true"><path d="M-10 7h41l-8 10H0Z" fill="#bda88a" /><path d="M10 7v-49L-9-1h19" fill="#fff1d1" /><path d="m13-40 23 37H13Z" fill="#c9957a" /><path d="M-20 25q30-7 60 0" fill="none" stroke="#abc9be" strokeWidth="2" /></g>
    <g fill="none" stroke="#8da99c" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M288 126q7-7 14 0 7-7 14 0M840 169q5-5 10 0 5-5 10 0M302 583q5-5 10 0 5-5 10 0" /></g>
  </svg>;
}
