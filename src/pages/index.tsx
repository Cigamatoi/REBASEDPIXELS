import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Zur Startseite weiterleiten
    router.push('/start')
  }, [router])
  
  // Zeige Ladeindikator während der Weiterleitung
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: '#0f0f1a',
      color: '#00ffcc'
    }}>
      <h1>Lade REBASED PIXELS...</h1>
    </div>
  )
}
