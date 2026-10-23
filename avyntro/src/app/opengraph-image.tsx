import { ImageResponse } from 'next/og';

export const alt = 'Avyntro: Business, Connected. HRMS and ERP software.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0B1220', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: '#2563EB', display: 'flex' }} />
          <div style={{ fontSize: 56, fontWeight: 700 }}>Avyntro</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 48, lineHeight: 1.1 }}>Business, Connected.</div>
        <div style={{ fontSize: 32, color: '#94A3B8', marginTop: 24 }}>HRMS and ERP on one modular platform</div>
      </div>
    ),
    size,
  );
}
