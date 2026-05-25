/**
 * Per-module React error boundary.
 *
 * Wrap each heavy module page with this so a render crash in one module
 * doesn't take down the whole dashboard.
 *
 * Usage:
 *   <ModuleErrorBoundary module="finance">
 *     <FinanceModule />
 *   </ModuleErrorBoundary>
 */

import { Component, type ReactNode } from "react";

interface Props {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  crashed: boolean;
  error: string | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false, error: null };

  static getDerivedStateFromError(err: Error): State {
    return { crashed: true, error: err.message };
  }

  componentDidCatch(err: Error) {
    console.error(`[ModuleErrorBoundary] ${this.props.module} crashed:`, err);
  }

  private handleRetry = () => {
    this.setState({ crashed: false, error: null });
  };

  render() {
    if (!this.state.crashed) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div>
          <p className="font-semibold text-amber-300 capitalize">{this.props.module} module unavailable</p>
          <p className="mt-1 text-sm text-slate-400">
            {this.state.error ?? "An unexpected error occurred. Other modules are unaffected."}
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
}
