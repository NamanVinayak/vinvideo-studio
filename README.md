# Script-to-Video Automation for DaVinci Resolve

This application automates the process of transforming written scripts into fully edited video projects ready for DaVinci Resolve. It handles the entire workflow from text to a complete video project file.

## Features

- **Text-to-Speech Conversion**: Converts your script into high-quality audio using Google Cloud TTS
- **Audio Timing Analysis**: Automatically detects natural pauses and segments the audio
- **Image Generation**: Creates relevant images for each segment using Google Gemini API
- **DaVinci Resolve XML**: Generates a ready-to-import project file with proper timing

## How It Works

1. **Input**: Paste your full script into the text area
2. **Processing**:
   - The entire script is sent to Google Cloud TTS for natural-sounding audio
   - Audio is analyzed to identify logical segments based on natural pauses
   - Images are generated using Google Gemini API that match the content of each segment
   - XML file is created with proper timing information

3. **Output**: Download a complete DaVinci Resolve project file with all assets organized and linked

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Google API keys (see API Setup section below)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/script-to-video.git

# Navigate to the project directory
cd script-to-video

# Install dependencies
npm install
# or
yarn install

# Start the development server
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to access the application.

## API Setup

This application uses Google APIs for text-to-speech and image generation. You'll need to set up the following:

### Google API Keys

1. **Google Gemini API Key** (for image generation):
   - Used in the `GOOGLE_GEMINI_API_KEY` environment variable
   - The provided key `AIzaSyCME4xTr3KP6YOlUIoQRxTPysENnYat9FI` is for Gemini models
   - Our application currently uses the free tier `gemini-2.0-flash-exp-image-generation` model
   - You can toggle to the higher-quality paid tier `imagen-3.0-generate-002` model in the code if needed

2. **Google Cloud API Key** (for text-to-speech):
   - Used in the `GOOGLE_CLOUD_API_KEY` environment variable
   - You need to create this in the Google Cloud Console
   - Enable the Cloud Text-to-Speech API for your project
   
### Setting Up Environment Variables

Create a `.env.local` file in the root directory with the following:

```
# Google API Keys for DaVinci Resolve Script-to-Video Automation

# The Google Gemini API key for image generation
GOOGLE_GEMINI_API_KEY=AIzaSyCME4xTr3KP6YOlUIoQRxTPysENnYat9FI

# Google Cloud API key for Text-to-Speech (you'll need to set this up separately)
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here

# Google Cloud Project ID (optional)
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id_here
```

### Important Notes on Image Generation

- Our code provides options for both the free and paid tier of Google's image generation:
  - `gemini-2.0-flash-exp-image-generation`: Free tier, available with your Gemini API key
  - `imagen-3.0-generate-002`: Paid tier, higher quality, requires billing setup
  
- You can toggle between these options by changing the `useFreeTier` variable in the `imageGeneration.ts` file
- All generated images include a SynthID watermark by policy

## Future Enhancements

- Support for custom voice selection in Google TTS
- Image style customization options
- Background music integration
- Export options for other video editing software
- Project template selection

## Technologies Used

- Next.js with TypeScript for the frontend and API routes
- Google Cloud Text-to-Speech API for audio generation
- Google Gemini API for image generation
- Web Audio API for audio timing analysis
- XML generation for DaVinci Resolve compatibility

## License

MIT

---

Created for streamlining the video production workflow.
# VinTalks

#this script corresponds to this tutorial video: https://www.youtube.com/watch?v=5hCGDcfPy8Y
#You only need to run this script once. However, when you start a new runpod server, you will  need to  initialize conda in the shell. 
#1. run the following command to intialize conda in the shell
#/workspace/miniconda3/bin/conda init bash
#2. run the following command to activate the conda environment
#conda activate comfyui
#3. run the following command to start comfyui
#python main.py --listen
