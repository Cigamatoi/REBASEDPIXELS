import { ConnectButton, useCurrentAccount, useCurrentWallet, useDisconnectWallet, useSignAndExecuteTransaction, useWallets } from '@iota/dapp-kit'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Transaction } from '@iota/iota-sdk/transactions'
import { bcs } from '@iota/iota-sdk/bcs'
import axios from 'axios'

import { truncateAddress } from '~/helpers'
import { useTranslation } from '~/lib/i18n'
import styles from '~/styles/PixelGame.module.css'

// Konstanten für Canvas
const PIXEL_SIZE = 10
const GRID_SIZE = 1000

interface PixelData {
  x: number;
  y: number;
  color: string;
}

// TypeScript-Definition für Window-Erweiterung
declare global {
  interface Window {
    drawPixelDirectly?: (x: number, y: number, color: string) => boolean;
  }
}

export default function Home() {
  const { t } = useTranslation('home')
  const wallets = useWallets()
  const account = useCurrentAccount()
  const { currentWallet, connectionStatus } = useCurrentWallet()
  const { mutate: disconnect } = useDisconnectWallet()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#00ffcc')
  const [loadedPixels, setLoadedPixels] = useState<PixelData[]>([])
  const [canvasInitialized, setCanvasInitialized] = useState(false)

  // Lade die Pixel-Daten vom Server
  useEffect(() => {
    const fetchPixels = async () => {
      try {
        const response = await axios.get('/api/pixels')
        console.log('Pixel-Daten geladen:', response.data)
        setLoadedPixels(response.data.pixels || [])
      } catch (error) {
        console.error('Fehler beim Laden der Pixel:', error)
      }
    }

    fetchPixels()
  }, [])

  // Funktion zum Neuladen aller Pixel 
  const reloadCanvas = async () => {
    try {
      console.log('Lade Canvas neu...')
      const response = await axios.get('/api/pixels')
      setLoadedPixels(response.data.pixels || [])
      console.log(`${response.data.pixels?.length || 0} Pixel geladen`)
    } catch (error) {
      console.error('Fehler beim Neuladen der Pixel:', error)
    }
  }

  // Canvas initialisieren
  useEffect(() => {
    console.log('Canvas-Initialisierung startet')
    const canvas = canvasRef.current
    if (!canvas) {
      console.error('Canvas nicht gefunden')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Canvas-Context nicht verfügbar')
      return
    }

    console.log('Canvas und Context wurden initialisiert')

    // Funktion zum Zeichnen eines Pixels
    function drawPixel(x: number, y: number, color: string) {
      if (!ctx || !canvas) return;
      
      // Pixel mit der gewählten Farbe zeichnen
      ctx.fillStyle = color;
      ctx.fillRect(x, y, PIXEL_SIZE - 2, PIXEL_SIZE - 2);
      
      // Force rendering
      canvas.style.opacity = '0.99';
      setTimeout(() => {
        if (canvas) {
          canvas.style.opacity = '1';
        }
      }, 0);
      
      console.log(`Pixel gezeichnet an (${x}, ${y}) mit Farbe ${color}`);
    }

    // Funktion zum Initialisieren des Canvas
    function initCanvas() {
      if (!ctx || !canvas) return;
      
      // Hintergrund schwarz machen
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Graue Pixel-Muster zeichnen
      for (let x = 0; x < GRID_SIZE; x += PIXEL_SIZE) {
        for (let y = 0; y < GRID_SIZE; y += PIXEL_SIZE) {
          ctx.fillStyle = '#111111';
          ctx.fillRect(x, y, PIXEL_SIZE - 2, PIXEL_SIZE - 2);
        }
      }
    }
    
    // Canvas initialisieren
    initCanvas();
    
    // Geladene Pixel zeichnen
    if (loadedPixels && loadedPixels.length > 0) {
      console.log(`Zeichne ${loadedPixels.length} gespeicherte Pixel`);
      loadedPixels.forEach(pixel => {
        drawPixel(pixel.x, pixel.y, pixel.color);
      });
    }
    
    // Canvas-Click-Handler
    function handleCanvasClick(e: MouseEvent) {
      if (!ctx || !canvas) return;
      
      // Nur fortfahren, wenn Wallet verbunden ist
      if (connectionStatus !== 'connected') {
        console.log('Wallet nicht verbunden! Bitte zuerst das Wallet verbinden.');
        return;
      }
      
      // Position im Canvas berechnen
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Auf Pixel-Raster ausrichten
      const pixelX = Math.floor(x / PIXEL_SIZE) * PIXEL_SIZE;
      const pixelY = Math.floor(y / PIXEL_SIZE) * PIXEL_SIZE;
      
      // Farbe aus dem Farbwähler holen
      const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
      const color = colorPicker?.value || selectedColor;
      
      console.log(`Klick erkannt: Position (${pixelX}, ${pixelY}) mit Farbe ${color}`);
      
      // Speichere Werte für spätere Verwendung
      const pixelInfo = { x: pixelX, y: pixelY, color: color };
      
      // Wichtig: Kein direktes Zeichnen mehr hier!
      // Erst nach erfolgreicher Transaktion zeichnen
      
      // Transaktion senden
      if (!isTransactionInProgress) {
        console.log('Transaktion wird gestartet...');
        setIsTransactionInProgress(true);
        
        try {
          // Transaktion erstellen und senden
          const tx = new Transaction();
          
          signAndExecuteTransaction(
            { transaction: tx },
            {
              onSuccess: (data) => {
                console.log('Transaktion erfolgreich:', data);
                
                // Bei erfolgreicher Transaktion auf dem Server speichern
                savePixel(pixelInfo.x, pixelInfo.y, pixelInfo.color)
                  .then(() => {
                    console.log('Pixel auf Server gespeichert nach erfolgreicher Transaktion');
                    
                    // WICHTIG: Canvas komplett neu laden
                    reloadCanvas()
                      .then(() => console.log('Canvas neu geladen nach Transaktion'))
                      .catch(err => console.error('Fehler beim Neu-Laden des Canvas:', err));
                    
                    setIsTransactionInProgress(false);
                  })
                  .catch(err => {
                    console.error('Fehler beim Speichern nach Transaktion:', err);
                    setIsTransactionInProgress(false);
                  });
              },
              onError: (error) => {
                console.error('Transaktionsfehler:', error);
                setIsTransactionInProgress(false);
              }
            }
          );
        } catch (error) {
          console.error('Fehler beim Erstellen der Transaktion:', error);
          setIsTransactionInProgress(false);
        }
        
        // Sicherheits-Timeout
        setTimeout(() => {
          if (isTransactionInProgress) {
            setIsTransactionInProgress(false);
            console.log('Timeout: Transaktionsstatus zurückgesetzt');
          }
        }, 15000);
      } else {
        console.log('Eine Transaktion läuft bereits...');
      }
    }
    
    // Event-Listener für Klicks hinzufügen
    canvas.addEventListener('click', handleCanvasClick);
    console.log('Click-Event-Listener wurde hinzugefügt');
    
    // Zum Testen ein rotes Pixel zeichnen
    drawPixel(50, 50, '#FF0000');
    
    // Aufräumen
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [loadedPixels, selectedColor, connectionStatus, isTransactionInProgress]);
  
  // Speichert ein Pixel auf dem Server
  const savePixel = async (x: number, y: number, color: string) => {
    try {
      const response = await axios.post('/api/pixels', { x, y, color })
      console.log('API: Pixel gespeichert:', response.data)
      return response.data
    } catch (error) {
      console.error('API: Fehler beim Speichern des Pixels:', error)
      throw error
    }
  }
  
  // Farbänderung verfolgen
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(e.target.value)
  }

  return (
    <div className={styles.pageBody}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>REBASED PIXELS</div>
          <div className={styles.headerButtons}>
            {connectionStatus === 'connected' ? (
              <div className={styles.connectedInfo}>
                <span>{account ? truncateAddress(account.address) : ''}</span>
                <button onClick={() => disconnect()} className={styles.disconnectButton}>
                  {t('disconnect')}
                </button>
              </div>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </header>

      <div className={styles.mainCard}>
        <div className={styles.walletCard}>
          {connectionStatus === 'connected' ? (
            <>
              <div>Farbe wählen:</div>
              <input 
                type="color" 
                id="colorPicker" 
                className={styles.colorPicker} 
                defaultValue={selectedColor}
                onChange={handleColorChange}
              />
              {isTransactionInProgress && (
                <div className={styles.transactionStatus}>Pixel-Transaktion wird bestätigt...</div>
              )}
            </>
          ) : (
            <div>Verbinde dein Wallet</div>
          )}
          <div className={styles.statsInfo}>
            Gezeichnete Pixel: {loadedPixels?.length || 0}
          </div>
        </div>

        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            id="pixelCanvas" 
            className={styles.pixelCanvas} 
            width={GRID_SIZE} 
            height={GRID_SIZE}
            style={{ cursor: isTransactionInProgress ? 'wait' : 'pointer' }}
          ></canvas>
        </div>
      </div>

      <footer className={styles.pageFooter}>
        From Ciga with love - powered by IOTA Rebased Testnet
      </footer>
    </div>
  )
}
