import React from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-12 text-center font-sans">
          <div className="rounded-full bg-red-50 p-5 text-red-500 mb-4">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">System Render Failure</h1>
          <p className="text-xs font-semibold text-gray-400 mt-2 max-w-sm leading-relaxed">
            An unexpected error occurred during database layout render. Please refresh the browser session.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-1.5 rounded-xl bg-charcoal px-6 py-3 text-xs font-bold text-white hover:bg-black transition-all shadow"
          >
            <RefreshCcw className="h-4 w-4" /> Reload Portal
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
