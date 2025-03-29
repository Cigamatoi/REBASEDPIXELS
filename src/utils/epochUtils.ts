/**
 * Utility functions for epoch management
 */

/**
 * Default epoch duration in milliseconds (24 hours)
 */
export const DEFAULT_EPOCH_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * For testing purposes - shorter epoch duration (1 minute)
 */
export const TEST_EPOCH_DURATION = 1 * 60 * 1000; // 1 minute

/**
 * Calculate the next epoch end time
 * @param epochDuration - Duration of the epoch in milliseconds
 * @returns Date object representing the next epoch end time
 */
export const calculateNextEpochEndTime = (epochDuration: number = DEFAULT_EPOCH_DURATION): Date => {
  // For a real application we'd store the end time of the current epoch
  // and calculate from that, but for simplicity we'll calculate based on the current time
  const now = new Date();
  
  // If we want epochs to align with specific times (e.g. midnight UTC),
  // we would implement that logic here
  
  return new Date(now.getTime() + epochDuration);
};

/**
 * Calculate time remaining until the next epoch ends
 * @param epochEndTime - The time when the current epoch ends
 * @returns Object with days, hours, minutes, seconds remaining
 */
export const calculateTimeRemaining = (epochEndTime: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} => {
  const now = new Date();
  const timeRemaining = Math.max(0, epochEndTime.getTime() - now.getTime());
  
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
};

/**
 * Format epoch end time to human readable format
 * @param epochEndTime - The time when the current epoch ends
 * @returns Formatted string (e.g. "May 5, 2023 at 14:30 UTC")
 */
export const formatEpochEndTime = (epochEndTime: Date): string => {
  return epochEndTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}; 