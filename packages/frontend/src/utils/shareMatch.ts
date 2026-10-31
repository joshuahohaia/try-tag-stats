import { format, parseISO } from 'date-fns';
import { formatTime } from './format';

interface ShareableFixture {
  fixtureDate: string;
  fixtureTime: string | null;
  pitch: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

/** The message text a user reviews and sends themselves in a WhatsApp chat of their choice. */
export function buildShareText(fixture: ShareableFixture, matchUrl: string): string {
  let when = fixture.fixtureDate;
  try {
    when = format(parseISO(fixture.fixtureDate), 'EEE d MMM');
  } catch {
    // keep the raw date text
  }
  const time = formatTime(fixture.fixtureTime);
  const lines = [
    `${fixture.homeTeam.name} v ${fixture.awayTeam.name}`,
    time ? `${when} at ${time}` : when,
  ];
  if (fixture.pitch) lines.push(fixture.pitch);
  lines.push(matchUrl);
  return lines.join('\n');
}

/**
 * WhatsApp click-to-chat share link. With no phone number it opens WhatsApp's own chat picker
 * with the text prefilled; nothing is sent until the user chooses a chat and sends.
 */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
