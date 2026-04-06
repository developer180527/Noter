import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 bg-surface">
          <p className="text-xs font-mono text-danger">render error</p>
          <pre className="text-2xs font-mono text-muted bg-raised rounded p-4 max-w-lg overflow-auto whitespace-pre-wrap">
            {error.message}
            {"\n\n"}
            {error.stack?.split("\n").slice(0, 6).join("\n")}
          </pre>
          <button
            onClick={this.reset}
            className="text-xs font-sans text-amber hover:text-amber-glow transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
