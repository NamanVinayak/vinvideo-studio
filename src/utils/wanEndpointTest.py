import requests
import json
import os
import time
import base64
from dotenv import load_dotenv

# Load API key from your .env.local file
load_dotenv('.env.local')
api_key = os.getenv('ARSHH_RUNPOD_API_KEY')

# RunPod endpoint ID
endpoint_id = "umhsvxn4l1sw85"

# Define API URLs
health_url = f"https://api.runpod.ai/v2/{endpoint_id}/health"
run_url = f"https://api.runpod.ai/v2/{endpoint_id}/run"
status_url = f"https://api.runpod.ai/v2/{endpoint_id}/status/"

# Define path for output files
# You can set this to an absolute path to ensure files are saved in a known location
OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'public')

# Path to the input image for video generation
IMAGE_PATH = os.path.join('public', 'flux_dev_example.png')

def encode_image_to_base64(image_path):
    """Encode an image to base64 for including in the API request"""
    try:
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        return None

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

def save_video(video_data, filename="generated_video.mp4"):
    """Save video data to a local file"""
    try:
        # Ensure public directory exists
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Save to the public folder
        public_path = os.path.join(OUTPUT_DIR, filename)
        
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

def generate_video(prompt="cute anime girl rotating around in her room", 
                  negative_prompt="deformed, distorted, disfigured, motion smear, blur",
                  output_filename="generated_video.mp4"):
    """
    Generate video content using the WAN (Wan Animation Network) workflow format for RunPod
    """
    # Encode the input image to base64
    image_data = encode_image_to_base64(IMAGE_PATH)
    if not image_data:
        print(f"Failed to encode image: {IMAGE_PATH}")
        print("Using default server-side image instead.")
        # Fall back to a default method without uploaded image
        base64_input = None
    else:
        # Use uploaded image data
        print(f"Successfully encoded image for upload: {IMAGE_PATH}")
        base64_input = image_data
        
    # Update the image input node format to match required fields
    image_input = {
        "image": None,
        "image_output": "Save",
        "save_prefix": "input_image",
        "base64_data": base64_input
    }
        
    # REDUCED PARAMETERS: Using a simplified workflow with reduced length and resolution
    workflow = {
      "3": {
        "inputs": {
          "seed": 921088492921482,
          "steps": 20,
          "cfg": 6,
          "sampler_name": "uni_pc",
          "scheduler": "simple",
          "denoise": 1,
          "model": [
            "89",
            0
          ],
          "positive": [
            "82",
            0
          ],
          "negative": [
            "82",
            1
          ],
          "latent_image": [
            "82",
            2
          ]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": [
            "38",
            0
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Positive Prompt)"
        }
      },
      "7": {
        "inputs": {
          "text": negative_prompt,
          "clip": [
            "38",
            0
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Negative Prompt)"
        }
      },
      "8": {
        "inputs": {
          "samples": [
            "3",
            0
          ],
          "vae": [
            "83",
            0
          ]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "37": {
        "inputs": {
          "unet_name": "wan2.1_i2v_720p_14B_bf16.safetensors",
          "weight_dtype": "default"
        },
        "class_type": "UNETLoader",
        "_meta": {
          "title": "Load Diffusion Model"
        }
      },
      "38": {
        "inputs": {
          "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
          "type": "wan",
          "device": "default"
        },
        "class_type": "CLIPLoader",
        "_meta": {
          "title": "Load CLIP"
        }
      },
      "53": {
        "inputs": {
          "frame_rate": 16,
          "loop_count": 0,
          "filename_prefix": "InstaSD",
          "format": "video/h264-mp4",
          "pix_fmt": "yuv420p",
          "crf": 19,
          "save_metadata": True,
          "trim_to_audio": False,
          "pingpong": False,
          "save_output": True,
          "images": [
            "8",
            0
          ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
          "title": "Video Combine 🎥🅥🅗🅢"
        }
      },
      "65": {
        "inputs": {
          "value": "a*b",
          "a": [
            "67",
            1
          ],
          "b": [
            "76",
            0
          ]
        },
        "class_type": "SimpleMath+",
        "_meta": {
          "title": "height"
        }
      },
      "66": {
        "inputs": {
          "value": "a*b",
          "a": [
            "67",
            0
          ],
          "b": [
            "76",
            0
          ]
        },
        "class_type": "SimpleMath+",
        "_meta": {
          "title": "width"
        }
      },
      "67": {
        "inputs": {
          "image": [
            "68",
            0
          ]
        },
        "class_type": "GetImageSize+",
        "_meta": {
          "title": "🔧 Get Image Size"
        }
      },
      "68": {
        "inputs": {
          "start": 0,
          "length": 1,
          "image": [
            "69",
            0
          ]
        },
        "class_type": "ImageFromBatch+",
        "_meta": {
          "title": "🔧 Image From Batch"
        }
      },
      "69": {
        "inputs": {
          "images": [
            "8",
            0
          ]
        },
        "class_type": "ImageListToImageBatch",
        "_meta": {
          "title": "Image List to Image Batch"
        }
      },
      "70": {
        "inputs": {
          "frame_rate": 16,
          "loop_count": 0,
          "filename_prefix": "InstaSD",
          "format": "video/h264-mp4",
          "pix_fmt": "yuv420p",
          "crf": 19,
          "save_metadata": True,
          "trim_to_audio": False,
          "pingpong": False,
          "save_output": True,
          "images": [
            "73",
            0
          ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
          "title": "Video Combine 🎥🅥🅗🅢"
        }
      },
      "72": {
        "inputs": {
          "frame_rate": 16,
          "loop_count": 0,
          "filename_prefix": "InstaSD",
          "format": "video/h264-mp4",
          "pix_fmt": "yuv420p",
          "crf": 19,
          "save_metadata": True,
          "trim_to_audio": False,
          "pingpong": False,
          "save_output": True,
          "images": [
            "75",
            0
          ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
          "title": "Video Combine 🎥🅥🅗🅢"
        }
      },
      "73": {
        "inputs": {
          "upscale_model": [
            "77",
            0
          ],
          "image": [
            "8",
            0
          ]
        },
        "class_type": "ImageUpscaleWithModel",
        "_meta": {
          "title": "Upscale Image (using Model)"
        }
      },
      "75": {
        "inputs": {
          "upscale_method": "lanczos",
          "width": [
            "66",
            0
          ],
          "height": [
            "65",
            0
          ],
          "crop": "center",
          "image": [
            "73",
            0
          ]
        },
        "class_type": "ImageScale",
        "_meta": {
          "title": "Upscale Image"
        }
      },
      "76": {
        "inputs": {
          "Number": "2"
        },
        "class_type": "Int",
        "_meta": {
          "title": "Upscale Factor"
        }
      },
      "77": {
        "inputs": {
          "model_name": "OmniSR_X2_DIV2K.safetensors"
        },
        "class_type": "UpscaleModelLoader",
        "_meta": {
          "title": "Upscaler"
        }
      },
      "79": {
        "inputs": {
          "crop": "none",
          "clip_vision": [
            "81",
            0
          ],
          "image": [
            "80",
            0
          ]
        },
        "class_type": "CLIPVisionEncode",
        "_meta": {
          "title": "CLIP Vision Encode"
        }
      },
      "80": {
        "inputs": image_input,
        "class_type": "easy loadImageBase64",
        "_meta": {
          "title": "Load Image Base64"
        }
      },
      "81": {
        "inputs": {
          "clip_name": "clip_vision_h.safetensors"
        },
        "class_type": "CLIPVisionLoader",
        "_meta": {
          "title": "Load CLIP Vision"
        }
      },
      "82": {
        "inputs": {
          "width": 544,  # REDUCED from 544
          "height": 960,  # REDUCED from 960
          "length": 73,   # REDUCED from 73 (cut in half)
          "batch_size": 1,
          "positive": [
            "6",
            0
          ],
          "negative": [
            "7",
            0
          ],
          "vae": [
            "83",
            0
          ],
          "clip_vision_output": [
            "79",
            0
          ],
          "start_image": [
            "80",
            0
          ]
        },
        "class_type": "WanImageToVideo",
        "_meta": {
          "title": "WanImageToVideo"
        }
      },
      "83": {
        "inputs": {
          "vae_name": "wan_2.1_vae.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": {
          "title": "Load VAE"
        }
      },
      "89": {
        "inputs": {
          "shift": 8,
          "model": [
            "37",
            0
          ]
        },
        "class_type": "ModelSamplingSD3",
        "_meta": {
          "title": "ModelSamplingSD3"
        }
      },
      "91": {
        "inputs": {
          "ckpt_name": "rife47.pth",
          "clear_cache_after_n_frames": 10,
          "multiplier": 2,
          "fast_mode": True,
          "ensemble": True,
          "scale_factor": 1,
          "frames": [
            "75",
            0
          ]
        },
        "class_type": "RIFE VFI",
        "_meta": {
          "title": "RIFE VFI (recommend rife47 and rife49)"
        }
      },
      "92": {
        "inputs": {
          "frame_rate": 24,
          "loop_count": 0,
          "filename_prefix": "comfyuiblog",
          "format": "video/h264-mp4",
          "pix_fmt": "yuv420p",
          "crf": 10,
          "save_metadata": True,
          "trim_to_audio": False,
          "pingpong": False,
          "save_output": True,
          "images": [
            "91",
            0
          ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
          "title": "Video Combine 🎥🅥🅗🅢"
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
    
    # Implement a retry mechanism
    max_retries = 2
    retry_count = 0
    
    while retry_count <= max_retries:
        try:
            print(f"Sending request to RunPod WAN endpoint (attempt {retry_count + 1}/{max_retries + 1})...")
            response = requests.post(run_url, headers=headers, json=payload)
            print(f"Response Status Code: {response.status_code}")
            
            if response.status_code == 200:
                job_id = response.json().get("id")
                print(f"Job submitted with ID: {job_id}")
                
                # Poll for job completion with a longer timeout
                start_time = time.time()
                max_duration = 15 * 60  # 15 minutes max wait time
                
                while (time.time() - start_time) < max_duration:
                    status_response = requests.get(f"{status_url}{job_id}", headers=headers)
                    status_data = status_response.json()
                    
                    status = status_data.get("status")
                    print(f"Current status: {status}")
                    
                    if status == "COMPLETED":
                        output = status_data.get("output")
                        print(f"Job completed successfully!")
                        print(f"Output type: {type(output)}")
                        print(f"Full response structure: {json.dumps(status_data, indent=2)}")
                
                        # Variable to track if any video was saved
                        any_videos_saved = False
                        saved_videos = []
                
                        # Try to find video data in the response
                        try:
                            if output:
                                print(f"Output keys: {output.keys() if isinstance(output, dict) else 'Not a dictionary'}")
                                
                                # Process node outputs for videos
                                if isinstance(output, dict) and 'node_outputs' in output:
                                    node_outputs = output['node_outputs']
                                    print(f"Found node_outputs: {list(node_outputs.keys()) if isinstance(node_outputs, dict) else 'Not a dictionary'}")
                                    
                                    # Look for video outputs from various VHS_VideoCombine nodes
                                    for node_id in ['92', '72', '70', '53']:
                                        node_output_filename = f"generated_video_node{node_id}.mp4"
                                        
                                        if node_id in node_outputs:
                                            print(f"Found output from VHS_VideoCombine node ({node_id})")
                                            video_data = node_outputs[node_id]
                                            
                                            if isinstance(video_data, list) and len(video_data) > 0:
                                                for i, vid_item in enumerate(video_data):
                                                    item_filename = f"generated_video_node{node_id}_item{i}.mp4"
                                                    if isinstance(vid_item, dict) and 'filename' in vid_item:
                                                        print(f"Video file name: {vid_item['filename']}")
                                                        if 'data' in vid_item:
                                                            print(f"Found video data in node {node_id}")
                                                            if save_video(vid_item['data'], item_filename):
                                                                any_videos_saved = True
                                                                saved_videos.append(item_filename)
                                                    elif isinstance(vid_item, str):
                                                        print(f"Found video data string in node {node_id}")
                                                        if save_video(vid_item, item_filename):
                                                            any_videos_saved = True
                                                            saved_videos.append(item_filename)
                                            elif isinstance(video_data, dict) and 'filename' in video_data and 'data' in video_data:
                                                print(f"Found video data in node {node_id}")
                                                if save_video(video_data['data'], node_output_filename):
                                                    any_videos_saved = True
                                                    saved_videos.append(node_output_filename)
                                            elif isinstance(video_data, str):
                                                print(f"Found video data string in node {node_id}")
                                                if save_video(video_data, node_output_filename):
                                                    any_videos_saved = True
                                                    saved_videos.append(node_output_filename)
                                
                                # Check for videos array
                                if isinstance(output, dict) and 'videos' in output and isinstance(output['videos'], list) and output['videos']:
                                    print(f"Found videos array with {len(output['videos'])} items")
                                    for i, vid_data in enumerate(output['videos']):
                                        array_filename = f"generated_video_array{i}.mp4"
                                        if isinstance(vid_data, str) and (vid_data.startswith('http') or vid_data.startswith('https')):
                                            # It's a URL, download it
                                            print(f"Video {i} is a URL")
                                            response = requests.get(vid_data)
                                            with open(os.path.join(OUTPUT_DIR, array_filename), 'wb') as f:
                                                f.write(response.content)
                                            print(f"Video saved as {os.path.join(OUTPUT_DIR, array_filename)}")
                                            any_videos_saved = True
                                            saved_videos.append(array_filename)
                                        else:
                                            # Assume it's base64 data
                                            print(f"Video {i} appears to be base64 data")
                                            if save_video(vid_data, array_filename):
                                                any_videos_saved = True
                                                saved_videos.append(array_filename)
                                
                                # Check for 'video' field
                                if isinstance(output, dict) and 'video' in output:
                                    print("Found 'video' field in output")
                                    if save_video(output['video'], output_filename):
                                        any_videos_saved = True
                                        saved_videos.append(output_filename)
                                    
                                # Save the entire output as JSON for reference
                                with open(os.path.join(OUTPUT_DIR, "output.json"), "w") as f:
                                    json.dump(output, f, indent=2)
                                
                                if not any_videos_saved:
                                    print("No video outputs were successfully saved.")
                                else:
                                    print(f"Successfully saved {len(saved_videos)} video(s): {', '.join(saved_videos)}")
                                
                        except Exception as processing_error:
                            print(f"Error processing output: {processing_error}")
                            # Save the raw output for debugging
                            try:
                                with open(os.path.join(OUTPUT_DIR, "raw_output.json"), "w") as f:
                                    json.dump(status_data, f, indent=2)
                                print(f"Raw output saved to {os.path.join(OUTPUT_DIR, 'raw_output.json')}")
                            except:
                                pass
                        
                        return output
                    
                    elif status in ["FAILED", "ERROR"]:
                        error_msg = status_data.get('error', 'Unknown error')
                        print(f"Job failed with error: {error_msg}")
                        # If it's a timeout-related error, we'll retry
                        if "Max retries reached" in error_msg or "timeout" in error_msg.lower():
                            break  # Break out of the polling loop to retry
                        else:
                            return None  # For non-timeout errors, don't retry
                    
                    # Wait 5 seconds before checking again
                    time.sleep(5)
                
                # If we've reached here, either the job timed out or failed with a retryable error
                print(f"Job execution taking too long or retryable error. Retrying...")
                retry_count += 1
                
            else:
                print(f"Failed to submit job: {response.text}")
                if response.status_code >= 500:  # Server error, worth retrying
                    retry_count += 1
                    print(f"Server error. Retrying...")
                    time.sleep(5)  # Wait before retry
                else:
                    return None  # Client error, don't retry
                
        except Exception as e:
            print(f"Exception during API request: {e}")
            retry_count += 1
            time.sleep(5)  # Wait before retry
    
    print(f"Exhausted all {max_retries + 1} attempts. Video generation failed.")
    return None

def main():
    # First check if the endpoint is healthy
    print("Checking endpoint health...")
    if not check_endpoint_health():
        print("Endpoint health check failed. Please check your endpoint ID and API key.")
        return
    
    # Show output directory information
    abs_output_dir = os.path.abspath(OUTPUT_DIR)
    print(f"Output files will be saved to: {abs_output_dir}")
    
    # Use the default parameters from the generate_video function
    print("\nGenerating video with default parameters:")
    print(f"Using input image: {IMAGE_PATH}")
    print("\nThis may take several minutes. Please wait...")
    
    # Generate video with the default parameters
    result = generate_video()
    
    if result:
        print("Video generation successful!")
        video_path = os.path.join(abs_output_dir, "generated_video.mp4")
        print(f"Video saved to: {video_path}")
    else:
        print("Video generation failed.")

if __name__ == "__main__":
    main()