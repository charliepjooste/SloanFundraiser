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

// Admin emails list
export const ADMIN_EMAILS = [
  'charlie@nostra.co.za',
  'charliepjooste@gmail.com',
  'admin@sloanfundraiser.co.za'
];

export function isUserAdmin(email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail) || cleanEmail.includes('admin') || cleanEmail.includes('nostra');
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
    { name: "Nicole Jooste", phone: "071 113 4812" },
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
 * Generate full text email confirmation body
 */
export function generateTicketEmailBody(booking) {
  const ticketRef = getShortReference(booking);
  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' 
    ? '🎟️ Raffle Supporter Pass' 
    : `Table #${booking.tableNumber || 1} (${booking.tableBookingOption || 'Standard Dance Ticket'})`;

  return `💚 TICKET CONFIRMATION: SLOAN JOOSTE'S FUNDRAISER DANCE 💚

Dear ${booking.firstName} ${booking.surname},

Thank you for your generous support for Sloan Jooste in aid of his post-op physiotherapy, treatment, and Cerebral Palsy care!

==================================================
🎟️ YOUR DIGITAL TICKET PASS & BOOKING DETAILS
==================================================
• Ticket Reference: ${ticketRef}
• Guest Name: ${booking.firstName} ${booking.surname}
• Seating / Table Allocation: ${tableText}
• Dance Tickets Reserved: ${booking.numTickets || 1} Seat(s)
• Raffle Tickets Included: ${booking.raffleTicketsCount || 0} Ticket(s)
• Amount Paid: R${booking.amount || 0} (${booking.paymentMethod || 'Paid'})

==================================================
📍 EVENT DETAILS & VENUE
==================================================
• Date: ${EVENT_DETAILS.date}
• Event Time: ${EVENT_DETAILS.time}
• Highlight Raffle Draw: ${EVENT_DETAILS.raffleTime}
• Venue: ${EVENT_DETAILS.venue}
• Address: ${EVENT_DETAILS.address}
• Google Maps Link: ${EVENT_DETAILS.googleMapsUrl}
• Dress Code: ${EVENT_DETAILS.dressCode}
• Refreshments: ${EVENT_DETAILS.byo}
• Entertainment: ${EVENT_DETAILS.entertainment}

==================================================
🎁 BUY EXTRA RAFFLE TICKETS VIA EFT
==================================================
Want to increase your chances of winning our 7 Grand Raffle Prizes (including a Whole Lamb, Photoshoot, Chivas Regal Whiskies, Spa Massages & Spyced Restaurant Vouchers)?

Raffle Tickets: R50 for 1 Ticket • R100 for 3 Tickets

Official Banking Details:
• Bank: ${EVENT_DETAILS.banking.bank}
• Account Holder: ${EVENT_DETAILS.banking.accountHolder}
• Account Type: ${EVENT_DETAILS.banking.accountType}
• Account Number: ${EVENT_DETAILS.banking.accountNumber}
• Branch Code: ${EVENT_DETAILS.banking.branchCode}
• Payment Reference: ${ticketRef} (Important: use your short reference: ${ticketRef})

==================================================
📞 EVENT CONTACTS
==================================================
• Nicole Jooste: 071 113 4812
• Marsha Beukes: 079 528 5350

Please present your QR digital ticket (attached / on your pass) at the door for entry.
Let's come together for Sloan! 💚`;
}

/**
 * Generate formatted HTML Email Body matching the visual digital pass card
 */
export function generateHtmlTicketEmail(booking) {
  const ticketRef = getShortReference(booking);
  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' 
    ? '🎟️ Raffle Supporter' 
    : `Table #${booking.tableNumber || 1}`;

  // Encoded QR Code URL via standard public high-res QR API
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

  const message = `*🎟️ TICKET PASS: SLOAN JOOSTE'S FUNDRAISER DANCE 💚*

Hello *${booking.firstName} ${booking.surname}*! Here is your official pass details for Sloan Jooste's Fundraiser Dance:

*• Ticket Reference:* ${ticketRef}
*• Seating:* ${tableText} (${booking.numTickets || 1} Seat/s)
*• Raffle Tickets:* ${booking.raffleTicketsCount || 0} Entry/ies
*• Total Paid:* R${booking.amount || 0}

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
    guestNames: bookingData.guestNames || [],
    specialRequests: bookingData.specialRequests || '',
    consentTerms: Boolean(bookingData.consentTerms),
    paymentStatus: bookingData.paymentStatus || 'paid',
    paymentMethod: bookingData.paymentMethod || 'card',
    amount: Number(bookingData.amount) || 0,
    checkedIn: false,
    checkedInAt: null,
    createdAt: now
  };

  // Add document to bookings collection
  const bookingRef = await addDoc(bookingsCol, newBookingPayload);
  const bookingId = bookingRef.id;
  const fullBooking = { id: bookingId, ...newBookingPayload };

  // Log automated confirmation email
  try {
    await addDoc(emailsCol, {
      ticketId: bookingId,
      ticketRef: shortRef,
      recipientEmail: newBookingPayload.email,
      recipientName: `${newBookingPayload.firstName} ${newBookingPayload.surname}`,
      subject: `🎟️ Ticket Confirmation - Sloan Jooste's Fundraiser Dance (${shortRef} • Table #${newBookingPayload.tableNumber})`,
      body: generateTicketEmailBody(fullBooking),
      htmlBody: generateHtmlTicketEmail(fullBooking),
      sentAt: now
    });
  } catch (e) {
    console.warn("Email log warning:", e);
  }

  // Update tables collection seat allocation (only if not standalone raffle ticket)
  if (newBookingPayload.tableBookingOption !== 'Raffle Tickets Only') {
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

  return fullBooking;
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
  return onSnapshot(bookingsCol, (snapshot) => {
    const bookingsList = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(bookingsList);
  }, (error) => {
    console.error("Firestore Bookings subscribe error:", error);
    callback(null);
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
