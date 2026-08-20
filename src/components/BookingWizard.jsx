import React, { useState } from 'react';
import { X, Ticket, CreditCard, Heart, ArrowRight, ShieldCheck, Gift, Users, MapPin } from 'lucide-react';
import TableMapVisualizer from './TableMapVisualizer';
import { createBookingInFirestore, EVENT_DETAILS } from '../firebase';
import { generateTributeMessage } from '../services/gemini';

export default function BookingWizard({ isOpen, onClose, onBookingSuccess, tablesData, defaultOption }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [numTickets, setNumTickets] = useState(1);
  const [tableBookingOption, setTableBookingOption] = useState(defaultOption || 'Standard Dance Ticket');
  const [tableNumber, setTableNumber] = useState(1);
  const [rafflePackOption, setRafflePackOption] = useState(0); // 0, 1, 3, 6, 10
  const [raffleEntrants, setRaffleEntrants] = useState([]); // [{ name: '', tableNumber: 1 }]
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [consentTerms, setConsentTerms] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [generateAiTribute, setGenerateAiTribute] = useState(true);

  if (!isOpen) return null;

  // Calculate raffle price
  const getRaffleCost = () => {
    if (rafflePackOption === 1) return 50;
    if (rafflePackOption === 3) return 100;
    if (rafflePackOption === 6) return 200;
    if (rafflePackOption === 10) return 300;
    return 0;
  };

  // Calculate total price in ZAR (R)
  const getTicketPrice = () => {
    let base = 0;
    if (tableBookingOption === 'Full Private Table (10 Guests)') {
      base = 1500;
    } else if (tableBookingOption === 'Standard Dance Ticket') {
      base = 150 * numTickets;
    } else if (tableBookingOption === 'Raffle Tickets Only') {
      base = 0;
    }
    return base + getRaffleCost();
  };

  const calculatedAmount = getTicketPrice();

  // Sync raffleEntrants array length
  const handleSelectRaffleOption = (count) => {
    setRafflePackOption(count);
    let entrants = [...raffleEntrants];
    while (entrants.length < count) {
      entrants.push({
        name: entrants.length === 0 && firstName ? `${firstName} ${surname}` : '',
        tableNumber: tableNumber || 1
      });
    }
    if (entrants.length > count) {
      entrants = entrants.slice(0, count);
    }
    setRaffleEntrants(entrants);
  };

  const handleNext = () => {
    if (step === 1 && !tableBookingOption) {
      setError('Please select a ticket option.');
      return;
    }
    if (step === 1 && tableBookingOption === 'Raffle Tickets Only' && rafflePackOption === 0) {
      setError('Please choose at least 1 raffle ticket (R50 for 1 or R100 for 3).');
      return;
    }

    if (step === 1 && tableBookingOption === 'Raffle Tickets Only') {
      if (raffleEntrants.length === 0) {
        handleSelectRaffleOption(rafflePackOption || 3);
      }
      setStep(3);
      setError('');
      return;
    }

    if (step === 3) {
      if (!firstName.trim() || !surname.trim() || !email.trim() || !mobileNumber.trim()) {
        setError('Please complete all required contact fields.');
        return;
      }
      if (!consentTerms) {
        setError('Please consent to the event policy.');
        return;
      }
    }
    setError('');
    setStep(prev => prev + 1);
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
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalSpecialRequests = specialRequests;
      if (generateAiTribute) {
        const aiMessage = await generateTributeMessage(`${firstName} ${surname}`, calculatedAmount);
        finalSpecialRequests = specialRequests 
          ? `${specialRequests} | Tribute: "${aiMessage}"` 
          : `Tribute: "${aiMessage}"`;
      }

      const finalRaffleEntrants = raffleEntrants.map((ent, idx) => ({
        name: ent.name && ent.name.trim() ? ent.name.trim() : `${firstName} ${surname}${idx > 0 ? ` (Entry ${idx + 1})` : ''}`,
        tableNumber: Number(ent.tableNumber) || Number(tableNumber) || 1
      }));

      const bookingPayload = {
        firstName,
        surname,
        mobileNumber,
        email,
        numTickets: tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(numTickets),
        raffleTicketsCount: rafflePackOption,
        raffleEntrants: finalRaffleEntrants,
        tableBookingOption,
        tableNumber: tableBookingOption === 'Raffle Tickets Only' ? 0 : Number(tableNumber),
        specialRequests: finalSpecialRequests,
        consentTerms: Boolean(consentTerms),
        paymentStatus: 'paid',
        paymentMethod,
        amount: calculatedAmount
      };

      const newBooking = await createBookingInFirestore(bookingPayload);
      setLoading(false);
      onBookingSuccess(newBooking);
    } catch (err) {
      console.error("Booking error:", err);
      setError("Failed to process booking. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/flyer_sloan.jpg" alt="Sloan" className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
            <div>
              <h2 className="text-base font-black">Sloan Jooste's Fundraiser Dance</h2>
              <p className="text-xs text-emerald-300 font-bold">Step {step} of 4 • {step === 1 ? 'Select Package' : step === 2 ? 'Select Table (1-35)' : step === 3 ? 'Guest Details' : 'Payment'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 bg-purple-50 border-b border-purple-100 text-center text-xs font-bold">
          <div className={`py-2.5 border-b-2 ${step >= 1 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>1. Ticket</div>
          <div className={`py-2.5 border-b-2 ${step >= 2 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>2. Table (35)</div>
          <div className={`py-2.5 border-b-2 ${step >= 3 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>3. Details</div>
          <div className={`py-2.5 border-b-2 ${step >= 4 ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400'}`}>4. Payment</div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-slate-800">
          
          {/* STEP 1: TICKET OPTIONS + RAFFLE ADD-ON */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">Choose Ticket / Table Option</h3>
              
              <div className="grid gap-3">
                <label className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-4 ${tableBookingOption === 'Standard Dance Ticket' ? 'border-2 border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}`}>
                  <input 
                    type="radio" 
                    name="package" 
                    checked={tableBookingOption === 'Standard Dance Ticket'} 
                    onChange={() => { setTableBookingOption('Standard Dance Ticket'); setNumTickets(1); }} 
                    className="mt-1 accent-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 text-sm">Standard Dance Ticket</span>
                      <span className="font-black text-emerald-700 text-sm">R150 / person</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Includes admission, live music by The Elginairs, DJ Cool J, and dancefloor access.</p>
                  </div>
                </label>

                <label className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-4 ${tableBookingOption === 'Full Private Table (10 Guests)' ? 'border-2 border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}`}>
                  <input 
                    type="radio" 
                    name="package" 
                    checked={tableBookingOption === 'Full Private Table (10 Guests)'} 
                    onChange={() => { setTableBookingOption('Full Private Table (10 Guests)'); setNumTickets(10); }} 
                    className="mt-1 accent-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-purple-950 text-sm">Full Private Table (10 Guests)</span>
                      <span className="font-black text-emerald-700 text-sm">R1,500</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Reserve a complete private table of 10 for your friends and family (35 tables total capacity).</p>
                  </div>
                </label>

                <label className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-4 ${tableBookingOption === 'Raffle Tickets Only' ? 'border-2 border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}`}>
                  <input 
                    type="radio" 
                    name="package" 
                    checked={tableBookingOption === 'Raffle Tickets Only'} 
                    onChange={() => { 
                      setTableBookingOption('Raffle Tickets Only'); 
                      if (rafflePackOption === 0) handleSelectRaffleOption(3); 
                    }} 
                    className="mt-1 accent-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-emerald-900 text-sm flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-emerald-700" /> Charity Raffle Tickets Only
                      </span>
                      <span className="font-black text-emerald-700 text-sm">From R50</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Support Sloan's post-op treatment directly through our Grand Charity Raffle draw (21:00 - 21:30).</p>
                  </div>
                </label>
              </div>

              {tableBookingOption === 'Standard Dance Ticket' && (
                <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-800">Number of Dance Tickets:</label>
                  <select 
                    value={numTickets} 
                    onChange={(e) => setNumTickets(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <option key={n} value={n}>{n} Ticket{n > 1 ? 's' : ''} (R{n * 150})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* RAFFLE TICKET SELECTION / ADD-ON */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-black text-purple-950">Grand Raffle Tickets (Draw at 21:00)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    R50 for 1 • R100 for 3
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectRaffleOption(0)}
                    className={`py-2 px-3 rounded-xl border font-bold transition ${rafflePackOption === 0 ? 'bg-purple-900 border-purple-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'}`}
                  >
                    No Raffle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRaffleOption(1)}
                    className={`py-2 px-3 rounded-xl border font-black transition flex flex-col items-center ${rafflePackOption === 1 ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-500'}`}
                  >
                    <span>1 Ticket</span>
                    <span className={rafflePackOption === 1 ? 'text-emerald-100 text-[10px]' : 'text-emerald-700 text-[10px]'}>R50</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRaffleOption(3)}
                    className={`py-2 px-3 rounded-xl border font-black transition flex flex-col items-center ${rafflePackOption === 3 ? 'bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-400' : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-500'}`}
                  >
                    <span>3 Tickets</span>
                    <span className={rafflePackOption === 3 ? 'text-emerald-100 text-[10px]' : 'text-emerald-700 text-[10px]'}>R100 (Best Value)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: TABLE SELECTION MAP (35 TABLES) */}
          {step === 2 && tableBookingOption !== 'Raffle Tickets Only' && (
            <TableMapVisualizer 
              selectedTableNumber={tableNumber}
              onSelectTable={(no) => setTableNumber(no)}
              tablesData={tablesData}
            />
          )}

          {/* STEP 3: GUEST DETAILS & INDIVIDUAL RAFFLE TICKET ALLOCATION */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">Purchaser Contact Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    placeholder="Jane" 
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Surname *</label>
                  <input 
                    type="text" 
                    required 
                    value={surname} 
                    onChange={(e) => setSurname(e.target.value)} 
                    placeholder="Doe" 
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="jane@example.com" 
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (WhatsApp) *</label>
                  <input 
                    type="tel" 
                    required 
                    value={mobileNumber} 
                    onChange={(e) => setMobileNumber(e.target.value)} 
                    placeholder="+27 82 123 4567" 
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* INDIVIDUAL RAFFLE TICKET ALLOCATION (PERSON & TABLE) */}
              {rafflePackOption > 0 && (
                <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-emerald-700" /> Allocate {rafflePackOption} Raffle Ticket(s) to Person & Table
                    </span>
                    <span className="text-[10px] text-purple-800 font-bold">1 Ticket = 1 Slice</span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Assign which person and table each raffle ticket belongs to:
                  </p>

                  <div className="space-y-2">
                    {Array.from({ length: rafflePackOption }).map((_, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-purple-200 grid grid-cols-12 gap-2 items-center text-xs">
                        <span className="col-span-3 font-mono text-[10px] text-emerald-700 font-black">
                          Ticket #{idx + 1}:
                        </span>
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
                            className="w-full bg-slate-50 border border-purple-200 rounded-lg px-2.5 py-1 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs"
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
                            className="w-full bg-slate-50 border border-purple-200 rounded-lg px-2 py-1 text-slate-900 focus:outline-none focus:border-emerald-600 text-xs font-semibold"
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
                  className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-slate-800 font-medium">Generate AI encouragement message for Sloan</span>
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

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${paymentMethod === 'card' ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-md' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-700" /> Credit Card (Instant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('eft')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${paymentMethod === 'eft' ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-md' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-700" /> Direct EFT Transfer
                  </button>
                </div>
              </div>

              {/* Banking Details if EFT */}
              {paymentMethod === 'eft' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono text-slate-800">
                  <p className="font-sans font-bold text-purple-900 mb-1">EFT Banking Details:</p>
                  <div>Bank: {EVENT_DETAILS.banking.bank}</div>
                  <div>Account Name: {EVENT_DETAILS.banking.accountName}</div>
                  <div>Account Number: {EVENT_DETAILS.banking.accountNumber}</div>
                  <div>Branch Code: {EVENT_DETAILS.banking.branchCode}</div>
                  <div className="text-emerald-800 font-bold font-sans pt-1">Reference: {firstName} {surname} (Table #{tableNumber})</div>
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
              {loading ? 'Processing Payment...' : `Confirm & Pay R${calculatedAmount}`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
