import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
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

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] p-6 font-sans">
          <div className="relative max-w-md w-full rounded-xl bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] space-y-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">문제가 발생했습니다</h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                애플리케이션을 실행하는 도중 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침하세요.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-white/[0.07] text-[0.6875rem] text-rose-300 font-mono text-left max-h-32 overflow-y-auto break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-white/[0.07] hover:border-white/[0.14] transition cursor-pointer"
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F1F5F9] hover:bg-white text-[#0F172A] flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
