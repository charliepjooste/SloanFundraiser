import React, { useState } from 'react';
import { 
  X, 
  Ticket, 
  Search, 
  Mail, 
  MessageCircle, 
  FileText, 
  Printer, 
  Table, 
  Gift, 
  Calendar, 
  MapPin, 
  ExternalLink,
  CreditCard,
  CheckCircle,
  Plus,
  Edit3,
  UserCheck,
  Save,
  Lock,
  Download
} from 'lucide-react';
import { 
  EVENT_DETAILS, 
  getShortReference, 
  generateWhatsAppMessage, 
  generateTicketEmailBody,
  updateGuestRecord
} from '../firebase';
import { downloadTicketPdf } from '../utils/generatePdfTicket';

export default function MyTicketsModal({ 
  isOpen, 
  onClose, 
  bookings = [], 
  currentEmail = '', 
  onEmailChange,
  onOpenBooking,
  onSelectTicketPass,
  onUpdateBooking
}) {
  const [inputEmail, setInputEmail] = useState(currentEmail || '');
  const [activeEmail, setActiveEmail] = useState(currentEmail || '');
  const [downloadingId, setDownloadingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Auto-load email from prop or localStorage on modal open
  useEffect(() => {
    const emailToUse = (currentEmail || localStorage.getItem('sloan_guest_email') || '').trim().toLowerCase();
    if (emailToUse) {
      setInputEmail(emailToUse);
      setActiveEmail(emailToUse);
    }
  }, [isOpen, currentEmail]);

  // Attendee Editing state
  const [editingBooking, setEditingBooking] = useState(null);
  const [editingNames, setEditingNames] = useState([]);
  const [editingRaffleEntrants, setEditingRaffleEntrants] = useState([]);
  const [isSavingNames, setIsSavingNames] = useState(false);

  if (!isOpen) return null;

  // Filter bookings by active email
  const userBookings = activeEmail 
    ? bookings.filter(b => (b.email || '').trim().toLowerCase() === activeEmail.trim().toLowerCase())
    : [];

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputEmail.trim()) {
      setActiveEmail(inputEmail.trim().toLowerCase());
      if (onEmailChange) onEmailChange(inputEmail.trim().toLowerCase());
    }
  };

  const handleOpenEditNames = (booking) => {
    const seatsCount = Number(booking.numTickets) || (booking.tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : 1);
    let names = booking.guestNames ? [...booking.guestNames] : [];
    
    while (names.length < seatsCount) {
      names.push(names.length === 0 ? `${booking.firstName} ${booking.surname}` : '');
    }
    if (names.length > seatsCount) {
      names = names.slice(0, seatsCount);
    }

    const raffleCount = Number(booking.raffleTicketsCount) || 0;
    let rEntrants = booking.raffleEntrants ? [...booking.raffleEntrants] : [];
    while (rEntrants.length < raffleCount) {
      rEntrants.push({ name: `${booking.firstName} ${booking.surname}`, tableNumber: booking.tableNumber || 1 });
    }
    if (rEntrants.length > raffleCount) {
      rEntrants = rEntrants.slice(0, raffleCount);
    }

    setEditingBooking(booking);
    setEditingNames(names);
    setEditingRaffleEntrants(rEntrants);
  };

  const handleSaveAttendeeNames = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;
    setIsSavingNames(true);

    try {
      await updateGuestRecord(editingBooking.id, {
        guestNames: editingNames,
        raffleEntrants: editingRaffleEntrants
      });

      if (onUpdateBooking) {
        onUpdateBooking(editingBooking.id, {
          guestNames: editingNames,
          raffleEntrants: editingRaffleEntrants
        });
      }

      setStatusMsg('✅ Attendee names updated successfully!');
      setTimeout(() => setStatusMsg(''), 4000);
      setEditingBooking(null);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to update attendee names');
      setTimeout(() => setStatusMsg(''), 4000);
    } finally {
      setIsSavingNames(false);
    }
  };

  // Download All Passes in Booking
  const handleDownloadAllPdf = async (booking) => {
    const ref = getShortReference(booking);
    setDownloadingId(booking.id);
    setStatusMsg(`⏳ Generating PDF passes for ${ref}...`);
    try {
      await downloadTicketPdf(booking, null);
      setStatusMsg(`✅ Downloaded all passes for ${ref}`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Error generating PDF');
      setTimeout(() => setStatusMsg(''), 4000);
    } finally {
      setDownloadingId(null);
    }
  };

  // Download Single Pass
  const handleDownloadSinglePdf = async (booking, passItem) => {
    setDownloadingId(`${booking.id}-${passItem.passRef}`);
    setStatusMsg(`⏳ Generating PDF for ${passItem.passRef}...`);
    try {
      await downloadTicketPdf(booking, passItem);
      setStatusMsg(`✅ Downloaded PDF for ${passItem.passRef}`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Error generating PDF');
      setTimeout(() => setStatusMsg(''), 4000);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleWhatsApp = (booking) => {
    const phone = (booking.mobileNumber || '').replace(/[^0-9]/g, '');
    const text = generateWhatsAppMessage(booking);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleGmail = (booking) => {
    const ticketRef = getShortReference(booking);
    const subject = encodeURIComponent(`🎟️ My Ticket Pass - Sloan Jooste's Fundraiser Dance (${ticketRef})`);
    const body = encodeURIComponent(generateTicketEmailBody(booking));
    window.open(`mailto:${booking.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white my-6 flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/10 border border-white/20">
              <Ticket className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">My Ticket Passes & Bookings</h2>
              <span className="text-[11px] text-emerald-200 font-medium">View passes, download individual tickets, or update attendee names</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold text-center animate-fadeIn shadow-sm">
            {statusMsg}
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Email Search Box */}
          <form onSubmit={handleSearch} className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
            <label className="block text-xs font-black text-purple-950">
              Enter the Email Address used during booking:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-purple-700 absolute left-3 top-3" />
                <input 
                  type="email" 
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
              <button 
                type="submit"
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" /> Find My Tickets
              </button>
            </div>
          </form>

          {/* Tickets Display */}
          {activeEmail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">
                  Tickets linked to: <span className="text-purple-900 font-mono">{activeEmail}</span> ({userBookings.length} found)
                </span>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenBooking) onOpenBooking('Standard Dance Ticket');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Buy More Tickets
                </button>
              </div>

              {userBookings.length === 0 ? (
                <div className="p-8 text-center rounded-3xl border border-slate-200 bg-slate-50 space-y-3">
                  <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-extrabold text-slate-700 text-sm">No tickets found for this email address</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Please make sure you typed the exact email address used when booking, or book your tickets below!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenBooking) onOpenBooking('Standard Dance Ticket');
                    }}
                    className="mt-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
                  >
                    Book Tickets Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userBookings.map((b) => {
                    const ticketRef = getShortReference(b);
                    const isEftPending = b.paymentStatus === 'pending_eft';

                    // Build list of individual issued tickets
                    const seatItems = [];
                    if (b.tableBookingOption !== 'Raffle Tickets Only') {
                      const seatsCount = b.tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : (Number(b.numTickets) || 1);
                      for (let s = 1; s <= seatsCount; s++) {
                        const name = (b.guestNames && b.guestNames[s - 1] && b.guestNames[s - 1].trim())
                          ? b.guestNames[s - 1].trim()
                          : (s === 1 ? `${b.firstName} ${b.surname}` : `${b.firstName} ${b.surname} (Seat ${s})`);
                        
                        seatItems.push({
                          type: 'seat',
                          passRef: `${ticketRef}-S${s}`,
                          label: `Seat #${s}`,
                          attendeeName: name
                        });
                      }
                    }

                    const raffleItems = [];
                    const raffleCount = Number(b.raffleTicketsCount) || 0;
                    for (let r = 1; r <= raffleCount; r++) {
                      const entrant = (b.raffleEntrants && b.raffleEntrants[r - 1]) ? b.raffleEntrants[r - 1] : null;
                      const name = (entrant && entrant.name && entrant.name.trim())
                        ? entrant.name.trim()
                        : `${b.firstName} ${b.surname}${raffleCount > 1 ? ` (Entry ${r})` : ''}`;
                      
                      raffleItems.push({
                        type: 'raffle',
                        passRef: `${ticketRef}-R${r}`,
                        label: `Raffle #${r}`,
                        attendeeName: name
                      });
                    }

                    return (
                      <div key={b.id} className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-4 hover:border-purple-300 transition">
                        
                        {/* Top bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black text-slate-900">{b.firstName} {b.surname}</h4>
                              <span className="font-mono text-xs font-black bg-purple-100 text-purple-950 px-2 py-0.5 rounded border border-purple-200">
                                {ticketRef}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {b.tableBookingOption === 'Raffle Tickets Only' ? '🎟️ Raffle Supporter Pass' : `Table #${b.tableNumber} • ${b.tableBookingOption}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isEftPending ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">
                                ⏳ Pending EFT Clearance
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                                R{b.amount} Paid
                              </span>
                            )}
                            {b.checkedIn && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                                Checked In
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                            <span className="text-[9px] uppercase font-bold text-purple-900 flex items-center justify-between">
                              <span>Table</span>
                              <Lock className="w-2.5 h-2.5 text-purple-400" title="Table allocation is fixed" />
                            </span>
                            <span className="font-black text-xs text-purple-950">
                              {b.tableBookingOption === 'Raffle Tickets Only' ? 'Raffle Only' : `Table #${b.tableNumber}`}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[9px] uppercase font-bold text-emerald-900 block">Dance Seats</span>
                            <span className="font-black text-xs text-emerald-950">{seatItems.length} Issued Pass(es)</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[9px] uppercase font-bold text-emerald-900 block">Raffle Entries</span>
                            <span className="font-black text-xs text-emerald-950">{raffleItems.length} Issued Pass(es)</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">Dress Code</span>
                            <span className="font-bold text-[11px] text-emerald-800">Splash of Green 💚</span>
                          </div>
                        </div>

                        {/* INDIVIDUAL ISSUED TICKETS LIST */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                              <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                              Individual Issued Tickets ({seatItems.length + raffleItems.length} Total):
                            </span>
                            <button
                              onClick={() => handleDownloadAllPdf(b)}
                              disabled={downloadingId === b.id}
                              className="text-[10px] font-black text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Download All Bundle (.pdf)
                            </button>
                          </div>

                          {/* Seat Tickets */}
                          {seatItems.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Dance Admission Passes:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {seatItems.map((st) => (
                                  <div key={st.passRef} className="p-2 rounded-xl bg-white border border-purple-100 flex items-center justify-between gap-1 shadow-2xs">
                                    <div className="truncate">
                                      <span className="font-mono text-[10px] font-black text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mr-1.5">
                                        {st.passRef}
                                      </span>
                                      <span className="font-semibold text-slate-800 text-[11px] truncate">{st.attendeeName}</span>
                                    </div>
                                    <button
                                      onClick={() => handleDownloadSinglePdf(b, st)}
                                      disabled={downloadingId === `${b.id}-${st.passRef}`}
                                      className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0 transition"
                                      title="Download PDF for this seat pass"
                                    >
                                      PDF ↓
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Raffle Tickets */}
                          {raffleItems.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Charity Raffle Entry Passes:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {raffleItems.map((rt) => (
                                  <div key={rt.passRef} className="p-2 rounded-xl bg-white border border-emerald-100 flex items-center justify-between gap-1 shadow-2xs">
                                    <div className="truncate">
                                      <span className="font-mono text-[10px] font-black text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mr-1.5">
                                        {rt.passRef}
                                      </span>
                                      <span className="font-semibold text-slate-800 text-[11px] truncate">{rt.attendeeName}</span>
                                    </div>
                                    <button
                                      onClick={() => handleDownloadSinglePdf(b, rt)}
                                      disabled={downloadingId === `${b.id}-${rt.passRef}`}
                                      className="p-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0 transition"
                                      title="Download PDF for this raffle pass"
                                    >
                                      PDF ↓
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Pass, Edit Attendees, WhatsApp, Gmail */}
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          
                          {/* View Digital Pass */}
                          <button
                            onClick={() => {
                              if (onSelectTicketPass) onSelectTicketPass(b);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                          >
                            <Ticket className="w-3.5 h-3.5" /> View Digital Pass Pass
                          </button>

                          {/* Edit Attendee Names Button */}
                          <button
                            onClick={() => handleOpenEditNames(b)}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-purple-950 font-bold text-xs flex items-center gap-1 transition"
                            title="Edit individual names on your tickets"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-purple-700" /> Edit Names
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleWhatsApp(b)}
                            className="py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 transition"
                            title="Send to your WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" /> WhatsApp
                          </button>

                          {/* Gmail */}
                          <button
                            onClick={() => handleGmail(b)}
                            className="py-2 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1 transition"
                            title="Open in Gmail"
                          >
                            <Mail className="w-3.5 h-3.5 text-purple-700" /> Gmail
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL: EDIT ATTENDEE NAMES (Table is LOCKED) */}
        {editingBooking && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-3xl border border-purple-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Edit Guest Names on Tickets</h3>
                  <p className="text-[11px] text-purple-900 font-semibold">
                    Table #{editingBooking.tableNumber} (Fixed Allocation)
                  </p>
                </div>
                <button 
                  onClick={() => setEditingBooking(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAttendeeNames} className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Individual Attendee Names for your Seats:</span>
                  {editingNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-bold text-purple-900 w-16 shrink-0">Seat #{idx + 1}:</span>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => {
                          const updated = [...editingNames];
                          updated[idx] = e.target.value;
                          setEditingNames(updated);
                        }}
                        placeholder={`Attendee ${idx + 1} Full Name`}
                        className="flex-1 bg-slate-50 border border-purple-200 rounded-xl px-3 py-1.5 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  ))}
                </div>

                {editingRaffleEntrants.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-700 block">Raffle Entrant Names:</span>
                    {editingRaffleEntrants.map((ent, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800 w-16 shrink-0">Raffle #{idx + 1}:</span>
                        <input 
                          type="text" 
                          value={ent.name}
                          onChange={(e) => {
                            const updated = [...editingRaffleEntrants];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditingRaffleEntrants(updated);
                          }}
                          placeholder={`Raffle Entrant ${idx + 1}`}
                          className="flex-1 bg-slate-50 border border-purple-200 rounded-xl px-3 py-1.5 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[10px] text-purple-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Table #{editingBooking.tableNumber} is reserved. To request a table change, contact Nicole or Charlie.</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingNames}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow"
                  >
                    <Save className="w-3.5 h-3.5" /> {isSavingNames ? 'Saving...' : 'Save Names'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Need help? Nicole Jooste: 071 113 4812</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
