
import { addDays, format, isAfter, isBefore } from 'date-fns';

export interface QueueUnlockInfo {
  isUnlocked: boolean;
  unlockDate: Date | null;
  daysUntilUnlock: number;
  formattedUnlockDate: string;
}

export const calculateQueueUnlock = (
  cycleStartDate: string | null,
  currentDay: number
): QueueUnlockInfo => {
  if (!cycleStartDate) {
    return {
      isUnlocked: false,
      unlockDate: null,
      daysUntilUnlock: 0,
      formattedUnlockDate: 'Unknown'
    };
  }

  const cycleStart = new Date(cycleStartDate);
  const unlockDate = addDays(cycleStart, 24); // Queue unlocks on day 24
  const today = new Date();
  
  const isUnlocked = currentDay >= 24 && currentDay <= 30;
  const daysUntilUnlock = Math.max(0, 24 - currentDay);
  
  return {
    isUnlocked,
    unlockDate,
    daysUntilUnlock,
    formattedUnlockDate: format(unlockDate, 'MMMM d, yyyy')
  };
};
