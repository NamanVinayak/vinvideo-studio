# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Project Structure

This repository contains a multi-agent AI video generation system. The main project is located in the `VinVideo_Connected/` subdirectory.

**Before working on the project, you must:**
1. Navigate to the `VinVideo_Connected/` directory: `cd VinVideo_Connected/`
2. Read the comprehensive CLAUDE.md file in that directory for full project guidance

## Quick Start

```bash
# Navigate to the main project directory
cd VinVideo_Connected/

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Overview

The `VinVideo_Connected/` directory contains a Next.js application that implements a sophisticated multi-agent AI system for video generation. It features:

- **Multi-Pipeline Architecture**: Music video pipeline (7 stages) and no-music pipeline (5 stages)
- **Specialized AI Agents**: Vision Understanding, Producer, Director, DoP, and Prompt Engineer agents
- **External Integrations**: OpenRouter (LLM), ComfyUI (image generation), Google Cloud (TTS), NVIDIA (audio transcription)
- **Multiple Testing Pages**: `test-tts`, `music-video-pipeline`, `no-music-video-pipeline` for different workflows

## Environment Setup

The project requires several API keys. Create a `.env.local` file in the `VinVideo_Connected/` directory with:

```
OPENROUTER_API_KEY=<your_key>
OPENROUTER_DEEPSEEK_API_KEY=<your_key>
GOOGLE_GEMINI_API_KEY=<your_key>
GOOGLE_CLOUD_API_KEY=<your_key>
RUNPOD_API_KEY=<your_key>
```

## Development Workflow

1. **Always work from the `VinVideo_Connected/` directory**
2. **Read `VinVideo_Connected/CLAUDE.md`** for comprehensive architecture details and critical system issues
3. **Test with existing test cases** in `VinVideo_Connected/test_results/` to validate changes
4. **Follow the agent system patterns** described in the main CLAUDE.md file

This root directory should primarily be used for navigation - the actual development work happens in `VinVideo_Connected/`.