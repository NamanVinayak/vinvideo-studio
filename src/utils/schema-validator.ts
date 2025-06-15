/**
 * Schema Validator Utility for VinVideo_Connected
 * 
 * Validates agent outputs against unified schemas and provides
 * migration support for legacy field names.
 */

import { 
  StandardStageOutput,
  StandardValidation,
  StandardVisionUnderstandingOutput,
  StandardProducerOutput,
  StandardDirectorOutput,
  StandardDoPOutput,
  StandardPromptEngineerOutput,
  FIELD_MIGRATION_MAP,
  CONTENT_CLASSIFICATION_MIGRATION,
  PipelineType,
  StageName
} from '../schemas/unified-agent-schemas';

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  migratedFields: FieldMigration[];
  qualityScore: number; // 0-1 overall quality
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'performance' | 'compatibility' | 'quality';
}

export interface FieldMigration {
  oldField: string;
  newField: string;
  value: any;
  migrated: boolean;
}

// ============================================================================
// FIELD MIGRATION UTILITIES
// ============================================================================

/**
 * Migrates legacy field names to standardized names
 */
export function migrateFields(data: any): { migratedData: any; migrations: FieldMigration[] } {
  const migrations: FieldMigration[] = [];
  const migratedData = JSON.parse(JSON.stringify(data)); // Deep clone

  function migrateObjectFields(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        migrateObjectFields(item, `${path}[${index}]`);
      });
      return;
    }

    // Migrate field names
    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Check if field needs migration
      if (key in FIELD_MIGRATION_MAP) {
        const newKey = FIELD_MIGRATION_MAP[key as keyof typeof FIELD_MIGRATION_MAP];
        const value = obj[key];
        
        // Migrate the field
        obj[newKey] = value;
        delete obj[key];
        
        migrations.push({
          oldField: fullPath,
          newField: path ? `${path}.${newKey}` : newKey,
          value,
          migrated: true
        });
      }
      
      // Migrate content classification values
      if (key === 'content_classification' && obj[key]?.type) {
        const oldType = obj[key].type;
        if (oldType in CONTENT_CLASSIFICATION_MIGRATION) {
          const newType = CONTENT_CLASSIFICATION_MIGRATION[oldType as keyof typeof CONTENT_CLASSIFICATION_MIGRATION];
          obj[key].type = newType;
          
          migrations.push({
            oldField: `${fullPath}.type`,
            newField: `${fullPath}.type`,
            value: newType,
            migrated: true
          });
        }
      }
      
      // Recursively process nested objects
      if (obj[key] && typeof obj[key] === 'object') {
        migrateObjectFields(obj[key], fullPath);
      }
    });
  }

  migrateObjectFields(migratedData);
  return { migratedData, migrations };
}

/**
 * Standardizes stage output wrapper structure
 */
export function standardizeStageOutput<T>(
  data: any,
  stageName: StageName,
  stageNumber: number,
  pipelineType: PipelineType
): StandardStageOutput<T> {
  // If already in standard format, return as-is
  if (data.success !== undefined && data.stage_name !== undefined) {
    return data as StandardStageOutput<T>;
  }

  // Extract core data (remove stage wrapper if present)
  let coreData = data;
  const stageKeys = Object.keys(data).filter(key => 
    key.startsWith('stage') && key.includes('_output') || 
    key.includes('_analysis')
  );
  
  if (stageKeys.length === 1) {
    coreData = data[stageKeys[0]];
  }

  // Create standard wrapper
  return {
    success: data.success ?? true,
    needs_clarification: data.needs_clarification ?? false,
    stage_name: stageName,
    stage_number: stageNumber,
    pipeline_type: pipelineType,
    data: coreData,
    validation: data.validation || createDefaultValidation(),
    pipeline_ready: data.pipeline_ready ?? true
  };
}

function createDefaultValidation(): StandardValidation {
  return {
    overall_quality_score: 0.8,
    technical_completeness_score: 0.8,
    user_requirements_score: 0.8,
    content_quality_score: 0.8,
    coherence_score: 0.8,
    issues: []
  };
}

// ============================================================================
// SCHEMA VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates required fields exist and have correct types
 */
export function validateRequiredFields(data: any, requiredFields: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];

  Object.entries(requiredFields).forEach(([field, expectedType]) => {
    const value = getNestedValue(data, field);
    
    if (value === undefined || value === null) {
      errors.push({
        field,
        message: `Required field '${field}' is missing`,
        severity: 'critical',
        suggestedFix: `Add field '${field}' with type '${expectedType}'`
      });
    } else if (!isCorrectType(value, expectedType)) {
      errors.push({
        field,
        message: `Field '${field}' has incorrect type. Expected '${expectedType}', got '${typeof value}'`,
        severity: 'high',
        suggestedFix: `Convert '${field}' to type '${expectedType}'`
      });
    }
  });

  return errors;
}

/**
 * Validates duration fields consistency
 */
export function validateDurationFields(data: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const durationFields = [
    'duration_s',
    'target_duration_s', 
    'estimated_duration_s',
    'total_duration_s'
  ];
  
  const foundDurations: Record<string, number> = {};
  
  // Collect all duration values
  durationFields.forEach(field => {
    const value = getNestedValue(data, field);
    if (typeof value === 'number') {
      foundDurations[field] = value;
    }
  });
  
  // Validate duration consistency
  const values = Object.values(foundDurations);
  if (values.length > 1) {
    const maxDiff = Math.max(...values) - Math.min(...values);
    const avgDuration = values.reduce((sum, val) => sum + val, 0) / values.length;
    const tolerance = avgDuration * 0.1; // 10% tolerance
    
    if (maxDiff > tolerance) {
      errors.push({
        field: 'duration_fields',
        message: `Duration field values are inconsistent: ${JSON.stringify(foundDurations)}`,
        severity: 'high',
        suggestedFix: 'Ensure all duration fields use the same value or have a clear relationship'
      });
    }
  }
  
  // Validate duration values are positive
  Object.entries(foundDurations).forEach(([field, value]) => {
    if (value <= 0) {
      errors.push({
        field,
        message: `Duration field '${field}' must be positive, got ${value}`,
        severity: 'critical',
        suggestedFix: `Set '${field}' to a positive number`
      });
    }
    
    if (value > 300) { // 5 minutes seems reasonable max
      errors.push({
        field,
        message: `Duration field '${field}' seems unusually large: ${value} seconds`,
        severity: 'medium',
        suggestedFix: `Verify '${field}' value is in seconds, not milliseconds`
      });
    }
  });
  
  return errors;
}

/**
 * Validates timing fields consistency
 */
export function validateTimingFields(data: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Look for arrays with timing information
  const timingArrays = ['cut_points', 'scene_beats', 'shot_specifications', 'image_prompts'];
  
  timingArrays.forEach(arrayField => {
    const array = getNestedValue(data, arrayField);
    if (Array.isArray(array)) {
      array.forEach((item, index) => {
        // Validate timing field presence
        const hasStartTime = typeof getNestedValue(item, 'start_time_s') === 'number';
        const hasEndTime = typeof getNestedValue(item, 'end_time_s') === 'number';
        const hasCutTime = typeof getNestedValue(item, 'cut_time_s') === 'number';
        const hasDuration = typeof getNestedValue(item, 'duration_s') === 'number';
        
        if (!hasStartTime && !hasCutTime) {
          errors.push({
            field: `${arrayField}[${index}]`,
            message: `Item missing timing field (start_time_s or cut_time_s)`,
            severity: 'high',
            suggestedFix: 'Add start_time_s or cut_time_s field'
          });
        }
        
        // Validate timing logic
        if (hasStartTime && hasEndTime) {
          const startTime = getNestedValue(item, 'start_time_s');
          const endTime = getNestedValue(item, 'end_time_s');
          const duration = getNestedValue(item, 'duration_s');
          
          if (endTime <= startTime) {
            errors.push({
              field: `${arrayField}[${index}]`,
              message: `End time (${endTime}) must be greater than start time (${startTime})`,
              severity: 'critical',
              suggestedFix: 'Ensure end_time_s > start_time_s'
            });
          }
          
          if (hasDuration) {
            const calculatedDuration = endTime - startTime;
            const tolerance = 0.1; // 0.1 second tolerance
            
            if (Math.abs(calculatedDuration - duration) > tolerance) {
              errors.push({
                field: `${arrayField}[${index}]`,
                message: `Duration mismatch: calculated ${calculatedDuration}s, specified ${duration}s`,
                severity: 'medium',
                suggestedFix: 'Ensure duration_s = end_time_s - start_time_s'
              });
            }
          }
        }
      });
    }
  });
  
  return errors;
}

/**
 * Validates pipeline-specific requirements
 */
export function validatePipelineRequirements(
  data: any, 
  pipelineType: PipelineType, 
  stageName: StageName
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Vision Enhanced Pipeline Requirements
  if (pipelineType === 'vision_enhanced') {
    if (stageName === 'vision_analysis') {
      const required = {
        'stage1_vision_analysis.vision_document.core_concept': 'string',
        'stage1_vision_analysis.vision_document.duration_s': 'number',
        'stage1_vision_analysis.agent_instructions': 'object'
      };
      errors.push(...validateRequiredFields(data, required));
    }
    
    if (stageName === 'producer_output') {
      const required = {
        'cut_points': 'array',
        'total_duration_s': 'number',
        'target_duration_s': 'number'
      };
      errors.push(...validateRequiredFields(data, required));
    }
  }
  
  // Music Video Pipeline Requirements
  if (pipelineType === 'music_video') {
    if (stageName === 'music_producer_output') {
      const musicSync = getNestedValue(data, 'synchronization_analysis.sync_type');
      if (musicSync !== 'musical') {
        errors.push({
          field: 'synchronization_analysis.sync_type',
          message: `Music pipeline must have musical synchronization, got '${musicSync}'`,
          severity: 'high',
          suggestedFix: 'Set sync_type to "musical" for music video pipeline'
        });
      }
    }
  }
  
  return errors;
}

// ============================================================================
// MAIN VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates Vision Understanding output
 */
export function validateVisionUnderstandingOutput(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Migrate fields first
  const { migratedData, migrations } = migrateFields(data);
  
  // Validate required structure
  const required = {
    'success': 'boolean',
    'stage1_vision_analysis.vision_document.core_concept': 'string',
    'stage1_vision_analysis.vision_document.duration_s': 'number',
    'stage1_vision_analysis.agent_instructions': 'object'
  };
  
  errors.push(...validateRequiredFields(migratedData, required));
  errors.push(...validateDurationFields(migratedData));
  
  // Validate agent instructions completeness
  const instructions = getNestedValue(migratedData, 'stage1_vision_analysis.agent_instructions');
  if (instructions) {
    const requiredInstructions = [
      'producer_instructions',
      'director_instructions', 
      'dop_instructions',
      'prompt_engineer_instructions'
    ];
    
    requiredInstructions.forEach(instrType => {
      if (!instructions[instrType]) {
        errors.push({
          field: `stage1_vision_analysis.agent_instructions.${instrType}`,
          message: `Missing required instruction type: ${instrType}`,
          severity: 'high',
          suggestedFix: `Add ${instrType} object with appropriate fields`
        });
      }
    });
  }
  
  const qualityScore = calculateQualityScore(errors, warnings);
  
  return {
    isValid: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    warnings,
    migratedFields: migrations,
    qualityScore
  };
}

/**
 * Validates Producer output
 */
export function validateProducerOutput(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const { migratedData, migrations } = migrateFields(data);
  
  const required = {
    'cut_points': 'array',
    'total_duration_s': 'number',
    'target_duration_s': 'number'
  };
  
  errors.push(...validateRequiredFields(migratedData, required));
  errors.push(...validateDurationFields(migratedData));
  errors.push(...validateTimingFields(migratedData));
  
  // Validate cut points
  const cutPoints = getNestedValue(migratedData, 'cut_points');
  if (Array.isArray(cutPoints)) {
    cutPoints.forEach((cut, index) => {
      if (typeof cut.cut_time_s !== 'number') {
        errors.push({
          field: `cut_points[${index}].cut_time_s`,
          message: 'Cut point missing cut_time_s field',
          severity: 'critical',
          suggestedFix: 'Add cut_time_s field with numeric value'
        });
      }
    });
    
    // Validate cut points are in order
    for (let i = 1; i < cutPoints.length; i++) {
      const prevTime = cutPoints[i-1].cut_time_s;
      const currTime = cutPoints[i].cut_time_s;
      
      if (currTime <= prevTime) {
        errors.push({
          field: `cut_points[${i}]`,
          message: `Cut points must be in chronological order`,
          severity: 'high',
          suggestedFix: 'Sort cut points by cut_time_s'
        });
      }
    }
  }
  
  const qualityScore = calculateQualityScore(errors, warnings);
  
  return {
    isValid: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    warnings, 
    migratedFields: migrations,
    qualityScore
  };
}

/**
 * Validates any agent output against unified schema
 */
export function validateAgentOutput(
  data: any,
  pipelineType: PipelineType,
  stageName: StageName,
  stageNumber: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const { migratedData, migrations } = migrateFields(data);
  
  // Standard validation
  errors.push(...validateDurationFields(migratedData));
  errors.push(...validateTimingFields(migratedData));
  errors.push(...validatePipelineRequirements(migratedData, pipelineType, stageName));
  
  // Specific validations based on stage
  switch (stageName) {
    case 'vision_analysis':
      const visionResult = validateVisionUnderstandingOutput(migratedData);
      errors.push(...visionResult.errors);
      warnings.push(...visionResult.warnings);
      break;
      
    case 'producer_output':
      const producerResult = validateProducerOutput(migratedData);
      errors.push(...producerResult.errors);
      warnings.push(...producerResult.warnings);
      break;
      
    // Add more specific validations as needed
  }
  
  const qualityScore = calculateQualityScore(errors, warnings);
  
  return {
    isValid: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    warnings,
    migratedFields: migrations,
    qualityScore
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[') && key.includes(']')) {
      const [arrayKey, indexStr] = key.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      return current?.[arrayKey]?.[index];
    }
    return current?.[key];
  }, obj);
}

function isCorrectType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

function calculateQualityScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
  let score = 1.0;
  
  errors.forEach(error => {
    switch (error.severity) {
      case 'critical':
        score -= 0.3;
        break;
      case 'high':
        score -= 0.2;
        break;
      case 'medium':
        score -= 0.1;
        break;
      case 'low':
        score -= 0.05;
        break;
    }
  });
  
  warnings.forEach(warning => {
    score -= 0.02;
  });
  
  return Math.max(0, score);
}

export default {
  migrateFields,
  standardizeStageOutput,
  validateVisionUnderstandingOutput,
  validateProducerOutput,
  validateAgentOutput,
  validateRequiredFields,
  validateDurationFields,
  validateTimingFields
};