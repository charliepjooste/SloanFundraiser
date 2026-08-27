import React, { useState } from 'react';
import { 
  Table, 
  Users, 
  ArrowRightLeft, 
  UserPlus, 
  Edit3, 
  CheckCircle2, 
  X, 
  Search, 
  Plus, 
  Trash2, 
  ShieldCheck,
  AlertCircle,
  LayoutGrid
} from 'lucide-react';
import { moveBookingToTable, updateBookingGuestNames, createBookingInFirestore, matchBookingSearch, getBookingSeatCount } from '../firebase';
import TableMapVisualizer from './TableMapVisualizer';

export default function SeatingArrangementTab({ 
  bookings = [], 
  tablesData = [],
  onUpdateBooking,
  onAddBooking
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState('all');
  const [showVisualMap, setShowVisualMap] = useState(true);
  
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

  // 35 Tables Setup with complete occupancy and availability calculations
  const tables = Array.from({ length: 35 }, (_, i) => {
    const tableNo = i + 1;
    const tableBookings = (bookings || []).filter(
      b => Number(b.tableNumber) === tableNo && getBookingSeatCount(b) > 0
    );
    const occupiedSeats = tableBookings.reduce(
      (sum, b) => sum + getBookingSeatCount(b), 
      0
    );
    const capacity = 10;
    const remainingSeats = Math.max(0, capacity - occupiedSeats);
    const isFull = remainingSeats === 0 || occupiedSeats >= capacity;
    const isFilling = remainingSeats > 0 && remainingSeats <= 3;

    return {
      tableNumber: tableNo,
      capacity,
      occupiedSeats,
      seatsOccupied: occupiedSeats,
      remainingSeats,
      remaining: remainingSeats,
      isFull,
      isFilling,
      bookings: tableBookings
    };
  });

  // Summary Metrics across all 35 tables
  const totalCapacity = 350;
  const totalOccupiedSeats = tables.reduce((sum, t) => sum + t.occupiedSeats, 0);
  const totalRemainingSeats = Math.max(0, totalCapacity - totalOccupiedSeats);
  const fullTablesCount = tables.filter(t => t.isFull).length;
  const availableTablesCount = 35 - fullTablesCount;

  // Filter tables
  const filteredTables = tables.filter(t => {
    if (selectedTableFilter !== 'all' && t.tableNumber !== Number(selectedTableFilter)) {
      return false;
    }
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const tableMatch = `table ${t.tableNumber}`.includes(term) || `table #${t.tableNumber}`.includes(term);
    const guestMatch = (t.bookings || []).some(b => matchBookingSearch(b, searchTerm));
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
        getBookingSeatCount(movingBooking.booking)
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Table className="w-6 h-6 text-emerald-600" />
              Seating Arrangement & Table Management (35 Tables)
            </h2>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-950 border border-purple-300">
              Admin Portal
            </span>
          </div>
          <p className="text-xs text-purple-800 mt-1 font-medium">
            350 Total Capacity (10 Seats per Table) • Move guests between tables, assign seats, view seat availability, and manage table names.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowVisualMap(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
              showVisualMap 
                ? 'bg-purple-100 border-purple-300 text-purple-950 shadow-xs' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-purple-700" />
            <span>{showVisualMap ? 'Hide Visual Map' : 'Show 35-Table Map'}</span>
          </button>

          <button
            onClick={() => setIsAddGuestModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 hover:brightness-110 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Seated Guest / Booking
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Seats Booked</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalOccupiedSeats} <span className="text-sm font-bold text-slate-400">/ 350</span></p>
          <span className="text-[10px] text-purple-800 font-semibold">{Math.round((totalOccupiedSeats / totalCapacity) * 100)}% Capacity Occupied</span>
        </div>

        <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-300 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Seats Left</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{totalRemainingSeats} <span className="text-sm font-bold text-emerald-600/60">Seats Left</span></p>
          <span className="text-[10px] text-emerald-800/80 font-bold">Open Across 35 Tables</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Open Tables</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-950">{availableTablesCount} <span className="text-sm font-bold text-slate-400">/ 35</span></p>
          <span className="text-[10px] text-purple-700 font-semibold">Tables with Available Seats</span>
        </div>

        <div className="p-4 rounded-3xl bg-rose-50/70 border border-rose-300 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">FULL Tables (10/10)</span>
          <p className="text-2xl sm:text-3xl font-black text-rose-700">{fullTablesCount} <span className="text-sm font-bold text-rose-500/60">Tables</span></p>
          <span className="text-[10px] text-rose-800/80 font-bold">{fullTablesCount === 0 ? 'No tables full yet' : 'At maximum capacity'}</span>
        </div>
      </div>

      {/* Interactive Seating Map (Toggleable) */}
      {showVisualMap && (
        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm animate-fadeIn space-y-3">
          <TableMapVisualizer 
            selectedTableNumber={selectedTableFilter === 'all' ? null : Number(selectedTableFilter)}
            onSelectTable={(tableNo) => {
              setSelectedTableFilter(prev => prev === String(tableNo) ? 'all' : String(tableNo));
            }}
            tablesData={tablesData}
            bookings={bookings}
          />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-purple-600 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search guest name, table #, attendee, ref..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-purple-900 font-semibold whitespace-nowrap">Filter Table:</span>
          <select
            value={selectedTableFilter}
            onChange={(e) => setSelectedTableFilter(e.target.value)}
            className="bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-emerald-600 text-xs"
          >
            <option value="all">All 35 Tables ({totalRemainingSeats} Seats Left)</option>
            {tables.map((t) => (
              <option key={t.tableNumber} value={t.tableNumber}>
                Table #{t.tableNumber} — {t.isFull ? '🔴 FULL (0 seats left)' : `🟢 ${t.remainingSeats} seats left (${t.occupiedSeats}/10 booked)`}
              </option>
            ))}
          </select>

          {selectedTableFilter !== 'all' && (
            <button
              onClick={() => setSelectedTableFilter('all')}
              className="px-2.5 py-2 rounded-xl bg-purple-100 text-purple-900 font-bold hover:bg-purple-200 transition cursor-pointer"
              title="Show all tables"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid of 35 Tables with Seated Guests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => (
          <div 
            key={table.tableNumber}
            className={`p-4 rounded-3xl border flex flex-col justify-between transition-all bg-white shadow-sm ${
              table.isFull 
                ? 'border-rose-300 bg-gradient-to-b from-rose-50/50 to-white' 
                : table.isFilling
                ? 'border-amber-300 bg-gradient-to-b from-amber-50/40 to-white hover:border-amber-500 hover:shadow-md'
                : 'border-slate-200 hover:border-emerald-500 hover:shadow-md'
            }`}
          >
            {/* Table Header */}
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <Table className={`w-4 h-4 ${table.isFull ? 'text-rose-600' : table.isFilling ? 'text-amber-600' : 'text-emerald-600'}`} /> 
                    Table #{table.tableNumber}
                  </span>
                  <span className={`text-[11px] font-black ${table.isFull ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {table.isFull ? '🔴 Table FULL (0 seats left)' : `🟢 ${table.remainingSeats} of 10 Seats Left`}
                  </span>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                  table.isFull 
                    ? 'bg-rose-100 text-rose-800 border-rose-300' 
                    : table.isFilling
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {table.isFull ? '🔴 FULL' : `${table.remainingSeats} Seats Left`}
                </span>
              </div>

              {/* Visual Seat Occupancy Progress Bar */}
              <div className="py-2 space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      table.isFull 
                        ? 'bg-rose-500' 
                        : table.isFilling 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (table.occupiedSeats / 10) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                  <span>{table.occupiedSeats} Booked / 10 Total</span>
                  <span className={table.isFull ? 'text-rose-700 font-black' : 'text-emerald-700 font-black'}>
                    {table.isFull ? '0 Seats Left (FULL)' : `${table.remainingSeats} Seats Left`}
                  </span>
                </div>
              </div>

              {/* Guests List at this Table */}
              <div className="py-2.5 space-y-2 text-xs">
                {table.bookings.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 my-1">
                    <p className="text-[11px] text-slate-400 italic">No guests currently assigned to Table #{table.tableNumber}.</p>
                    <span className="text-[10px] font-black text-emerald-700 mt-0.5 block">10 of 10 Seats Left</span>
                  </div>
                ) : (
                  table.bookings.map((b) => (
                    <div 
                      key={b.id}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-purple-100 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {b.firstName} {b.surname}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            {b.tableBookingOption === 'Full Private Table (10 Guests)' ? '👑 Full Table (10 Seats)' : `${getBookingSeatCount(b)} Seat${getBookingSeatCount(b) > 1 ? 's' : ''}`}
                            {b.allocatedSeats && b.allocatedSeats.length > 0 && ` • Seat(s) #${b.allocatedSeats.join(', ')}`}
                          </span>
                        </div>

                        {/* Move Button */}
                        <button
                          onClick={() => setMovingBooking({ booking: b, targetTable: b.tableNumber })}
                          className="p-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 transition cursor-pointer"
                          title="Move guest to another table"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-700" />
                        </button>
                      </div>

                      {/* Display Named Guests at this table */}
                      {b.guestNames && b.guestNames.length > 0 && (
                        <div className="pt-1 text-[10px] text-slate-600 border-t border-purple-100">
                          <span className="text-purple-900 font-bold block">Named Attendees ({b.guestNames.length}):</span>
                          <p className="truncate text-slate-700 font-medium">{b.guestNames.join(', ')}</p>
                        </div>
                      )}

                      {/* Manage Table Guests Action */}
                      <button
                        onClick={() => {
                          const seatsCount = getBookingSeatCount(b) || 1;
                          const existingNames = b.guestNames && b.guestNames.length > 0
                            ? [...b.guestNames]
                            : Array.from({ length: seatsCount }, (_, idx) => idx === 0 ? `${b.firstName} ${b.surname}` : '');
                          while (existingNames.length < seatsCount) {
                            existingNames.push('');
                          }
                          setEditingTableGuestsBooking({ ...b, guestNames: existingNames, effectiveSeats: seatsCount });
                        }}
                        className="w-full mt-1 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Individual Names ({getBookingSeatCount(b)} Seats)
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Summary Footer */}
            <div className="pt-2.5 border-t border-slate-100 text-[10px] flex items-center justify-between font-semibold">
              <span className="text-slate-500">10 Seats Table</span>
              <span className={`font-black ${table.isFull ? 'text-rose-700' : 'text-emerald-700'}`}>
                {table.isFull ? '🔴 Table FULL (0 seats left)' : `🟢 ${table.remainingSeats} seats left`}
              </span>
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
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-600">
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <p>
                  Moving <strong className="text-slate-900">{movingBooking.booking.firstName} {movingBooking.booking.surname}</strong> ({getBookingSeatCount(movingBooking.booking)} seat(s)) from <strong className="text-purple-950 font-black">Table #{movingBooking.booking.tableNumber}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-900 mb-1">Select Destination Table (1-35):</label>
                <select
                  value={movingBooking.targetTable}
                  onChange={(e) => setMovingBooking({ ...movingBooking, targetTable: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600"
                >
                  {tables.map((t) => {
                    const isCurrent = t.tableNumber === movingBooking.booking.tableNumber;
                    const needed = getBookingSeatCount(movingBooking.booking);
                    const canFit = t.remainingSeats >= needed || isCurrent;

                    return (
                      <option 
                        key={t.tableNumber} 
                        value={t.tableNumber} 
                        disabled={!canFit}
                      >
                        Table #{t.tableNumber} — {t.isFull ? '🔴 FULL (0 seats left)' : `🟢 ${t.remainingSeats} seats left (${t.occupiedSeats}/10 booked)`} {isCurrent ? '← (Current Table)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Destination Table Live Status Preview */}
              {(() => {
                const targetObj = tables.find(t => t.tableNumber === Number(movingBooking.targetTable));
                const needed = getBookingSeatCount(movingBooking.booking);
                const isCurrent = Number(movingBooking.targetTable) === Number(movingBooking.booking.tableNumber);

                if (!targetObj) return null;

                if (isCurrent) {
                  return (
                    <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">
                      Guest is currently seated at Table #{targetObj.tableNumber}.
                    </div>
                  );
                }

                if (targetObj.remainingSeats < needed) {
                  return (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Table #{targetObj.tableNumber} only has {targetObj.remainingSeats} seat(s) left. Cannot fit {needed} guest(s).</span>
                    </div>
                  );
                }

                return (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium space-y-1">
                    <div className="flex items-center gap-1 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Table #{targetObj.tableNumber} has {targetObj.remainingSeats} seats left</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80">
                      After moving {needed} guest(s), Table #{targetObj.tableNumber} will have {targetObj.remainingSeats - needed} seats remaining.
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMovingBooking(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={(() => {
                  const targetObj = tables.find(t => t.tableNumber === Number(movingBooking.targetTable));
                  const needed = getBookingSeatCount(movingBooking.booking);
                  const isCurrent = Number(movingBooking.targetTable) === Number(movingBooking.booking.tableNumber);
                  return !isCurrent && targetObj && targetObj.remainingSeats < needed;
                })()}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition disabled:opacity-40 cursor-pointer"
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
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGuestNames} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <p className="text-[11px] text-slate-600">
                Enter the names of everyone sitting at this table:
              </p>

              {Array.from({ length: editingTableGuestsBooking.effectiveSeats || getBookingSeatCount(editingTableGuestsBooking) || 1 }).map((_, index) => (
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
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition cursor-pointer"
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
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    {tables.map(t => (
                      <option key={t.tableNumber} value={t.tableNumber} disabled={t.isFull}>
                        Table #{t.tableNumber} — {t.isFull ? '🔴 FULL (0 seats left)' : `🟢 ${t.remainingSeats} seats left`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-purple-900 font-bold mb-1">Number of Seats *</label>
                  <select
                    value={addGuestForm.numTickets}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, numTickets: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-purple-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} Seat{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Seat Availability Helper */}
              {(() => {
                const selectedT = tables.find(t => t.tableNumber === Number(addGuestForm.tableNumber));
                if (!selectedT) return null;
                const requested = Number(addGuestForm.numTickets);
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
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    const selectedT = tables.find(t => t.tableNumber === Number(addGuestForm.tableNumber));
                    return selectedT && selectedT.remainingSeats < Number(addGuestForm.numTickets);
                  })()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 transition disabled:opacity-40 cursor-pointer"
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
