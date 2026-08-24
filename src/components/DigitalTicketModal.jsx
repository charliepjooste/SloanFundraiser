import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Printer, 
  CheckCircle, 
  MapPin, 
  Table, 
  Mail, 
  MessageCircle, 
  Send, 
  ExternalLink,
  CreditCard,
  Image,
  Copy,
  FileText,
  Gift,
  Ticket,
  User,
  Download
} from 'lucide-react';
import { 
  EVENT_DETAILS, 
  getShortReference, 
  generateWhatsAppMessage, 
  generateTicketEmailBody, 
  generateHtmlTicketEmail,
  resendTicketEmail 
} from '../firebase';
import { downloadTicketPdf } from '../utils/generatePdfTicket';

export default function DigitalTicketModal({ booking, onClose }) {
  const [emailStatus, setEmailStatus] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  if (!booking) return null;

  const baseRef = getShortReference(booking);

  // Build the list of all individually issued passes for this booking
  const issuedPasses = [];

  // 1. Dance Seat Passes
  if (booking.tableBookingOption !== 'Raffle Tickets Only') {
    const seatsCount = booking.tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : (Number(booking.numTickets) || 1);
    for (let s = 1; s <= seatsCount; s++) {
      const attendeeName = (booking.guestNames && booking.guestNames[s - 1] && booking.guestNames[s - 1].trim())
        ? booking.guestNames[s - 1].trim()
        : (s === 1 ? `${booking.firstName} ${booking.surname}` : `${booking.firstName} ${booking.surname} (Guest ${s})`);
      
      issuedPasses.push({
        id: `seat-${s}`,
        type: 'seat',
        passRef: `${baseRef}-S${s}`,
        label: `Seat #${s}`,
        fullLabel: `Dance Seat #${s} of ${seatsCount}`,
        attendeeName,
        tableNumber: booking.tableNumber || 1
      });
    }
  }

  // 2. Raffle Ticket Passes
  const raffleCount = Number(booking.raffleTicketsCount) || 0;
  for (let r = 1; r <= raffleCount; r++) {
    const entrant = (booking.raffleEntrants && booking.raffleEntrants[r - 1]) ? booking.raffleEntrants[r - 1] : null;
    const entrantName = (entrant && entrant.name && entrant.name.trim())
      ? entrant.name.trim()
      : `${booking.firstName} ${booking.surname}${raffleCount > 1 ? ` (Entry ${r})` : ''}`;
    
    issuedPasses.push({
      id: `raffle-${r}`,
      type: 'raffle',
      passRef: `${baseRef}-R${r}`,
      label: `Raffle #${r}`,
      fullLabel: `Charity Raffle Ticket #${r} of ${raffleCount}`,
      attendeeName: entrantName,
      tableNumber: booking.tableNumber || 1
    });
  }

  if (issuedPasses.length === 0) {
    issuedPasses.push({
      id: 'default-1',
      type: 'seat',
      passRef: baseRef,
      label: 'Pass #1',
      fullLabel: 'Official Supporter Pass',
      attendeeName: `${booking.firstName} ${booking.surname}`,
      tableNumber: booking.tableNumber || 1
    });
  }

  const [activePassIndex, setActivePassIndex] = useState(0);
  const activePass = issuedPasses[activePassIndex] || issuedPasses[0];

  const qrData = JSON.stringify({
    passRef: activePass.passRef,
    bookingRef: baseRef,
    id: booking.id,
    type: activePass.type,
    name: activePass.attendeeName,
    table: activePass.tableNumber,
    item: activePass.fullLabel
  });

  // Download Current Pass as PDF
  const handleDownloadSinglePdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setEmailStatus(`⏳ Generating PDF for ${activePass.passRef}...`);

    try {
      await downloadTicketPdf(booking, activePass);
      setEmailStatus(`✅ PDF Pass downloaded: Sloan_Jooste_Ticket_${activePass.passRef}.pdf`);
      setTimeout(() => setEmailStatus(''), 4000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setEmailStatus('❌ Could not generate PDF. Please try again.');
      setTimeout(() => setEmailStatus(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download All Passes Bundle
  const handleDownloadAllPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setEmailStatus(`⏳ Generating all ${issuedPasses.length} ticket passes into one PDF...`);

    try {
      await downloadTicketPdf(booking, null);
      setEmailStatus(`✅ All ${issuedPasses.length} passes downloaded successfully!`);
      setTimeout(() => setEmailStatus(''), 4000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setEmailStatus('❌ Could not generate PDF bundle.');
      setTimeout(() => setEmailStatus(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenWhatsApp = () => {
    const phone = (booking.mobileNumber || '').replace(/[^0-9]/g, '');
    const text = generateWhatsAppMessage(booking);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleOpenGmail = () => {
    const subject = encodeURIComponent(`🎟️ Ticket Confirmation - Sloan Jooste's Fundraiser Dance (${baseRef})`);
    const body = encodeURIComponent(generateTicketEmailBody(booking));
    window.open(`mailto:${booking.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white my-6 flex flex-col max-h-[95vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/flyer_sloan.jpg" alt="Sloan" className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
            <div>
              <h2 className="text-sm font-black tracking-wide">Sloan Jooste's Fundraiser Dance</h2>
              <span className="text-[10px] text-emerald-300 font-bold">
                {issuedPasses.length} Individual Ticket{issuedPasses.length > 1 ? 's' : ''} Issued
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast / Status Message */}
        {emailStatus && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold text-center animate-fadeIn shadow-sm">
            {emailStatus}
          </div>
        )}

        {/* INDIVIDUAL ISSUED PASS SWITCHER */}
        {issuedPasses.length > 1 && (
          <div className="px-6 pt-3 pb-1 border-b border-purple-100 bg-purple-50/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-purple-950">
                Select Ticket Pass to View ({activePassIndex + 1} of {issuedPasses.length}):
              </span>
              <button
                onClick={handleDownloadAllPdf}
                disabled={isGeneratingPdf}
                className="text-[10px] font-black text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download All ({issuedPasses.length})
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {issuedPasses.map((pass, idx) => (
                <button
                  key={pass.id}
                  onClick={() => setActivePassIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${activePassIndex === idx ? (pass.type === 'raffle' ? 'bg-purple-700 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm') : 'bg-white border border-purple-200 text-slate-700 hover:bg-purple-100'}`}
                >
                  {pass.type === 'raffle' ? <Gift className="w-3 h-3" /> : <Ticket className="w-3 h-3" />}
                  <span>{pass.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body: Ticket Pass */}
        <div className="p-6 space-y-4 overflow-y-auto text-slate-800 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>{activePass.fullLabel}</span>
          </div>

          {/* Attendee Name & Pass Reference */}
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{activePass.attendeeName}</h3>
            <p className="text-xs text-purple-900 font-bold mt-1">
              Pass Reference: <span className="font-mono bg-purple-100 text-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-200 text-sm">{activePass.passRef}</span>
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-slate-50 border border-purple-100 rounded-3xl inline-block shadow-inner">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
              <QRCodeSVG 
                value={qrData}
                size={160}
                level="H"
                includeMargin={true}
                fgColor="#0f172a"
              />
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">
              Scan at Door for Admission
            </p>
          </div>

          {/* Seating & Pass Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-left text-xs">
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-purple-900 block">Table Allocation</span>
              <span className="font-black text-xs text-purple-950">
                {activePass.type === 'raffle' ? '🎟️ Raffle Supporter' : `Table #${activePass.tableNumber}`}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-emerald-900 block">Ticket Holder</span>
              <span className="font-black text-xs text-emerald-950 truncate block">
                {activePass.attendeeName}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Dress Code</span>
              <span className="font-bold text-[11px] text-emerald-800">Splash of Green 💚</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Grand Raffle</span>
              <span className="font-bold text-[11px] text-purple-900">21:00 – 21:30 (7 Prizes)</span>
            </div>
          </div>

          {/* Venue details */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{EVENT_DETAILS.venue}</span>
            </div>
            <p className="text-[11px] text-slate-600 pl-5.5">{EVENT_DETAILS.address}</p>
            <p className="text-[11px] text-purple-900 font-semibold pl-5.5 pt-0.5">
              Friday, 09 Oct 2026 (19:00 - 00:00) • BYO Platter & XYZ
            </p>
          </div>

          {/* Action Buttons: PDF Download, WhatsApp, Gmail, Print */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleDownloadSinglePdf}
                disabled={isGeneratingPdf}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>Download Pass PDF ({activePass.passRef})</span>
              </button>

              {issuedPasses.length > 1 && (
                <button
                  onClick={handleDownloadAllPdf}
                  disabled={isGeneratingPdf}
                  className="py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All ({issuedPasses.length}) Passes</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleOpenWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" /> WhatsApp
              </button>
              <button
                onClick={handleOpenGmail}
                className="py-2.5 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5 text-purple-700" /> Gmail
              </button>
              <button
                onClick={handlePrint}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
