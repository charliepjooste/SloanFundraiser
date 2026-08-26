import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ArrowRight, 
  Table, 
  Users, 
  Gift, 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Info,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  MessageCircle,
  Mail,
  AlertCircle,
  DollarSign,
  Copy,
  RotateCcw
} from 'lucide-react';
import { 
  createBookingInFirestore, 
  EVENT_DETAILS, 
  getShortReference, 
  generateWhatsAppMessage, 
  openGmailCompose 
} from '../firebase';
import { generateTributeMessage } from '../services/gemini';

export default function BookingWizard({ 
  isOpen, 
  onClose, 
  defaultOption = 'Standard Dance Ticket',
  bookings = [],
  onBookingComplete,
  onBookingSuccess
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Post-purchase confirmation state
  const [isPurchased, setIsPurchased] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Form State
  const [tableBookingOption, setTableBookingOption] = useState(defaultOption);
  const [tableNumber, setTableNumber] = useState(1);
  const [numTickets, setNumTickets] = useState(1);
  const [rafflePackOption, setRafflePackOption] = useState(0); // 0, 1, 3, 6, 10
  const [raffleEntrants, setRaffleEntrants] = useState([]); // Array of { name, tableNumber }
  
  // Optional Donation State
  const [donationAmount, setDonationAmount] = useState(0);
  const [customDonation, setCustomDonation] = useState('');

  // Contact details
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [consentTerms, setConsentTerms] = useState(true);
  const [generateAiTribute, setGenerateAiTribute] = useState(true);

  // Compute table seats booked across 35 tables
  const tableOccupancy = {};
  for (let i = 1; i <= 35; i++) tableOccupancy[i] = 0;
  (bookings || []).forEach(b => {
    if (b.tableNumber && b.tableNumber >= 1 && b.tableNumber <= 35 && b.tableBookingOption !== 'Raffle Tickets Only') {
      tableOccupancy[b.tableNumber] = (tableOccupancy[b.tableNumber] || 0) + (Number(b.numTickets) || 1);
    }
  });

  // Find 100% free tables (0 out of 10 seats booked)
  const completelyFreeTables = Object.keys(tableOccupancy)
    .map(Number)
    .filter(t => tableOccupancy[t] === 0);

  // Automatically find next available table for individual tickets
  const findAutoAssignedTable = (requestedSeats) => {
    for (let t = 1; t <= 35; t++) {
      const booked = tableOccupancy[t] || 0;
      if (10 - booked >= requestedSeats) {
        return t;
      }
    }
    return 1;
  };

  // Set default table number
  useEffect(() => {
    if (tableBookingOption === 'Full Private Table (10 Guests)') {
      if (completelyFreeTables.length > 0) {
        setTableNumber(completelyFreeTables[0]);
      } else {
        setTableNumber(0);
      }
    } else if (tableBookingOption === 'Standard Dance Ticket') {
      setTableNumber(findAutoAssignedTable(numTickets));
    }
  }, [tableBookingOption, numTickets, bookings]);

  if (!isOpen) return null;

  const copyToClipboard = (text, fieldName) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Pricing calculations
  const calculateTotal = () => {
    let danceTotal = 0;
    if (tableBookingOption === 'Standard Dance Ticket') {
      danceTotal = numTickets * 150;
    } else if (tableBookingOption === 'Full Private Table (10 Guests)') {
      danceTotal = 1500;
    }

    let raffleTotal = 0;
    if (rafflePackOption === 1) raffleTotal = 50;
    else if (rafflePackOption === 3) raffleTotal = 100;
    else if (rafflePackOption === 6) raffleTotal = 200;
    else if (rafflePackOption === 10) raffleTotal = 300;

    const donationTotal = Number(donationAmount) || 0;

    return danceTotal + raffleTotal + donationTotal;
  };

  const calculatedAmount = calculateTotal();

  // Wizard Navigation
  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (tableBookingOption === 'Full Private Table (10 Guests)') {
        if (completelyFreeTables.length === 0) {
          setError('Sorry, there are no 100% free tables remaining for a private table of 10.');
          return;
        }
        setStep(2); // Choose from free tables
        return;
      }
      // Standard Dance Ticket or Raffle Only skips to Step 3
      setStep(3);
      return;
    }

    if (step === 2) {
      if (!tableNumber || !completelyFreeTables.includes(Number(tableNumber))) {
        setError('Please choose an available 100% free table for your private table.');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!firstName.trim() || !surname.trim()) {
        setError('Please enter your First Name and Surname.');
        return;
      }
      if (!mobileNumber.trim()) {
        setError('Please enter your Mobile / WhatsApp Number.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid Email Address for your ticket confirmation.');
        return;
      }
      if (!consentTerms) {
        setError('Please agree to the event terms to proceed.');
        return;
      }
      setStep(4);
      return;
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 3 && tableBookingOption !== 'Full Private Table (10 Guests)') {
      setStep(1);
      return;
    }
    setStep(prev => prev - 1);
  };

  const handleSubmitBooking = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalSpecialRequests = specialRequests || '';
      if (generateAiTribute) {
        try {
          const aiMessage = await generateTributeMessage(`${firstName || ''} ${surname || ''}`, calculatedAmount);
          if (aiMessage) {
            finalSpecialRequests = finalSpecialRequests 
              ? `${finalSpecialRequests} | Tribute: "${aiMessage}"` 
              : `Tribute: "${aiMessage}"`;
          }
        } catch (e) {
          console.warn("AI tribute generation fallback:", e);
        }
      }

      const finalRaffleEntrants = (raffleEntrants || []).map((ent, idx) => ({
        name: ent?.name && ent.name.trim() ? ent.name.trim() : `${firstName || ''} ${surname || ''}${idx > 0 ? ` (Entry ${idx + 1})` : ''}`,
        tableNumber: Number(ent?.tableNumber) || Number(tableNumber) || 1
      }));

      // Auto-assign table if individual ticket
      let finalTableNumber = Number(tableNumber) || 1;
      if (tableBookingOption === 'Raffle Tickets Only') {
        finalTableNumber = 0;
      } else if (tableBookingOption === 'Standard Dance Ticket') {
        finalTableNumber = findAutoAssignedTable(numTickets);
      }

      // Compute sequential seats allocation for the chosen table
      let finalAllocatedSeats = [];
      if (tableBookingOption === 'Full Private Table (10 Guests)') {
        finalAllocatedSeats = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      } else if (tableBookingOption === 'Standard Dance Ticket') {
        const requestedTickets = Number(numTickets) || 1;
        const existingTableBookings = (bookings || []).filter(b => Number(b.tableNumber) === Number(finalTableNumber) && b.tableBookingOption !== 'Raffle Tickets Only');
        
        // Find which seats (1..10) are already claimed at finalTableNumber
        const claimedSeats = new Set();
        existingTableBookings.forEach(b => {
          if (b.allocatedSeats && Array.isArray(b.allocatedSeats) && b.allocatedSeats.length > 0) {
            b.allocatedSeats.forEach(s => claimedSeats.add(Number(s)));
          } else {
            const count = Number(b.numTickets) || 1;
            for (let i = 1; i <= count; i++) claimedSeats.add(i);
          }
        });

        for (let seat = 1; seat <= 10; seat++) {
          if (!claimedSeats.has(seat) && finalAllocatedSeats.length < requestedTickets) {
            finalAllocatedSeats.push(seat);
          }
        }
        // Fallback sequential
        while (finalAllocatedSeats.length < requestedTickets) {
          finalAllocatedSeats.push(finalAllocatedSeats.length + 1);
        }
      }

      const bookingPayload = {
        firstName: (firstName || '').trim(),
        surname: (surname || '').trim(),
        mobileNumber: (mobileNumber || '').trim(),
        email: (email || '').trim().toLowerCase(),
        numTickets: tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(numTickets) || 1,
        raffleTicketsCount: Number(rafflePackOption) || 0,
        raffleEntrants: finalRaffleEntrants,
        donationAmount: Number(donationAmount) || 0,
        tableBookingOption: tableBookingOption || 'Standard Dance Ticket',
        tableNumber: finalTableNumber,
        allocatedSeats: finalAllocatedSeats,
        specialRequests: finalSpecialRequests,
        consentTerms: Boolean(consentTerms),
        paymentStatus: 'pending_eft',
        paymentMethod: 'eft',
        amount: Number(calculatedAmount) || 0
      };

      const newBooking = await createBookingInFirestore(bookingPayload);
      setLoading(false);

      setCompletedBooking(newBooking);
      setIsPurchased(true);

      if (onBookingComplete) {
        onBookingComplete(newBooking);
      } else if (onBookingSuccess) {
        onBookingSuccess(newBooking);
      }
    } catch (err) {
      console.error("Booking error:", err);
      const shortRef = `SJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackBooking = {
        id: `local_${Date.now()}`,
        ticketRef: shortRef,
        firstName: (firstName || '').trim(),
        surname: (surname || '').trim(),
        mobileNumber: (mobileNumber || '').trim(),
        email: (email || '').trim().toLowerCase(),
        numTickets: tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(numTickets) || 1,
        raffleTicketsCount: Number(rafflePackOption) || 0,
        donationAmount: Number(donationAmount) || 0,
        tableBookingOption: tableBookingOption || 'Standard Dance Ticket',
        tableNumber: Number(tableNumber) || 1,
        allocatedSeats: [1, 2],
        amount: Number(calculatedAmount) || 0,
        paymentStatus: 'pending_eft',
        paymentMethod: 'eft',
        createdAt: new Date().toISOString()
      };
      setLoading(false);
      setCompletedBooking(fallbackBooking);
      setIsPurchased(true);
      if (onBookingComplete) onBookingComplete(fallbackBooking);
      else if (onBookingSuccess) onBookingSuccess(fallbackBooking);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white my-6 flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src="/flyer_sloan.jpg" alt="Sloan" className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
            <div>
              <h2 className="text-base font-black">Sloan Jooste's Fundraiser Dance</h2>
              <p className="text-xs text-emerald-300 font-bold">
                {isPurchased ? '🎉 Booking Received & Confirmed' : `Step ${step} of 4 • ${step === 1 ? 'Select Package' : step === 2 ? 'Select Full Table' : step === 3 ? 'Guest Details' : 'Donation & Payment'}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (only before purchase) */}
        {!isPurchased && (
          <div className="grid grid-cols-4 bg-purple-50 border-b border-purple-100 text-center text-xs font-bold shrink-0">
            <div className={`py-2.5 border-b-2 ${step >= 1 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>1. Ticket</div>
            <div className={`py-2.5 border-b-2 ${step >= 2 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>2. Table</div>
            <div className={`py-2.5 border-b-2 ${step >= 3 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>3. Details</div>
            <div className={`py-2.5 border-b-2 ${step >= 4 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>4. Payment (EFT)</div>
          </div>
        )}

        {/* Error banner */}
        {error && !isPurchased && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 flex-1">
          
          {/* ========================================================== */}
          {/* POST-PURCHASE CONFIRMATION & REFRESH SCREEN */}
          {/* ========================================================== */}
          {isPurchased && completedBooking ? (
            <div className="space-y-6 text-center animate-fadeIn py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  🎉 Thank you for your ticket purchase!
                </h3>
                <p className="text-sm font-bold text-emerald-800">
                  Thank you, {completedBooking.firstName} {completedBooking.surname}!
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your reservation is confirmed. Once your ticket purchase EFT has been cleared by organizers <strong>Charlie or Nicole</strong>, your official digital passes will be sent via <strong>WhatsApp and Email</strong>.
                </p>
              </div>

              {/* Order Details Card */}
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <span className="font-bold text-purple-900">Booking Reference:</span>
                  <span className="font-mono font-black text-purple-950 bg-white px-2.5 py-0.5 rounded border border-purple-300">
                    {getShortReference(completedBooking)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-semibold text-slate-700">
                  <div>
                    <strong className="text-slate-900">Table:</strong> {completedBooking.tableBookingOption === 'Raffle Tickets Only' ? 'Raffle Only' : `Table #${completedBooking.tableNumber}`}
                  </div>
                  <div>
                    <strong className="text-slate-900">Seats:</strong> {completedBooking.allocatedSeats && completedBooking.allocatedSeats.length > 0 ? `Seat(s) #${completedBooking.allocatedSeats.join(', ')}` : `${completedBooking.numTickets} Seat(s)`}
                  </div>
                  <div>
                    <strong className="text-slate-900">Raffle Entries:</strong> {completedBooking.raffleTicketsCount || 0}
                  </div>
                  <div>
                    <strong className="text-slate-900">Total Amount:</strong> <span className="font-black text-emerald-800 text-sm">R{completedBooking.amount}</span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Instructions with COPY buttons */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left text-xs space-y-3 shadow-xs">
                <span className="font-black text-purple-950 flex items-center gap-1.5 uppercase text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> FNB Direct EFT Payment Details:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Bank & Account Holder</span>
                    <span className="font-bold text-xs text-slate-900">{EVENT_DETAILS.banking.bank} • {EVENT_DETAILS.banking.accountHolder}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 block">Account Number</span>
                      <span className="font-mono font-black text-purple-950 text-xs">{EVENT_DETAILS.banking.accountNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(EVENT_DETAILS.banking.accountNumber, 'acc')}
                      className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 text-[11px] font-bold flex items-center gap-1 transition shadow-2xs"
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'acc' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between sm:col-span-2">
                    <div>
                      <span className="text-[9px] text-emerald-900 block font-bold">Payment Reference</span>
                      <span className="font-mono font-black text-emerald-950 text-xs">{getShortReference(completedBooking)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getShortReference(completedBooking), 'ref')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-950 text-[11px] font-bold flex items-center gap-1 transition shadow-2xs"
                    >
                      {copiedField === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'ref' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* REFRESH PAGE BANNER & REDIRECT BUTTONS */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white space-y-3.5 shadow-lg">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-200">
                  <RotateCcw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Please refresh the page to return to the main board / landing page.</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Refresh Page & Go to Main Board
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const phone = (completedBooking.mobileNumber || '').replace(/[^0-9]/g, '');
                      const text = generateWhatsAppMessage(completedBooking);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                    className="py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Send Proof on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => openGmailCompose(completedBooking)}
                    className="py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-4 h-4" /> Open in Gmail
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <>
              {/* STEP 1: TICKET OPTIONS + RAFFLE ADD-ON */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Choose Ticket / Table Option</h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    
                    {/* Option 1: Standard Dance Ticket */}
                    <div 
                      onClick={() => setTableBookingOption('Standard Dance Ticket')}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${tableBookingOption === 'Standard Dance Ticket' ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">Standard Dance Ticket</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">R150 / Seat</span>
                        </div>
                        <p className="text-xs text-slate-500">Full admission & live entertainment. Open table seating is automatically allocated.</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-emerald-600">
                        {tableBookingOption === 'Standard Dance Ticket' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>}
                      </div>
                    </div>

                    {/* Option 2: Full Private Table */}
                    <div 
                      onClick={() => setTableBookingOption('Full Private Table (10 Guests)')}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${tableBookingOption === 'Full Private Table (10 Guests)' ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">Full Private Table (10 Guests)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-black">R1,500 / Table</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Reserve a full 10-seater table. Choose from {completelyFreeTables.length} available 100% free tables.
                        </p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-emerald-600">
                        {tableBookingOption === 'Full Private Table (10 Guests)' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>}
                      </div>
                    </div>

                    {/* Option 3: Raffle Only */}
                    <div 
                      onClick={() => {
                        setTableBookingOption('Raffle Tickets Only');
                        if (rafflePackOption === 0) setRafflePackOption(3);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${tableBookingOption === 'Raffle Tickets Only' ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">Raffle Supporter Only (No Table Seat)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">From R50</span>
                        </div>
                        <p className="text-xs text-slate-500">Support Sloan by entering the Grand Charity Raffle for 7 awesome prizes!</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-emerald-600">
                        {tableBookingOption === 'Raffle Tickets Only' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>}
                      </div>
                    </div>

                  </div>

                  {/* Quantity selector for Standard Dance Tickets */}
                  {tableBookingOption === 'Standard Dance Ticket' && (
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                      <label className="block font-bold text-xs text-slate-800">
                        How many dance tickets would you like to purchase?
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="1" 
                          max="9" 
                          value={numTickets}
                          onChange={(e) => setNumTickets(Number(e.target.value))}
                          className="flex-1 accent-emerald-600 cursor-pointer"
                        />
                        <span className="font-black text-sm text-purple-950 bg-white px-3 py-1 rounded-xl border border-purple-200 shadow-2xs">
                          {numTickets} {numTickets === 1 ? 'Seat' : 'Seats'} (R{numTickets * 150})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Charity Raffle Add-on Selection */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-emerald-50 to-purple-50 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-700" />
                        <span className="font-extrabold text-xs text-purple-950">Add Charity Raffle Tickets (7 Prizes)</span>
                      </div>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                        Grand Prize: Whole Lamb
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { count: 0, price: 'R0', label: 'No Raffle' },
                        { count: 1, price: 'R50', label: '1 Ticket' },
                        { count: 3, price: 'R100', label: '3 Tickets (Popular)' },
                        { count: 6, price: 'R200', label: '6 Tickets' },
                      ].map((pkg) => (
                        <button
                          key={pkg.count}
                          type="button"
                          onClick={() => setRafflePackOption(pkg.count)}
                          className={`p-2.5 rounded-xl border text-center transition ${rafflePackOption === pkg.count ? 'border-2 border-emerald-600 bg-white shadow-sm ring-1 ring-emerald-500 font-black text-emerald-950' : 'border-slate-200 bg-white/70 text-slate-700 font-medium hover:bg-white'}`}
                        >
                          <span className="block text-xs font-bold">{pkg.label}</span>
                          <span className="text-[11px] text-emerald-700 font-black">{pkg.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT FULL TABLE (Only for Full Table of 10) */}
              {step === 2 && tableBookingOption === 'Full Private Table (10 Guests)' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Select an Available Free Table (10 Seats)</h3>
                    <p className="text-xs text-slate-500">Only 100% free tables with all 10 seats available are shown.</p>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 max-h-60 overflow-y-auto p-3 rounded-2xl bg-purple-50/50 border border-purple-200">
                    {completelyFreeTables.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTableNumber(t)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center transition ${tableNumber === t ? 'border-2 border-emerald-600 bg-emerald-100 text-emerald-950 font-black shadow-md ring-2 ring-emerald-400' : 'border-slate-200 bg-white text-slate-800 hover:border-purple-400'}`}
                      >
                        <Table className="w-4 h-4 mb-1 text-purple-700" />
                        <span className="text-xs font-bold">Table #{t}</span>
                        <span className="text-[9px] text-emerald-700 font-semibold">10 Free</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: GUEST CONTACT DETAILS */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Primary Contact & Ticket Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                      <input 
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Charlton"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Surname *</label>
                      <input 
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="e.g. Jooste"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp Number *</label>
                      <input 
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. 079 528 5350"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. charliepjooste@gmail.com"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">Special Request / Message for Sloan</label>
                    <input 
                      type="text"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="e.g. Excited to celebrate with you all! Keep fighting Sloan 💚"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 text-xs"
                    />
                  </div>

                  <div className="pt-2 space-y-2 text-xs">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={consentTerms}
                        onChange={(e) => setConsentTerms(e.target.checked)}
                        className="mt-0.5 accent-emerald-600 rounded"
                      />
                      <span className="text-slate-600 text-[11px]">
                        I confirm this booking in aid of Sloan Jooste's medical care and understand all proceeds go directly to his physiotherapy.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: DONATION ADD-ON & DIRECT EFT PAYMENT */}
              {step === 4 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-black text-slate-900">Donation & Direct EFT Checkout</h3>

                  {/* Optional Donation Selector */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-purple-50 to-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span className="font-extrabold text-xs text-purple-950">Add an Optional Donation for Sloan</span>
                      </div>
                      {donationAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDonationAmount(0);
                            setCustomDonation('');
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Skip / Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[50, 100, 250, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setDonationAmount(amt);
                            setCustomDonation('');
                          }}
                          className={`p-2 rounded-xl border text-xs font-black transition ${donationAmount === amt ? 'border-2 border-emerald-600 bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-500' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white'}`}
                        >
                          +R{amt}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="number"
                        min="1"
                        placeholder="Or enter custom donation (e.g. R300)"
                        value={customDonation}
                        onChange={(e) => {
                          setCustomDonation(e.target.value);
                          setDonationAmount(Number(e.target.value) || 0);
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-slate-900 font-semibold text-xs focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Summary Breakdown */}
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-2 font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span>{tableBookingOption === 'Standard Dance Ticket' ? `${numTickets} × Dance Ticket(s)` : tableBookingOption}</span>
                      <span className="font-bold text-slate-900">R{tableBookingOption === 'Standard Dance Ticket' ? numTickets * 150 : tableBookingOption === 'Full Private Table (10 Guests)' ? 1500 : 0}</span>
                    </div>
                    {rafflePackOption > 0 && (
                      <div className="flex justify-between">
                        <span>{rafflePackOption} × Charity Raffle Entry/ies</span>
                        <span className="font-bold text-slate-900">R{rafflePackOption === 1 ? 50 : rafflePackOption === 3 ? 100 : rafflePackOption === 6 ? 200 : 300}</span>
                      </div>
                    )}
                    {donationAmount > 0 && (
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>❤️ Additional Medical Donation</span>
                        <span>R{donationAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 pt-2 border-t border-purple-200 text-sm">
                      <span className="font-black">Total Bill Due:</span>
                      <span className="font-black text-emerald-700 text-base">R{calculatedAmount}</span>
                    </div>
                  </div>

                  {/* Direct EFT Payment Method Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 text-slate-800">
                    <div className="flex items-center gap-1.5 font-black text-purple-950">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
                      <span>Payment Method: Direct EFT Bank Transfer</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-slate-900">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[9px] font-sans text-slate-500 block">Bank & Account Holder</span>
                        <span className="font-bold text-xs">{EVENT_DETAILS.banking.bank} • {EVENT_DETAILS.banking.accountHolder}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-sans text-slate-500 block">Account Number</span>
                          <span className="font-black text-purple-950 text-xs">{EVENT_DETAILS.banking.accountNumber}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(EVENT_DETAILS.banking.accountNumber, 'acc-step4')}
                          className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 text-[10px] font-bold flex items-center gap-1 transition"
                        >
                          {copiedField === 'acc-step4' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedField === 'acc-step4' ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between sm:col-span-2">
                        <div>
                          <span className="text-[9px] font-sans text-emerald-900 block font-bold">Payment Reference</span>
                          <span className="font-black text-emerald-950 text-xs">{firstName} {surname}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`${firstName} ${surname}`, 'ref-step4')}
                          className="px-2 py-1 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-950 text-[10px] font-bold flex items-center gap-1 transition"
                        >
                          {copiedField === 'ref-step4' ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                          {copiedField === 'ref-step4' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium">
                      *Note: Upon submitting, your booking will be confirmed. Your ticket pass will be officially activated once organizers Charlie or Nicole clear the bank funds.
                    </p>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions (Only when not purchased) */}
        {!isPurchased && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
              >
                Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md hover:bg-emerald-700 transition cursor-pointer"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitBooking}
                disabled={loading}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-2 shadow-md hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting Booking...' : `Confirm & Pay via EFT (R${calculatedAmount})`}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
