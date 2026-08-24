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
  FileText
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

  const ticketRef = getShortReference(booking);

  const qrData = JSON.stringify({
    ref: ticketRef,
    id: booking.id,
    name: `${booking.firstName} ${booking.surname}`,
    email: booking.email,
    table: booking.tableNumber,
    tickets: booking.numTickets,
    raffleTickets: booking.raffleTicketsCount || 0
  });

  // Export 100% reliable standalone PDF
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setEmailStatus('⏳ Generating official PDF ticket...');

    try {
      await downloadTicketPdf(booking);
      setEmailStatus(`✅ PDF Ticket downloaded: Sloan_Jooste_Ticket_${ticketRef}.pdf`);
      setTimeout(() => setEmailStatus(''), 4000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setEmailStatus('❌ Could not generate PDF. Please use the Print button.');
      setTimeout(() => setEmailStatus(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy rich HTML email card to clipboard (allows pasting formatted ticket in Gmail / Outlook)
  const handleCopyRichHtmlForEmail = async () => {
    try {
      const htmlContent = generateHtmlTicketEmail(booking);
      const textFallback = generateTicketEmailBody(booking);

      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([textFallback], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(textFallback);
      }

      setCopiedHtml(true);
      setEmailStatus('📋 Visual formatted ticket copied! Paste directly into Gmail or Outlook composer.');
      setTimeout(() => {
        setCopiedHtml(false);
        setEmailStatus('');
      }, 5000);
    } catch (e) {
      console.error("Clipboard copy error:", e);
      navigator.clipboard.writeText(generateTicketEmailBody(booking));
      setEmailStatus('📋 Ticket text copied to clipboard!');
      setTimeout(() => setEmailStatus(''), 4000);
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
    const subject = encodeURIComponent(`🎟️ Ticket Confirmation - Sloan Jooste's Fundraiser Dance (${ticketRef})`);
    const body = encodeURIComponent(generateTicketEmailBody(booking));
    window.open(`mailto:${booking.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleResendAutomatedEmail = async () => {
    try {
      await resendTicketEmail(booking);
      setEmailStatus(`✅ Confirmation email sent to ${booking.email}`);
      setTimeout(() => setEmailStatus(''), 4000);
    } catch (e) {
      setEmailStatus('❌ Error sending email.');
      setTimeout(() => setEmailStatus(''), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white my-6 flex flex-col">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/flyer_sloan.jpg" alt="Sloan" className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
            <div>
              <h2 className="text-sm font-black tracking-wide">Sloan Jooste's Fundraiser Dance</h2>
              <span className="text-[10px] text-emerald-300 font-bold">Official Entry & Raffle Pass</span>
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

        {/* Scrollable Container with Printable Ticket Element */}
        <div className="p-6 space-y-5 text-slate-800 max-h-[70vh] overflow-y-auto">
          
          {/* THE DIGITAL TICKET PASS CARD */}
          <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-4">
            
            {/* Header in ticket */}
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" /> Official Digital Ticket Pass
              </span>
              <h3 className="text-2xl font-black text-slate-900 pt-1">{booking.firstName} {booking.surname}</h3>
              <div className="text-xs text-purple-900 font-bold flex items-center justify-center gap-1.5">
                <span>Ticket Reference:</span>
                <span className="font-mono font-black text-sm bg-purple-100 text-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-200">
                  {ticketRef}
                </span>
              </div>
            </div>

            {/* QR Code & Door Notice */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-purple-100 flex flex-col items-center justify-center space-y-2">
              <div className="p-3.5 bg-white rounded-2xl shadow-md border border-slate-200">
                <QRCodeSVG value={qrData} size={145} level="H" />
              </div>
              <p className="text-[10px] text-purple-950 uppercase tracking-widest font-black">
                Present QR Code At Door for Check-In
              </p>
            </div>

            {/* Seating & Ticket Summary Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-[10px] font-bold uppercase text-purple-900 block">Table Allocation</span>
                <p className="font-black text-sm text-purple-950 flex items-center gap-1 mt-0.5">
                  {booking.tableNumber > 0 ? (
                    <>
                      <Table className="w-4 h-4 text-emerald-600 shrink-0" /> Table #{booking.tableNumber}
                    </>
                  ) : (
                    <span>🎟️ Raffle Supporter</span>
                  )}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">Tickets & Slices</span>
                <p className="font-black text-sm text-emerald-950 mt-0.5">
                  {booking.numTickets > 0 && `${booking.numTickets} Dance`}
                  {booking.numTickets > 0 && booking.raffleTicketsCount > 0 && ' • '}
                  {booking.raffleTicketsCount > 0 && `${booking.raffleTicketsCount} Raffle`}
                  {!booking.numTickets && !booking.raffleTicketsCount && '1 Ticket'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Amount Paid</span>
                <p className="font-black text-sm text-emerald-700 mt-0.5">R{booking.amount || 0}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Dress Code</span>
                <p className="font-bold text-xs text-emerald-800 mt-0.5">A Splash of Green 💚</p>
              </div>
            </div>

            {/* Event Venue & Map Link */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" /> Venue & Event Location
                </span>
                <a 
                  href={EVENT_DETAILS.googleMapsUrl}
                  target="_blank" 
                  rel="noreferrer"
                  className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-700 transition"
                >
                  Open Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="font-black text-slate-900 text-xs">{EVENT_DETAILS.venue}</p>
              <p className="text-slate-600 text-[11px] font-medium">{EVENT_DETAILS.address}</p>
              
              <div className="pt-1.5 text-[11px] text-purple-950 font-semibold flex flex-col gap-0.5 border-t border-emerald-200/80">
                <span>📅 {EVENT_DETAILS.date} (19:00 - 00:00)</span>
                <span>🎟️ Grand Raffle Draw: 21:00 - 21:30</span>
                <span>🧺 {EVENT_DETAILS.byo}</span>
                <span>🎵 {EVENT_DETAILS.entertainment}</span>
              </div>
            </div>

            {/* Buy Extra Raffle Tickets via EFT (FNB) */}
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-black text-purple-950 text-xs">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Buy Extra Raffle Tickets via EFT (R50/1 • R100/3)
              </div>
              <p className="text-[11px] text-slate-700 font-medium">
                Make an EFT using your short reference to buy more raffle entries:
              </p>
              <div className="p-2.5 rounded-xl bg-white border border-purple-200 space-y-1 font-mono text-[11px] text-slate-900">
                <div><strong className="font-sans text-purple-900">Bank:</strong> {EVENT_DETAILS.banking.bank}</div>
                <div><strong className="font-sans text-purple-900">Account Holder:</strong> {EVENT_DETAILS.banking.accountHolder}</div>
                <div><strong className="font-sans text-purple-900">Account Type:</strong> {EVENT_DETAILS.banking.accountType}</div>
                <div><strong className="font-sans text-purple-900">Account No:</strong> {EVENT_DETAILS.banking.accountNumber}</div>
                <div><strong className="font-sans text-purple-900">Branch Code:</strong> {EVENT_DETAILS.banking.branchCode}</div>
                <div className="text-emerald-900 font-black bg-emerald-50 p-1 rounded">
                  <strong className="font-sans text-purple-900">Payment Reference:</strong> {ticketRef}
                </div>
              </div>
            </div>

          </div>

          {/* Shareable Event Flyers Strip */}
          <div className="space-y-2">
            <span className="text-xs font-black text-purple-900 flex items-center gap-1">
              <Image className="w-4 h-4 text-emerald-600" /> Event Flyers (Click to View/Download)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <a href="/flyer_sloan.jpg" target="_blank" rel="noreferrer" className="rounded-xl overflow-hidden border border-purple-200 hover:scale-105 transition shadow-sm block">
                <img src="/flyer_sloan.jpg" alt="Sloan Flyer" className="w-full h-20 object-cover" />
                <span className="block text-[9px] font-bold text-center py-0.5 bg-purple-50 text-purple-900 truncate">Fundraiser</span>
              </a>
              <a href="/flyer_dj_cool_j.jpg" target="_blank" rel="noreferrer" className="rounded-xl overflow-hidden border border-purple-200 hover:scale-105 transition shadow-sm block">
                <img src="/flyer_dj_cool_j.jpg" alt="DJ Cool J Flyer" className="w-full h-20 object-cover" />
                <span className="block text-[9px] font-bold text-center py-0.5 bg-purple-50 text-purple-900 truncate">DJ Cool J</span>
              </a>
              <a href="/flyer_elginairs.jpg" target="_blank" rel="noreferrer" className="rounded-xl overflow-hidden border border-purple-200 hover:scale-105 transition shadow-sm block">
                <img src="/flyer_elginairs.jpg" alt="The Elginairs Flyer" className="w-full h-20 object-cover" />
                <span className="block text-[9px] font-bold text-center py-0.5 bg-purple-50 text-purple-900 truncate">The Elginairs</span>
              </a>
            </div>
          </div>

        </div>

        {/* Action Buttons: Download PDF, Copy Visual Email, WhatsApp, Gmail */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs font-bold">
          
          {/* Row 1: PDF Download & Copy Formatted Email */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Download PDF Ticket (.pdf)
            </button>

            <button
              onClick={handleCopyRichHtmlForEmail}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-1.5 shadow-md transition"
              title="Copy visual ticket design to paste in Gmail or Outlook"
            >
              <Copy className="w-4 h-4" /> {copiedHtml ? 'Copied Visual Pass!' : 'Copy Ticket for Email'}
            </button>
          </div>

          {/* Row 2: WhatsApp, Gmail, Resend, Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" /> WhatsApp Pass
            </button>

            <button
              onClick={handleOpenGmail}
              className="flex-1 py-2 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 flex items-center justify-center gap-1.5 transition"
            >
              <Mail className="w-4 h-4 text-purple-700" /> Open Gmail
            </button>

            <button
              onClick={handleResendAutomatedEmail}
              className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              title="Resend email confirmation"
            >
              <Send className="w-4 h-4 text-slate-600" />
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              title="Print Ticket"
            >
              <Printer className="w-4 h-4 text-slate-600" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
