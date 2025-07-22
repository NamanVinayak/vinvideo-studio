// Centralized error logging utility for debugging runtime errors
export interface RuntimeError {
  message: string;
  stack?: string;
  timestamp: string;
  location: string;
  userAgent?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  source?: 'javascript' | 'unhandledrejection' | 'react-error-boundary';
}

class ErrorLogger {
  private errors: RuntimeError[] = [];
  private maxErrors = 50; // Keep last 50 errors

  logError(error: Error | string, location: string, source: RuntimeError['source'] = 'javascript'): void {
    const errorInfo: RuntimeError = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      location,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      source,
    };

    this.errors.unshift(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Enhanced console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 RUNTIME ERROR CAPTURED - ${source.toUpperCase()}`);
      console.error('Error Message:', errorInfo.message);
      console.error('Location:', errorInfo.location);
      console.error('Timestamp:', errorInfo.timestamp);
      if (errorInfo.stack) {
        console.error('Stack Trace:', errorInfo.stack);
      }
      console.error('Full Error Object:', errorInfo);
      console.groupEnd();
      
      // Alert for critical errors to prevent them from being missed
      if (location.includes('DoP') || location.includes('dop')) {
        console.warn('🎯 DoP-RELATED ERROR DETECTED - This might be causing Fast Refresh issues!');
      }
    }
  }

  getRecentErrors(count: number = 10): RuntimeError[] {
    return this.errors.slice(0, count);
  }

  getAllErrors(): RuntimeError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  // Special method for DoP processing errors
  logDoPProcessingError(error: Error | string, additionalContext?: any): void {
    const location = 'DoP Output Processing (test-tts/page.tsx)';
    this.logError(error, location, 'javascript');
    
    if (additionalContext && process.env.NODE_ENV === 'development') {
      console.group('🔍 DoP ERROR CONTEXT');
      console.log('Additional Context:', additionalContext);
      console.groupEnd();
    }
  }
}

// Global singleton instance
export const errorLogger = new ErrorLogger();

// Setup global error handlers (call this in layout or _app)
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // Capture JavaScript runtime errors
  window.onerror = (message, source, lineno, colno, error) => {
    errorLogger.logError(
      error || message.toString(),
      `${source}:${lineno}:${colno}`,
      'javascript'
    );
    
    // Return false to prevent default browser error handling
    return false;
  };

  // Capture unhandled Promise rejections
  window.onunhandledrejection = (event) => {
    errorLogger.logError(
      event.reason,
      'Unhandled Promise Rejection',
      'unhandledrejection'
    );
    
    // Prevent default handling
    event.preventDefault();
  };

  console.log('✅ Global error handlers initialized');
}