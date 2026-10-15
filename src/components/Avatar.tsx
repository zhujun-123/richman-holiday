import { CHARACTERS } from '../game/data';

export function Avatar({ character, size = 64 }: { character: number; size?: number }) {
  const color = CHARACTERS[character].color;
  return <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="40" r="39" fill={color} fillOpacity=".15" />
    <path d="M12 81c0-21 10-29 28-29s28 8 28 29" fill={color} />
    <path d="m31 55 9 12 9-12" fill="#fff9e9" />
    <ellipse cx="40" cy="34" rx="22" ry="24" fill={character === 3 ? '#e8b98e' : '#f4c8a2'} />
    <ellipse cx="18" cy="38" rx="4" ry="6" fill="#edbb96" /><ellipse cx="62" cy="38" rx="4" ry="6" fill="#edbb96" />
    {character === 0 ? <><path d="M17 34C12 4 52-2 62 22l1 14-10-14-7 6-3-9-12 12-8-3-6 6Z" fill="#704b37" /><path d="M17 35 13 60l12-7V33M58 33l9 24-13-3V32" fill="#704b37" /><path d="M16 23C16 5 55 3 62 24Z" fill="#e7b86f" /><path d="M9 24c0-7 58-7 62 0-3 8-59 8-62 0" fill="#f4cf8b" /><path d="M22 17c9-3 23-3 34 0v5H22Z" fill="#ba7c57" /></> : null}
    {character === 1 ? <><path d="M17 32C10 9 27 4 39 8c19-10 32 5 23 29l-9-17-10 8-4-9-16 15-6-2Z" fill="#513c32" /><path d="M20 16c9-17 35-12 39 0l-39 4" fill="#659bbd" /><path d="M36 17c23-8 40 1 36 8-4 6-23 1-36-3Z" fill="#507f9a" /></> : null}
    {character === 2 ? <><path d="M17 37C5 10 27 0 43 7c26-3 30 17 20 40l-6-14-4-17-12 12-3-9-16 14v13l-9 7Z" fill="#4c3b49" /><circle cx="62" cy="18" r="10" fill="#4c3b49" /><path d="m55 17 11 3" stroke="#b79dc7" strokeWidth="4" /></> : null}
    {character === 3 ? <><path d="M17 30C15 6 65 5 63 33l-8-14-11 4-15-2-12 9Z" fill="#777b68" /><path d="M12 19c6-13 48-12 55 0l-2 7H14Z" fill="#6f9478" /><path d="M10 26h59" stroke="#52765c" strokeWidth="6" strokeLinecap="round" /></> : null}
    <path d="M28 37h3m18 0h3" stroke="#4e3c33" strokeWidth="3.5" strokeLinecap="round" />
    <ellipse cx="26" cy="44" rx="4" ry="2.5" fill="#e89d8f" fillOpacity=".7" /><ellipse cx="54" cy="44" rx="4" ry="2.5" fill="#e89d8f" fillOpacity=".7" />
    {character === 2 || character === 3 ? <g stroke="#5a554e" strokeWidth="1.7" fill="none"><circle cx="29" cy="38" r="7" /><circle cx="51" cy="38" r="7" /><path d="M36 38h8" /></g> : null}
    <path d="M35 47q5 5 10 0" fill="none" stroke="#b97561" strokeWidth="2" strokeLinecap="round" />
    {character === 3 ? <path d="M30 48q10-9 20 0l-10-2-10 2Z" fill="#7b7c6b" /> : null}
  </svg>;
}
