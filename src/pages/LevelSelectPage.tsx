import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LEVELS } from '../lib/levels'
import { loadGameData } from '../lib/storage'
import type { GameData } from '../lib/types'

export default function LevelSelectPage() {
  const navigate = useNavigate()
  const [gameData, setGameData] = useState<GameData | null>(null)

  useEffect(() => {
    try {
      setGameData(loadGameData())
    } catch (err) {
      console.error('Failed to load game data:', err)
    }
  }, [])

  const handleLevelClick = (levelId: number) => {
    if (!gameData) return
    if (levelId <= gameData.currentUnlockedLevel) {
      navigate(`/game/${levelId}`)
    }
  }

  const getLevelProgress = (levelId: number) => {
    return gameData?.levels.find((l) => l.levelId === levelId)
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-start py-10 px-4">
      {/* Title */}
      <div className="mb-10 text-center">
        <h1
          className="text-5xl font-black tracking-widest mb-2"
          data-testid="game-title"
          style={{
            fontFamily: 'Orbitron, monospace',
            color: '#00f5ff',
            textShadow: '0 0 20px #00f5ff, 0 0 60px #00f5ff80',
          }}
        >
          BOUNCY BALL
        </h1>
        <p className="text-cyan-700 text-sm tracking-widest uppercase" style={{ fontFamily: 'Orbitron, monospace' }}>
          Select a Level
        </p>
      </div>

      {/* Level grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 w-full max-w-2xl" data-testid="level-grid">
        {LEVELS.map((level) => {
          const progress = getLevelProgress(level.id)
          const unlocked = gameData ? level.id <= gameData.currentUnlockedLevel : false
          const locked = !unlocked

          return (
            <button
              key={level.id}
              data-testid={`level-card-${level.id}`}
              onClick={() => handleLevelClick(level.id)}
              disabled={locked}
              className={[
                'relative rounded-2xl p-5 text-left transition-all duration-200 border',
                locked
                  ? 'bg-black/30 border-gray-700/40 opacity-50 cursor-not-allowed'
                  : 'bg-white/5 border-cyan-900/60 hover:border-cyan-500/60 hover:bg-white/10 cursor-pointer hover:scale-105',
              ].join(' ')}
            >
              {/* Lock overlay */}
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                  <span className="text-3xl" data-testid={`level-locked-${level.id}`}>🔒</span>
                </div>
              )}

              {/* Level icon */}
              <div className="text-3xl mb-3 select-none">
                {['🚀', '🧱', '💥', '🌀', '⚡'][level.id - 1]}
              </div>

              {/* Level number & name */}
              <div
                className="text-xs text-cyan-500 font-bold tracking-widest mb-1"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                LEVEL {level.id}
              </div>
              <div
                className="text-sm text-white font-bold mb-3"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                {level.name}
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={
                      progress?.bestStars !== null && progress?.bestStars !== undefined && i < progress.bestStars
                        ? 'text-yellow-400 text-lg'
                        : 'text-gray-600 text-lg'
                    }
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Best score */}
              <div
                data-testid={`best-score-${level.id}`}
                className="text-xs font-bold"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                {progress?.bestScore !== null && progress?.bestScore !== undefined ? (
                  <span className="text-cyan-400">Best: {progress.bestScore}</span>
                ) : (
                  <span className="text-gray-500">No Score Yet</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer hint */}
      <p className="mt-10 text-gray-600 text-xs" style={{ fontFamily: 'Orbitron, monospace' }}>
        Complete levels to unlock the next challenge
      </p>
    </div>
  )
}
