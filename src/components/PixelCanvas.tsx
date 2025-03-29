import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/PixelGame.module.css';

// Konstanten
const PIXEL_SIZE = 10;
const GRID_SIZE = 1000;

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface PixelCanvasProps {
  pixels: PixelData[];
  onPixelClick: (x: number, y: number) => void;
  width?: number;
  height?: number;
  pixelSize?: number;
  showGrid?: boolean;
  disabled?: boolean;
}

// Separate Canvas-Komponente, die unabhängig vom React-Lifecycle funktioniert
const PixelCanvas = ({ 
  pixels, 
  onPixelClick, 
  width = 50,
  height = 50,
  pixelSize = 10,
  showGrid = true,
  disabled = false
}: PixelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRenderedRef = useRef<boolean>(false);
  
  // Canvas-Dimensionen berechnen
  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;
  
  // Erstellt das Canvas und zeichnet das Grundraster
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Zeichne nur einmal die Basis beim ersten Render
    if (!isRenderedRef.current) {
      console.log('Initialisiere Canvas und zeichne Grundstruktur');
      
      // Hintergrund schwarz
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Graue Pixel-Raster
      if (showGrid) {
        for (let x = 0; x < canvasWidth; x += pixelSize) {
          for (let y = 0; y < canvasHeight; y += pixelSize) {
            ctx.fillStyle = '#111111';
            ctx.fillRect(x, y, pixelSize - 2, pixelSize - 2);
          }
        }
      }
      
      isRenderedRef.current = true;
    }
  }, [canvasWidth, canvasHeight, pixelSize, showGrid]);
  
  // Zeichnet alle Pixel neu, wenn sich die Pixeldaten ändern
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Grundraster neu zeichnen
    if (!isRenderedRef.current) return;
    
    // Hintergrund schwarz
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Graue Pixel-Raster
    if (showGrid) {
      for (let x = 0; x < canvasWidth; x += pixelSize) {
        for (let y = 0; y < canvasHeight; y += pixelSize) {
          ctx.fillStyle = '#111111';
          ctx.fillRect(x, y, pixelSize - 2, pixelSize - 2);
        }
      }
    }
    
    // Alle Pixel zeichnen
    console.log(`Zeichne ${pixels.length} Pixel`);
    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x, pixel.y, pixelSize - 2, pixelSize - 2);
    });
  }, [pixels, canvasWidth, canvasHeight, pixelSize, showGrid]);

  // Click-Handler-Effekt
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Click-Handler
    const handleClick = (e: MouseEvent) => {
      if (disabled) {
        console.log('Canvas ist deaktiviert');
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Auf Raster ausrichten
      const pixelX = Math.floor(x / pixelSize) * pixelSize;
      const pixelY = Math.floor(y / pixelSize) * pixelSize;
      
      onPixelClick(pixelX, pixelY);
    };
    
    // Event-Listener
    canvas.addEventListener('click', handleClick);
    
    // Cleanup
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [onPixelClick, disabled, pixelSize]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{ 
        cursor: disabled ? 'not-allowed' : 'pointer',
        imageRendering: 'pixelated',  // Für schärfere Pixeldarstellung
        border: '1px solid #333'
      }}
    />
  );
};

export default PixelCanvas; 