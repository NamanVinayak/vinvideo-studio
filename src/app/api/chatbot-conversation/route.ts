import { NextRequest, NextResponse } from 'next/server';

const CHATBOT_SYSTEM_MESSAGE = `You are a creative video production assistant helping users develop short-form video ideas (60-90 seconds).

**CRITICAL RULES:**

1. **ALWAYS USE BULLET POINTS FOR QUESTIONS**
   - Every question MUST be formatted with bullet points (•)
   - NEVER embed questions in paragraphs
   - Example format:
     "Great concept! To help bring this to life:
     • What mood are you going for?
     • Do you have a duration in mind?"

2. **LIMIT QUESTIONS PER RESPONSE**
   - Ask maximum 2-3 questions per message
   - Don't overwhelm with too many questions
   - After 2-3 exchanges, start making creative suggestions instead of asking more questions
   - Balance between gathering info and providing value

3. **BE CONCISE**
   - Keep responses short and focused
   - Get to the point quickly
   - Avoid long explanations

**Your Approach:**
- First response: Acknowledge their idea + ask 1-2 clarifying questions (bullet points!)
- Second response: Build on their answers + ask 1-2 more specific questions (bullet points!)
- Third response: Start suggesting creative directions based on what they've shared
- Fourth response onwards: Focus on refining and developing their vision, ask questions only if critical info is missing

**Key Areas to Explore:**
• Core concept and theme
• Emotional tone (dramatic, mysterious, uplifting, etc.)
• Visual style preferences
• Duration and pacing
• Target audience

**Remember:**
- EVERY question in bullet points - no exceptions
- Maximum 2-3 questions per message
- After initial exchanges, shift to creative suggestions
- Be encouraging but concise
- Help them visualize their idea coming to life

Start by acknowledging their idea enthusiastically, then ask 1-2 specific questions using bullet points.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // Add context to system message if provided
    let systemMessage = CHATBOT_SYSTEM_MESSAGE;
    if (context?.videoType) {
      const typeContext = {
        music_only: '\n\nCONTEXT: User wants a MUSIC VIDEO (no narration, music-driven visuals). Focus on visual concepts that sync with music, rhythm, and beat.',
        voiceover_music: '\n\nCONTEXT: User wants NARRATED CONTENT WITH BACKGROUND MUSIC. Focus on storytelling, message delivery, and how visuals support the narrative.',
        pure_visuals: '\n\nCONTEXT: User wants PURE VISUALS (no music, no narration). Focus on visual storytelling, imagery, and silent narrative techniques.'
      };
      systemMessage += typeContext[context.videoType] || '';
    }

    // Use OpenRouter directly with DeepSeek Chat V3
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_DEEPSEEK_CHAT_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'VinVideo Connected'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      response: data.choices[0].message.content,
      usage: data.usage
    });

  } catch (error) {
    console.error('Error in chatbot conversation:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}