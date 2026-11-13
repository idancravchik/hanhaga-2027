import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <main
                    role="alert"
                    aria-live="assertive"
                    dir="rtl"
                    className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans text-right"
                >
                    <div className="w-full max-w-lg bg-white rounded-[28px] border border-[#dadce0] p-6 sm:p-8 shadow-xl text-center space-y-6 animate-fadeIn">
                        {/* Error Icon */}
                        <div className="w-16 h-16 mx-auto rounded-full bg-[#fce8e6] text-[#d93025] flex items-center justify-center shadow-xs">
                            <AlertTriangle size={32} aria-hidden="true" />
                        </div>

                        {/* Text Information */}
                        <div className="space-y-2">
                            <h1 className="text-[20px] sm:text-[22px] font-bold text-[#202124]">
                                משהו השתבש בטעינת העמוד
                            </h1>
                            <p className="text-[14px] text-[#5f6368] leading-relaxed">
                                אירעה שגיאה בלתי צפויה במערכת. הנתונים שלך שמורים ומאובטחים.
                                נסה לרענן את העמוד כדי להמשיך.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[14px] font-medium rounded-full shadow-xs hover:shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2"
                            >
                                <RefreshCw size={16} aria-hidden="true" />
                                <span>רענן עמוד</span>
                            </button>

                            <button
                                type="button"
                                onClick={this.handleGoHome}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] text-[14px] font-medium rounded-full transition-all focus:outline-hidden focus:ring-2 focus:ring-[#dadce0]"
                            >
                                <Home size={16} aria-hidden="true" />
                                <span>חזור לדף הבית</span>
                            </button>
                        </div>

                        {/* Technical details in dev/debug */}
                        {this.state.error && import.meta.env.DEV && (
                            <details className="mt-4 text-left dir-ltr bg-[#f1f3f4] p-3 rounded-[12px] text-[12px] text-[#d93025] overflow-x-auto">
                                <summary className="cursor-pointer font-mono font-medium text-[#5f6368] mb-1">
                                    Error Details
                                </summary>
                                <pre className="whitespace-pre-wrap">{this.state.error.stack || this.state.error.message}</pre>
                            </details>
                        )}
                    </div>
                </main>
            );
        }

        return this.props.children;
    }
}
