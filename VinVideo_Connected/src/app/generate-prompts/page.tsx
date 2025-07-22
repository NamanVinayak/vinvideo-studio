'use client';
import { useState } from 'react';

export default function GeneratePromptsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const prompts = [
    "1: Small, brown/tan mixed-breed puppy with expressive eyes, nestled in a pile of similar puppies, mother dog with soft fur, all looking at each other, in a cozy, warm den with soft bedding, wide shot, centered composition, eye-level camera, slow dolly push, 35mm lens, shallow f/2.8 focus, warm amber soft key lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
    "2: Small, brown/tan mixed-breed puppy with expressive eyes, fur slightly ruffled, looking up in confusion and fear, blurred human legs and hands in background, on a chaotic, busy street corner, close-up, dutch angle, low angle camera, handheld shake, 50mm lens, shallow f/1.8 focus, desaturated cool fill lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
    "3: Small, brown/tan mixed-breed puppy with expressive eyes, fur matted with rain, looking forward, focused on path, walking alone through a rain-soaked, grimy alley with puddles reflecting dim streetlights, medium shot, rule-of-thirds composition, low angle camera, steadicam follow, 24mm lens, deep f/8 focus, dim soft overcast cool blue/grey lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
    "4: Middle-aged man with kind, slightly weathered face, wearing a simple jacket, looking at the puppy with gentle curiosity, small, brown/tan mixed-breed puppy with expressive eyes, fur slightly damp, backlit by golden hour light, looking at the man with tentative hope, on a quiet park bench at sunset, medium shot, over-the-shoulder composition from man's POV, eye-level camera, static, 85mm lens, shallow f/1.8 focus, warm golden hour backlight, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
    "5: Small, brown/tan mixed-breed puppy with expressive eyes, fur wet with soap, looking at a treat/toy, paws covered in bubbles, in a warm, brightly lit bathroom during a bath, extreme close-up, centered composition, eye-level camera, quick cut, 100mm macro lens, shallow f/1.4 focus, bright warm natural sunlight, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
    "6: Middle-aged man with kind, slightly weathered face, and a slightly larger, healthy, brown/tan mixed-breed dog with expressive eyes, both in silhouette, looking forward, their long, connected shadows stretching across a path, walking into a vibrant sunset landscape with a clear horizon, wide shot, silhouette composition, low angle camera, slow dolly forward, 24mm lens, deep f/11 focus, sunset golden hues, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
    "7: Vibrant sunset gradient sky with a faint silhouette of a wagging dog tail in the lower corner, no specific characters, wide shot, negative space composition, eye-level camera, static, 35mm lens, deep f/8 focus, vibrant sunset gradient lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K"
  ];

  const generateImages = async () => {
    setIsGenerating(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/generate-comfy-images-concurrent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: prompts,
          folderId: `puppy-story-${Date.now()}`,
          mode: 'auto'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to generate images');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Puppy Story Image Generation</h1>
        
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Prompts to Generate ({prompts.length} images)</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {prompts.map((prompt, index) => (
              <div key={index} className="text-sm text-gray-300 p-2 bg-gray-700 rounded">
                {prompt}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={generateImages}
          disabled={isGenerating}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isGenerating
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isGenerating ? 'Generating Images...' : 'Generate Images'}
        </button>

        {error && (
          <div className="mt-8 p-4 bg-red-600 rounded-lg">
            <h3 className="font-semibold">Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className="mt-8">
            <div className="mb-6 p-4 bg-green-600 rounded-lg">
              <h3 className="font-semibold">Generation Completed!</h3>
              <div className="mt-2 text-sm">
                <p>Generated {results.totalImages} images</p>
                <p>Processing time: {Math.round(results.executionTime / 1000)}s</p>
                {results.performance && (
                  <p>Performance: {results.performance.improvement}</p>
                )}
              </div>
            </div>

            {results.generatedImages && results.generatedImages.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Generated Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.generatedImages.map((imagePath: string, index: number) => (
                    <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={imagePath}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          console.error(`Failed to load image: ${imagePath}`);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="p-2">
                        <p className="text-sm text-gray-300">Image {index + 1}</p>
                        <p className="text-xs text-gray-400">{imagePath}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.concurrent_image_generation && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-2">Processing Details</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>Mode: {results.concurrent_image_generation.processing_mode}</p>
                  <p>Output Directory: {results.concurrent_image_generation.output_directory}</p>
                  <p>Generation Time: {results.concurrent_image_generation.generation_time_seconds}s</p>
                  {results.concurrent_image_generation.performance_improvement_percent && (
                    <p>Performance Improvement: {results.concurrent_image_generation.performance_improvement_percent}%</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}