import { useRouter } from 'next/router'
import styles from '~/styles/StartPage.module.css'
import Image from 'next/image'
import { useEffect, useState } from 'react'

// Options interface
interface GameModeOption {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  comingSoon?: boolean;
}

export default function Start() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  
  // Define game modes
  const gameModes: GameModeOption[] = [
    {
      id: 'multiplayer',
      title: '',
      description: 'Create a canvas together. Caution: Someone could overpaint your work!',
      imageUrl: '/images/Multiplayer.png'
    },
    {
      id: 'singleplayer',
      title: '',
      description: 'Enjoy drawing for yourself. No hurry, you can choose the canvas size.',
      imageUrl: '/images/Singleplayer.png'
    },
    {
      id: 'battle',
      title: '',
      description: 'Pixelpocalypse, use tools to manipulate others or to paint several pixels.',
      imageUrl: '/images/Battle-mode.png',
      comingSoon: true
    }
  ]

  // Animation effect on load
  useEffect(() => {
    document.body.classList.add(styles.pageLoaded)
    
    return () => {
      document.body.classList.remove(styles.pageLoaded)
    }
  }, [])

  // Selection change
  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId)
  }

  // Start game
  const handleStartGame = () => {
    if (!selectedMode) return
    
    if (selectedMode === 'multiplayer') {
      router.push('/game')
    } else if (selectedMode === 'singleplayer') {
      router.push('/singleplayer')
    }
    // Battle mode is not available yet
  }

  return (
    <div className={styles.startPageBody}>
      <div className={styles.startContainer}>
        <div className={styles.startHeader}>
          <h1 className={styles.title}>REBASED PIXELS</h1>
          <div className={styles.subtitle}>CANVAS PAINTING GAME</div>
        </div>
        
        <div className={styles.gameDescription}>
          <p>
            Create digital pixel art - alone or together with other artists on the IOTA REBASED TESTNET.
          </p>
        </div>
        
        <div className={styles.modesContainer}>
          <h2 className={styles.modesTitle}>Choose your game mode</h2>
          
          <div className={styles.modeOptions}>
            {gameModes.map(mode => (
              <div 
                key={mode.id}
                className={`${styles.modeCard} ${selectedMode === mode.id ? styles.selected : ''} ${mode.comingSoon ? styles.comingSoon : ''}`}
                onClick={() => !mode.comingSoon && handleModeSelect(mode.id)}
              >
                <div className={styles.modeImageContainer}>
                  <div className={styles.modeImage}>
                    <img 
                      src={mode.imageUrl} 
                      alt={mode.title} 
                      className={styles.modeImg}
                    />
                  </div>
                  {mode.comingSoon && (
                    <div className={styles.comingSoonBadge}>Coming soon</div>
                  )}
                </div>
                
                <div className={styles.modeInfo}>
                  <p className={styles.modeDescription}>{mode.description}</p>
                </div>
                
                {selectedMode === mode.id && (
                  <div className={styles.selectedIndicator}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.actionButtons}>
          <button 
            className={styles.startButton}
            disabled={!selectedMode}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      </div>
      
      <footer className={styles.pageFooter}>
        From Ciga with love - powered by IOTA Rebased Testnet
      </footer>
      
      <div className={styles.backgroundEffect}></div>
    </div>
  )
} 