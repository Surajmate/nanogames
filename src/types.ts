export type BigSmallOption = 'Big' | 'Small';
export type ColorOption = 'Red' | 'Green' | 'Violet' | 'Red-Violet' | 'Green-Violet';

export interface GameRound {
  period: string;
  number: number;
  bigSmall: BigSmallOption;
  colors: ColorOption[];
  timestamp: string;
}

export type BetType = 'NUMBER' | 'BIG_SMALL';

export interface UserBet {
  id: string;
  period: string;
  timestamp: string;
  betType: BetType;
  target: string; // "0" - "9", "Big", or "Small"
  betAmount: number;
  multiplier: number;
  outcomeNumber?: number;
  outcomeBigSmall?: BigSmallOption;
  status: 'PENDING' | 'WON' | 'LOST';
  payoutAmount?: number; // original bet + 60% if won
}

export interface Withdrawal {
  id: string;
  amount: number;
  address: string;
  timestamp: string;
  status: 'PENDING' | 'PROCESSED';
}

export interface Deposit {
  id: string;
  amount: number;
  utr: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface WalletState {
  balance: number;
  withdrawals: Withdrawal[];
  deposits: Deposit[];
}
