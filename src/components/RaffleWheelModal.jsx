import React, { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Award, Users, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

// DRAW ORDER: Grand Prize (Whole Lamb) is drawn LAST (#7)!
const DEFAULT_PRIZES = [
  { id: 1, drawOrder: 1, title: '1st Draw: Hot Stone Massage', subtitle: 'Radiance Room Spa Experience #1', value: 'R600', icon: '💆' },
  { id: 2, drawOrder: 2, title: '2nd Draw: Hot Stone Massage', subtitle: 'Radiance Room Spa Experience #2', value: 'R600', icon: '💆' },
  { id: 3, drawOrder: 3, title: '3rd Draw: Spyced Restaurant Voucher', subtitle: 'Gourmet Dining Experience', value: 'R1,820', icon: '🍽️' },
  { id: 4, drawOrder: 4, title: '4th Draw: Chivas Regal 13YO Rum Cask (1L)', subtitle: 'Blended Scotch Whisky 1 Litre Bottle', value: 'R2,000', icon: '🍾' },
  { id: 5, drawOrder: 5, title: '5th Draw: Chivas Regal 13YO American Rye Cask (1L)', subtitle: 'Blended Scotch Whisky 1 Litre Bottle', value: 'R2,000', icon: '🥃' },
  { id: 6, drawOrder: 6, title: '6th Draw: Photoshoot for a Couple', subtitle: 'Professional Couples Photo Session', value: 'R2,500', icon: '📸' },
  { id: 7, drawOrder: 7, title: '🌟 GRAND FINALE: Whole Lamb', subtitle: 'Fresh Whole Lamb (Grand Prize Drawn Last!)', value: 'R2,000', icon: '🥩', isGrandPrize: true }
];

export default function RaffleWheelModal({ isOpen, onClose, bookings = [] }) {
  const [spinning, setSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [currentWinner, setCurrentWinner] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [wonPrizes, setWonPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState('prizes');

  // Build the complete entrants pool (STRICTLY ONLY people who purchased raffle tickets)
  useEffect(() => {
    let list = [];

    if (bookings && bookings.length > 0) {
      bookings.forEach(b => {
        const name = `${b.firstName || ''} ${b.surname || ''}`.trim() || 'Guest';
        const table = Number(b.tableNumber) || 1;
        const ref = b.ticketRef || `SJ-${(b.id || '').slice(-4).toUpperCase()}`;

        // Only include if raffle tickets were actually bought
        if (b.raffleEntrants && Array.isArray(b.raffleEntrants) && b.raffleEntrants.length > 0) {
          b.raffleEntrants.forEach((ent, idx) => {
            const entrantName = (ent?.name && ent.name.trim()) ? ent.name.trim() : name;
            const entrantTable = Number(ent?.tableNumber) || table;
            list.push({
              id: `${b.id}-raffle-ent-${idx}`,
              name: entrantName,
              table: entrantTable,
              bookingId: b.id,
              ticketRef: `${ref}-R${idx + 1}`,
              ticketNo: idx + 1,
              source: 'raffle'
            });
          });
        } else if (Number(b.raffleTicketsCount) > 0) {
          const count = Number(b.raffleTicketsCount);
          for (let i = 0; i < count; i++) {
            list.push({
              id: `${b.id}-raffle-${i}`,
              name: count > 1 ? `${name} (Entry ${i + 1}/${count})` : name,
              table: table,
              bookingId: b.id,
              ticketRef: `${ref}-R${i + 1}`,
              ticketNo: i + 1,
              source: 'raffle'
            });
          }
        }
      });
    }

    // Eliminate all tickets belonging to any already won participant
    const winnerNames = new Set((wonPrizes || []).map(wp => (wp?.winner?.name || '').trim().toLowerCase()).filter(Boolean));
    const remainingTickets = list.filter(p => !winnerNames.has((p?.name || '').trim().toLowerCase()));

    setParticipants(remainingTickets);
  }, [bookings, isOpen, wonPrizes]);

  if (!isOpen) return null;

  const currentPrize = DEFAULT_PRIZES[currentPrizeIndex];
  const allPrizesWon = wonPrizes.length >= DEFAULT_PRIZES.length;
  const totalSlices = Math.max(1, participants.length);
  const segmentAngle = 360 / totalSlices;
  const totalPrizePoolValue = DEFAULT_PRIZES.reduce((sum, p) => sum + parseInt(p.value.replace(/[^0-9]/g, ''), 10), 0);

  const entrantStats = participants.reduce((acc, p) => {
    const key = p.name;
    if (!acc[key]) {
      acc[key] = { name: p.name, table: p.table, ticketsCount: 0 };
    }
    acc[key].ticketsCount += 1;
    return acc;
  }, {});
  const entrantStatsList = Object.values(entrantStats).sort((a, b) => b.ticketsCount - a.ticketsCount);

  const handleStartSpin = () => {
    if (spinning || allPrizesWon || participants.length === 0) return;
    setSpinning(true);
    setCurrentWinner(null);
    setCountdown(15);

    const randomIndex = Math.floor(Math.random() * participants.length);
    const winningParticipant = participants[randomIndex];

    const extraSpins = 10 * 360;
    const targetSegmentOffset = 360 - (randomIndex * segmentAngle + segmentAngle / 2);
    const finalDegree = rotationDegree + extraSpins + targetSegmentOffset;

    setRotationDegree(finalDegree);

    const timerInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      setSpinning(false);
      setCurrentWinner(winningParticipant);

      const newWinRecord = {
        prize: currentPrize,
        winner: winningParticipant,
        prizeNumber: currentPrizeIndex + 1
      };

      setWonPrizes(prev => [...prev, newWinRecord]);

      if (currentPrizeIndex < DEFAULT_PRIZES.length - 1) {
        setCurrentPrizeIndex(prev => prev + 1);
      }
    }, 15000);
  };

  const handleResetRaffle = () => {
    if (spinning) return;
    setWonPrizes([]);
    setCurrentPrizeIndex(0);
    setCurrentWinner(null);
    setRotationDegree(0);
  };

  // High contrast palette: Emerald Green, Royal Purple, Gold, Lime
  const sliceColors = [
    '#16a34a', '#9333ea', '#84cc16', '#7e22ce', 
    '#059669', '#a855f7', '#65a30d', '#6b21a8', 
    '#10b981', '#c084fc', '#4d7c0f', '#581c87',
    '#047857', '#d8b4fe', '#365314', '#3b0764'
  ];

  const getSliceFontSize = (count) => {
    if (count <= 10) return 3.2;
    if (count <= 20) return 2.6;
    if (count <= 35) return 2.0;
    if (count <= 55) return 1.6;
    return Math.max(1.1, 48 / count);
  };
  const sliceFontSize = getSliceFontSize(totalSlices);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xl animate-fadeIn overflow-y-auto ${isFullScreen ? 'p-0' : ''}`}>
      <div className={`relative w-full ${isFullScreen ? 'h-screen max-w-none rounded-none' : 'max-w-6xl rounded-3xl my-4'} glass-modal overflow-hidden border border-purple-300 shadow-2xl flex flex-col bg-white`}>
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-purple-900 to-emerald-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/flyer_sloan.jpg" alt="Sloan" className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                Sloan Jooste's Grand Raffle Wheel (Projector View)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-black">
                  {wonPrizes.length}/{DEFAULT_PRIZES.length} Won
                </span>
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                15-Second Live Spins • 1 Ticket = 1 Slice • 3 Tickets = 3 Slices • Winner removed each draw
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs font-bold flex items-center gap-1"
              title={isFullScreen ? "Exit Fullscreen" : "Projector Fullscreen Mode"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-emerald-300" />}
              <span className="hidden sm:inline">{isFullScreen ? "Window" : "Projector Mode"}</span>
            </button>
            <button
              onClick={handleResetRaffle}
              disabled={spinning}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs font-bold flex items-center gap-1 disabled:opacity-40"
              title="Reset raffle draws"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button 
              onClick={onClose}
              disabled={spinning}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Wheel & Prizes */}
        <div className="p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center overflow-y-auto text-slate-800">
          
          {/* LEFT: EXTRA LARGE WHEEL */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-5">
            
            {/* Active Prize Header Banner */}
            {!allPrizesWon ? (
              <div className={`w-full p-4 rounded-2xl text-center space-y-1 shadow-md border ${
                currentPrize.isGrandPrize 
                  ? 'bg-gradient-to-r from-emerald-100 via-purple-100 to-emerald-100 border-2 border-emerald-600 animate-pulse' 
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <span className={`text-xs font-black uppercase tracking-widest ${currentPrize.isGrandPrize ? 'text-emerald-800' : 'text-purple-900'}`}>
                  {currentPrize.isGrandPrize ? '🌟 FINAL CLIMAX DRAW (PRIZE 7 OF 7)' : `Drawing Prize ${currentPrizeIndex + 1} of ${DEFAULT_PRIZES.length}`}
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center justify-center gap-2">
                  <span>{currentPrize.icon}</span>
                  <span>{currentPrize.title}</span>
                </h3>
                <div className="flex items-center justify-center gap-3 text-xs sm:text-sm">
                  <span className="text-purple-950 font-bold">{currentPrize.subtitle}</span>
                  <span className="font-black text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300">
                    Value: {currentPrize.value}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-purple-50 to-emerald-50 border-2 border-emerald-600 text-center space-y-2 shadow-md">
                <span className="inline-flex items-center gap-2 text-base font-black text-emerald-800">
                  <Trophy className="w-6 h-6 text-emerald-600" /> ALL 7 PRIZES SUCCESSFULLY AWARDED!
                </span>
                <p className="text-sm text-purple-900 font-bold">
                  Congratulations to all 7 lucky winners of Sloan Jooste's Fundraiser Raffle!
                </p>
              </div>
            )}

            {/* Rotating Wheel SVG Graphic */}
            <div className="relative w-80 h-80 sm:w-[420px] sm:h-[420px] md:w-[450px] md:h-[450px] flex items-center justify-center">
              
              {/* Top Pointer */}
              <div className="absolute top-0 z-20 -mt-4 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[32px] border-t-emerald-600 filter drop-shadow-[0_4px_8px_rgba(22,163,74,0.5)]"></div>

              {/* Wheel */}
              <div 
                className="w-full h-full rounded-full border-8 border-purple-800/80 shadow-[0_10px_35px_rgba(147,51,234,0.25)] relative overflow-hidden transition-transform ease-out bg-slate-900"
                style={{
                  transform: `rotate(${rotationDegree}deg)`,
                  transitionDuration: spinning ? '15000ms' : '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1.0)'
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {participants.map((p, i) => {
                    const startAngle = i * segmentAngle;
                    const endAngle = (i + 1) * segmentAngle;
                    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
                    
                    const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                    const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    const displayName = p.name.length > 13 ? p.name.substring(0, 12) + '..' : p.name;

                    return (
                      <g key={p.id || i}>
                        <path d={pathData} fill={sliceColors[i % sliceColors.length]} opacity={0.96} stroke="#ffffff" strokeWidth="0.3" />
                        <text
                          x="70"
                          y="50"
                          fill="#ffffff"
                          fontSize={sliceFontSize}
                          fontWeight="900"
                          transform={`rotate(${startAngle + segmentAngle / 2}, 50, 50)`}
                          dominantBaseline="middle"
                          textAnchor="middle"
                        >
                          {displayName}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Hub */}
              <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-4 border-emerald-600 shadow-xl flex flex-col items-center justify-center text-center z-10 p-2">
                {spinning ? (
                  <div className="animate-pulse">
                    <span className="text-xl sm:text-2xl font-mono font-black text-emerald-700">{countdown}s</span>
                    <span className="text-[10px] text-purple-900 block uppercase font-black">Spinning</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase mt-0.5">
                      Draw #{wonPrizes.length < DEFAULT_PRIZES.length ? wonPrizes.length + 1 : DEFAULT_PRIZES.length}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Winner Announcement Banner */}
            {currentWinner && (
              <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-100 via-purple-100 to-emerald-100 border-4 border-emerald-600 text-center space-y-1 shadow-xl animate-bounce">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-700 text-white font-black text-xs uppercase tracking-wider">
                  <Trophy className="w-4 h-4" /> WE HAVE A WINNER!
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-slate-900">{currentWinner.name}</h4>
                <p className="text-sm font-bold text-emerald-800">
                  Table #{currentWinner.table} • Won: {wonPrizes[wonPrizes.length - 1]?.prize.title}
                </p>
                <span className="text-[11px] text-purple-900 font-semibold block">
                  ({currentWinner.name} is now removed from remaining prize draws ✅)
                </span>
              </div>
            )}

            {/* Spin Trigger Button */}
            <div className="w-full">
              <button
                onClick={handleStartSpin}
                disabled={spinning || allPrizesWon || participants.length === 0}
                className="w-full py-4 sm:py-5 rounded-2xl bg-emerald-600 text-white font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 hover:scale-[1.01] hover:bg-emerald-700 transition disabled:opacity-40"
              >
                {spinning ? (
                  <>
                    <Sparkles className="w-6 h-6 animate-spin" /> Spinning 15s for Draw #{currentPrizeIndex + 1}... ({countdown}s)
                  </>
                ) : allPrizesWon ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" /> All {DEFAULT_PRIZES.length} Prizes Awarded!
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-white" /> Start 15s Spin for Draw #{currentPrizeIndex + 1} ({currentPrize.value})
                  </>
                )}
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between w-full px-2 text-xs text-purple-900 font-bold">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span><strong className="text-slate-900">{participants.length} total ticket slices</strong> on wheel</span>
              </div>
              <span className="text-emerald-700 font-black">{entrantStatsList.length} distinct people in pool</span>
            </div>

          </div>

          {/* RIGHT: PRIZES / TICKETS BREAKDOWN */}
          <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1 flex flex-col justify-start">
            
            <div className="flex items-center justify-between pb-2 border-b border-purple-100 sticky top-0 bg-white py-1 z-10">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveSideTab('prizes')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${activeSideTab === 'prizes' ? 'bg-emerald-600 text-white shadow' : 'text-slate-700 hover:text-slate-900'}`}
                >
                  Prizes ({DEFAULT_PRIZES.length})
                </button>
                <button
                  onClick={() => setActiveSideTab('entrants')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${activeSideTab === 'entrants' ? 'bg-emerald-600 text-white shadow' : 'text-slate-700 hover:text-slate-900'}`}
                >
                  Tickets Breakdown ({participants.length})
                </button>
              </div>

              <span className="text-xs text-emerald-700 font-black">Pool: R{totalPrizePoolValue.toLocaleString()}</span>
            </div>

            {/* PRIZES LIST */}
            {activeSideTab === 'prizes' && (
              <div className="space-y-2">
                {DEFAULT_PRIZES.map((prize, idx) => {
                  const winRecord = wonPrizes.find(w => w.prize.id === prize.id);
                  const isCurrent = !allPrizesWon && currentPrizeIndex === idx && !winRecord;

                  return (
                    <div
                      key={prize.id}
                      className={`p-3 rounded-2xl border transition-all text-xs ${
                        winRecord
                          ? 'bg-emerald-50 border-emerald-300 text-slate-800'
                          : isCurrent
                          ? prize.isGrandPrize 
                            ? 'bg-gradient-to-r from-emerald-100 to-purple-100 border-2 border-emerald-600 ring-2 ring-emerald-300 shadow-md animate-pulse'
                            : 'bg-purple-50 border-2 border-emerald-600 shadow-md'
                          : prize.isGrandPrize
                          ? 'bg-purple-50/60 border border-emerald-400 text-purple-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 font-bold text-slate-900">
                          <span className="text-lg">{prize.icon}</span>
                          <div>
                            <span className="block text-xs font-black">{prize.title}</span>
                            <span className="text-[10px] text-emerald-700 font-black">Value: {prize.value}</span>
                          </div>
                        </div>

                        {winRecord ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Won
                          </span>
                        ) : isCurrent ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0 animate-pulse">
                            Active Draw
                          </span>
                        ) : prize.isGrandPrize ? (
                          <span className="text-[10px] text-emerald-800 font-black uppercase px-2 py-0.5 bg-emerald-100 rounded border border-emerald-300">
                            Grand Finale
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Upcoming</span>
                        )}
                      </div>

                      {winRecord && (
                        <div className="mt-2 pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-emerald-900 font-bold">
                          <span className="flex items-center gap-1">
                            👑 Winner: {winRecord.winner.name}
                          </span>
                          <span className="text-[10px] text-purple-900 font-normal">Table #{winRecord.winner.table}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TICKETS BREAKDOWN */}
            {activeSideTab === 'entrants' && (
              <div className="space-y-2 text-xs">
                <p className="text-[11px] text-purple-900 font-medium">
                  Each ticket gives 1 distinct slice on the wheel:
                </p>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {entrantStatsList.map((ent, idx) => {
                    const probability = ((ent.ticketsCount / totalSlices) * 100).toFixed(1);
                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-purple-100 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{ent.name}</span>
                          <span className="text-[10px] text-purple-700 font-medium">Table #{ent.table}</span>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                            {ent.ticketsCount} Slice{ent.ticketsCount > 1 ? 's' : ''} ({ent.ticketsCount} Ticket{ent.ticketsCount > 1 ? 's' : ''})
                          </span>
                          <span className="block text-[10px] text-slate-500 font-bold mt-0.5">{probability}% win chance</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
