import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface PixelDataResponse {
  pixels: PixelData[];
}

interface UseSocketReturn {
  pixels: PixelData[];
  sendPixelUpdate: (data: PixelData | { reset: boolean } | PixelData[]) => void;
  isConnected: boolean;
  socket: Socket | null;
}

// Hook für die WebSocket-Kommunikation
export default function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [pixels, setPixels] = useState<PixelData[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Socket-Verbindung initialisieren
    const initSocket = async () => {
      // Socket-Endpunkt initialisieren
      await fetch('/api/socket');
      
      // Socket-Client erstellen
      const socket = io();
      socketRef.current = socket;

      // Verbindungshandling
      socket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      // Initiale Pixel-Daten empfangen
      socket.on('init-pixels', (data: PixelDataResponse) => {
        console.log('Initial pixels received:', data.pixels.length);
        setPixels(data.pixels || []);
      });

      // Neue Pixel-Updates empfangen
      socket.on('pixel-drawn', (pixel: PixelData) => {
        console.log('New pixel received:', pixel);
        
        // Pixelliste aktualisieren
        setPixels(prevPixels => {
          // Prüfen, ob das Pixel bereits existiert
          const existingIndex = prevPixels.findIndex(
            p => p.x === pixel.x && p.y === pixel.y
          );
          
          if (existingIndex >= 0) {
            // Pixel aktualisieren
            const updatedPixels = [...prevPixels];
            updatedPixels[existingIndex] = pixel;
            return updatedPixels;
          } else {
            // Neues Pixel hinzufügen
            return [...prevPixels, pixel];
          }
        });
      });

      // Event für komplettes Canvas-Reset
      socket.on('pixels-reset', () => {
        console.log('Canvas reset event received, clearing all pixels');
        setPixels([]);
      });

      // Event für Batch-Updates von Pixeln
      socket.on('pixels-batch-update', (batchPixels: PixelData[]) => {
        console.log(`Received batch update with ${batchPixels.length} pixels`);
        
        // Aktualisiere den State, indem vorhandene Pixel aktualisiert oder neue hinzugefügt werden
        setPixels(prevPixels => {
          const updatedPixels = [...prevPixels];
          
          // Für jedes Pixel im Batch
          batchPixels.forEach(newPixel => {
            // Prüfe, ob das Pixel bereits existiert
            const existingIndex = updatedPixels.findIndex(
              p => p.x === newPixel.x && p.y === newPixel.y
            );
            
            if (existingIndex >= 0) {
              // Update existierendes Pixel
              updatedPixels[existingIndex] = newPixel;
            } else {
              // Füge neues Pixel hinzu
              updatedPixels.push(newPixel);
            }
          });
          
          return updatedPixels;
        });
      });
    };

    // Socket initialisieren
    initSocket();

    // Aufräumen beim Unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Funktionen für die Interaktion mit dem Socket
  const sendPixelUpdate = (data: PixelData | { reset: boolean } | PixelData[]) => {
    if (socketRef.current && isConnected) {
      console.log('Sending pixel update:', Array.isArray(data) ? `Batch of ${data.length} pixels` : data);
      socketRef.current.emit('pixel-update', data);
    } else {
      console.warn('Socket not connected - pixel update not sent');
    }
  };

  return { 
    pixels, 
    sendPixelUpdate, 
    isConnected,
    socket: socketRef.current 
  };
} 