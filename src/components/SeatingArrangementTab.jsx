import React, { useState } from 'react';
import { Table, Users, ArrowRightLeft, UserPlus, Edit3, CheckCircle2, X, Search, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { moveBookingToTable, updateBookingGuestNames, createBookingInFirestore } from '../firebase';

export default function SeatingArrangementTab({ 
  bookings = [], 
  tablesData = [],
  onUpdateBooking,
  onAddBooking
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState('all');
  
  // Modals state
  const [movingBooking, setMovingBooking] = useState(null); // { booking, targetTable }
  const [editingTableGuestsBooking, setEditingTableGuestsBooking] = useState(null); // booking
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [addGuestForm, setAddGuestForm] = useState({
    firstName: '',
    surname: '',
    email: '',
    mobileNumber: '',
    tableNumber: 1,
    numTickets: 1,
    tableBookingOption: 'Standard Dance Ticket'
  });

  // 35 Tables Setup
  const tables = Array.from({ length: 35 }, (_, i) => {
    const tableNo = i + 1;
    const tableBookings = bookings.filter(b => Number(b.tableNumber) === tableNo && b.tableBookingOption !== 'Raffle Tickets Only');
    const seatsOccupied = tableBookings.reduce((sum, b) => sum + (Number(b.numTickets) || 1), 0);
    const capacity = 10;
    const remaining = Math.max(0, capacity - seatsOccupied);

    return {
      tableNumber: tableNo,
      capacity,
      seatsOccupied,
      remaining,
      isFull: remaining === 0,
      bookings: tableBookings
    };
  });

  // Filter tables
  const filteredTables = tables.filter(t => {
    if (selectedTableFilter !== 'all' && t.tableNumber !== Number(selectedTableFilter)) {
      return false;
    }
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const tableMatch = `table ${t.tableNumber}`.includes(term);
    const guestMatch = t.bookings.some(b => 
      `${b.firstName} ${b.surname}`.toLowerCase().includes(term) ||
      (b.guestNames && b.guestNames.some(name => name.toLowerCase().includes(term)))
    );
    return tableMatch || guestMatch;
  });

  // Handle Move Guest to another table
  const handleConfirmMove = async () => {
    if (!movingBooking || !movingBooking.targetTable) return;
    
    if (onUpdateBooking) {
      onUpdateBooking(movingBooking.booking.id, { tableNumber: Number(movingBooking.targetTable) });
    }

    try {
      await moveBookingToTable(
        movingBooking.booking.id,
        Number(movingBooking.targetTable),
        Number(movingBooking.booking.tableNumber),
        Number(movingBooking.booking.numTickets) || 1
      );
    } catch (err) {
      console.error("Failed to move booking:", err);
    }
    setMovingBooking(null);
  };

  // Handle saving individual guest names for a table booking
  const handleSaveGuestNames = async (e) => {
    e.preventDefault();
    if (!editingTableGuestsBooking) return;
    const namesList = editingTableGuestsBooking.guestNames || [];

    if (onUpdateBooking) {
      onUpdateBooking(editingTableGuestsBooking.id, { guestNames: namesList });
    }

    try {
      await updateBookingGuestNames(editingTableGuestsBooking.id, namesList);
    } catch (err) {
      console.error("Failed to save guest names:", err);
    }
    setEditingTableGuestsBooking(null);
  };

  // Handle manual guest addition
  const handleAddManualGuest = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...addGuestForm,
        amount: addGuestForm.tableBookingOption === 'Full Private Table (10 Guests)' ? 1500 : 150 * Number(addGuestForm.numTickets),
        paymentStatus: 'paid',
        paymentMethod: 'manual',
        consentTerms: true
      };
      const created = await createBookingInFirestore(payload);
      if (onAddBooking) {
        onAddBooking(created);
      }

      setIsAddGuestModalOpen(false);
      setAddGuestForm({
        firstName: '',
        surname: '',
        email: '',
        mobileNumber: '',
        tableNumber: 1,
        numTickets: 1,
        tableBookingOption: 'Standard Dance Ticket'
      });
    } catch (err) {
      console.error("Failed to add manual guest:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Management Actions */}
      <div className="p-6 rounded-3xl glass-card border border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm bg-white">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Table className="w-6 h-6 text-emerald-600" />
            Seating Arrangement & Table Management (35 Tables)
          </h2>
          <p className="text-xs text-purple-800 mt-1 font-medium">
            350 Total Capacity (10 Seats per Table) • Move guests between tables, assign seats, and enter table names.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddGuestModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 hover:brightness-110 transition"
          >
            <UserPlus className="w-4 h-4" /> Add Seated Guest / Booking
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-purple-600 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search guest name, table #, attendee..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-purple-900 font-semibold whitespace-nowrap">Filter Table:</span>
          <select
            value={selectedTableFilter}
            onChange={(e) => setSelectedTableFilter(e.target.value)}
            className="bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-600 text-xs"
          >
            <option value="all">All 35 Tables (350 Seats)</option>
            {Array.from({ length: 35 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Table #{i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of 35 Tables with Seated Guests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => (
          <div 
            key={table.tableNumber}
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all bg-white shadow-sm ${
              table.isFull 
                ? 'border-purple-200 bg-purple-50/40' 
                : 'border-slate-200 hover:border-emerald-500 hover:shadow-md'
            }`}
          >
            {/* Table Header */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-emerald-600" /> Table #{table.tableNumber}
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    {table.seatsOccupied}/10 Seats Occupied
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  table.remaining === 0 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {table.remaining === 0 ? 'Full' : `${table.remaining} Free`}
                </span>
              </div>

              {/* Guests List at this Table */}
              <div className="py-3 space-y-2 text-xs">
                {table.bookings.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2">No guests currently assigned to this table.</p>
                ) : (
                  table.bookings.map((b) => (
                    <div 
                      key={b.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-purple-100 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {b.firstName} {b.surname}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            {b.tableBookingOption === 'Full Private Table (10 Guests)' ? '👑 Full Table (10 Seats)' : `${b.numTickets} Ticket(s)`}
                          </span>
                        </div>

                        {/* Move Button */}
                        <button
                          onClick={() => setMovingBooking({ booking: b, targetTable: b.tableNumber })}
                          className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 transition"
                          title="Move to another table"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-700" />
                        </button>
                      </div>

                      {/* Display Named Guests at this table */}
                      {b.guestNames && b.guestNames.length > 0 && (
                        <div className="pt-1 text-[10px] text-slate-600 border-t border-purple-100">
                          <span className="text-purple-800 font-bold block">Named Attendees ({b.guestNames.length}):</span>
                          <p className="truncate text-slate-700 font-medium">{b.guestNames.join(', ')}</p>
                        </div>
                      )}

                      {/* Manage Table Guests Action */}
                      <button
                        onClick={() => {
                          const existingNames = b.guestNames && b.guestNames.length > 0
                            ? [...b.guestNames]
                            : Array.from({ length: Number(b.numTickets) || 1 }, (_, idx) => idx === 0 ? `${b.firstName} ${b.surname}` : '');
                          setEditingTableGuestsBooking({ ...b, guestNames: existingNames });
                        }}
                        className="w-full mt-1 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 flex items-center justify-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Individual Names ({b.guestNames?.length || b.numTickets})
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Summary Footer */}
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-medium">
              <span>Capacity 10</span>
              <span className="text-emerald-700 font-bold">{table.remaining} seats left</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: MOVE GUEST / BOOKING TO ANOTHER TABLE */}
      {movingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl p-6 space-y-4 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                Move Guest to Another Table
              </h3>
              <button 
                onClick={() => setMovingBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600">
              <p>
                Moving <strong className="text-slate-900">{movingBooking.booking.firstName} {movingBooking.booking.surname}</strong> ({movingBooking.booking.numTickets} ticket(s)) from <strong className="text-emerald-700">Table #{movingBooking.booking.tableNumber}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-purple-900 mb-1">Select Destination Table (1-35):</label>
                <select
                  value={movingBooking.targetTable}
                  onChange={(e) => setMovingBooking({ ...movingBooking, targetTable: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                >
                  {tables.map((t) => (
                    <option key={t.tableNumber} value={t.tableNumber} disabled={t.remaining < movingBooking.booking.numTickets && t.tableNumber !== movingBooking.booking.tableNumber}>
                      Table #{t.tableNumber} — ({t.remaining} seats free / 10 capacity)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMovingBooking(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition"
              >
                Confirm Move to Table #{movingBooking.targetTable}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT INDIVIDUAL GUEST NAMES FOR TABLE */}
      {editingTableGuestsBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Table #{editingTableGuestsBooking.tableNumber} Individual Attendees
                </h3>
                <p className="text-[11px] text-purple-800 font-medium">
                  Booked by {editingTableGuestsBooking.firstName} {editingTableGuestsBooking.surname}. All named attendees enter the raffle pool!
                </p>
              </div>
              <button 
                onClick={() => setEditingTableGuestsBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGuestNames} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <p className="text-[11px] text-slate-600">
                Enter the names of everyone sitting at this table:
              </p>

              {Array.from({ length: Number(editingTableGuestsBooking.numTickets) || 10 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-16 font-mono text-[10px] text-purple-900 font-bold shrink-0">Seat #{index + 1}:</span>
                  <input
                    type="text"
                    value={editingTableGuestsBooking.guestNames?.[index] || ''}
                    onChange={(e) => {
                      const updated = [...(editingTableGuestsBooking.guestNames || [])];
                      updated[index] = e.target.value;
                      setEditingTableGuestsBooking({ ...editingTableGuestsBooking, guestNames: updated });
                    }}
                    placeholder={`Guest name for Seat ${index + 1}...`}
                    className="flex-1 bg-slate-50 border border-purple-200 rounded-lg px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTableGuestsBooking(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition"
                >
                  Save Names & Update Raffle Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD MANUAL SEATED GUEST / BOOKING */}
      {isAddGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl p-6 space-y-4 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Add Seated Guest Manually (35 Tables)
              </h3>
              <button 
                onClick={() => setIsAddGuestModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualGuest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-purple-900 font-bold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addGuestForm.firstName}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, firstName: e.target.value })}
                    placeholder="First Name"
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Surname *</label>
                  <input
                    type="text"
                    required
                    value={addGuestForm.surname}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, surname: e.target.value })}
                    placeholder="Surname"
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Assign Table (1-35) *</label>
                  <select
                    value={addGuestForm.tableNumber}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, tableNumber: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                  >
                    {tables.map(t => (
                      <option key={t.tableNumber} value={t.tableNumber}>
                        Table #{t.tableNumber} ({t.remaining} seats free)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Number of Seats *</label>
                  <select
                    value={addGuestForm.numTickets}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, numTickets: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} Seat{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={addGuestForm.mobileNumber}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, mobileNumber: e.target.value })}
                    placeholder="+27..."
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={addGuestForm.email}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, email: e.target.value })}
                    placeholder="guest@example.com"
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition"
                >
                  Assign to Table #{addGuestForm.tableNumber}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
