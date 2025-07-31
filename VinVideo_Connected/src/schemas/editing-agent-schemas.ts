/**
 * VinVideo Editing Agent - Complete TypeScript Schemas
 * Defines all input/output interfaces for the Editing Agent API
 */

// =====================================
// INPUT SCHEMAS
// =====================================

export interface EditingAgentInput {
  // Core video assets
  s3VideoFiles: string[];              // S3 paths to video beats
  
  // Agent outputs for context understanding
  directorOutput: DirectorOutput;      // Creative vision and video type
  producerOutput?: ProducerOutput;     // NEW: Precise timing from producer agent
  imagePrompts: ImagePromptData;       // What's in each image
  videoPrompts: VideoPromptData;       // What video conversion created
  
  // User preferences and context
  userContextDocument: UserContext;    // All user settings and original prompt
  subtitleStyle: SubtitleStyleName;    // User-selected subtitle style
  
  // Editing mode control
  advancedMode: boolean;              // true = effects/transitions, false = simple
  
  // Technical specifications
  projectMetadata: ProjectMetadata;    // Duration, platform, format
}

// Director Agent Output Structure
export interface DirectorOutput {
  project_metadata: {
    target_platform: "tiktok" | "instagram" | "youtube" | "snapchat";
    content_type: "educational" | "entertainment" | "marketing" | "tutorial" | "story";
    primary_concept: string;
    duration_target: number;
  };
  narrative_beats: NarrativeBeat[];
}

// Producer Agent Output Structure
export interface ProducerOutput {
  cut_points: Array<{
    cut_number: number;
    cut_time_s: number;
    reason: string;
  }>;
  total_duration_s: number;
  target_duration_s: number;
  duration_variance: number;
  pacing_compliance: boolean;
  cut_count: number;
  average_shot_duration_s: number;
  user_requirements_met: string[];
}

export interface NarrativeBeat {
  beat_no: number;
  timecode_start: string;              // "00:00:02.500"
  est_duration_s: number;
  script_phrase: string;
  narrative_function: "setup" | "development" | "climax" | "resolution" | "hook" | "conclusion";
  emotional_tone: "curiosity" | "excitement" | "tension" | "relief" | "satisfaction" | "surprise";
  creative_vision: string;
  audience_retention_strategy: string;
  turning_point: boolean;
  entities: string[];
}

// Image and Video Prompt Data
export interface ImagePromptData {
  [beatId: string]: {
    image_prompt: string;              // Original image generation prompt
    final_image_prompt: string;       // Final optimized prompt used
  };
}

export interface VideoPromptData {
  [beatId: string]: {
    video_prompt: string;              // Video conversion prompt
  };
}

// User Context Document Structure
export interface UserContext {
  originalPrompt: string;              // User's original request
  projectSettings: {
    duration: number;
    style_preference: "minimal" | "dynamic" | "professional" | "creative";
    pacing_preference: "slow" | "medium" | "fast";
    target_audience: "general" | "professionals" | "students" | "creators";
  };
  platformSettings: {
    primary_platform: "tiktok" | "instagram" | "youtube";
    aspect_ratio: "9:16" | "16:9" | "4:5" | "1:1";
    quality_preference: "high" | "medium" | "low";
  };
  contentPreferences: {
    subtitle_timing: "auto" | "manual" | "sync_audio";
    transition_style: "none" | "minimal" | "creative";
    effect_intensity: "none" | "subtle" | "moderate" | "high";
  };
}

// Project Metadata
export interface ProjectMetadata {
  project_id: string;
  total_duration: number;
  target_platform: "tiktok" | "instagram" | "youtube" | "snapchat";
  aspect_ratio: "9:16" | "16:9" | "4:5" | "1:1" | "21:9" | "4:3";
  fps: number;
  created_at: string;
}

// Available Subtitle Styles
export type SubtitleStyleName = 
  | "simple_caption"
  | "background_caption" 
  | "karaoke_style"
  | "glow_caption"
  | "highlight_caption"
  | "deep_diver"
  | "popling_caption"
  | "greengoblin"
  | "sgone_caption";

// =====================================
// OUTPUT SCHEMAS
// =====================================

export interface EditingPlan {
  // Core composition settings
  composition: CompositionConfig;
  
  // Video/image layers
  layers: EditingLayer[];
  
  // Audio configuration
  audio?: AudioConfig;
  
  // Subtitle configuration
  subtitles: SubtitleConfig;
  
  // Transitions (advanced mode only)
  transitions?: TransitionConfig[];
  
  // Export settings
  export: ExportConfig;
  
  // Metadata
  metadata: EditingMetadata;
}

// Composition Configuration
export interface CompositionConfig {
  format: "9:16" | "16:9" | "4:5" | "1:1" | "21:9" | "4:3";
  duration: number;
  fps: number;
  background_color?: [number, number, number];
}

// Layer Configuration
export interface EditingLayer {
  type: "video" | "image";
  source: string;                      // Filename (resolved to S3 path)
  start_time: number;
  end_time: number;
  position: [number, number];          // [x, y] coordinates
  scale: number;
  rotation?: number;
  opacity: number;
  
  // Advanced mode only
  animations?: AnimationConfig[];
  effects?: EffectConfig[];
}

// Animation Configuration (Advanced Mode)
export interface AnimationConfig {
  attribute: "scale" | "opacity" | "position" | "rotation";
  keyframes: number[];                 // Time points
  values: number[] | [number, number][]; // Values at keyframes
  easings: ("linear" | "ease_in" | "ease_out" | "ease_in_out")[];
}

// Effect Configuration (Advanced Mode)
export interface EffectConfig {
  type: "color_grade" | "blur" | "brightness" | "contrast" | "saturation";
  parameters: {
    [key: string]: number;
  };
}

// Audio Configuration
export interface AudioConfig {
  background_music?: {
    source: string;
    volume_db: number;                 // -20 to 0
    start_time: number;
    fade_in?: number;
    fade_out?: number;
  };
  narration?: {
    source: string;
    level: number;                     // 0.0 to 1.0 (RunPod worker format)
  };
}

// Subtitle Configuration
export interface SubtitleConfig {
  style: SubtitleStyleName;
  segments: SubtitleSegment[];
  animations?: {
    type: "word_highlight" | "fade_in" | "slide_up";
    timing: "sync_with_audio" | "manual";
  };
}

export interface SubtitleSegment {
  text: string;
  start_time: number;
  end_time: number;
  position: "bottom_center" | "top_center" | "center" | "custom";
  custom_position?: [number, number];
}

// Transition Configuration (Advanced Mode)
export interface TransitionConfig {
  type: "crossfade" | "slide_left" | "slide_right" | "slide_up" | "slide_down";
  duration: number;
  between_beats: [number, number];     // [from_beat, to_beat]
  parameters?: {
    [key: string]: any;
  };
}

// Export Configuration
export interface ExportConfig {
  platform: "tiktok" | "instagram" | "youtube" | "snapchat";
  quality: "high" | "medium" | "low";
  format?: "mp4" | "mov";
  codec?: "h264" | "h265";
}

// Editing Metadata
export interface EditingMetadata {
  editing_mode: "simple" | "advanced";
  total_beats: number;
  estimated_processing_time: number;
  platform_optimizations_applied: string[];
  content_analysis: {
    dominant_mood: string;
    pacing_assessment: "slow" | "medium" | "fast";
    transition_count: number;
    effect_count: number;
  };
}

// =====================================
// API RESPONSE SCHEMAS
// =====================================

export interface EditingAgentResponse {
  success: boolean;
  editing_plan?: EditingPlan;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processing_info: {
    execution_time_ms: number;
    tokens_used: number;
    mode_used: "simple" | "advanced" | "unknown";
    cost_estimate: number;
  };
}

// Error Codes
export type EditingAgentErrorCode = 
  | "INVALID_INPUT"
  | "MISSING_REQUIRED_FIELD"
  | "UNSUPPORTED_PLATFORM"
  | "INVALID_SUBTITLE_STYLE"
  | "CONTENT_ANALYSIS_FAILED"
  | "DURATION_MISMATCH"
  | "OPENROUTER_ERROR"
  | "INTERNAL_ERROR";

// =====================================
// UTILITY TYPES
// =====================================

// Platform-specific constraints
export interface PlatformConstraints {
  max_duration: number;
  resolution: [number, number];
  safe_margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  recommended_fps: number;
}

// Content analysis result
export interface ContentAnalysis {
  video_beats: {
    beat_id: string;
    content_type: "action" | "dialogue" | "landscape" | "close_up" | "transition";
    movement_level: "static" | "slow" | "medium" | "fast";
    mood_indicators: string[];
    suggested_duration: number;
  }[];
  overall_pacing: "slow" | "medium" | "fast";
  recommended_transitions: {
    between: [number, number];
    type: string;
    reason: string;
  }[];
}

// Validation schemas
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// =====================================
// CONSTANTS
// =====================================

export const PLATFORM_SETTINGS = {
  tiktok: {
    max_duration: 60,
    resolution: [1080, 1920] as [number, number],
    safe_margins: { top: 100, right: 40, bottom: 200, left: 40 },
    recommended_fps: 30
  },
  instagram: {
    max_duration: 90,
    resolution: [1080, 1920] as [number, number],
    safe_margins: { top: 150, right: 40, bottom: 250, left: 40 },
    recommended_fps: 30
  },
  youtube: {
    max_duration: 60,
    resolution: [1080, 1920] as [number, number],
    safe_margins: { top: 80, right: 40, bottom: 160, left: 40 },
    recommended_fps: 30
  }
} as const;

export const SUBTITLE_STYLES = [
  "simple_caption", "background_caption", "karaoke_style", "glow_caption",
  "highlight_caption", "deep_diver", "popling_caption", "greengoblin", "sgone_caption"
] as const;

export const TRANSITION_TYPES = [
  "crossfade", "slide_left", "slide_right", "slide_up", "slide_down"
] as const;

export const EFFECT_TYPES = [
  "color_grade", "blur", "brightness", "contrast", "saturation"
] as const;