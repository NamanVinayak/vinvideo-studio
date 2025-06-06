import { NextResponse } from 'next/server';
import { MUSIC_PRODUCER_SYSTEM_MESSAGE } from '@/agents/musicProducer';

/**
 * Music-Aware Producer Agent API endpoint for Music Video Pipeline Stage 3
 * Makes all critical timing decisions that govern the entire video structure
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      vision_document,
      music_analysis,
      user_duration_override
    } = body;

    // Validate required inputs
    if (!vision_document) {
      return NextResponse.json(
        { error: 'Vision document is required from Stage 1' },
        { status: 400 }
      );
    }

    if (!music_analysis) {
      return NextResponse.json(
        { error: 'Music analysis is required from Stage 2' },
        { status: 400 }
      );
    }

    // Validate vision document structure
    const requiredVisionFields = ['duration', 'pacing', 'emotion_arc', 'content_classification'];
    for (const field of requiredVisionFields) {
      if (!vision_document[field]) {
        return NextResponse.json(
          { error: `Vision document missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate music analysis structure
    const requiredMusicFields = ['bpm', 'beats', 'downbeats', 'sections', 'natural_cut_points', 'phrase_boundaries', 'emotional_peaks', 'total_duration'];
    for (const field of requiredMusicFields) {
      if (!music_analysis[field]) {
        return NextResponse.json(
          { error: `Music analysis missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Use duration override if provided, otherwise use vision document duration
    const target_duration = user_duration_override || vision_document.duration;

    // Prepare the producer agent input
    const producer_input = `
VISION DOCUMENT:
Core Concept: ${vision_document.core_concept}
Content Type: ${vision_document.content_classification.type}
Emotion Arc: ${JSON.stringify(vision_document.emotion_arc)}
Duration: ${target_duration} seconds
Pacing: ${vision_document.pacing}
Visual Style: ${vision_document.visual_style}
Music Mood Hints: ${JSON.stringify(vision_document.music_mood_hints)}

MUSIC ANALYSIS:
BPM: ${music_analysis.bpm}
Total Duration: ${music_analysis.total_duration} seconds
Sections: ${JSON.stringify(music_analysis.sections)}
Beat Count: ${music_analysis.beats.length}
Downbeat Count: ${music_analysis.downbeats.length}
Natural Cut Points: ${music_analysis.natural_cut_points.length} available
Phrase Boundaries: ${music_analysis.phrase_boundaries.length} identified
Emotional Peaks: ${JSON.stringify(music_analysis.emotional_peaks)}
Intensity Curve: ${music_analysis.intensity_curve ? 'Available' : 'Not provided'}

PRODUCER TASK:
1. Analyze the music and find the optimal ${target_duration}-second segment that best matches the emotion arc: ${JSON.stringify(vision_document.emotion_arc)}
2. Determine cut strategy based on ${vision_document.pacing} pacing preference and ${music_analysis.bpm} BPM
3. Generate precise cut points that align with musical structure
4. Resolve any conflicts between vision requirements and musical structure
5. Create timing blueprint for downstream agents

Please analyze this music and vision data to make optimal timing decisions.
`;

    // Call OpenRouter API for music producer analysis
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: MUSIC_PRODUCER_SYSTEM_MESSAGE
          },
          {
            role: 'user',
            content: producer_input
          }
        ],
        temperature: 0.3, // Lower temperature for consistent timing decisions
        max_tokens: 12000          // Increased for enhanced scene analysis and detailed timing
      })
    });

    if (!openRouterResponse.ok) {
      const error = await openRouterResponse.text();
      console.error('OpenRouter API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate producer analysis', details: error },
        { status: 500 }
      );
    }

    const openRouterData = await openRouterResponse.json();
    const producerResponse = openRouterData.choices[0].message.content;

    // Parse the JSON response from the producer agent
    let producerOutput;
    try {
      producerOutput = JSON.parse(producerResponse);
    } catch (parseError) {
      console.error('Failed to parse producer response:', parseError);
      console.error('Raw response:', producerResponse);
      return NextResponse.json(
        { error: 'Invalid JSON response from producer agent', raw_response: producerResponse },
        { status: 500 }
      );
    }

    // Validate producer output structure
    const requiredOutputFields = ['segment_selection', 'cut_strategy', 'cut_points', 'timing_blueprint'];
    for (const field of requiredOutputFields) {
      if (!producerOutput[field]) {
        return NextResponse.json(
          { error: `Producer output missing required field: ${field}` },
          { status: 500 }
        );
      }
    }

    // Validate segment selection is within music bounds
    if (producerOutput.segment_selection.end_time > music_analysis.total_duration) {
      return NextResponse.json(
        { error: 'Selected segment exceeds music duration' },
        { status: 500 }
      );
    }

    // Validate cut points are within segment
    const segmentDuration = producerOutput.segment_selection.duration;
    for (const cut of producerOutput.cut_points) {
      if (cut.cut_time > segmentDuration) {
        return NextResponse.json(
          { error: `Cut point at ${cut.cut_time}s exceeds segment duration ${segmentDuration}s` },
          { status: 500 }
        );
      }
    }

    // Add processing metadata
    const responseData = {
      ...producerOutput,
      processing_metadata: {
        stage: 'music_producer',
        timestamp: new Date().toISOString(),
        input_vision_doc: vision_document.core_concept,
        input_music_bpm: music_analysis.bpm,
        target_duration: target_duration,
        cuts_generated: producerOutput.cut_points.length,
        musical_sync_strategy: producerOutput.cut_strategy.sync_approach,
        next_stage: 'music_director'
      },
      stage_output: producerOutput // Standard format for pipeline
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Music Producer Agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}