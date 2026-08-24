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
  Plus
} from 'lucide-react';
import { 
  EVENT_DETAILS, 
  getShortReference, 
  generateWhatsAppMessage, 
  generateTicketEmailBody 
} from '../firebase';
import { downloadTicketPdf } from '../utils/generatePdfTicket';

export default function MyTicketsModal({ 
  isOpen, 
  onClose, 
  bookings = [], 
  currentEmail = '', 
  onEmailChange,
  onOpenBooking,
  onSelectTicketPass
}) {
  const [inputEmail, setInputEmail] = useState(currentEmail || '');
  const [activeEmail, setActiveEmail] = useState(currentEmail || '');
  const [downloadingId, setDownloadingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

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

  const handleDownloadPdf = async (booking) => {
    setDownloadingId(booking.id);
    setStatusMsg('⏳ Generating PDF ticket...');
    try {
      await downloadTicketPdf(booking);
      setStatusMsg(`✅ Downloaded PDF for ${getShortReference(booking)}`);
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
              <span className="text-[11px] text-emerald-200 font-medium">View, download PDF, or send to WhatsApp & Gmail</span>
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
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                              R{b.amount} Paid
                            </span>
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
                            <span className="text-[9px] uppercase font-bold text-purple-900 block">Table</span>
                            <span className="font-black text-xs text-purple-950">
                              {b.tableBookingOption === 'Raffle Tickets Only' ? 'Raffle Only' : `Table #${b.tableNumber}`}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[9px] uppercase font-bold text-emerald-900 block">Dance Seats</span>
                            <span className="font-black text-xs text-emerald-950">{b.numTickets || 1} Seat(s)</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[9px] uppercase font-bold text-emerald-900 block">Raffle Entries</span>
                            <span className="font-black text-xs text-emerald-950">{b.raffleTicketsCount || 0} Tickets</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">Dress Code</span>
                            <span className="font-bold text-[11px] text-emerald-800">Splash of Green 💚</span>
                          </div>
                        </div>

                        {/* Action Buttons: Pass, PDF, WhatsApp, Gmail */}
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          
                          {/* View Digital Pass */}
                          <button
                            onClick={() => {
                              if (onSelectTicketPass) onSelectTicketPass(b);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                          >
                            <Ticket className="w-3.5 h-3.5" /> View Digital Pass
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPdf(b)}
                            disabled={downloadingId === b.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                          >
                            <FileText className="w-3.5 h-3.5" /> Download PDF (.pdf)
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

                        {/* Buy Extra Raffle Entries EFT notice */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-purple-900">Want extra raffle tickets (R50/1 • R100/3)?</span>
                            <p className="text-[10px] text-slate-500">
                              EFT to <strong>FNB (Acc: 62334900091)</strong> with reference: <strong className="text-emerald-700 font-mono">{ticketRef}</strong>
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

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
