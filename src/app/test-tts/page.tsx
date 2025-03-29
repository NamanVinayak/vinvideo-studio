'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function TestTTS() {
  const [script, setScript] = useState<string>('Have you ever been alone at night and heard something outside your door?');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formattedScript, setFormattedScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [loadingDots, setLoadingDots] = useState<string>('');

  // Update loading animation dots
  useEffect(() => {
    if (!loading) {
      setLoadingDots('');
      setElapsedTime(0);
      return;
    }

    const dotsInterval = setInterval(() => {
      setLoadingDots(prev => prev.length < 3 ? prev + '.' : '');
    }, 500);

    const timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(timerInterval);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFormattedScript(null);
    setAudioUrl(null);
    setFallbackReason(null);
    setProcessingStage('Formatting script with OpenAI GPT-4o-mini');
    setElapsedTime(0);

    try {
      // Start the request
      const response = await fetch('/api/test-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process script');
      }

      // While audio is being processed
      setProcessingStage('Converting text to speech with Hume AI (this may take a minute for longer scripts)');
      
      const data = await response.json();
      
      setProcessingStage('Processing complete!');
      setFormattedScript(data.formattedScript);
      setAudioUrl(data.audioUrl);
      
      // Check if this is a fallback audio URL
      if (data.audioUrl && data.audioUrl.includes('reason=')) {
        try {
          const url = new URL(window.location.origin + data.audioUrl);
          const reason = url.searchParams.get('reason');
          if (reason) {
            setFallbackReason(decodeURIComponent(reason));
          }
        } catch (e) {
          console.error('Error parsing audio URL:', e);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProcessingStage(null);
      }, 1000); // Keep the "Processing complete" message visible for a moment
    }
  };

  // Format time display (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Test Script Formatting and TTS</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="script" className={styles.label}>Enter Script:</label>
          <textarea
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className={styles.textarea}
            rows={5}
            placeholder="Enter your script here..."
            required
            disabled={loading}
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Generate Audio'}
        </button>
      </form>

      {processingStage && (
        <div className={styles.processingStage}>
          <div className={styles.progressHeader}>
            <p>{processingStage}{loadingDots}</p>
            <span className={styles.timer}>{formatTime(elapsedTime)}</span>
          </div>
          {loading && (
            <div className={styles.progressBar}>
              <div className={styles.progressIndeterminate}></div>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {formattedScript && (
        <div className={styles.result}>
          <h2>Formatted Script:</h2>
          <div className={styles.formattedScript}>
            {formattedScript}
          </div>
        </div>
      )}
      
      {fallbackReason && (
        <div className={styles.warning}>
          <h2>Using Fallback Audio:</h2>
          <p>{fallbackReason}</p>
        </div>
      )}
      
      {audioUrl && (
        <div className={styles.result}>
          <h2>Generated Audio:</h2>
          <audio controls src={audioUrl} className={styles.audio} />
          <div className={styles.downloadContainer}>
            <a 
              href={audioUrl} 
              download={fallbackReason ? "fallback-audio.mp3" : "formatted-audio.mp3"} 
              className={styles.downloadButton}
            >
              Download Audio
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 