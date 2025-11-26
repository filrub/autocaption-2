import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              textAlign: 'center',
            }}>
              {/* Warning Icon */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>

              {/* Title */}
              <h1 style={{
                margin: 0,
                fontSize: '1.875rem',
                fontWeight: 600,
                color: '#1f2937',
              }}>
                Oops! Qualcosa è andato storto
              </h1>

              {/* Description */}
              <p style={{
                margin: 0,
                fontSize: '1.125rem',
                color: '#6b7280',
                lineHeight: 1.6,
              }}>
                L'applicazione ha riscontrato un errore imprevisto.
                Prova a ricaricare la pagina.
              </p>

              {/* Error message box */}
              {this.state.error && (
                <div style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                </div>
              )}

              {/* Reload button */}
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: 'white',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Refresh icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                </svg>
                Ricarica Applicazione
              </button>

              {/* Stack trace in dev mode */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details style={{ width: '100%', textAlign: 'left' }}>
                  <summary style={{
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#4b5563',
                  }}>
                    Stack Trace (Dev Mode)
                  </summary>
                  <pre style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#1f2937',
                    color: '#e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
