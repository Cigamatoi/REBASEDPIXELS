// WebSocket-Server mit Socket.IO
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';

const PIXELS_FILE_PATH = path.join(process.cwd(), 'public', 'pixels.json');
const EPOCH_FILE_PATH = path.join(process.cwd(), 'public', 'epoch.json');

// Default epoch duration: 24 hours (in milliseconds)
const DEFAULT_EPOCH_DURATION = 24 * 60 * 60 * 1000;
// Test epoch duration: 1 minute (for testing purposes)
const TEST_EPOCH_DURATION = 1 * 60 * 1000;

// Use test duration for development, default for production
const EPOCH_DURATION = process.env.NODE_ENV === 'production' 
  ? DEFAULT_EPOCH_DURATION 
  : TEST_EPOCH_DURATION;

// Lese Pixel-Daten
function readPixelsData() {
  try {
    const fileContent = fs.readFileSync(PIXELS_FILE_PATH, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading pixel data:', error);
    return { pixels: [] };
  }
}

// Speichere Pixel-Daten
function writePixelsData(data) {
  try {
    fs.writeFileSync(PIXELS_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing pixel data:', error);
    return false;
  }
}

// Lese Epoch-Daten
function readEpochData() {
  try {
    if (fs.existsSync(EPOCH_FILE_PATH)) {
      const fileContent = fs.readFileSync(EPOCH_FILE_PATH, 'utf8');
      const data = JSON.parse(fileContent);
      // Convert string date back to Date object
      data.currentEpochEnd = new Date(data.currentEpochEnd);
      return data;
    }
    // If file doesn't exist, create a new epoch
    return createNewEpoch();
  } catch (error) {
    console.error('Error reading epoch data:', error);
    return createNewEpoch();
  }
}

// Speichere Epoch-Daten
function writeEpochData(data) {
  try {
    fs.writeFileSync(EPOCH_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing epoch data:', error);
    return false;
  }
}

// Erstelle eine neue Epoch
function createNewEpoch() {
  const now = new Date();
  const epochData = {
    epochNumber: 1,
    currentEpochStart: now,
    currentEpochEnd: new Date(now.getTime() + EPOCH_DURATION),
    lastNftMinted: null
  };
  
  writeEpochData(epochData);
  return epochData;
}

// Check if epoch has ended and start a new one if needed
function checkAndUpdateEpoch(io) {
  const epochData = readEpochData();
  const now = new Date();
  
  // If current epoch has ended
  if (now >= epochData.currentEpochEnd) {
    console.log('Epoch ended. Creating a new epoch and minting NFT...');
    
    // Archive current pixels for NFT
    const pixelData = readPixelsData();
    const archiveFilename = `pixels-epoch-${epochData.epochNumber}.json`;
    const archivePath = path.join(process.cwd(), 'public', 'archives', archiveFilename);
    
    // Create archives directory if it doesn't exist
    const archiveDir = path.join(process.cwd(), 'public', 'archives');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // Save archive
    fs.writeFileSync(archivePath, JSON.stringify(pixelData, null, 2));
    
    // Here we would trigger the NFT minting process
    // For now, just log it
    console.log(`NFT would be minted for epoch ${epochData.epochNumber}`);
    
    // Start new epoch
    const newEpochData = {
      epochNumber: epochData.epochNumber + 1,
      currentEpochStart: now,
      currentEpochEnd: new Date(now.getTime() + EPOCH_DURATION),
      lastNftMinted: archiveFilename
    };
    
    writeEpochData(newEpochData);
    
    // Notify all clients about new epoch
    io.emit('new-epoch', {
      epochNumber: newEpochData.epochNumber,
      epochEnd: newEpochData.currentEpochEnd,
      previousNft: archiveFilename
    });
    
    return newEpochData;
  }
  
  return epochData;
}

export default function SocketHandler(req, res) {
  // Socket.io-Server bereits initialisiert?
  if (res.socket.server.io) {
    console.log('Socket already initialized');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;
  
  // Check epoch status on server start
  const epochData = checkAndUpdateEpoch(io);
  console.log(`Current epoch: ${epochData.epochNumber}, ends at: ${epochData.currentEpochEnd}`);
  
  // Set up interval for checking epoch status
  const epochCheckInterval = setInterval(() => {
    checkAndUpdateEpoch(io);
  }, 10000); // Check every 10 seconds
  
  // Clean up interval if server restarts
  res.socket.server.epochCheckInterval = epochCheckInterval;

  // Verbindungshandling
  io.on('connection', socket => {
    console.log('New socket connection:', socket.id);
    
    // Sende alle aktuellen Pixel beim Verbinden
    const pixelData = readPixelsData();
    socket.emit('init-pixels', pixelData);
    
    // Send current epoch info
    const epochData = readEpochData();
    socket.emit('epoch-info', {
      epochNumber: epochData.epochNumber,
      epochEnd: epochData.currentEpochEnd
    });
    
    // Handle Pixel-Updates
    socket.on('pixel-update', (data) => {
      // Prüfen, ob es ein Reset ist
      if (data && 'reset' in data && data.reset === true) {
        console.log('Canvas reset requested');
        
        // Pixel-Array zurücksetzen
        const pixelData = readPixelsData();
        pixelData.pixels = [];
        
        // Speichern
        if (writePixelsData(pixelData)) {
          // Alle verbundenen Clients über den Reset informieren
          io.emit('pixels-reset');
          console.log('Canvas has been reset, all pixels cleared');
        }
        return;
      }
      
      // Prüfen, ob es ein Batch-Update mit mehreren Pixeln ist
      if (Array.isArray(data)) {
        console.log(`Batch update received: ${data.length} pixels`);
        
        // Lade aktuelle Pixel-Daten
        const pixelData = readPixelsData();
        let updatedCount = 0;
        
        // Füge alle Pixel im Batch hinzu oder aktualisiere sie
        data.forEach(pixel => {
          // Prüfe, ob ein Pixel an derselben Position bereits existiert
          const existingIndex = pixelData.pixels.findIndex(
            p => p.x === pixel.x && p.y === pixel.y
          );
          
          if (existingIndex >= 0) {
            // Pixel aktualisieren
            pixelData.pixels[existingIndex] = pixel;
          } else {
            // Neues Pixel hinzufügen
            pixelData.pixels.push(pixel);
          }
          updatedCount++;
        });
        
        // Speichern
        if (writePixelsData(pixelData)) {
          // Inform alle Clients über den Batch-Update
          io.emit('pixels-batch-update', data);
          console.log(`Batch update completed: ${updatedCount} pixels updated/added`);
        }
        return;
      }
      
      // Einzelnes Pixel-Update
      console.log('Pixel update received:', data);
      
      // Füge das neue Pixel hinzu
      const pixelData = readPixelsData();
      
      // Prüfe, ob ein Pixel an derselben Position bereits existiert
      const existingIndex = pixelData.pixels.findIndex(
        p => p.x === data.x && p.y === data.y
      );
      
      if (existingIndex >= 0) {
        // Pixel aktualisieren
        pixelData.pixels[existingIndex] = data;
      } else {
        // Neues Pixel hinzufügen
        pixelData.pixels.push(data);
      }
      
      // Speichern
      if (writePixelsData(pixelData)) {
        // Sende an alle Clients
        io.emit('pixel-drawn', data);
      }
    });
    
    // Handle manual epoch check request
    socket.on('check-epoch', () => {
      const updatedEpoch = checkAndUpdateEpoch(io);
      socket.emit('epoch-info', {
        epochNumber: updatedEpoch.epochNumber,
        epochEnd: updatedEpoch.currentEpochEnd
      });
    });
    
    // Verbindungsabbau
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  console.log('WebSocket server initialized');
  res.end();
} 