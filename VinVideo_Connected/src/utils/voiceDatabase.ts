/**
 * Complete Gemini TTS Voice Database - Based on Perplexity Research
 * 30 voices with personality mappings and Gen-Z characteristics
 */

export interface VoiceProfile {
  gender: 'Male' | 'Female';
  characteristics: string;
  personality_tags: string[];
  use_cases: string[];
  voice_range: string;
  age_perception: string;
  best_for_content: string[];
  emotional_tone_capability: string[];
}

export interface VoicePreference {
  mode: 'auto' | 'tags' | 'custom';
  tags?: string[];
  customDescription?: string;
}

// Complete 30-voice database from Perplexity research
export const GEMINI_VOICE_DATABASE: Record<string, VoiceProfile> = {
  // === FEMALE VOICES (14) ===
  
  "Zephyr": {
    gender: "Female",
    characteristics: "Bright, energetic, mid-range pitch projecting positivity and enthusiasm",
    personality_tags: ["Sunshine Personality"],
    use_cases: ["Upbeat commercials", "children's content", "friendly IVR systems"],
    voice_range: "mid-range",
    age_perception: "Young adult",
    best_for_content: ["educational", "commercial", "upbeat"],
    emotional_tone_capability: ["enthusiastic", "cheerful", "positive"]
  },

  "Kore": {
    gender: "Female", 
    characteristics: "Energetic, youthful, mid-to-high pitch conveying confidence and enthusiasm",
    personality_tags: ["Main Character Energy"],
    use_cases: ["Upbeat commercials", "tutorials for younger audiences", "corporate presentations"],
    voice_range: "mid-to-high pitch",
    age_perception: "Young adult",
    best_for_content: ["commercial", "educational", "professional"],
    emotional_tone_capability: ["confident", "enthusiastic", "authoritative"]
  },

  "Leda": {
    gender: "Female",
    characteristics: "Composed, professional, mid-pitch conveying authority and calm",
    personality_tags: ["Boss Mode"],
    use_cases: ["Corporate training", "serious narration", "professional presentations"],
    voice_range: "mid-pitch",
    age_perception: "Young adult",
    best_for_content: ["professional", "educational", "corporate"],
    emotional_tone_capability: ["authoritative", "calm", "professional"]
  },

  "Aoede": {
    gender: "Female",
    characteristics: "Clear, conversational, mid-range, engaging and intelligent",
    personality_tags: ["Chill & Laid-back"],
    use_cases: ["Podcast hosting", "e-learning", "informative narration"],
    voice_range: "mid-range",
    age_perception: "Young adult", 
    best_for_content: ["educational", "narrative", "conversational"],
    emotional_tone_capability: ["conversational", "intelligent", "engaging"]
  },

  "Autonoe": {
    gender: "Female",
    characteristics: "Mature, deeper, resonant quality conveying wisdom and experience",
    personality_tags: ["Professor Mode"],
    use_cases: ["Documentary narration", "serious non-fiction audiobooks"],
    voice_range: "deeper",
    age_perception: "Middle-aged",
    best_for_content: ["documentary", "educational", "authoritative"],
    emotional_tone_capability: ["authoritative", "experienced", "wise"]
  },

  "Callirhoe": {
    gender: "Female",
    characteristics: "Confident, clear, mid-range pitch exuding energy and directness",
    personality_tags: ["Main Character Energy"],
    use_cases: ["Business presentations", "corporate training", "professional communications"],
    voice_range: "mid-range",
    age_perception: "Young adult to middle-aged",
    best_for_content: ["professional", "corporate", "business"],
    emotional_tone_capability: ["confident", "direct", "energetic"]
  },

  "Despina": {
    gender: "Female",
    characteristics: "Warm, inviting, clear mid-range pitch, friendly and trustworthy",
    personality_tags: ["Cozy Storyteller"],
    use_cases: ["Lifestyle commercials", "customer service recordings", "welcoming narrations"],
    voice_range: "mid-range",
    age_perception: "Young adult to middle-aged",
    best_for_content: ["commercial", "lifestyle", "hospitality"],
    emotional_tone_capability: ["warm", "trustworthy", "welcoming"]
  },

  "Erinome": {
    gender: "Female",
    characteristics: "Professional, articulate, lower mid-pitch with thoughtful delivery",
    personality_tags: ["Dark Academia"],
    use_cases: ["Educational content", "corporate narration", "academic content"],
    voice_range: "lower mid-pitch",
    age_perception: "Middle-aged",
    best_for_content: ["educational", "academic", "intellectual"],
    emotional_tone_capability: ["intelligent", "composed", "sophisticated"]
  },

  "Gacrux": {
    gender: "Female",
    characteristics: "Smooth, confident, mid-to-low pitch presenting authoritative yet approachable tone",
    personality_tags: ["Boss Mode"],
    use_cases: ["Documentary narration", "corporate presentations", "executive communications"],
    voice_range: "mid-to-low pitch",
    age_perception: "Mature",
    best_for_content: ["documentary", "corporate", "executive"],
    emotional_tone_capability: ["authoritative", "confident", "experienced"]
  },

  "Laomedeia": {
    gender: "Female",
    characteristics: "Clear, conversational, mid-range pitch with inquisitive and engaging tone",
    personality_tags: ["Sunshine Personality"],
    use_cases: ["E-learning", "explainer videos", "podcast hosting"],
    voice_range: "mid-range",
    age_perception: "Young adult",
    best_for_content: ["educational", "explanatory", "interactive"],
    emotional_tone_capability: ["upbeat", "engaging", "inquisitive"]
  },

  "Pulcherrima": {
    gender: "Female",
    characteristics: "Bright, energetic, mid-to-high pitch, youthful with very engaging delivery",
    personality_tags: ["Main Character Energy"],
    use_cases: ["Upbeat commercials", "tutorials", "animation character voices"],
    voice_range: "mid-to-high pitch",
    age_perception: "Young adult",
    best_for_content: ["commercial", "tutorial", "animation"],
    emotional_tone_capability: ["bright", "engaging", "youthful"]
  },

  "Sulafat": {
    gender: "Female",
    characteristics: "Warm, confident, mid-range projecting intelligence and friendliness",
    personality_tags: ["Cozy Storyteller"],
    use_cases: ["Corporate narration", "e-learning", "persuasive marketing"],
    voice_range: "mid-range",
    age_perception: "Middle-aged",
    best_for_content: ["corporate", "educational", "marketing"],
    emotional_tone_capability: ["warm", "intelligent", "friendly"]
  },

  "Vindemiatrix": {
    gender: "Female",
    characteristics: "Calm, thoughtful, mid-to-low pitch, mature and composed with gentle authority",
    personality_tags: ["Soft & Dreamy"],
    use_cases: ["Meditation guides", "reflective content narration", "wellness content"],
    voice_range: "mid-to-low pitch",
    age_perception: "Mature",
    best_for_content: ["wellness", "meditation", "reflective"],
    emotional_tone_capability: ["gentle", "calm", "soothing"]
  },


  // === MALE VOICES (16) ===

  "Puck": {
    gender: "Male",
    characteristics: "Upbeat, energetic, mid-range pitch with confident and approachable delivery",
    personality_tags: ["Bestie Energy"],
    use_cases: ["How-to videos", "informal corporate communications", "friendly product demonstrations"],
    voice_range: "mid-range",
    age_perception: "Young adult to middle-aged",
    best_for_content: ["tutorial", "commercial", "explanatory"],
    emotional_tone_capability: ["friendly", "upbeat", "approachable"]
  },

  "Charon": {
    gender: "Male",
    characteristics: "Smooth conversational voice with mid-to-low pitch, assured and approachable",
    personality_tags: ["Professor Mode"],
    use_cases: ["Podcast narration", "explainer videos", "educational content"],
    voice_range: "mid-to-low pitch",
    age_perception: "Middle-aged",
    best_for_content: ["educational", "podcast", "explanatory"],
    emotional_tone_capability: ["trustworthy", "informative", "calm"]
  },

  "Fenrir": {
    gender: "Male",
    characteristics: "Friendly, clear, mid-range pitch with conversational and approachable vibe",
    personality_tags: ["Hype Beast"],
    use_cases: ["Explainer videos", "podcasting", "dynamic presentations"],
    voice_range: "mid-range",
    age_perception: "Young adult",
    best_for_content: ["explanatory", "podcast", "dynamic"],
    emotional_tone_capability: ["excitable", "engaging", "energetic"]
  },

  "Enceladus": {
    gender: "Male",
    characteristics: "Energetic, enthusiastic, mid-range pitch perfect for conveying excitement",
    personality_tags: ["Hype Beast"],
    use_cases: ["Promotional videos", "event announcements", "high-energy commercials"],
    voice_range: "mid-range",
    age_perception: "Young adult",
    best_for_content: ["promotional", "commercial", "events"],
    emotional_tone_capability: ["breathy", "energetic", "exciting"]
  },

  "Iapetus": {
    gender: "Male",
    characteristics: "Friendly, mid-pitch with casual, relatable quality",
    personality_tags: ["Bestie Energy"],
    use_cases: ["Informal tutorials", "vlogs", "conversational marketing content"],
    voice_range: "mid-pitch",
    age_perception: "Young to middle-aged",
    best_for_content: ["tutorial", "casual", "conversational"],
    emotional_tone_capability: ["clear", "approachable", "relatable"]
  },

  "Umbriel": {
    gender: "Male",
    characteristics: "Smooth, mid-to-low pitch conveying authority while remaining friendly",
    personality_tags: ["Chill & Laid-back"],
    use_cases: ["Documentary narration", "corporate storytelling", "audiobook narration"],
    voice_range: "mid-to-low pitch",
    age_perception: "Middle-aged",
    best_for_content: ["documentary", "corporate", "audiobook"],
    emotional_tone_capability: ["easy-going", "calm", "authoritative"]
  },

  "Algieba": {
    gender: "Male",
    characteristics: "Warm, confident, mid-range pitch conveying friendly authority and experience",
    personality_tags: ["Professor Mode"],
    use_cases: ["Corporate presentations", "documentary narration", "mature character voices"],
    voice_range: "mid-range",
    age_perception: "Middle-aged",
    best_for_content: ["corporate", "documentary", "professional"],
    emotional_tone_capability: ["smooth", "professional", "experienced"]
  },

  "Algenib": {
    gender: "Male", 
    characteristics: "Gravelly texture with distinct character",
    personality_tags: ["Mysterious Vibes"],
    use_cases: ["Character work", "distinctive narration", "creative projects"],
    voice_range: "gravelly",
    age_perception: "Middle-aged to mature",
    best_for_content: ["character", "creative", "distinctive"],
    emotional_tone_capability: ["distinctive", "mysterious", "textured"]
  },

  "Orus": {
    gender: "Male",
    characteristics: "Mature, deeper resonance conveying thoughtfulness and experience",
    personality_tags: ["Professor Mode"],
    use_cases: ["Documentary narration", "serious audiobooks", "wise elder character voices"],
    voice_range: "deeper resonance",
    age_perception: "Mature",
    best_for_content: ["documentary", "audiobook", "character"],
    emotional_tone_capability: ["firm", "thoughtful", "experienced"]
  },

  "Rasalgethi": {
    gender: "Male",
    characteristics: "Conversational, mid-pitch with slightly nasal, inquisitive quality",
    personality_tags: ["Bestie Energy"],
    use_cases: ["Podcast discussions", "quirky character work", "informal explainers"],
    voice_range: "mid-pitch",
    age_perception: "Young adult to middle-aged",
    best_for_content: ["podcast", "character", "conversational"],
    emotional_tone_capability: ["informative", "approachable", "inquisitive"]
  },

  "Sadachbia": {
    gender: "Male",
    characteristics: "Deeper voice with slight rasp, exuding confidence and laid-back authority",
    personality_tags: ["No Cap Confident"],
    use_cases: ["Movie trailers", "edgy commercials", "tough-guy character voices"],
    voice_range: "deeper with rasp",
    age_perception: "Middle-aged",
    best_for_content: ["trailer", "commercial", "character"],
    emotional_tone_capability: ["lively", "confident", "distinctive"]
  },

  "Sadaltager": {
    gender: "Male",
    characteristics: "Friendly, enthusiastic, clear mid-range pitch, ideal for presentations",
    personality_tags: ["Professor Mode"],
    use_cases: ["Corporate presentations", "training videos", "webinar hosting"],
    voice_range: "mid-range",
    age_perception: "Middle-aged",
    best_for_content: ["corporate", "training", "professional"],
    emotional_tone_capability: ["knowledgeable", "professional", "engaging"]
  },

  "Schedar": {
    gender: "Male",
    characteristics: "Friendly, mid-pitched, informal, approachable quality",
    personality_tags: ["Chill & Laid-back"],
    use_cases: ["Casual tutorials", "vlogs", "friendly product explainers"],
    voice_range: "mid-pitched",
    age_perception: "Young adult to middle-aged",
    best_for_content: ["tutorial", "casual", "explanatory"],
    emotional_tone_capability: ["even", "balanced", "relatable"]
  },

  "Zubenelgenubi": {
    gender: "Male",
    characteristics: "Deep, resonant voice conveying strong authority and seriousness",
    personality_tags: ["Boss Mode"],
    use_cases: ["Epic movie trailers", "formal announcements", "authoritative narration"],
    voice_range: "deep, resonant",
    age_perception: "Middle-aged to mature",
    best_for_content: ["trailer", "formal", "authoritative"],
    emotional_tone_capability: ["casual", "powerful", "commanding"]
  },

  "Achird": {
    gender: "Male",
    characteristics: "Youthful, mid-to-high pitch, clear, slightly breathy quality",
    personality_tags: ["Bestie Energy"],
    use_cases: ["E-learning modules for younger demographics", "friendly app tutorials"],
    voice_range: "mid-to-high pitch",
    age_perception: "Young adult",
    best_for_content: ["educational", "tutorial", "contemporary"],
    emotional_tone_capability: ["friendly", "curious", "contemporary"]
  },

  "Achernar": {
    gender: "Male",
    characteristics: "Clear, mid-range, friendly and engaging tone expressing enthusiasm",
    personality_tags: ["Bestie Energy"],
    use_cases: ["Explainer videos", "corporate narration with friendly touch", "podcast introductions"],
    voice_range: "mid-range",
    age_perception: "Young adult to middle-aged",
    best_for_content: ["explanatory", "corporate", "podcast"],
    emotional_tone_capability: ["soft", "gentle", "enthusiastic"]
  }
};

// Gen-Z Personality Tags mapping
export const PERSONALITY_TAGS = [
  "Chill & Laid-back",
  "Main Character Energy", 
  "Cozy Storyteller",
  "Boss Mode",
  "Soft & Dreamy",
  "Hype Beast",
  "Mysterious Vibes",
  "Bestie Energy", 
  "Professor Mode",
  "Dark Academia",
  "Sunshine Personality",
  "No Cap Confident"
] as const;

// Voice selection algorithm
export function selectVoiceByPreference(
  contentAnalysis: {
    type: string;
    emotion: string;
    tone: string;
  },
  userPreference: VoicePreference
): {
  recommendedVoice: string;
  reasoning: string;
  fallbackVoices: string[];
  confidenceScore: number;
} {
  
  if (userPreference.mode === 'auto') {
    return analyzeContentForVoice(contentAnalysis);
  } else if (userPreference.mode === 'tags' && userPreference.tags) {
    return mapTagsToVoice(userPreference.tags, contentAnalysis);
  } else if (userPreference.mode === 'custom' && userPreference.customDescription) {
    return parseCustomDescription(userPreference.customDescription, contentAnalysis);
  }
  
  // Fallback to content analysis
  return analyzeContentForVoice(contentAnalysis);
}

function analyzeContentForVoice(contentAnalysis: any) {
  // Default content-based selection logic
  const defaultVoices = {
    educational: ['Charon', 'Sadaltager', 'Leda'],
    commercial: ['Zephyr', 'Enceladus', 'Pulcherrima'], 
    narrative: ['Puck', 'Aoede', 'Despina'],
    professional: ['Algieba', 'Gacrux', 'Autonoe']
  };
  
  const contentType = contentAnalysis.type.toLowerCase();
  const voices = defaultVoices[contentType as keyof typeof defaultVoices] || defaultVoices.narrative;
  
  return {
    recommendedVoice: voices[0],
    reasoning: `Selected based on content type: ${contentType}. This voice is optimized for ${contentType} content delivery.`,
    fallbackVoices: voices.slice(1),
    confidenceScore: 0.8
  };
}

function mapTagsToVoice(tags: string[], contentAnalysis: any) {
  // Find voices that match the selected personality tags
  const matchingVoices = Object.entries(GEMINI_VOICE_DATABASE)
    .filter(([_, profile]) => 
      tags.some(tag => profile.personality_tags.includes(tag))
    )
    .map(([name, _]) => name);
    
  if (matchingVoices.length === 0) {
    return analyzeContentForVoice(contentAnalysis);
  }
  
  return {
    recommendedVoice: matchingVoices[0],
    reasoning: `Selected based on personality tags: ${tags.join(', ')}. This voice matches your desired personality traits.`,
    fallbackVoices: matchingVoices.slice(1, 3),
    confidenceScore: 0.9
  };
}

function parseCustomDescription(description: string, contentAnalysis: any) {
  // Simple keyword matching for custom descriptions
  const lowerDesc = description.toLowerCase();
  
  // Match common descriptive words to voices
  if (lowerDesc.includes('friendly') || lowerDesc.includes('casual')) {
    return {
      recommendedVoice: 'Puck',
      reasoning: `Selected based on custom description: "${description}". Puck offers friendly, casual delivery.`,
      fallbackVoices: ['Iapetus', 'Achird'],
      confidenceScore: 0.7
    };
  }
  
  if (lowerDesc.includes('professional') || lowerDesc.includes('authoritative')) {
    return {
      recommendedVoice: 'Leda',
      reasoning: `Selected based on custom description: "${description}". Leda provides professional, authoritative delivery.`,
      fallbackVoices: ['Gacrux', 'Algieba'],
      confidenceScore: 0.7
    };
  }
  
  if (lowerDesc.includes('energetic') || lowerDesc.includes('exciting')) {
    return {
      recommendedVoice: 'Enceladus',
      reasoning: `Selected based on custom description: "${description}". Enceladus delivers high-energy, exciting narration.`,
      fallbackVoices: ['Fenrir', 'Zephyr'],
      confidenceScore: 0.7
    };
  }
  
  // Default fallback
  return analyzeContentForVoice(contentAnalysis);
}

// Gender breakdown statistics  
export const VOICE_STATISTICS = {
  totalVoices: 29,
  femaleVoices: 13, // Reduced by 1 after removing duplicate Achernar
  maleVoices: 16,
  personalityTagsCount: 12,
  averagePersonalityTagsPerVoice: 1.2
};

// Export current voice mapping for backward compatibility
export const CURRENT_VOICE_MAPPING = {
  'Enceladus': 'Enceladus',
  'Puck': 'Puck', 
  'Kore': 'Kore',
  'Charon': 'Charon'
};