# VinVideo Studio

🎥 AI video production studio — full-stack automation from script to video assembly.

## Overview
This highly comprehensive Next.js application automates the process of transforming written scripts into fully edited video projects. It handles the complete workflow: script formatting, text-to-speech generation, pacing analysis, logic segmentation, contextual AI image generation, and assembly.

## Features
- **Comprehensive Video Production Pipelines**: Multiple automated pipelines including Music Video mode, Universal Chat mode, and Direct Script-to-Images.
- **AI Tooling Overlaid**:
  - Text-to-Speech (Google Cloud TTS, PlayHT, etc.)
  - Image generation APIs (Flux Dev, Flux Schnell, ComfyUI, Leonardo, etc.)
  - Script structuring and chunking (OpenAI / Gemini integration)
- **DaVinci Resolve Extensibility**: Includes capability to generate DaVinci Resolve compliant XML schemas to rapidly import the fully timed tracks into a professional editor.

## Getting Started

1. Install dependencies:
```bash
yarn install
```

2. Configure environment:
Provide necessary API keys for the third-party integrations (e.g. OpenAI, Leonardo AI, TTS providers).

3. Start the application:
```bash
yarn dev
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
