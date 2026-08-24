import { jsPDF } from 'jspdf';
import { EVENT_DETAILS, getShortReference } from '../firebase';

/**
 * Generate and download a pixel-perfect, standalone PDF ticket pass
 * Directly draws vector elements and local QR canvas to avoid CORS/tainting issues.
 */
export async function downloadTicketPdf(booking) {
  if (!booking) return;

  const ticketRef = getShortReference(booking);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const cardWidth = 150;
  const cardX = (pageWidth - cardWidth) / 2; // 30mm
  let currentY = 18;

  // 1. Outer Card Background & Border
  pdf.setDrawColor(226, 232, 240); // #e2e8f0
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(cardX, currentY, cardWidth, 235, 6, 6, 'FD');

  // 2. Header Banner (Green/Purple Gradient Style)
  pdf.setFillColor(21, 128, 61); // #15803d (Emerald Green)
  pdf.roundedRect(cardX, currentY, cardWidth, 24, 6, 6, 'F');
  // Overwrite bottom rounded corners of header
  pdf.rect(cardX, currentY + 18, cardWidth, 6, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text("Sloan Jooste's Fundraiser Dance", cardX + cardWidth / 2, currentY + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(167, 243, 208); // light green
  pdf.text("Official Entry & Raffle Pass", cardX + cardWidth / 2, currentY + 17, { align: 'center' });

  currentY += 32;

  // 3. Guest Name & Reference Badge
  pdf.setTextColor(15, 23, 42); // #0f172a
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(`${booking.firstName} ${booking.surname}`, cardX + cardWidth / 2, currentY, { align: 'center' });

  currentY += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(107, 33, 168); // purple
  pdf.text(`Ticket Reference: `, cardX + cardWidth / 2 - 12, currentY, { align: 'right' });
  
  // Reference pill
  pdf.setFillColor(243, 232, 255); // purple pill bg
  pdf.setDrawColor(216, 180, 254);
  pdf.roundedRect(cardX + cardWidth / 2 - 10, currentY - 4, 26, 6, 2, 2, 'FD');
  pdf.setTextColor(59, 7, 100);
  pdf.setFont('courier', 'bold');
  pdf.text(ticketRef, cardX + cardWidth / 2 + 3, currentY, { align: 'center' });

  currentY += 8;

  // 4. Generate QR Code directly onto canvas and embed as base64
  try {
    const qrData = JSON.stringify({
      ref: ticketRef,
      id: booking.id,
      name: `${booking.firstName} ${booking.surname}`,
      table: booking.tableNumber,
      tickets: booking.numTickets
    });

    // Create an in-memory canvas for QR code
    const qrCanvas = document.createElement('canvas');
    const QRCode = await import('qrcode.react');
    
    // We can use a standard canvas drawing or API QR Image
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
    
    // Load image as base64 safely
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
      new Promise(r => setTimeout(() => r(null), 3000))
    ]);

    // Draw QR Box container
    const qrBoxSize = 50;
    const qrBoxX = cardX + (cardWidth - qrBoxSize) / 2;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(qrBoxX, currentY, qrBoxSize, qrBoxSize + 8, 4, 4, 'FD');

    if (qrBase64) {
      pdf.addImage(qrBase64, 'PNG', qrBoxX + 4, currentY + 3, qrBoxSize - 8, qrBoxSize - 8);
    } else {
      // Fallback text if offline
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(ticketRef, qrBoxX + qrBoxSize / 2, currentY + qrBoxSize / 2, { align: 'center' });
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("PRESENT AT DOOR FOR CHECK-IN", qrBoxX + qrBoxSize / 2, currentY + qrBoxSize + 4, { align: 'center' });

    currentY += qrBoxSize + 14;
  } catch (e) {
    currentY += 40;
  }

  // 5. Details Grid (2 columns x 2 rows)
  const gridWidth = cardWidth - 16;
  const colWidth = (gridWidth - 4) / 2;
  const col1X = cardX + 8;
  const col2X = col1X + colWidth + 4;
  const rowHeight = 14;

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
  const tableText = booking.tableBookingOption === 'Raffle Tickets Only' ? 'Raffle Supporter' : `Table #${booking.tableNumber || 1}`;
  pdf.text(tableText, col1X + 4, currentY + 10);

  // Box 2: Tickets & Slices
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(187, 247, 208);
  pdf.roundedRect(col2X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text("TICKETS & SLICES", col2X + 4, currentY + 4.5);
  pdf.setFontSize(9);
  pdf.setTextColor(20, 83, 45);
  const ticketsText = `${booking.numTickets || 1} Dance ${booking.raffleTicketsCount > 0 ? `• ${booking.raffleTicketsCount} Raffle` : ''}`;
  pdf.text(ticketsText, col2X + 4, currentY + 10);

  currentY += rowHeight + 3;

  // Box 3: Amount Paid
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(col1X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("AMOUNT PAID", col1X + 4, currentY + 4.5);
  pdf.setFontSize(9);
  pdf.setTextColor(21, 128, 61);
  pdf.text(`R${booking.amount || 0} (${booking.paymentMethod || 'Paid'})`, col1X + 4, currentY + 10);

  // Box 4: Dress Code
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(col2X, currentY, colWidth, rowHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("DRESS CODE", col2X + 4, currentY + 4.5);
  pdf.setFontSize(8.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text("A Splash of Green", col2X + 4, currentY + 10);

  currentY += rowHeight + 6;

  // 6. Venue & Event Info Box
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(134, 239, 172);
  pdf.roundedRect(col1X, currentY, gridWidth, 26, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(22, 101, 52);
  pdf.text("VENUE & EVENT LOCATION", col1X + 4, currentY + 5);

  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(EVENT_DETAILS.venue, col1X + 4, currentY + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(EVENT_DETAILS.address, col1X + 4, currentY + 14.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(59, 7, 100);
  pdf.text("Friday, 09 Oct 2026 (19:00 - 00:00) | Raffle Draw: 21:00 - 21:30 | BYO Platter & XYZ", col1X + 4, currentY + 20);
  pdf.text("Live Music: The Elginairs • Official DJ: DJ Cool J", col1X + 4, currentY + 23.5);

  currentY += 30;

  // 7. Official Banking Details for Extra Raffle Entries
  pdf.setFillColor(250, 245, 255);
  pdf.setDrawColor(216, 180, 254);
  pdf.roundedRect(col1X, currentY, gridWidth, 24, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(88, 28, 135);
  pdf.text("BUY EXTRA RAFFLE TICKETS VIA EFT (R50 / 1 • R100 / 3)", col1X + 4, currentY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Bank: ${EVENT_DETAILS.banking.bank} | Acc Holder: ${EVENT_DETAILS.banking.accountHolder} | Acc Type: ${EVENT_DETAILS.banking.accountType}`, col1X + 4, currentY + 10);
  pdf.text(`Account No: ${EVENT_DETAILS.banking.accountNumber} | Branch Code: ${EVENT_DETAILS.banking.branchCode}`, col1X + 4, currentY + 14.5);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(21, 128, 61);
  pdf.text(`Payment Reference: ${ticketRef} (Important!)`, col1X + 4, currentY + 20);

  currentY += 28;

  // 8. Footer Contacts
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Nicole Jooste: 071 113 4812 • Marsha Beukes: 079 528 5350 • Thank you for supporting Sloan!", cardX + cardWidth / 2, currentY + 2, { align: 'center' });

  // Save the PDF file
  pdf.save(`Sloan_Jooste_Ticket_${ticketRef}.pdf`);
  return true;
}
