/**
 * Music User Context Interface
 * Provides user preferences and requirements for the Music Video Pipeline
 * Based on Vision Enhanced patterns but adapted for musical needs
 */

export interface MusicUserContext {
  // Core user settings
  settings: {
    visualStyle: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
    pacing: 'slow' | 'medium' | 'fast';
    duration: number; // Target duration in seconds
    contentType: 'abstract_thematic' | 'narrative_character';
  };
  
  // Music-specific preferences
  musicPreferences: {
    musicPreference: 'auto' | 'database' | 'upload' | 'no_music';
    beatSyncPreference: 'tight' | 'loose' | 'artistic'; // How closely to follow beats
    visualMusicRelationship: 'literal' | 'interpretive' | 'contrasting';
    genreAwareness: boolean; // Whether to apply genre-specific conventions
  };
  
  // Quality constraints
  constraints: {
    durationTolerance: number; // Percentage tolerance (e.g., 5 for ±5%)
    mustMatchBeats: boolean; // Strict beat alignment requirement
    prioritizeMusicSync: boolean; // Music sync over visual variety
  };
  
  // Creative preferences
  creativePreferences: {
    colorPalette?: string; // User's preferred color approach
    moodAlignment: 'match_music' | 'complement_music' | 'contrast_music';
    transitionStyle: 'cuts_only' | 'mixed_transitions' | 'smooth_transitions';
    visualComplexity: 'simple' | 'moderate' | 'complex';
  };
  
  // Advanced options
  advanced?: {
    artisticStyleHint?: string; // e.g., "van Gogh style", "cyberpunk aesthetic"
    specificRequirements?: string[]; // Any specific user requirements
    forbiddenElements?: string[]; // Things to avoid
    characterConsistency?: boolean; // For narrative content
  };
}

// Default context for when user doesn't specify preferences
export const DEFAULT_MUSIC_USER_CONTEXT: MusicUserContext = {
  settings: {
    visualStyle: 'cinematic',
    pacing: 'medium',
    duration: 60,
    contentType: 'abstract_thematic'
  },
  musicPreferences: {
    musicPreference: 'auto',
    beatSyncPreference: 'tight',
    visualMusicRelationship: 'interpretive',
    genreAwareness: true
  },
  constraints: {
    durationTolerance: 5,
    mustMatchBeats: true,
    prioritizeMusicSync: true
  },
  creativePreferences: {
    moodAlignment: 'match_music',
    transitionStyle: 'cuts_only',
    visualComplexity: 'moderate'
  }
};