#!/usr/bin/env python3
"""
Temporary script to generate images from prompts using ComfyUI on RunPod
"""

import json
import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

def main():
    # Your prompts
    prompts = [
        "1: Small, brown/tan mixed-breed puppy with expressive eyes, nestled in a pile of similar puppies, mother dog with soft fur, all looking at each other, in a cozy, warm den with soft bedding, wide shot, centered composition, eye-level camera, slow dolly push, 35mm lens, shallow f/2.8 focus, warm amber soft key lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
        "2: Small, brown/tan mixed-breed puppy with expressive eyes, fur slightly ruffled, looking up in confusion and fear, blurred human legs and hands in background, on a chaotic, busy street corner, close-up, dutch angle, low angle camera, handheld shake, 50mm lens, shallow f/1.8 focus, desaturated cool fill lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
        "3: Small, brown/tan mixed-breed puppy with expressive eyes, fur matted with rain, looking forward, focused on path, walking alone through a rain-soaked, grimy alley with puddles reflecting dim streetlights, medium shot, rule-of-thirds composition, low angle camera, steadicam follow, 24mm lens, deep f/8 focus, dim soft overcast cool blue/grey lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
        "4: Middle-aged man with kind, slightly weathered face, wearing a simple jacket, looking at the puppy with gentle curiosity, small, brown/tan mixed-breed puppy with expressive eyes, fur slightly damp, backlit by golden hour light, looking at the man with tentative hope, on a quiet park bench at sunset, medium shot, over-the-shoulder composition from man's POV, eye-level camera, static, 85mm lens, shallow f/1.8 focus, warm golden hour backlight, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
        "5: Small, brown/tan mixed-breed puppy with expressive eyes, fur wet with soap, looking at a treat/toy, paws covered in bubbles, in a warm, brightly lit bathroom during a bath, extreme close-up, centered composition, eye-level camera, quick cut, 100mm macro lens, shallow f/1.4 focus, bright warm natural sunlight, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
        "6: Middle-aged man with kind, slightly weathered face, and a slightly larger, healthy, brown/tan mixed-breed dog with expressive eyes, both in silhouette, looking forward, their long, connected shadows stretching across a path, walking into a vibrant sunset landscape with a clear horizon, wide shot, silhouette composition, low angle camera, slow dolly forward, 24mm lens, deep f/11 focus, sunset golden hues, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K",
        "7: Vibrant sunset gradient sky with a faint silhouette of a wagging dog tail in the lower corner, no specific characters, wide shot, negative space composition, eye-level camera, static, 35mm lens, deep f/8 focus, vibrant sunset gradient lighting, cinematic, realistic, emotional, Pixar-style warmth, 16:9 8K"
    ]
    
    print(f"🚀 Starting image generation for {len(prompts)} prompts...")
    
    # Create temporary prompts file
    temp_prompts_file = "temp_prompts.json"
    with open(temp_prompts_file, 'w') as f:
        json.dump(prompts, f, indent=2)
    
    print(f"💾 Created temporary prompts file: {temp_prompts_file}")
    
    # Check if concurrent script exists
    utils_dir = Path("src/utils")
    concurrent_script = utils_dir / "comfyEndpointConcurrent.py"
    
    if concurrent_script.exists():
        print("🔧 Using concurrent processing script...")
        script_to_use = str(concurrent_script)
        mode = "auto"
    else:
        # Fallback to sequential script
        sequential_script = utils_dir / "comfyEndpointTest.py"
        if sequential_script.exists():
            print("🔧 Using sequential processing script...")
            script_to_use = str(sequential_script)
            mode = "sequential"
        else:
            print("❌ No ComfyUI scripts found!")
            return
    
    # Load API key using the same method as the main scripts
    api_key = os.getenv('RUNPOD_API_KEY')
    if not api_key:
        load_dotenv('.env.local')
        api_key = os.getenv('RUNPOD_API_KEY')
    
    if not api_key:
        print("⚠️  Warning: RUNPOD_API_KEY not found in environment or .env.local")
        print("Make sure you have set your RunPod API key in .env.local")
        return
    
    print("✅ RunPod API key loaded successfully")
    
    # Set up environment
    output_dir = Path("public/puppy-story-temp")
    output_dir.mkdir(exist_ok=True)
    
    env = os.environ.copy()
    env.update({
        'RUNPOD_API_KEY': api_key,
        'OUTPUT_DIR': str(output_dir),
        'RUNPOD_MAX_CONCURRENT_JOBS': '6'
    })
    
    # Run the script
    try:
        cmd = [
            'python3', 
            script_to_use,
            '--prompts-file', temp_prompts_file
        ]
        
        if 'concurrent' in script_to_use:
            cmd.extend(['--mode', mode])
        
        print(f"🐍 Executing: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            env=env,
            cwd=".",  # Run from project root
            capture_output=True,
            text=True
        )
        
        print("📊 Script output:")
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print("⚠️ Stderr:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("✅ Image generation completed successfully!")
            
            # List generated images
            images = list(output_dir.glob("*.png"))
            if images:
                print(f"📸 Generated {len(images)} images:")
                for img in sorted(images):
                    print(f"  - {img.name}")
                print(f"\n🖼️  Images saved in: {output_dir}")
            else:
                print("⚠️ No images found in output directory")
        else:
            print(f"❌ Script failed with exit code: {result.returncode}")
            
    except Exception as e:
        print(f"❌ Error running script: {e}")
    
    finally:
        # Clean up temp file
        try:
            os.remove(temp_prompts_file)
            print(f"🧹 Cleaned up {temp_prompts_file}")
        except:
            pass

if __name__ == "__main__":
    main()