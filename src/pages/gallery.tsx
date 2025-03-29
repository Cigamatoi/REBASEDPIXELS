import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '~/styles/Gallery.module.css'
import pageStyles from '~/styles/PixelGame.module.css'
import Head from 'next/head'

import NFTGallery from '~/components/NFTGallery'

export default function GalleryPage() {
  const router = useRouter()

  return (
    <div className={pageStyles.gameContainer}>
      <Head>
        <title>NAKAMA - NFT Gallery</title>
        <meta name="description" content="NAKAMA Canvas Painting Gallery" />
      </Head>
      
      <div className={pageStyles.pageWrapper}>
        <header className={pageStyles.pageHeader}>
          <div className={pageStyles.headerContent}>
            <div className={pageStyles.headerTitle}>NFT GALLERY</div>
            <div className={pageStyles.headerButtons}>
              <button 
                onClick={() => router.push('/game')} 
                className={pageStyles.backButton}
              >
                ← Back to Game
              </button>
            </div>
          </div>
        </header>
        
        <main className={pageStyles.mainContent}>
          <div className={styles.galleryContainer}>
            <div className={styles.galleryInfo}>
              <h2>Previous Epochs Collection</h2>
              <p>
                Explore unique NFTs created from each completed epoch. 
                Every 10 minutes, a new piece of art is generated from the community canvas.
              </p>
            </div>
            
            <NFTGallery title="Previous Epochs Gallery" />
          </div>
        </main>
      </div>
    </div>
  )
} 