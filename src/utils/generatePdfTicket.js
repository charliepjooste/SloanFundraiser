import { jsPDF } from 'jspdf';
import { EVENT_DETAILS, getShortReference } from '../firebase';

/**
 * Renders a single ticket pass onto the PDF document
 */
async function drawSingleTicketPage(pdf, booking, itemData) {
  const baseRef = getShortReference(booking);
  const passRef = itemData.passRef || baseRef;
  const isRafflePass = itemData.type === 'raffle';
  const attendeeName = itemData.attendeeName || `${booking.firstName} ${booking.surname}`;

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const cardWidth = 150;
  const cardX = (pageWidth - cardWidth) / 2; // 30mm
  let currentY = 18;

  // 1. Outer Card Background & Border
  pdf.setDrawColor(226, 232, 240); // #e2e8f0
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(cardX, currentY, cardWidth, 235, 6, 6, 'FD');

  // 2. Header Banner
  if (isRafflePass) {
    pdf.setFillColor(126, 34, 206); // #7e22ce (Purple)
  } else {
    pdf.setFillColor(21, 128, 61); // #15803d (Emerald Green)
  }
  pdf.roundedRect(cardX, currentY, cardWidth, 24, 6, 6, 'F');
  pdf.rect(cardX, currentY + 18, cardWidth, 6, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text("Sloan Jooste's Fundraiser Dance", cardX + cardWidth / 2, currentY + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(isRafflePass ? 243 : 167, isRafflePass ? 232 : 243, isRafflePass ? 255 : 208);
  pdf.text(isRafflePass ? "Official Charity Raffle Entry Pass (7 Prizes)" : `Official Admission Pass • ${itemData.label || 'Standard Seat'}`, cardX + cardWidth / 2, currentY + 17, { align: 'center' });

  currentY += 32;

  // 3. Guest / Attendee Name & Reference Badge
  pdf.setTextColor(15, 23, 42); // #0f172a
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(attendeeName, cardX + cardWidth / 2, currentY, { align: 'center' });

  currentY += 6;
  pdf.setFontSize(9.5);
  pdf.setTextColor(107, 33, 168); // purple
  pdf.text(`Pass Reference: `, cardX + cardWidth / 2 - 14, currentY, { align: 'right' });
  
  // Reference pill
  pdf.setFillColor(243, 232, 255);
  pdf.setDrawColor(216, 180, 254);
  pdf.roundedRect(cardX + cardWidth / 2 - 12, currentY - 4, 30, 6, 2, 2, 'FD');
  pdf.setTextColor(59, 7, 100);
  pdf.setFont('courier', 'bold');
  pdf.text(passRef, cardX + cardWidth / 2 + 3, currentY, { align: 'center' });

  currentY += 8;

  // 4. Generate QR Code
  try {
    const qrData = JSON.stringify({
      ref: passRef,
      bookingRef: baseRef,
      name: attendeeName,
      type: itemData.type,
      table: booking.tableNumber,
      item: itemData.label
    });

    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    
    const qrLoaded = new Promise((resolve) => {
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = qrImgUrl;
    });

    const qrBase64 = await Promise.race([
      qrLoaded,
      new Promise(r => setTimeout(() => r(null), 2500))
    ]);

    const qrBoxSize = 48;
    const qrBoxX = cardX + (cardWidth - qrBoxSize) / 2;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(qrBoxX, currentY, qrBoxSize, qrBoxSize + 7, 4, 4, 'FD');

    if (qrBase64) {
      pdf.addImage(qrBase64, 'PNG', qrBoxX + 4, currentY + 3, qrBoxSize - 8, qrBoxSize - 8);
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(passRef, qrBoxX + qrBoxSize / 2, currentY + qrBoxSize / 2, { align: 'center' });
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("PRESENT AT DOOR FOR CHECK-IN", qrBoxX + qrBoxSize / 2, currentY + qrBoxSize + 4, { align: 'center' });

    currentY += qrBoxSize + 13;
  } catch (e) {
    currentY += 40;
  }

  // 5. Details Grid (2 columns x 2 rows)
  const gridWidth = cardWidth - 16;
  const colWidth = (gridWidth - 4) / 2;
  const col1X = cardX + 8;
  const col2X = col1X + colWidth + 4;
  const rowHeight = 13;

  // Box 1: Table Allocation
  pdf.setFillColor(250, 245, 255);
  pdf.setDrawColor(233, 213, 255);
  pdf.roundedRect(col1X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 33, 168);
  pdf.text("TABLE ALLOCATION", col1X + 4, currentY + 4.5);
  pdf.setFontSize(9);
  pdf.setTextColor(59, 7, 100);
  const tableText = isRafflePass ? 'Raffle Supporter' : `Table #${booking.tableNumber || 1}`;
  pdf.text(tableText, col1X + 4, currentY + 9.5);

  // Box 2: Ticket Type
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(187, 247, 208);
  pdf.roundedRect(col2X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text("PASS TYPE", col2X + 4, currentY + 4.5);
  pdf.setFontSize(8.5);
  pdf.setTextColor(20, 83, 45);
  pdf.text(itemData.label || '1 Dance Ticket Seat', col2X + 4, currentY + 9.5);

  currentY += rowHeight + 3;

  // Box 3: Dress Code
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(col1X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("DRESS CODE", col1X + 4, currentY + 4.5);
  pdf.setFontSize(8.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text("A Splash of Green", col1X + 4, currentY + 9.5);

  // Box 4: Bring Your Own
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(col2X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("REFRESHMENTS", col2X + 4, currentY + 4.5);
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Bring Own Platter & XYZ", col2X + 4, currentY + 9.5);

  currentY += rowHeight + 5;

  // 6. Venue & Event Schedule Box
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(134, 239, 172);
  pdf.roundedRect(cardX + 8, currentY, gridWidth, 24, 4, 4, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text("EVENT VENUE & SCHEDULE", cardX + 12, currentY + 5);

  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(EVENT_DETAILS.venue, cardX + 12, currentY + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);
  pdf.text(EVENT_DETAILS.address, cardX + 12, currentY + 14);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(59, 7, 100);
  pdf.text("Date: Friday, 09 October 2026 (19:00 - 00:00) • Grand Raffle Draw: 21:00 - 21:30", cardX + 12, currentY + 19.5);

  currentY += 28;

  // 7. EFT Banking Details for Extra Raffle Entries
  pdf.setFillColor(250, 245, 255);
  pdf.setDrawColor(216, 180, 254);
  pdf.roundedRect(cardX + 8, currentY, gridWidth, 24, 4, 4, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(88, 28, 135);
  pdf.text("BUY EXTRA RAFFLE TICKETS VIA EFT (R50 / 1 • R100 / 3)", cardX + 12, currentY + 5);

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(59, 7, 100);
  pdf.text(`Bank: ${EVENT_DETAILS.banking.bank} | Acc: ${EVENT_DETAILS.banking.accountNumber} | Branch: ${EVENT_DETAILS.banking.branchCode}`, cardX + 12, currentY + 10);
  pdf.text(`Acc Holder: ${EVENT_DETAILS.banking.accountHolder} | Type: ${EVENT_DETAILS.banking.accountType}`, cardX + 12, currentY + 14.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(21, 128, 61);
  pdf.text(`Payment Reference: ${baseRef}`, cardX + 12, currentY + 19);

  // 8. Footer Organizers
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Organizers: Nicole Jooste (071 113 4812) • Charlie Jooste (079 528 5350)", cardX + cardWidth / 2, cardX + 230, { align: 'center' });
}

/**
 * Generate and download individual or complete PDF ticket passes for each purchased item
 */
export async function downloadTicketPdf(booking, specificItem = null) {
  if (!booking) return;

  const baseRef = getShortReference(booking);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Build the list of items to generate
  let items = [];
  if (specificItem) {
    items = [specificItem];
  } else {
    // 1. Dance Seat Passes
    const isRaffleOnly = booking.tableBookingOption === 'Raffle Tickets Only';
    if (!isRaffleOnly) {
      const seatsCount = booking.tableBookingOption === 'Full Private Table (10 Guests)' ? 10 : (Number(booking.numTickets) || 1);
      const allocatedSeats = (booking.allocatedSeats && Array.isArray(booking.allocatedSeats) && booking.allocatedSeats.length > 0)
        ? booking.allocatedSeats
        : Array.from({ length: seatsCount }, (_, i) => i + 1);

      for (let s = 1; s <= seatsCount; s++) {
        const seatNumber = allocatedSeats[s - 1] || s;
        const attendeeName = (booking.guestNames && booking.guestNames[s - 1] && booking.guestNames[s - 1].trim())
          ? booking.guestNames[s - 1].trim()
          : (s === 1 ? `${booking.firstName} ${booking.surname}` : `${booking.firstName} ${booking.surname} (Seat #${seatNumber})`);
        
        items.push({
          type: 'seat',
          passRef: `${baseRef}-S${seatNumber}`,
          label: `Table #${booking.tableNumber || 1} • Seat #${seatNumber}`,
          seatNumber,
          attendeeName
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
      
      items.push({
        type: 'raffle',
        passRef: `${baseRef}-R${r}`,
        label: `Raffle Ticket #${r} of ${raffleCount}`,
        attendeeName: entrantName
      });
    }

    if (items.length === 0) {
      items.push({
        type: 'seat',
        passRef: baseRef,
        label: 'Official Supporter Pass',
        attendeeName: `${booking.firstName} ${booking.surname}`
      });
    }
  }

  // Draw each page
  for (let i = 0; i < items.length; i++) {
    if (i > 0) pdf.addPage();
    await drawSingleTicketPage(pdf, booking, items[i]);
  }

  const filename = specificItem 
    ? `Sloan_Jooste_Ticket_${specificItem.passRef}.pdf` 
    : `Sloan_Jooste_Tickets_${baseRef}_All_Passes.pdf`;

  pdf.save(filename);
}
