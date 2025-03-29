import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import styles from '~/styles/LanguageSwitcher.module.css'

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export default function LanguageSwitcher() {
  const router = useRouter()
  const { pathname, asPath, query } = router
  const [isOpen, setIsOpen] = useState(false)
  
  // Unterstützte Sprachen
  const languages: LanguageOption[] = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ]
  
  // Aktuelle Sprache (Standard: Deutsch)
  const currentLanguage = languages.find(lang => lang.code === router.locale) || languages[0]
  
  // Sprachmenü anzeigen/verstecken
  const toggleMenu = () => setIsOpen(!isOpen)
  
  // Klick außerhalb schließt das Menü
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])
  
  // Stoppt die Event-Ausbreitung, damit das Menü nicht sofort geschlossen wird
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }
  
  // Sprache wechseln
  const changeLanguage = (locale: string) => {
    router.push({ pathname, query }, asPath, { locale })
    setIsOpen(false)
  }
  
  return (
    <div className={styles.languageSwitcher} onClick={handleMenuClick}>
      <button className={styles.currentLanguage} onClick={toggleMenu}>
        <span className={styles.flag}>{currentLanguage.flag}</span>
      </button>
      
      {isOpen && (
        <div className={styles.languageMenu}>
          {languages.map(lang => (
            <button
              key={lang.code}
              className={`${styles.languageOption} ${lang.code === currentLanguage.code ? styles.active : ''}`}
              onClick={() => changeLanguage(lang.code)}
              title={lang.name}
            >
              <span className={styles.flag}>{lang.flag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 