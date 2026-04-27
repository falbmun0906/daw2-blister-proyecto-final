import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from './atoms/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          message="Ha ocurrido un error inesperado."
          retryLabel="Recargar"
          onRetry={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}