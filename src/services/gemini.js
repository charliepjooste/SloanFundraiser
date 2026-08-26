import { GoogleGenAI } from '@google/genai';

let aiClient = null;

try {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || window.GEMINI_API_KEY;
  if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.log("Gemini API Client initialization skipped, running smart assistant mode.");
}

/**
 * Ask Gemini AI Concierge questions about Sloan Jooste's Fundraiser Dance
 */
export async function askGeminiConcierge(userPrompt) {
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are the official AI Concierge for Sloan Jooste's Fundraiser Dance.
Answer guest questions politely, warmly, and inspiringly.
Event Details:
- Event: Sloan Jooste's Fundraiser Dance
- Cause: In aid of Sloan's Post-Op Physio & Treatment (Cerebral Palsy Care)
- Venue: Kuils River Technical High School, 36 Driebergen Road, Highbury, Kuils River
- Date: Friday, 09 October 2026
- Event Time: 19:00 until 00:00 (7:00 PM to Midnight)
- Raffle Draw Time: 21:00 to 21:30
- Live Entertainment: Live Music by The Elginairs (The Main Event) & Official DJ: DJ Cool J ("The beat that keeps the night alive!")
- Dress Code: A Splash of Green in aid of Cerebral Palsy 💚
- BYO: Bring Your Own Platter & XYZ
- Capacity: 35 Tables (10 per table = 350 seats)
- Tickets: Standard Dance Ticket (R150 per person), Full Private Table of 10 (R1,500)
- Grand Charity Raffle: 7 Prizes (R50 for 1 ticket, R100 for 3 tickets). Winner removed after each draw.
  1. 1st Draw: Hot Stone Massage at Radiance Room (Value: R600)
  2. 2nd Draw: Hot Stone Massage at Radiance Room (Value: R600)
  3. 3rd Draw: Spyced Restaurant Voucher (Value: R1,820)
  4. 4th Draw: Chivas Regal 13YO Rum Cask Scotch Whisky 1L (Value: R2,000)
  5. 5th Draw: Chivas Regal 13YO American Rye Cask Scotch Whisky 1L (Value: R2,000)
  6. 6th Draw: Photoshoot for a Couple (Value: R2,500)
  7. 7th Draw (GRAND FINALE): Whole Lamb (Value: R2,000) — Drawn Last!
- Banking Details for Raffle Tickets: FNB/RMB | Acc Holder: Charlton Jooste | Acc: 62334900091 | Branch: 250655 | Ref: [Ticket Number / Booking ID]
- Contacts: Nicole Jooste (071 113 4812) / Marsha Beukes (079 528 5350)

Guest Question: ${userPrompt}`
      });
      return response.text;
    } catch (err) {
      console.warn("Gemini API call fallback:", err);
    }
  }

  // Smart Contextual Concierge Fallbacks
  const promptLower = userPrompt.toLowerCase();
  if (promptLower.includes('raffle') || promptLower.includes('prize') || promptLower.includes('draw') || promptLower.includes('lamb') || promptLower.includes('chivas') || promptLower.includes('massage') || promptLower.includes('spyced') || promptLower.includes('photoshoot')) {
    return "🎟️ **Official Raffle Prizes (Total Value: R11,520)** (Drawn 21:00 - 21:30):\n1. 💆 **Draw 1 & 2**: Hot Stone Massage at Radiance Room (R600 each)\n2. 🍽️ **Draw 3**: Spyced Restaurant Voucher (R1,820)\n3. 🍾 **Draw 4**: Chivas Regal 13YO Rum Cask (1L) (R2,000)\n4. 🥃 **Draw 5**: Chivas Regal 13YO American Rye Cask (1L) (R2,000)\n5. 📸 **Draw 6**: Photoshoot for a Couple (R2,500)\n6. 🥩 **Draw 7 (Grand Finale)**: **Whole Lamb** (R2,000) — Drawn Last!\n\n*Tickets: R50 for 1, R100 for 3. Each winner is removed after winning so prizes go to 7 separate winners!*";
  }
  if (promptLower.includes('dress') || promptLower.includes('wear') || promptLower.includes('attire') || promptLower.includes('green')) {
    return "👗 **Dress Code**: **A Splash of Green** in aid of Cerebral Palsy 💚—add a touch of green to your outfit!";
  }
  if (promptLower.includes('music') || promptLower.includes('dj') || promptLower.includes('band') || promptLower.includes('elginair') || promptLower.includes('cool j')) {
    return "🎵 **Entertainment**: Live music by **The Elginairs** and official DJ **DJ Cool J** keeping the dancefloor alive all night!";
  }
  if (promptLower.includes('food') || promptLower.includes('drink') || promptLower.includes('platter') || promptLower.includes('xyz') || promptLower.includes('byo')) {
    return "🧺 **Refreshments**: **Bring Your Own Platter & XYZ** (drinks and snacks welcome)!";
  }
  if (promptLower.includes('where') || promptLower.includes('venue') || promptLower.includes('location') || promptLower.includes('address') || promptLower.includes('kuils')) {
    return "📍 **Venue**: **Kuils River Technical High School**, 36 Driebergen Road, Highbury, Kuils River. [Click to view Google Maps](https://maps.google.com/?q=Kuils+River+Technical+High+School+36+Driebergen+Road+Highbury+Kuils+River).";
  }
  if (promptLower.includes('time') || promptLower.includes('when') || promptLower.includes('date')) {
    return "📅 **Date & Time**: Friday, 09 October 2026 from **19:00 to 00:00 (Midnight)**. The **Raffle Draw** is held from **21:00 to 21:30**.";
  }
  if (promptLower.includes('contact') || promptLower.includes('nicole') || promptLower.includes('marsha') || promptLower.includes('phone')) {
    return "📞 **Event Contacts**:\n• Nicole Jooste: 071 113 4812\n• Marsha Beukes: 079 528 5350";
  }
  if (promptLower.includes('table') || promptLower.includes('ticket') || promptLower.includes('price')) {
    return "🎟️ **Tickets & Tables**: Standard Dance Tickets are R150 per person. Full Private Tables of 10 are R1,500 (35 Tables total). Raffle tickets are R50 for 1 or R100 for 3.";
  }

  return "💚 **Welcome to Sloan Jooste's Fundraiser Dance!** Join us on Friday, 09 October 2026 at Kuils River Technical High School from 19:00 to 00:00 with live music by The Elginairs, DJ Cool J, and our Grand Charity Raffle (21:00 - 21:30). Dress code: A splash of green! 💚";
}

/**
 * Generate a personalized tribute message
 */
export async function generateTributeMessage(donorName, amount) {
  const fallbackMessages = [
    `Dear Sloan, sending you strength, love, and endless smiles! Excited to dance for your journey. — ${donorName}`,
    `With love and hope for your post-op healing and bright future, Sloan! Cheering you on every step. — ${donorName}`,
    `Sloan, your courage inspires everyone around you. Honored to celebrate and support your care! — ${donorName}`
  ];
  const fallback = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

  if (aiClient) {
    try {
      const call = aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a short, heartwarming 2-sentence note of encouragement for Sloan Jooste from guest ${donorName} who reserved dance tickets / contributed R${amount} for his post-op physio and Cerebral Palsy care.`
      });
      const res = await Promise.race([
        call,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]);
      return res?.text || fallback;
    } catch (e) {
      return fallback;
    }
  }

  return fallback;
}
