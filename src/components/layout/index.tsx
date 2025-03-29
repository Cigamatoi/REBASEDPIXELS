import { ConnectButton } from '@iota/dapp-kit'
import styles from '~/styles/Layout.module.css'
import pixelStyles from '~/styles/PixelGame.module.css'
import React, { useEffect, useState } from 'react'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [gameFieldPosition, setGameFieldPosition] = useState<{top: number, left: number, width: number, height: number} | null>(null);
  
  // Funktion zum Messen und Aktualisieren der Spielfeldposition
  useEffect(() => {
    const updateGameFieldPosition = () => {
      const canvas = document.querySelector(`.${pixelStyles.pixelCanvas}`);
      const wrapper = document.querySelector(`.${pixelStyles.canvasWrapper}`);
      
      if (canvas && wrapper) {
        const canvasRect = canvas.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        // Wähle das größere Element für die Ausschlussfläche
        const left = Math.min(canvasRect.left, wrapperRect.left) - 37; // Vergrößerter Puffer
        const top = Math.min(canvasRect.top, wrapperRect.top) - 37;
        const width = Math.max(canvasRect.width, wrapperRect.width) + 74;
        const height = Math.max(canvasRect.height, wrapperRect.height) + 74;
        
        setGameFieldPosition({ top, left, width, height });
      }
    };
    
    // Initial und bei Größenänderung ausführen
    updateGameFieldPosition();
    window.addEventListener('resize', updateGameFieldPosition);
    
    // Nach kurzem Timeout erneut messen, falls DOM vollständig geladen
    const timeout = setTimeout(updateGameFieldPosition, 500);
    
    return () => {
      window.removeEventListener('resize', updateGameFieldPosition);
      clearTimeout(timeout);
    };
  }, []);

  // Funktion zum Erstellen von animierten Hintergrund-Sphären
  useEffect(() => {
    const createBackgroundSpheres = () => {
      const container = document.getElementById('spheres-container');
      if (!container) return;
      
      // Bestehende Sphären entfernen
      container.innerHTML = '';
      
      // Anzahl der Sphären basierend auf Bildschirmgröße
      const numberOfSpheres = Math.max(15, Math.floor(window.innerWidth / 120));
      
      for (let i = 0; i < numberOfSpheres; i++) {
        const sphere = document.createElement('div');
        sphere.className = 'sphere';
        
        // Alle Sphären starten links (mit verschiedenen Positionen)
        const horizontalPos = -20 - Math.random() * 30; // Startposition links außerhalb des Screens (-50 bis -20%)
        const top = 5 + Math.random() * 90; // 5-95% von oben
        
        // Zufällige Größe (100-250px)
        const size = 100 + Math.random() * 150;
        
        // Zufällige Start-Verzögerung
        const delay = Math.random() * 15;
        
        // Zufällige Geschwindigkeit (deutlich langsamer - für 8-10 Sekunden Dauer)
        // Berechnung: Bildschirmbreite ist ~120%, wollen 8-10s Duration, also 120/(8-10) = 12-15% pro Sekunde
        const speed = 0.008 + Math.random() * 0.004; // ~0.008-0.012% pro ms (8-12% pro Sekunde)
        
        // Zufällige Farbe (Variationen von #00ffcc)
        const hue = 160 + Math.random() * 10; // Türkis-Bereich
        const saturation = 90 + Math.random() * 10;
        const lightness = 60 + Math.random() * 15;
        const alpha = 0.3 + Math.random() * 0.3;
        
        sphere.style.top = `${top}%`;
        sphere.style.left = `${horizontalPos}%`;
        sphere.style.width = `${size}px`;
        sphere.style.height = `${size}px`;
        sphere.style.background = `radial-gradient(circle, hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha}), transparent 70%)`;
        
        // Setze benutzerdefinierte Attribute für die Animation
        sphere.setAttribute('data-speed', speed.toString());
        sphere.setAttribute('data-delay', delay.toString());
        sphere.setAttribute('data-active', 'false');
        
        container.appendChild(sphere);
      }
    };
    
    // Initial ausführen
    createBackgroundSpheres();
    
    // Bei Fenstergrößenänderung neu erstellen
    window.addEventListener('resize', createBackgroundSpheres);
    
    // Zeit seit Start
    let startTime = Date.now();
    
    // Animator für die Bewegung von links nach rechts
    const moveInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      
      const spheres = document.querySelectorAll('.sphere');
      spheres.forEach(sphere => {
        const elem = sphere as HTMLElement;
        const speed = parseFloat(elem.getAttribute('data-speed') || '0.01');
        const delay = parseFloat(elem.getAttribute('data-delay') || '0') * 1000;
        const isActive = elem.getAttribute('data-active') === 'true';
        
        // Wenn die Verzögerungszeit noch nicht abgelaufen ist, nicht bewegen
        if (!isActive && elapsedTime < delay) {
          return;
        } else if (!isActive) {
          elem.setAttribute('data-active', 'true');
        }
        
        // Aktuelle Position
        let currentLeft = parseFloat(elem.style.left);
        
        // Bewege nach rechts
        currentLeft += speed * 50; // Angepasste Geschwindigkeit 
        
        // Wenn die Sphäre rechts aus dem Bildschirm läuft, setze sie zurück an den Start
        if (currentLeft > 120) {
          currentLeft = -30 - Math.random() * 20;
          elem.style.top = `${5 + Math.random() * 90}%`; // Neue zufällige Höhe
        }
        
        // Wende die neue Position an
        elem.style.left = `${currentLeft}%`;
        
        // Sphäre verstecken, wenn sie im Spielfeldbereich ist
        if (gameFieldPosition) {
          const sphereRect = elem.getBoundingClientRect();
          const sphereCenterX = sphereRect.left + sphereRect.width / 2;
          const sphereCenterY = sphereRect.top + sphereRect.height / 2;
          
          if (
            sphereCenterX >= gameFieldPosition.left && 
            sphereCenterX <= gameFieldPosition.left + gameFieldPosition.width &&
            sphereCenterY >= gameFieldPosition.top && 
            sphereCenterY <= gameFieldPosition.top + gameFieldPosition.height
          ) {
            elem.style.opacity = '0';
          } else {
            elem.style.opacity = '0.7';
          }
        }
      });
    }, 50); // Häufigeres Update für flüssigere Animation
    
    return () => {
      window.removeEventListener('resize', createBackgroundSpheres);
      clearInterval(moveInterval);
    };
  }, [gameFieldPosition]);

  return (
    <>
      <div id="spheres-container" className="spheres-container"></div>
      <main>{children}</main>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          background-color: #0f0f1a;
          color: #e0e0e0;
          font-family: 'Orbitron', sans-serif;
          overflow-x: auto;
          position: relative;
        }
        
        .spheres-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 5;
        }
        
        .sphere {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          opacity: 0.7;
          z-index: 5;
          transition: opacity 0.3s ease-out;
        }
        
        /* Stellen sicher, dass die Hauptkarte einen Ausschnitt für die Sphären hat */
        .${pixelStyles.mainCard} {
          position: relative;
          z-index: 10;
          background-color: rgba(20, 20, 40, 0.85);
        }
        
        /* Spielfeld und dessen Rahmen sollen keine Sphären anzeigen */
        .${pixelStyles.canvasWrapper} {
          position: relative;
          z-index: 20;
          background-color: #0f0f1a;
          box-shadow: 0 0 30px rgba(0, 0, 0, 1);
          isolation: isolate;
        }
        
        .${pixelStyles.pixelCanvas} {
          position: relative;
          z-index: 25;
          background-color: #0f0f1a;
          border: 2px solid #00ffcc;
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.5);
          isolation: isolate;
        }
        
        /* IOTA dApp Kit Theme-Überschreibungen */
        :root {
          --dapp-kit-backgroundColors-primaryButton: #00ffcc;
          --dapp-kit-colors-primaryButton: white;
          --dapp-kit-backgroundColors-primaryButtonHover: #00bbaa;
          --dapp-kit-radii-full: 10px;
          --dapp-kit-fontWeights-medium: 500;
          --dapp-kit-typography-fontFamily: 'Orbitron', sans-serif;
        }

        /* Direktes Styling für den ConnectButton mit hoher Spezifität */
        :global([data-dapp-kit] .iota-connect-button button),
        :global(.iota-connect-button button),
        :global(div[class*="ConnectButton"] button),
        :global(button[class*="Button_buttonVariants"]) {
          background: linear-gradient(90deg, #00ffcc, #00bbaa) !important;
          border: none !important;
          padding: 0.75rem 1.5rem !important;
          margin-top: 0 !important;
          border-radius: 10px !important;
          color: white !important;
          font-size: 1rem !important;
          cursor: pointer !important;
          box-shadow: 0 0 12px #00ffcc !important;
          transition: transform 0.2s, box-shadow 0.3s !important;
          font-family: 'Orbitron', sans-serif !important;
        }

        :global(.headerButtons [data-dapp-kit] .iota-connect-button button),
        :global(.headerButtons .iota-connect-button button),
        :global(.headerButtons div[class*="ConnectButton"] button),
        :global(.headerButtons button[class*="Button_buttonVariants"]) {
          padding: 0.5rem 1rem !important;
          font-size: 0.9rem !important;
        }

        :global([data-dapp-kit] .iota-connect-button button:hover),
        :global(.iota-connect-button button:hover),
        :global(div[class*="ConnectButton"] button:hover),
        :global(button[class*="Button_buttonVariants"]:hover) {
          transform: scale(1.05) !important;
          box-shadow: 0 0 20px #00ffcc !important;
        }
      `}</style>
    </>
  )
}

export default Layout
