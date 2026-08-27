import React, { useState, useMemo } from 'react';
import { 
  Search, 
  CheckCircle2, 
  UserCheck, 
  Clock, 
  Table, 
  Phone, 
  Mail, 
  MessageCircle, 
  Send, 
  Ticket, 
  Heart, 
  Users, 
  CheckSquare, 
  Square,
  Sparkles,
  QrCode,
  Layers
} from 'lucide-react';
import { 
  toggleSeatCheckIn, 
  toggleAllSeatsCheckIn,
  toggleGuestCheckIn, 
  generateWhatsAppMessage, 
  resendTicketEmail, 
  getShortReference, 
  matchBookingSearch, 
  getBookingSeatCount 
} from '../firebase';

export default function CheckInPortal({ bookings = [], onViewTicketPass }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'checkedIn' | 'pending'
  const [filterTable, setFilterTable] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Flatten bookings into individual ticket passes
  const allTicketPasses = useMemo(() => {
    const passes = [];

    (bookings || []).forEach((b) => {
      const baseRef = getShortReference(b);
      const seatsCount = getBookingSeatCount(b);
      const isRaffleOnly = b.tableBookingOption === 'Raffle Tickets Only';
      const isDonationOnly = b.tableBookingOption === 'Direct Donation Only';

      if (seatsCount > 0) {
        const allocatedSeats = (b.allocatedSeats && Array.isArray(b.allocatedSeats) && b.allocatedSeats.length > 0)
          ? b.allocatedSeats
          : Array.from({ length: seatsCount }, (_, i) => i + 1);

        for (let s = 1; s <= seatsCount; s++) {
          const seatNumber = allocatedSeats[s - 1] || s;
          const attendeeName = (b.guestNames && b.guestNames[s - 1] && b.guestNames[s - 1].trim())
            ? b.guestNames[s - 1].trim()
            : (s === 1 ? `${b.firstName} ${b.surname}` : `${b.firstName} ${b.surname} (Seat #${seatNumber})`);

          const isCheckedIn = Array.isArray(b.checkedInSeats)
            ? b.checkedInSeats.map(Number).includes(Number(seatNumber))
            : Boolean(b.checkedIn);

          passes.push({
            id: `${b.id}-S${seatNumber}`,
            bookingId: b.id,
            passRef: `${baseRef}-S${seatNumber}`,
            baseRef: baseRef,
            seatNumber: seatNumber,
            seatIndex: s,
            totalSeatsInBooking: seatsCount,
            attendeeName: attendeeName,
            primaryGuest: `${b.firstName} ${b.surname}`,
            tableNumber: b.tableNumber || 1,
            tableBookingOption: b.tableBookingOption || 'Standard Dance Ticket',
            email: b.email || '',
            mobileNumber: b.mobileNumber || '',
            paymentStatus: b.paymentStatus || 'paid',
            amount: b.amount || 0,
            isCheckedIn: isCheckedIn,
            checkedInAt: b.checkedInAt || null,
            ticketType: 'seat',
            rawBooking: b
          });
        }
      } else {
        // Raffle Supporter or Direct Donation (No table seat)
        const isCheckedIn = Boolean(b.checkedIn);
        passes.push({
          id: `${b.id}-supporter`,
          bookingId: b.id,
          passRef: b.raffleTicketsCount > 0 ? `${baseRef}-R1` : baseRef,
          baseRef: baseRef,
          seatNumber: null,
          seatIndex: 1,
          totalSeatsInBooking: 0,
          attendeeName: `${b.firstName} ${b.surname}`,
          primaryGuest: `${b.firstName} ${b.surname}`,
          tableNumber: null,
          tableBookingOption: isRaffleOnly ? 'Raffle Tickets Only' : isDonationOnly ? 'Direct Donation Only' : 'Supporter',
          email: b.email || '',
          mobileNumber: b.mobileNumber || '',
          paymentStatus: b.paymentStatus || 'paid',
          amount: b.amount || 0,
          isCheckedIn: isCheckedIn,
          checkedInAt: b.checkedInAt || null,
          ticketType: isRaffleOnly ? 'raffle' : 'donation',
          rawBooking: b
        });
      }
    });

    return passes;
  }, [bookings]);

  // Filter individual ticket passes based on search term and filter controls
  const filteredPasses = useMemo(() => {
    return allTicketPasses.filter((pass) => {
      // 1. Status filter
      if (filterStatus === 'checkedIn' && !pass.isCheckedIn) return false;
      if (filterStatus === 'pending' && pass.isCheckedIn) return false;

      // 2. Table filter
      if (filterTable !== 'all') {
        if (Number(filterTable) !== Number(pass.tableNumber)) return false;
      }

      // 3. Search query
      if (!searchTerm.trim()) return true;

      const q = searchTerm.trim().toLowerCase().replace(/^(ref:\s*|#)/, '');
      const passRefLower = (pass.passRef || '').toLowerCase();
      const baseRefLower = (pass.baseRef || '').toLowerCase();
      const attendeeLower = (pass.attendeeName || '').toLowerCase();
      const primaryLower = (pass.primaryGuest || '').toLowerCase();
      const emailLower = (pass.email || '').toLowerCase();
      const phoneClean = (pass.mobileNumber || '').replace(/[^0-9]/g, '');
      const qClean = q.replace(/[^0-9]/g, '');

      if (passRefLower.includes(q)) return true;
      if (baseRefLower.includes(q)) return true;
      if (attendeeLower.includes(q)) return true;
      if (primaryLower.includes(q)) return true;
      if (emailLower.includes(q)) return true;
      if (qClean.length >= 3 && phoneClean.includes(qClean)) return true;
      if (pass.tableNumber && (q === `table ${pass.tableNumber}` || q === `table #${pass.tableNumber}` || q === `${pass.tableNumber}`)) return true;
      if (pass.seatNumber && (q === `seat ${pass.seatNumber}` || q === `seat #${pass.seatNumber}` || q === `s${pass.seatNumber}`)) return true;

      return false;
    });
  }, [allTicketPasses, searchTerm, filterStatus, filterTable]);

  // KPI Calculations
  const totalTicketsCount = allTicketPasses.length;
  const checkedInTicketsCount = allTicketPasses.filter(p => p.isCheckedIn).length;
  const awaitingTicketsCount = totalTicketsCount - checkedInTicketsCount;
  const percentCheckedIn = totalTicketsCount > 0 ? Math.round((checkedInTicketsCount / totalTicketsCount) * 100) : 0;

  // Single Seat Check-In Handler
  const handleSingleSeatToggle = async (pass) => {
    if (processingId) return;
    setProcessingId(pass.id);
    try {
      if (pass.seatNumber !== null) {
        await toggleSeatCheckIn(pass.bookingId, pass.seatNumber, pass.isCheckedIn, pass.rawBooking);
      } else {
        await toggleGuestCheckIn(pass.bookingId, pass.isCheckedIn);
      }
      setToastMsg(`${pass.isCheckedIn ? '↩️ Unchecked' : '✅ Checked In'}: ${pass.passRef} (${pass.attendeeName})`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      console.error("Seat check-in toggle error:", err);
      setToastMsg('❌ Failed to update check-in status');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setProcessingId(null);
    }
  };

  // Group Check-In Handler (Checks in all seats for this booking in one click)
  const handleGroupCheckIn = async (pass, checkInAllState = true) => {
    if (processingId) return;
    setProcessingId(pass.bookingId);
    try {
      await toggleAllSeatsCheckIn(pass.bookingId, checkInAllState, pass.rawBooking);
      setToastMsg(`🎉 Group ${checkInAllState ? 'Checked In' : 'Unchecked'}: All ${pass.totalSeatsInBooking} seats for ${pass.primaryGuest} (${pass.baseRef})`);
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      console.error("Group check-in error:", err);
      setToastMsg('❌ Failed to update group check-in');
      setTimeout(() => setToastMsg(''), 3500);
    } finally {
      setProcessingId(null);
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

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-black text-xs shadow-md animate-fadeIn flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-emerald-800 hover:text-emerald-950 text-xs font-bold">✕</button>
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>Total Individual Tickets</span>
            <Ticket className="w-5 h-5 text-purple-700" />
          </div>
          <p className="text-3xl font-black text-slate-900">{totalTicketsCount} Passes</p>
          <span className="text-xs text-purple-800 font-bold block">
            Across {bookings.length} Bookings • 35 Tables (350 Seats)
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-300 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-emerald-800 text-xs font-bold">
            <span>Checked-In at Door</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{checkedInTicketsCount} Checked-In</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-emerald-200 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentCheckedIn}%` }}></div>
            </div>
            <span className="text-xs text-emerald-900 font-black">{percentCheckedIn}%</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
            <span>Awaiting Arrival</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-700">{awaitingTicketsCount} Remaining</p>
          <span className="text-xs text-slate-500 font-medium block">Doors open 19:00 • Kuils River Technical</span>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-white border border-purple-200 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ticket # (e.g. SJ-7046-S2), guest name, phone, table..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-purple-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-emerald-600"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          
          {/* Table Filter Dropdown */}
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="bg-slate-50 border border-purple-200 rounded-xl px-3 py-1.5 text-purple-950 font-bold focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Tables (1-35)</option>
            {Array.from({ length: 35 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>Table #{num}</option>
            ))}
          </select>

          {/* Status Segmented Buttons */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl border font-black transition cursor-pointer ${filterStatus === 'all' ? 'bg-purple-900 border-purple-900 text-white shadow-sm' : 'border-slate-200 text-slate-700 bg-white hover:bg-purple-50'}`}
          >
            All ({allTicketPasses.length})
          </button>
          <button
            onClick={() => setFilterStatus('checkedIn')}
            className={`px-3 py-1.5 rounded-xl border font-black transition cursor-pointer ${filterStatus === 'checkedIn' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'border-slate-200 text-slate-700 bg-white hover:bg-emerald-50'}`}
          >
            ✓ Checked-In ({checkedInTicketsCount})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl border font-black transition cursor-pointer ${filterStatus === 'pending' ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'border-slate-200 text-slate-700 bg-white hover:bg-amber-50'}`}
          >
            ⏳ Awaiting ({awaitingTicketsCount})
          </button>
        </div>
      </div>

      {/* Individual Ticket Passes Table */}
      <div className="overflow-x-auto rounded-3xl border border-purple-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-purple-50/80 border-b border-purple-200 text-purple-950 uppercase tracking-wider font-extrabold text-[11px]">
              <th className="p-3.5">Ticket # & Pass Ref</th>
              <th className="p-3.5">Attendee / Guest Name</th>
              <th className="p-3.5">Table & Seat</th>
              <th className="p-3.5">Primary Contact / Buyer</th>
              <th className="p-3.5">Booking / Payment</th>
              <th className="p-3.5 text-right">Door Check-In Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredPasses.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                  <div className="space-y-2 max-w-sm mx-auto">
                    <Ticket className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No individual ticket passes found matching your filter.</p>
                    <p className="text-xs text-slate-500">Try searching for a different name, ticket number (e.g. SJ-7046-S1), or clear your table filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPasses.map((pass) => {
                const isMultiTicket = pass.totalSeatsInBooking > 1;
                const isCheckedIn = pass.isCheckedIn;

                return (
                  <tr 
                    key={pass.id} 
                    className={`transition duration-150 ${isCheckedIn ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-purple-50/30'}`}
                  >
                    {/* Column 1: Individual Ticket Number */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 font-mono text-xs font-black px-2.5 py-1 rounded-xl border shadow-2xs ${isCheckedIn ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-purple-100 text-purple-950 border-purple-200'}`}>
                            <Ticket className="w-3.5 h-3.5 text-purple-700" />
                            {pass.passRef}
                          </span>
                        </div>
                        {pass.ticketType === 'seat' && (
                          <span className="inline-block text-[10px] font-bold text-purple-900">
                            {pass.tableBookingOption === 'Full Private Table (10 Guests)' ? `👑 Full Table • Pass ${pass.seatIndex} of 10` : `Seat Pass ${pass.seatIndex} of ${pass.totalSeatsInBooking}`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Attendee Name */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{pass.attendeeName}</span>
                          {isCheckedIn && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" title="Checked in at door" />
                          )}
                        </div>
                        {isMultiTicket && pass.attendeeName !== pass.primaryGuest && (
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Part of {pass.primaryGuest}'s party ({pass.totalSeatsInBooking} Seats)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 3: Table & Seat */}
                    <td className="p-3.5">
                      {pass.tableNumber ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-black text-xs">
                            <Table className="w-3.5 h-3.5 text-emerald-700" /> Table #{pass.tableNumber}
                          </span>
                          {pass.seatNumber && (
                            <span className="block text-[10px] text-purple-950 font-extrabold pl-1">
                              Seat #{pass.seatNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold">
                          {pass.tableBookingOption}
                        </span>
                      )}
                    </td>

                    {/* Column 4: Primary Contact / Buyer */}
                    <td className="p-3.5 space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[180px]">
                        {pass.primaryGuest}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate max-w-[180px]">
                        <Mail className="w-3 h-3 text-purple-700 shrink-0" />
                        <span className="truncate">{pass.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{pass.mobileNumber}</span>
                      </div>
                    </td>

                    {/* Column 5: Booking / Payment */}
                    <td className="p-3.5 space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${pass.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                        {pass.paymentStatus === 'paid' ? '✓ Paid' : '⏳ EFT Pending'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        Ref: {pass.baseRef}
                      </span>
                    </td>

                    {/* Column 6: Door Check-In Action Buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                        
                        {/* View Pass Modal */}
                        {onViewTicketPass && (
                          <button
                            onClick={() => onViewTicketPass(pass.rawBooking)}
                            className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold transition cursor-pointer"
                            title="View Digital QR Pass & PDF"
                          >
                            <Ticket className="w-3.5 h-3.5 text-purple-700" />
                          </button>
                        )}

                        {/* WhatsApp Pass Link */}
                        <button
                          onClick={() => handleOpenWhatsApp(pass.rawBooking)}
                          className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer"
                          title="Send ticket pass on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                        </button>

                        {/* Group Check-In Button (If multi-ticket booking) */}
                        {isMultiTicket && (
                          <button
                            onClick={() => handleGroupCheckIn(pass, !isCheckedIn)}
                            disabled={processingId === pass.bookingId}
                            className="py-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-950 font-extrabold text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title={`Check in all ${pass.totalSeatsInBooking} seats for ${pass.primaryGuest}`}
                          >
                            <Layers className="w-3 h-3 text-purple-700" />
                            <span>All {pass.totalSeatsInBooking}</span>
                          </button>
                        )}

                        {/* INDIVIDUAL TICKET CHECK-IN BUTTON */}
                        <button
                          onClick={() => handleSingleSeatToggle(pass)}
                          disabled={processingId === pass.id}
                          className={`py-2 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0 ${isCheckedIn ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600' : 'bg-slate-900 hover:bg-emerald-600 text-white border border-slate-900'}`}
                        >
                          {isCheckedIn ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                              <span>Checked In</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                              <span>Check In</span>
                            </>
                          )}
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
