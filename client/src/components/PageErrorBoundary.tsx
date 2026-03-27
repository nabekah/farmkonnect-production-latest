import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * PageErrorBoundary — a lightweight error boundary for individual pages.
 * Unlike the full-screen ErrorBoundary, this renders an inline error panel
 * inside the existing DashboardLayout so the sidebar/nav remains accessible.
 */
class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[PageErrorBoundary] Error in ${this.props.pageName ?? "page"}:`, error);
    console.error("[PageErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="flex flex-col items-center w-full max-w-lg bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="bg-destructive/10 rounded-full p-3 mb-4">
              <AlertTriangle size={36} className="text-destructive" />
            </div>

            <h2 className="text-xl font-semibold text-center mb-1">
              {this.props.pageName ? `${this.props.pageName} failed to load` : "Page failed to load"}
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-6">
              An unexpected error occurred. You can try again or navigate to another page.
            </p>

            {import.meta.env.DEV && (
              <div className="p-3 w-full rounded bg-muted overflow-auto mb-5 max-h-32">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={this.handleReset}
                className={cn(
                  "flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                )}
              >
                <RefreshCw size={14} />
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                )}
              >
                <RotateCcw size={14} />
                Reload
              </button>

              <button
                onClick={() => (window.location.href = "/dashboard")}
                className={cn(
                  "flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                )}
              >
                <Home size={14} />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
