import { NextRequest, NextResponse } from 'next/server';

const CHATBOT_SYSTEM_MESSAGE = `You are a creative video production assistant specialized in helping users develop ideas for short-form dramatic videos (60-90 seconds). Your role is to guide users through an engaging conversation to fully understand their creative vision before generating a script.

**Your Mission:**
- Help users explore and refine their video ideas through natural conversation
- Ask thoughtful questions to understand their creative vision, target audience, and specific requirements
- Gather enough detail to eventually create a compelling short-form video script
- Keep the conversation engaging and collaborative

**Key Areas to Explore:**
- Core concept/theme of the video
- Emotional tone and mood (dramatic, suspenseful, mysterious, etc.)
- Target audience and purpose
- Specific scenes or moments they envision
- Visual style preferences
- Key message or takeaway

**Conversation Guidelines:**
- Be enthusiastic and encouraging about their ideas
- Ask one or two focused questions at a time
- Build on their responses to dive deeper
- Suggest creative possibilities when appropriate
- Help them think through visual storytelling elements
- Keep responses conversational and not too long

**Important:**
- Don't write the actual script during conversation - focus on exploration and refinement
- Be supportive of all creative directions
- Help them discover details they might not have considered
- Maintain an encouraging, collaborative tone

Start by understanding their basic idea, then gradually explore the details that will make for a compelling short-form video.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
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
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { role: 'system', content: CHATBOT_SYSTEM_MESSAGE },
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