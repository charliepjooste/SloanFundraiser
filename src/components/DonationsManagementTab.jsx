import React, { useState } from 'react';
import { 
  Heart, 
  Search, 
  Plus, 
  Download, 
  CheckCircle2, 
  X, 
  Phone, 
  Mail, 
  MessageCircle, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Calendar,
  Ticket,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  getShortReference, 
  approveEftPayment, 
  createBookingInFirestore,
  deleteGuestRecord,
  EVENT_DETAILS 
} from '../firebase';

export default function DonationsManagementTab({
  bookings = [],
  onUpdateBooking,
  onAddBooking,
  onDeleteBooking
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'pending_eft'
  const [amountFilter, setAmountFilter] = useState('all'); // 'all', 'high', 'mid', 'low'
  const [statusMessage, setStatusMessage] = useState('');

  // Modal: Add Manual Donation
  const [isAddDonationOpen, setIsAddDonationOpen] = useState(false);
  const [donorFirstName, setDonorFirstName] = useState('');
  const [donorSurname, setDonorSurname] = useState('');
  const [donorMobile, setDonorMobile] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorAmount, setDonorAmount] = useState('');
  const [donorTribute, setDonorTribute] = useState('');
  const [donorPaymentMethod, setDonorPaymentMethod] = useState('eft');
  const [donorStatus, setDonorStatus] = useState('paid');
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);

  // Extract all bookings that contain a donation or are direct donations
  const donationsList = bookings.filter(b => {
    const directDonation = Number(b.donationAmount) || 0;
    const isDonationOnly = b.tableBookingOption === 'Direct Donation Only';
    const amount = Number(b.amount) || 0;
    return directDonation > 0 || isDonationOnly || (amount > 0 && b.tableBookingOption === 'Raffle Tickets Only' && !b.raffleTicketsCount);
  }).map(b => {
    const donationValue = Number(b.donationAmount) > 0 
      ? Number(b.donationAmount) 
      : (b.tableBookingOption === 'Direct Donation Only' ? Number(b.amount) : Number(b.donationAmount) || 0);

    return {
      ...b,
      effectiveDonation: donationValue
    };
  });

  // Calculate Metrics
  const totalDonationAmount = donationsList.reduce((sum, d) => sum + (Number(d.effectiveDonation) || 0), 0);
  const totalDonorsCount = donationsList.length;
  const averageDonation = totalDonorsCount > 0 ? Math.round(totalDonationAmount / totalDonorsCount) : 0;
  const pendingEftDonations = donationsList.filter(d => d.paymentStatus === 'pending_eft');
  const pendingEftAmount = pendingEftDonations.reduce((sum, d) => sum + (Number(d.effectiveDonation) || 0), 0);

  // Filtered List
  const filteredDonations = donationsList.filter(d => {
    const search = searchTerm.toLowerCase();
    const nameMatch = `${d.firstName || ''} ${d.surname || ''}`.toLowerCase().includes(search);
    const emailMatch = (d.email || '').toLowerCase().includes(search);
    const refMatch = (getShortReference(d) || '').toLowerCase().includes(search);
    const tributeMatch = (d.specialRequests || '').toLowerCase().includes(search);
    const matchesSearch = nameMatch || emailMatch || refMatch || tributeMatch;

    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = d.paymentStatus !== 'pending_eft';
    if (statusFilter === 'pending_eft') matchesStatus = d.paymentStatus === 'pending_eft';

    let matchesAmount = true;
    const amt = Number(d.effectiveDonation) || 0;
    if (amountFilter === 'high') matchesAmount = amt >= 500;
    if (amountFilter === 'mid') matchesAmount = amt >= 200 && amt < 500;
    if (amountFilter === 'low') matchesAmount = amt < 200;

    return matchesSearch && matchesStatus && matchesAmount;
  });

  // Handle Clearing EFT Payment
  const handleClearEftDonation = async (donation) => {
    setStatusMessage(`⏳ Clearing EFT donation for ${donation.firstName} ${donation.surname}...`);
    try {
      await approveEftPayment(donation);
      if (onUpdateBooking) {
        onUpdateBooking(donation.id, { paymentStatus: 'paid' });
      }
      setStatusMessage(`✅ Donation of R${donation.effectiveDonation} cleared for ${donation.firstName} ${donation.surname}!`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (e) {
      console.error(e);
      setStatusMessage('❌ Error clearing donation');
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  // Handle Delete Donation Record
  const handleDeleteDonation = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove the donation record for ${name}?`)) {
      return;
    }
    try {
      await deleteGuestRecord(id);
      if (onDeleteBooking) onDeleteBooking(id);
      setStatusMessage(`✅ Deleted donation record for ${name}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setStatusMessage('❌ Error deleting donation');
    }
  };

  // WhatsApp Thank You
  const handleSendWhatsAppThankYou = (donation) => {
    const phone = (donation.mobileNumber || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`*💚 THANK YOU FOR SUPPORTING SLOAN JOOSTE! 💚*\n\nDear *${donation.firstName} ${donation.surname}*,\n\nOn behalf of Sloan, Nicole, and Charlie, thank you so much for your generous donation of *R${donation.effectiveDonation}* towards Sloan's post-op physiotherapy and rehabilitation care.\n\nYour kindness and generosity mean the world to our family! 🌟\n\nWith heartfelt appreciation,\n*Nicole & Charlie Jooste*`);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  // Email Thank You
  const handleSendEmailThankYou = (donation) => {
    const subject = encodeURIComponent(`💚 Heartfelt Thank You for your Donation to Sloan Jooste`);
    const body = encodeURIComponent(`Dear ${donation.firstName} ${donation.surname},\n\nThank you so much for your wonderful donation of R${donation.effectiveDonation} in aid of Sloan Jooste's post-operative physiotherapy and Cerebral Palsy rehabilitation care.\n\n100% of your generous gift directly funds Sloan's specialist therapies and recovery.\n\nWe are deeply grateful for your support and blessings!\n\nWarmest regards,\nNicole & Charlie Jooste\nSloan Jooste Fundraiser Team`);
    window.open(`mailto:${donation.email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Add Manual Donation Submit
  const handleAddManualDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donorFirstName.trim() || !donorAmount || Number(donorAmount) <= 0) {
      alert("Please enter donor name and a valid donation amount.");
      return;
    }

    setIsSubmittingDonation(true);
    try {
      const payload = {
        firstName: donorFirstName.trim(),
        surname: donorSurname.trim(),
        mobileNumber: donorMobile.trim() || 'N/A',
        email: (donorEmail || '').trim().toLowerCase() || 'donor@sloanfundraiser.co.za',
        tableBookingOption: 'Direct Donation Only',
        numTickets: 0,
        raffleTicketsCount: 0,
        tableNumber: 0,
        donationAmount: Number(donorAmount),
        amount: Number(donorAmount),
        specialRequests: donorTribute.trim() ? `Direct Donation: "${donorTribute.trim()}"` : 'Direct Charity Donation for Sloan',
        paymentMethod: donorPaymentMethod,
        paymentStatus: donorStatus
      };

      const newRecord = await createBookingInFirestore(payload);
      if (onAddBooking) onAddBooking(newRecord);

      setStatusMessage(`✅ Added manual donation of R${donorAmount} for ${donorFirstName} ${donorSurname}!`);
      setTimeout(() => setStatusMessage(''), 4000);

      // Reset
      setDonorFirstName('');
      setDonorSurname('');
      setDonorMobile('');
      setDonorEmail('');
      setDonorAmount('');
      setDonorTribute('');
      setIsAddDonationOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save donation.");
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  // Export Donors CSV
  const handleExportCsv = () => {
    if (donationsList.length === 0) {
      alert("No donation records to export.");
      return;
    }

    const headers = ["Donation ID", "Ref", "Donor First Name", "Donor Surname", "Mobile", "Email", "Donation Amount (ZAR)", "Status", "Payment Method", "Tribute / Note", "Date"];
    const rows = donationsList.map(d => [
      d.id,
      getShortReference(d),
      `"${(d.firstName || '').replace(/"/g, '""')}"`,
      `"${(d.surname || '').replace(/"/g, '""')}"`,
      `"${d.mobileNumber || ''}"`,
      `"${d.email || ''}"`,
      d.effectiveDonation || 0,
      d.paymentStatus || 'paid',
      d.paymentMethod || 'eft',
      `"${(d.specialRequests || '').replace(/"/g, '""')}"`,
      d.createdAt || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sloan_Jooste_Donations_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-900 via-purple-950 to-emerald-950 text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/20">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">💝 Donations Manager</h2>
              <span className="text-[10px] bg-rose-500/30 text-rose-200 px-2.5 py-0.5 rounded-full font-bold border border-rose-400/30">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-purple-200 font-medium">
              Track, clear EFT payments, and manage all direct donations made for Sloan Jooste
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddDonationOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Record Offline Donation
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition"
            title="Export CSV Report"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold text-center animate-fadeIn shadow-sm">
          {statusMessage}
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Donations Raised</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700">R{totalDonationAmount.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400 font-medium">100% for Physio & Rehab</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Donors</span>
            <Users className="w-4 h-4 text-purple-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-950">{totalDonorsCount}</p>
          <span className="text-[11px] text-slate-400 font-medium">Individuals & Families</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-emerald-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Average Donation</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">R{averageDonation.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400 font-medium">Per Contributor</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending EFT Clearance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">R{pendingEftAmount.toLocaleString()}</p>
          <span className="text-[11px] text-amber-900 font-bold">{pendingEftDonations.length} Pending Approval</span>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-purple-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-purple-700 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by donor name, email, ref, or tribute message..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-purple-200 rounded-2xl text-slate-900 focus:outline-none focus:border-purple-600 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-purple-200 rounded-2xl text-slate-800 font-bold focus:outline-none focus:border-purple-600 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="paid">✓ Cleared / Paid</option>
            <option value="pending_eft">⏳ Pending EFT</option>
          </select>

          <select
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-purple-200 rounded-2xl text-slate-800 font-bold focus:outline-none focus:border-purple-600 text-xs"
          >
            <option value="all">All Amounts</option>
            <option value="high">R500+</option>
            <option value="mid">R200 - R499</option>
            <option value="low">Under R200</option>
          </select>
        </div>

      </div>

      {/* Donations Data Table */}
      <div className="bg-white rounded-3xl border border-purple-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <span>Donations List ({filteredDonations.length} records)</span>
          </h3>
        </div>

        {filteredDonations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Heart className="w-12 h-12 text-slate-200 mx-auto" />
            <h4 className="font-extrabold text-slate-700 text-sm">No donations match your search</h4>
            <p className="text-xs text-slate-400">Try adjusting your filters or record an offline donation above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50/70 border-b border-purple-100 text-purple-950 font-black uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">Donor Name & Reference</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Donation Amount</th>
                  <th className="p-3.5">Linked Booking / Purpose</th>
                  <th className="p-3.5">Tribute / Note</th>
                  <th className="p-3.5">Payment Status</th>
                  <th className="p-3.5 text-right">Actions & Thanks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDonations.map((d) => {
                  const ref = getShortReference(d);
                  const isEftPending = d.paymentStatus === 'pending_eft';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Donor Name & Ref */}
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-sm">
                          {d.firstName} {d.surname}
                        </div>
                        <span className="font-mono text-[10px] bg-purple-100 text-purple-950 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                          {ref}
                        </span>
                      </td>

                      {/* Contact Details */}
                      <td className="p-3.5 space-y-0.5">
                        <div className="text-slate-900 font-semibold flex items-center gap-1">
                          <Phone className="w-3 h-3 text-purple-700" />
                          <span>{d.mobileNumber || 'N/A'}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{d.email || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5">
                        <span className="text-base font-black text-rose-700">
                          R{d.effectiveDonation}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                          {d.paymentMethod === 'card' ? 'Card' : 'Direct EFT'}
                        </span>
                      </td>

                      {/* Linked Booking */}
                      <td className="p-3.5">
                        {d.tableBookingOption === 'Direct Donation Only' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200">
                            <Heart className="w-3 h-3 text-rose-600" /> Direct Donation
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-bold text-purple-900 text-[11px] block">
                              Table #{d.tableNumber || 1}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {d.numTickets || 1} Ticket(s) • R{d.amount} Total
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Tribute / Message */}
                      <td className="p-3.5 max-w-[200px]">
                        <p className="text-[11px] text-slate-600 italic bg-purple-50/40 p-2 rounded-xl border border-purple-100 line-clamp-2">
                          "{d.specialRequests || 'In aid of Sloan Jooste recovery'}"
                        </p>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isEftPending ? (
                          <div className="space-y-1.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                              ⏳ EFT Pending
                            </span>
                            <button
                              onClick={() => handleClearEftDonation(d)}
                              className="block py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow-sm transition"
                              title="Clear EFT donation funds"
                            >
                              ✓ Clear Funds
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Cleared
                          </span>
                        )}
                      </td>

                      {/* Actions & Thanks */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Send WhatsApp Thank You */}
                          <button
                            onClick={() => handleSendWhatsAppThankYou(d)}
                            className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 transition"
                            title="Send Thank-You WhatsApp to donor"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="hidden sm:inline">Thank You</span>
                          </button>

                          {/* Email Thank You */}
                          <button
                            onClick={() => handleSendEmailThankYou(d)}
                            className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1 transition"
                            title="Email Thank-You letter to donor"
                          >
                            <Mail className="w-3.5 h-3.5 text-purple-700" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteDonation(d.id, `${d.firstName} ${d.surname}`)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Delete donation record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: RECORD MANUAL OFFLINE DONATION */}
      {isAddDonationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-purple-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Heart className="w-5 h-5 fill-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Offline / Direct Donation</h3>
                  <p className="text-[11px] text-purple-900 font-semibold">Manually add cash or direct bank transfer donation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddDonationOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualDonationSubmit} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Donor First Name *</label>
                  <input
                    type="text"
                    required
                    value={donorFirstName}
                    onChange={(e) => setDonorFirstName(e.target.value)}
                    placeholder="e.g. David"
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Donor Surname</label>
                  <input
                    type="text"
                    value={donorSurname}
                    onChange={(e) => setDonorSurname(e.target.value)}
                    placeholder="e.g. Miller"
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="tel"
                    value={donorMobile}
                    onChange={(e) => setDonorMobile(e.target.value)}
                    placeholder="e.g. 082 123 4567"
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="e.g. donor@gmail.com"
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Donation Amount (ZAR) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-500">R</span>
                  <input
                    type="number"
                    required
                    min="10"
                    value={donorAmount}
                    onChange={(e) => setDonorAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 text-xs font-black focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={donorPaymentMethod}
                    onChange={(e) => setDonorPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-bold"
                  >
                    <option value="eft">Direct EFT</option>
                    <option value="cash">Cash / In Person</option>
                    <option value="card">Card / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={donorStatus}
                    onChange={(e) => setDonorStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-bold"
                  >
                    <option value="paid">✓ Cleared / Paid</option>
                    <option value="pending_eft">⏳ Pending EFT Clearance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tribute Message / Note</label>
                <textarea
                  rows={2}
                  value={donorTribute}
                  onChange={(e) => setDonorTribute(e.target.value)}
                  placeholder="e.g. Blessings for Sloan's speedy recovery..."
                  className="w-full bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDonationOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDonation}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>{isSubmittingDonation ? 'Saving...' : 'Save Donation'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
