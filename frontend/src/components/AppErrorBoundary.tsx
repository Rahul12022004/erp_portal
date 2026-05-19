import type { ReactNode } from "react";
import { Component } from "react";
import { clearStoredSessions } from "@/lib/auth";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Frontend render error:", error, errorInfo);
  }

  private handleReset = () => {
    clearStoredSessions();
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="w-full max-w-2xl rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
            Frontend Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold">The app hit a render error.</h1>
          <p className="mt-3 text-sm text-slate-300">
            This screen is shown so the frontend does not fail silently. You can clear the stored
            session and restart from the home page.
          </p>

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/80 p-4">
            <p className="text-sm font-medium text-red-200">{this.state.error.message}</p>
            {this.state.error.stack ? (
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-400">
                {this.state.error.stack}
              </pre>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Clear Session And Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
