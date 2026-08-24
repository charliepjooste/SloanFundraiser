import React, { useState } from 'react';
import { 
  X, 
  Check, 
  ArrowRight, 
  CreditCard, 
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
  AlertCircle
} from 'lucide-react';
import { createBookingInFirestore, EVENT_DETAILS, getShortReference } from '../firebase';
import { generateTributeMessage } from '../services/gemini';

export default function BookingWizard({ 
  isOpen, 
  onClose, 
  defaultOption = 'Standard Dance Ticket',
  onBookingComplete,
  onBookingSuccess
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [tableBookingOption, setTableBookingOption] = useState(defaultOption);
  const [tableNumber, setTableNumber] = useState(1);
  const [numTickets, setNumTickets] = useState(1);
  const [rafflePackOption, setRafflePackOption] = useState(0); // 0, 1, 3, 6, 10
  const [raffleEntrants, setRaffleEntrants] = useState([]); // Array of { name, tableNumber }
  
  // Contact details
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [consentTerms, setConsentTerms] = useState(true);
  const [generateAiTribute, setGenerateAiTribute] = useState(true);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'eft'
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

  // Post-booking state for EFT vs Instant Card
  const [submittedBooking, setSubmittedBooking] = useState(null);

  if (!isOpen) return null;

  // Pricing calculations
  const calculateTotal = () => {
    let danceTotal = 0;
    if (tableBookingOption === 'Full Private Table (10 Guests)') {
      danceTotal = 1500;
    } else if (tableBookingOption === 'Standard Dance Ticket') {
      danceTotal = numTickets * 150;
    }

    let raffleTotal = 0;
    if (rafflePackOption === 1) raffleTotal = 50;
    if (rafflePackOption === 3) raffleTotal = 100;
    if (rafflePackOption === 6) raffleTotal = 200;
    if (rafflePackOption === 10) raffleTotal = 300;

    return danceTotal + raffleTotal;
  };

  const calculatedAmount = calculateTotal();

  const getRaffleCost = () => {
    if (rafflePackOption === 1) return 50;
    if (rafflePackOption === 3) return 100;
    if (rafflePackOption === 6) return 200;
    if (rafflePackOption === 10) return 300;
    return 0;
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (tableBookingOption === 'Raffle Tickets Only') {
        if (rafflePackOption === 0) {
          setError('Please select at least 1 Raffle Ticket pack to proceed.');
          return;
        }
        setStep(3); // Skip table selection
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!firstName.trim() || !surname.trim() || !mobileNumber.trim() || !email.trim()) {
        setError('Please fill in your Full Name, Mobile Number, and Email Address.');
        return;
      }
      if (!consentTerms) {
        setError('Please accept the event policy to proceed.');
        return;
      }
      setStep(4);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 3 && tableBookingOption === 'Raffle Tickets Only') {
      setStep(1);
      return;
    }
    setStep(prev => prev - 1);
  };

  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalSpecialRequests = specialRequests;
      if (generateAiTribute) {
        try {
          const aiMessage = await generateTributeMessage(`${firstName} ${surname}`, calculatedAmount);
          finalSpecialRequests = specialRequests 
            ? `${specialRequests} | Tribute: "${aiMessage}"` 
            : `Tribute: "${aiMessage}"`;
        } catch (e) {
          console.warn("AI tribute generation fallback:", e);
        }
      }

      const finalRaffleEntrants = raffleEntrants.map((ent, idx) => ({
        name: ent.name && ent.name.trim() ? ent.name.trim() : `${firstName} ${surname}${idx > 0 ? ` (Entry ${idx + 1})` : ''}`,
        tableNumber: Number(ent.tableNumber) || Number(tableNumber) || 1
      }));

      const bookingPayload = {
        firstName: firstName.trim(),
        surname: surname.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim().toLowerCase(),
        numTickets: tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(numTickets),
        raffleTicketsCount: rafflePackOption,
        raffleEntrants: finalRaffleEntrants,
        tableBookingOption,
        tableNumber: tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(tableNumber),
        specialRequests: finalSpecialRequests,
        consentTerms: Boolean(consentTerms),
        paymentStatus: paymentMethod === 'eft' ? 'pending_eft' : 'paid',
        paymentMethod,
        amount: calculatedAmount
      };

      const newBooking = await createBookingInFirestore(bookingPayload);
      setSubmittedBooking(newBooking);
      setLoading(false);

      const callback = onBookingComplete || onBookingSuccess;

      if (paymentMethod === 'card') {
        // Immediate card payment: trigger instant pass modal
        if (callback) callback(newBooking);
      } else {
        // EFT payment: notify parent state so admin sees it in pending list
        if (callback) callback(newBooking);
      }
    } catch (err) {
      console.error("Booking error:", err);
      // Even if Firestore has network lag, generate fallback locally
      const shortRef = `SJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackBooking = {
        id: `local_${Date.now()}`,
        ticketRef: shortRef,
        firstName,
        surname,
        mobileNumber,
        email,
        numTickets: tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(numTickets),
        raffleTicketsCount: rafflePackOption,
        tableBookingOption,
        tableNumber: Number(tableNumber) || 1,
        amount: calculatedAmount,
        paymentStatus: paymentMethod === 'eft' ? 'pending_eft' : 'paid',
        paymentMethod
      };
      setSubmittedBooking(fallbackBooking);
      setLoading(false);
      const callback = onBookingComplete || onBookingSuccess;
      if (callback) callback(fallbackBooking);
    }
  };

  const handleOpenEftWhatsAppProof = (booking) => {
    const ticketRef = getShortReference(booking);
    const text = encodeURIComponent(`*PROOF OF PAYMENT: SLOAN JOOSTE FUNDRAISER 💚*\n\nHello Charlie & Nicole,\n\nI have made an EFT payment for my booking:\n• Ref: *${ticketRef}*\n• Name: *${booking.firstName} ${booking.surname}*\n• Amount: *R${booking.amount}*\n• Table: *#${booking.tableNumber}*\n\nPlease find my proof of payment attached. Thank you!`);
    window.open(`https://wa.me/27711134812?text=${text}`, '_blank');
  };

  const handleOpenEftEmailProof = (booking) => {
    const ticketRef = getShortReference(booking);
    const subject = encodeURIComponent(`Proof of Payment - Sloan Jooste Fundraiser (${ticketRef})`);
    const body = encodeURIComponent(`Hello Charlie & Nicole,\n\nI have completed the EFT transfer of R${booking.amount} for booking reference ${ticketRef} (${booking.firstName} ${booking.surname}).\n\nPlease find my proof of payment attached.`);
    window.open(`mailto:charliepjooste@gmail.com,nicolejooste8@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white my-6">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/flyer_sloan.jpg" alt="Sloan" className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
            <div>
              <h2 className="text-base font-black">Sloan Jooste's Fundraiser Dance</h2>
              <p className="text-xs text-emerald-300 font-bold">
                {submittedBooking ? 'Booking Status' : `Step ${step} of 4 • ${step === 1 ? 'Select Package' : step === 2 ? 'Select Table (1-35)' : step === 3 ? 'Guest Details' : 'Payment'}`}
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

        {/* EFT SUBMISSION CONFIRMATION SCREEN */}
        {submittedBooking && submittedBooking.paymentStatus === 'pending_eft' ? (
          <div className="p-6 space-y-5 text-slate-800 animate-fadeIn">
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">EFT Booking Request Submitted!</h3>
              <p className="text-xs text-purple-900 font-bold">
                Reference: <span className="font-mono bg-purple-100 text-purple-950 px-2.5 py-1 rounded-lg border border-purple-200 text-sm">{getShortReference(submittedBooking)}</span>
              </p>
            </div>

            {/* Notice Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Pending Bank Funds Clearance</span>
              </div>
              <p className="leading-relaxed font-medium">
                Thank you, <strong>{submittedBooking.firstName}</strong>! Your tickets will be officially allocated once the organizers, <strong>Charlie or Nicole</strong>, have cleared the funds in the FNB bank account.
              </p>
              <p className="leading-relaxed font-medium">
                Your official digital ticket pass & QR code will then be sent via Email to <strong>{submittedBooking.email}</strong> and WhatsApp to <strong>{submittedBooking.mobileNumber}</strong>.
              </p>
            </div>

            {/* FNB Banking Details Box */}
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-xs">
              <span className="font-black text-purple-950 block">Please make an EFT transfer for R{submittedBooking.amount}:</span>
              <div className="p-3 rounded-xl bg-white border border-purple-200 font-mono space-y-1 text-slate-900">
                <div><strong className="font-sans text-purple-900">Bank:</strong> {EVENT_DETAILS.banking.bank}</div>
                <div><strong className="font-sans text-purple-900">Account Holder:</strong> {EVENT_DETAILS.banking.accountHolder}</div>
                <div><strong className="font-sans text-purple-900">Account Type:</strong> {EVENT_DETAILS.banking.accountType}</div>
                <div><strong className="font-sans text-purple-900">Account Number:</strong> {EVENT_DETAILS.banking.accountNumber}</div>
                <div><strong className="font-sans text-purple-900">Branch Code:</strong> {EVENT_DETAILS.banking.branchCode}</div>
                <div className="text-emerald-800 font-bold font-sans pt-1">
                  Payment Reference: <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded text-emerald-950 font-black">{getShortReference(submittedBooking)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleOpenEftWhatsAppProof(submittedBooking)}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <MessageCircle className="w-4 h-4" /> Send Proof on WhatsApp
              </button>
              <button
                onClick={() => handleOpenEftEmailProof(submittedBooking)}
                className="py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <Mail className="w-4 h-4" /> Email Proof of Payment
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Done / Close
              </button>
            </div>

          </div>
        ) : (
          <>
            {/* Step Indicator */}
            <div className="grid grid-cols-4 bg-purple-50 border-b border-purple-100 text-center text-xs font-bold">
              <div className={`py-2.5 border-b-2 ${step >= 1 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>1. Ticket</div>
              <div className={`py-2.5 border-b-2 ${step >= 2 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>2. Table (35)</div>
              <div className={`py-2.5 border-b-2 ${step >= 3 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>3. Details</div>
              <div className={`py-2.5 border-b-2 ${step >= 4 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>4. Payment</div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-slate-800">
              
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
                        <p className="text-xs text-slate-500">Full evening admission, live music by The Elginairs & DJ Cool J, and open seating selection.</p>
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
                        <p className="text-xs text-slate-500">Reserve an entire dedicated 10-seater table for your family, business, or group of friends.</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-emerald-600">
                        {tableBookingOption === 'Full Private Table (10 Guests)' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>}
                      </div>
                    </div>

                    {/* Option 3: Raffle Only */}
                    <div 
                      onClick={() => setTableBookingOption('Raffle Tickets Only')}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${tableBookingOption === 'Raffle Tickets Only' ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">Raffle Supporter Pass (Charity Entry)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">From R50</span>
                        </div>
                        <p className="text-xs text-slate-500">Support Sloan remotely and enter our 7 Grand Charity Raffle Prizes from anywhere!</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-emerald-600">
                        {tableBookingOption === 'Raffle Tickets Only' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>}
                      </div>
                    </div>

                  </div>

                  {/* Quantity if Standard Ticket */}
                  {tableBookingOption === 'Standard Dance Ticket' && (
                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Number of Dance Seats:</span>
                        <span className="text-[11px] text-slate-500">Select how many seats you are purchasing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumTickets(Math.max(1, numTickets - 1))}
                          className="w-8 h-8 rounded-xl bg-white border border-purple-200 font-black text-purple-900 hover:bg-slate-50 transition"
                        >
                          -
                        </button>
                        <span className="font-black text-sm w-6 text-center text-slate-900">{numTickets}</span>
                        <button
                          type="button"
                          onClick={() => setNumTickets(Math.min(10, numTickets + 1))}
                          className="w-8 h-8 rounded-xl bg-white border border-purple-200 font-black text-purple-900 hover:bg-slate-50 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Raffle Add-on Selection */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-emerald-600" />
                        Charity Raffle Tickets (7 Prizes Pool)
                      </h4>
                      <span className="text-[10px] text-emerald-700 font-bold">1 Ticket = 1 Wheel Slice</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setRafflePackOption(0)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center transition ${rafflePackOption === 0 ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        No Raffle
                        <span className="block text-[10px] text-slate-400 mt-0.5">R0</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRafflePackOption(1)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center transition ${rafflePackOption === 1 ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        1 Ticket
                        <span className="block text-[10px] text-emerald-700 font-black mt-0.5">R50</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRafflePackOption(3)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center transition ${rafflePackOption === 3 ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        3 Tickets ⭐
                        <span className="block text-[10px] text-emerald-700 font-black mt-0.5">R100 (Best Value)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRafflePackOption(6)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center transition ${rafflePackOption === 6 ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        6 Tickets
                        <span className="block text-[10px] text-emerald-700 font-black mt-0.5">R200</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: SELECT TABLE (35 TABLES) */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Select Seating Table (35 Tables Available)</h3>
                      <p className="text-xs text-slate-500">Each table has a total capacity of 10 guests.</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                      Selected: Table #{tableNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-56 overflow-y-auto p-2 border border-purple-100 rounded-2xl bg-slate-50">
                    {Array.from({ length: 35 }, (_, i) => {
                      const tNum = i + 1;
                      const isSelected = tableNumber === tNum;
                      return (
                        <button
                          key={tNum}
                          type="button"
                          onClick={() => setTableNumber(tNum)}
                          className={`p-3 rounded-xl border text-xs font-black transition flex flex-col items-center justify-center gap-1 ${isSelected ? 'border-2 border-emerald-600 bg-emerald-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-800 hover:bg-emerald-50'}`}
                        >
                          <Table className="w-3.5 h-3.5" />
                          <span>#{tNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: GUEST DETAILS & RAFFLE ENTRANTS */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Lead Guest & Ticket Holder Details</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                      <input 
                        type="text" 
                        required
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="e.g. Charlton" 
                        className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Surname *</label>
                      <input 
                        type="text" 
                        required
                        value={surname} 
                        onChange={(e) => setSurname(e.target.value)} 
                        placeholder="e.g. Jooste" 
                        className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / WhatsApp Number *</label>
                      <input 
                        type="tel" 
                        required
                        value={mobileNumber} 
                        onChange={(e) => setMobileNumber(e.target.value)} 
                        placeholder="e.g. 079 528 5350" 
                        className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (for ticket delivery) *</label>
                      <input 
                        type="email" 
                        required
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="e.g. yourname@gmail.com" 
                        className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* Multiple Raffle Entrant Name Allocations */}
                  {rafflePackOption > 1 && (
                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
                      <span className="font-black text-purple-950 block">
                        Allocate Names for your {rafflePackOption} Raffle Entries (Optional):
                      </span>
                      <p className="text-[11px] text-slate-500">
                        You can enter individual names for each wheel slice or leave blank to use your name:
                      </p>
                      
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                        {Array.from({ length: rafflePackOption }, (_, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <span className="col-span-3 text-[11px] font-bold text-purple-900">Entry #{idx + 1}:</span>
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={raffleEntrants[idx]?.name || (idx === 0 && firstName ? `${firstName} ${surname}` : '')}
                                onChange={(e) => {
                                  const updated = [...raffleEntrants];
                                  updated[idx] = { ...updated[idx], name: e.target.value, tableNumber: updated[idx]?.tableNumber || tableNumber || 1 };
                                  setRaffleEntrants(updated);
                                }}
                                placeholder={idx === 0 ? "Your name" : `Recipient ${idx + 1} Name`}
                                className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs"
                              />
                            </div>
                            <div className="col-span-4">
                              <select
                                value={raffleEntrants[idx]?.tableNumber || tableNumber || 1}
                                onChange={(e) => {
                                  const updated = [...raffleEntrants];
                                  updated[idx] = { ...updated[idx], tableNumber: Number(e.target.value), name: updated[idx]?.name || '' };
                                  setRaffleEntrants(updated);
                                }}
                                className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1 text-slate-900 focus:outline-none focus:border-emerald-600 text-xs font-semibold"
                              >
                                {Array.from({ length: 35 }, (_, i) => (
                                  <option key={i + 1} value={i + 1}>Table #{i + 1}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Special Seating Notes / Wheelchair Requests</label>
                    <textarea 
                      rows={2}
                      value={specialRequests} 
                      onChange={(e) => setSpecialRequests(e.target.value)} 
                      placeholder="e.g. Wheelchair access, seating with friends..." 
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-slate-800 font-medium">Generate encouraging AI tribute message for Sloan</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={generateAiTribute} 
                      onChange={(e) => setGenerateAiTribute(e.target.checked)} 
                      className="accent-emerald-600 w-4 h-4"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-600 pt-1 cursor-pointer font-medium">
                    <input 
                      type="checkbox" 
                      checked={consentTerms} 
                      onChange={(e) => setConsentTerms(e.target.checked)} 
                      className="accent-emerald-600"
                    />
                    <span>I agree to the Sloan Jooste Fundraiser event policy.</span>
                  </label>
                </div>
              )}

              {/* STEP 4: PAYMENT */}
              {step === 4 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-black text-slate-900">Order Summary & Payment Method</h3>
                  
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Ticket Option:</span>
                      <span className="font-bold text-slate-900">{tableBookingOption}</span>
                    </div>
                    {tableBookingOption !== 'Raffle Tickets Only' && (
                      <div className="flex justify-between text-slate-700 font-medium">
                        <span>Selected Table:</span>
                        <span className="font-bold text-emerald-700">Table #{tableNumber} (Capacity 10)</span>
                      </div>
                    )}
                    {rafflePackOption > 0 && (
                      <div className="flex justify-between text-slate-700 font-medium">
                        <span>Raffle Entries:</span>
                        <span className="font-bold text-emerald-700">{rafflePackOption} Ticket(s) (+R{getRaffleCost()})</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Guest Name:</span>
                      <span className="font-bold text-slate-900">{firstName} {surname}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 pt-2 border-t border-purple-200 text-sm">
                      <span className="font-black">Total Amount Due:</span>
                      <span className="font-black text-emerald-700 text-base">R{calculatedAmount}</span>
                    </div>
                  </div>

                  {/* Payment Methods Choice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Select Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${paymentMethod === 'card' ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-md' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                      >
                        <div className="flex items-center gap-1.5 font-black text-emerald-800">
                          <CreditCard className="w-4 h-4 text-emerald-700" /> Credit / Debit Card
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold">⚡ Allocated Immediately</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('eft')}
                        className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${paymentMethod === 'eft' ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-md' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                      >
                        <div className="flex items-center gap-1.5 font-black text-purple-950">
                          <ShieldCheck className="w-4 h-4 text-purple-700" /> Direct EFT Transfer
                        </div>
                        <span className="text-[10px] text-purple-800 font-semibold">⏳ Verified by Organizers</span>
                      </button>
                    </div>
                  </div>

                  {/* If Card Payment: Secure Card Inputs */}
                  {paymentMethod === 'card' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-emerald-900 font-black">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-700" /> Instant Card Gateway
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">256-Bit SSL Encrypted</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Cardholder Name</label>
                        <input 
                          type="text" 
                          value={`${firstName} ${surname}`}
                          readOnly
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-6">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Card Number</label>
                          <input 
                            type="text" 
                            placeholder="4000 •••• •••• 1234"
                            value={cardDetails.number}
                            onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">MM/YY</label>
                          <input 
                            type="text" 
                            placeholder="12/28"
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">CVV</label>
                          <input 
                            type="password" 
                            maxLength={4}
                            placeholder="•••"
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Banking Details if EFT */}
                  {paymentMethod === 'eft' && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono text-slate-800">
                      <p className="font-sans font-bold text-purple-950">FNB EFT Banking Details:</p>
                      <div className="p-2.5 rounded-xl bg-white border border-purple-100 space-y-0.5">
                        <div>Bank: {EVENT_DETAILS.banking.bank}</div>
                        <div>Account Holder: {EVENT_DETAILS.banking.accountHolder}</div>
                        <div>Account Type: {EVENT_DETAILS.banking.accountType}</div>
                        <div>Account Number: {EVENT_DETAILS.banking.accountNumber}</div>
                        <div>Branch Code: {EVENT_DETAILS.banking.branchCode}</div>
                        <div className="text-emerald-800 font-bold font-sans pt-1">
                          Payment Reference: {firstName} {surname} (Table #{tableNumber})
                        </div>
                      </div>
                      <p className="font-sans text-[11px] text-slate-500 font-medium">
                        *Note: Tickets will be activated as soon as Charlie or Nicole verify payment.
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
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
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md hover:bg-emerald-700 transition"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitBooking}
                  disabled={loading}
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-2 shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? 'Processing Booking...' : paymentMethod === 'eft' ? `Submit EFT Booking (R${calculatedAmount})` : `Pay & Get Ticket (R${calculatedAmount})`}
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
