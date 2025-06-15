/**
 * Unified Agent Schemas for VinVideo_Connected
 * 
 * This file defines standardized JSON field names and data structures
 * across all agents to eliminate inconsistencies and improve reliability.
 * 
 * Based on Vision Enhanced agents as the quality baseline.
 */

// ============================================================================
// STANDARDIZED FIELD NAMING CONVENTIONS
// ============================================================================

/**
 * Duration Fields - All time values in seconds (number type)
 */
export interface StandardDurationFields {
  duration_s: number;                    // Primary duration field (replaces duration, total_duration, target_duration, est_duration_s)
  target_duration_s?: number;           // User-requested duration
  estimated_duration_s?: number;        // Calculated/estimated duration
}

/**
 * Timing Fields - All timing references standardized
 */
export interface StandardTimingFields {
  cut_time_s: number;                   // Cut points in seconds (replaces cut_time, time)
  timecode_start?: string;              // Formatted timecode "HH:MM:SS.mmm"
  timecode_end?: string;                // Formatted timecode "HH:MM:SS.mmm"
}

/**
 * Stage Output Wrapper - Consistent across all pipelines
 */
export interface StandardStageOutput<T> {
  success: boolean;
  needs_clarification: boolean;
  stage_name: string;                   // e.g., "vision_analysis", "producer_output", "director_output"
  stage_number: number;                 // Pipeline position (1-8)
  pipeline_type: "vision_enhanced" | "music_video" | "no_music" | "legacy_script";
  data: T;
  validation: StandardValidation;
  pipeline_ready: boolean;
}

/**
 * Validation - Standardized quality scores
 */
export interface StandardValidation {
  overall_quality_score: number;       // 0-1 overall quality
  technical_completeness_score: number; // 0-1 technical requirements met
  user_requirements_score: number;     // 0-1 user requirements compliance
  content_quality_score: number;       // 0-1 content quality
  coherence_score: number;             // 0-1 logical consistency
  issues: string[];                    // Array of identified issues
}

// ============================================================================
// VISION UNDERSTANDING SCHEMAS (Stage 1)
// ============================================================================

/**
 * Vision Document - Standardized creative blueprint
 * Based on visionUnderstandingWithAudio.ts (quality baseline)
 */
export interface StandardVisionDocument {
  core_concept: string;                 // 5-50 words creative essence
  emotion_arc: string[];               // 3-5 emotions progression
  pacing: "contemplative" | "moderate" | "dynamic" | "fast";
  visual_style: "cinematic" | "documentary" | "artistic" | "minimal";
  detected_artistic_style: string;     // Extracted style or "not_mentioned"
  duration_s: number;                   // Video duration in seconds
  content_classification: {
    type: "narrative_driven" | "concept_driven" | "abstract_thematic" | "narrative_character";
  };
  visual_complexity: "simple" | "moderate" | "complex";
  color_philosophy: string;
  audio_enhancement?: StandardAudioEnhancement; // For audio-enabled pipelines
}

export interface StandardAudioEnhancement {
  audio_mood_hints: string[];
  narration_optimization: {
    vocal_style: "dramatic" | "conversational" | "mysterious" | "inspiring" | "intimate";
    emphasis_points: string[];
    natural_pauses: string[];
    audio_visual_sync: "tight" | "loose" | "atmospheric";
  };
  recommended_voice_characteristics: string;
}

/**
 * Agent Instructions - Standardized downstream guidance
 */
export interface StandardAgentInstructions {
  producer_instructions: {
    target_cut_timing: string;
    pacing_rules: string[];
    audio_analysis_enhancement?: string;
    intelligent_constraints: string[];
  };
  director_instructions: {
    scene_direction_philosophy: string;
    emotional_architecture: string;
    character_relationship_dynamics: string;
    visual_storytelling_mastery: string;
    pacing_and_rhythm_guidance: string;
    environmental_integration: string;
    mandatory_requirements: string[];
    creative_constraints: string[];
    narrative_beats_guidance: string;
    character_elements: string | null;
    setting_requirements: string;
    perspective_requirements: string;
  };
  dop_instructions: {
    mandatory_cinematography: string[];
    technical_constraints: string[];
    lighting_philosophy: string;
    movement_style: string;
    composition_rules: string[];
    artistic_style_support: string;
  };
  prompt_engineer_instructions: {
    mandatory_style: string[];
    visual_consistency_rules: string[];
    character_requirements: string | null;
    setting_details: string;
    forbidden_elements: string[];
    technical_specifications: string;
    artistic_style_enforcement: string;
  };
}

/**
 * Vision Understanding Output Schema
 */
export interface StandardVisionUnderstandingOutput {
  success: boolean;
  needs_clarification: boolean;
  stage1_vision_analysis: {
    vision_document: StandardVisionDocument;
    narration_script?: string;          // For audio-enabled pipelines
    audio_optimization?: {
      concept_speakability: "excellent" | "good" | "fair";
      vocal_performance_potential: "high" | "medium" | "low";
      tts_friendliness: "optimized" | "standard" | "challenging";
      recommended_voice_characteristics: string;
    };
    timing_validation?: {
      target_duration_s: number;
      target_word_count: number;
      actual_word_count: number;
      words_per_second: number;
      duration_compliance: "exact" | "close" | "failed";
    };
    agent_instructions: StandardAgentInstructions;
  };
  validation: StandardValidation;
  pipeline_ready: boolean;
}

// ============================================================================
// PRODUCER SCHEMAS (Stage 2)
// ============================================================================

/**
 * Cut Point - Standardized cut definition
 */
export interface StandardCutPoint {
  cut_number: number;
  cut_time_s: number;                   // Standardized timing field
  reason: string;
  duration_s?: number;                  // Duration of this segment
  sync_info?: StandardSyncInfo;
}

export interface StandardSyncInfo {
  musical_sync?: {
    beat_alignment: boolean;
    bpm: number;
    musical_phrase: string;
  };
  narrative_sync?: {
    story_beat: string;
    emotional_moment: string;
    pacing_purpose: string;
  };
}

/**
 * Producer Output Schema
 */
export interface StandardProducerOutput {
  cut_points: StandardCutPoint[];
  total_duration_s: number;             // Calculated total duration
  target_duration_s: number;            // User-requested duration
  duration_variance: number;            // Percentage variance
  pacing_compliance: boolean;
  cut_count: number;
  average_shot_duration_s: number;      // Average duration per shot
  user_requirements_met: string[];
  synchronization_analysis?: {
    sync_type: "musical" | "narrative" | "none";
    sync_quality_score: number;         // 0-1
    sync_points: number;
  };
}

// ============================================================================
// DIRECTOR SCHEMAS (Stage 3/4)
// ============================================================================

/**
 * Scene Beat - Standardized narrative unit
 */
export interface StandardSceneBeat {
  beat_number: number;
  start_time_s: number;
  end_time_s: number;
  duration_s: number;
  scene_description: string;
  emotional_tone: string;
  character_focus?: string;
  environmental_details: string;
  camera_direction: string;
  narrative_purpose: string;
  synchronization?: StandardSyncInfo;
}

/**
 * Director Output Schema
 */
export interface StandardDirectorOutput {
  scene_beats: StandardSceneBeat[];
  total_duration_s: number;
  narrative_arc: {
    opening: string;
    development: string;
    climax: string;
    resolution: string;
  };
  character_consistency: {
    main_characters: string[];
    character_traits: Record<string, string>;
    relationship_dynamics: string;
  };
  environmental_consistency: {
    primary_setting: string;
    setting_evolution: string;
    environmental_mood: string;
  };
  quality_validation: {
    narrative_coherence_score: number;
    emotional_progression_score: number;
    visual_variety_score: number;
    pacing_effectiveness_score: number;
  };
}

// ============================================================================
// DOP SCHEMAS (Stage 4/5)
// ============================================================================

/**
 * Shot Specification - Standardized cinematography
 */
export interface StandardShotSpec {
  shot_number: number;
  start_time_s: number;
  end_time_s: number;
  duration_s: number;
  camera_movement: string;
  framing: string;
  angle: string;
  lighting: string;
  composition_notes: string;
  gaze_direction?: string;
  technical_specs: {
    focal_length: string;
    depth_of_field: string;
    camera_position: string;
  };
  artistic_direction: {
    mood_lighting: string;
    color_palette: string;
    visual_style_notes: string;
  };
}

/**
 * DoP Output Schema
 */
export interface StandardDoPOutput {
  shot_specifications: StandardShotSpec[];
  total_duration_s: number;
  cinematography_philosophy: string;
  lighting_approach: string;
  movement_strategy: string;
  visual_coherence: {
    style_consistency_score: number;
    lighting_consistency_score: number;
    movement_coherence_score: number;
  };
  technical_requirements: {
    camera_specs: string[];
    lighting_requirements: string[];
    post_production_notes: string[];
  };
}

// ============================================================================
// PROMPT ENGINEER SCHEMAS (Stage 5/6/7)
// ============================================================================

/**
 * Image Prompt - Standardized FLUX prompt
 */
export interface StandardImagePrompt {
  prompt_number: number;
  start_time_s: number;
  end_time_s: number;
  duration_s: number;
  flux_prompt: string;
  negative_prompt?: string;
  style_specifications: {
    artistic_style: string;
    color_palette: string;
    lighting: string;
    composition: string;
  };
  character_consistency: {
    character_descriptions: Record<string, string>;
    relationship_context: string;
  };
  technical_parameters: {
    aspect_ratio: string;
    quality_level: string;
    style_strength: number;
  };
}

/**
 * Prompt Engineer Output Schema
 */
export interface StandardPromptEngineerOutput {
  image_prompts: StandardImagePrompt[];
  total_duration_s: number;
  style_consistency: {
    artistic_style_enforcement: string;
    color_consistency_score: number;
    character_consistency_score: number;
    environmental_consistency_score: number;
  };
  validation_report: {
    prompt_quality_score: number;
    style_coherence_score: number;
    narrative_alignment_score: number;
    technical_compliance_score: number;
  };
  forbidden_elements: string[];
  mandatory_elements: string[];
}

// ============================================================================
// PIPELINE TYPE DEFINITIONS
// ============================================================================

/**
 * Pipeline Stage Mapping
 */
export const PIPELINE_STAGES = {
  vision_enhanced: {
    1: "vision_analysis",
    2: "producer_output", 
    3: "director_output",
    4: "dop_output",
    5: "prompt_engineer_output",
    6: "image_generation"
  },
  music_video: {
    1: "vision_analysis",
    2: "music_analysis", 
    3: "music_producer_output",
    4: "music_director_output", 
    5: "music_dop_output",
    6: "music_prompt_engineer_output",
    7: "image_generation"
  },
  no_music: {
    1: "vision_analysis",
    2: "director_output",
    3: "dop_output", 
    4: "prompt_engineer_output",
    5: "image_generation"
  },
  legacy_script: {
    1: "script_analysis",
    2: "producer_output",
    3: "director_output", 
    4: "dop_output",
    5: "prompt_engineer_output",
    6: "image_generation"
  }
} as const;

/**
 * Pipeline Type Union
 */
export type PipelineType = keyof typeof PIPELINE_STAGES;

/**
 * Stage Name Union
 */
export type StageName = typeof PIPELINE_STAGES[PipelineType][keyof typeof PIPELINE_STAGES[PipelineType]];

// ============================================================================
// MIGRATION MAPPING
// ============================================================================

/**
 * Field Migration Map - Maps old field names to new standardized names
 */
export const FIELD_MIGRATION_MAP = {
  // Duration fields
  "duration": "duration_s",
  "total_duration": "duration_s", 
  "target_duration": "target_duration_s",
  "est_duration_s": "estimated_duration_s",
  
  // Timing fields
  "cut_time": "cut_time_s",
  "time": "cut_time_s",
  
  // Stage output fields
  "stage1_vision_analysis": "vision_analysis",
  "stage2_director_output": "director_output",
  "stage3_dop_output": "dop_output", 
  "stage4_director_output": "director_output",
  "stage4_prompt_engineer_output": "prompt_engineer_output",
  "stage5_dop_output": "dop_output",
  "stage8_video_prompts": "prompt_engineer_output",
  
  // Sync fields
  "musical_sync": "musical_synchronization",
  "narrative_sync": "narrative_synchronization"
} as const;

/**
 * Content Classification Migration
 */
export const CONTENT_CLASSIFICATION_MIGRATION = {
  "abstract_thematic": "concept_driven",
  "narrative_character": "narrative_driven"
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Agent Input Base - Common input structure
 */
export interface StandardAgentInputBase {
  pipeline_type: PipelineType;
  stage_number: number;
  previous_stage_output?: any;
  user_requirements?: {
    duration_s: number;
    pacing: string;
    style_preferences: Record<string, any>;
  };
}

/**
 * Agent Output Base - Common output wrapper
 */
export interface StandardAgentOutputBase<T> extends StandardStageOutput<T> {
  processing_time_ms?: number;
  model_used?: string;
  tokens_used?: {
    input: number;
    output: number;
  };
}

