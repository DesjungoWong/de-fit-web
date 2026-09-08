import React from 'react'

const wrap = (children) => (
  <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
)

export const BgTitle = () => wrap(
  <>
    <defs>
      <linearGradient id="gTitle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#241534" />
        <stop offset="100%" stopColor="#0d0716" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#gTitle)" />
    {Array.from({ length: 40 }).map((_, i) => (
      <circle key={i} cx={(i * 53) % 400} cy={(i * 97) % 220} r={i % 5 === 0 ? 1.6 : 0.8} fill="#fff" opacity={0.15 + (i % 4) * 0.15} />
    ))}
    <circle cx="330" cy="60" r="34" fill="#A100FF" opacity="0.35" />
  </>
)

export const BgCampus = () => wrap(
  <>
    <defs>
      <linearGradient id="gCampus" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#aeddf5" />
        <stop offset="60%" stopColor="#dff0e4" />
        <stop offset="100%" stopColor="#bfe0b8" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#gCampus)" />
    <ellipse cx="90" cy="235" rx="70" ry="55" fill="#6fae63" />
    <rect x="82" y="150" width="16" height="90" fill="#7a5a3a" />
    <ellipse cx="300" cy="245" rx="80" ry="50" fill="#5f9d55" />
    <rect x="292" y="160" width="14" height="90" fill="#6f5232" />
    <rect x="150" y="150" width="100" height="110" fill="#d8c9ad" />
    <polygon points="140,150 260,150 200,110" fill="#9c5b4a" />
    <rect x="185" y="205" width="30" height="55" fill="#7a5a3a" />
  </>
)

export const BgCafe = () => wrap(
  <>
    <defs>
      <linearGradient id="gCafe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6b4632" />
        <stop offset="100%" stopColor="#3c2618" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#gCafe)" />
    <rect x="30" y="40" width="90" height="70" rx="4" fill="#f2c879" opacity="0.85" />
    <rect x="150" y="40" width="90" height="70" rx="4" fill="#8a5a33" opacity="0.6" />
    <rect x="0" y="200" width="400" height="100" fill="#2a1a10" />
    <circle cx="330" cy="150" r="26" fill="#f2c879" opacity="0.5" />
    <rect x="60" y="215" width="90" height="10" rx="3" fill="#5a3b23" />
  </>
)

export const BgLibrary = () => wrap(
  <>
    <rect width="400" height="300" fill="#2c2418" />
    {Array.from({ length: 5 }).map((_, i) => (
      <rect key={i} x={20 + i * 75} y="30" width="60" height="150" fill="#4a3a24" />
    ))}
    {Array.from({ length: 5 }).map((_, i) => (
      <g key={'b' + i}>
        {Array.from({ length: 6 }).map((_, j) => (
          <rect key={j} x={25 + i * 75 + j * 8} y={40 + (j % 3) * 4} width="6" height="30" fill={['#9c3b3b', '#3b6b9c', '#8a7b3b', '#4a8a6b', '#7a3b8a'][j % 5]} />
        ))}
      </g>
    ))}
    <rect x="0" y="190" width="400" height="110" fill="#3a2e1c" />
    <rect x="120" y="210" width="160" height="14" rx="3" fill="#5c4a2e" />
  </>
)

export const BgRain = () => wrap(
  <>
    <defs>
      <linearGradient id="gRain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a4656" />
        <stop offset="100%" stopColor="#1c232c" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#gRain)" />
    {Array.from({ length: 45 }).map((_, i) => (
      <line key={i} x1={(i * 37) % 400} y1={(i * 19) % 300} x2={(i * 37) % 400 - 10} y2={(i * 19) % 300 + 26} stroke="#bcd2e6" strokeWidth="1.2" opacity="0.4" />
    ))}
    <rect x="0" y="230" width="400" height="70" fill="#141a20" />
  </>
)

export const BgFestival = () => wrap(
  <>
    <defs>
      <linearGradient id="gFest" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a1d3d" />
        <stop offset="100%" stopColor="#150e22" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#gFest)" />
    {Array.from({ length: 10 }).map((_, i) => (
      <circle key={i} cx={20 + i * 40} cy={40 + (i % 2) * 14} r="5" fill="#ffd479" opacity="0.9" />
    ))}
    <rect x="0" y="220" width="400" height="80" fill="#20152e" />
    <rect x="40" y="150" width="70" height="70" fill="#4a3560" opacity="0.7" />
    <rect x="290" y="150" width="70" height="70" fill="#4a3560" opacity="0.7" />
  </>
)

export const BgDusk = () => wrap(
  <>
    <defs>
      <linearGradient id="gDusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8956b" />
        <stop offset="55%" stopColor="#c96b8a" />
        <stop offset="100%" stopColor="#3d2b52" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#gDusk)" />
    <circle cx="320" cy="70" r="30" fill="#fff2d6" opacity="0.9" />
    <rect x="0" y="235" width="400" height="65" fill="#241a30" />
  </>
)

export const backgrounds = {
  title: BgTitle,
  campus: BgCampus,
  cafe: BgCafe,
  library: BgLibrary,
  rain: BgRain,
  festival: BgFestival,
  dusk: BgDusk,
}
