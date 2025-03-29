import { useEffect, useState } from 'react';
import useSocket from './useSocket';

export interface EpochInfo {
  epochNumber: number;
  epochEnd: Date;
}

/**
 * Hook to get and track epoch information
 */
export default function useEpoch() {
  const { socket, isConnected } = useSocket();
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    // Handler for receiving epoch info
    const handleEpochInfo = (data: any) => {
      console.log('Received epoch info:', data);
      setEpochInfo({
        epochNumber: data.epochNumber,
        epochEnd: new Date(data.epochEnd)
      });
      setLoading(false);
    };
    
    // Handler for new epoch events
    const handleNewEpoch = (data: any) => {
      console.log('New epoch started:', data);
      setEpochInfo({
        epochNumber: data.epochNumber,
        epochEnd: new Date(data.epochEnd)
      });
      
      // Here you could show a notification or trigger other actions
      // when a new epoch starts
    };
    
    // Register event handlers
    socket.on('epoch-info', handleEpochInfo);
    socket.on('new-epoch', handleNewEpoch);
    
    // Request current epoch info
    socket.emit('check-epoch');
    
    // Cleanup
    return () => {
      socket.off('epoch-info', handleEpochInfo);
      socket.off('new-epoch', handleNewEpoch);
    };
  }, [socket, isConnected]);
  
  // Function to manually request epoch info update
  const refreshEpochInfo = () => {
    if (socket && isConnected) {
      socket.emit('check-epoch');
    }
  };
  
  return {
    epochInfo,
    loading,
    refreshEpochInfo
  };
} 