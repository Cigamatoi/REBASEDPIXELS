// Annahme, dass der Socket.io Server hier definiert ist
// ... existing code ...

// Erweitere den Socket-Handler für das Zurücksetzen der Pixel
socket.on('pixel-update', (data) => {
  // Prüfen ob es ein Reset ist
  if ('reset' in data && data.reset === true) {
    console.log('Canvas reset requested');
    // Pixel-Array zurücksetzen
    pixels = [];
    // Allen verbundenen Clients mitteilen, dass das Canvas zurückgesetzt wurde
    io.emit('pixel-update', { reset: true });
    return;
  }
  
  // Normales Pixel-Update
  // ... existing code ...
});

// ... existing code ... 