/**
 * Utility functions for canvas operations
 */

/**
 * Converts a canvas to a data URL (PNG format)
 */
export const canvasToDataURL = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png');
};

/**
 * Converts a canvas to a Blob object for file operations
 */
export const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas to Blob conversion failed'));
      }
    }, 'image/png');
  });
};

/**
 * Creates a snapshot of the current pixels on the canvas
 * @param pixels - Array of pixel data {x, y, color}
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param pixelSize - Size of each pixel square
 */
export const createCanvasSnapshot = (
  pixels: Array<{ x: number; y: number; color: string }>,
  width: number,
  height: number,
  pixelSize: number = 10
): HTMLCanvasElement => {
  // Create an off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelSize;
  canvas.height = height * pixelSize;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw each pixel
  pixels.forEach(pixel => {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(
      pixel.x * pixelSize, 
      pixel.y * pixelSize, 
      pixelSize, 
      pixelSize
    );
  });
  
  return canvas;
};

/**
 * Downloads the canvas as a PNG image
 */
export const downloadCanvasAsImage = (canvas: HTMLCanvasElement, filename: string = 'canvas-snapshot.png') => {
  const dataUrl = canvasToDataURL(canvas);
  
  // Create temporary link element to trigger download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 