import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Ticket, 
  Users, 
  Calendar, 
  MapPin, 
  Sparkles, 
  Share2, 
  Table, 
  Clock, 
  ShieldCheck,
  Music,
  Gift,
  Play,
  ArrowRightLeft,
  ExternalLink,
  MessageCircle,
  Mail,
  Download,
  Image,
  Phone,
  Lock,
  LogOut,
  UserCheck,
  RotateCcw,
  CheckCircle,
  CreditCard
} from 'lucide-react';

import { 
  subscribeBookings, 
  subscribeTables, 
  EVENT_DETAILS, 
  generateWhatsAppMessage,
  deleteGuestRecord,
  isUserAdmin
} from './firebase';
import BookingWizard from './components/BookingWizard';
import TableMapVisualizer from './components/TableMapVisualizer';
import SeatingArrangementTab from './components/SeatingArrangementTab';
import GuestManagementTab from './components/GuestManagementTab';
import CheckInPortal from './components/CheckInPortal';
import DigitalTicketModal from './components/DigitalTicketModal';
import GeminiConcierge from './components/GeminiConcierge';
import RaffleWheelModal from './components/RaffleWheelModal';
import MyTicketsModal from './components/MyTicketsModal';
import AdminLoginModal from './components/AdminLoginModal';
import DonationsManagementTab from './components/DonationsManagementTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'seating', 'guests', 'checkin', 'donations', 'wall'
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDefaultOption, setBookingDefaultOption] = useState('Standard Dance Ticket');
  const [isRaffleWheelOpen, setIsRaffleWheelOpen] = useState(false);
  const [activeBookingTicket, setActiveBookingTicket] = useState(null);
  const [selectedFlyerModal, setSelectedFlyerModal] = useState(null);
  
  // Two Types of Accounts: Admin vs Guest
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  
  // Guest / Ticket Buyer Account
  const [guestEmail, setGuestEmail] = useState('');
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);

  // Real-time Firestore State (Starts at ZERO)
  const [bookings, setBookings] = useState([]);
  const [tablesData, setTablesData] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load saved session
  useEffect(() => {
    const savedAdmin = localStorage.getItem('sloan_admin_authenticated');
    const savedAdminEmail = localStorage.getItem('sloan_admin_email');
    if (savedAdmin === 'true' && savedAdminEmail) {
      setIsAdmin(true);
      setAdminEmail(savedAdminEmail);
    }

    const savedGuestEmail = localStorage.getItem('sloan_guest_email');
    if (savedGuestEmail) {
      setGuestEmail(savedGuestEmail);
    }
  }, []);

  useEffect(() => {
    // Subscribe to Firestore Bookings (Zero default)
    const unsubscribeBookings = subscribeBookings((data) => {
      if (data) {
        setBookings(data);
      } else {
        setBookings([]);
      }
    });

    // Subscribe to Firestore Tables
    const unsubscribeTables = subscribeTables((data) => {
      if (data) setTablesData(data);
    });

    return () => {
      if (unsubscribeBookings) unsubscribeBookings();
      if (unsubscribeTables) unsubscribeTables();
    };
  }, []);

  // Total funds raised & stats calculation in ZAR (R) - Starts completely at 0
  const totalAmountRaised = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const targetGoal = 100000;
  const progressPercent = Math.min(100, Math.round((totalAmountRaised / targetGoal) * 100));
  const totalTicketsSold = bookings.reduce((sum, b) => sum + (Number(b.numTickets) || 0), 0);
  const totalRaffleTicketsSold = bookings.reduce((sum, b) => sum + (Number(b.raffleTicketsCount) || 0), 0);

  // Dynamic table occupancy calculation across 35 tables (10 capacity each = 350 seats)
  const tableOccupancyMap = {};
  for (let i = 1; i <= 35; i++) tableOccupancyMap[i] = 0;
  bookings.forEach(b => {
    if (b.tableNumber && b.tableNumber >= 1 && b.tableNumber <= 35 && b.tableBookingOption !== 'Raffle Tickets Only') {
      tableOccupancyMap[b.tableNumber] = (tableOccupancyMap[b.tableNumber] || 0) + (Number(b.numTickets) || 1);
    }
  });
  const fullTablesCount = Object.values(tableOccupancyMap).filter(seats => seats >= 10).length;
  const availableTablesCount = Math.max(0, 35 - fullTablesCount);
  const totalSeatsRemaining = Math.max(0, 350 - totalTicketsSold);

  // Post-booking toast state
  const [bookingSuccessToast, setBookingSuccessToast] = useState(null);

  // Guest's own tickets count
  const guestTicketsCount = guestEmail 
    ? bookings.filter(b => (b.email || '').trim().toLowerCase() === guestEmail.trim().toLowerCase()).length 
    : 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const handleOpenBooking = (option = 'Standard Dance Ticket') => {
    setBookingDefaultOption(option);
    setIsBookingOpen(true);
  };

  const handleAdminLoginSuccess = (email) => {
    setIsAdmin(true);
    setAdminEmail(email);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminEmail('');
    localStorage.removeItem('sloan_admin_authenticated');
    localStorage.removeItem('sloan_admin_email');
    setActiveTab('overview');
  };

  const handleGuestEmailChange = (email) => {
    setGuestEmail(email);
    localStorage.setItem('sloan_guest_email', email);
  };

  // Instant local state updaters
  const handleUpdateBooking = (bookingId, updatedFields) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updatedFields } : b));
  };

  const handleDeleteBooking = (bookingId) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  };

  const handleAddBooking = (newBooking) => {
    setBookings(prev => [newBooking, ...prev]);
    if (newBooking.email) {
      handleGuestEmailChange(newBooking.email);
    }
  };

  // Reset / Clear All Bookings to ZERO
  const handleResetAllToZero = async () => {
    if (!window.confirm("⚠️ ARE YOU SURE? This will permanently delete all current tickets and reset funds raised to R0.")) {
      return;
    }
    setIsResetting(true);
    try {
      for (const b of bookings) {
        await deleteGuestRecord(b.id);
      }
      setBookings([]);
      alert("✅ All guest records have been cleared. Application is now 100% blank at R0.");
    } catch (e) {
      console.error(e);
      alert("Error clearing records");
    } finally {
      setIsResetting(false);
    }
  };

  const shareViaWhatsAppGeneral = () => {
    const text = encodeURIComponent(`*🎟️ SLOAN JOOSTE'S FUNDRAISER DANCE 💚*\n\nJoin us on *Friday, 09 October 2026 (19:00 - 00:00)* at Kuils River Technical High School!\n\n• Live Music by The Elginairs & DJ Cool J\n• Grand Charity Raffle Draw (21:00 - 21:30)\n• Dress Code: A Splash of Green 💚\n• BYO Platter & XYZ\n\nBook your tickets & tables: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-emerald-500 selection:text-white">
      
      {/* Top Admin Status Bar (if logged in as admin) */}
      {isAdmin && (
        <div className="bg-purple-950 text-purple-100 text-xs px-4 py-1.5 flex items-center justify-between border-b border-purple-800">
          <div className="flex items-center gap-2 font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>🛡️ Admin Console: <strong className="text-white font-mono">{adminEmail}</strong></span>
            <span className="hidden sm:inline text-purple-300">• Full Management Access (35 Tables & Check-In)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAllToZero}
              disabled={isResetting || bookings.length === 0}
              className="text-[11px] font-bold text-rose-300 hover:text-rose-100 flex items-center gap-1 transition disabled:opacity-40"
              title="Clear all bookings and reset to zero"
            >
              <RotateCcw className="w-3 h-3" /> Reset Database (R0)
            </button>
            <button 
              onClick={handleAdminLogout}
              className="text-[11px] font-bold text-purple-300 hover:text-white flex items-center gap-1 transition"
            >
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-purple-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 p-1 border-2 border-emerald-500/40 flex items-center justify-center shadow-sm overflow-hidden">
              <img src="/flyer_sloan.jpg" alt="Sloan Jooste Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight">Sloan Jooste's Fundraiser Dance</h1>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {availableTablesCount} of 35 Tables Available
                </span>
              </div>
              <p className="text-xs text-purple-900 font-semibold flex flex-wrap items-center gap-1.5">
                <span>09 October 2026</span> • <span>Kuils River Tech High</span> • <span className="text-emerald-700 font-bold">Raffle 21:00 - 21:30</span>
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-purple-100 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
            >
              Overview & Cause
            </button>
            
            {/* Admin-only Tabs */}
            {isAdmin ? (
              <>
                <button
                  onClick={() => setActiveTab('seating')}
                  className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'seating' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
                >
                  Seating (35 Tables)
                </button>
                <button
                  onClick={() => setActiveTab('guests')}
                  className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'guests' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
                >
                  Guest & Ticket Manager
                </button>
                <button
                  onClick={() => setActiveTab('donations')}
                  className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'donations' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
                >
                  💝 Donations
                </button>
                <button
                  onClick={() => setActiveTab('checkin')}
                  className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'checkin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
                >
                  Door Check-In
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('seating')}
                className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'seating' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
              >
                35 Tables Map
              </button>
            )}

            <button
              onClick={() => setActiveTab('wall')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'wall' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
            >
              Wall of Support
            </button>
          </nav>

          {/* Top Actions: My Tickets, Admin Login, WhatsApp, Get Tickets */}
          <div className="flex items-center gap-2">
            
            {/* Customer "My Tickets" Button */}
            <button
              onClick={() => setIsMyTicketsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 hover:bg-purple-100 text-xs font-black transition shadow-sm"
              title="View my bought tickets and download PDF"
            >
              <Ticket className="w-4 h-4 text-emerald-600" />
              <span>My Tickets</span>
              {guestTicketsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                  {guestTicketsCount}
                </span>
              )}
            </button>

            {/* Admin Sign In / Badge */}
            {!isAdmin ? (
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
                title="Admin Login for Organizers"
              >
                <Lock className="w-3.5 h-3.5 text-purple-700" /> Admin
              </button>
            ) : (
              <button
                onClick={() => setIsRaffleWheelOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 hover:bg-purple-200 text-xs font-black transition shadow-sm"
                title="Launch Projector Raffle Wheel"
              >
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>Projector Wheel</span>
              </button>
            )}

            <button
              onClick={shareViaWhatsAppGeneral}
              className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition"
              title="Share event on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-100 border border-purple-200 text-purple-900 hover:bg-slate-200 transition"
              title="Copy event link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleOpenBooking('Standard Dance Ticket')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
            >
              <Ticket className="w-4 h-4" /> Get Tickets
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex items-center justify-around bg-white border-b border-purple-200 p-2 text-xs font-bold overflow-x-auto shadow-sm">
        <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Overview</button>
        <button onClick={() => setActiveTab('seating')} className={activeTab === 'seating' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>35 Tables</button>
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab('guests')} className={activeTab === 'guests' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Guests</button>
            <button onClick={() => setActiveTab('donations')} className={activeTab === 'donations' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Donations</button>
            <button onClick={() => setActiveTab('checkin')} className={activeTab === 'checkin' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Check-In</button>
            <button onClick={() => setIsRaffleWheelOpen(true)} className="text-purple-900 font-black flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-emerald-600" /> Wheel
            </button>
          </>
        )}
        <button onClick={() => setIsMyTicketsOpen(true)} className="text-purple-950 font-black flex items-center gap-1">
          <Ticket className="w-3.5 h-3.5 text-emerald-600" /> My Passes
        </button>
      </div>

      {/* Share Toast */}
      {shareCopied && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xl animate-fadeIn">
          ✅ Event link copied to clipboard!
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* POST-BOOKING LANDING REDIRECT BANNER */}
        {bookingSuccessToast && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-700 via-green-800 to-purple-950 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn border border-emerald-400/40">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-6 h-6 text-white stroke-[3]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black">
                    🎉 Booking Received for {bookingSuccessToast.firstName} {bookingSuccessToast.surname}!
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black uppercase">
                    EFT Payment Required
                  </span>
                </div>
                <p className="text-xs text-emerald-100 font-medium">
                  Reference: <strong className="font-mono text-white bg-white/20 px-2 py-0.5 rounded text-xs">{getShortReference(bookingSuccessToast)}</strong> • Amount Due: <strong className="text-white">R{bookingSuccessToast.amount}</strong> {bookingSuccessToast.tableNumber > 0 ? `• Table #${bookingSuccessToast.tableNumber}` : ''}
                </p>
                <p className="text-[11px] text-emerald-200">
                  Please EFT <strong>R{bookingSuccessToast.amount}</strong> to FNB (Acc: <strong>62334900091</strong>, Branch: <strong>250655</strong>) using Reference: <strong>{bookingSuccessToast.firstName} {bookingSuccessToast.surname}</strong>. Tickets will be activated once funds clear.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap shrink-0">
              <button
                onClick={() => {
                  const phone = (bookingSuccessToast.mobileNumber || '').replace(/[^0-9]/g, '');
                  const text = generateWhatsAppMessage(bookingSuccessToast);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Proof
              </button>
              <button
                onClick={() => {
                  setBookingSuccessToast(null);
                  setIsMyTicketsOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition shadow"
              >
                View in My Tickets
              </button>
              <button
                onClick={() => setBookingSuccessToast(null)}
                className="p-2 rounded-xl hover:bg-white/20 text-white"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* HERO BANNER */}
        <div className="relative rounded-3xl p-6 sm:p-10 glass-card border border-purple-200 overflow-hidden shadow-lg bg-gradient-to-br from-white via-emerald-50/40 to-purple-50/50">
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="flex items-center gap-3.5">
                <img src="/flyer_sloan.jpg" alt="Sloan Jooste" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-600 shadow-md shrink-0" />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> In Aid of Cerebral Palsy • Post-Op Physio
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight pt-1">
                    Sloan Jooste's <span className="text-emerald-700">Fundraiser Dance</span>
                  </h2>
                  <p className="text-xs text-purple-900 font-extrabold tracking-wide">
                    Live Music by <strong className="text-slate-900">The Elginairs</strong> • Official DJ: <strong className="text-slate-900">DJ Cool J</strong>
                  </p>
                </div>
              </div>

              {/* Event Metadata Ribbon */}
              <div className="p-3.5 rounded-2xl bg-white border border-purple-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Friday, 09 Oct 2026 (19:00 - 00:00)</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-purple-950">
                  <MapPin className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Kuils River Technical High School</span>
                </div>
                <div className="flex items-center gap-1.5 font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  <span>👗 Dress: A Splash of Green</span>
                </div>
              </div>

              {/* Highlight Raffle Draw Box */}
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shrink-0 font-black shadow-sm">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-purple-950 flex items-center gap-2">
                      Grand Charity Raffle Draw (21:00 – 21:30)
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold">7 Grand Prizes</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Grand Prize Whole Lamb drawn LAST! Tickets R50 for 1 • R100 for 3.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenBooking('Raffle Tickets Only')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black transition shadow"
                  >
                    Buy Raffle Tickets
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setIsRaffleWheelOpen(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 hover:bg-purple-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-purple-900" /> Admin Wheel
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenBooking('Standard Dance Ticket')}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.01] transition"
                >
                  <Ticket className="w-5 h-5" /> Book Dance Tickets (R150)
                </button>
                <button
                  onClick={() => setIsMyTicketsOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-white border border-purple-200 text-purple-950 font-extrabold text-sm hover:bg-purple-50 transition flex items-center gap-2 shadow-sm"
                >
                  <Ticket className="w-4 h-4 text-emerald-600" /> My Bought Tickets
                </button>
              </div>

            </div>

            {/* Right Fundometer Tracker */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-purple-200 shadow-md space-y-5">
              
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black text-purple-900 uppercase tracking-wider">Raised So Far</span>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">R{totalAmountRaised.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Goal</span>
                  <p className="text-lg font-bold text-slate-700 mt-1">R{targetGoal.toLocaleString()}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700">{progressPercent}% Goal Achieved</span>
                  <span className="text-slate-400">{100 - progressPercent}% to target</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-100 p-0.5 border border-purple-200 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-1000 shadow-sm"
                    style={{ width: `${Math.max(progressPercent, 1)}%` }}
                  ></div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <Users className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                  <span className="font-black text-slate-900 block">{totalTicketsSold}</span>
                  <span className="text-[10px] text-emerald-800 font-semibold">Tickets Sold</span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <Table className="w-4 h-4 text-purple-700 mx-auto mb-1" />
                  <span className="font-black text-purple-950 block">{availableTablesCount} Open</span>
                  <span className="text-[10px] text-purple-900 font-semibold">{totalSeatsRemaining} Seats Left</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <Gift className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                  <span className="font-black text-slate-900 block">{totalRaffleTicketsSold}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Raffle Tickets</span>
                </div>
              </div>

              {/* Bring Your Own Notice & Official Bank Info */}
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 font-bold text-center">
                🧺 Bring Your Own Platter & XYZ (Drinks & Snacks Welcome)
              </div>

            </div>

          </div>
        </div>



        {/* TAB 1: OVERVIEW & CAUSE */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Cause Details & Raffle Banner */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* About Sloan */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-4">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-emerald-600" />
                  About Sloan Jooste & The Cause
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Sloan Jooste is an extraordinary young superhero whose radiant smile, courage, and perseverance inspire our entire community. This fundraiser dance raises crucial funds for Sloan's ongoing post-op physiotherapy, specialized treatments, and Cerebral Palsy care.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  100% of all ticket purchases, table reservations, and raffle entries go directly toward Sloan's medical care and recovery journey.
                </p>

                {/* Transparency Breakdown */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-900">Fund Allocation Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-700 font-black text-lg">60%</span>
                      <p className="font-black text-slate-900 mt-1">Post-Op Physio & Treatment</p>
                      <p className="text-[11px] text-slate-500 font-medium">Cerebral Palsy rehabilitation</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <span className="text-purple-700 font-black text-lg">25%</span>
                      <p className="font-black text-slate-900 mt-1">Specialized Care & Devices</p>
                      <p className="text-[11px] text-slate-500 font-medium">Mobility & recovery equipment</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-700 font-black text-lg">15%</span>
                      <p className="font-black text-slate-900 mt-1">Event & Community Drive</p>
                      <p className="text-[11px] text-slate-500 font-medium">Hall, setup, and entertainment</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7 Grand Raffle Prizes Card */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-emerald-600" />
                    7 Official Charity Raffle Prizes
                  </h3>
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Grand Prize Drawn Last
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  {/* Prize 1 */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-purple-900 font-bold">PRIZE #1</span>
                      <p className="font-black text-slate-900 text-sm">Chivas Regal 13YO Rye Cask</p>
                      <p className="text-[11px] text-slate-500">American Rye Cask Scotch 1L</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs">R2,000</span>
                  </div>

                  {/* Prize 2 */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-purple-900 font-bold">PRIZE #2</span>
                      <p className="font-black text-slate-900 text-sm">Chivas Regal 13YO Rum Cask</p>
                      <p className="text-[11px] text-slate-500">Rum Cask Scotch Whisky 1L</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs">R2,000</span>
                  </div>

                  {/* Prize 3 */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-purple-900 font-bold">PRIZE #3</span>
                      <p className="font-black text-slate-900 text-sm">Spyced Restaurant Dining</p>
                      <p className="text-[11px] text-slate-500">Exclusive Dining Experience</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs">R1,820</span>
                  </div>

                  {/* Prize 4 */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-purple-900 font-bold">PRIZE #4</span>
                      <p className="font-black text-slate-900 text-sm">Hot Stone Massage #1</p>
                      <p className="text-[11px] text-slate-500">Radiance Room Spa Session</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs">R600</span>
                  </div>

                  {/* Prize 5 */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-purple-900 font-bold">PRIZE #5</span>
                      <p className="font-black text-slate-900 text-sm">Hot Stone Massage #2</p>
                      <p className="text-[11px] text-slate-500">Radiance Room Spa Session</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs">R600</span>
                  </div>

                  {/* Prize 6 */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-purple-900 font-bold">PRIZE #6</span>
                      <p className="font-black text-slate-900 text-sm">Couples Photoshoot</p>
                      <p className="text-[11px] text-slate-500">Professional Studio / Outdoor Shoot</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs">R2,500</span>
                  </div>

                  {/* Prize 7: GRAND PRIZE */}
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="font-black text-emerald-800 text-xs flex items-center gap-1">
                        🏆 GRAND PRIZE (Drawn Last)
                      </span>
                      <p className="font-black text-slate-900 text-base">Whole Lamb</p>
                      <p className="text-xs text-slate-600 font-medium">Grand prize for our lucky raffle supporter</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-sm">R2,000</span>
                  </div>

                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">R50 for 1 Ticket • R100 for 3 Tickets (1 Ticket = 1 Wheel Slice)</p>
                  <button
                    onClick={() => handleOpenBooking('Raffle Tickets Only')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
                  >
                    Buy Raffle Tickets
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Banking Details, Venue & AI Assistant */}
            <div className="space-y-6">
              
              {/* Official FNB Banking Details Box */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-black text-slate-900 text-sm">Official Bank Account for EFT</h4>
                </div>
                <p className="text-slate-600 font-medium">
                  You can purchase additional raffle tickets via EFT directly to the fundraiser account:
                </p>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-purple-200 space-y-1.5 font-mono text-slate-900">
                  <div><strong className="font-sans text-purple-900">Bank:</strong> {EVENT_DETAILS.banking.bank}</div>
                  <div><strong className="font-sans text-purple-900">Account Holder:</strong> {EVENT_DETAILS.banking.accountHolder}</div>
                  <div><strong className="font-sans text-purple-900">Account Type:</strong> {EVENT_DETAILS.banking.accountType}</div>
                  <div><strong className="font-sans text-purple-900">Account Number:</strong> {EVENT_DETAILS.banking.accountNumber}</div>
                  <div><strong className="font-sans text-purple-900">Branch Code:</strong> {EVENT_DETAILS.banking.branchCode}</div>
                  <div className="pt-1 text-[11px] text-emerald-800 font-bold font-sans">
                    Ref: [Your Ticket Ref e.g. SJ-XXXX or Name]
                  </div>
                </div>
              </div>

              {/* Event Location Card */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-3 text-xs">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Venue & Driving Directions
                </h4>
                <p className="font-bold text-slate-900">{EVENT_DETAILS.venue}</p>
                <p className="text-slate-600 font-medium">{EVENT_DETAILS.address}</p>
                
                <a 
                  href={EVENT_DETAILS.googleMapsUrl}
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold flex items-center justify-center gap-1.5 transition"
                >
                  Open in Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Event Organizers Contact */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-2 text-xs">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-700" />
                  Organizing Committee
                </h4>
                <div className="space-y-1.5 font-medium text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>Nicole Jooste:</span>
                    <a href="tel:0711134812" className="font-bold text-emerald-700">071 113 4812</a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Marsha Beukes:</span>
                    <a href="tel:0795285350" className="font-bold text-emerald-700">079 528 5350</a>
                  </div>
                </div>
              </div>

              {/* AI Concierge */}
              <GeminiConcierge />

            </div>

          </div>
        )}

        {/* TAB 2: SEATING ARRANGEMENT & TABLE MANAGEMENT (35 TABLES) */}
        {activeTab === 'seating' && (
          <SeatingArrangementTab 
            bookings={bookings}
            tablesData={tablesData}
            onUpdateBooking={handleUpdateBooking}
            onAddBooking={handleAddBooking}
          />
        )}

        {/* TAB 3: GUEST & TICKET MANAGER (Admin Only) */}
        {activeTab === 'guests' && isAdmin && (
          <GuestManagementTab 
            bookings={bookings}
            tablesData={tablesData}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
            onAddBooking={handleAddBooking}
            onViewTicketPass={(booking) => setActiveBookingTicket(booking)}
          />
        )}

        {/* TAB 4: DONATIONS MANAGER (Admin Only) */}
        {activeTab === 'donations' && isAdmin && (
          <DonationsManagementTab 
            bookings={bookings}
            onUpdateBooking={handleUpdateBooking}
            onAddBooking={handleAddBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {/* TAB 5: DOOR CHECK-IN DESK (Admin Only) */}
        {activeTab === 'checkin' && isAdmin && (
          <CheckInPortal 
            bookings={bookings} 
            onViewTicketPass={(booking) => setActiveBookingTicket(booking)}
          />
        )}

        {/* TAB 5: WALL OF SUPPORT */}
        {activeTab === 'wall' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 rounded-3xl bg-white border border-purple-200 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-emerald-600" />
                  Wall of Support & Guest Messages
                </h3>
                <p className="text-xs text-purple-900 font-medium">Heartwarming notes and contributions for Sloan Jooste's care journey</p>
              </div>
              <button
                onClick={() => handleOpenBooking('Standard Dance Ticket')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md hover:bg-emerald-700 transition"
              >
                Add Your Message
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-purple-200 space-y-3">
                <Heart className="w-12 h-12 text-emerald-600/30 mx-auto" />
                <h4 className="font-extrabold text-slate-700 text-sm">Be the first to leave a message of support!</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Book a ticket or support Sloan's raffle to leave an encouraging message on the Wall of Support.
                </p>
                <button
                  onClick={() => handleOpenBooking('Standard Dance Ticket')}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-md hover:bg-emerald-700 transition"
                >
                  Book Tickets & Leave Message
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.map((b) => (
                  <div key={b.id} className="p-5 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{b.firstName} {b.surname}</h4>
                        <span className="text-[11px] text-emerald-700 font-bold">
                          {b.tableBookingOption === 'Raffle Tickets Only' ? '🎟️ Raffle Supporter' : `Table #${b.tableNumber} • ${b.tableBookingOption}`}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black">
                        R{b.amount}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 italic bg-purple-50/50 p-3 rounded-2xl border border-purple-100 font-medium">
                      "{b.specialRequests || 'Honoured to support Sloan on this inspiring care journey!'}"
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100">
                      <span>{b.numTickets || 1} Seat(s) Reserved</span>
                      <span>{new Date(b.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-purple-200 mt-12 py-8 text-center text-xs text-slate-500 font-medium space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-purple-900 font-bold">
          <span>📅 Friday, 09 October 2026</span>
          <span>📍 Kuils River Technical High School</span>
          <span>🎟️ Raffle Draw: 21:00 - 21:30</span>
          <span>👗 A Splash of Green</span>
        </div>
        <p className="max-w-xl mx-auto text-[11px] text-slate-600">
          In aid of Sloan Jooste's post-op physiotherapy, rehabilitation, and Cerebral Palsy care. 
          100% of proceeds directly fund medical treatment and recovery.
        </p>
        <div className="pt-2 flex items-center justify-center gap-4 text-[11px]">
          <button onClick={() => setIsMyTicketsOpen(true)} className="text-emerald-700 font-bold hover:underline">My Tickets Pass</button>
          <span>•</span>
          <button onClick={() => setIsAdminLoginOpen(true)} className="text-purple-700 font-bold hover:underline">
            {isAdmin ? 'Admin Console' : 'Admin Login'}
          </button>
        </div>
      </footer>

      {/* MODAL: BOOKING WIZARD */}
      {isBookingOpen && (
        <BookingWizard 
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          defaultOption={bookingDefaultOption}
          bookings={bookings}
          onBookingComplete={(newBooking) => {
            handleAddBooking(newBooking);
            setBookingSuccessToast(newBooking);
          }}
        />
      )}

      {/* MODAL: DIGITAL TICKET PASS */}
      {activeBookingTicket && (
        <DigitalTicketModal 
          booking={activeBookingTicket}
          onClose={() => setActiveBookingTicket(null)}
        />
      )}

      {/* MODAL: MY TICKETS LOOKUP */}
      {isMyTicketsOpen && (
        <MyTicketsModal 
          isOpen={isMyTicketsOpen}
          onClose={() => setIsMyTicketsOpen(false)}
          bookings={bookings}
          currentEmail={guestEmail}
          onEmailChange={handleGuestEmailChange}
          onOpenBooking={handleOpenBooking}
          onUpdateBooking={handleUpdateBooking}
          onSelectTicketPass={(b) => {
            setIsMyTicketsOpen(false);
            setActiveBookingTicket(b);
          }}
        />
      )}

      {/* MODAL: ADMIN LOGIN */}
      {isAdminLoginOpen && (
        <AdminLoginModal 
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}

      {/* MODAL: PROJECTOR RAFFLE WHEEL */}
      {isRaffleWheelOpen && (
        <RaffleWheelModal 
          isOpen={isRaffleWheelOpen}
          onClose={() => setIsRaffleWheelOpen(false)}
          bookings={bookings}
        />
      )}

      {/* MODAL: FLYER FULL-SIZE VIEWER */}
      {selectedFlyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedFlyerModal(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-purple-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-gradient-to-r from-emerald-700 to-purple-900 text-white flex items-center justify-between">
              <h3 className="font-black text-sm">{selectedFlyerModal.title}</h3>
              <button onClick={() => setSelectedFlyerModal(null)} className="p-1 rounded-full hover:bg-white/20">
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-100 max-h-[75vh] overflow-y-auto">
              <img src={selectedFlyerModal.src} alt={selectedFlyerModal.title} className="max-w-full h-auto rounded-2xl shadow-md" />
            </div>
            <div className="p-4 bg-white border-t border-purple-100 flex items-center justify-between">
              <a 
                href={selectedFlyerModal.src} 
                download 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-4 h-4" /> Download High-Res Image
              </a>
              <button 
                onClick={() => {
                  const text = encodeURIComponent(`Check out the flyer for Sloan Jooste's Fundraiser Dance: ${window.location.origin}${selectedFlyerModal.src}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" /> Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
