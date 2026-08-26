import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  setDoc,
  getDoc
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "project-4441f2ba-9982-4b1e-bd2",
  appId: "1:930287721763:web:1e2f24d7029cc9d8e44096",
  apiKey: "AIzaSyAE2W5uaRMYDZRHaM6hOt8j7yA3m4jZXs0",
  authDomain: "project-4441f2ba-9982-4b1e-bd2.firebaseapp.com",
  storageBucket: "project-4441f2ba-9982-4b1e-bd2.firebasestorage.app",
  messagingSenderId: "930287721763",
  firestoreDatabaseId: "ai-studio-985683de-d6ba-48b5-97d0-bcd7133c81bc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Helper collection references
export const bookingsCol = collection(db, 'bookings');
export const tablesCol = collection(db, 'tables');
export const emailsCol = collection(db, 'emails');

// Admin accounts authorized to manage the platform with PINs
export const ADMIN_ACCOUNTS = {
  'charliepjooste@gmail.com': { name: 'Charlton (Charlie) Jooste', pin: 'Coolcat', phone: '079 528 5350' },
  'nicolejooste8@gmail.com': { name: 'Nicole Jooste', pin: 'Coolcat1', phone: '071 113 4812' },
  'charlie@nostra.co.za': { name: 'Charlton (Charlie) Jooste', pin: 'Coolcat', phone: '079 528 5350' }
};

export const ADMIN_EMAILS = Object.keys(ADMIN_ACCOUNTS);

export function isUserAdmin(email) {
  if (!email) return false;
  return Boolean(ADMIN_ACCOUNTS[email.trim().toLowerCase()]);
}

export function verifyAdminPin(email, pin) {
  if (!email || !pin) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pin.trim();
  
  const admin = ADMIN_ACCOUNTS[cleanEmail];
  if (!admin) return false;
  
  // Allow exact match or case-insensitive match
  return admin.pin === cleanPin || admin.pin.toLowerCase() === cleanPin.toLowerCase();
}

// Event Details Constants with Official Bank Details
export const EVENT_DETAILS = {
  name: "Sloan Jooste's Fundraiser Dance",
  cause: "In aid of Sloan's Post-Op Physio & Treatment (Cerebral Palsy Care)",
  venue: "Kuils River Technical High School",
  address: "36 Driebergen Road, Highbury, Kuils River",
  googleMapsUrl: "https://maps.google.com/?q=Kuils+River+Technical+High+School+36+Driebergen+Road+Highbury+Kuils+River",
  date: "Friday, 09 October 2026",
  time: "19:00 until 00:00 (7:00 PM to Midnight)",
  raffleTime: "21:00 – 21:30",
  dressCode: "A Splash of Green (In Aid of Cerebral Palsy 💚)",
  byo: "Bring Your Own Platter & XYZ",
  entertainment: "Live Music by The Elginairs • Official DJ: DJ Cool J",
  totalTables: 35,
  seatsPerTable: 10,
  contacts: [
    { name: "Nicole Jooste", phone: "071 113 4812", email: "nicolejooste8@gmail.com" },
    { name: "Marsha Beukes", phone: "079 528 5350" }
  ],
  banking: {
    bank: "FNB/RMB",
    accountHolder: "Charlton Jooste",
    accountType: "FNB Private Clients Current Account",
    accountNumber: "62334900091",
    branchCode: "250655",
    referenceInstruction: "Use your Ticket Reference (e.g. REF: SJ-XXXX) to purchase additional raffle tickets via EFT!"
  }
};

/**
 * Helper to get a clean, memorable short reference code (e.g. SJ-4821)
 */
export function getShortReference(booking) {
  if (!booking) return 'SJ-1001';
  if (booking.ticketRef && booking.ticketRef.startsWith('SJ-') && booking.ticketRef.length <= 8) {
    return booking.ticketRef;
  }
  if (booking.id && typeof booking.id === 'string') {
    if (booking.id.startsWith('BK-')) {
      return `SJ-${booking.id.replace('BK-', '')}`;
    }
    if (booking.id.startsWith('SJ-')) {
      return booking.id;
    }
    const cleanChars = booking.id.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanChars.length >= 4) {
      return `SJ-${cleanChars.slice(-4).toUpperCase()}`;
    }
  }
  return `SJ-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Generate email notification for Admins when an EFT booking is submitted
 */
export function generateAdminEftNotificationEmail(booking) {
  const ticketRef = getShortReference(booking);
  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' 
    ? '🎟️ Raffle Supporter Only' 
    : `Table #${booking.tableNumber || 1} (${booking.tableBookingOption || 'Standard Dance Ticket'})`;

  return `📢 NEW EFT BOOKING PENDING APPROVAL - SLOAN JOOSTE FUNDRAISER 📢

Hello Charlie & Nicole,

A new guest has submitted a booking requesting to pay via Direct EFT:

==================================================
📋 BOOKING & GUEST DETAILS
==================================================
• Guest Name: ${booking.firstName} ${booking.surname}
• Ticket Reference: ${ticketRef}
• Mobile Number: ${booking.mobileNumber}
• Email: ${booking.email}
• Table Allocation: ${tableText}
• Dance Tickets: ${booking.numTickets || 1} Seat(s)
• Raffle Tickets: ${booking.raffleTicketsCount || 0} Ticket(s)
• Total Amount Due: R${booking.amount || 0}
• Payment Status: ⏳ PENDING EFT CLEARANCE

==================================================
⚡ ACTION REQUIRED
==================================================
Once you verify that R${booking.amount} has cleared into the FNB Account (Ref: ${ticketRef}), please log into the Admin Console at your fundraiser website and click "✓ Clear Funds & Issue Pass" under the Guest Manager tab.

The system will then instantly allocate their table seats and issue their official digital QR ticket pass!`;
}

/**
 * Generate full text email confirmation body for Guest with complete event details
 */
export function generateTicketEmailBody(booking) {
  const ticketRef = getShortReference(booking);
  const seatsText = booking.allocatedSeats && booking.allocatedSeats.length > 0
    ? `Seat(s) #${booking.allocatedSeats.join(', ')}`
    : `${booking.numTickets || 1} Seat(s)`;

  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' 
    ? '🎟️ Raffle Supporter Pass (No Table Seat)' 
    : `Table #${booking.tableNumber || 1} • ${seatsText} (${booking.tableBookingOption || 'Standard Dance Ticket'})`;

  const isEftPending = booking.paymentStatus === 'pending_eft';

  return `💚 THANK YOU FOR YOUR TICKET PURCHASE: SLOAN JOOSTE'S FUNDRAISER DANCE 💚

Dear ${booking.firstName || ''} ${booking.surname || ''},

Thank you for your ticket purchase and generous support in aid of Sloan Jooste's post-op physiotherapy, rehabilitation, and Cerebral Palsy care!

==================================================
🎟️ YOUR RESERVATION DETAILS
==================================================
• Ticket Reference: ${ticketRef}
• Guest Name: ${booking.firstName || ''} ${booking.surname || ''}
• Table Allocation: Table #${booking.tableNumber || 1}
• Seat Allocation: ${seatsText}
• Dance Tickets Reserved: ${booking.numTickets || 1} Seat(s)
• Raffle Tickets: ${booking.raffleTicketsCount || 0} Entry/ies
• Total Amount: R${booking.amount || 0}
• Payment Method: ${booking.paymentMethod === 'eft' ? 'Direct EFT Bank Transfer' : 'Instant Transfer'}
• Status: ${isEftPending ? '⏳ Awaiting EFT Payment & Clearance' : '✅ Confirmed & Paid'}

==================================================
📢 TICKET DELIVERY & EFT CLEARANCE NOTICE
==================================================
*Once your ticket purchase EFT has been cleared by organizers Charlie or Nicole, your official digital ticket passes with individual QR check-in codes will be sent via WhatsApp and Email!*

==================================================
🏦 BANKING DETAILS FOR DIRECT EFT PAYMENT
==================================================
Please make an EFT transfer to:
• Bank: ${EVENT_DETAILS.banking.bank}
• Account Holder: ${EVENT_DETAILS.banking.accountHolder}
• Account Type: ${EVENT_DETAILS.banking.accountType}
• Account Number: ${EVENT_DETAILS.banking.accountNumber}
• Branch Code: ${EVENT_DETAILS.banking.branchCode}
• Payment Reference: ${ticketRef} (Important: Please use reference ${ticketRef})

==================================================
📍 EVENT DETAILS & VENUE
==================================================
• Event: ${EVENT_DETAILS.name}
• Date: ${EVENT_DETAILS.date}
• Event Time: ${EVENT_DETAILS.time}
• Highlight Raffle Draw: ${EVENT_DETAILS.raffleTime} (Grand Finale Prize: Whole Lamb!)
• Venue: ${EVENT_DETAILS.venue}
• Address: ${EVENT_DETAILS.address}
• Google Maps Link: ${EVENT_DETAILS.googleMapsUrl}
• Dress Code: ${EVENT_DETAILS.dressCode}
• Refreshments: ${EVENT_DETAILS.byo}
• Entertainment: ${EVENT_DETAILS.entertainment}

==================================================
📞 ORGANIZING COMMITTEE CONTACTS
==================================================
• Nicole Jooste: 071 113 4812 (nicolejooste8@gmail.com)
• Marsha Beukes: 079 528 5350

Thank you for your love, generosity, and support for Sloan! 💚`;
}

/**
 * Open direct Gmail Web Compose window with complete ticket confirmation email
 */
export function openGmailCompose(booking) {
  if (!booking) return;
  const ticketRef = getShortReference(booking);
  const subject = encodeURIComponent(`🎟️ Thank You for Your Ticket Purchase: Sloan Jooste's Fundraiser Dance (${ticketRef})`);
  const body = encodeURIComponent(generateTicketEmailBody(booking));
  const recipient = (booking.email || '').trim();
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${subject}&body=${body}`;
  window.open(gmailUrl, '_blank');
}

/**
 * Generate formatted HTML Email Body matching the visual digital pass card
 */
export function generateHtmlTicketEmail(booking) {
  const ticketRef = getShortReference(booking);
  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' 
    ? '🎟️ Raffle Supporter' 
    : `Table #${booking.tableNumber || 1}`;

  const qrData = encodeURIComponent(JSON.stringify({
    ref: ticketRef,
    id: booking.id,
    name: `${booking.firstName} ${booking.surname}`,
    table: booking.tableNumber,
    tickets: booking.numTickets
  }));
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Digital Ticket - Sloan Jooste's Fundraiser Dance</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #15803d 0%, #7e22ce 100%); padding: 20px 24px; color: #ffffff;">
      <div style="font-size: 16px; font-weight: 900; margin: 0; letter-spacing: 0.5px;">Sloan Jooste's Fundraiser Dance</div>
      <div style="font-size: 11px; color: #a7f3d0; font-weight: 700; margin-top: 2px;">Official Entry & Raffle Pass</div>
    </div>

    <!-- Ticket Card Body -->
    <div style="padding: 24px; text-align: center;">
      
      <!-- Badge -->
      <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 1px solid #86efac;">
        ✓ Official Digital Ticket Pass
      </div>

      <!-- Guest Name & Short Ref -->
      <h2 style="margin: 12px 0 4px 0; font-size: 22px; font-weight: 900; color: #0f172a;">${booking.firstName} ${booking.surname}</h2>
      <div style="font-size: 12px; font-weight: 700; color: #581c87;">
        Ticket Reference: <span style="background-color: #f3e8ff; color: #3b0764; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 14px;">${ticketRef}</span>
      </div>

      <!-- QR Code Box -->
      <div style="margin: 20px auto; padding: 16px; background-color: #f8fafc; border-radius: 18px; border: 1px solid #e2e8f0; max-width: 200px;">
        <img src="${qrImageUrl}" alt="Ticket QR Code" style="width: 170px; height: 170px; display: block; margin: 0 auto; border-radius: 12px;" />
        <div style="font-size: 9px; font-weight: 900; color: #475569; letter-spacing: 1px; margin-top: 10px; text-transform: uppercase;">
          Present QR Code at Door
        </div>
      </div>

      <!-- Details Grid -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; text-align: left; margin-bottom: 16px;">
        <tr>
          <td style="width: 50%; background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 14px; padding: 10px 12px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #6b21a8;">Table Allocation</div>
            <div style="font-size: 14px; font-weight: 900; color: #3b0764; margin-top: 2px;">${tableText}</div>
          </td>
          <td style="width: 50%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 10px 12px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #166534;">Tickets & Slices</div>
            <div style="font-size: 14px; font-weight: 900; color: #14532d; margin-top: 2px;">${booking.numTickets || 1} Dance ${booking.raffleTicketsCount > 0 ? `• ${booking.raffleTicketsCount} Raffle` : ''}</div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b;">Amount Paid</div>
            <div style="font-size: 14px; font-weight: 900; color: #15803d; margin-top: 2px;">R${booking.amount || 0}</div>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b;">Dress Code</div>
            <div style="font-size: 12px; font-weight: 800; color: #166534; margin-top: 2px;">A Splash of Green 💚</div>
          </td>
        </tr>
      </table>

      <!-- Venue & Location Box -->
      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 16px; padding: 14px; text-align: left; margin-bottom: 16px; font-size: 12px;">
        <div style="font-weight: 900; color: #166534; margin-bottom: 4px;">
          <span>📍 Venue & Event Location</span>
        </div>
        <div style="font-weight: 800; color: #0f172a;">${EVENT_DETAILS.venue}</div>
        <div style="color: #475569; font-size: 11px; margin-top: 2px;">${EVENT_DETAILS.address}</div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #bbf7d0; font-size: 11px; color: #3b0764; font-weight: 700; line-height: 1.5;">
          📅 Friday, 09 October 2026 (19:00 - 00:00)<br>
          🎟️ Grand Raffle Draw: 21:00 - 21:30<br>
          🧺 Bring Your Own Platter & XYZ<br>
          🎵 Live Music by The Elginairs • Official DJ: DJ Cool J
        </div>
        <div style="margin-top: 8px;">
          <a href="${EVENT_DETAILS.googleMapsUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: 10px; font-weight: 800; text-decoration: none;">
            Open in Google Maps →
          </a>
        </div>
      </div>

      <!-- Banking Details Box for Extra Raffle Entries -->
      <div style="background-color: #faf5ff; border: 1px solid #d8b4fe; border-radius: 16px; padding: 14px; text-align: left; font-size: 11px; color: #3b0764;">
        <div style="font-weight: 900; font-size: 12px; margin-bottom: 4px; color: #581c87;">
          💳 Buy Extra Raffle Tickets via EFT (R50/1 • R100/3)
        </div>
        <div style="color: #475569; margin-bottom: 6px;">Make an EFT using your short reference to enter our 7 Grand Prizes:</div>
        <div style="background-color: #ffffff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 8px; font-family: monospace; font-size: 11px;">
          <strong>Bank:</strong> ${EVENT_DETAILS.banking.bank}<br>
          <strong>Account Holder:</strong> ${EVENT_DETAILS.banking.accountHolder}<br>
          <strong>Account Type:</strong> ${EVENT_DETAILS.banking.accountType}<br>
          <strong>Account No:</strong> ${EVENT_DETAILS.banking.accountNumber}<br>
          <strong>Branch Code:</strong> ${EVENT_DETAILS.banking.branchCode}<br>
          <strong style="color: #15803d;">Payment Reference: ${ticketRef}</strong>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
      Nicole Jooste: 071 113 4812 • Marsha Beukes: 079 528 5350<br>
      <strong>Thank you for supporting Sloan! 💚</strong>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generate formatted WhatsApp message text
 */
export function generateWhatsAppMessage(booking) {
  const ticketRef = getShortReference(booking);
  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' 
    ? '🎟️ Raffle Supporter' 
    : `Table #${booking.tableNumber || 1}`;

  const isEftPending = booking.paymentStatus === 'pending_eft';

  const message = isEftPending
    ? `*🎟️ EFT BOOKING RECEIVED: SLOAN JOOSTE'S FUNDRAISER DANCE 💚*

Hello *${booking.firstName} ${booking.surname}*! We received your booking request:

*• Booking Ref:* ${ticketRef}
*• Seating:* ${tableText} (${booking.numTickets || 1} Seat/s)
*• Raffle Tickets:* ${booking.raffleTicketsCount || 0} Entry/ies
*• Total Due:* R${booking.amount || 0}
*• Status:* ⏳ Awaiting Bank Funds Clearance by Organizers

*🏦 Please EFT R${booking.amount} to:*
Bank: FNB/RMB | Acc Holder: Charlton Jooste | Acc: 62334900091 | Branch: 250655
*Ref:* ${ticketRef}

*Note:* Once cleared by Charlie or Nicole, your official ticket pass with QR code will be activated! 💚`
    : `*🎟️ TICKET PASS: SLOAN JOOSTE'S FUNDRAISER DANCE 💚*

Hello *${booking.firstName} ${booking.surname}*! Here is your official pass details for Sloan Jooste's Fundraiser Dance:

*• Ticket Reference:* ${ticketRef}
*• Seating:* ${tableText} (${booking.numTickets || 1} Seat/s)
*• Raffle Tickets:* ${booking.raffleTicketsCount || 0} Entry/ies
*• Total Paid:* R${booking.amount || 0}
*• Status:* ✅ Confirmed & Paid

*📅 Date:* Friday, 09 October 2026 (19:00 - 00:00)
*🎟️ Raffle Draw:* 21:00 - 21:30
*📍 Venue:* Kuils River Technical High School, 36 Driebergen Rd, Highbury
*🗺️ Maps:* ${EVENT_DETAILS.googleMapsUrl}
*👗 Dress Code:* A Splash of Green 💚
*🧺 BYO:* Bring Your Own Platter & XYZ
*🎵 Music:* Live Music by The Elginairs & DJ Cool J

*🎁 BUY EXTRA RAFFLE TICKETS (R50 for 1 / R100 for 3):*
Bank: FNB/RMB | Acc Holder: Charlton Jooste | Acc: 62334900091 | Branch: 250655
*Ref:* ${ticketRef}

See you on the dancefloor! 💚`;

  return encodeURIComponent(message);
}

/**
 * Creates a new booking in Firestore and updates table reservation count
 */
export async function createBookingInFirestore(bookingData) {
  const now = new Date().toISOString();
  const shortRef = `SJ-${Math.floor(1000 + Math.random() * 9000)}`;
  const isEft = bookingData.paymentMethod === 'eft';
  const paymentStatus = isEft ? 'pending_eft' : 'paid';
  
  const newBookingPayload = {
    ticketRef: shortRef,
    firstName: bookingData.firstName || '',
    surname: bookingData.surname || '',
    mobileNumber: bookingData.mobileNumber || '',
    email: (bookingData.email || '').trim().toLowerCase(),
    numTickets: Number(bookingData.numTickets) || 1,
    raffleTicketsCount: Number(bookingData.raffleTicketsCount) || 0,
    raffleEntrants: bookingData.raffleEntrants || [],
    tableBookingOption: bookingData.tableBookingOption || 'Standard Dance Ticket',
    tableNumber: Number(bookingData.tableNumber) || 1,
    allocatedSeats: bookingData.allocatedSeats || [],
    guestNames: bookingData.guestNames || [],
    specialRequests: bookingData.specialRequests || '',
    donationAmount: Number(bookingData.donationAmount) || 0,
    consentTerms: Boolean(bookingData.consentTerms),
    paymentStatus: paymentStatus,
    paymentMethod: bookingData.paymentMethod || 'card',
    amount: Number(bookingData.amount) || 0,
    checkedIn: false,
    checkedInAt: null,
    createdAt: now
  };

  let bookingId = `local_${Date.now()}`;
  let fullBooking = { id: bookingId, ...newBookingPayload };

  // Try adding document to Firestore bookings collection
  try {
    const bookingRef = await addDoc(bookingsCol, newBookingPayload);
    bookingId = bookingRef.id;
    fullBooking.id = bookingId;
  } catch (err) {
    console.warn("Firestore addDoc warning (using local fallback ID):", err);
  }

  // If EFT, log Admin Notification email for Charlie & Nicole
  if (isEft) {
    try {
      await addDoc(emailsCol, {
        ticketId: bookingId,
        ticketRef: shortRef,
        recipientEmail: 'charliepjooste@gmail.com, nicolejooste8@gmail.com',
        recipientName: 'Charlie & Nicole (Admins)',
        subject: `📢 [NEW EFT BOOKING] ${newBookingPayload.firstName} ${newBookingPayload.surname} (${shortRef} • R${newBookingPayload.amount})`,
        body: generateAdminEftNotificationEmail(fullBooking),
        sentAt: now
      });
    } catch (e) {
      console.warn("Admin EFT notification log warning:", e);
    }
  }

  // Log confirmation email for guest
  try {
    await addDoc(emailsCol, {
      ticketId: bookingId,
      ticketRef: shortRef,
      recipientEmail: newBookingPayload.email,
      recipientName: `${newBookingPayload.firstName} ${newBookingPayload.surname}`,
      subject: `🎟️ ${isEft ? 'EFT Booking Received' : 'Ticket Confirmation'} - Sloan Jooste's Fundraiser Dance (${shortRef})`,
      body: generateTicketEmailBody(fullBooking),
      htmlBody: generateHtmlTicketEmail(fullBooking),
      sentAt: now
    });
  } catch (e) {
    console.warn("Guest confirmation email log warning:", e);
  }

  // Update tables collection seat allocation (only if card payment paid immediately)
  if (!isEft && newBookingPayload.tableBookingOption !== 'Raffle Tickets Only') {
    try {
      const tableDocRef = doc(db, 'tables', `table_${newBookingPayload.tableNumber}`);
      const tableSnap = await getDoc(tableDocRef);
      
      if (tableSnap.exists()) {
        const currentData = tableSnap.data();
        const currentBookings = currentData.bookings || [];
        await updateDoc(tableDocRef, {
          seatsReserved: (currentData.seatsReserved || 0) + newBookingPayload.numTickets,
          bookings: [...currentBookings, bookingId]
        });
      } else {
        await setDoc(tableDocRef, {
          capacity: 10,
          seatsReserved: newBookingPayload.numTickets,
          bookings: [bookingId]
        });
      }
    } catch (err) {
      console.warn("Table sync fallback warning:", err);
    }
  }

  // Immediately update local persistent cache so tickets pull through instantly
  try {
    const cached = localStorage.getItem('sloan_cached_bookings');
    let list = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(list)) list = [];
    list = [fullBooking, ...list.filter(b => b.id !== fullBooking.id)];
    localStorage.setItem('sloan_cached_bookings', JSON.stringify(list));
    localStorage.setItem('sloan_guest_email', fullBooking.email);
  } catch (e) {}

  return fullBooking;
}

/**
 * Admin Action: Approve / Clear EFT Payment and Allocate Seats
 */
export async function approveEftPayment(booking) {
  try {
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, {
      paymentStatus: 'paid'
    });

    // Update table seat reservation count
    if (booking.tableBookingOption !== 'Raffle Tickets Only') {
      const tableDocRef = doc(db, 'tables', `table_${booking.tableNumber}`);
      const tableSnap = await getDoc(tableDocRef);
      
      if (tableSnap.exists()) {
        const currentData = tableSnap.data();
        const currentBookings = currentData.bookings || [];
        await updateDoc(tableDocRef, {
          seatsReserved: (currentData.seatsReserved || 0) + (Number(booking.numTickets) || 1),
          bookings: Array.from(new Set([...currentBookings, booking.id]))
        });
      }
    }

    // Update local cache
    try {
      const cached = localStorage.getItem('sloan_cached_bookings');
      if (cached) {
        const list = JSON.parse(cached);
        const updated = list.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid' } : b);
        localStorage.setItem('sloan_cached_bookings', JSON.stringify(updated));
      }
    } catch (e) {}

    // Resend confirmation pass
    await resendTicketEmail({ ...booking, paymentStatus: 'paid' });
    return true;
  } catch (e) {
    console.error("Error approving EFT booking:", e);
    return false;
  }
}

/**
 * Resend ticket email
 */
export async function resendTicketEmail(booking) {
  const now = new Date().toISOString();
  const shortRef = getShortReference(booking);
  try {
    await addDoc(emailsCol, {
      ticketId: booking.id,
      ticketRef: shortRef,
      recipientEmail: booking.email,
      recipientName: `${booking.firstName} ${booking.surname}`,
      subject: `🎟️ [RESENT] Ticket Confirmation - Sloan Jooste's Fundraiser Dance (${shortRef} • Table #${booking.tableNumber})`,
      body: generateTicketEmailBody(booking),
      htmlBody: generateHtmlTicketEmail(booking),
      sentAt: now
    });
    return true;
  } catch (err) {
    console.error("Failed to log resent email:", err);
    return false;
  }
}

/**
 * Move a booking or individual guest to a different table
 */
export async function moveBookingToTable(bookingId, newTableNumber, oldTableNumber, numTickets = 1) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      tableNumber: Number(newTableNumber)
    });

    // Adjust seat numbers in old table
    if (oldTableNumber && oldTableNumber !== newTableNumber) {
      const oldTableRef = doc(db, 'tables', `table_${oldTableNumber}`);
      const oldSnap = await getDoc(oldTableRef);
      if (oldSnap.exists()) {
        const oldData = oldSnap.data();
        const updatedBookings = (oldData.bookings || []).filter(id => id !== bookingId);
        await updateDoc(oldTableRef, {
          seatsReserved: Math.max(0, (oldData.seatsReserved || 0) - numTickets),
          bookings: updatedBookings
        });
      }
    }

    // Add to new table
    const newTableRef = doc(db, 'tables', `table_${newTableNumber}`);
    const newSnap = await getDoc(newTableRef);
    if (newSnap.exists()) {
      const newData = newSnap.data();
      const updatedBookings = Array.from(new Set([...(newData.bookings || []), bookingId]));
      await updateDoc(newTableRef, {
        seatsReserved: (newData.seatsReserved || 0) + numTickets,
        bookings: updatedBookings
      });
    } else {
      await setDoc(newTableRef, {
        capacity: 10,
        seatsReserved: numTickets,
        bookings: [bookingId]
      });
    }
  } catch (err) {
    console.error("Error moving booking to table:", err);
  }
}

/**
 * Update comprehensive guest record
 */
export async function updateGuestRecord(bookingId, updatedFields) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, updatedFields);

    // Update local cache
    try {
      const cached = localStorage.getItem('sloan_cached_bookings');
      if (cached) {
        const list = JSON.parse(cached);
        const updated = list.map(b => b.id === bookingId ? { ...b, ...updatedFields } : b);
        localStorage.setItem('sloan_cached_bookings', JSON.stringify(updated));
      }
    } catch (e) {}
  } catch (err) {
    console.error("Error updating guest record:", err);
  }
}

/**
 * Delete a booking record
 */
export async function deleteGuestRecord(bookingId) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingRef);

    // Update local cache
    try {
      const cached = localStorage.getItem('sloan_cached_bookings');
      if (cached) {
        const list = JSON.parse(cached);
        const updated = list.filter(b => b.id !== bookingId);
        localStorage.setItem('sloan_cached_bookings', JSON.stringify(updated));
      }
    } catch (e) {}
  } catch (err) {
    console.error("Error deleting guest record:", err);
  }
}

/**
 * Update guest names for a table booking
 */
export async function updateBookingGuestNames(bookingId, guestNamesList) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      guestNames: guestNamesList
    });
  } catch (err) {
    console.error("Error updating guest names:", err);
  }
}

/**
 * Real-time subscription to Bookings
 */
export function subscribeBookings(callback) {
  // Initial immediate emit from local cache if present
  try {
    const cached = localStorage.getItem('sloan_cached_bookings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    }
  } catch (e) {}

  return onSnapshot(bookingsCol, (snapshot) => {
    const firestoreBookings = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    // Merge with any local offline bookings
    let finalBookings = [...firestoreBookings];
    try {
      const cached = localStorage.getItem('sloan_cached_bookings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const firestoreIds = new Set(firestoreBookings.map(b => b.id));
          const localOnly = parsed.filter(b => !firestoreIds.has(b.id) && b.id.startsWith('local_'));
          finalBookings = [...localOnly, ...firestoreBookings];
        }
      }
    } catch (e) {}

    try {
      localStorage.setItem('sloan_cached_bookings', JSON.stringify(finalBookings));
    } catch (e) {}

    callback(finalBookings);
  }, (error) => {
    console.warn("Firestore Bookings subscribe error (falling back to cache):", error);
    try {
      const cached = localStorage.getItem('sloan_cached_bookings');
      if (cached) {
        const parsed = JSON.parse(cached);
        callback(parsed);
        return;
      }
    } catch (e) {}
    callback([]);
  });
}

/**
 * Real-time subscription to Tables
 */
export function subscribeTables(callback) {
  return onSnapshot(tablesCol, (snapshot) => {
    const tablesList = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(tablesList);
  }, (error) => {
    console.error("Firestore Tables subscribe error:", error);
    callback(null);
  });
}

/**
 * Toggle Check-in status
 */
export async function toggleGuestCheckIn(bookingId, currentCheckedInState) {
  const bookingRef = doc(db, 'bookings', bookingId);
  const nextState = !currentCheckedInState;
  await updateDoc(bookingRef, {
    checkedIn: nextState,
    checkedInAt: nextState ? new Date().toISOString() : null
  });
}
