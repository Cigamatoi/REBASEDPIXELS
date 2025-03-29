import { useEffect, useState } from 'react';
import styles from '~/styles/EpochCountdown.module.css';

interface EpochCountdownProps {
  epochEndTime: Date;
  onEpochEnd?: () => void;
}

// Helper function to format time units
const formatTimeUnit = (value: number): string => {
  return value < 10 ? `0${value}` : `${value}`;
};

const EpochCountdown: React.FC<EpochCountdownProps> = ({ epochEndTime, onEpochEnd }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = epochEndTime.getTime() - now.getTime();
      
      if (difference <= 0) {
        // Epoch ended
        setTimeLeft({ hours: '00', minutes: '00', seconds: '00' });
        if (onEpochEnd) {
          onEpochEnd();
        }
        return;
      }
      
      // Calculate hours, minutes and seconds
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({
        hours: formatTimeUnit(hours),
        minutes: formatTimeUnit(minutes),
        seconds: formatTimeUnit(seconds),
      });
    };
    
    // Calculate immediately
    calculateTimeLeft();
    
    // Set up interval to update countdown
    const timerId = setInterval(calculateTimeLeft, 1000);
    
    // Clean up on unmount
    return () => clearInterval(timerId);
  }, [epochEndTime, onEpochEnd]);

  return (
    <div className={styles.countdownContainer}>
      <div className={styles.countdownTitle}>Next NFT Mint In</div>
      <div className={styles.countdownTimer}>
        <div className={styles.timeUnit}>
          <span className={styles.timeValue}>{timeLeft.hours}</span>
          <span className={styles.timeLabel}>Hours</span>
        </div>
        <div className={styles.timeSeparator}>:</div>
        <div className={styles.timeUnit}>
          <span className={styles.timeValue}>{timeLeft.minutes}</span>
          <span className={styles.timeLabel}>Minutes</span>
        </div>
        <div className={styles.timeSeparator}>:</div>
        <div className={styles.timeUnit}>
          <span className={styles.timeValue}>{timeLeft.seconds}</span>
          <span className={styles.timeLabel}>Seconds</span>
        </div>
      </div>
    </div>
  );
};

export default EpochCountdown; 