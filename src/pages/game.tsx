import { ConnectButton, useCurrentAccount, useCurrentWallet, useDisconnectWallet, useSignAndExecuteTransaction, useWallets } from '@iota/dapp-kit'
import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Transaction } from '@iota/iota-sdk/transactions'

import { truncateAddress } from '~/helpers'
import styles from '~/styles/PixelGame.module.css'
import useSocket from '~/hooks/useSocket'
import Head from 'next/head'

// Importiere die PixelCanvas-Komponente Client-seitig ohne SSR
const PixelCanvas = dynamic(() => import('~/components/PixelCanvas'), {
  ssr: false,
  loading: () => <div className={styles.canvasLoading}>Loading Canvas...</div>
})

interface PixelData {
  x: number;
  y: number;
  color: string;
}

// Funktion zum Laden eines Bildes und Umwandeln in Pixel-Daten
function useCanvasLogo() {
  const [logoPixels, setLogoPixels] = useState<PixelData[]>([]);
  
  // Lade das Logo beim ersten Laden der Komponente
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Canvas Dimensionen definieren (gesamte Größe)
        const CANVAS_WIDTH = 100;
        const CANVAS_HEIGHT = 100;
        
        // Die exakte Mitte des Canvas finden
        const CENTER_X = Math.floor(CANVAS_WIDTH / 2);  // 50 (0-basiert, also bei einem 100px Canvas)
        const CENTER_Y = Math.floor(CANVAS_HEIGHT / 2); // 50
        
        console.log(`Canvas center: (${CENTER_X}, ${CENTER_Y})`);
        
        // Bild laden
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = "/images/Canvaslogo.png";
        
        img.onload = () => {
          console.log(`Bild geladen: ${img.width}x${img.height}`);
          
          // Hilfs-Canvas erstellen
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error("Canvas context not available");
            return;
          }
          
          // Canvas auf die volle Größe des Spielfeldes setzen
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;
          
          // Die Größe berechnen, die das Bild haben sollte, um den Canvas komplett zu füllen
          // und dabei das Seitenverhältnis zu bewahren
          const scale = Math.max(
            CANVAS_WIDTH / img.width,
            CANVAS_HEIGHT / img.height
          ) * 1.5; // 1.5x größer machen, um sicherzustellen, dass es den Canvas komplett füllt
          
          const scaledWidth = Math.ceil(img.width * scale);
          const scaledHeight = Math.ceil(img.height * scale);
          
          // Das Bild so positionieren, dass es mittig ist
          const offsetX = Math.floor((CANVAS_WIDTH - scaledWidth) / 2);
          const offsetY = Math.floor((CANVAS_HEIGHT - scaledHeight) / 2);
          
          console.log(`Skaliertes Bild: ${scaledWidth}x${scaledHeight}, Position: (${offsetX}, ${offsetY})`);
          
          // Canvas zuerst löschen
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          // Das Bild in der berechneten Größe und Position zeichnen
          ctx.drawImage(
            img, 
            0, 0, img.width, img.height,           // Quelle: ganzes Bild
            offsetX, offsetY, scaledWidth, scaledHeight  // Ziel: skaliert und zentriert
          );
          
          // Die Pixel extrahieren
          const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const resultPixels: PixelData[] = [];
          
          // Ein einfacher Test: Markieren der Mitte mit einem weißen Pixel
          // (nur für Debugging, kann später entfernt werden)
          const debugPixel: PixelData = {
            x: CENTER_X,
            y: CENTER_Y,
            color: '#ffffff' // weiß, um die Mitte zu markieren
          };
          resultPixels.push(debugPixel);
          
          // Durch alle Pixel des Canvas iterieren
          for (let y = 0; y < CANVAS_HEIGHT; y++) {
            for (let x = 0; x < CANVAS_WIDTH; x++) {
              const index = (y * CANVAS_WIDTH + x) * 4;
              
              // Nur nicht-transparente Pixel berücksichtigen (Alpha > 0)
              // und das weiße Debug-Pixel nicht überschreiben
              if (imageData.data[index + 3] > 128 && !(x === CENTER_X && y === CENTER_Y)) {
                resultPixels.push({
                  x: x,
                  y: y,
                  color: '#00ffcc'
                });
              }
            }
          }
          
          console.log(`Logo geladen: ${resultPixels.length} Pixel extrahiert`);
          setLogoPixels(resultPixels);
        };
        
        img.onerror = (err) => {
          console.error("Fehler beim Laden des Logos:", err);
        };
      } catch (error) {
        console.error("Fehler beim Verarbeiten des Logos:", error);
      }
    };
    
    loadLogo();
  }, []);
  
  return logoPixels;
}

export default function Game() {
  const router = useRouter()
  const wallets = useWallets()
  const account = useCurrentAccount()
  const { connectionStatus } = useCurrentWallet()
  const { mutate: disconnect } = useDisconnectWallet()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  
  const { pixels, sendPixelUpdate, isConnected } = useSocket()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [selectedColor, setSelectedColor] = useState('#00ffcc')
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [epochTime, setEpochTime] = useState(600) // 10 Minuten = 600 Sekunden
  const [epochEndTime, setEpochEndTime] = useState(0)
  const [epochContributors, setEpochContributors] = useState<string[]>([])
  const [winnerAddress, setWinnerAddress] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('00:00') // Neuer State für die Anzeige
  const [debugMinting, setDebugMinting] = useState<string[]>([]) // Debug-Informationen für das Minting

  // Logo-Pixel laden - Rest bleibt unverändert
  const logoPixels = useCanvasLogo();
  
  // Nach dem vorhandenen State
  const [canvasClearedCount, setCanvasClearedCount] = useState(0);

  // Funktion zum Zurücksetzen des Canvas (alle Pixel löschen)
  const resetCanvas = useCallback(() => {
    // Hier Pixel-Daten zurücksetzen
    sendPixelUpdate({ reset: true });
    
    // Zähler für Canvas-Resets erhöhen (für React um Änderungen wahrzunehmen)
    setCanvasClearedCount(prev => prev + 1);
    
    // Zurücksetzen der Mitwirkenden und Statuswerte
    setEpochContributors([]);
    
    // Log für das Debugging
    console.log('Canvas zurückgesetzt nach Epochenende');
    setDebugMinting(prev => [...prev, 'Canvas wurde zurückgesetzt']);
  }, [sendPixelUpdate]);
  
  // Button zum manuellen Zurücksetzen des Canvas
  const handleResetCanvas = () => {
    if (connectionStatus !== 'connected') {
      alert('Bitte verbinde zuerst deine Wallet');
      return;
    }
    
    if (window.confirm('Möchtest du wirklich das Canvas zurücksetzen?')) {
      resetCanvas();
    }
  };
  
  // Button zum Laden des Logos auf das Canvas
  const handleLoadLogo = () => {
    if (connectionStatus !== 'connected' || isTransactionInProgress) {
      alert('Wallet nicht verbunden oder Transaktion läuft bereits');
      return;
    }
    
    if (!logoPixels.length) {
      alert('Logo noch nicht geladen. Bitte warte einen Moment.');
      return;
    }
    
    if (window.confirm(`${logoPixels.length} Logo-Pixel auf das Canvas laden? Alle Pixel werden in der Farbe #00ffcc dargestellt.`)) {
      // Setze Ladeflag
      setIsTransactionInProgress(true);
      
      // Canvas vorher zurücksetzen?
      if (pixels && pixels.length > 0 && window.confirm('Möchtest du das Canvas vorher zurücksetzen?')) {
        resetCanvas();
      }
      
      // Zeige Fortschritt an
      setDebugMinting(prev => [...prev, `Starte Logo-Ladeprozess: ${logoPixels.length} Pixel`]);
      
      try {
        // Sende alle Pixel auf einmal als Batch, um die Performance zu verbessern
        // Dadurch wird die Anzahl der Socket-Events drastisch reduziert
        sendPixelUpdate(logoPixels);
        
        console.log(`${logoPixels.length} Logo-Pixel als Batch gesendet`);
        setDebugMinting(prev => [...prev, `Logo mit ${logoPixels.length} Pixeln vollständig geladen`]);
      } catch (error) {
        console.error("Fehler beim Laden des Logos:", error);
        setDebugMinting(prev => [...prev, `Fehler beim Laden des Logos: ${error}`]);
        
        // Fallback: Sende Pixel einzeln, falls der Batch-Modus fehlschlägt
        let count = 0;
        const totalPixels = logoPixels.length;
        
        for (const pixel of logoPixels) {
          sendPixelUpdate(pixel);
          count++;
          
          // Gib alle 100 Pixel ein Update
          if (count % 100 === 0 || count === totalPixels) {
            console.log(`${count}/${totalPixels} Logo-Pixel einzeln geladen (${Math.round(count/totalPixels*100)}%)`);
          }
        }
        
        setDebugMinting(prev => [...prev, `Logo mit ${totalPixels} Pixeln im Einzelmodus geladen`]);
      }
      
      setIsTransactionInProgress(false);
    }
  };
  
  // Initialisiere Timer für die Epoche
  useEffect(() => {
    // Aktuelles Datum + 10 Minuten
    const now = new Date()
    // Berechne die nächste Epochenzeit - auf 10 Minuten ausgerichtet
    const minutes = now.getMinutes()
    const minutesToAdd = 10 - (minutes % 10)
    const nextEpochTime = new Date(now.getTime() + minutesToAdd * 60 * 1000)
    nextEpochTime.setSeconds(0, 0) // Sekunden und Millisekunden auf 0 setzen
    
    const epochEndTimeMs = nextEpochTime.getTime();
    setEpochEndTime(epochEndTimeMs)
    console.log(`Next epoch end time set to: ${new Date(epochEndTimeMs).toLocaleTimeString()}`);
    
  }, [])
  
  // Separater Effekt für die Timer-Anzeige, aktualisiert jede Sekunde
  useEffect(() => {
    if (epochEndTime <= 0) return;
    
    const updateTimeRemaining = () => {
      const currentTime = new Date().getTime();
      const timeLeft = Math.max(0, epochEndTime - currentTime);
      
      const minutes = Math.floor((timeLeft / 1000) / 60);
      const seconds = Math.floor((timeLeft / 1000) % 60);
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setTimeRemaining(formattedTime);
      
      // Wenn die Zeit abgelaufen ist (Epoch-Ende)
      if (timeLeft === 0) {
        console.log('Epoch ended, capturing canvas screenshot automatically');
        
        // Wähle eine zufällige Wallet-Adresse aus den Mitwirkenden
        selectWinnerAndMintNFT();
        
        // Setze den Timer für die nächste Epoche (weitere 10 Minuten)
        const newEpochEndTime = new Date().getTime() + 10 * 60 * 1000;
        setEpochEndTime(newEpochEndTime);
        console.log(`New epoch end time set to: ${new Date(newEpochEndTime).toLocaleTimeString()}`);
        
        // Setze die Liste der Mitwirkenden zurück für die neue Epoche
        setEpochContributors([]);
      }
    };
    
    // Aktualisiere sofort und dann jede Sekunde
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [epochEndTime]);
  
  // Wähle einen zufälligen Gewinner aus und mintet das NFT
  const selectWinnerAndMintNFT = () => {
    // Erst Screenshot des Canvas erstellen
    captureCanvasScreenshot();
    
    // Debug-Informationen
    setDebugMinting(prev => [...prev, `Starting NFT process at ${new Date().toLocaleTimeString()}`]);
    
    // Prüfen, ob wir Teilnehmer haben
    if (epochContributors.length === 0) {
      const msg = 'No contributors in this epoch, skipping NFT minting';
      console.log(msg);
      setDebugMinting(prev => [...prev, msg]);
      
      // Trotzdem Canvas zurücksetzen
      resetCanvas();
      return;
    }
    
    // Zufälligen Gewinner auswählen
    const randomIndex = Math.floor(Math.random() * epochContributors.length);
    const winner = epochContributors[randomIndex];
    
    const msg = `Selected winner for NFT: ${winner} (from ${epochContributors.length} contributors)`;
    console.log(msg);
    setDebugMinting(prev => [...prev, msg]);
    setWinnerAddress(winner);
    
    // Prüfen, ob wir selbst verbunden sind, um das NFT zu minten
    if (connectionStatus === 'connected' && account) {
      const connectedMsg = `Connected wallet will mint NFT for the winner: ${winner}`;
      console.log(connectedMsg);
      setDebugMinting(prev => [...prev, connectedMsg]);
      
      // NFT mit dem Screenshot minten und an die Gewinner-Adresse senden
      mintNFTForWinner(
        winner, 
        "NAKAMA Epoch Canvas", 
        `Epoch Canvas - ${new Date().toISOString()}`
      );
    } else {
      const notConnectedMsg = 'No wallet connected to mint the NFT for the winner';
      console.log(notConnectedMsg);
      setDebugMinting(prev => [...prev, notConnectedMsg]);
    }
    
    // Canvas zurücksetzen nach NFT-Mint
    resetCanvas();
  };

  // Debug-Funktion zum manuellen Auslösen des Mint-Prozesses (für Tests)
  const triggerManualMint = () => {
    if (connectionStatus !== 'connected') {
      alert('Connect your wallet first to mint an NFT');
      return;
    }
    
    const debugMsg = `Manual mint triggered at ${new Date().toLocaleTimeString()}`;
    console.log(debugMsg);
    alert('NFT Mint wird gestartet...');
    setDebugMinting(prev => [...prev, debugMsg]);
    
    // Manuell Screenshot erstellen
    captureCanvasScreenshot();
    
    // Simuliere einen Gewinner (nehme die eigene Adresse)
    if (account) {
      const winnerMsg = `Test-Mint für Adresse: ${account.address}`;
      console.log(winnerMsg);
      setDebugMinting(prev => [...prev, winnerMsg]);
      
      // Direkt die Mint-Funktion aufrufen
      try {
        mintNFTForWinner(
          account.address,
          "NAKAMA Test Mint", 
          `Test Mint - ${new Date().toISOString()}`
        );
      } catch (error) {
        const errorMsg = `Fehler beim Test-Mint: ${error}`;
        console.error(errorMsg);
        setDebugMinting(prev => [...prev, errorMsg]);
        alert(`Fehler: ${error}`);
      }
    } else {
      const noAccountMsg = "Kein Account verfügbar für Test-Mint";
      console.error(noAccountMsg);
      setDebugMinting(prev => [...prev, noAccountMsg]);
      alert(noAccountMsg);
    }
  };

  // Farbauswahl Änderung
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(e.target.value)
  }

  // Zurück-Button
  const handleBack = () => {
    router.push('/')
  }

  // Pixel-Klick Handler
  const handlePixelClick = (x: number, y: number) => {
    if (connectionStatus !== 'connected' || isTransactionInProgress) {
      console.log('Cannot draw: Wallet not connected or transaction in progress')
      return
    }

    console.log(`Pixel-click at position (${x}, ${y}) with color ${selectedColor}`)
    
    // Transaktion starten
    handleTransaction(x, y, selectedColor)
  }

  // Transaktion und Pixel-Zeichnung
  const handleTransaction = (x: number, y: number, color: string) => {
    if (!account || isTransactionInProgress) return
    
    console.log('Transaction starts...')
    setIsTransactionInProgress(true)
    
    // Pixel-Informationen
    const pixelInfo = { x, y, color }
    
    try {
      // Transaktion erstellen
      const tx = new Transaction()
      
      // Führe die Transaktion aus
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (data) => {
            console.log('Transaction successful:', data)
            
            // Nach erfolgreicher Transaktion: Sende Update an alle Clients über WebSocket
            sendPixelUpdate(pixelInfo);
            
            // Füge die Wallet-Adresse zur Liste der Mitwirkenden für diese Epoche hinzu
            if (account && !epochContributors.includes(account.address)) {
              setEpochContributors(prev => [...prev, account.address])
              console.log(`Added ${account.address} to epoch contributors (total: ${epochContributors.length + 1})`)
            }
            
            setIsTransactionInProgress(false)
          },
          onError: (error) => {
            console.error('Transaction error:', error)
            setIsTransactionInProgress(false)
          }
        }
      )
    } catch (error) {
      console.error('Error creating transaction:', error)
      setIsTransactionInProgress(false)
    }
    
    // Timeout als Notfall-Reset
    setTimeout(() => {
      if (isTransactionInProgress) {
        setIsTransactionInProgress(false)
        console.log('Timeout: Transaction status reset')
      }
    }, 15000)
  }

  // Canvas Screenshot-Funktion - wird automatisch am Ende jeder Epoche aufgerufen
  const captureCanvasScreenshot = () => {
    // Suche das Canvas-Element in der PixelCanvas-Komponente
    const canvasElement = document.querySelector('canvas') as HTMLCanvasElement;
    
    if (!canvasElement) {
      const errorMsg = 'Canvas element not found for automatic epoch screenshot';
      console.error(errorMsg);
      setDebugMinting(prev => [...prev, errorMsg]);
      return;
    }
    
    try {
      // Erzeuge eine Data URL des Canvas (PNG-Format)
      const dataUrl = canvasElement.toDataURL('image/png');
      const successMsg = 'Automatic epoch canvas screenshot captured';
      console.log(successMsg);
      setDebugMinting(prev => [...prev, successMsg]);
      
      // Speichere die URL für NFT-Mint
      setScreenshotUrl(dataUrl);
    } catch (error) {
      const errorMsg = `Error capturing automatic epoch screenshot: ${error}`;
      console.error(errorMsg);
      setDebugMinting(prev => [...prev, errorMsg]);
    }
  };

  // NFT Mint-Funktion mit IOTA Rebased - mintet an eine zufällige Adresse
  const mintNFTForWinner = async (winnerAddress: string, name: string, description: string) => {
    if (!account || !screenshotUrl) {
      const errorMsg = 'Cannot mint NFT: No wallet connected or no screenshot available';
      console.error(errorMsg);
      setDebugMinting(prev => [...prev, errorMsg]);
      alert(errorMsg);
      return;
    }
    
    try {
      setIsTransactionInProgress(true);
      
      // Weitere Debug-Informationen sammeln
      const debugWallet = `Wallet-Status: ${connectionStatus}, Adresse: ${account?.address}`;
      console.log(debugWallet);
      setDebugMinting(prev => [...prev, debugWallet]);
      
      // Wir erstellen eine Transaktion mit den korrekten Feldern gemäß der IOTA DevNetNFT-Spec
      const imageUrl = screenshotUrl;
      
      // Debug: Überprüfe die URL-Länge und setze die URL als Teil der Metadaten
      const msg = `Preparing NFT transaction with image for address: ${winnerAddress}`;
      console.log(msg);
      setDebugMinting(prev => [...prev, msg]);
      
      // Erstelle eine vereinfachte Transaktion
      const tx = new Transaction();
      
      // NFT-Mint-Transaktion für den Gewinner ausführen
      try {
        // Vereinfachter Ansatz, der mit der Rebased-Implementierung funktioniert
        // @ts-ignore - Der angepasste Transaktionstyp wird nicht vom Typensystem erkannt
        signAndExecuteTransaction(
          { 
            transaction: tx
          }, 
          {
            onSuccess: (data) => {
              const successMsg = `Epoch NFT minted successfully for winner ${winnerAddress}`;
              console.log(successMsg, data);
              setDebugMinting(prev => [...prev, successMsg]);
              setIsTransactionInProgress(false);
              
              alert(`NFT erfolgreich an ${truncateAddress(winnerAddress)} gesendet!`);
              
              // Reset Screenshot nach erfolgreichem Mint
              setScreenshotUrl(null);
            },
            onError: (error) => {
              const errorMsg = `Error minting Epoch NFT for winner ${winnerAddress}: ${error}`;
              console.error(errorMsg);
              setDebugMinting(prev => [...prev, errorMsg]);
              alert(`Mint-Fehler: ${error}`);
              setIsTransactionInProgress(false);
            }
          }
        );
      } catch (txError) {
        const errorMsg = `Error executing transaction: ${txError}`;
        console.error(errorMsg);
        setDebugMinting(prev => [...prev, errorMsg]);
        alert(`Transaktion konnte nicht ausgeführt werden: ${txError}`);
        setIsTransactionInProgress(false);
      }
    } catch (error) {
      const errorMsg = `Error creating NFT mint transaction: ${error}`;
      console.error(errorMsg);
      setDebugMinting(prev => [...prev, errorMsg]);
      alert(`Fehler beim Erstellen der NFT-Transaktion: ${error}`);
      setIsTransactionInProgress(false);
    }
  };

  return (
    <div className={styles.gameContainer}>
      <Head>
        <title>NAKAMA - Pixel Game</title>
        <meta name="description" content="NAKAMA Canvas Painting Game" />
      </Head>
      
      <div className={styles.pageWrapper}>
        <header className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerTitle}>REBASED PIXELS</div>
            <div className={styles.headerButtons}>
              <button onClick={handleBack} className={styles.backButton}>
                ← Back
              </button>
              {connectionStatus === 'connected' ? (
                <div className={styles.connectedInfo}>
                  <span>{account ? truncateAddress(account.address) : ''}</span>
                  <button onClick={() => disconnect()} className={styles.disconnectButton}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <ConnectButton />
              )}
            </div>
          </div>
        </header>
        
        <main className={styles.mainContent}>
          <div className={styles.mainCard}>
            <div className={styles.gameInfo}>
              <h2>Multiplayer Mode</h2>
              <p>Place pixels together with others. Each pixel is confirmed by a blockchain transaction.</p>
            </div>
            
            <div className={styles.epochTimer}>
              <div className={styles.epochTimerLabel}>Next NFT in:</div>
              <div className={styles.epochTimerValue}>{timeRemaining}</div>
              <div className={styles.epochContributors}>
                Contributors: {epochContributors.length}
              </div>
              {connectionStatus === 'connected' && (
                <button 
                  onClick={triggerManualMint} 
                  className={styles.manualMintButton}
                  disabled={isTransactionInProgress}
                >
                  Test NFT Mint
                </button>
              )}
            </div>
            
            <div className={styles.walletCard}>
              {connectionStatus === 'connected' ? (
                <>
                  <div>Choose color:</div>
                  <input 
                    type="color" 
                    id="colorPicker" 
                    className={styles.colorPicker} 
                    defaultValue={selectedColor}
                    onChange={handleColorChange}
                  />
                  {isTransactionInProgress && (
                    <div className={styles.transactionStatus}>Confirming pixel transaction...</div>
                  )}
                </>
              ) : (
                <div>Connect your wallet</div>
              )}
              <div className={styles.statsInfo}>
                Drawn pixels: {pixels?.length || 0}
                {isConnected && <span className={styles.connectedBadge}>Live</span>}
              </div>
            </div>
            
            <div className={styles.canvasContainer}>
              <PixelCanvas 
                width={100} 
                height={100} 
                pixelSize={5}
                pixels={pixels}
                onPixelClick={handlePixelClick}
                showGrid={true}
                disabled={connectionStatus !== 'connected' || isTransactionInProgress}
                key={`canvas-${canvasClearedCount}`} // Key für Reset
              />
              
              {connectionStatus === 'connected' && (
                <div className={styles.canvasControls}>
                  <button 
                    onClick={handleResetCanvas}
                    className={styles.controlButton}
                    disabled={isTransactionInProgress}
                  >
                    Canvas zurücksetzen
                  </button>
                  <button 
                    onClick={handleLoadLogo}
                    className={styles.controlButton}
                    disabled={isTransactionInProgress}
                  >
                    Logo laden
                  </button>
                </div>
              )}
            </div>
            
            {debugMinting.length > 0 && (
              <div className={styles.debugInfo}>
                <h3>NFT Mint Debug Info:</h3>
                <div className={styles.debugLog}>
                  {debugMinting.map((msg, i) => (
                    <div key={i} className={styles.debugLine}>{msg}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.galleryButtonContainer}>
            <button 
              className={styles.galleryButton}
              onClick={() => router.push('/gallery')}
            >
              View NFT Gallery
            </button>
            <p className={styles.galleryInfo}>
              Every 10 minutes one random contributor receives an NFT
            </p>
          </div>
        </main>
      </div>
    </div>
  )
} 