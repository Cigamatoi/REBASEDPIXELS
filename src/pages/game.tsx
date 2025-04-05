import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectButton,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useWallets,
} from '@iota/dapp-kit'
import { Transaction } from '@iota/iota-sdk/transactions'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { NextPage } from 'next'

// Lokale Typen für die NFT-Transaktion
interface NftMetadata {
  name: string
  description: string
  image: string
  timestamp: string
}

// Erweitere den Transaction-Typ für NFTs
interface NftTransaction extends Transaction {
  tag?: string
  targetAddress?: string
  metadata?: NftMetadata
  includeStorageDeposit?: boolean
  type?: string
  issuer?: string
}

import Head from 'next/head'

import { truncateAddress } from '~/helpers'
import useSocket from '~/hooks/useSocket'
import styles from '~/styles/PixelGame.module.css'
import { createLocalBlobUrl, downloadImageFromUrl, saveImageToServer, uploadCanvasToIPFS } from '~/utils/ipfsUtils'
import { calculateNextEpochEndTime, formatTimeRemaining, isEpochEnded } from '~/utils/epochUtils'

// Importiere die PixelCanvas-Komponente Client-seitig ohne SSR
const PixelCanvas = dynamic(() => import('~/components/PixelCanvas'), {
  ssr: false,
  loading: () => <div className={styles.canvasLoading}>Canvas wird geladen...</div>,
})

interface PixelData {
  x: number
  y: number
  color: string
}

const Game: NextPage = () => {
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

  // Nach dem vorhandenen State
  const [canvasClearedCount, setCanvasClearedCount] = useState(0)

  // IPFS-State-Variablen
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null)
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState(false)
  const [ipfsError, setIpfsError] = useState<string | null>(null)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)

  // Neuer State für den Übergang zwischen Epochen
  const [isEpochTransitionInProgress, setIsEpochTransitionInProgress] = useState(false)

  // Funktion zum Zurücksetzen des Canvas (alle Pixel löschen)
  const resetCanvas = useCallback(() => {
    if (isEpochTransitionInProgress) return;

    // Hier Pixel-Daten zurücksetzen
    sendPixelUpdate({ reset: true })

    // Zähler für Canvas-Resets erhöhen (für React um Änderungen wahrzunehmen)
    setCanvasClearedCount((prev) => prev + 1)

    // Zurücksetzen der Mitwirkenden und Statuswerte
    setEpochContributors([])

    // Log für das Debugging
    console.log('Canvas zurückgesetzt nach Epochenende')
    setDebugMinting((prev) => [...prev, 'Canvas wurde zurückgesetzt'])
  }, [sendPixelUpdate, isEpochTransitionInProgress])

  // Initialisiere Timer für die Epoche
  useEffect(() => {
    const fetchEpochData = async () => {
      try {
        const response = await fetch('/api/epoch-data');
        const data = await response.json();
        
        if (data.epochEnd) {
          const serverEpochEndTime = new Date(data.epochEnd).getTime();
          setEpochEndTime(serverEpochEndTime);
          console.log(`Server epoch end time: ${new Date(serverEpochEndTime).toLocaleString()}`);
        } else {
          // Fallback: Berechne lokales Epochenende
          const now = new Date().getTime();
          const nextEpochEndTime = calculateNextEpochEndTime(now);
          setEpochEndTime(nextEpochEndTime);
          console.log(`Local epoch end time: ${new Date(nextEpochEndTime).toLocaleString()}`);
        }
      } catch (error) {
        console.error('Error fetching epoch data:', error);
        // Fallback: Berechne lokales Epochenende
        const now = new Date().getTime();
        const nextEpochEndTime = calculateNextEpochEndTime(now);
        setEpochEndTime(nextEpochEndTime);
        console.log(`Local epoch end time (fallback): ${new Date(nextEpochEndTime).toLocaleString()}`);
      }
    };

    fetchEpochData();
  }, []);

  // Separater Effekt für die Timer-Anzeige, aktualisiert jede Sekunde
  useEffect(() => {
    if (epochEndTime <= 0) return;

    const updateTimeRemaining = () => {
      const currentTime = new Date().getTime();
      const timeLeft = Math.max(0, epochEndTime - currentTime);

      // Formatiere die verbleibende Zeit
      const formattedTime = formatTimeRemaining(timeLeft);
      setTimeRemaining(formattedTime);

      // Wenn die Zeit abgelaufen ist (Epoch-Ende) und kein Übergang läuft
      if (isEpochEnded(epochEndTime) && !isEpochTransitionInProgress) {
        console.log('Epoch ended, starting transition');
        setIsEpochTransitionInProgress(true);

        // Screenshots erstellen
        captureCanvasScreenshot().then(() => {
          // Hole die neue Epochenzeit vom Server
          fetch('/api/epoch-data')
            .then(response => response.json())
            .then(data => {
              if (data.epochEnd) {
                const newEpochEndTime = new Date(data.epochEnd).getTime();
                setEpochEndTime(newEpochEndTime);
                console.log(`New epoch end time from server: ${new Date(newEpochEndTime).toLocaleString()}`);
              }
            })
            .catch(error => {
              console.error('Error fetching new epoch data:', error);
              // Fallback: Berechne lokales Epochenende
              const newEpochEndTime = calculateNextEpochEndTime(currentTime);
              setEpochEndTime(newEpochEndTime);
              console.log(`New epoch end time (fallback): ${new Date(newEpochEndTime).toLocaleString()}`);
            })
            .finally(() => {
              // Setze die Liste der Mitwirkenden zurück für die neue Epoche
              setEpochContributors([]);

              // Canvas zurücksetzen
              resetCanvas();

              // Übergang beendet
              setIsEpochTransitionInProgress(false);
            });
        }).catch(error => {
          console.error('Error during epoch transition:', error);
          setIsEpochTransitionInProgress(false);
        });
      }
    };

    // Aktualisiere sofort und dann jede Sekunde
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [epochEndTime, resetCanvas, isEpochTransitionInProgress]);

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

      // Markiere diese Transaktion explizit als Pixel-Transaktion
      // im Gegensatz zu NFT-Transaktion
      const pixelTx = Object.assign(tx, {
        type: 'PIXEL_SET',
        pixelData: pixelInfo,
      })

      // Führe die Transaktion aus
      signAndExecuteTransaction(
        { transaction: pixelTx },
        {
          onSuccess: (data) => {
            console.log('Transaction successful:', data)

            // Nach erfolgreicher Transaktion: Sende Update an alle Clients über WebSocket
            sendPixelUpdate(pixelInfo)

            // Füge die Wallet-Adresse zur Liste der Mitwirkenden für diese Epoche hinzu
            if (account && !epochContributors.includes(account.address)) {
              setEpochContributors((prev) => [...prev, account.address])
              console.log(`Added ${account.address} to epoch contributors (total: ${epochContributors.length + 1})`)
            }

            setIsTransactionInProgress(false)
          },
          onError: (error) => {
            console.error('Transaction error:', error)
            setIsTransactionInProgress(false)
          },
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
  const captureCanvasScreenshot = async () => {
    // Suche das Canvas-Element in der PixelCanvas-Komponente
    const canvasElement = document.querySelector('canvas') as HTMLCanvasElement

    if (!canvasElement) {
      console.error('Canvas element not found for automatic epoch screenshot')

      return
    }

    try {
      // Kurze Verzögerung um sicherzustellen, dass das Canvas vollständig gerendert ist
      setTimeout(async () => {
        try {
          // Wichtig: Wir stellen sicher, dass das Canvas nicht leer ist
          const ctx = canvasElement.getContext('2d')
          const imageData = ctx?.getImageData(0, 0, canvasElement.width, canvasElement.height)

          if (!imageData || imageData.data.every((pixel) => pixel === 0)) {
            console.warn('Canvas ist leer. Kein Screenshot erstellt.')

            return
          }

          // Erzeuge eine Data URL des Canvas (PNG-Format)
          const dataUrl = canvasElement.toDataURL('image/png')

          if (!dataUrl || dataUrl === 'data:,') {
            console.error('Leere Canvas-Daten erhalten')

            return
          }

          // Überprüfe auf gültige Base64-Daten
          if (!dataUrl.includes('base64')) {
            console.error('Ungültiges Base64-Format beim Screenshot')

            return
          }

          console.log('Canvas-Screenshot erfasst')

          // Speichere die URL
          setScreenshotUrl(dataUrl)

          // Automatisch auf dem Server speichern
          try {
            const epochNumber = Math.floor(Date.now() / (3 * 24 * 60 * 60 * 1000)) // Epoche basierend auf 3-Tage-Intervallen
            const filename = `Screenshot-Epoch-${epochNumber}-${new Date().toISOString()}`

            // Speichern auf dem Server
            const serverUrl = await saveImageToServer(dataUrl, filename)
            console.log(`Screenshot auf dem Server gespeichert: ${serverUrl}`)

            // Server-URL für späteren Zugriff speichern
            const fullServerUrl = `${window.location.origin}${serverUrl}`
            setIpfsUrl(fullServerUrl)
          } catch (serverError) {
            console.error('Fehler beim Speichern des Screenshots auf dem Server:', serverError)
          }
        } catch (innerError) {
          console.error('Fehler beim Erfassen des Screenshots:', innerError)
        }
      }, 500)
    } catch (error) {
      console.error('Error capturing automatic epoch screenshot:', error)
    }
  }

  // Funktion zur Prüfung, ob ein externes Bild verwendet werden kann
  const useExternalImage = async () => {
    // IPFS-Bild-URL oder eine andere externe Quelle
    const externalImageUrl =
      'https://ipfs.io/ipfs/bafybeihjjkwdrxxjnuwevlqtqmh3iegcadc6uzdd3w5nuydzjt3qkdj5j4/image.png'

    try {
      // Testen, ob das Bild geladen werden kann
      const testImg = new Image()
      testImg.src = externalImageUrl

      // Warten, ob das Bild geladen werden kann
      await new Promise((resolve, reject) => {
        testImg.onload = resolve
        testImg.onerror = reject
        // Timeout nach 3 Sekunden
        setTimeout(reject, 3000)
      })

      // Wenn wir hier ankommen, wurde das Bild erfolgreich geladen
      const successMsg = 'Externes Bild erfolgreich geladen, verwende es für NFT'
      console.log(successMsg)
      setDebugMinting((prev) => [...prev, successMsg])

      // Setze externes Bild als Screenshot-URL
      setScreenshotUrl(externalImageUrl)

      return true
    } catch (error) {
      const errorMsg = `Externes Bild konnte nicht geladen werden: ${error}`
      console.log(errorMsg)
      setDebugMinting((prev) => [...prev, errorMsg])

      return false
    }
  }

  // NFT Mint-Funktion mit IOTA Rebased - mintet an eine zufällige Adresse
  const mintNFTForWinner = async (winnerAddress: string, name: string, description: string) => {
    if (!account) {
      const errorMsg = 'Cannot mint NFT: No wallet connected'
      console.error(errorMsg)
      setDebugMinting((prev) => [...prev, errorMsg])
      alert(errorMsg)

      return
    }

    // Debug: Gewinner-Adresse überprüfen
    const winnerInfo = `NFT wird für Gewinner: ${winnerAddress} erstellt`
    console.log(winnerInfo)
    setDebugMinting((prev) => [...prev, winnerInfo])

    // Wenn kein Bild vorhanden, versuchen wir zuerst IPFS
    if (!screenshotUrl && !ipfsUrl) {
      setDebugMinting((prev) => [...prev, 'Kein Bild vorhanden. Versuche zunächst IPFS-Upload...'])
      const ipfsUrl = await captureCanvasAndUploadToIPFS()

      if (!ipfsUrl) {
        // Falls kein IPFS-Upload möglich, erstellen wir einen normalen Screenshot
        setDebugMinting((prev) => [...prev, 'IPFS-Upload fehlgeschlagen. Erstelle lokalen Screenshot...'])
        captureCanvasScreenshot()

        // Kurze Wartezeit für Screenshot-Erstellung
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Prüfen, ob Screenshot jetzt verfügbar ist
        if (!screenshotUrl) {
          // Falls kein Screenshot verfügbar, verwenden wir ein Fallback
          const fallbackUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
          setScreenshotUrl(fallbackUrl)
          setDebugMinting((prev) => [...prev, 'Kein Bild verfügbar, verwende Fallback-Bild'])
        }
      }
    }

    // Bevorzuge IPFS-URL über lokalen Screenshot
    const imageUrl = ipfsUrl || screenshotUrl

    if (!imageUrl) {
      const errorMsg = 'Keine Bild-URL verfügbar für NFT'
      console.error(errorMsg)
      setDebugMinting((prev) => [...prev, errorMsg])
      alert(errorMsg)

      return
    }

    try {
      setIsTransactionInProgress(true)

      // Debug-Informationen sammeln
      const debugWallet = `Wallet-Status: ${connectionStatus}, Adresse: ${account?.address}`
      console.log(debugWallet)
      setDebugMinting((prev) => [...prev, debugWallet])

      // Debug: Bild-URL überprüfen
      const urlType = ipfsUrl ? 'IPFS-URL' : 'Lokaler Screenshot'
      const urlDebug = `Bild: ${urlType}, Länge: ${imageUrl.length}`
      console.log(urlDebug)
      setDebugMinting((prev) => [...prev, urlDebug])

      try {
        const transactionMsg = `Initiiere NFT-Mint-Transaktion mit ${urlType} direkt an ${winnerAddress}...`
        console.log(transactionMsg)
        setDebugMinting((prev) => [...prev, transactionMsg])

        // Erstelle ein Transaktionsobjekt speziell für NFTs
        // Da die Transaction-Klasse keine NFT-spezifischen Eigenschaften unterstützt,
        // verwenden wir ein eigenes Objekt mit den benötigten Eigenschaften
        const nftTx: any = {
          // Standard-Transaction-Eigenschaften
          type: 'NFT_MINT', // Anstatt normaler Transaktion

          // NFT-spezifische Eigenschaften
          recipientAddress: winnerAddress,
          issuerAddress: account.address,
          metadata: {
            name,
            description,
            image: imageUrl,
            timestamp: new Date().toISOString(),
          },
          includeStorageDeposit: true,
        }

        // Informiere den Benutzer
        setDebugMinting((prev) => [...prev, `NFT für ${winnerAddress} wird erstellt, inkl. Storage Deposit`])
        setDebugMinting((prev) => [...prev, `Metadaten: Name="${name}", Beschreibung="${description}"`])

        // Debug-Info für die Transaktion
        setDebugMinting((prev) => [...prev, `NFT-Transaktion vorbereitet mit Empfänger: ${winnerAddress}`])

        // Debug-Info für Bild
        const imgInfo = `Bild-URL: ${imageUrl.substring(0, 50)}... (${imageUrl.length} Zeichen)`
        console.log(imgInfo)
        setDebugMinting((prev) => [...prev, imgInfo])

        // Ausführen der Transaktion
        signAndExecuteTransaction(
          {
            transaction: nftTx,
          },
          {
            onSuccess: (data) => {
              const successMsg = `NFT erfolgreich für ${winnerAddress} geminted!`
              console.log(successMsg, data)
              setDebugMinting((prev) => [...prev, successMsg])

              // Details der Transaktion anzeigen
              const details = `Transaktion: ${JSON.stringify(data || {})}`
              console.log(details)
              setDebugMinting((prev) => [...prev, details])

              setIsTransactionInProgress(false)
              alert(`NFT erfolgreich für ${winnerAddress} geminted! Bild-Typ: ${urlType}`)

              // Reset Screenshot erst, wenn wir sicher sind, dass alles funktioniert hat
              if (!ipfsUrl) {
                setScreenshotUrl(null)
              }
            },
            onError: (error) => {
              const errorMsg = `Fehler beim Mint-Vorgang: ${error}`
              console.error(errorMsg)
              setDebugMinting((prev) => [...prev, errorMsg])
              alert(`Mint-Fehler: ${error}`)
              setIsTransactionInProgress(false)
            },
          }
        )
      } catch (txError) {
        const errorMsg = `Fehler bei der Transaktion: ${txError}`
        console.error(errorMsg)
        setDebugMinting((prev) => [...prev, errorMsg])
        alert(`Transaktion konnte nicht ausgeführt werden: ${txError}`)
        setIsTransactionInProgress(false)
      }
    } catch (error) {
      const errorMsg = `Fehler bei der NFT-Erstellung: ${error}`
      console.error(errorMsg)
      setDebugMinting((prev) => [...prev, errorMsg])
      alert(`Fehler beim Erstellen der NFT-Transaktion: ${error}`)
      setIsTransactionInProgress(false)
    }
  }

  // Hilfsfunktion zum Überprüfen, ob das Canvas leer ist
  const isCanvasEmpty = (): boolean => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement
    if (!canvas) return true

    const ctx = canvas.getContext('2d')
    if (!ctx) return true

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Prüfen, ob alle Pixel transparent/leer sind
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Wenn irgendein Pixel einen Alpha-Wert > 0 hat, ist das Canvas nicht leer
      if (imageData.data[i + 3] > 0) {
        return false
      }
    }

    return true
  }

  // Funktion zum Erfassen des Canvas-Screenshots und Speichern auf dem Server
  const captureCanvasAndUploadToIPFS = async (): Promise<string | null> => {
    setIsUploadingToIPFS(true)
    setIpfsError(null)

    try {
      // Canvas als Bild erfassen
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement
      if (!canvas) {
        setIsUploadingToIPFS(false)

        return null
      }

      // Canvas als Bild erfassen
      const imageData = canvas.toDataURL('image/png')
      const epochNumber = Math.floor(Date.now() / (3 * 24 * 60 * 60 * 1000)) // Basierend auf 3-Tage-Intervallen
      const fileName = `Screenshot_Epoch_${epochNumber}_${new Date().toISOString().replace(/:/g, '-')}.png`

      // Screenshot an den Server senden zum Speichern
      const response = await fetch('/api/save-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData, fileName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Speichern des Screenshots')
      }

      const fullImagePath = `${window.location.origin}${data.imagePath}`
      console.log('Bild erfolgreich gespeichert:', fullImagePath)

      setScreenshotUrl(fullImagePath)
      setIpfsUrl(fullImagePath)

      return fullImagePath
    } catch (err: unknown) {
      console.error('Fehler beim Erfassen des Screenshots:', err)

      return null
    } finally {
      setIsUploadingToIPFS(false)
    }
  }

  // IPFS Upload-Funktion
  const uploadToIPFS = useCallback(async (data: string): Promise<string | null> => {
    console.log('[DEBUG] uploadToIPFS wird nicht mehr verwendet, benutze stattdessen captureCanvasAndUploadToIPFS')

    return null
  }, [])

  // Handler für Test-Screenshot
  const handleTestScreenshot = async () => {
    try {
      setIsEpochTransitionInProgress(true);
      await captureCanvasScreenshot();
      console.log('Test screenshot created successfully');
    } catch (error) {
      console.error('Error creating test screenshot:', error);
    } finally {
      setIsEpochTransitionInProgress(false);
    }
  };

  // Handler für das Ende der Epoche
  const handleEndEpoch = async () => {
    if (isEpochTransitionInProgress) return

    setIsEpochTransitionInProgress(true)
    try {
      // Erstelle Screenshot
      await createScreenshot()

      // Berechne nächste Epochenzeit
      const now = new Date().getTime()
      const nextEpochEnd = calculateNextEpochEndTime(now)
      setEpochEndTime(nextEpochEnd)

      // Setze Contributors zurück
      setEpochContributors([])

      // Setze Canvas zurück
      resetCanvas()
    } catch (error) {
      console.error('Fehler beim Beenden der Epoche:', error)
    } finally {
      setIsEpochTransitionInProgress(false)
    }
  }

  // Funktion zum Erstellen eines Screenshots
  const createScreenshot = async () => {
    try {
      // Lade Pixel-Daten vom Server
      const response = await fetch('/api/get-pixels')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Pixel-Daten')
      }
      const { pixels } = await response.json()

      // Erstelle temporäres Canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 1000
      tempCanvas.height = 1000
      const ctx = tempCanvas.getContext('2d')
      if (!ctx) {
        throw new Error('Konnte Canvas-Kontext nicht erstellen')
      }

      // Zeichne Hintergrund
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, 1000, 1000)

      // Zeichne Raster
      for (let x = 0; x < 1000; x += 10) {
        for (let y = 0; y < 1000; y += 10) {
          ctx.fillStyle = '#111111'
          ctx.fillRect(x, y, 8, 8)
        }
      }

      // Zeichne alle Pixel
      pixels.forEach((pixel: { x: number; y: number; color: string }) => {
        ctx.fillStyle = pixel.color
        ctx.fillRect(pixel.x, pixel.y, 8, 8)
      })

      // Konvertiere zu Data URL
      const dataUrl = tempCanvas.toDataURL('image/png')

      // Speichere das Bild lokal
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `Screenshot-Epoch-${timestamp}`
      await saveImageToServer(dataUrl, filename)

      // Lade zu IPFS hoch
      const ipfsResponse = await fetch('/api/upload-to-ipfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData: dataUrl }),
      })

      if (!ipfsResponse.ok) {
        const errorData = await ipfsResponse.json()
        console.error('IPFS Upload Fehler:', errorData)
        throw new Error(`Fehler beim Hochladen zu IPFS: ${errorData.details || errorData.error || 'Unbekannter Fehler'}`)
      }

      const { ipfsUrl, ipfsHash } = await ipfsResponse.json()
      console.log('Screenshot erfolgreich zu IPFS hochgeladen:', ipfsUrl)

      // Hier können wir später die NFT-Erstellung hinzufügen
      // TODO: NFT mit ipfsHash erstellen

    } catch (error) {
      console.error('Fehler beim Erstellen des Screenshots:', error)
    }
  }

  // Normale Ansicht für lokale Entwicklung
  return (
    <div className={styles.container}>
      <Head>
        <title>Rebased Pixels</title>
        <meta name="description" content="Rebased Pixels Game" />
      </Head>

      <div className={styles.gameHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Rebased Pixels</h1>
          <div className={styles.headerActions}>
            <button onClick={handleBack} className={styles.backButton}>
              ← Back
            </button>
            <div className={styles.walletSection}>
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Timer über dem Canvas anzeigen */}
      <div className={styles.timerContainer}>
        <div className={styles.timerBox}>
          <div className={styles.timerIcon}>⏳</div>
          <div className={styles.timerText}>
            <span className={styles.timerValue}>{timeRemaining}</span>
          </div>
        </div>
      </div>

      <div className={styles.gameContent}>
        {/* Canvas-Bereich mit Farbauswahl */}
        <div className={styles.canvasContainer}>
          <div className={styles.gameInfo}>
            <h2>MULTIPLAYER MODE</h2>
            <p>Place pixels together with others. Each pixel is confirmed by a blockchain transaction.</p>
          </div>

          {isConnected ? (
            <>
              <div className={styles.controlsContainer}>
                <div>
                  <label htmlFor="colorPicker">Select color: </label>
                  <input
                    type="color"
                    id="colorPicker"
                    className={styles.colorPicker}
                    defaultValue={selectedColor}
                    onChange={handleColorChange}
                  />
                </div>
              </div>

              <div className={styles.canvasWrapper}>
                <PixelCanvas
                  pixels={pixels}
                  selectedColor={selectedColor}
                  onPixelClick={handlePixelClick}
                  colorChangeCount={canvasClearedCount}
                  width={100}
                  height={100}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.controlsContainer}>
                <div>
                  <span>Connect your wallet</span>
                </div>
              </div>

              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Connecting to server...</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gallery Button */}
      <div className={styles.galleryButtonContainer}>
        <button className={styles.galleryButton} onClick={() => router.push('/gallery')}>
          Gallery
        </button>
      </div>

      {/* Füge die neuen Buttons hinzu */}
      <div className={styles.debugControls}>
        <button 
          onClick={handleTestScreenshot}
          disabled={isEpochTransitionInProgress}
          className={styles.debugButton}
        >
          Test Screenshot
        </button>
        <button 
          onClick={handleEndEpoch}
          disabled={isEpochTransitionInProgress}
          className={styles.debugButton}
        >
          End Epoch
        </button>
      </div>
    </div>
  )
}

export default Game
