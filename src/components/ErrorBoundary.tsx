import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Try reloading the page.
            </p>
            <button
              className="underline text-sm"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
