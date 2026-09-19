'use client';

/**
 * Last-resort boundary: rendered when the root layout itself fails, so it
 * cannot rely on providers, fonts, or translations — inline styles only.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F9F8F6',
                    color: '#1c1917',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <main style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }} role="alert">
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#57534e', marginBottom: '1.5rem' }}>
                        The application failed to start. Please try again.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: '#D95D39',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
