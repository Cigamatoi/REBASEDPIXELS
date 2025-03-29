/**
 * Utility functions for NFT operations
 * 
 * Note: These are placeholder implementations for testing purposes.
 * In a production environment, we would implement actual blockchain interactions.
 */

/**
 * Simulates the NFT minting process
 * @param canvasData - Canvas data as blob or data URL
 * @param metadata - Metadata for the NFT
 * @returns Mock transaction ID
 */
export const mintNFT = async (
  canvasData: Blob | string,
  metadata: NFTMetadata
): Promise<string> => {
  // In a real implementation, this would interact with a smart contract
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('Minting NFT with metadata:', metadata);
  
  // Generate a mock transaction ID
  const txId = 'nft_' + Math.random().toString(36).substring(2, 15);
  
  return txId;
};

/**
 * Metadata structure for the NFT
 */
export interface NFTMetadata {
  title: string;
  description: string;
  epoch: number;
  createdAt: string;
  pixelCount: number;
  contributors?: string[];
}

/**
 * Generate metadata for the NFT
 */
export const generateNFTMetadata = (
  epochNumber: number,
  pixelCount: number,
  contributors: string[] = []
): NFTMetadata => {
  const now = new Date();
  
  return {
    title: `Rebased Pixels Canvas - Epoch ${epochNumber}`,
    description: `This NFT represents the collective artwork created during epoch ${epochNumber} on the Rebased Pixels platform.`,
    epoch: epochNumber,
    createdAt: now.toISOString(),
    pixelCount,
    contributors
  };
};

/**
 * Mock function to get NFT info for a specific epoch
 */
export const getNFTInfoForEpoch = async (epochNumber: number): Promise<{
  txId: string;
  imageUrl: string;
  metadata: NFTMetadata;
} | null> => {
  // In a real implementation, this would query the blockchain
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // For testing, just return mock data for epochs up to 3
  if (epochNumber > 0 && epochNumber <= 3) {
    return {
      txId: `mock_tx_${epochNumber}_${Math.random().toString(36).substring(2, 8)}`,
      imageUrl: `/images/mock-nft-${epochNumber}.png`,
      metadata: {
        title: `Rebased Pixels Canvas - Epoch ${epochNumber}`,
        description: `This NFT represents the collective artwork created during epoch ${epochNumber} on the Rebased Pixels platform.`,
        epoch: epochNumber,
        createdAt: new Date(Date.now() - epochNumber * 24 * 60 * 60 * 1000).toISOString(),
        pixelCount: 100 + epochNumber * 50,
        contributors: ['0x123...', '0x456...', '0x789...']
      }
    };
  }
  
  return null;
};

/**
 * Get all minted NFTs
 */
export const getAllNFTs = async (): Promise<{
  txId: string;
  imageUrl: string;
  metadata: NFTMetadata;
}[]> => {
  // In a real implementation, this would query the blockchain
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock data for testing
  return [1, 2, 3].map(epochNumber => ({
    txId: `mock_tx_${epochNumber}_${Math.random().toString(36).substring(2, 8)}`,
    imageUrl: `/images/mock-nft-${epochNumber}.png`,
    metadata: {
      title: `Rebased Pixels Canvas - Epoch ${epochNumber}`,
      description: `This NFT represents the collective artwork created during epoch ${epochNumber} on the Rebased Pixels platform.`,
      epoch: epochNumber,
      createdAt: new Date(Date.now() - epochNumber * 24 * 60 * 60 * 1000).toISOString(),
      pixelCount: 100 + epochNumber * 50,
      contributors: Array(5 + epochNumber).fill(0).map((_, i) => `0x${i}...`)
    }
  }));
}; 