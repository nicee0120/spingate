import { useEffect, useState, useRef } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

const REWARDS = [
  { label: '1 ETH', emoji: '🏆', color: '#FFD700', probability: 1 },
  { label: '100 USDC', emoji: '💵', color: '#4CAF50', probability: 3 },
  { label: '10 Diamond', emoji: '💎', color: '#00BCD4', probability: 5 },
  { label: 'Whitelist', emoji: '🎟️', color: '#9C27B0', probability: 7 },
  { label: '50 XP', emoji: '⭐', color: '#FF9800', probability: 10 },
  { label: '100 Points', emoji: '🚀', color: '#2196F3', probability: 10 },
  { label: 'VIP Pass', emoji: '👑', color: '#E91E63', probability: 8 },
  { label: 'Mystery Box', emoji: '🎁', color: '#795548', probability: 8 },
  { label: '5 USDC', emoji: '💰', color: '#8BC34A', probability: 13 },
  { label: 'Try Again', emoji: '🔄', color: '#607D8B', probability: 35 },
]

const TOTAL_WEIGHT = REWARDS.reduce((a, b) => a + b.probability, 0)

function getRandomReward() {
  let rand = Math.random() * TOTAL_WEIGHT
  for (const reward of REWARDS) {
    rand -= reward.probability
    if (rand <= 0) return reward
  }
  return REWARDS[REWARDS.length - 1]
}

const SEGMENT_ANGLE = 360 / REWARDS.length

export default function App() {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<typeof REWARDS[0] | null>(null)
  const [spinCount, setSpinCount] = useState(0)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const wheelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      await sdk.actions.ready()
      setIsReady(true)
    }
    init()
  }, [])

  async function connectWallet() {
    try {
      const provider = await sdk.wallet.getEthereumProvider()
      if (!provider) return
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
      setAccount(accounts[0])
    } catch (e) {
      console.error(e)
    }
  }

  async function sendSpinTx(rewardLabel: string) {
    try {
      const provider = await sdk.wallet.getEthereumProvider()
      if (!provider || !account) return
      const msg = `SpinGate: ${rewardLabel}`
      const hex = '0x' + Array.from(new TextEncoder().encode(msg))
        .map(b => b.toString(16).padStart(2, '0')).join('')
      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: account, value: '0x0', data: hex, chainId: '0x2105' }]
      }) as string
      setTxHash(tx)
    } catch (e) {
      console.error(e)
    }
  }

  function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    setTxHash(null)

    const reward = getRandomReward()
    const rewardIndex = REWARDS.indexOf(reward)
    const targetAngle = 360 - (rewardIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)
    const spins = 5 + Math.floor(Math.random() * 5)
    const finalRotation = rotation + spins * 360 + targetAngle - (rotation % 360)

    setRotation(finalRotation)

    setTimeout(async () => {
      setResult(reward)
      setSpinCount(c => c + 1)
      setSpinning(false)
      if (account) await sendSpinTx(reward.label)
    }, 4000)
  }

  const canvasSize = 300
  const cx = canvasSize / 2
  const cy = canvasSize / 2
  const r = canvasSize / 2 - 4

  function polarToCartesian(angle: number, radius: number) {
    const rad = (angle - 90) * (Math.PI / 180)
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function describeArc(startAngle: number, endAngle: number) {
    const start = polarToCartesian(endAngle, r)
    const end = polarToCartesian(startAngle, r)
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1229 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1rem',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #c49e47, #e8c97a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
        }}>SpinGate</h1>
        <p style={{ fontSize: '12px', color: 'rgba(232,224,204,0.5)', marginTop: '2px' }}>
          Spin to win · Onchain on Base
        </p>
      </div>

      {/* Wallet */}
      <div style={{ marginBottom: '0.75rem' }}>
        {account ? (
          <div style={{
            padding: '4px 12px', borderRadius: '20px',
            border: '1px solid rgba(196,158,71,0.4)',
            fontSize: '11px', color: '#c49e47', fontFamily: 'monospace',
          }}>
            {account.slice(0, 6)}...{account.slice(-4)} ✓
          </div>
        ) : (
          <button onClick={connectWallet} style={{
            padding: '6px 16px', borderRadius: '20px', border: 'none',
            background: 'linear-gradient(135deg, #c49e47, #e8c97a)',
            color: '#0a0e1a', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          }}>
            Connect Wallet
          </button>
        )}
      </div>

      {/* Wheel */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        {/* Pointer */}
        <div style={{
          position: 'absolute', top: '-8px', left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '20px solid #e8c97a',
          zIndex: 10,
        }} />

        <div
          ref={wheelRef}
          style={{
            width: `${canvasSize}px`,
            height: `${canvasSize}px`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            borderRadius: '50%',
            boxShadow: '0 0 30px rgba(196,158,71,0.3)',
          }}
        >
          <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
            {REWARDS.map((reward, i) => {
              const startAngle = i * SEGMENT_ANGLE
              const endAngle = (i + 1) * SEGMENT_ANGLE
              const midAngle = startAngle + SEGMENT_ANGLE / 2
              const textPos = polarToCartesian(midAngle, r * 0.65)
              const emojiPos = polarToCartesian(midAngle, r * 0.82)
              return (
                <g key={i}>
                  <path
                    d={describeArc(startAngle, endAngle)}
                    fill={reward.color}
                    stroke="#0a0e1a"
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                    fill="white"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {reward.label}
                  </text>
                  <text
                    x={emojiPos.x}
                    y={emojiPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngle}, ${emojiPos.x}, ${emojiPos.y})`}
                    fontSize="14"
                  >
                    {reward.emoji}
                  </text>
                </g>
              )
            })}
            <circle cx={cx} cy={cy} r="18" fill="#0a0e1a" stroke="#c49e47" strokeWidth="3" />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="16">⬡</text>
          </svg>
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={spin}
        disabled={spinning}
        style={{
          padding: '12px 40px',
          borderRadius: '30px',
          border: 'none',
          background: spinning
            ? 'rgba(196,158,71,0.2)'
            : 'linear-gradient(135deg, #c49e47, #e8c97a)',
          color: spinning ? 'rgba(196,158,71,0.4)' : '#0a0e1a',
          fontSize: '16px',
          fontWeight: '800',
          cursor: spinning ? 'not-allowed' : 'pointer',
          letterSpacing: '0.5px',
          marginBottom: '0.75rem',
        }}
      >
        {spinning ? 'Spinning...' : '🎰 SPIN'}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${result.color}`,
          borderRadius: '16px',
          padding: '12px 24px',
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease',
          marginBottom: '0.5rem',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>{result.emoji}</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: result.color }}>
            {result.label}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(232,224,204,0.5)', marginTop: '2px' }}>
            {result.label === 'Try Again' ? 'Better luck next time!' : 'Congratulations! 🎉'}
          </div>
          {txHash && (
            <div style={{ fontSize: '10px', color: '#c49e47', marginTop: '6px', fontFamily: 'monospace' }}>
              TX: {txHash.slice(0, 16)}...
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'flex', gap: '16px',
        fontSize: '11px', color: 'rgba(232,224,204,0.4)',
      }}>
        <span>Spins: <strong style={{ color: '#c49e47' }}>{spinCount}</strong></span>
        <span>Chain: <strong style={{ color: '#c49e47' }}>Base</strong></span>
      </div>


      <div style={{
        marginTop: '0.75rem',
        padding: '8px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(196,158,71,0.15)',
        maxWidth: '300px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '10px', color: 'rgba(232,224,204,0.35)', lineHeight: '1.5' }}>
          ⚠️ All rewards are virtual and for entertainment purposes only. No real-world value is implied. Every spin is recorded as a transaction on Base network.
        </p>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
<div style={{
  marginTop: '0.75rem',
  padding: '8px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(196,158,71,0.15)',
  maxWidth: '300px',
  textAlign: 'center',
}}>
  <p style={{ fontSize: '10px', color: 'rgba(232,224,204,0.35)', lineHeight: '1.5' }}>
    ⚠️ All rewards are virtual and for entertainment purposes only. No real-world value is implied. Every spin is recorded as a transaction on Base network.
  </p>
</div>
