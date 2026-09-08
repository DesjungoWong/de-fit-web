import React from 'react'

// Stylized flat-vector bust portrait of Wren, expression-driven via mouth/brow/blush paths.
export function Wren({ expression = 'neutral' }) {
  const brows = {
    neutral: <path d="M108 108 Q122 100 136 107 M164 107 Q178 100 192 108" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    smile: <path d="M108 106 Q122 99 136 105 M164 105 Q178 99 192 106" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    laugh: <path d="M108 104 Q122 96 136 103 M164 103 Q178 96 192 104" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    blush: <path d="M108 107 Q122 100 136 106 M164 106 Q178 100 192 107" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    soft: <path d="M108 109 Q122 103 136 108 M164 108 Q178 103 192 109" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    surprised: <path d="M108 100 Q122 90 136 99 M164 99 Q178 90 192 100" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    firm: <path d="M106 104 L138 108 M162 108 L194 104" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
    hurt: <path d="M108 110 Q122 106 136 111 M164 111 Q178 106 192 110" stroke="#4a3524" strokeWidth="4" fill="none" strokeLinecap="round" />,
  }
  const eyes = {
    neutral: <><ellipse cx="122" cy="122" rx="7" ry="8" fill="#3a2a1e" /><ellipse cx="178" cy="122" rx="7" ry="8" fill="#3a2a1e" /></>,
    smile: <><path d="M114 122 Q122 116 130 122" stroke="#3a2a1e" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M170 122 Q178 116 186 122" stroke="#3a2a1e" strokeWidth="4" fill="none" strokeLinecap="round" /></>,
    laugh: <><path d="M113 121 Q122 113 131 121" stroke="#3a2a1e" strokeWidth="4.5" fill="none" strokeLinecap="round" /><path d="M169 121 Q178 113 187 121" stroke="#3a2a1e" strokeWidth="4.5" fill="none" strokeLinecap="round" /></>,
    blush: <><ellipse cx="122" cy="122" rx="6.5" ry="7.5" fill="#3a2a1e" /><ellipse cx="178" cy="122" rx="6.5" ry="7.5" fill="#3a2a1e" /></>,
    soft: <><ellipse cx="122" cy="123" rx="6" ry="6.5" fill="#3a2a1e" /><ellipse cx="178" cy="123" rx="6" ry="6.5" fill="#3a2a1e" /></>,
    surprised: <><ellipse cx="122" cy="121" rx="8.5" ry="9.5" fill="#3a2a1e" /><ellipse cx="178" cy="121" rx="8.5" ry="9.5" fill="#3a2a1e" /></>,
    firm: <><ellipse cx="122" cy="122" rx="6.5" ry="7" fill="#3a2a1e" /><ellipse cx="178" cy="122" rx="6.5" ry="7" fill="#3a2a1e" /></>,
    hurt: <><ellipse cx="122" cy="123" rx="6" ry="7" fill="#3a2a1e" /><ellipse cx="178" cy="123" rx="6" ry="7" fill="#3a2a1e" /></>,
  }
  const mouths = {
    neutral: <path d="M138 158 Q150 162 162 158" stroke="#8a4a4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
    smile: <path d="M136 156 Q150 170 164 156" stroke="#8a4a4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
    laugh: <path d="M132 154 Q150 178 168 154" stroke="#8a4a4a" strokeWidth="4" fill="#5a2a2a" strokeLinecap="round" />,
    blush: <path d="M138 157 Q150 168 162 157" stroke="#8a4a4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
    soft: <path d="M140 159 Q150 164 160 159" stroke="#8a4a4a" strokeWidth="3.2" fill="none" strokeLinecap="round" />,
    surprised: <ellipse cx="150" cy="162" rx="7" ry="9" fill="#5a2a2a" />,
    firm: <path d="M138 160 L162 160" stroke="#8a4a4a" strokeWidth="3.5" strokeLinecap="round" />,
    hurt: <path d="M138 162 Q150 158 162 162" stroke="#8a4a4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
  }
  const showBlush = expression === 'blush' || expression === 'soft' || expression === 'laugh'

  return (
    <svg viewBox="0 0 300 320" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* hair back */}
      <path d="M80 130 Q70 250 100 300 L200 300 Q230 250 220 130 Q220 60 150 55 Q80 60 80 130Z" fill="#2e2118" />
      {/* neck + shoulders */}
      <rect x="130" y="185" width="40" height="40" fill="#e8b98f" />
      <path d="M60 320 Q80 250 150 250 Q220 250 240 320Z" fill="#4a5a72" />
      {/* face */}
      <ellipse cx="150" cy="145" rx="62" ry="72" fill="#f0c39a" />
      {/* hair front / fringe */}
      <path d="M88 118 Q95 70 150 62 Q205 70 212 118 Q205 95 150 92 Q95 95 88 118Z" fill="#2e2118" />
      <path d="M86 110 Q80 150 88 175 Q78 140 86 110Z" fill="#2e2118" />
      <path d="M214 110 Q220 150 212 175 Q222 140 214 110Z" fill="#2e2118" />
      {eyes[expression] || eyes.neutral}
      {brows[expression] || brows.neutral}
      <path d="M150 128 L146 148 L154 148" stroke="#d99a70" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {mouths[expression] || mouths.neutral}
      {showBlush && <><ellipse cx="108" cy="148" rx="10" ry="6" fill="#e88a8a" opacity="0.45" /><ellipse cx="192" cy="148" rx="10" ry="6" fill="#e88a8a" opacity="0.45" /></>}
    </svg>
  )
}
