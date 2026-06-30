import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, Trophy, History, ArrowUpRight, RefreshCw, Volume2, VolumeX,
  Play, Check, AlertCircle, Info, Lock, Zap, Wallet, QrCode, Copy, ArrowDownToLine
} from 'lucide-react';
import { GameRound, UserBet, Withdrawal, Deposit, BigSmallOption, ColorOption } from './types';

export default function App() {
  // --- CORE SYSTEM STATES ---
  const [wallet, setWallet] = useState<number>(500);
  const [currentPeriod, setCurrentPeriod] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(15);
  
  // Game States: 
  // 'BETTING': Countdown from 15 to 0. Betting allowed.
  // 'ROLLING': Shuffling numbers (1.5 seconds). Timer paused. Betting locked.
  // 'SHOWING_RESULT': Showing winning orb and result toast (5 seconds). Timer paused. Betting locked.
  const [gameState, setGameState] = useState<'BETTING' | 'ROLLING' | 'SHOWING_RESULT'>('BETTING');
  
  const [pastRounds, setPastRounds] = useState<GameRound[]>([]);
  const [activeBets, setActiveBetsState] = useState<UserBet[]>([]);
  const activeBetsRef = useRef<UserBet[]>([]);
  
  const setActiveBets = (newBets: UserBet[] | ((prev: UserBet[]) => UserBet[])) => {
    if (typeof newBets === 'function') {
      setActiveBetsState(prev => {
        const updated = newBets(prev);
        activeBetsRef.current = updated;
        return updated;
      });
    } else {
      setActiveBetsState(newBets);
      activeBetsRef.current = newBets;
    }
  };

  const [betHistory, setBetHistory] = useState<UserBet[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<Withdrawal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  
  // UI & Personalization Settings
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<'game' | 'deposit' | 'withdraw' | 'history'>('game');
  const [historySubTab, setHistorySubTab] = useState<'rounds' | 'bets' | 'chart'>('rounds');

  // Betting Selections
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [selectedBS, setSelectedBS] = useState<BigSmallOption | null>(null);
  const [baseBet, setBaseBet] = useState<number>(10);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customBetInput, setCustomBetInput] = useState<string>("");

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isDepositing, setIsDepositing] = useState<boolean>(false);

  // Withdrawal Form State
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);

  // Drawing Animations & Sound Refs
  const [rollNumber, setRollNumber] = useState<number>(0);
  const [latestRoundResult, setLatestRoundResult] = useState<GameRound | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Helper to trigger custom popup toasts
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  // Safe sound synthesizer using Web Audio API
  const playSound = (type: 'tick' | 'roll' | 'win' | 'lose' | 'click' | 'deposit') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'roll') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'win') {
        const now = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'deposit') {
        const now = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.15); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'lose') {
        const now = ctx.currentTime;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.linearRampToValueAtTime(110, now + 0.35); // A2
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (err) {
      console.warn("Audio Context blocked:", err);
    }
  };

  // Helper: Details of numbers (Odd/Even/Colors)
  const getNumberDetails = (num: number): { bigSmall: BigSmallOption; colors: ColorOption[] } => {
    const bigSmall: BigSmallOption = num >= 5 ? 'Big' : 'Small';
    let colors: ColorOption[] = [];
    if (num === 0) {
      colors = ['Red-Violet'];
    } else if (num === 5) {
      colors = ['Green-Violet'];
    } else if (num % 2 === 0) {
      colors = ['Red'];
    } else {
      colors = ['Green'];
    }
    return { bigSmall, colors };
  };

  // Helper: Sequence generator for periods
  const generatePeriodCode = (offset: number = 0): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequenceBase = 10001000;
    const finalSeq = sequenceBase + offset;
    return `${year}${month}${day}${finalSeq}`;
  };

  // --- PERSISTENCE: LOAD STATE ---
  useEffect(() => {
    try {
      const savedWallet = localStorage.getItem('nano_lottery_wallet');
      const savedHistory = localStorage.getItem('nano_lottery_bet_history');
      const savedWithdraws = localStorage.getItem('nano_lottery_withdrawals');
      const savedDeposits = localStorage.getItem('nano_lottery_deposits');
      const savedRounds = localStorage.getItem('nano_lottery_past_rounds');
      const savedPeriod = localStorage.getItem('nano_lottery_current_period');

      if (savedWallet) setWallet(parseFloat(savedWallet));
      if (savedHistory) setBetHistory(JSON.parse(savedHistory));
      if (savedWithdraws) setWithdrawRequests(JSON.parse(savedWithdraws));
      if (savedDeposits) setDeposits(JSON.parse(savedDeposits));

      if (savedRounds) {
        setPastRounds(JSON.parse(savedRounds));
      } else {
        // Pre-populate with realistic starter rounds
        const seedRounds: GameRound[] = [
          { period: generatePeriodCode(124), number: 3, bigSmall: 'Small', colors: ['Green'], timestamp: new Date(Date.now() - 30000).toISOString() },
          { period: generatePeriodCode(123), number: 8, bigSmall: 'Big', colors: ['Red'], timestamp: new Date(Date.now() - 60000).toISOString() },
          { period: generatePeriodCode(122), number: 5, bigSmall: 'Big', colors: ['Green-Violet'], timestamp: new Date(Date.now() - 90000).toISOString() },
          { period: generatePeriodCode(121), number: 0, bigSmall: 'Small', colors: ['Red-Violet'], timestamp: new Date(Date.now() - 120000).toISOString() },
          { period: generatePeriodCode(120), number: 2, bigSmall: 'Small', colors: ['Red'], timestamp: new Date(Date.now() - 150000).toISOString() },
          { period: generatePeriodCode(119), number: 7, bigSmall: 'Big', colors: ['Green'], timestamp: new Date(Date.now() - 180000).toISOString() },
        ];
        setPastRounds(seedRounds);
      }

      if (savedPeriod) {
        setCurrentPeriod(savedPeriod);
      } else {
        setCurrentPeriod(generatePeriodCode(125));
      }
    } catch (err) {
      console.error("Local state parsing error:", err);
    }
  }, []);

  // --- PERSISTENCE: SAVE STATE ---
  useEffect(() => {
    try {
      localStorage.setItem('nano_lottery_wallet', wallet.toString());
      localStorage.setItem('nano_lottery_bet_history', JSON.stringify(betHistory));
      localStorage.setItem('nano_lottery_withdrawals', JSON.stringify(withdrawRequests));
      localStorage.setItem('nano_lottery_deposits', JSON.stringify(deposits));
      localStorage.setItem('nano_lottery_past_rounds', JSON.stringify(pastRounds));
      localStorage.setItem('nano_lottery_current_period', currentPeriod);
    } catch (err) {
      console.error("Local state saving error:", err);
    }
  }, [wallet, betHistory, withdrawRequests, deposits, pastRounds, currentPeriod]);

  // --- CORE TICKING TIMER (15s CYCLE) ---
  useEffect(() => {
    if (!currentPeriod || gameState !== 'BETTING') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Trigger the 3-step lifecycle: Betting Finished -> Shuffle/Roll -> Show Result -> Start next period
          clearInterval(interval);
          startLotteryDrawing();
          return 0;
        }
        if (prev <= 4) {
          playSound('tick');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPeriod, gameState]);

  // --- STEP 1: SHUFFLE & SPINNING NUMBERS (1.5 SECONDS) ---
  const startLotteryDrawing = () => {
    setGameState('ROLLING');
    let spinCounter = 0;
    const totalSpins = 12;

    const spinInterval = setInterval(() => {
      setRollNumber(Math.floor(Math.random() * 10));
      playSound('roll');
      spinCounter++;

      if (spinCounter >= totalSpins) {
        clearInterval(spinInterval);
        resolveLotteryRound();
      }
    }, 120);
  };

  // --- STEP 2: DRAW OUTCOME & RESOLVE PAYOUTS ---
  const resolveLotteryRound = () => {
    const luckyNumber = Math.floor(Math.random() * 10);
    const { bigSmall, colors } = getNumberDetails(luckyNumber);

    const activePeriodResult: GameRound = {
      period: currentPeriod,
      number: luckyNumber,
      bigSmall,
      colors,
      timestamp: new Date().toISOString()
    };

    setLatestRoundResult(activePeriodResult);
    setPastRounds(prev => [activePeriodResult, ...prev]);

    // Resolve active bets on this round
    let payoutAmount = 0;
    let originalStakes = 0;
    let wonCount = 0;

    const resolvedBets = activeBetsRef.current.map(bet => {
      let isWin = false;
      if (bet.betType === 'NUMBER') {
        isWin = parseInt(bet.target, 10) === luckyNumber;
      } else {
        isWin = bet.target === bigSmall;
      }

      const totalBetValue = bet.betAmount * bet.multiplier;
      originalStakes += totalBetValue;

      // Payout multiplier: 9x for guessing exact number, 2x for guessing big/small category
      const multiplierRate = bet.betType === 'NUMBER' ? 9 : 2;
      const payout = isWin ? Math.round(totalBetValue * multiplierRate) : 0;
      if (isWin) {
        payoutAmount += payout;
        wonCount++;
      }

      return {
        ...bet,
        status: (isWin ? 'WON' : 'LOST') as 'WON' | 'LOST',
        outcomeNumber: luckyNumber,
        outcomeBigSmall: bigSmall,
        payoutAmount: payout
      };
    });

    // Update Bet Logs & Account Balance
    if (resolvedBets.length > 0) {
      setBetHistory(prev => [...resolvedBets, ...prev]);
    }

    if (payoutAmount > 0) {
      setWallet(prev => prev + payoutAmount);
      const netProfit = payoutAmount - originalStakes;
      if (netProfit >= 0) {
        showToast(`🏆 WON! Received ₹${payoutAmount} (Net Profit: +₹${netProfit}) on ${wonCount} bet(s)!`, 'success');
      } else {
        showToast(`🏆 WON! Received ₹${payoutAmount} (Return on bets) on ${wonCount} bet(s)!`, 'success');
      }
      playSound('win');
    } else if (activeBetsRef.current.length > 0) {
      showToast(`❌ Drew Number ${luckyNumber} (${bigSmall}). You lost ₹${originalStakes}.`, 'error');
      playSound('lose');
    } else {
      showToast(`System Draw Completed: Number ${luckyNumber} (${bigSmall}) selected.`, 'info');
    }

    // Reset active bets
    setActiveBets([]);
    
    // Transition to 'SHOWING_RESULT' (Shows the banner and pauses for 5 seconds)
    setGameState('SHOWING_RESULT');

    // After 5 seconds, begin next period
    setTimeout(() => {
      // Advance period sequence
      const seq = parseInt(currentPeriod.slice(-4), 10);
      setCurrentPeriod(generatePeriodCode(seq + 1));
      setTimeLeft(15);
      setLatestRoundResult(null);
      setGameState('BETTING');
    }, 5000);
  };

  // --- AUTOMATED BET PLACEMENT ENGINE ---
  const handleSelectNumber = (num: number) => {
    if (gameState !== 'BETTING') {
      showToast("Draw is in progress! Betting is closed until next round.", "error");
      return;
    }

    const betAmount = 10;
    if (wallet < betAmount) {
      showToast(`Insufficient funds! Your wallet balance is ₹${wallet}.`, "error");
      return;
    }

    const newBet: UserBet = {
      id: `bet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      period: currentPeriod,
      timestamp: new Date().toISOString(),
      betType: 'NUMBER',
      target: num.toString(),
      betAmount: betAmount,
      multiplier: 1,
      status: 'PENDING'
    };

    setWallet(prev => prev - betAmount);
    setActiveBets(prev => [...prev, newBet]);
    showToast(`₹10 bet placed successfully on Number ${num}!`, "success");
    playSound('click');
  };

  // --- INSTANT QR CODE DEPOSIT ENGINE (WITH 12s SIMULATED APPROVAL) ---
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.length < 8) {
      showToast("Please enter a valid 12-digit UPI UTR Transaction Number!", "error");
      return;
    }

    if (depositAmount < 100) {
      showToast("Minimum deposit amount is ₹100 Rs.", "error");
      return;
    }

    setIsDepositing(true);

    const newDeposit: Deposit = {
      id: `dep-${Date.now()}`,
      amount: depositAmount,
      utr: utrNumber,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    setDeposits(prev => [newDeposit, ...prev]);
    showToast(`Deposit submitted! Verifying UTR ${utrNumber}. Approved in under 20 mins.`, 'info');
    playSound('click');

    const submittedUtr = utrNumber;
    const submittedAmount = depositAmount;
    const depId = newDeposit.id;

    // Reset inputs
    setUtrNumber("");
    setIsDepositing(false);

    // Dynamic high-fidelity simulator: Approve deposit after 12 seconds
    setTimeout(() => {
      setDeposits(prev => 
        prev.map(d => d.id === depId ? { ...d, status: 'APPROVED' } : d)
      );
      setWallet(prev => prev + submittedAmount);
      showToast(`💰 Payment Approved! ₹${submittedAmount} Rs credited successfully via UTR: ${submittedUtr}!`, 'success');
      playSound('deposit');
    }, 12000);
  };

  // --- PAYOUT WITHDRAWAL SUBMISSION ---
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAddress.trim()) {
      showToast("Please enter a valid UPI Address (e.g., name@upi)!", "error");
      return;
    }

    if (wallet < 500) {
      showToast("Withdrawal locked! Wallet must have at least ₹500 to extract funds.", "error");
      return;
    }

    if (withdrawAmount < 500) {
      showToast("Minimum withdrawal limit is ₹500 Rs.", "error");
      return;
    }

    if (withdrawAmount > wallet) {
      showToast(`Insufficient balance! Maximum withdrawable amount is ₹${wallet}.`, "error");
      return;
    }

    const newWithdraw: Withdrawal = {
      id: `wth-${Date.now()}`,
      amount: withdrawAmount,
      address: withdrawAddress,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    setWallet(prev => prev - withdrawAmount);
    setWithdrawRequests(prev => [newWithdraw, ...prev]);
    showToast(`Withdrawal requested for ₹${withdrawAmount}. Processed shortly!`, 'success');
    playSound('click');

    const wthId = newWithdraw.id;
    // Auto process withdrawal after 10 seconds
    setTimeout(() => {
      setWithdrawRequests(prev => 
        prev.map(w => w.id === wthId ? { ...w, status: 'PROCESSED' } : w)
      );
      showToast(`💸 UPI Withdrawal of ₹${withdrawAmount} processed and dispatched to ${withdrawAddress}!`, 'success');
      playSound('win');
    }, 10000);
  };

  // Clear or Reset State
  const handleResetData = () => {
    setWallet(500);
    setBetHistory([]);
    setActiveBets([]);
    setWithdrawRequests([]);
    setDeposits([]);
    showToast("Data storage cleared. Welcome to Nano Games!", "info");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied: ${text}`, 'success');
    playSound('click');
  };

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-[#0B0F19] text-white flex flex-col justify-between overflow-hidden relative border-x border-slate-900 shadow-2xl selection:bg-rose-500">
      
      {/* POPUP TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-16 left-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border font-bold text-xs tracking-wide ${
              toast.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200' 
                : toast.type === 'error' 
                  ? 'bg-rose-950/95 border-rose-500 text-rose-200' 
                  : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'success' && <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span className="flex-1 text-center">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER: Ultra compact brand bar */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-rose-500/20">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-widest text-slate-100 font-sans uppercase">
              Nano Games
            </span>
            <span className="text-[8px] font-mono font-bold text-rose-500 tracking-wider">
              15s HIGH-SPEED WINGO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button 
            onClick={() => {
              setIsMuted(!isMuted);
              showToast(isMuted ? "Sound effects enabled." : "Sound effects muted.", "info");
            }}
            className="p-1.5 bg-slate-800/50 hover:bg-slate-800 active:scale-95 border border-slate-700/60 rounded-lg text-slate-300"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
          </button>
          
          {/* Reset button */}
          <button 
            onClick={handleResetData}
            className="p-1.5 bg-slate-800/50 hover:bg-slate-800 active:scale-95 border border-slate-700/60 rounded-lg text-slate-300"
            title="Reset Wallet & State"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MID-SCREEN: VIEW CONTAINER FOR MAIN CONTENT TABS (Fits precisely in viewport) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 bg-[#090D16] space-y-2 pb-4 scrollbar-none">
        
        {/* TAB 1: LOTTERY GAME SCREEN */}
        {activeNavTab === 'game' && (
          <div className="space-y-2.5">
            
            {/* COMPACT CLOCK & WALLET BENTO BANNER */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* Wallet Card */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                    Wallet Funds
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                      ₹{wallet.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase">
                      INR
                    </span>
                  </div>
                </div>
                
                {/* Free Credits helper */}
                {wallet < 20 ? (
                  <button 
                    onClick={() => {
                      setWallet(prev => prev + 250);
                      showToast("Claimed ₹250 free test coins!", "success");
                      playSound('win');
                    }}
                    className="mt-1.5 w-full py-1 text-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[9px] transition-colors"
                  >
                    Get Free ₹250 Aid
                  </button>
                ) : (
                  <span className="text-[7.5px] text-slate-500 font-medium block mt-1.5 leading-tight">
                    *Min ₹500 withdrawal threshold.
                  </span>
                )}
              </div>

              {/* Countdown Card */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between items-center text-center">
                <div className="w-full flex-1 flex flex-col justify-center items-center">
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    Period {currentPeriod ? currentPeriod.slice(-4) : "---"}
                  </span>
                  
                  {gameState === 'BETTING' ? (
                    <div className="flex flex-col items-center justify-center my-auto py-1">
                      <span className={`text-xl font-mono font-black tracking-tight ${timeLeft <= 4 ? 'text-rose-500 animate-ping' : 'text-slate-100'}`}>
                        00:{String(timeLeft).padStart(2, '0')}
                      </span>
                    </div>
                  ) : gameState === 'ROLLING' ? (
                    <div className="flex flex-col items-center justify-center my-auto py-0.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-dashed border-amber-400 flex items-center justify-center text-sm font-black text-amber-300 animate-spin">
                        {rollNumber}
                      </div>
                      <span className="text-[7.5px] font-mono font-bold text-amber-400 mt-1 uppercase tracking-wider animate-pulse">
                        🎰 DRAWING
                      </span>
                    </div>
                  ) : (
                    // SHOWING_RESULT
                    latestRoundResult && (
                      <div className="flex flex-col items-center justify-center my-auto">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-xl relative border border-white/40 ${
                          latestRoundResult.number === 0 
                            ? 'bg-gradient-to-tr from-rose-500 via-purple-500 to-indigo-500'
                            : latestRoundResult.number === 5 
                              ? 'bg-gradient-to-tr from-emerald-500 via-purple-500 to-indigo-500'
                              : latestRoundResult.number % 2 === 0 
                                ? 'bg-rose-500' 
                                : 'bg-emerald-500'
                        }`}>
                          <span className="drop-shadow-lg">{latestRoundResult.number}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 font-mono text-[8px] font-extrabold">
                          <span className={`${latestRoundResult.bigSmall === 'Big' ? 'text-amber-400' : 'text-sky-400'} uppercase`}>{latestRoundResult.bigSmall}</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-300">{latestRoundResult.colors.join('&')}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <span className="text-[7.5px] text-slate-400 font-semibold uppercase tracking-wider mt-1 block">
                  {gameState === 'BETTING' ? 'Betting Open' : 'Betting Closed'}
                </span>
              </div>

            </div>

            {/* NUMBERS SELECTOR BLOCK */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-rose-500" /> Tap any number to bet ₹10 instantly
                </span>
                {activeBets.length > 0 && (
                  <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    Betting Queue: ₹{activeBets.reduce((acc, c) => acc + (c.betAmount * c.multiplier), 0)}
                  </span>
                )}
              </div>

              {/* Number buttons (Compact rows for mobile single screen) */}
              <div className="grid grid-cols-5 gap-2.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const numActiveBetAmount = activeBets.filter(b => b.target === num.toString() && b.betType === 'NUMBER').reduce((acc, b) => acc + b.betAmount, 0);
                  const hasBet = numActiveBetAmount > 0;

                  let bgColors = "from-rose-500 to-rose-600";
                  if (num === 0) {
                    bgColors = "from-purple-500 via-pink-500 to-rose-500";
                  } else if (num === 5) {
                    bgColors = "from-emerald-500 via-teal-500 to-purple-500";
                  } else if (num % 2 === 0) {
                    bgColors = "from-rose-500 to-rose-600";
                  } else {
                    bgColors = "from-emerald-500 to-emerald-600";
                  }

                  return (
                    <button
                      key={num}
                      onClick={() => handleSelectNumber(num)}
                      disabled={gameState !== 'BETTING'}
                      className={`relative aspect-square rounded-full flex items-center justify-center font-black text-lg transition-all focus:outline-none cursor-pointer ${
                        gameState !== 'BETTING' 
                          ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500' 
                          : hasBet 
                            ? 'ring-4 ring-offset-2 ring-offset-[#0B0F19] ring-pink-500 scale-105 shadow-xl bg-gradient-to-tr ' + bgColors + ' text-white' 
                            : 'hover:scale-105 bg-gradient-to-tr ' + bgColors + ' text-white active:scale-95'
                      }`}
                    >
                      <span className="absolute inset-x-1 top-0.5 h-1.5 rounded-full bg-white/20 blur-[0.5px]" />
                      <span className="drop-shadow-md">{num}</span>
                      
                      {hasBet && (
                        <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-950 font-mono font-black text-[8px] px-1.5 py-0.5 rounded-full border border-slate-950 shadow-md flex items-center justify-center min-w-[20px] h-4 leading-none">
                          ₹{numActiveBetAmount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active bets info summary inside block */}
              {activeBets.length > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-xl text-[10px] text-emerald-400 font-bold flex justify-between items-center animate-fade-in">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    ⚡ {activeBets.length} Bet(s) active on this Period
                  </span>
                  <span className="font-mono text-slate-100">Total: ₹{activeBets.reduce((acc, c) => acc + (c.betAmount * c.multiplier), 0)}</span>
                </div>
              )}
            </div>

            {/* RECENT DRAW HISTORY TABLE */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-rose-500" /> Recent Draw History
                </span>
                <span className="text-[8px] font-mono text-slate-500">
                  Last {Math.min(pastRounds.length, 10)} rounds
                </span>
              </div>

              <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/20">
                <table className="w-full border-collapse text-left font-sans">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-[8px] font-mono text-slate-500 uppercase">
                      <th className="py-1.5 px-3">Period</th>
                      <th className="py-1.5 px-3 text-center">Number</th>
                      <th className="py-1.5 px-3 text-center">My Result</th>
                      <th className="py-1.5 px-3 text-right">Color</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {pastRounds.slice(0, 10).map((round, idx) => {
                      let bgOrb = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                      if (round.number === 0) {
                        bgOrb = "bg-gradient-to-r from-purple-500/10 to-rose-500/10 text-rose-400 border border-rose-500/20";
                      } else if (round.number === 5) {
                        bgOrb = "bg-gradient-to-r from-purple-500/10 to-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      } else if (round.number % 2 === 0) {
                        bgOrb = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                      } else {
                        bgOrb = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      }

                      // Find if user placed any bets on this round
                      const roundBets = betHistory.filter(b => b.period === round.period);
                      let resultBadge = <span className="text-slate-600">-</span>;
                      if (roundBets.length > 0) {
                        const totalWon = roundBets.reduce((acc, b) => acc + (b.status === 'WON' ? b.payoutAmount : 0), 0);
                        const totalBet = roundBets.reduce((acc, b) => acc + (b.betAmount * b.multiplier), 0);
                        if (totalWon > 0) {
                          resultBadge = (
                            <span className="text-emerald-400 font-extrabold text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                              WON (+₹{totalWon - totalBet})
                            </span>
                          );
                        } else {
                          resultBadge = (
                            <span className="text-rose-500 font-extrabold text-[9px] bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md">
                              LOST (-₹{totalBet})
                            </span>
                          );
                        }
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-900/40 text-[10px] font-mono">
                          <td className="py-1.5 px-3 text-slate-400 font-bold">{round.period.slice(-4)}</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[11px] ${bgOrb}`}>
                              {round.number}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {resultBadge}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <div className="flex justify-end gap-1">
                              {round.colors.map((c, i) => (
                                <span 
                                  key={i} 
                                  className="w-2.5 h-2.5 rounded-full border border-slate-900 inline-block" 
                                  style={{
                                    backgroundColor: c.includes('Violet') ? '#A855F7' : c.includes('Green') ? '#10B981' : '#EF4444'
                                  }} 
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: INTERACTIVE DEPOSIT VIEW */}
        {activeNavTab === 'deposit' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <QrCode className="w-5 h-5 text-rose-500" />
              <div className="text-left">
                <h2 className="text-xs font-black uppercase tracking-wide">
                  Deposit Funds UPI Gateway
                </h2>
                <span className="text-[8px] font-mono text-slate-400 block uppercase">
                  Automatic approvals in seconds!
                </span>
              </div>
            </div>

            {/* UPI SCAN QR CODE CARD */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col items-center gap-2.5 text-center">
              
              {/* Scan description */}
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
                Scan QR Code to pay ₹{depositAmount} Rs
              </span>

              {/* Render QR code via secure free API */}
              <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-lg relative border border-slate-800">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0F172A&data=${encodeURIComponent(`upi://pay?pa=pay.nanogames@ybl&pn=NanoGames&am=${depositAmount}&cu=INR`)}`}
                  alt="UPI Deposit QR Code"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Merchant UPI copy row */}
              <div className="w-full flex justify-between items-center bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px]">
                <div className="flex flex-col text-left">
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase">Receiver UPI address</span>
                  <span className="font-bold text-slate-300 font-mono">pay.nanogames@ybl</span>
                </div>
                <button 
                  onClick={() => copyToClipboard("pay.nanogames@ybl")}
                  className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* CHOOSE AMOUNT & SUBMIT FORM */}
            <form onSubmit={handleDepositSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  1. Choose Deposit Amount (₹)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[100, 500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setDepositAmount(val);
                      }}
                      className={`py-1 rounded-lg border text-[11px] font-extrabold cursor-pointer transition-all ${
                        depositAmount === val
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  2. Enter 12-Digit Payment UTR Number
                </label>
                <input
                  type="text"
                  required
                  pattern="\d*"
                  maxLength={12}
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 359102485961"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl h-9 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono font-bold"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isDepositing}
                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-xs uppercase rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>{isDepositing ? "Submitting..." : `Submit Deposit (₹${depositAmount})`}</span>
              </button>
              
              <div className="bg-slate-950 p-2 rounded-xl text-[8.5px] text-slate-400 border border-slate-800 flex gap-2 items-center">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>⚠️ Submit UTR only after paying with your bank app. Deposit will be approved under 20 mins.</span>
              </div>
            </form>

            {/* DEPOSITS HISTORY LOG */}
            {deposits.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <span className="text-[8px] font-mono font-bold text-slate-500 block uppercase">
                  Pending/Approved Deposits
                </span>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-none">
                  {deposits.map((dep) => (
                    <div key={dep.id} className="flex justify-between items-center text-[10px] bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                      <div className="text-left font-mono">
                        <span className="font-extrabold text-slate-200">₹{dep.amount} Rs</span>
                        <span className="text-slate-500 block text-[8px]">UTR: {dep.utr}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black ${
                        dep.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}>
                        {dep.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: WITHDRAW PAYMENT VIEW */}
        {activeNavTab === 'withdraw' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Wallet className="w-5 h-5 text-rose-500" />
              <div className="text-left">
                <h2 className="text-xs font-black uppercase tracking-wide">
                  Withdrawal Gateways
                </h2>
                <span className="text-[8px] font-mono text-slate-400 block uppercase">
                  Direct Bank/UPI Dispatcher
                </span>
              </div>
            </div>

            {/* Wallet Locked notice */}
            {wallet < 500 && (
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center text-slate-400 text-[10px] leading-relaxed">
                <Lock className="w-5 h-5 mx-auto mb-2 text-rose-500 animate-pulse" />
                <p className="font-extrabold text-slate-200 mb-0.5">Withdrawal Gateway Locked</p>
                Required balance of <strong className="text-rose-500">₹500 Rs</strong> must be reached. Re-enter the lottery games and build your score.
              </div>
            )}

            {/* Withdraw form */}
            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  1. Enter UPI ID or Payee Account
                </label>
                <input
                  type="text"
                  required
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="e.g. name@upi or AccountNo_IFSC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl h-9 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  2. Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  max={wallet}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl h-9 px-3 text-xs text-white focus:outline-none focus:border-rose-500 font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={wallet < 500}
                className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white font-black text-xs uppercase rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Submit Withdrawal</span>
              </button>
            </form>

            {/* Withdrawal logs */}
            {withdrawRequests.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <span className="text-[8px] font-mono font-bold text-slate-500 block uppercase">
                  Extraction Logs
                </span>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-none">
                  {withdrawRequests.map((req) => (
                    <div key={req.id} className="flex justify-between items-center text-[10px] bg-slate-950 p-2 rounded-xl border border-slate-800/60 font-mono">
                      <div className="text-left">
                        <span className="font-extrabold text-slate-200">₹{req.amount} Rs</span>
                        <span className="text-slate-500 block text-[8px] truncate max-w-[150px]">{req.address}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black ${
                        req.status === 'PROCESSED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 4: COMPACT GAME STATISTICS & BET HISTORY */}
        {activeNavTab === 'history' && (
          <div className="space-y-2.5">
            
            {/* SUBTABS */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 gap-1 shrink-0">
              <button 
                onClick={() => { playSound('click'); setHistorySubTab('rounds'); }}
                className={`flex-1 py-1 text-center font-bold text-[10px] rounded-lg uppercase ${
                  historySubTab === 'rounds' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rounds
              </button>
              <button 
                onClick={() => { playSound('click'); setHistorySubTab('bets'); }}
                className={`flex-1 py-1 text-center font-bold text-[10px] rounded-lg uppercase ${
                  historySubTab === 'bets' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Bets
              </button>
              <button 
                onClick={() => { playSound('click'); setHistorySubTab('chart'); }}
                className={`flex-1 py-1 text-center font-bold text-[10px] rounded-lg uppercase ${
                  historySubTab === 'chart' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Trend Chart
              </button>
            </div>

            {/* Rounds content */}
            {historySubTab === 'rounds' && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="max-h-[290px] overflow-y-auto scrollbar-none">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-[8.5px] font-mono text-slate-400 uppercase">
                        <th className="py-2 px-3 font-extrabold">Period</th>
                        <th className="py-2 px-3 text-center font-extrabold">Orb</th>
                        <th className="py-2 px-3 text-center font-extrabold">My Result</th>
                        <th className="py-2 px-3 text-right font-extrabold">Colors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {pastRounds.map((round, idx) => {
                        let numColor = "text-rose-400";
                        if (round.number === 0) {
                          numColor = "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-rose-400";
                        } else if (round.number === 5) {
                          numColor = "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400";
                        } else if (round.number % 2 === 0) {
                          numColor = "text-rose-400";
                        } else {
                          numColor = "text-emerald-400";
                        }

                        // Find if user placed any bets on this round
                        const roundBets = betHistory.filter(b => b.period === round.period);
                        let resultBadge = <span className="text-slate-600">-</span>;
                        if (roundBets.length > 0) {
                          const totalWon = roundBets.reduce((acc, b) => acc + (b.status === 'WON' ? b.payoutAmount : 0), 0);
                          const totalBet = roundBets.reduce((acc, b) => acc + (b.betAmount * b.multiplier), 0);
                          if (totalWon > 0) {
                            resultBadge = (
                              <span className="text-emerald-400 font-extrabold text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                WON (+₹{totalWon - totalBet})
                              </span>
                            );
                          } else {
                            resultBadge = (
                              <span className="text-rose-500 font-extrabold text-[9px] bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md">
                                LOST (-₹{totalBet})
                              </span>
                            );
                          }
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-900/40 text-[10.5px]">
                            <td className="py-2 px-3 font-mono text-slate-400">{round.period.slice(-4)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`font-black font-mono text-xs ${numColor}`}>{round.number}</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {resultBadge}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                {round.colors.map((c, i) => (
                                  <span 
                                    key={i} 
                                    className="w-2 h-2 rounded-full border border-slate-800 inline-block" 
                                    style={{
                                      backgroundColor: c.includes('Violet') ? '#A855F7' : c.includes('Green') ? '#10B981' : '#EF4444'
                                    }} 
                                  />
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* My Bets content */}
            {historySubTab === 'bets' && (
              <div className="space-y-2 max-h-[290px] overflow-y-auto scrollbar-none pb-2">
                {betHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-bold text-xs">
                    No bets placed yet. Try playing a round!
                  </div>
                ) : (
                  betHistory.map((bet) => {
                    const isWin = bet.status === 'WON';
                    return (
                      <div 
                        key={bet.id}
                        className={`p-2.5 rounded-xl border text-[10.5px] ${
                          isWin 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-slate-200">
                            {bet.betType === 'NUMBER' ? `Number: ${bet.target}` : `Size: ${bet.target}`}
                          </span>
                          <span className="font-mono text-[8px] text-slate-500">Period: {bet.period.slice(-4)}</span>
                        </div>
                        <div className="flex justify-between items-baseline font-mono text-[9px]">
                          <span>Bet: ₹{bet.betAmount * bet.multiplier}</span>
                          <span className={`text-xs font-black ${isWin ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {isWin ? `+₹${bet.payoutAmount}` : 'Lost'}
                          </span>
                        </div>
                        {bet.outcomeNumber !== undefined && (
                          <div className="mt-1 pt-1 border-t border-slate-800/40 flex justify-between text-[8px] text-slate-500 font-mono">
                            <span>Result: No.{bet.outcomeNumber} ({bet.outcomeBigSmall})</span>
                            <span>Time: {new Date(bet.timestamp).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Chart Trend content */}
            {historySubTab === 'chart' && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 space-y-2 text-center">
                <span className="text-[8.5px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
                  Probability Outcome Line
                </span>
                
                {/* Clean inline SVG Chart */}
                <div className="w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
                  <div className="min-w-[280px] h-[130px] relative">
                    <svg className="w-full h-full" viewBox="0 0 300 130">
                      {/* Grid Horizontals */}
                      {[0, 50, 100].map((yVal, idx) => (
                        <line 
                          key={idx} 
                          x1="0" 
                          y1={`${10 + yVal}`} 
                          x2="300" 
                          y2={`${10 + yVal}`} 
                          stroke="#1E293B" 
                          strokeWidth="0.8" 
                          strokeDasharray="2 2" 
                        />
                      ))}

                      {/* SVG Line path connection */}
                      {(() => {
                        const count = Math.min(pastRounds.length, 8);
                        const data = pastRounds.slice(0, count).reverse();
                        if (data.length === 0) return null;

                        const points = data.map((r, idx) => {
                          const x = (idx / Math.max(data.length - 1, 1)) * 260 + 20;
                          const y = 110 - (r.number * 10);
                          return { x, y, round: r };
                        });

                        const pathStr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                        return (
                          <>
                            <path 
                              d={pathStr} 
                              fill="none" 
                              stroke="#F43F5E" 
                              strokeWidth="2.5" 
                              className="opacity-80"
                            />
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r="4" 
                                  fill={p.round.number === 0 || p.round.number === 5 ? '#A855F7' : p.round.number % 2 === 0 ? '#EF4444' : '#10B981'} 
                                  stroke="#0B0F19"
                                  strokeWidth="1.2"
                                />
                                <text 
                                  x={p.x} 
                                  y={p.y - 8} 
                                  textAnchor="middle" 
                                  className="fill-slate-300 font-black font-mono text-[8px]"
                                >
                                  {p.round.number}
                                </text>
                                <text 
                                  x={p.x} 
                                  y="125" 
                                  textAnchor="middle" 
                                  className="fill-slate-500 font-mono text-[7px]"
                                >
                                  P.{p.round.period.slice(-3)}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Analytical breakdown */}
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[7.5px]">ODD / GREEN</span>
                    <span className="font-extrabold text-emerald-400">
                      {Math.round((pastRounds.filter(r => r.number % 2 !== 0 && r.number !== 5).length / (pastRounds.length || 1)) * 100)}% Frequency
                    </span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[7.5px]">EVEN / RED</span>
                    <span className="font-extrabold text-rose-400">
                      {Math.round((pastRounds.filter(r => r.number % 2 === 0 && r.number !== 0).length / (pastRounds.length || 1)) * 100)}% Frequency
                    </span>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* FOOTER: Beautiful bottom navigation bar optimized for 100% viewport mobile layout */}
      <nav className="bg-slate-900 border-t border-slate-800/80 px-2 py-1.5 shrink-0">
        <div className="flex justify-around items-center">
          
          <button
            onClick={() => { playSound('click'); setActiveNavTab('game'); }}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeNavTab === 'game' 
                ? 'text-rose-500 bg-rose-500/10 font-bold scale-102' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4.5 h-4.5" />
            <span className="text-[9px] uppercase tracking-wider">Play</span>
          </button>

          <button
            onClick={() => { playSound('click'); setActiveNavTab('deposit'); }}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeNavTab === 'deposit' 
                ? 'text-rose-500 bg-rose-500/10 font-bold scale-102' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4.5 h-4.5" />
            <span className="text-[9px] uppercase tracking-wider">Deposit</span>
          </button>

          <button
            onClick={() => { playSound('click'); setActiveNavTab('withdraw'); }}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeNavTab === 'withdraw' 
                ? 'text-rose-500 bg-rose-500/10 font-bold scale-102' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4.5 h-4.5" />
            <span className="text-[9px] uppercase tracking-wider">Payout</span>
          </button>

          <button
            onClick={() => { playSound('click'); setActiveNavTab('history'); }}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeNavTab === 'history' 
                ? 'text-rose-500 bg-rose-500/10 font-bold scale-102' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4.5 h-4.5" />
            <span className="text-[9px] uppercase tracking-wider">Logs</span>
          </button>

        </div>

        {/* Brand footer credit */}
        <div className="text-[7.5px] font-mono text-slate-500 text-center mt-1 uppercase tracking-widest shrink-0">
          NANO GAMES COMPLIANT // STABLE LOCAL ENGINE
        </div>
      </nav>

    </div>
  );
}
