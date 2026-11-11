/**
 * Offline fallback document (PWA `fallbacks.document`).
 * Served when an uncached page is requested without a network. Self-contained:
 * no data fetching, no locale routing, one retry button. Queued field records
 * are safe in on-device storage — this page says exactly that.
 */
'use client';

export default function OfflineFallbackPage() {
    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                color: '#e2e8f0',
                fontFamily: 'system-ui, sans-serif',
                padding: '24px',
                textAlign: 'center',
            }}
        >
            <div style={{ maxWidth: '420px' }}>
                <div style={{ fontSize: '48px' }} aria-hidden="true">
                    &#128246;
                </div>
                <h1 style={{ fontSize: '22px', margin: '16px 0 8px' }}>You are offline</h1>
                <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6 }}>
                    Your records are saved on this device — not yet sent. Reconnect
                    to the internet, then open the field app and tap Sync. Queued
                    records stay on this device until they sync, so keep the device
                    with you.
                </p>
                <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6 }}>
                    Vos dossiers sont enregistr&eacute;s sur cet appareil — pas
                    encore envoy&eacute;s. Reconnectez-vous, puis ouvrez
                    l&rsquo;application terrain et touchez Synchroniser.
                </p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '20px',
                        padding: '14px 32px',
                        fontSize: '16px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        border: 'none',
                        background: '#16a34a',
                        color: '#fff',
                        cursor: 'pointer',
                        minHeight: '48px',
                    }}
                >
                    Retry / R&eacute;essayer
                </button>
            </div>
        </main>
    );
}
