import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const PIXELS_FILE_PATH = path.join(process.cwd(), 'public', 'pixels.json')

// Typen für die API
type Pixel = {
  x: number
  y: number
  color: string
}

type PixelsData = {
  pixels: Pixel[]
}

// Pixel-Daten lesen
function readPixelsData(): PixelsData {
  try {
    const fileContent = fs.readFileSync(PIXELS_FILE_PATH, 'utf8')
    return JSON.parse(fileContent) as PixelsData
  } catch (error) {
    console.error('Fehler beim Lesen der Pixel-Daten:', error)
    // Standarddaten zurückgeben, wenn die Datei nicht existiert
    return { pixels: [] }
  }
}

// Pixel-Daten schreiben
function writePixelsData(data: PixelsData): void {
  try {
    fs.writeFileSync(PIXELS_FILE_PATH, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Fehler beim Schreiben der Pixel-Daten:', error)
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET-Anfrage: Alle Pixel abrufen
  if (req.method === 'GET') {
    const pixelsData = readPixelsData()
    return res.status(200).json(pixelsData)
  }
  
  // POST-Anfrage: Neues Pixel hinzufügen
  if (req.method === 'POST') {
    try {
      const pixel = req.body as Pixel
      
      // Validieren
      if (typeof pixel.x !== 'number' || typeof pixel.y !== 'number' || !pixel.color) {
        return res.status(400).json({ error: 'Ungültige Pixel-Daten' })
      }
      
      // Zum Array hinzufügen
      const pixelsData = readPixelsData()
      
      // Prüfen, ob ein Pixel an derselben Position bereits existiert
      const existingIndex = pixelsData.pixels.findIndex(
        p => p.x === pixel.x && p.y === pixel.y
      )
      
      if (existingIndex >= 0) {
        // Vorhandenes Pixel aktualisieren
        pixelsData.pixels[existingIndex] = pixel
      } else {
        // Neues Pixel hinzufügen
        pixelsData.pixels.push(pixel)
      }
      
      // Speichern
      writePixelsData(pixelsData)
      
      return res.status(200).json({ success: true, pixel })
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Anfrage:', error)
      return res.status(500).json({ error: 'Interner Serverfehler' })
    }
  }
  
  // Andere Methoden
  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Methode ${req.method} nicht erlaubt`)
} 