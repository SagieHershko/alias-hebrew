import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

/** QR code of the invite link: a friend sitting next to you scans it and joins the room. */
export function InviteQR({ url, size = 180 }: { url: string; size?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // An SVG string needs no canvas; shown as a data URI (online play is web-only).
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
      .then((svg) => alive && setUri(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`))
      .catch(() => alive && setUri(null));
    return () => {
      alive = false;
    };
  }, [url]);
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={[styles.qr, { width: size, height: size }]}
      accessibilityLabel="קוד QR להצטרפות לחדר"
    />
  );
}

const styles = StyleSheet.create({
  qr: { alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 8 },
});
