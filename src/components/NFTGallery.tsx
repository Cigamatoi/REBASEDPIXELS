import { useEffect, useState } from 'react';
import styles from '~/styles/NFTGallery.module.css';
import { NFTMetadata, getAllNFTs } from '~/utils/nftUtils';

interface NFTItem {
  txId: string;
  imageUrl: string;
  metadata: NFTMetadata;
}

interface NFTGalleryProps {
  title?: string;
  showTitle?: boolean;
}

const NFTGallery: React.FC<NFTGalleryProps> = ({ 
  title = 'NFT Gallery', 
  showTitle = true 
}) => {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        const nftData = await getAllNFTs();
        setNfts(nftData);
        setError(null);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError('Failed to load NFT gallery. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTs();
  }, []);
  
  if (loading) {
    return (
      <div className={styles.galleryContainer}>
        {showTitle && <h2 className={styles.galleryTitle}>{title}</h2>}
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading NFT Gallery...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.galleryContainer}>
        {showTitle && <h2 className={styles.galleryTitle}>{title}</h2>}
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => setLoading(true)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (nfts.length === 0) {
    return (
      <div className={styles.galleryContainer}>
        {showTitle && <h2 className={styles.galleryTitle}>{title}</h2>}
        <div className={styles.emptyContainer}>
          <p>No NFTs have been minted yet.</p>
          <p>The first NFT will be created at the end of the current epoch.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.galleryContainer}>
      {showTitle && <h2 className={styles.galleryTitle}>{title}</h2>}
      
      <div className={styles.nftGrid}>
        {nfts.map((nft) => (
          <div key={nft.txId} className={styles.nftCard}>
            <div className={styles.nftImageContainer}>
              <img 
                src={nft.imageUrl} 
                alt={nft.metadata.title}
                className={styles.nftImage}
                onError={(e) => {
                  // Fallback image if the actual image fails to load
                  e.currentTarget.src = '/images/nft-placeholder.png';
                }}
              />
            </div>
            <div className={styles.nftInfo}>
              <h3 className={styles.nftTitle}>{nft.metadata.title}</h3>
              <p className={styles.nftDescription}>{nft.metadata.description}</p>
              <div className={styles.nftMetadata}>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Epoch:</span>
                  <span className={styles.metadataValue}>{nft.metadata.epoch}</span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Pixels:</span>
                  <span className={styles.metadataValue}>{nft.metadata.pixelCount}</span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Contributors:</span>
                  <span className={styles.metadataValue}>
                    {nft.metadata.contributors?.length || 0}
                  </span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Created:</span>
                  <span className={styles.metadataValue}>
                    {new Date(nft.metadata.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <a 
                href={`https://explorer.iota.org/testnet/transaction/${nft.txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.viewTransactionButton}
              >
                View on Explorer
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NFTGallery; 