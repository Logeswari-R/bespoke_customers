import React from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [Bespoke ErrorBoundary] Caught an unhandled UI error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[70vh] bg-[#FAF8FA] flex items-center justify-center p-4">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#F0E5EC] shadow-xl max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200 text-[var(--theme-primary)] flex items-center justify-center mx-auto mb-5 shadow-2xs">
              <AlertTriangle className="w-8 h-8 text-[var(--theme-primary)]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#24212A] tracking-tight">
              Something went wrong
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 mb-6 leading-relaxed">
              We encountered an unexpected error while preparing this bespoke atelier view. You can safely retry or return to the main collections.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[var(--theme-primary)] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-neutral-200"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>

            {/* Collapsible diagnostic details */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-6 text-left border-t border-neutral-100 pt-4">
                <summary className="text-[11px] font-bold text-neutral-400 cursor-pointer hover:text-neutral-700 select-none">
                  Technical Diagnostics
                </summary>
                <div className="mt-2 p-3 bg-neutral-900 text-neutral-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

