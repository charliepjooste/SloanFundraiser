import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    localStorage.removeItem('sloan_cached_bookings');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full p-8 rounded-3xl bg-slate-800 border border-purple-500/30 shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-black">
              💚
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Sloan Jooste's Fundraiser Dance</h2>
              <p className="text-xs text-slate-300">
                A temporary error occurred while rendering the page. Click the button below to refresh and load the latest version.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                🔄 Refresh & Load Website
              </button>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-left text-[10px] text-rose-400 font-mono overflow-x-auto max-h-32">
                {String(this.state.error)}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
