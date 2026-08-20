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
  Phone
} from 'lucide-react';

import { subscribeBookings, subscribeTables, EVENT_DETAILS, generateWhatsAppMessage } from './firebase';
import BookingWizard from './components/BookingWizard';
import TableMapVisualizer from './components/TableMapVisualizer';
import SeatingArrangementTab from './components/SeatingArrangementTab';
import GuestManagementTab from './components/GuestManagementTab';
import CheckInPortal from './components/CheckInPortal';
import DigitalTicketModal from './components/DigitalTicketModal';
import GeminiConcierge from './components/GeminiConcierge';
import RaffleWheelModal from './components/RaffleWheelModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'seating', 'guests', 'checkin', 'wall'
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDefaultOption, setBookingDefaultOption] = useState('Standard Dance Ticket');
  const [isRaffleWheelOpen, setIsRaffleWheelOpen] = useState(false);
  const [activeBookingTicket, setActiveBookingTicket] = useState(null);
  const [selectedFlyerModal, setSelectedFlyerModal] = useState(null);
  
  // Real-time Firestore State
  const [bookings, setBookings] = useState([]);
  const [tablesData, setTablesData] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);

  // Seed data for Sloan Jooste's Fundraiser Dance
  const mockBookingsSeed = [
    {
      id: 'BK-92810',
      firstName: 'Eleanor',
      surname: 'Vance',
      email: 'eleanor@example.com',
      mobileNumber: '+27 82 555 0192',
      numTickets: 10,
      raffleTicketsCount: 3,
      tableBookingOption: 'Full Private Table (10 Guests)',
      tableNumber: 1,
      guestNames: [
        'Eleanor Vance', 'Thomas Vance', 'Sarah Jenkins', 'Robert Jenkins', 
        'David Ross', 'Emily Ross', 'Michael Green', 'Lisa Green', 
        'Patrick Wood', 'Claire Wood'
      ],
      specialRequests: 'Tribute: "Sloan, your courage lights up our hearts! Excited for the Raffle Draw!"',
      consentTerms: true,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      amount: 1600,
      checkedIn: true,
      checkedInAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'BK-83712',
      firstName: 'Marcus',
      surname: 'Sterling',
      email: 'marcus@example.com',
      mobileNumber: '+27 83 444 8812',
      numTickets: 2,
      raffleTicketsCount: 3,
      tableBookingOption: 'Standard Dance Ticket',
      tableNumber: 3,
      guestNames: ['Marcus Sterling', 'Elena Sterling'],
      specialRequests: 'Tribute: "With deepest love and support for Sloan\'s care journey."',
      consentTerms: true,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      amount: 400,
      checkedIn: false,
      checkedInAt: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'BK-77192',
      firstName: 'Sophia',
      surname: 'Chen',
      email: 'sophia@example.com',
      mobileNumber: '+27 71 333 9988',
      numTickets: 4,
      raffleTicketsCount: 1,
      tableBookingOption: 'Standard Dance Ticket',
      tableNumber: 2,
      guestNames: ['Sophia Chen', 'Wei Chen', 'Lucas Chen', 'Maya Chen'],
      specialRequests: 'Seating near dancefloor requested',
      consentTerms: true,
      paymentStatus: 'paid',
      paymentMethod: 'eft',
      amount: 650,
      checkedIn: true,
      checkedInAt: new Date(Date.now() - 1800000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    // Subscribe to Firestore Bookings
    const unsubscribeBookings = subscribeBookings((data) => {
      if (data && data.length > 0) {
        setBookings(data);
      } else {
        setBookings(mockBookingsSeed);
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

  // Total funds raised & stats calculation in ZAR (R)
  const totalAmountRaised = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) + 42500;
  const targetGoal = 100000;
  const progressPercent = Math.min(100, Math.round((totalAmountRaised / targetGoal) * 100));
  const totalTicketsSold = bookings.reduce((sum, b) => sum + (Number(b.numTickets) || 1), 0) + 140;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const handleOpenBooking = (option = 'Standard Dance Ticket') => {
    setBookingDefaultOption(option);
    setIsBookingOpen(true);
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
  };

  const shareViaWhatsAppGeneral = () => {
    const text = encodeURIComponent(`*🎟️ SLOAN JOOSTE'S FUNDRAISER DANCE 💚*\n\nJoin us on *Friday, 09 October 2026 (19:00 - 00:00)* at Kuils River Technical High School!\n\n• Live Music by The Elginairs & DJ Cool J\n• Grand Charity Raffle Draw (21:00 - 21:30)\n• Dress Code: A Splash of Green 💚\n• BYO Platter & XYZ\n\nBook your tickets & tables: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-emerald-500 selection:text-white">
      
      {/* Top Header */}
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
                  35 Tables
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
              onClick={() => setActiveTab('checkin')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'checkin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
            >
              Door Check-In
            </button>
            <button
              onClick={() => setActiveTab('wall')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'wall' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-900'}`}
            >
              Wall of Support
            </button>
          </nav>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRaffleWheelOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 hover:bg-purple-200 text-xs font-black transition shadow-sm"
              title="Launch Projector Raffle Wheel"
            >
              <Gift className="w-4 h-4 text-emerald-600" />
              <span>Projector Wheel</span>
            </button>

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
        <button onClick={() => setActiveTab('guests')} className={activeTab === 'guests' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Guests</button>
        <button onClick={() => setActiveTab('checkin')} className={activeTab === 'checkin' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Check-In</button>
        <button onClick={() => setActiveTab('wall')} className={activeTab === 'wall' ? 'text-emerald-700 border-b-2 border-emerald-600 pb-0.5' : 'text-slate-500'}>Wall</button>
        <button onClick={() => setIsRaffleWheelOpen(true)} className="text-purple-900 font-black flex items-center gap-1">
          <Gift className="w-3.5 h-3.5 text-emerald-600" /> Wheel
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold">R11,520 Prize Pool</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      7 Official Prizes • Whole Lamb Grand Prize drawn last! R50/1 or R100/3 tickets.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenBooking('Raffle Tickets Only')}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 hover:bg-purple-200 text-xs font-bold transition"
                  >
                    Buy Raffle
                  </button>
                  <button
                    onClick={() => setIsRaffleWheelOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-emerald-700 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Spin Wheel
                  </button>
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
                  onClick={() => setActiveTab('seating')}
                  className="px-5 py-3 rounded-2xl bg-white border border-purple-200 text-slate-800 font-extrabold text-sm hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                >
                  <Table className="w-4 h-4 text-emerald-600" /> View 35 Tables Seating
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
                    style={{ width: `${progressPercent}%` }}
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
                  <span className="font-black text-slate-900 block">35 Tables</span>
                  <span className="text-[10px] text-purple-900 font-semibold">350 Capacity</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <Gift className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                  <span className="font-black text-slate-900 block">21:00</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Raffle Draw</span>
                </div>
              </div>

              {/* Bring Your Own Notice */}
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 font-bold text-center">
                🧺 Bring Your Own Platter & XYZ (Drinks & Snacks Welcome)
              </div>

            </div>

          </div>
        </div>

        {/* SHAREABLE EVENT FLYERS GALLERY */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Image className="w-5 h-5 text-emerald-600" />
                Official Event Flyers & Share Gallery
              </h3>
              <p className="text-xs text-purple-900 font-medium">Click any flyer to view full-size, download, or share with friends and family!</p>
            </div>
            
            <button
              onClick={shareViaWhatsAppGeneral}
              className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-extrabold text-xs flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" /> Share All on WhatsApp
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Flyer 1: Sloan Fundraiser */}
            <div className="rounded-3xl border border-purple-200 bg-white p-3 shadow-sm hover:shadow-md transition space-y-2 group">
              <div 
                onClick={() => setSelectedFlyerModal({ src: '/flyer_sloan.jpg', title: 'Fundraiser for Sloan - Official Event Flyer' })}
                className="rounded-2xl overflow-hidden cursor-pointer relative aspect-[3/4] bg-slate-100"
              >
                <img src="/flyer_sloan.jpg" alt="Fundraiser for Sloan" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-black shadow">Click to View</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">Main Event Flyer</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Fundraiser for Sloan</span>
                </div>
                <a 
                  href="/flyer_sloan.jpg" 
                  download="Sloan_Jooste_Fundraiser_Flyer.jpg"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Download Flyer"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Flyer 2: DJ Cool J */}
            <div className="rounded-3xl border border-purple-200 bg-white p-3 shadow-sm hover:shadow-md transition space-y-2 group">
              <div 
                onClick={() => setSelectedFlyerModal({ src: '/flyer_dj_cool_j.jpg', title: 'Official DJ Announcement - DJ Cool J' })}
                className="rounded-2xl overflow-hidden cursor-pointer relative aspect-[3/4] bg-slate-100"
              >
                <img src="/flyer_dj_cool_j.jpg" alt="DJ Cool J" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-black shadow">Click to View</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">Official DJ Announcement</span>
                  <span className="text-[10px] text-purple-800 font-bold">DJ Cool J</span>
                </div>
                <a 
                  href="/flyer_dj_cool_j.jpg" 
                  download="DJ_Cool_J_Sloan_Fundraiser.jpg"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Download Flyer"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Flyer 3: The Elginairs */}
            <div className="rounded-3xl border border-purple-200 bg-white p-3 shadow-sm hover:shadow-md transition space-y-2 group">
              <div 
                onClick={() => setSelectedFlyerModal({ src: '/flyer_elginairs.jpg', title: 'Live Music Band - The Elginairs' })}
                className="rounded-2xl overflow-hidden cursor-pointer relative aspect-[3/4] bg-slate-100"
              >
                <img src="/flyer_elginairs.jpg" alt="The Elginairs" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-black shadow">Click to View</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">Live Music Performance</span>
                  <span className="text-[10px] text-emerald-700 font-bold">The Elginairs</span>
                </div>
                <a 
                  href="/flyer_elginairs.jpg" 
                  download="The_Elginairs_Sloan_Fundraiser.jpg"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Download Flyer"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
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
                      <span className="text-purple-900 font-black text-lg">25%</span>
                      <p className="font-black text-slate-900 mt-1">Care & Mobility Equipment</p>
                      <p className="text-[11px] text-slate-500 font-medium">Assistive technology support</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-emerald-700 font-black text-lg">15%</span>
                      <p className="font-black text-slate-900 mt-1">Educational Support</p>
                      <p className="text-[11px] text-slate-500 font-medium">Learning accommodations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7 Official Raffle Prizes */}
              <div className="p-6 rounded-3xl bg-white border border-emerald-300 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Grand Raffle Draw (7 Official Prizes)</h3>
                      <p className="text-xs text-purple-900 font-medium">Friday, 09 October 2026 • Live 15s Wheel Spin (Whole Lamb Drawn Last!)</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRaffleWheelOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Open Wheel
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-black text-purple-950">Raffle Draw Time:</span>
                    <p className="text-xs text-slate-600 mt-0.5">Tickets: R50 for 1 or R100 for 3. 1 Ticket = 1 Wheel Slice!</p>
                  </div>
                  <span className="font-mono font-black text-emerald-800 text-base shrink-0 px-3 py-1.5 bg-white rounded-xl border border-emerald-300 shadow-sm">
                    21:00 – 21:30
                  </span>
                </div>

                {/* 7 Prizes List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🥩</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Whole Lamb (Grand Finale Prize)</span>
                        <span className="text-[10px] text-emerald-700 font-black">Drawn Last (#7)!</span>
                      </div>
                    </div>
                    <span className="font-black text-emerald-800 text-xs bg-white px-2 py-0.5 rounded border border-emerald-300">R2,000</span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📸</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Photoshoot for a Couple</span>
                        <span className="text-[10px] text-purple-800 font-medium">Professional Session</span>
                      </div>
                    </div>
                    <span className="font-black text-purple-900 text-xs bg-white px-2 py-0.5 rounded border border-purple-200">R2,500</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🥃</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Chivas Regal 13YO Rye (1L)</span>
                        <span className="text-[10px] text-slate-500 font-medium">Scotch Whisky</span>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">R2,000</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍾</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Chivas Regal 13YO Rum (1L)</span>
                        <span className="text-[10px] text-slate-500 font-medium">Scotch Whisky</span>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">R2,000</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍽️</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Spyced Restaurant Voucher</span>
                        <span className="text-[10px] text-slate-500 font-medium">Dining Experience</span>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">R1,820</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💆</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Hot Stone Massage (Radiance Room)</span>
                        <span className="text-[10px] text-slate-500 font-medium">Full Body Spa #1</span>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">R600</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💆</span>
                      <div>
                        <span className="font-black text-slate-900 block text-xs">Hot Stone Massage (Radiance Room)</span>
                        <span className="text-[10px] text-slate-500 font-medium">Full Body Spa #2</span>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">R600</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Ticket Packages & Venue Info */}
            <div className="space-y-6">
              
              {/* Ticket Packages */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                  Ticket Packages & Tables
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Standard dance tickets, complete private tables of 10, or charity raffle tickets.
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-black text-slate-900 block">Standard Dance Ticket</span>
                      <p className="text-[11px] text-slate-500">Single entry pass</p>
                    </div>
                    <span className="font-black text-emerald-700 text-base">R150</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex justify-between items-center">
                    <div>
                      <span className="font-black text-purple-950 block">Full Private Table (10 Guests)</span>
                      <p className="text-[11px] text-purple-800">Dedicated table for 10 people</p>
                    </div>
                    <span className="font-black text-emerald-700 text-base">R1,500</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex justify-between items-center">
                    <div>
                      <span className="font-black text-emerald-900 block">Raffle Ticket Packs</span>
                      <p className="text-[11px] text-emerald-800">R50 for 1 • R100 for 3</p>
                    </div>
                    <span className="font-black text-emerald-700 text-base">R50 / R100</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenBooking('Standard Dance Ticket')}
                    className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <Ticket className="w-4 h-4" /> Book Tickets
                  </button>
                  <button
                    onClick={() => handleOpenBooking('Raffle Tickets Only')}
                    className="py-3 rounded-2xl bg-purple-900 hover:bg-purple-950 text-white font-black text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Gift className="w-4 h-4 text-emerald-400" /> Buy Raffle
                  </button>
                </div>
              </div>

              {/* Event Location & Contact Details */}
              <div className="p-6 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-black text-slate-900 flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Venue & Event Details
                  </span>
                  <a 
                    href={EVENT_DETAILS.googleMapsUrl}
                    target="_blank" 
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-100 transition"
                  >
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-slate-900 font-black text-sm">{EVENT_DETAILS.venue}</p>
                <p className="text-slate-600 font-medium">{EVENT_DETAILS.address}</p>
                
                <div className="space-y-1 pt-1 text-[11px] text-purple-950 font-semibold border-t border-slate-100">
                  <div>📅 <strong>Date:</strong> {EVENT_DETAILS.date}</div>
                  <div>⏰ <strong>Time:</strong> {EVENT_DETAILS.time}</div>
                  <div>🎟️ <strong>Raffle Draw:</strong> {EVENT_DETAILS.raffleTime}</div>
                  <div>👗 <strong>Dress Code:</strong> {EVENT_DETAILS.dressCode}</div>
                  <div>🧺 <strong>Refreshments:</strong> {EVENT_DETAILS.byo}</div>
                  <div>🎵 <strong>Live Music:</strong> {EVENT_DETAILS.entertainment}</div>
                  <div>🪑 <strong>Capacity:</strong> 35 Tables (350 Guests Total)</div>
                </div>

                {/* Organizer Contacts */}
                <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                  <span className="font-bold text-slate-900 block">Event Organizers / Questions:</span>
                  <div className="flex flex-col gap-1 text-slate-700 font-medium">
                    <a href="tel:0711134812" className="hover:text-emerald-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" /> Nicole Jooste: 071 113 4812
                    </a>
                    <a href="tel:0795285350" className="hover:text-emerald-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" /> Marsha Beukes: 079 528 5350
                    </a>
                  </div>
                </div>

              </div>

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

        {/* TAB 3: GUEST & TICKET MANAGER */}
        {activeTab === 'guests' && (
          <GuestManagementTab 
            bookings={bookings}
            tablesData={tablesData}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
            onAddBooking={handleAddBooking}
            onViewTicketPass={(booking) => setActiveBookingTicket(booking)}
          />
        )}

        {/* TAB 4: DOOR CHECK-IN DESK */}
        {activeTab === 'checkin' && (
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

                  <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-2xl border border-purple-100">
                    "{b.specialRequests || 'Supporting Sloan with strength, love, and prayers!'}"
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1">
                    <span>Verified Supporter</span>
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-purple-200 py-8 bg-white text-slate-600 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-900 font-black">
            <img src="/flyer_sloan.jpg" alt="Sloan Logo" className="w-6 h-6 rounded-full object-cover border border-emerald-500" />
            <span>Sloan Jooste's Fundraiser Dance Platform</span>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-500">
            Kuils River Technical High School • 09 October 2026 • 35 Tables
          </div>
        </div>
      </footer>

      {/* MODAL: FULL FLYER VIEWER */}
      {selectedFlyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-purple-200 flex flex-col">
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-700 to-purple-900 text-white flex items-center justify-between">
              <span className="font-black text-sm">{selectedFlyerModal.title}</span>
              <button 
                onClick={() => setSelectedFlyerModal(null)}
                className="p-1 rounded-full text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center max-h-[75vh] overflow-y-auto">
              <img src={selectedFlyerModal.src} alt={selectedFlyerModal.title} className="max-h-[70vh] rounded-xl object-contain shadow-md" />
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <a 
                href={selectedFlyerModal.src}
                download
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" /> Download Flyer
              </a>
              <button
                onClick={shareViaWhatsAppGeneral}
                className="py-2 px-4 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-black text-xs flex items-center gap-1.5 shadow"
              >
                <MessageCircle className="w-4 h-4" /> Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING WIZARD MODAL */}
      <BookingWizard 
        isOpen={isBookingOpen}
        defaultOption={bookingDefaultOption}
        onClose={() => setIsBookingOpen(false)}
        tablesData={tablesData}
        onBookingSuccess={(newBooking) => {
          setIsBookingOpen(false);
          setActiveBookingTicket(newBooking);
        }}
      />

      {/* DIGITAL TICKET MODAL */}
      {activeBookingTicket && (
        <DigitalTicketModal
          booking={activeBookingTicket}
          onClose={() => setActiveBookingTicket(null)}
        />
      )}

      {/* RAFFLE WHEEL MODAL */}
      <RaffleWheelModal
        isOpen={isRaffleWheelOpen}
        onClose={() => setIsRaffleWheelOpen(false)}
        bookings={bookings}
      />

      {/* GEMINI AI CONCIERGE ASSISTANT */}
      <GeminiConcierge />

    </div>
  );
}
