'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // You could send this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full border-[var(--accent-red)]/30 bg-[var(--bg-secondary)]">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-[var(--accent-red)]" />
              </div>
              <CardTitle className="text-xl text-[var(--text-primary)]">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-[var(--text-secondary)]">
                An unexpected error occurred. You can try reloading the page or going back to the home page.
              </p>
              
              {this.state.error && (
                <div className="space-y-2">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {this.state.showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {this.state.showDetails ? 'Hide' : 'Show'} error details
                  </button>
                  
                  {this.state.showDetails && (
                    <div className="rounded-lg bg-[var(--bg-primary)] p-3 overflow-auto max-h-48">
                      <p className="text-xs font-mono text-[var(--accent-red)]">
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      {this.state.errorInfo?.componentStack && (
                        <pre className="text-xs font-mono text-[var(--text-tertiary)] mt-2 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="border-[var(--border-default)]"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to throw errors to the boundary
export function useErrorHandler() {
  const [, setError] = React.useState();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}


