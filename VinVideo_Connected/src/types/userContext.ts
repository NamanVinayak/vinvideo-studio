/**
 * UserContext - Universal context passed to all agents containing user requirements
 * This ensures all agents have direct access to what the user actually requested
 */

export interface UserContext {
  // Original user input without any interpretation
  originalPrompt: string;
  
  // User-selected settings from the UI
  settings: {
    duration: number;  // 15, 30, 60, 90 seconds
    pacing: 'slow' | 'medium' | 'fast';
    visualStyle: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
    contentType?: string;  // Optional content classification
    voiceSelection?: string;  // For TTS voice selection
  };
  
  // Pipeline metadata
  pipeline: {
    mode: 'vision_enhanced' | 'legacy_script' | 'music_video' | 'no_music';
    timestamp: string;  // ISO timestamp when request was initiated
    sessionId: string;  // Unique session identifier
  };
  
  // Constraints for agent compliance
  constraints: {
    mustMatchDuration: boolean;  // Whether to enforce strict duration matching
    durationTolerance: number;  // Percentage tolerance (fixed at 5)
  };
}

/**
 * NoMusicUserContext - Specialized context for no-music visual-only pipeline
 * Extends UserContext with no-music specific settings and constraints
 */
export interface NoMusicUserContext extends UserContext {
  pipeline: {
    mode: 'no_music';
    timestamp: string;
    sessionId: string;
  };
  
  // No-music specific settings
  settings: {
    duration: number;
    pacing: 'slow' | 'medium' | 'fast';
    visualStyle: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
    narrativeStyle?: 'abstract' | 'character' | 'conceptual';  // Visual-only narrative approach
    contentType?: 'educational' | 'commercial' | 'narrative' | 'tutorial';  // Content classification
  };
  
  // Visual-only constraints
  constraints: {
    mustMatchDuration: boolean;
    durationTolerance: number;  // Fixed at 5%
    preventCameraStaring: boolean;  // Enable gaze direction intelligence
    enforceVisualDiversity: boolean;  // Enable cognitive diversity patterns
  };
}