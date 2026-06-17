import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isSupabaseError = false;

      try {
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
          if (errorMessage.toLowerCase().includes('supabase')) {
            isSupabaseError = true;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Something went wrong</h2>
            <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left">
              <p className="text-sm text-slate-600 font-medium break-words">
                {errorMessage}
              </p>
              {isSupabaseError && (
                <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">
                  Check your Supabase configuration and database tables.
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              <RefreshCcw size={20} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
