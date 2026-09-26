import QRCode from 'qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * QR code of the invite link: a friend sitting next to you scans it and joins the room.
 * Drawn with plain Views (one per run of dark modules), so it needs no image or canvas.
 */
export function InviteQR({ url, size = 200 }: { url: string; size?: number }) {
  const rows = useMemo(() => {
    try {
      const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
      const n = modules.size;
      const result: { start: number; length: number }[][] = [];
      for (let y = 0; y < n; y++) {
        const runs: { start: number; length: number }[] = [];
        for (let x = 0; x < n; x++) {
          if (!modules.get(y, x)) continue;
          const last = runs[runs.length - 1];
          if (last && last.start + last.length === x) last.length += 1;
          else runs.push({ start: x, length: 1 });
        }
        result.push(runs);
      }
      return result;
    } catch {
      return null;
    }
  }, [url]);
  if (!rows) return null;

  const quiet = 2; // white margin, in modules, so phones can find the code
  // Whole-pixel modules: no hairline gaps between rows.
  const cell = Math.max(2, Math.floor(size / (rows.length + quiet * 2)));
  const side = cell * (rows.length + quiet * 2);
  return (
    <View
      style={[styles.qr, { width: side, height: side, padding: cell * quiet }]}
      accessibilityRole="image"
      accessibilityLabel="קוד QR להצטרפות לחדר"
    >
      {rows.map((runs, y) => (
        <View key={y} style={{ height: cell }}>
          {runs.map((r) => (
            <View
              key={r.start}
              style={[styles.dark, { left: r.start * cell, width: r.length * cell, height: cell }]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  qr: { alignSelf: 'center', backgroundColor: '#FFFFFF' },
  dark: { position: 'absolute', top: 0, backgroundColor: '#000000' },
});
