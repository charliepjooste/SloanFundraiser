import React, { useState } from 'react';
import { Search, CheckCircle2, UserCheck, Clock, Table, Phone, Mail, MessageCircle, Send, Ticket } from 'lucide-react';
import { toggleGuestCheckIn, generateWhatsAppMessage, resendTicketEmail, getShortReference } from '../firebase';

export default function CheckInPortal({ bookings = [], onViewTicketPass }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toastMsg, setToastMsg] = useState('');

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    const shortRef = getShortReference(b).toLowerCase();
    const nameMatch = `${b.firstName || ''} ${b.surname || ''}`.toLowerCase().includes(term);
    const emailMatch = (b.email || '').toLowerCase().includes(term);
    const phoneMatch = (b.mobileNumber || '').includes(term);
    const tableMatch = String(b.tableNumber || '').includes(term);
    const refMatch = shortRef.includes(term);
    const matchesSearch = nameMatch || emailMatch || phoneMatch || tableMatch || refMatch;

    if (filterStatus === 'checkedIn') return matchesSearch && b.checkedIn;
    if (filterStatus === 'pending') return matchesSearch && !b.checkedIn;
    return matchesSearch;
  });

  const totalGuests = bookings.reduce((sum, b) => sum + (Number(b.numTickets) || 1), 0);
  const checkedInCount = bookings.reduce((sum, b) => b.checkedIn ? sum + (Number(b.numTickets) || 1) : sum, 0);
  const percentCheckedIn = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  const handleCheckInToggle = async (bookingId, currentState) => {
    try {
      await toggleGuestCheckIn(bookingId, currentState);
    } catch (err) {
      console.error("Check-in update failed:", err);
    }
  };

  const handleOpenWhatsApp = (booking) => {
    const phone = (booking.mobileNumber || '').replace(/[^0-9]/g, '');
    const text = generateWhatsAppMessage(booking);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleResendEmail = async (booking) => {
    try {
      await resendTicketEmail(booking);
      setToastMsg(`✅ Ticket resent to ${booking.email}`);
      setTimeout(() => setToastMsg(''), 3500);
    } catch (e) {
      setToastMsg('❌ Error resending ticket');
      setTimeout(() => setToastMsg(''), 3500);
    }
  };

  return (
    <div className="space-y-6">
      
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs shadow-sm animate-fadeIn">
          {toastMsg}
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>Total Expected Guests</span>
            <UserCheck className="w-5 h-5 text-purple-700" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalGuests} Guests</p>
          <span className="text-xs text-purple-800 font-medium">35 Tables (350 Seats)</span>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-300 shadow-sm">
          <div className="flex justify-between items-center text-emerald-800 text-xs font-bold">
            <span>Checked-In at Door</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-1">{checkedInCount} Checked-In</p>
          <span className="text-xs text-emerald-800/80 font-bold">{percentCheckedIn}% of total attendees</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>Awaiting Arrival</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-700 mt-1">{totalGuests - checkedInCount} Remaining</p>
          <span className="text-xs text-slate-500 font-medium">Doors open 19:00</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-purple-600 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search guest, phone, table, ref (SJ-XXXX)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-purple-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition ${filterStatus === 'all' ? 'bg-purple-900 border-purple-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilterStatus('checkedIn')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition ${filterStatus === 'checkedIn' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Checked-In
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition ${filterStatus === 'pending' ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Awaiting
          </button>
        </div>
      </div>

      {/* Guests Table */}
      <div className="overflow-x-auto rounded-3xl border border-purple-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-purple-50/70 border-b border-purple-200 text-purple-900 uppercase tracking-wider font-extrabold text-[11px]">
              <th className="p-3.5">Guest Name & Ref</th>
              <th className="p-3.5">Contact Info</th>
              <th className="p-3.5">Table (1-35)</th>
              <th className="p-3.5">Tickets</th>
              <th className="p-3.5">Payment</th>
              <th className="p-3.5 text-right">Check-In & Pass</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                  No guest bookings found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-emerald-50/40 transition">
                  <td className="p-3.5">
                    <div className="font-black text-slate-900 text-sm">{b.firstName} {b.surname}</div>
                    <span className="inline-block mt-0.5 font-mono text-[10px] bg-purple-100 text-purple-950 font-bold px-2 py-0.5 rounded border border-purple-200">
                      {getShortReference(b)}
                    </span>
                  </td>
                  <td className="p-3.5 space-y-0.5 font-medium">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3 h-3 text-purple-700" /> {b.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3 h-3 text-emerald-600" /> {b.mobileNumber}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold">
                      <Table className="w-3.5 h-3.5 text-emerald-600" /> Table #{b.tableNumber}
                    </span>
                  </td>
                  <td className="p-3.5 font-black text-slate-900">
                    {b.numTickets} Seat(s) {b.raffleTicketsCount > 0 && `• ${b.raffleTicketsCount} Raffle`}
                  </td>
                  <td className="p-3.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {b.paymentStatus || 'Paid'} (R{b.amount})
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* View & PDF Pass */}
                      {onViewTicketPass && (
                        <button
                          onClick={() => onViewTicketPass(b)}
                          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                          title="View Digital Pass & PDF"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenWhatsApp(b)}
                        className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
                        title="Send ticket via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleResendEmail(b)}
                        className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 transition"
                        title="Resend email ticket"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCheckInToggle(b.id, b.checkedIn)}
                        className={`py-1.5 px-3 rounded-xl font-black text-xs flex items-center gap-1.5 transition ${b.checkedIn ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'}`}
                      >
                        {b.checkedIn ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-700" /> Check In
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
