import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import styles from '~/styles/PixelGame.module.css'

// Konstanten für den Singleplayer-Modus
const DEFAULT_PIXEL_SIZE = 10
const MIN_CANVAS_SIZE = 300
const MAX_CANVAS_SIZE = 2000
const DEFAULT_CANVAS_SIZE = 800

interface PixelData {
  x: number;
  y: number;
  color: string;
}

export default function Singleplayer() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE)
  const [pixelSize, setPixelSize] = useState(DEFAULT_PIXEL_SIZE)
  const [selectedColor, setSelectedColor] = useState('#00ffcc')
  const [pixels, setPixels] = useState<PixelData[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [resizeMode, setResizeMode] = useState(false)
  const [startGame, setStartGame] = useState(false)

  // Zurück zur Startseite
  const handleBack = () => {
    router.push('/start')
  }

  // Zeichne das Canvas neu, wenn sich die Größe oder Pixel ändern
  useEffect(() => {
    if (!canvasRef.current || !startGame) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Hintergrund schwarz
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasSize, canvasSize)
    
    // Graue Pixel-Raster
    for (let x = 0; x < canvasSize; x += pixelSize) {
      for (let y = 0; y < canvasSize; y += pixelSize) {
        ctx.fillStyle = '#111111'
        ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1)
      }
    }
    
    // Alle Pixel zeichnen
    console.log(`Zeichne ${pixels.length} Pixel`)
    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color
      ctx.fillRect(pixel.x, pixel.y, pixelSize - 1, pixelSize - 1)
    })
  }, [pixels, canvasSize, pixelSize, startGame])

  // Resize-Event für den Canvas
  const handleResizeStart = () => {
    setResizeMode(true)
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizeMode) return
    
    // Größe auf Mausposition anpassen, in 50er Schritten
    const newSize = Math.min(
      MAX_CANVAS_SIZE, 
      Math.max(
        MIN_CANVAS_SIZE, 
        Math.floor(Math.max(e.clientX, e.clientY) / 50) * 50
      )
    )
    
    setCanvasSize(newSize)
    
    // Pixel-Größe anpassen, je nach Canvas-Größe
    if (newSize <= 500) {
      setPixelSize(10)
    } else if (newSize <= 1000) {
      setPixelSize(15)
    } else if (newSize <= 1500) {
      setPixelSize(20)
    } else {
      setPixelSize(25)
    }
  }

  const handleResizeEnd = () => {
    setResizeMode(false)
    setStartGame(true)
  }

  // Maus-/Touch-Events für das Zeichnen
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!startGame || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Auf Raster ausrichten
    const pixelX = Math.floor(x / pixelSize) * pixelSize
    const pixelY = Math.floor(y / pixelSize) * pixelSize
    
    if (pixelX < 0 || pixelY < 0 || pixelX >= canvasSize || pixelY >= canvasSize) {
      return
    }
    
    // Prüfen, ob an dieser Position bereits ein Pixel existiert
    const existingPixelIndex = pixels.findIndex(p => p.x === pixelX && p.y === pixelY)
    
    if (existingPixelIndex >= 0) {
      // Pixel aktualisieren
      const updatedPixels = [...pixels]
      updatedPixels[existingPixelIndex].color = selectedColor
      setPixels(updatedPixels)
    } else {
      // Neues Pixel hinzufügen
      setPixels([...pixels, { x: pixelX, y: pixelY, color: selectedColor }])
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!startGame) return
    setIsDragging(true)
    handleCanvasClick(e)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleCanvasClick(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Farbänderung verfolgen
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(e.target.value)
  }

  // Löschen aller Pixel
  const handleClearCanvas = () => {
    setPixels([])
  }

  return (
    <div className={styles.pageBody}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>REBASED PIXELS</div>
          <div className={styles.headerButtons}>
            <button onClick={handleBack} className={styles.backButton}>
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className={styles.mainCard}>
        <div className={styles.gameInfo}>
          <h2>Singleplayer Mode</h2>
          <p>Draw freely without blockchain transactions. Pixels are stored locally only.</p>
        </div>
        
        {!startGame ? (
          <div className={styles.setupContainer}>
            <h3>Choose canvas size</h3>
            <p>Drag with your mouse to adjust the canvas size.</p>
            
            <div 
              className={styles.canvasSizeDemo}
              style={{ 
                width: `${canvasSize}px`, 
                height: `${canvasSize}px`,
                cursor: resizeMode ? 'nwse-resize' : 'pointer'
              }}
              onMouseDown={handleResizeStart}
              onMouseMove={handleResizeMove}
              onMouseUp={handleResizeEnd}
              onMouseLeave={handleResizeEnd}
            >
              <div className={styles.canvasSizeInfo}>
                {canvasSize}×{canvasSize} Pixels
                <div className={styles.pixelSizeInfo}>Pixel size: {pixelSize}px</div>
              </div>
            </div>
            
            <button 
              className={styles.startButton}
              onClick={() => setStartGame(true)}
            >
              Start
            </button>
          </div>
        ) : (
          <>
            <div className={styles.controlsContainer}>
              <div>
                <label htmlFor="colorPicker">Choose color: </label>
                <input 
                  type="color" 
                  id="colorPicker" 
                  className={styles.colorPicker} 
                  defaultValue={selectedColor}
                  onChange={handleColorChange}
                />
              </div>
              
              <button 
                className={styles.clearButton}
                onClick={handleClearCanvas}
              >
                Clear canvas
              </button>
            </div>

            <div className={styles.canvasWrapper}>
              <canvas
                ref={canvasRef}
                width={canvasSize}
                height={canvasSize}
                className={styles.pixelCanvas}
                style={{ 
                  cursor: 'crosshair',
                  imageRendering: 'pixelated'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </>
        )}
      </div>

      <footer className={styles.pageFooter}>
        From Ciga with love - powered by IOTA Rebased Testnet
      </footer>
    </div>
  )
} 