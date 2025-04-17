import requests
import json
import os
import time
import base64
from dotenv import load_dotenv

# Load API key from your .env.local file
load_dotenv('.env.local')
api_key = os.getenv('RUNPOD_API_KEY')

# RunPod endpoint ID
endpoint_id = "sj75f1kboamkmx"

# Define API URLs
health_url = f"https://api.runpod.ai/v2/{endpoint_id}/health"
run_url = f"https://api.runpod.ai/v2/{endpoint_id}/run"
status_url = f"https://api.runpod.ai/v2/{endpoint_id}/status/"

def check_endpoint_health():
    """Check if the RunPod endpoint is healthy."""
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        response = requests.get(health_url, headers=headers)
        print(f"Health Check - Status Code: {response.status_code}")
        print(f"Health Check - Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed with error: {e}")
        return False

def save_image(url, filename="generated_image.png"):
    """Save an image from a URL to a local file"""
    try:
        response = requests.get(url)
        if response.status_code == 200:
            # Save to the public folder
            public_path = os.path.join("public", filename)
            with open(public_path, "wb") as f:
                f.write(response.content)
            print(f"Image saved as {public_path}")
            return True
        else:
            print(f"Failed to download image: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"Error saving image: {e}")
        return False

def save_base64_image(base64_string, filename="generated_image.png"):
    """Save a base64-encoded image to a local file"""
    try:
        # Save to the public folder
        public_path = os.path.join("public", filename)
        
        # Decode the base64 string and save as image
        image_data = base64.b64decode(base64_string)
        with open(public_path, "wb") as f:
            f.write(image_data)
        
        print(f"Base64 image saved as {public_path}")
        return True
    except Exception as e:
        print(f"Error saving base64 image: {e}")
        return False

def save_video(video_data, filename="generated_video.mp4"):
    """Save video data to a local file"""
    try:
        # Save to the public folder
        public_path = os.path.join("public", filename)
        
        # Write the data to file
        with open(public_path, "wb") as f:
            if isinstance(video_data, str):
                # If it's a base64 string
                f.write(base64.b64decode(video_data))
            else:
                # If it's binary data
                f.write(video_data)
        
        print(f"Video saved as {public_path}")
        return True
    except Exception as e:
        print(f"Error saving video: {e}")
        return False

def generate_image(prompt="cute anime girl with massive fluffy fennec ears and a big fluffy tail blonde messy long hair blue eyes wearing a maid outfit with a long black gold leaf pattern dress and a white apron mouth open placing a fancy black forest cake with candles on top of a dinner table of an old dark Victorian mansion lit by candlelight with a bright window to the foggy forest and very expensive stuff everywhere there are paintings on the walls", 
                  negative_prompt=""):
    """
    Generate content using the FLUX workflow format for RunPod
    """
    # The updated workflow format - FLUX workflow
    workflow = {
      "6": {
        "inputs": {
          "text": prompt,
          "clip": [
            "30",
            1
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Positive Prompt)"
        }
      },
      "8": {
        "inputs": {
          "samples": [
            "37",
            0
          ],
          "vae": [
            "30",
            2
          ]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": [
            "8",
            0
          ]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      },
      "27": {
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        },
        "class_type": "EmptySD3LatentImage",
        "_meta": {
          "title": "EmptySD3LatentImage"
        }
      },
      "30": {
        "inputs": {
          "ckpt_name": "FLUX1/flux1-dev-fp8.safetensors"
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
          "title": "Load Checkpoint"
        }
      },
      "31": {
        "inputs": {
          "seed": 237953136648084,
          "steps": 20,
          "cfg": 1,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": [
            "30",
            0
          ],
          "positive": [
            "35",
            0
          ],
          "negative": [
            "33",
            0
          ],
          "latent_image": [
            "27",
            0
          ]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "33": {
        "inputs": {
          "text": negative_prompt,
          "clip": [
            "30",
            1
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Negative Prompt)"
        }
      },
      "35": {
        "inputs": {
          "guidance": 3.5,
          "conditioning": [
            "6",
            0
          ]
        },
        "class_type": "FluxGuidance",
        "_meta": {
          "title": "FluxGuidance"
        }
      },
      "37": {
        "inputs": {
          "upscale_method": "nearest-exact",
          "scale_by": 1.5,
          "samples": [
            "31",
            0
          ]
        },
        "class_type": "LatentUpscaleBy",
        "_meta": {
          "title": "Upscale Latent By"
        }
      }
    }
    
    # Create the request payload
    payload = {
      "input": {
        "workflow": workflow
      }
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    print("Sending request to RunPod FLUX endpoint...")
    response = requests.post(run_url, headers=headers, json=payload)
    print(f"Response Status Code: {response.status_code}")
    
    if response.status_code == 200:
        job_id = response.json().get("id")
        print(f"Job submitted with ID: {job_id}")
        
        # Poll for job completion
        while True:
            status_response = requests.get(f"{status_url}{job_id}", headers=headers)
            status_data = status_response.json()
            
            status = status_data.get("status")
            print(f"Current status: {status}")
            
            if status == "COMPLETED":
                output = status_data.get("output")
                print(f"Job completed successfully!")
                
                if output:
                    # Check for base64-encoded image in "message" field
                    if isinstance(output, dict) and 'message' in output:
                        print("Found base64-encoded data in response")
                        
                        # Determine if it's a video or image based on content
                        if "video" in str(output).lower() or "mp4" in str(output).lower():
                            save_video(output['message'], "generated_video.mp4")
                        else:
                            save_base64_image(output['message'], "generated_image.png")
                        
                        return output
                    
                    # Try to save videos or images from the output (URL format)
                    if isinstance(output, dict):
                        if 'videos' in output and isinstance(output['videos'], list) and output['videos']:
                            for i, video_url in enumerate(output['videos']):
                                video_response = requests.get(video_url)
                                save_path = os.path.join("public", f"generated_video_{i}.mp4")
                                with open(save_path, "wb") as f:
                                    f.write(video_response.content)
                                print(f"Video saved as {save_path}")
                            return output
                        
                        if 'images' in output and isinstance(output['images'], list) and output['images']:
                            for i, image_url in enumerate(output['images']):
                                save_image(image_url, f"generated_image_{i}.png")
                            return output
                        
                        print("No 'images' or 'videos' field found in output. Complete output:")
                        print(json.dumps(output, indent=2))
                
                return output
            
            elif status in ["FAILED", "ERROR"]:
                error_msg = status_data.get('error', 'Unknown error')
                print(f"Job failed with error: {error_msg}")
                return None
            
            # Wait 5 seconds before checking again
            time.sleep(5)
    else:
        print(f"Failed to submit job: {response.text}")
        return None

def main():
    # First check if the endpoint is healthy
    print("Checking endpoint health...")
    if not check_endpoint_health():
        print("Endpoint health check failed. Please check your endpoint ID and API key.")
        return
    
    # User input for prompts
    use_default = input("Use default workflow? (y/n): ").lower() == 'y'
    
    if not use_default:
        prompt = input("Enter your prompt: ")
        negative_prompt = input("Enter negative prompt (or press Enter for default): ")
        # Generate the content with custom prompts
        result = generate_image(prompt, negative_prompt)
    else:
        print("Using default settings.")
        # Generate the content with default prompts
        result = generate_image()
    
    print("\nGenerating content with FLUX workflow...")
    
    if result:
        print("Content generation successful!")
    else:
        print("Content generation failed.")

if __name__ == "__main__":
    main()

