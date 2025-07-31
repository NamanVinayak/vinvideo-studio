import { NextResponse } from 'next/server';
import { passThroughRawJson } from '@/utils/passThroughRawJson';
import { saveApiResponse, generateSessionId } from '@/utils/responseSaver';
import type { 
  EditingAgentInput, 
  EditingAgentResponse, 
  DirectorOutput,
  UserContext 
} from '@/schemas/editing-agent-schemas';

/**
 * VinVideo Editing Agent - Post-Production Decision Making
 * Transforms video beats into comprehensive editing plans for Movis pipeline
 */

// Dynamic Aspect Ratio Resolution Mapping
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },  // TikTok, Instagram Reels, YouTube Shorts
  "16:9": { width: 1920, height: 1080 },  // YouTube Standard, TV, Desktop
  "4:5": { width: 1080, height: 1350 },   // Instagram Feed Portrait
  "1:1": { width: 1080, height: 1080 },   // Instagram Square, Twitter
  "21:9": { width: 2560, height: 1080 },  // Cinematic Ultra-wide
  "3:2": { width: 1080, height: 720 }     // Classic Photography Ratio
};

/**
 * Calculate center position coordinates for given aspect ratio
 */
function getCenterPosition(aspectRatio: string): [number, number] {
  const resolution = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP["9:16"]; // Default fallback
  return [resolution.width / 2, resolution.height / 2];
}

// Import the comprehensive system message
const EDITING_AGENT_SYSTEM_MESSAGE = `
# VinVideo Editing Agent - Complete System Message

You are **VinVideo Editing Agent v1**, an advanced AI video editor specialized in transforming individual video beats into cohesive, professionally edited final videos. Your mission is to analyze video content and create precise JSON editing plans that the Movis video processing pipeline can execute.

## **CORE IDENTITY & CAPABILITIES**

You are an expert post-production editor with:
- **Content Analysis Intelligence**: Understand video content through image/video prompts
- **Technical Precision**: Generate perfect JSON compatible with VinVideo Movis pipeline
- **Creative Decision Making**: Apply directorial vision to editing choices
- **Platform Expertise**: Optimize for TikTok, Instagram, YouTube engagement
- **Two-Mode Operation**: Simple alignment vs advanced creative editing

## **TWO-MODE OPERATION SYSTEM**

### **SIMPLE MODE (advancedMode: false)**

**Purpose**: Clean, professional video assembly without effects
**Use Cases**: Testing, client preview, minimalist content

**Editing Approach**:
- Focus on seamless video sequencing
- Optimize timing based on content analysis
- Apply clean cuts between beats
- Use opacity and blending for smooth transitions
- Position elements within platform safe zones
- NO transitions, effects, or complex animations

### **ADVANCED MODE (advancedMode: true)**

**Purpose**: Creative, engaging video with sophisticated effects
**Use Cases**: Final production, marketing content, creative projects

**Editing Approach**:
- Analyze content for creative editing opportunities
- Apply intelligent transitions based on content flow
- Use effects that enhance narrative and engagement
- Implement dynamic timing and pacing
- Creative subtitle animations
- Platform-specific optimization

## **CONTENT ANALYSIS FRAMEWORK**

### **Understanding Video Content Through Prompts**

Use image and video prompts to understand what's actually happening:

**Image Prompt Analysis**:
- Scene composition and subjects
- Lighting and mood indicators
- Action and movement cues
- Visual elements and props

**Video Prompt Analysis**:
- Camera movements added during conversion
- Dynamic elements and motion
- Pacing and rhythm of movement
- Transition points and flow

## **DYNAMIC ASPECT RATIO POSITIONING**

**CRITICAL: All position coordinates must be calculated dynamically based on the target aspect ratio:**

**Supported Aspect Ratios & Center Positions:**
- **9:16** (1080×1920) → Center: [540, 960] → TikTok, Instagram Reels, YouTube Shorts
- **16:9** (1920×1080) → Center: [960, 540] → YouTube Standard, TV, Desktop
- **4:5** (1080×1350) → Center: [540, 675] → Instagram Feed Portrait  
- **1:1** (1080×1080) → Center: [540, 540] → Instagram Square, Twitter
- **21:9** (2560×1080) → Center: [1280, 540] → Cinematic Ultra-wide
- **3:2** (1080×720) → Center: [540, 360] → Classic Photography

**POSITIONING RULES:**
1. **Center Position**: Always use the exact center coordinates for the target aspect ratio
2. **Dynamic Calculation**: Position = [width/2, height/2] for the specified format
3. **No Hardcoding**: Never use fixed coordinates like [960, 540] - always use the dynamic center
4. **Aspect Ratio Source**: The target aspect ratio will be provided in the projectMetadata

## **REQUIRED JSON OUTPUT SCHEMA**

Your output must be compatible with the VinVideo Movis pipeline:

\`\`\`json
{
  "composition": {
    "format": "9:16|16:9|4:5|1:1",
    "duration": number,
    "fps": 30,
    "background_color": [r, g, b]
  },
  "layers": [
    {
      "type": "image",  // CRITICAL: Always use "image" for PNG files (.png), "video" for MP4 files (.mp4)
      "name": "Beat 1",  // REQUIRED: Descriptive name for the layer
      "source": "s3://vinvideo/input/project-id/beat_1.png",
      "start_time": 0.0,
      "end_time": 3.0,
      "position": [CENTER_X, CENTER_Y],  // DYNAMIC: Use center coordinates based on aspect ratio
      "scale": 1.0,
      "rotation": 0,
      "opacity": 1.0,
      "animations": {  // REQUIRED: Add smooth opacity transitions
        "opacity": {
          "keyframes": [0.0, 1.0, 2.0, 3.0],
          "values": [0.0, 1.0, 1.0, 0.0],
          "easings": ["ease_in", "linear", "ease_out"]
        }
      }
    }
  ],
  "audio": {
    "narration": {
      "source": "audio.wav",
      "level": 0.0
    }
  },
  "subtitles": {
    "style": "user_selected_style",
    "segments": [...]
  },
  "transitions": [...], // Advanced mode only
  "export": {
    "platform": "tiktok|instagram|youtube",
    "quality": "high|medium|low"
  }
}
\`\`\`

## **PLATFORM-SPECIFIC OPTIMIZATIONS**

**TikTok (9:16)**:
- Resolution: 1080x1920
- Safe margins: top 100px, bottom 200px, sides 40px
- Max duration: 60 seconds
- High engagement pacing

**Instagram Reel (9:16)**:
- Resolution: 1080x1920  
- Safe margins: top 150px, bottom 250px, sides 40px
- Max duration: 90 seconds
- Story-driven pacing

**YouTube Shorts (9:16)**:
- Resolution: 1080x1920
- Safe margins: top 80px, bottom 160px, sides 40px
- Max duration: 60 seconds
- Educational pacing

## **TIMING PRIORITY SYSTEM**

### **CRITICAL: Producer Timing Takes Priority**
When both producerOutput and directorOutput are provided:
- **TIMING SOURCE**: Use producerOutput.cut_points for exact start_time/end_time values
- **CONTEXT SOURCE**: Use directorOutput.narrative_beats for creative vision, names, and context
- **DURATION SOURCE**: Use producerOutput.total_duration_s for final video duration

### **Timing Priority Rules:**
1. **Producer cuts available**: Use exact cut_time_s values from producerOutput
2. **Only director timing**: Use directorOutput.narrative_beats timecode_start
3. **Fallback**: Use default 3-second intervals

Producer cuts provide precise audio synchronization - NEVER override these timings.

## **DECISION-MAKING PROCESS**

### **Step 1: Content Analysis**
1. Analyze image prompts to understand scene composition
2. Analyze video prompts to understand movement and pacing
3. Review director output for creative intent and emotional tone
4. Check producer output for precise timing requirements
5. Consider user context for style preferences

### **Step 2: Mode-Specific Planning**
**Simple Mode**:
- Focus on clean cuts and timing
- Optimize for content flow without effects
- Ensure platform safe zone compliance

**Advanced Mode**:
- Identify creative enhancement opportunities
- Select appropriate transitions and effects
- Apply content-aware animations

### **Step 3: Technical Implementation**
1. Structure JSON with required schema
2. Calculate precise timing and positioning
3. Apply platform-specific optimizations
4. Validate subtitle integration

### **Step 4: Quality Assurance**
- Ensure all layer timings align correctly
- Verify platform requirements are met
- Check subtitle style matches user selection
- Validate JSON schema compatibility

## **OUTPUT REQUIREMENTS**

### **Response Format**
Always respond with valid JSON only. No explanations or additional text.

### **Quality Standards**
- Professional editing principles
- Platform optimization
- User preference compliance
- Technical precision
- Engagement optimization

### **Error Prevention**
- All file sources must reference provided S3 video files
- Timing must not exceed total duration
- Positions must respect platform safe zones
- Effects only in advanced mode
- Subtitle style must match user selection

You are now ready to receive video editing requests and generate precise, professional editing plans that transform individual video beats into cohesive, engaging final videos.
`;

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json() as EditingAgentInput;
    const { 
      s3VideoFiles,
      directorOutput,
      producerOutput,
      imagePrompts,
      videoPrompts,
      userContextDocument,
      subtitleStyle,
      advancedMode,
      projectMetadata
    } = body;
    
    // Validate required inputs
    if (!s3VideoFiles || s3VideoFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELD',
          message: 'S3 video files are required'
        }
      } as EditingAgentResponse, { status: 400 });
    }

    if (!directorOutput || !projectMetadata) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Director output and project metadata are required'
        }
      } as EditingAgentResponse, { status: 400 });
    }

    if (!subtitleStyle) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Subtitle style selection is required'
        }
      } as EditingAgentResponse, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'OPENROUTER_ERROR',
          message: 'OpenRouter API key is not configured'
        }
      } as EditingAgentResponse, { status: 500 });
    }
    
    console.log('🎬 Calling Editing Agent for video assembly...');
    console.log(`S3 Video Files: ${s3VideoFiles.length} beats`);
    console.log(`Mode: ${advancedMode ? 'Advanced' : 'Simple'}`);
    console.log(`Platform: ${projectMetadata.target_platform}`);
    console.log(`Subtitle Style: ${subtitleStyle}`);
    console.log(`Duration Target: ${projectMetadata.total_duration}s`);
    console.log(`Producer Output: ${producerOutput ? `${producerOutput.cut_points?.length || 0} cut points, ${producerOutput.total_duration_s}s` : 'None'}`);
    
    // Prepare comprehensive content analysis prompt
    const contentAnalysisSection = `
📹 VIDEO BEAT ANALYSIS:
Total Video Files: ${s3VideoFiles.length}
S3 File Paths: ${s3VideoFiles.map((file, i) => `Beat ${i+1}: ${file}`).join('\n')}

🎨 IMAGE PROMPT CONTEXT (Understanding Visual Content):
${Object.entries(imagePrompts).map(([beatId, prompts]) => `
${beatId}:
- Image Prompt: "${prompts.image_prompt}"
- Final Image Prompt: "${prompts.final_image_prompt}"
`).join('')}

🎥 VIDEO PROMPT CONTEXT (Understanding Movement & Pacing):
${Object.entries(videoPrompts).map(([beatId, prompts]) => `
${beatId}:
- Video Conversion: "${prompts.video_prompt}"
`).join('')}
`;

    const creativeDirectionSection = `
🎭 DIRECTOR'S CREATIVE VISION:
Content Type: ${directorOutput.project_metadata.content_type}
Target Platform: ${directorOutput.project_metadata.target_platform}
Primary Concept: ${directorOutput.project_metadata.primary_concept}

Narrative Beats Analysis:
${directorOutput.narrative_beats.map(beat => `
Beat ${beat.beat_no} (${beat.timecode_start}):
- Script: "${beat.script_phrase}"
- Function: ${beat.narrative_function}
- Emotional Tone: ${beat.emotional_tone}
- Creative Vision: "${beat.creative_vision}"
- Retention Strategy: ${beat.audience_retention_strategy}
- Turning Point: ${beat.turning_point}
`).join('')}
`;

    const userContextSection = userContextDocument ? `
👤 USER CONTEXT & PREFERENCES:
Original Request: "${userContextDocument.originalPrompt}"
Duration Target: ${userContextDocument.projectSettings.duration}s
Style Preference: ${userContextDocument.projectSettings.style_preference}
Pacing: ${userContextDocument.projectSettings.pacing_preference}
Target Audience: ${userContextDocument.projectSettings.target_audience}
Platform: ${userContextDocument.platformSettings.primary_platform}
Aspect Ratio: ${userContextDocument.platformSettings.aspect_ratio}
Transition Style: ${userContextDocument.contentPreferences.transition_style}
Effect Intensity: ${userContextDocument.contentPreferences.effect_intensity}
` : '';

    const technicalSpecsSection = `
⚙️ TECHNICAL SPECIFICATIONS:
Project ID: ${projectMetadata.project_id}
Total Duration: ${projectMetadata.total_duration}s
Target Platform: ${projectMetadata.target_platform}
Aspect Ratio: ${projectMetadata.aspect_ratio}
Frame Rate: ${projectMetadata.fps} fps

🎯 CENTER POSITION FOR THIS ASPECT RATIO: ${JSON.stringify(getCenterPosition(projectMetadata.aspect_ratio))}
📐 RESOLUTION: ${JSON.stringify(ASPECT_RATIO_MAP[projectMetadata.aspect_ratio] || ASPECT_RATIO_MAP["9:16"])}
User-Selected Subtitle Style: "${subtitleStyle}"

🎛️ EDITING MODE: ${advancedMode ? 'ADVANCED' : 'SIMPLE'}
${advancedMode ? 
  '- Apply creative transitions and effects\n- Content-aware animations\n- Sophisticated editing techniques' : 
  '- Focus on clean alignment only\n- NO transitions or effects\n- Simple, professional cuts'
}
`;

    // Add producer timing section if available
    const producerTimingSection = producerOutput?.cut_points ? `
🎵 PRODUCER TIMING (PRIORITY SOURCE):
Total Duration: ${producerOutput.total_duration_s}s
Target Duration: ${producerOutput.target_duration_s}s
Cut Count: ${producerOutput.cut_count}
Average Shot Duration: ${producerOutput.average_shot_duration_s}s

Producer Cut Points (USE THESE EXACT TIMINGS):
${producerOutput.cut_points.map((cut, i) => 
  `Beat ${i+1}: Start at ${cut.cut_time_s}s (${cut.reason})`
).join('\n')}

⚠️ CRITICAL: Use these exact cut_time_s values for layer start_time/end_time
Duration between cuts = next cut_time_s - current cut_time_s
Last beat duration = total_duration_s - last cut_time_s
` : '';

    const userContent = `${contentAnalysisSection}

${producerTimingSection}

${creativeDirectionSection}

${userContextSection}

${technicalSpecsSection}

TASK: ${producerOutput?.cut_points ? 'Use producer cut points for precise timing, director output for creative context.' : 'Analyze the provided video content through the image/video prompts and director\'s vision to create a comprehensive editing plan.'} Generate a complete JSON editing plan that transforms these individual video beats into a cohesive, professionally edited final video.

CRITICAL REQUIREMENTS:
${producerOutput?.cut_points ? '1. USE PRODUCER CUT POINTS: Apply exact cut_time_s values for layer timing (NEVER override these)\n2. ' : '1. '}Use the exact S3 video file names provided in the "source" fields
${producerOutput?.cut_points ? '3. ' : '2. '}Respect the ${advancedMode ? 'advanced' : 'simple'} mode constraints
${producerOutput?.cut_points ? '4. ' : '3. '}Apply the user-selected subtitle style: "${subtitleStyle}"
${producerOutput?.cut_points ? '5. ' : '4. '}Optimize for platform: ${projectMetadata.target_platform}
${producerOutput?.cut_points ? '6. ' : '5. '}Total duration must match producer duration: ${producerOutput?.total_duration_s || projectMetadata.total_duration}s
${producerOutput?.cut_points ? '7. ' : '6. '}Use the director's creative vision to inform editing decisions
${producerOutput?.cut_points ? '8. ' : '7. '}Consider image/video prompts to understand actual content

Generate the complete JSON editing plan now:`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-pro", // Good for structured JSON output
      messages: [
        {
          role: "system",
          content: EDITING_AGENT_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 8000,
      temperature: 0.3,              // Lower temperature for consistent JSON structure
      top_p: 0.9,
      stream: false,
      response_format: { type: "json_object" }  // Ensure JSON output
    };

    // Make the API request to OpenRouter
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Editing Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Editing Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      // Handle rate limits
      if (response.status === 429) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'OPENROUTER_ERROR',
            message: 'Rate limited. Please try again later.',
            details: { retryAfter: response.headers.get('X-RateLimit-Reset') }
          },
          processing_info: {
            execution_time_ms: executionTime,
            tokens_used: 0,
            mode_used: advancedMode ? 'advanced' : 'simple',
            cost_estimate: 0
          }
        } as EditingAgentResponse, { status: 429 });
      }
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'OPENROUTER_ERROR',
          message: `API request failed: ${response.status}`,
          details: errorData
        },
        processing_info: {
          execution_time_ms: executionTime,
          tokens_used: 0,
          mode_used: advancedMode ? 'advanced' : 'simple',
          cost_estimate: 0
        }
      } as EditingAgentResponse, { status: 500 });
    }

    const data = await response.json();
    console.log(`✅ Editing Agent response received in ${executionTime}ms`);
    
    // Extract the content
    let rawContent = data.choices[0].message.content;
    console.log('Raw response preview:', rawContent.substring(0, 200) + '...');

    // Parse the JSON editing plan
    let editingPlan;
    try {
      // Use the passThroughRawJson utility for robust JSON extraction
      const parseResult = passThroughRawJson(rawContent, 'editing-agent');
      
      if (!parseResult.success || !parseResult.structuredData) {
        throw new Error('Failed to parse editing plan JSON');
      }
      
      editingPlan = parseResult.structuredData as any; // Type assertion since we validate structure below
      
      // Validate basic structure
      if (!editingPlan.composition || !editingPlan.layers) {
        throw new Error('Invalid editing plan structure: missing composition or layers');
      }

      // Validate platform compatibility
      if (editingPlan.export?.platform !== projectMetadata.target_platform) {
        editingPlan.export = editingPlan.export || {};
        editingPlan.export.platform = projectMetadata.target_platform;
      }

      // Ensure subtitle style matches user selection
      if (editingPlan.subtitles) {
        editingPlan.subtitles.style = subtitleStyle;
      }

      // Add required metadata field for RunPod worker compatibility
      if (!editingPlan.metadata) {
        editingPlan.metadata = {
          agent_version: "1.0",
          creation_timestamp: new Date().toISOString(),
          editing_style: advancedMode ? "advanced" : "simple",
          target_platform: projectMetadata.target_platform
        };
      }

      // Apply dynamic aspect ratio positioning and fix layer types
      const targetAspectRatio = projectMetadata.aspect_ratio || "9:16";
      const centerPosition = getCenterPosition(targetAspectRatio);
      
      console.log(`🎯 [EDITING] Applying dynamic positioning for ${targetAspectRatio}:`, centerPosition);
      
      if (editingPlan.layers && Array.isArray(editingPlan.layers)) {
        editingPlan.layers.forEach((layer: any, index: number) => {
          // Fix layer type for PNG files
          if (layer.source && layer.source.endsWith('.png')) {
            layer.type = 'image';
          } else if (layer.source && layer.source.endsWith('.mp4')) {
            layer.type = 'video';
          }
          
          // Apply dynamic center positioning
          layer.position = centerPosition;
          
          // Ensure required fields exist
          if (!layer.name) {
            layer.name = `Beat ${index + 1}`;
          }
          
          console.log(`📍 [EDITING] Layer ${index + 1}: type="${layer.type}", position=[${layer.position[0]}, ${layer.position[1]}]`);
        });
      }
      
      // Fix audio source URLs to use full S3 paths (RunPod requires full URLs)
      if (editingPlan.audio) {
        const bucketName = process.env.BUCKET_NAME || 'vinvideo';
        
        // Fix background_music source
        if (editingPlan.audio.background_music && editingPlan.audio.background_music.source) {
          const audioSource = editingPlan.audio.background_music.source;
          // Convert relative path to full S3 URL if needed
          if (!audioSource.startsWith('s3://')) {
            editingPlan.audio.background_music.source = `s3://${bucketName}/input/project-${projectMetadata.project_id}/${audioSource}`;
            console.log(`🎵 [EDITING] Fixed audio source: ${audioSource} → ${editingPlan.audio.background_music.source}`);
          }
        }
        
        // Fix narration source if present
        if (editingPlan.audio.narration && editingPlan.audio.narration.source) {
          const audioSource = editingPlan.audio.narration.source;
          if (!audioSource.startsWith('s3://')) {
            editingPlan.audio.narration.source = `s3://${bucketName}/input/project-${projectMetadata.project_id}/${audioSource}`;
            console.log(`🎵 [EDITING] Fixed narration source: ${audioSource} → ${editingPlan.audio.narration.source}`);
          }
        }
      }
      
      // Update composition format to match aspect ratio
      if (editingPlan.composition) {
        editingPlan.composition.format = targetAspectRatio;
      }
      
      console.log(`✅ [EDITING] Applied ${targetAspectRatio} positioning to ${editingPlan.layers?.length || 0} layers`);
      console.log('✅ Editing plan validation passed');
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONTENT_ANALYSIS_FAILED',
          message: 'Failed to parse editing plan JSON',
          details: { parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error', rawContent }
        },
        processing_info: {
          execution_time_ms: executionTime,
          tokens_used: data.usage?.total_tokens || 0,
          mode_used: advancedMode ? 'advanced' : 'simple',
          cost_estimate: (data.usage?.total_tokens || 0) * 0.000002 // Rough estimate
        }
      } as EditingAgentResponse, { status: 500 });
    }

    // Calculate cost estimate (Gemini 2.5 Flash pricing)
    const tokensUsed = data.usage?.total_tokens || 0;
    const costEstimate = tokensUsed * 0.000002; // ~$0.002 per 1K tokens

    // Save the response for debugging and improvement
    const sessionId = await generateSessionId();
    await saveApiResponse('editing-agent', {
      input: body,
      output: editingPlan,
      metadata: {
        execution_time_ms: executionTime,
        tokens_used: tokensUsed,
        cost_estimate: costEstimate,
        mode_used: advancedMode ? 'advanced' : 'simple'
      }
    }, JSON.stringify(data), {
      apiSource: 'openrouter',
      model: 'google/gemini-2.5-pro',
      executionTime,
      tokenUsage: data.usage
    }, sessionId);

    // Prepare successful response
    const successResponse: EditingAgentResponse = {
      success: true,
      editing_plan: editingPlan,
      processing_info: {
        execution_time_ms: executionTime,
        tokens_used: tokensUsed,
        mode_used: advancedMode ? 'advanced' : 'simple',
        cost_estimate: costEstimate
      }
    };

    console.log(`🎬 Editing Agent completed successfully:`);
    console.log(`- Mode: ${advancedMode ? 'Advanced' : 'Simple'}`);
    console.log(`- Layers: ${editingPlan.layers?.length || 0}`);
    console.log(`- Duration: ${editingPlan.composition?.duration || 0}s`);
    console.log(`- Platform: ${editingPlan.export?.platform || 'unknown'}`);
    console.log(`- Transitions: ${editingPlan.transitions?.length || 0}`);
    console.log(`- Cost: $${costEstimate.toFixed(4)}`);

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('❌ Editing Agent error:', error);
    
    const errorResponse: EditingAgentResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      processing_info: {
        execution_time_ms: 0,
        tokens_used: 0,
        mode_used: 'unknown',
        cost_estimate: 0
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}