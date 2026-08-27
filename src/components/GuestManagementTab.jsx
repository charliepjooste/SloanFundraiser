import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  Trash2, 
  Plus, 
  Gift, 
  Table, 
  CheckCircle2, 
  X, 
  Phone, 
  Mail, 
  Ticket, 
  Share2, 
  Send,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { 
  updateGuestRecord, 
  deleteGuestRecord, 
  createBookingInFirestore, 
  resendTicketEmail, 
  generateWhatsAppMessage, 
  generateTicketEmailBody,
  getShortReference,
  matchBookingSearch,
  approveEftPayment,
  EVENT_DETAILS 
} from '../firebase';

export default function GuestManagementTab({ 
  bookings = [], 
  tablesData = [],
  onUpdateBooking,
  onDeleteBooking,
  onAddBooking,
  onViewTicketPass
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [raffleFilter, setRaffleFilter] = useState('all');
  const [emailStatusMsg, setEmailStatusMsg] = useState('');

  // Handle Admin clearing EFT funds
  const handleApproveEft = async (booking) => {
    setEmailStatusMsg(`⏳ Clearing EFT funds for ${booking.firstName} ${booking.surname}...`);
    try {
      await approveEftPayment(booking);
      if (onUpdateBooking) {
        onUpdateBooking(booking.id, { paymentStatus: 'paid' });
      }
      setEmailStatusMsg(`✅ Funds Cleared & Ticket Pass Activated for ${booking.firstName} ${booking.surname}!`);
      setTimeout(() => setEmailStatusMsg(''), 5000);
    } catch (e) {
      console.error(e);
      setEmailStatusMsg('❌ Error clearing EFT payment');
      setTimeout(() => setEmailStatusMsg(''), 4000);
    }
  };
  
  // Modals
  const [editingGuest, setEditingGuest] = useState(null);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    surname: '',
    email: '',
    mobileNumber: '',
    tableNumber: 1,
    numTickets: 1,
    raffleTicketsCount: 0,
    raffleEntrants: [],
    tableBookingOption: 'Standard Dance Ticket'
  });

  // Filter bookings using universal search matcher
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = !searchTerm.trim() || matchBookingSearch(b, searchTerm);

    if (tableFilter !== 'all' && Number(b.tableNumber) !== Number(tableFilter)) return false;
    if (raffleFilter === 'hasRaffle' && (Number(b.raffleTicketsCount) || 0) === 0) return false;
    if (raffleFilter === 'noRaffle' && (Number(b.raffleTicketsCount) || 0) > 0) return false;

    return matchesSearch;
  });

  // Dynamic table occupancy calculation across 35 tables (10 capacity each = 350 seats)
  const tables = Array.from({ length: 35 }, (_, i) => {
    const tableNo = i + 1;
    const tableBookings = (bookings || []).filter(
      b => Number(b.tableNumber) === tableNo && 
      b.tableBookingOption !== 'Raffle Tickets Only' && 
      b.tableBookingOption !== 'Direct Donation Only'
    );
    const occupiedSeats = tableBookings.reduce(
      (sum, b) => sum + (b.tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : (Number(b.numTickets) || 1)), 
      0
    );
    const capacity = 10;
    const remainingSeats = Math.max(0, capacity - occupiedSeats);
    const isFull = remainingSeats === 0 || occupiedSeats >= capacity;

    return {
      tableNumber: tableNo,
      capacity,
      occupiedSeats,
      remainingSeats,
      isFull,
      bookings: tableBookings
    };
  });

  // Calculate summary stats
  const totalGuests = bookings.reduce((sum, b) => sum + (Number(b.numTickets) || 0), 0);
  const totalRaffleTicketsBought = bookings.reduce((sum, b) => sum + (Number(b.raffleTicketsCount) || 0), 0);
  const totalBookingsCount = bookings.length;

  // Open Edit Modal and initialize raffleEntrants array
  const handleOpenEdit = (guest) => {
    const count = Number(guest.raffleTicketsCount) || 0;
    let entrants = guest.raffleEntrants ? [...guest.raffleEntrants] : [];
    
    while (entrants.length < count) {
      entrants.push({
        name: entrants.length === 0 ? `${guest.firstName} ${guest.surname}` : '',
        tableNumber: guest.tableNumber || 1
      });
    }
    if (entrants.length > count) {
      entrants = entrants.slice(0, count);
    }

    setEditingGuest({
      ...guest,
      raffleTicketsCount: count,
      raffleEntrants: entrants
    });
  };

  // Save changes from Edit Modal
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;

    const updatedData = {
      firstName: editingGuest.firstName,
      surname: editingGuest.surname,
      email: editingGuest.email,
      mobileNumber: editingGuest.mobileNumber,
      tableNumber: Number(editingGuest.tableNumber) || 1,
      numTickets: Number(editingGuest.numTickets) || 0,
      raffleTicketsCount: Number(editingGuest.raffleTicketsCount) || 0,
      raffleEntrants: editingGuest.raffleEntrants || [],
      specialRequests: editingGuest.specialRequests || ''
    };

    if (onUpdateBooking) {
      onUpdateBooking(editingGuest.id, updatedData);
    }

    try {
      await updateGuestRecord(editingGuest.id, updatedData);
    } catch (err) {
      console.error("Failed to update guest:", err);
    }
    setEditingGuest(null);
  };

  // Delete guest record
  const handleDeleteGuest = async (bookingId, guestName) => {
    if (window.confirm(`Are you sure you want to delete ${guestName}?`)) {
      if (onDeleteBooking) {
        onDeleteBooking(bookingId);
      }
      try {
        await deleteGuestRecord(bookingId);
      } catch (err) {
        console.error("Failed to delete guest:", err);
      }
    }
  };

  // Resend email ticket
  const handleResendEmail = async (booking) => {
    try {
      await resendTicketEmail(booking);
      setEmailStatusMsg(`✅ Ticket email resent to ${booking.email}`);
      setTimeout(() => setEmailStatusMsg(''), 4000);
    } catch (e) {
      setEmailStatusMsg(`❌ Failed to resend email.`);
      setTimeout(() => setEmailStatusMsg(''), 4000);
    }
  };

  // Open Gmail / Default mail compose
  const handleOpenMailCompose = (booking) => {
    const subject = encodeURIComponent(`🎟️ Ticket Confirmation - Sloan Jooste's Fundraiser Dance (Table #${booking.tableNumber})`);
    const body = encodeURIComponent(generateTicketEmailBody(booking));
    window.open(`mailto:${booking.email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Open WhatsApp with prefilled ticket details
  const handleOpenWhatsApp = (booking) => {
    const phone = (booking.mobileNumber || '').replace(/[^0-9]/g, '');
    const text = generateWhatsAppMessage(booking);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  // Adjust raffle count
  const handleRaffleCountChange = (newCount) => {
    const count = Math.max(0, Number(newCount) || 0);
    let entrants = [...(editingGuest.raffleEntrants || [])];
    while (entrants.length < count) {
      entrants.push({
        name: entrants.length === 0 ? `${editingGuest.firstName} ${editingGuest.surname}` : '',
        tableNumber: editingGuest.tableNumber || 1
      });
    }
    if (entrants.length > count) {
      entrants = entrants.slice(0, count);
    }

    setEditingGuest({
      ...editingGuest,
      raffleTicketsCount: count,
      raffleEntrants: entrants
    });
  };

  // Handle Add New Guest form submit
  const handleAddNewGuestSubmit = async (e) => {
    e.preventDefault();
    try {
      const raffleCount = Number(addForm.raffleTicketsCount) || 0;
      let entrants = addForm.raffleEntrants || [];
      if (raffleCount > 0 && entrants.length === 0) {
        entrants = [{ name: `${addForm.firstName} ${addForm.surname}`, tableNumber: addForm.tableNumber }];
      }

      const payload = {
        ...addForm,
        raffleEntrants: entrants,
        amount: (addForm.tableBookingOption === 'Full Private Table (10 Guests)' ? 1500 : 150 * Number(addForm.numTickets)) + (raffleCount === 1 ? 50 : raffleCount === 3 ? 100 : raffleCount * 50),
        paymentStatus: 'paid',
        paymentMethod: 'manual',
        consentTerms: true
      };

      const created = await createBookingInFirestore(payload);
      if (onAddBooking) {
        onAddBooking(created);
      }

      setIsAddGuestModalOpen(false);
      setAddForm({
        firstName: '',
        surname: '',
        email: '',
        mobileNumber: '',
        tableNumber: 1,
        numTickets: 1,
        raffleTicketsCount: 0,
        raffleEntrants: [],
        tableBookingOption: 'Standard Dance Ticket'
      });
    } catch (err) {
      console.error("Failed to add guest:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast notification banner */}
      {emailStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-sm animate-fadeIn">
          {emailStatusMsg}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-purple-900">
            <span>Total Attendees</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalGuests} Guests</p>
          <span className="text-xs text-slate-500 font-medium">{totalBookingsCount} Bookings Across 35 Tables</span>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-300 shadow-sm">
          <div className="flex justify-between items-center text-xs text-emerald-800 font-bold">
            <span>Total Raffle Tickets Sold</span>
            <Gift className="w-5 h-5 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-1">{totalRaffleTicketsBought} Raffle Tickets</p>
          <span className="text-xs text-emerald-800/80 font-semibold">1 Ticket = 1 Wheel Slice (R50/1, R100/3)</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-purple-900 block">Fast Guest Action</span>
            <span className="text-sm font-black text-slate-900">Add Guest & Send Pass</span>
          </div>
          <button
            onClick={() => setIsAddGuestModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" /> Add Guest
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-purple-600 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search guest, email, phone, raffle entrant..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-purple-200 rounded-xl px-3 py-1.5">
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none text-xs"
            >
              <option value="all">All 35 Tables</option>
              {tables.map((t) => (
                <option key={t.tableNumber} value={t.tableNumber}>
                  Table #{t.tableNumber} {t.isFull ? '(🔴 FULL)' : `(🟢 ${t.remainingSeats} Seats Left)`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-purple-200 rounded-xl px-3 py-1.5">
            <Gift className="w-3.5 h-3.5 text-emerald-600" />
            <select
              value={raffleFilter}
              onChange={(e) => setRaffleFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none text-xs"
            >
              <option value="all">All Raffle Status</option>
              <option value="hasRaffle">Has Raffle Tickets (🎟️)</option>
              <option value="noRaffle">No Raffle Tickets</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddGuestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm ml-auto md:ml-0 hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Guest
          </button>
        </div>
      </div>

      {/* Master Guests Table */}
      <div className="overflow-x-auto rounded-3xl border border-purple-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-purple-50/70 border-b border-purple-200 text-purple-900 uppercase tracking-wider font-extrabold text-[11px]">
              <th className="p-3.5">Guest & Contact</th>
              <th className="p-3.5">Table (1-35)</th>
              <th className="p-3.5">Dance Seats</th>
              <th className="p-3.5">Raffle Tickets & Slices</th>
              <th className="p-3.5">Amount</th>
              <th className="p-3.5 text-right">Send Ticket & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                  No guest records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-emerald-50/40 transition">
                  {/* Guest Name & Contact */}
                  <td className="p-3.5">
                    <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      {b.firstName} {b.surname}
                      {b.checkedIn && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">Checked In</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-950 font-bold mt-0.5">
                      <span className="font-mono bg-purple-100 px-2 py-0.5 rounded text-xs border border-purple-200">
                        {getShortReference(b)}
                      </span>
                    </div>
                    <div className="flex flex-col text-[11px] text-slate-500 mt-1 space-y-0.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-purple-700" /> {b.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> {b.mobileNumber}
                      </span>
                    </div>
                  </td>

                  {/* Table & Seat Allocation */}
                  <td className="p-3.5">
                    {b.tableBookingOption === 'Raffle Tickets Only' ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs">
                        🎟️ Raffle Supporter (No Seat)
                      </span>
                    ) : b.tableBookingOption === 'Direct Donation Only' ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-200 text-rose-900 font-bold text-xs">
                        💝 Direct Donation (No Seat)
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs">
                            <Table className="w-3.5 h-3.5 text-emerald-600" /> Table #{b.tableNumber}
                          </span>
                          {(() => {
                            const tObj = tables.find(t => t.tableNumber === Number(b.tableNumber));
                            if (!tObj) return null;
                            return (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                tObj.isFull 
                                  ? 'bg-rose-100 text-rose-800 border-rose-300' 
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {tObj.isFull ? '🔴 FULL' : `🟢 ${tObj.remainingSeats} Left`}
                              </span>
                            );
                          })()}
                        </div>
                        {b.allocatedSeats && b.allocatedSeats.length > 0 && (
                          <span className="block text-[10px] text-purple-900 font-bold">
                            Seat(s) #{b.allocatedSeats.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Dance Tickets */}
                  <td className="p-3.5 font-black text-slate-900 text-xs">
                    {b.numTickets > 0 ? (
                      <span>{b.numTickets} Seat{b.numTickets > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>

                  {/* Raffle Tickets & Entrants */}
                  <td className="p-3.5">
                    {Number(b.raffleTicketsCount) > 0 ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] border border-emerald-300">
                          <Gift className="w-3.5 h-3.5 text-emerald-700" /> {b.raffleTicketsCount} Ticket{b.raffleTicketsCount > 1 ? 's' : ''} ({b.raffleTicketsCount} Slices)
                        </span>

                        {b.raffleEntrants && b.raffleEntrants.length > 0 && (
                          <div className="text-[10px] text-purple-900 space-y-0.5">
                            {b.raffleEntrants.map((ent, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="font-mono text-emerald-700 font-bold">#{idx + 1}:</span>
                                <span className="font-semibold text-slate-800">{ent.name || `${b.firstName} ${b.surname}`}</span>
                                <span className="text-slate-500">(T#{ent.tableNumber || b.tableNumber})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">0 raffle tickets</span>
                    )}
                  </td>

                  {/* Amount Paid & Payment Status */}
                  <td className="p-3.5">
                    <span className="font-black text-emerald-700 text-sm">
                      R{b.amount}
                    </span>
                    {b.paymentStatus === 'pending_eft' ? (
                      <div className="mt-1 space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          ⏳ EFT Pending
                        </span>
                        <button
                          onClick={() => handleApproveEft(b)}
                          className="block w-full py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] shadow-sm transition"
                          title="Click to clear bank funds and officially issue ticket pass"
                        >
                          ✓ Clear Funds
                        </button>
                      </div>
                    ) : (
                      <span className="block text-[10px] text-emerald-700 uppercase font-black">
                        ✓ {b.paymentMethod === 'card' ? 'Card Paid' : 'Paid & Active'}
                      </span>
                    )}
                  </td>

                  {/* Send & Actions */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* View & Download PDF Pass Button */}
                      {onViewTicketPass && (
                        <button
                          onClick={() => onViewTicketPass(b)}
                          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                          title="View Digital Pass & Download PDF Ticket"
                        >
                          <Ticket className="w-4 h-4" />
                          <span className="hidden sm:inline">Pass & PDF</span>
                        </button>
                      )}

                      {/* WhatsApp Button */}
                      <button
                        onClick={() => handleOpenWhatsApp(b)}
                        className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 transition"
                        title="Send digital ticket via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-700" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Gmail / Email Compose Button */}
                      <button
                        onClick={() => handleOpenMailCompose(b)}
                        className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1 transition"
                        title="Compose/Send Ticket via Gmail"
                      >
                        <Mail className="w-4 h-4 text-purple-700" />
                        <span className="hidden sm:inline">Gmail</span>
                      </button>

                      {/* Resend Automated Email */}
                      <button
                        onClick={() => handleResendEmail(b)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Resend automated email confirmation"
                      >
                        <Send className="w-4 h-4 text-slate-600" />
                      </button>

                      {/* Edit Details */}
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Edit guest details and raffle tickets"
                      >
                        <Edit3 className="w-4 h-4 text-slate-700" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteGuest(b.id, `${b.firstName} ${b.surname}`)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        title="Delete guest record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: EDIT GUEST DETAILS & ALLOCATE RAFFLE TICKETS */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-xl glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl p-6 space-y-5 my-6 max-h-[90vh] flex flex-col bg-white">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Guest & Allocate Raffle Tickets</h3>
                  <p className="text-xs text-purple-800 font-medium">Update table (1-35), contact details, and assign raffle ticket names</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingGuest(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              
              {/* Contact Details */}
              <div className="space-y-3">
                <span className="text-xs font-black text-purple-900 uppercase tracking-wider block">1. Guest Contact Information</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={editingGuest.firstName}
                      onChange={(e) => setEditingGuest({ ...editingGuest, firstName: e.target.value })}
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Surname *</label>
                    <input
                      type="text"
                      required
                      value={editingGuest.surname}
                      onChange={(e) => setEditingGuest({ ...editingGuest, surname: e.target.value })}
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingGuest.email}
                      onChange={(e) => setEditingGuest({ ...editingGuest, email: e.target.value })}
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Mobile Phone (for WhatsApp)</label>
                    <input
                      type="tel"
                      value={editingGuest.mobileNumber}
                      onChange={(e) => setEditingGuest({ ...editingGuest, mobileNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Table Allocation & Dance Tickets */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-black text-purple-900 uppercase tracking-wider block">2. Table Allocation & Dance Seats</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Assigned Table (1 - 35):</label>
                    <select
                      value={editingGuest.tableNumber}
                      onChange={(e) => setEditingGuest({ ...editingGuest, tableNumber: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                    >
                      {tables.map(t => {
                        const isCurrentTable = Number(editingGuest.tableNumber) === t.tableNumber;
                        const originalGuestBooking = bookings.find(b => b.id === editingGuest.id);
                        const originalTickets = (originalGuestBooking && Number(originalGuestBooking.tableNumber) === t.tableNumber) 
                          ? (Number(originalGuestBooking.numTickets) || 0) 
                          : 0;
                        const effectiveRemaining = isCurrentTable ? Math.min(10, t.remainingSeats + originalTickets) : t.remainingSeats;
                        const isTableFull = effectiveRemaining === 0;

                        return (
                          <option key={t.tableNumber} value={t.tableNumber}>
                            Table #{t.tableNumber} — {isTableFull ? '🔴 FULL (0 seats left)' : `🟢 ${effectiveRemaining} seats left (${10 - effectiveRemaining}/10 booked)`} {isCurrentTable ? '← (Current)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Number of Dance Tickets:</label>
                    <select
                      value={editingGuest.numTickets}
                      onChange={(e) => setEditingGuest({ ...editingGuest, numTickets: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n} Seat{n !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table availability preview & warning */}
                {(() => {
                  const selectedT = tables.find(t => t.tableNumber === Number(editingGuest.tableNumber));
                  if (!selectedT) return null;
                  const originalGuestBooking = bookings.find(b => b.id === editingGuest.id);
                  const originalTickets = (originalGuestBooking && Number(originalGuestBooking.tableNumber) === selectedT.tableNumber) 
                    ? (Number(originalGuestBooking.numTickets) || 0) 
                    : 0;
                  const effectiveRemaining = Math.min(10, selectedT.remainingSeats + originalTickets);
                  const requested = Number(editingGuest.numTickets) || 0;
                  const canFit = effectiveRemaining >= requested;

                  return (
                    <div className={`p-2.5 rounded-xl border text-xs font-semibold ${
                      effectiveRemaining === 0 
                        ? 'bg-rose-50 border-rose-300 text-rose-800' 
                        : !canFit 
                        ? 'bg-amber-50 border-amber-300 text-amber-900' 
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}>
                      {effectiveRemaining === 0 ? (
                        <span>🔴 Table #{selectedT.tableNumber} is currently FULL (0 seats left).</span>
                      ) : !canFit ? (
                        <span>⚠️ Table #{selectedT.tableNumber} only has {effectiveRemaining} seat(s) left for this booking. You selected {requested} tickets.</span>
                      ) : (
                        <span>🟢 Table #{selectedT.tableNumber}: {effectiveRemaining} seats left ({10 - effectiveRemaining}/10 booked).</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Raffle Tickets & Individual Entrant Allocation */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                    3. Raffle Tickets & Person Allocation
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-700 font-bold">Total Raffle Tickets:</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={editingGuest.raffleTicketsCount || 0}
                      onChange={(e) => handleRaffleCountChange(e.target.value)}
                      className="w-16 bg-slate-50 border border-purple-200 rounded-lg px-2 py-1 text-slate-900 font-black text-center focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {editingGuest.raffleTicketsCount > 0 ? (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                    <p className="text-[11px] text-purple-900 font-medium">
                      Each ticket creates 1 separate slice on the live wheel. Allocate person & table for each ticket:
                    </p>

                    {editingGuest.raffleEntrants?.map((entrant, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-purple-200 grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-2 font-mono text-[10px] text-emerald-700 font-bold">
                          Ticket #{idx + 1}:
                        </span>
                        
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={entrant.name || ''}
                            onChange={(e) => {
                              const updated = [...(editingGuest.raffleEntrants || [])];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditingGuest({ ...editingGuest, raffleEntrants: updated });
                            }}
                            placeholder="Person's Name for this ticket..."
                            className="w-full bg-slate-50 border border-purple-200 rounded-lg px-2.5 py-1 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs font-medium"
                          />
                        </div>

                        <div className="col-span-4">
                          <select
                            value={entrant.tableNumber || editingGuest.tableNumber || 1}
                            onChange={(e) => {
                              const updated = [...(editingGuest.raffleEntrants || [])];
                              updated[idx] = { ...updated[idx], tableNumber: Number(e.target.value) };
                              setEditingGuest({ ...editingGuest, raffleEntrants: updated });
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
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No raffle tickets currently assigned. Increase count above to allocate tickets.</p>
                )}
              </div>

              {/* Save Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition"
                >
                  Save Guest & Raffle Allocations
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW GUEST QUICK FORM */}
      {isAddGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl p-6 space-y-4 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add New Guest & Raffle Tickets (35 Tables)
              </h3>
              <button 
                onClick={() => setIsAddGuestModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewGuestSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-purple-900 font-bold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    placeholder="Jane"
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Surname *</label>
                  <input
                    type="text"
                    required
                    value={addForm.surname}
                    onChange={(e) => setAddForm({ ...addForm, surname: e.target.value })}
                    placeholder="Doe"
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Table (1-35) *</label>
                  <select
                    value={addForm.tableNumber}
                    onChange={(e) => setAddForm({ ...addForm, tableNumber: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    {tables.map(t => (
                      <option key={t.tableNumber} value={t.tableNumber} disabled={t.isFull}>
                        Table #{t.tableNumber} — {t.isFull ? '🔴 FULL (0 seats left)' : `🟢 ${t.remainingSeats} seats left`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Dance Tickets *</label>
                  <select
                    value={addForm.numTickets}
                    onChange={(e) => setAddForm({ ...addForm, numTickets: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} Ticket{n !== 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Seat Availability Helper */}
              {(() => {
                const selectedT = tables.find(t => t.tableNumber === Number(addForm.tableNumber));
                if (!selectedT) return null;
                const requested = Number(addForm.numTickets);
                const hasCapacity = selectedT.remainingSeats >= requested;

                return (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold ${
                    selectedT.isFull 
                      ? 'bg-rose-50 border-rose-300 text-rose-800' 
                      : !hasCapacity 
                      ? 'bg-amber-50 border-amber-300 text-amber-900' 
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}>
                    {selectedT.isFull ? (
                      <span>🔴 Table #{selectedT.tableNumber} is FULL (0 seats left). Please select another table.</span>
                    ) : !hasCapacity ? (
                      <span>⚠️ Table #{selectedT.tableNumber} only has {selectedT.remainingSeats} seat(s) left. Cannot assign {requested} seats.</span>
                    ) : (
                      <span>🟢 Table #{selectedT.tableNumber}: {selectedT.remainingSeats} seats left ({selectedT.occupiedSeats}/10 booked).</span>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Raffle Tickets</label>
                  <select
                    value={addForm.raffleTicketsCount}
                    onChange={(e) => setAddForm({ ...addForm, raffleTicketsCount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="0">0 Tickets</option>
                    <option value="1">1 Ticket (R50)</option>
                    <option value="3">3 Tickets (R100)</option>
                    <option value="6">6 Tickets (R200)</option>
                    <option value="10">10 Tickets (R300)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Mobile Phone (WhatsApp)</label>
                  <input
                    type="tel"
                    value={addForm.mobileNumber}
                    onChange={(e) => setAddForm({ ...addForm, mobileNumber: e.target.value })}
                    placeholder="+27..."
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    const selectedT = tables.find(t => t.tableNumber === Number(addForm.tableNumber));
                    return selectedT && selectedT.remainingSeats < Number(addForm.numTickets);
                  })()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition disabled:opacity-40 cursor-pointer"
                >
                  Add to Table #{addForm.tableNumber}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
