import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

const enc = encodeURIComponent;

// These three are real, public, keyless "share intent" links each platform
// documents itself — not an API integration, no app registration, no OAuth.
// They open the target app (if installed) or its web fallback, pre-filled,
// letting the traveler pick who to send it to themselves.
export function whatsappUrl(text: string, url?: string): string {
  return `https://wa.me/?text=${enc(url ? `${text} ${url}` : text)}`;
}
export function smsUrl(text: string): string {
  // iOS/Android only (there's no "SMS" on desktop) — that's expected, not a bug.
  return `sms:&body=${enc(text)}`;
}
export function twitterIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${enc(text)}`;
}
// Facebook's classic sharer.php — real and keyless, but it only ever takes a
// URL (it scrapes that page's own OG tags for the preview); it deliberately
// ignores any custom text/quote param from a plain link like this one, so
// there's no point accepting a text argument here.
export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
}

// Everything else (Instagram, Messenger, Mail, AirDrop, and whatever else is
// actually installed) goes through the real OS share sheet instead — that's
// the only legitimate way to reach them. Neither Instagram nor Messenger
// offers a public "share this text/photo, pre-filled" link the way WhatsApp/
// X do above; the OS sheet is Apple's/Google's own integration with those
// apps, not something this app can replicate with a URL.
export function canUseNativeShare(): boolean {
  return Capacitor.isNativePlatform() || (typeof navigator !== "undefined" && !!navigator.share);
}

// Returns true once the OS share sheet was actually handed the content —
// NOT whether the traveler picked something in it (that's private by
// design; no platform reports back which app was chosen, or even whether it
// was sent). Returns false only when there's nothing to hand off to at all.
export async function shareContent(opts: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.dialogTitle });
      return true;
    } catch {
      return false; // traveler dismissed the native sheet — not an error
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Same idea, but hands off the actual photo as a file where the platform
// supports it (renders inline in Messages/WhatsApp instead of just a link).
// Falls back to a plain link share if file-sharing isn't supported.
export async function shareImage(opts: { title?: string; text?: string; imageUrl: string; pageUrl?: string }): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share && (navigator as any).canShare) {
    try {
      const resp = await fetch(opts.imageUrl);
      const blob = await resp.blob();
      const file = new File([blob], "memory.jpg", { type: blob.type || "image/jpeg" });
      if ((navigator as any).canShare({ files: [file] })) {
        await navigator.share({ title: opts.title, text: opts.text, files: [file] });
        return true;
      }
    } catch {
      // fall through to a link-based share below
    }
  }
  return shareContent({ title: opts.title, text: opts.text, url: opts.pageUrl || opts.imageUrl });
}
