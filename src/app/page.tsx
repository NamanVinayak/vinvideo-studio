"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";

// Define types for our project data
interface Segment {
  lineNumber: number;
  prompt: string;
  duration: number;
}

interface ImageAsset {
  index: number;
  prompt: string;
  imageUrl: string;
}

interface ChunkOutput {
  raw: string;
  segments: Segment[];
}

interface StepStatus<T> {
  loading: boolean;
  completed: boolean;
  error: string | null;
  output: T | null;
}

// Available AI image generation models
type ImageModel = "ideogram" | "flux-schnell" | "flux-dev";

export default function Home() {
  const [script, setScript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [error, setError] = useState("");
  
  // Image model selection
  const [imageModel, setImageModel] = useState<ImageModel>("ideogram");
  // Style UUID selection for Flux models
  const [styleUUID, setStyleUUID] = useState<string>("");
  
  // Available style options for Flux models
  const styleOptions = [
    { name: "3D Render", uuid: "debdf72a-91a4-467b-bf61-cc02bdeb69c6" },
    { name: "Acrylic", uuid: "3cbb655a-7ca4-463f-b697-8a03ad67327c" },
    { name: "Anime General", uuid: "b2a54a51-230b-4d4f-ad4e-8409bf58645f" },
    { name: "Creative", uuid: "6fedbf1f-4a17-45ec-84fb-92fe524a29ef" },
    { name: "Dynamic", uuid: "111dc692-d470-4eec-b791-3475abac4c46" },
    { name: "Fashion", uuid: "594c4a08-a522-4e0e-b7ff-e4dac4b6b622" },
    { name: "Game Concept", uuid: "09d2b5b5-d7c5-4c02-905d-9f84051640f4" },
    { name: "Graphic Design 3D", uuid: "7d7c2bc5-4b12-4ac3-81a9-630057e9e89f" },
    { name: "Illustration", uuid: "645e4195-f63d-4715-a3f2-3fb1e6eb8c70" },
    { name: "None", uuid: "556c1ee5-ec38-42e8-955a-1e82dad0ffa1" },
    { name: "Portrait", uuid: "8e2bc543-6ee2-45f9-bcd9-594b6ce84dcd" },
    { name: "Portrait Cinematic", uuid: "4edb03c9-8a26-4041-9d01-f85b5d4abd71" },
    { name: "Ray Traced", uuid: "b504f83c-3326-4947-82e1-7fe9e839ec0f" },
    { name: "Stock Photo", uuid: "5bdc3f2a-1be6-4d1c-8e77-992a30824a2c" },
    { name: "Watercolor", uuid: "1db308ce-c7ad-4d10-96fd-592fa6b75cc4" }
  ];
  
  // Reset style when model changes
  const handleModelChange = (model: ImageModel) => {
    setImageModel(model);
    setStyleUUID(""); // Reset style selection when model changes
  };
  
  // Script generator states
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptGenError, setScriptGenError] = useState("");
  
  // Step statuses
  const [formatStatus, setFormatStatus] = useState<StepStatus<string>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });
  const [audioStatus, setAudioStatus] = useState<StepStatus<string>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });
  const [chunkStatus, setChunkStatus] = useState<StepStatus<ChunkOutput>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });
  const [imageStatus, setImageStatus] = useState<StepStatus<ImageAsset[]>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: [] 
  });
  const [xmlStatus, setXmlStatus] = useState<StepStatus<string>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });

  // Parse the chunked script into segments
  const parseChunkedScript = (chunkedScript: string): Segment[] => {
    try {
      // Split by lines and filter out the header row and empty lines
      const lines = chunkedScript.split('\n')
        .filter(line => line.trim() && !line.includes('Line Number') && !line.includes('---'));
      
      const segments: Segment[] = [];
      
      for (const line of lines) {
        // Extract line number, prompt, and duration from markdown table format
        // Format: | Line Number | Prompt | Duration (in seconds) |
        const match = line.match(/\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\|/);
        if (match && match.length >= 4) {
          segments.push({
            lineNumber: parseInt(match[1], 10),
            prompt: match[2].trim(),
            duration: parseInt(match[3], 10) || 5 // Default to 5 seconds if parsing fails
          });
        }
      }
      
      return segments;
    } catch (error) {
      console.error('Error parsing chunked script:', error);
      return [];
    }
  };

  // Initialize a project and get a folder ID
  const initializeProject = async () => {
    try {
      const response = await fetch('/api/init-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize project');
      }
      
      const data = await response.json();
      console.log('Project initialized with folder ID:', data.folderId);
      return data.folderId;
    } catch (error: unknown) {
      console.error("Error initializing project:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(`Failed to initialize project: ${errorMessage}`);
      throw error;
    }
  };

  // Step 1: Format script for TTS
  const formatScript = async (projectFolderId: string) => {
    setFormatStatus({ ...formatStatus, loading: true, error: null });
    
    try {
      const response = await fetch('/api/format-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script, folderId: projectFolderId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to format script');
      }
      
      const data = await response.json();
      setFormatStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: data.formattedScript 
      });
      
      return data.formattedScript;
    } catch (error: unknown) {
      console.error("Error formatting script:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setFormatStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Step 2: Convert text to speech (non-blocking)
  const convertToSpeech = async (formattedScript: string, projectFolderId: string) => {
    setAudioStatus({ ...audioStatus, loading: true, error: null });
    
    try {
      const response = await fetch('/api/test-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          script: formattedScript,
          folderId: projectFolderId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert to speech');
      }
      
      const data = await response.json();
      setAudioStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: data.audioUrl 
      });
      
      return data.audioUrl;
    } catch (error: unknown) {
      console.error("Error converting to speech:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setAudioStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Step 3: Chunk script
  const chunkScript = async (formattedScript: string, projectFolderId: string) => {
    setChunkStatus({ ...chunkStatus, loading: true, error: null });
    
    try {
      const response = await fetch('/api/chunk-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          script: formattedScript,
          folderId: projectFolderId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to chunk script');
      }
      
      const data = await response.json();
      const segments = parseChunkedScript(data.chunkedScript);
      
      setChunkStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: {
          raw: data.chunkedScript,
          segments: segments
        }
      });
      
      return segments;
    } catch (error: unknown) {
      console.error("Error chunking script:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setChunkStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Step 4: Generate images for each segment
  const generateImages = async (segments: Segment[], projectFolderId: string) => {
    setImageStatus({ ...imageStatus, loading: true, error: null });
    
    try {
      // Extract prompts from segments
      const prompts = segments.map(segment => segment.prompt);
      
      const response = await fetch('/api/generate-multiple-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompts,
          folderId: projectFolderId,
          model: imageModel,
          styleUUID: styleUUID // Pass the selected styleUUID
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate images');
      }
      
      const data = await response.json();
      
      // Map the results to image assets
      const images: ImageAsset[] = data.results
        .filter((result: {success: boolean}) => result.success)
        .map((result: {index: number; prompt: string; imageUrl: string}) => ({
          index: result.index,
          prompt: result.prompt,
          imageUrl: result.imageUrl
        }));
      
      setImageStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: images 
      });
      
      return images;
    } catch (error: unknown) {
      console.error("Error generating images:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setImageStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: [] 
      });
      throw error;
    }
  };

  // Step 5: Create DaVinci Resolve XML
  const createXML = async (projectFolderId: string) => {
    setXmlStatus({ ...xmlStatus, loading: true, error: null });
    
    try {
      if (!projectFolderId) {
        throw new Error('No folder ID available for XML generation');
      }
      
      // Get the chunked script data if available
      const chunkedScript = chunkStatus.output?.raw || '';
      
      const response = await fetch('/api/generate-davinci-xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          folderId: projectFolderId,
          chunkedScript: chunkedScript
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create XML');
      }
      
      const data = await response.json();
      setXmlStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: data.xmlUrl 
      });
      
      return data.xmlUrl;
    } catch (error: unknown) {
      console.error("Error creating XML:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setXmlStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Handle script generation
  const handleGenerateScript = async () => {
    if (!scriptPrompt.trim()) return;
    
    setIsGeneratingScript(true);
    setScriptGenError("");
    setGeneratedScript("");
    
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: scriptPrompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate script');
      }
      
      const data = await response.json();
      setGeneratedScript(data.script);
    } catch (error: unknown) {
      console.error("Error generating script:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setScriptGenError(errorMessage);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Copy generated script to main input
  const handleUseGeneratedScript = () => {
    setScript(generatedScript);
    // Optionally collapse the generator section after copying
    // setShowScriptGenerator(false);
  };

  // Main process handler
  const handleProcess = async () => {
    if (!script.trim()) return;
    
    setProcessing(true);
    setDownloadReady(false);
    setError("");
    
    // Reset all statuses
    setFormatStatus({ loading: false, completed: false, error: null, output: null });
    setAudioStatus({ loading: false, completed: false, error: null, output: null });
    setChunkStatus({ loading: false, completed: false, error: null, output: null });
    setImageStatus({ loading: false, completed: false, error: null, output: [] });
    setXmlStatus({ loading: false, completed: false, error: null, output: null });
    
    try {
      // Step 0: Initialize project to create a folder
      const projectFolderId = await initializeProject();
      
      // Step 1: Format script for TTS
      const formattedScript = await formatScript(projectFolderId);
      
      // Step 2: Start audio conversion (non-blocking)
      const audioPromise = convertToSpeech(formattedScript, projectFolderId);
      
      // Step 3: Chunk script (proceed without waiting for audio)
      const segments = await chunkScript(formattedScript, projectFolderId);
      
      // Step 4: Generate images
      const images = await generateImages(segments, projectFolderId);
      
      // Wait for audio to complete
      const audioUrl = await audioPromise;
      
      // Step 5: Create XML when both audio and images are ready
      if (audioUrl && images.length > 0) {
        await createXML(projectFolderId);
        setDownloadReady(true);
      }
    } catch (error: unknown) {
      console.error("Error in process workflow:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!xmlStatus.output) return;
    
    // Create a link to download the XML
    const a = document.createElement('a');
    a.href = xmlStatus.output;
    a.download = 'davinci_resolve_timeline.fcpxml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <h2 className={styles.navTitle}>Test Pages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/test-format" className={styles.navButton}>
            Test Script Formatting
          </Link>
          <Link href="/test-script-chunk" className={styles.navButton}>
            Test Script Chunking
          </Link>
          <Link href="/test-script-to-images" className={styles.navButton}>
            Test Script to Images
          </Link>
          <Link href="/test-tts" className={styles.navButton}>
            Test TTS
          </Link>
          <Link href="/test" className={styles.navButton}>
            Test Image Generation
          </Link>
          <Link href="/davinci-export" className={styles.navButton}>
            DaVinci Resolve XML
          </Link>
          <Link href="/workflow-test" className={styles.navButton}>
            New Workflow Test
          </Link>
        </div>
      </nav>

      <h1 className={styles.title}>DaVinci Resolve Project Generator</h1>
      <main className={styles.container}>
        <h2 className={styles.subtitle}>DaVinci Resolve Project Generator</h2>
        
        {/* Model Selection Dropdown */}
        <div className={styles.modelSelection}>
          <label htmlFor="imageModel">Select AI Model for Image Generation:</label>
          <select
            id="imageModel"
            value={imageModel}
            onChange={(e) => handleModelChange(e.target.value as ImageModel)}
            className={styles.modelDropdown}
          >
            <option value="ideogram">Ideogram</option>
            <option value="flux-schnell">Flux Schnell</option>
            <option value="flux-dev">Flux Dev</option>
          </select>
        </div>
        
        {/* Style Selection Dropdown */}
        {(imageModel === "flux-schnell" || imageModel === "flux-dev") && (
          <div className={styles.styleSelection}>
            <label className={styles.styleLabel}>Select Style:</label>
            <div className={styles.styleRadioGroup}>
              {styleOptions.map((option) => (
                <div key={option.uuid} className={styles.styleRadioOption}>
                  <input
                    type="radio"
                    id={`style-${option.uuid}`}
                    name="styleUUID"
                    value={option.uuid}
                    checked={styleUUID === option.uuid}
                    onChange={(e) => setStyleUUID(e.target.value)}
                  />
                  <label htmlFor={`style-${option.uuid}`}>{option.name}</label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Script Generator Section (Optional) */}
        <div className={styles.scriptGeneratorToggle}>
          <button 
            onClick={() => setShowScriptGenerator(!showScriptGenerator)} 
            className={styles.toggleBtn}
          >
            {showScriptGenerator ? "Hide Script Generator" : "Need a script? Generate one with AI"}
          </button>
        </div>
        
        {showScriptGenerator && (
          <div className={styles.scriptGenerator}>
            <h3>Generate a Script with AI</h3>
            <p className={styles.scriptGenInfo}>
              Describe your idea, and AI will create a script for you. You can then use it in the main workflow.
            </p>
            
            <div className={styles.promptInput}>
              <label htmlFor="scriptPrompt">Describe your script idea:</label>
              <textarea 
                id="scriptPrompt"
                value={scriptPrompt}
                onChange={(e) => setScriptPrompt(e.target.value)}
                placeholder="E.g., A scary story about a haunted house in the woods, or a product ad for a new smartphone..."
                disabled={isGeneratingScript}
                rows={3}
                style={{ color: 'white' }}
              />
            </div>
            
            <div className={styles.genButtons}>
              <button 
                className={styles.generateBtn}
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || !scriptPrompt.trim()}
              >
                {isGeneratingScript ? "Generating..." : "Generate Script"}
              </button>
            </div>
            
            {scriptGenError && (
              <div className={styles.error}>
                Error: {scriptGenError}
              </div>
            )}
            
            {generatedScript && (
              <div className={styles.generatedScriptContainer}>
                <h4>Generated Script:</h4>
                <div className={styles.generatedScript}>
                  <pre>{generatedScript}</pre>
                </div>
                <button 
                  className={styles.useScriptBtn}
                  onClick={handleUseGeneratedScript}
                >
                  Use This Script
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className={styles.scriptInput}>
          <label htmlFor="script">Enter your script:</label>
          <textarea 
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste your full script here..."
            disabled={processing}
            rows={10}
            style={{ color: 'black' }}
          />
        </div>

        <div className={styles.workflow}>
          <h3>Workflow:</h3>
          <ol>
            <li className={formatStatus.loading ? styles.processing : (formatStatus.completed ? styles.completed : (formatStatus.error ? styles.error : ''))}>
              Format script for TTS
              {formatStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {formatStatus.error && <div className={styles.errorMessage}>{formatStatus.error}</div>}
            </li>
            <li className={audioStatus.loading ? styles.processing : (audioStatus.completed ? styles.completed : (audioStatus.error ? styles.error : ''))}>
              Convert text to speech
              {audioStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {audioStatus.error && <div className={styles.errorMessage}>{audioStatus.error}</div>}
            </li>
            <li className={chunkStatus.loading ? styles.processing : (chunkStatus.completed ? styles.completed : (chunkStatus.error ? styles.error : ''))}>
              Chunk script
              {chunkStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {chunkStatus.error && <div className={styles.errorMessage}>{chunkStatus.error}</div>}
            </li>
            <li className={imageStatus.loading ? styles.processing : (imageStatus.completed ? styles.completed : (imageStatus.error ? styles.error : ''))}>
              Generate images for each segment
              {imageStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {imageStatus.error && <div className={styles.errorMessage}>{imageStatus.error}</div>}
            </li>
            <li className={xmlStatus.loading ? styles.processing : (xmlStatus.completed ? styles.completed : (xmlStatus.error ? styles.error : ''))}>
              Create DaVinci Resolve XML
              {xmlStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {xmlStatus.error && <div className={styles.errorMessage}>{xmlStatus.error}</div>}
            </li>
          </ol>
        </div>
        
        {error && (
          <div className={styles.error}>
            Error: {error}
          </div>
        )}

        <div className={styles.buttons}>
          <button 
            className={styles.processBtn}
            onClick={handleProcess}
            disabled={processing || !script.trim()}
          >
            {processing ? "Processing..." : "Process Script"}
          </button>
          
          {downloadReady && xmlStatus.completed && (
            <button 
              className={styles.downloadBtn}
              onClick={handleDownload}
            >
              Download Project
            </button>
          )}
        </div>
        
        {/* Display step outputs */}
        <div className={styles.outputs}>
          {/* Step 1: Formatted Script */}
          {formatStatus.completed && formatStatus.output && (
            <div className={styles.outputSection}>
              <h3>Formatted Script</h3>
              <div className={styles.formattedScript}>
                <pre>{formatStatus.output}</pre>
              </div>
            </div>
          )}
          
          {/* Step 2: Audio */}
          {audioStatus.completed && audioStatus.output && (
            <div className={styles.outputSection}>
              <h3>Generated Audio</h3>
              <audio controls src={audioStatus.output as string} className={styles.audioPlayer}></audio>
            </div>
          )}
          
          {/* Step 3: Chunked Script */}
          {chunkStatus.completed && chunkStatus.output && (
            <div className={styles.outputSection}>
              <h3>Script Segments</h3>
              <div className={styles.segmentsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Prompt</th>
                      <th>Duration (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunkStatus.output.segments.map((segment: Segment) => (
                      <tr key={segment.lineNumber}>
                        <td>{segment.lineNumber}</td>
                        <td>{segment.prompt}</td>
                        <td>{segment.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Step 4: Generated Images */}
          {imageStatus.completed && imageStatus.output && imageStatus.output.length > 0 && (
            <div className={styles.outputSection}>
              <h3>Generated Images</h3>
              <div className={styles.imagesGrid}>
                {imageStatus.output.map((image: ImageAsset) => (
                  <div key={image.index} className={styles.imageCard}>
                    <img 
                      src={image.imageUrl} 
                      alt={`Generated image ${image.index}`}
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        const currentSrc = imgElement.src;
                        
                        // If image fails to load, try alternative extension
                        if (currentSrc.endsWith('.png')) {
                          imgElement.src = currentSrc.replace('.png', '.jpg');
                        } else if (currentSrc.endsWith('.jpg')) {
                          imgElement.src = currentSrc.replace('.jpg', '.png');
                        }
                      }} 
                    />
                    <p>{image.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 5: XML Link */}
          {xmlStatus.completed && xmlStatus.output && (
            <div className={styles.outputSection}>
              <h3>DaVinci Resolve Project Ready</h3>
              <div className={styles.xmlReadySection}>
                <p>Your DaVinci Resolve project file has been created. Click the Download button above to save it.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
