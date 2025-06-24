/**
 * Example usage of MusicUserContext in music video pipeline agents
 * This file demonstrates how to integrate the MusicUserContext interface
 */

import { MusicUserContext } from './musicUserContext';

/**
 * Example: Music Producer Agent using MusicUserContext
 */
export async function musicProducerAgent(input: any) {
  const { userContext, previousAgentOutputs } = input;
  
  // Access user preferences
  const { settings, constraints } = userContext;
  
  // Use music-specific settings
  const syncTightness = settings.syncPreferences.syncTightness;
  const narrativeApproach = settings.narrativeApproach || 'abstract';
  const genreAwareness = settings.genreAwareness || 'auto-detect';
  
  // Access music analysis if available
  const musicAnalysis = userContext.musicAnalysis;
  
  // Make decisions based on constraints
  if (constraints.mustSyncToBeats && musicAnalysis) {
    // Align cut points with beats/downbeats
    const cutPoints = alignCutsWithBeats(
      musicAnalysis.beats,
      musicAnalysis.downbeats,
      syncTightness
    );
    
    // Respect musical sections if required
    if (constraints.mustRespectSections) {
      // Adjust cuts to avoid crossing section boundaries
      adjustCutsForSections(cutPoints, musicAnalysis.sections);
    }
  }
  
  // Example output structure
  return {
    selectedSegment: {
      startTime: 30.5,
      endTime: 60.5,
      duration: 30,
      selectionReason: "Chorus section with peak energy matching user's intense visual preference",
      musicalContext: "Second chorus with dynamic build-up"
    },
    cutStrategy: {
      totalCuts: 12,
      averageCutLength: 2.5,
      syncApproach: syncTightness === 'perfect' ? 'beat-aligned' : 'phrase-aligned',
      cutPoints: [
        {
          cutNumber: 1,
          cutTime: 30.5,
          reason: "Section start - chorus entry",
          musicContext: "Downbeat of chorus",
          recommendedTransition: "Hard cut on beat"
        }
        // ... more cut points
      ]
    }
  };
}

/**
 * Example: Creating MusicUserContext from UI form data
 */
export function createMusicUserContext(formData: any): MusicUserContext {
  return {
    // Original prompt from user
    originalPrompt: formData.concept,
    
    // User settings from UI
    settings: {
      duration: formData.duration,
      pacing: formData.pacing,
      visualStyle: formData.style,
      contentType: formData.contentType,
      
      // Music-specific settings
      musicSource: formData.audioFile ? {
        type: 'upload',
        file: formData.audioFile,
        fileName: formData.audioFileName
      } : {
        type: 'auto'
      },
      
      narrativeApproach: formData.narrativeApproach || 'abstract',
      visualIntensity: formData.visualIntensity || 'moderate',
      genreAwareness: formData.genreAwareness || 'auto-detect',
      
      syncPreferences: {
        syncTightness: formData.syncTightness || 'moderate',
        respectPhrases: formData.respectPhrases !== false,
        tempoAdaptation: formData.tempoAdaptation || 'subtle',
        rhythmicCamera: formData.rhythmicCamera !== false
      }
    },
    
    // Pipeline metadata
    pipeline: {
      mode: 'music_video',
      timestamp: new Date().toISOString(),
      sessionId: `music-video-${Date.now()}`
    },
    
    // Constraints
    constraints: {
      mustMatchDuration: true,
      durationTolerance: 5,
      mustSyncToBeats: formData.syncTightness !== 'loose',
      mustRespectSections: true,
      maxCutsPerMinute: formData.pacing === 'fast' ? 40 : formData.pacing === 'medium' ? 20 : 10,
      minCutDuration: formData.pacing === 'fast' ? 1 : formData.pacing === 'medium' ? 2 : 3,
      avoidJumpCuts: true,
      maintainVisualFlow: true,
      preventRepetition: true
    }
  };
}

/**
 * Example: Validating agent compliance with MusicUserContext
 */
export function validateAgentOutput(
  output: any,
  userContext: MusicUserContext
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check duration compliance
  if (userContext.constraints.mustMatchDuration) {
    const tolerance = userContext.constraints.durationTolerance / 100;
    const targetDuration = userContext.settings.duration;
    const actualDuration = output.duration || 0;
    
    if (Math.abs(actualDuration - targetDuration) > targetDuration * tolerance) {
      issues.push(`Duration ${actualDuration}s exceeds ${tolerance * 100}% tolerance of target ${targetDuration}s`);
    }
  }
  
  // Check beat synchronization
  if (userContext.constraints.mustSyncToBeats && userContext.musicAnalysis) {
    const beats = userContext.musicAnalysis.beats;
    const cutTimes = output.cutPoints?.map((cp: any) => cp.cutTime) || [];
    
    for (const cutTime of cutTimes) {
      const nearestBeat = findNearestBeat(cutTime, beats);
      if (Math.abs(cutTime - nearestBeat) > 0.1) { // 100ms tolerance
        issues.push(`Cut at ${cutTime}s not aligned with beat at ${nearestBeat}s`);
      }
    }
  }
  
  // Check cut frequency
  if (userContext.constraints.maxCutsPerMinute) {
    const cutsPerMinute = (output.cutPoints?.length || 0) / (userContext.settings.duration / 60);
    if (cutsPerMinute > userContext.constraints.maxCutsPerMinute) {
      issues.push(`${cutsPerMinute} cuts/minute exceeds limit of ${userContext.constraints.maxCutsPerMinute}`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Helper functions (simplified examples)
function alignCutsWithBeats(beats: number[], downbeats: number[], syncTightness: string): any[] {
  // Implementation would align cuts based on sync tightness preference
  return [];
}

function adjustCutsForSections(cutPoints: any[], sections: any): void {
  // Implementation would adjust cuts to respect musical sections
}

function findNearestBeat(time: number, beats: number[]): number {
  // Implementation would find the nearest beat to a given time
  return beats.reduce((prev, curr) => 
    Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
  );
}