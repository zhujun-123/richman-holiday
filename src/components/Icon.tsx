import type { CSSProperties } from 'react';

const paths: Record<string, React.ReactNode> = {
  house: <><path d="m3 10 9-7 9 7M5 9v11h14V9" /><path d="M9 20v-7h6v7" /></>,
  dice: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="16" cy="16" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  bank: <><path d="m3 8 9-5 9 5H3ZM4 21h16M6 11v6m6-6v6m6-6v6M4 18h16" /></>,
  stock: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7M17 5h4v4" /></>,
  cards: <><rect x="7" y="3" width="13" height="17" rx="2" transform="rotate(12 13 12)" /><path d="M5 7 2 19a2 2 0 0 0 2 2l8 1M11 9l3 4 3-3M14 13v3" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13M12 8C4 8 5 1 9 3c3 1 3 5 3 5Zm0 0c8 0 7-7 3-5-3 1-3 5-3 5Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  sound: <><path d="m3 9 4-1 5-4v16l-5-4-4-1V9ZM16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" /></>,
  mute: <><path d="m3 9 4-1 5-4v16l-5-4-4-1V9ZM16 9l6 6m0-6-6 6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.2 8a3 3 0 0 1 5.8 1c0 2-3 2-3 4m0 4h.01" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  reset: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>,
  fast: <><path d="m3 5 8 7-8 7V5Zm9 0 8 7-8 7V5ZM21 5v14" /></>,
  play: <path d="m8 4 12 8-12 8V4Z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  flag: <><path d="M5 22V3c5-5 9 5 15 0v11c-6 5-10-5-15 0" /></>,
  coin: <><ellipse cx="12" cy="12" rx="9" ry="9" /><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v2m0 8v2" /></>,
  bag: <><path d="m8 3 4 3 4-3-1 6c8 7 8 12-3 12S1 16 9 9L8 3ZM8 9h8" /><path d="M14 12h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3m2-7v8" /></>,
  hospital: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 10h8M12 6v8m-3 7v-4h6v4" /></>,
  check: <path d="m5 12 4 4L20 5" />,
  tree: <><path d="m12 2-7 9h3l-5 7h18l-5-7h3l-7-9ZM12 18v4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6 8 7 8-7" /></>,
  github: <><path d="M9 19c-5 2-5-3-7-3m14 6v-4c0-1 0-2-1-2 4 0 6-2 6-6 0-2-1-3-2-4 0-1 0-3-1-3l-4 2a12 12 0 0 0-5 0L5 3C4 4 4 6 4 7c-1 1-2 2-2 4 0 4 2 5 6 5-1 1-1 2-1 3v3" /></>,
};

export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name] ?? paths.house}</svg>;
}
