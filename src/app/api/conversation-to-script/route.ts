import { NextRequest, NextResponse } from 'next/server';

const SCRIPT_CHECK_SYSTEM_MESSAGE = `You are a script detection specialist. Analyze the conversation and determine if the user has provided a complete script.

Look for:
- Explicit mentions like "here is my script", "script:", "narration:", etc.
- Complete narrative text that could be used as-is for voiceover
- Quoted text meant to be spoken
- Text that follows script indicators

If you find a complete script, extract it EXACTLY as provided without any modifications.

Return JSON with this structure:
{
  "hasProvidedScript": boolean,
  "extractedScript": "the exact script if found, null otherwise",
  "confidence": 0.0 to 1.0
}`;

const CONVERSATION_ANALYSIS_SYSTEM_MESSAGE = `You are a creative video production analyst specialized in extracting key creative elements from user conversations to feed into a sophisticated AI video production pipeline.

Your role is NOT to write a final script, but to analyze the conversation and determine what creative direction and content should be provided to the Director and Producer agents in our pipeline.

**Your Mission:**
Analyze the provided conversation between a user and a creative assistant, extract the key creative elements, and generate a polished 60-90 second video script optimized for dramatic short-form content.

**Analysis Process:**
1. Extract the core concept, theme, and creative vision from the conversation
2. Identify key emotional beats and dramatic moments discussed
3. Understand the target audience and intended impact
4. Gather any specific visual or stylistic preferences mentioned
5. Note the desired tone, mood, and atmosphere

**Script Generation Guidelines:**
- Create a compelling 60-90 second script (approximately 150-250 words when spoken)
- Optimize for dramatic, engaging short-form content
- Structure for maximum retention with hooks and emotional peaks
- Write for natural TTS delivery with proper pacing and emphasis
- Include emotional cues and dramatic pauses where appropriate
- Build tension and maintain viewer engagement throughout
- End with impact or call-to-action

**TTS Optimization:**
- Use conversational, natural language that flows well when spoken
- Avoid complex punctuation that confuses TTS systems
- Write numbers and dates in word form
- Use "dot com" instead of ".com" for URLs
- Break up long sentences for better pacing
- Include natural pauses with periods and commas
- Optimize for emotional delivery and vocal expression

**Output Format:**
Provide only the final script text, ready for TTS conversion. Do not include stage directions, character names, or formatting - just the spoken content optimized for dramatic delivery.

**Key Requirements:**
- 60-90 second duration when spoken
- Dramatic and engaging tone
- Optimized for TTS systems
- Incorporates key elements from the conversation
- Built for short-form video format
- Maximum retention focus`;

export async function POST(request: NextRequest) {
  try {
    const { conversation } = await request.json();

    if (!conversation || typeof conversation !== 'string') {
      return NextResponse.json(
        { error: 'Conversation text is required' },
        { status: 400 }
      );
    }

    // First, check if user provided a script
    const checkResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'VinVideo Connected'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SCRIPT_CHECK_SYSTEM_MESSAGE },
          { role: 'user', content: conversation }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      const result = JSON.parse(checkData.choices[0].message.content);
      
      if (result.hasProvidedScript && result.confidence > 0.7) {
        console.log('✅ User provided script detected, returning it directly');
        return NextResponse.json({
          script: result.extractedScript,
          usage: checkData.usage,
          mode: 'extracted'
        });
      }
    }

    // Use OpenRouter with Qwen for conversation analysis
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_QWEN_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'VinVideo Connected'
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: CONVERSATION_ANALYSIS_SYSTEM_MESSAGE },
          { 
            role: 'user', 
            content: `Please analyze this conversation and determine what creative direction should be provided to our Director and Producer agents:\n\n${conversation}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      script: data.choices[0].message.content,
      usage: data.usage
    });

  } catch (error) {
    console.error('Error in conversation-to-script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script from conversation' },
      { status: 500 }
    );
  }
}
