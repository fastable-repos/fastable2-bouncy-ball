import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GameCanvas from '../components/GameCanvas'
import { LEVELS } from '../lib/levels'
import { updateLevelProgress, loadGameData } from '../lib/storage'
import type { GamePhase, ScoreBreakdown } from '../lib/types'

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const id = parseInt(levelId ?? '1', 10)
  const level = LEVELS.find((l) => l.id === id)

  const [phase, setPhase] = useState<GamePhase>('aiming')
  const [starsCollected, setStarsCollected] = useState<boolean[]>([false, false, false])
  const [bounces, setBounces] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [finalScore, setFinalScore] = useState<ScoreBreakdown | null>(null)
  const [finalStars, setFinalStars] = useState(0)
  const [gameKey, setGameKey] = useState(0)

  const starsCollectedRef = useRef<boolean[]>([false, false, false])
  const bouncesRef = useRef(0)

  // Check access
  useEffect(() => {
    const data = loadGameData()
    if (id > data.currentUnlockedLevel) {
      navigate('/')
    }
  }, [id, navigate])

  useEffect(() => {
    if (!level) navigate('/')
  }, [level, navigate])

  const handlePhaseChange = useCallback((p: GamePhase) => {
    setPhase(p)
  }, [])

  const handleBounceUpdate = useCallback((count: number) => {
    setBounces(count)
  }, [])

  const handleStarCollect = useCallback((index: number) => {
    setStarsCollected((prev) => {
      const next = [...prev]
      next[index] = true
      return next
    })
  }, [])

  const handleTimeUpdate = useCallback((t: number) => {
    setElapsedTime(t)
  }, [])

  const handleWin = useCallback(
    (score: ScoreBreakdown, stars: number) => {
      setFinalScore(score)
      setFinalStars(stars)
      updateLevelProgress(id, score.total, stars)
    },
    [id]
  )

  const handleLose = useCallback(() => {
    setFinalScore(null)
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('aiming')
    setStarsCollected([false, false, false])
    setBounces(0)
    setElapsedTime(0)
    setFinalScore(null)
    setFinalStars(0)
    starsCollectedRef.current = [false, false, false]
    bouncesRef.current = 0
    setGameKey((k) => k + 1)
  }, [])

  const handlePause = useCallback(() => {
    if (phase === 'playing') setPhase('paused')
    else if (phase === 'paused') setPhase('playing')
  }, [phase])

  const handleNextLevel = useCallback(() => {
    if (id < LEVELS.length) navigate(`/game/${id + 1}`)
    else navigate('/')
  }, [id, navigate])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  if (!level) return null

  const starsCount = starsCollected.filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-start overflow-hidden">
      {/* HUD */}
      <div
        data-testid="hud"
        className="w-full max-w-[800px] flex items-center justify-between px-4 py-3 bg-black/40 border-b border-cyan-900/40"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-cyan-400 hover:text-cyan-200 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            ← Levels
          </button>
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'Orbitron, monospace' }}>
            Level {level.id}: {level.name}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
          <span data-testid="hud-time" className="text-cyan-300">
            ⏱ {formatTime(elapsedTime)}
          </span>
          <span data-testid="hud-bounces" className="text-purple-300">
            ↗ {bounces}/{level.maxBounces}
          </span>
          <span data-testid="hud-stars" className="text-yellow-300">
            ★ {starsCount}/3
          </span>
          <button
            data-testid="pause-btn"
            onClick={handlePause}
            disabled={phase === 'aiming' || phase === 'won' || phase === 'lost'}
            className="ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs uppercase tracking-widest transition disabled:opacity-40"
          >
            {phase === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            data-testid="restart-btn"
            onClick={handleRestart}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs uppercase tracking-widest transition"
          >
            ↺ Restart
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 flex items-center justify-center w-full max-w-[800px]">
        <GameCanvas
          level={level}
          phase={phase}
          gameKey={gameKey}
          onPhaseChange={handlePhaseChange}
          onBounceUpdate={handleBounceUpdate}
          onStarCollect={handleStarCollect}
          onTimeUpdate={handleTimeUpdate}
          onWin={handleWin}
          onLose={handleLose}
          starsCollectedRef={starsCollectedRef}
          bouncesRef={bouncesRef}
        />

        {/* Pause overlay */}
        {phase === 'paused' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-6 rounded">
            <h2
              className="text-4xl font-black text-cyan-400 tracking-widest"
              style={{ fontFamily: 'Orbitron, monospace' }}
            >
              PAUSED
            </h2>
            <div className="flex gap-4">
              <button
                onClick={handlePause}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:opacity-90 transition"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                ▶ Resume
              </button>
              <button
                data-testid="pause-restart-btn"
                onClick={handleRestart}
                className="px-6 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                ↺ Restart
              </button>
            </div>
          </div>
        )}

        {/* Win overlay */}
        {phase === 'won' && finalScore && (
          <div
            data-testid="win-screen"
            className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-5 rounded"
          >
            <h2
              className="text-4xl font-black tracking-widest"
              style={{
                fontFamily: 'Orbitron, monospace',
                color: '#00f5ff',
                textShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff',
              }}
            >
              LEVEL COMPLETE!
            </h2>
            {/* Star rating */}
            <div className="flex gap-3 text-4xl">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < finalStars ? 'text-yellow-400' : 'text-gray-600'}>
                  ★
                </span>
              ))}
            </div>
            {/* Score breakdown */}
            <div className="bg-white/10 rounded-xl p-5 w-64 space-y-2 text-sm" style={{ fontFamily: 'Orbitron, monospace' }}>
              <div className="flex justify-between text-yellow-300">
                <span>Stars Bonus</span><span>+{finalScore.starsBonus}</span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span>Bounce Efficiency</span><span>+{finalScore.bounceEfficiency}</span>
              </div>
              <div className="flex justify-between text-cyan-300">
                <span>Time Bonus</span><span>+{finalScore.timeBonus}</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between text-white font-bold text-lg">
                <span>Total Score</span>
                <span data-testid="win-score">{finalScore.total}</span>
              </div>
            </div>
            <div className="flex gap-4">
              {id < LEVELS.length && (
                <button
                  data-testid="next-level-btn"
                  onClick={handleNextLevel}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:opacity-90 transition"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  Next Level →
                </button>
              )}
              <button
                data-testid="win-level-select-btn"
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                Level Select
              </button>
            </div>
          </div>
        )}

        {/* Loss overlay */}
        {phase === 'lost' && (
          <div
            data-testid="loss-screen"
            className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-5 rounded"
          >
            <h2
              className="text-4xl font-black tracking-widest"
              style={{
                fontFamily: 'Orbitron, monospace',
                color: '#ff4444',
                textShadow: '0 0 20px #ff4444',
              }}
            >
              GAME OVER
            </h2>
            <p className="text-gray-300 text-sm" style={{ fontFamily: 'Orbitron, monospace' }}>
              {bounces > level.maxBounces ? 'Max bounces exceeded!' : 'Ball out of bounds!'}
            </p>
            <div className="flex gap-4">
              <button
                data-testid="retry-btn"
                onClick={handleRestart}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:opacity-90 transition"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                ↺ Retry
              </button>
              <button
                data-testid="loss-level-select-btn"
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                Level Select
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
