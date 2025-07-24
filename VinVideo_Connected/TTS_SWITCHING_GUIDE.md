# TTS Provider Switching Guide

## Overview
Your application now supports flexible TTS provider switching with easy configuration. You can switch between providers by changing a single environment variable.

## Available Providers

### 1. Gemini TTS (Default)
- **Quality**: Natural, expressive voice
- **Speed**: ~103-119 seconds for long texts
- **Cost**: Higher cost per request
- **Best for**: When voice quality is most important

### 2. MiniMax TTS
- **Quality**: 99% human similarity, ranked globally
- **Speed**: ~5-15 seconds (8-10x faster than Gemini)
- **Cost**: Much lower cost
- **Best for**: When speed matters or cost optimization

## MiniMax Models

### speech-02-hd (Recommended for Quality)
- **Ranking**: #1 globally on TTS Arena
- **Cost**: $50 per million characters
- **Use Case**: High-fidelity applications, voiceovers, audiobooks

### speech-02-turbo (Recommended for Speed)
- **Ranking**: #3 globally on TTS Arena  
- **Cost**: $30 per million characters
- **Use Case**: Real-time applications, interactive content

## Easy Switching Methods

### Method 1: Environment Variables (Recommended)
Edit your `.env.local` file:

```env
# For Gemini TTS (natural, slow)
TTS_PROVIDER=gemini

# For MiniMax HD (natural, fast, high quality)
TTS_PROVIDER=minimax
MINIMAX_MODEL=speech-02-hd

# For MiniMax Turbo (natural, fastest)
TTS_PROVIDER=minimax
MINIMAX_MODEL=speech-02-turbo
```

### Method 2: Runtime Environment Variables
```bash
# Test Gemini
TTS_PROVIDER=gemini npm run dev

# Test MiniMax HD
TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-hd npm run dev

# Test MiniMax Turbo  
TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-turbo npm run dev
```

## Configuration Options

### Gemini TTS Settings
```env
GOOGLE_AI_API_KEY=your_key_here
# Voices: Enceladus, Puck, Kore, Charon
```

### MiniMax TTS Settings
```env
MINIMAX_API_KEY=your_key_here
MINIMAX_API_HOST=https://api.minimaxi.chat
MINIMAX_MODEL=speech-02-hd          # or speech-02-turbo
MINIMAX_FORMAT=mp3                  # mp3, wav, flac, pcm
MINIMAX_SAMPLE_RATE=32000          # 8000-44100 Hz
MINIMAX_EMOTION=neutral            # happy, sad, angry, etc.
MINIMAX_SPEED=1.0                  # 0.5-2.0x
```

## Performance Comparison

| Provider | Model | Speed | Quality | Cost | Use Case |
|----------|-------|-------|---------|------|----------|
| Gemini | TTS | ~103s | ⭐⭐⭐⭐⭐ | High | Premium quality |
| MiniMax | speech-02-hd | ~5-15s | ⭐⭐⭐⭐⭐ | Medium | Best balance |
| MiniMax | speech-02-turbo | ~5-10s | ⭐⭐⭐⭐ | Low | Speed critical |

## Testing Your Setup

Run the test script to verify switching works:
```bash
node test-tts-switching.js
```

Or test specific providers:
```bash
TTS_PROVIDER=gemini node test-tts-switching.js
TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-hd node test-tts-switching.js
```

## Recommendations

- **Development**: Use MiniMax Turbo for fast iteration
- **Production Quality**: Use MiniMax HD for best balance
- **Premium Content**: Use Gemini when quality is paramount
- **Cost Optimization**: Use MiniMax (30-50x cheaper than Gemini)

## Voice Mapping

All providers support the same voice names:
- **Enceladus**: Default female voice
- **Puck**: Male voice option
- **Kore**: Alternative female voice  
- **Charon**: Alternative male voice

The system automatically maps these to appropriate voices for each provider.