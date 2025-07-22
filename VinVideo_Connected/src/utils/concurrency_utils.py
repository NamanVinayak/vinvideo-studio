"""
Shared utilities for concurrent RunPod image generation
Provides worker capacity detection and batch management utilities
"""

import os
import requests
import time
import logging
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class WorkerCapacity:
    """Data class for worker capacity information"""
    total_workers: int
    idle_workers: int
    running_workers: int
    jobs_in_queue: int
    jobs_in_progress: int
    available_capacity: int
    health_data: Dict

@dataclass
class BatchConfig:
    """Configuration for batch processing"""
    max_concurrent_jobs: int
    polling_interval: int
    retry_attempts: int
    fallback_to_sequential: bool

def load_api_configuration() -> Tuple[str, str, Dict[str, str]]:
    """
    Load API configuration from environment variables
    Returns: (api_key, endpoint_id, urls)
    """
    # Load API key from environment variables
    api_key = os.getenv('RUNPOD_API_KEY')
    if not api_key:
        load_dotenv('../../.env.local')
        api_key = os.getenv('RUNPOD_API_KEY')
    
    if not api_key:
        raise ValueError("RUNPOD_API_KEY not found in environment variables")
    
    # RunPod endpoint ID
    endpoint_id = "5lq23g82tx2u2k"
    
    # Define API URLs
    urls = {
        'health': f"https://api.runpod.ai/v2/{endpoint_id}/health",
        'run': f"https://api.runpod.ai/v2/{endpoint_id}/run",
        'status': f"https://api.runpod.ai/v2/{endpoint_id}/status/"
    }
    
    return api_key, endpoint_id, urls

def get_worker_capacity(api_key: str, health_url: str) -> Optional[WorkerCapacity]:
    """
    Get detailed worker capacity from RunPod health endpoint
    
    Args:
        api_key: RunPod API key
        health_url: Health check endpoint URL
        
    Returns:
        WorkerCapacity object or None if failed
    """
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        response = requests.get(health_url, headers=headers, timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            
            # Extract worker information
            workers = health_data.get('workers', {})
            jobs = health_data.get('jobs', {})
            
            return WorkerCapacity(
                total_workers=workers.get('idle', 0) + workers.get('running', 0),
                idle_workers=workers.get('idle', 0),
                running_workers=workers.get('running', 0),
                jobs_in_queue=jobs.get('inQueue', 0),
                jobs_in_progress=jobs.get('inProgress', 0),
                available_capacity=workers.get('idle', 0),
                health_data=health_data
            )
        else:
            logger.warning(f"Health check failed with status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Worker capacity check failed: {e}")
        return None

def calculate_safe_batch_size(capacity_info: Optional[WorkerCapacity], total_prompts: int) -> int:
    """
    Calculate safe batch size without complex optimization
    
    Args:
        capacity_info: Worker capacity information
        total_prompts: Total number of prompts to process
        
    Returns:
        Safe number of concurrent jobs
    """
    if not capacity_info:
        logger.info("No capacity info available, falling back to sequential processing")
        return 1
    
    idle_workers = capacity_info.idle_workers
    
    # Queue-based approach: use 80% of idle workers with smart retry for 100% success rate
    max_concurrent = max(1, int(idle_workers * 0.8))
    
    # Don't exceed total prompts, cap at queue-friendly limit for reliability
    safe_concurrent = min(max_concurrent, total_prompts, 4)
    
    logger.info(f"🎯 Worker Analysis:")
    logger.info(f"   Total Workers: {capacity_info.total_workers}")
    logger.info(f"   Idle Workers: {idle_workers}")
    logger.info(f"   Running Workers: {capacity_info.running_workers}")
    logger.info(f"   Jobs in Queue: {capacity_info.jobs_in_queue}")
    logger.info(f"   Safe Concurrency: {safe_concurrent}")
    
    return safe_concurrent

def progressive_scaling_strategy(prompts: List[str], capacity_info: Optional[WorkerCapacity]) -> int:
    """
    Simple scaling based on prompt count and worker capacity
    
    Args:
        prompts: List of prompts to process
        capacity_info: Worker capacity information
        
    Returns:
        Optimal number of concurrent jobs
    """
    total_prompts = len(prompts)
    
    # Small batches: conservative
    if total_prompts <= 4:
        return min(2, total_prompts)
    
    # Medium batches: conservative for reliability  
    elif total_prompts <= 10:
        return min(3, total_prompts)
    
    # Large batches: very conservative with worker capacity
    else:
        if capacity_info:
            return calculate_safe_batch_size(capacity_info, total_prompts)
        return min(3, total_prompts)  # Very safe fallback

def get_batch_config() -> BatchConfig:
    """
    Get batch processing configuration from environment variables
    
    Returns:
        BatchConfig object with processing parameters
    """
    return BatchConfig(
        max_concurrent_jobs=int(os.getenv('RUNPOD_MAX_CONCURRENT_JOBS', '4')),  # Reduced from 6 to 4 for stability
        polling_interval=int(os.getenv('RUNPOD_POLLING_INTERVAL', '2')),
        retry_attempts=int(os.getenv('RUNPOD_RETRY_ATTEMPTS', '3')),
        fallback_to_sequential=os.getenv('RUNPOD_FALLBACK_MODE', 'sequential').lower() == 'sequential'
    )

def create_flux_workflow(prompt: str, negative_prompt: str = "") -> Dict:
    """
    Create FLUX workflow configuration for ComfyUI
    
    Args:
        prompt: Main image generation prompt
        negative_prompt: Negative prompt (optional)
        
    Returns:
        Complete workflow dictionary
    """
    return {
        "6": {
            "inputs": {
                "text": prompt,
                "clip": ["30", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "CLIP Text Encode (Positive Prompt)"}
        },
        "8": {
            "inputs": {
                "samples": ["31", 0],
                "vae": ["30", 2]
            },
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "9": {
            "inputs": {
                "filename_prefix": "ComfyUI",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        },
        "27": {
            "inputs": {
                "width": 1216,
                "height": 832,
                "batch_size": 1
            },
            "class_type": "EmptySD3LatentImage",
            "_meta": {"title": "EmptySD3LatentImage"}
        },
        "30": {
            "inputs": {
                "ckpt_name": "flux1-dev-fp8.safetensors"
            },
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "31": {
            "inputs": {
                "seed": int(time.time() * 1000000) % 1000000000000,  # Dynamic seed
                "steps": 20,
                "cfg": 1,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1,
                "model": ["30", 0],
                "positive": ["35", 0],
                "negative": ["33", 0],
                "latent_image": ["27", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "33": {
            "inputs": {
                "text": negative_prompt,
                "clip": ["30", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "CLIP Text Encode (Negative Prompt)"}
        },
        "35": {
            "inputs": {
                "guidance": 3.5,
                "conditioning": ["6", 0]
            },
            "class_type": "FluxGuidance",
            "_meta": {"title": "FluxGuidance"}
        }
    }

def basic_performance_tracking(active_jobs: int, total_jobs: int, failed_jobs: int, 
                              completion_times: List[float], available_workers: int) -> Dict:
    """
    Track essential performance metrics
    
    Args:
        active_jobs: Number of currently active jobs
        total_jobs: Total number of jobs processed
        failed_jobs: Number of failed jobs
        completion_times: List of job completion times
        available_workers: Number of available workers
        
    Returns:
        Dictionary of performance metrics
    """
    if not completion_times:
        avg_completion_time = 0
    else:
        avg_completion_time = sum(completion_times) / len(completion_times)
    
    failure_rate = (failed_jobs / max(total_jobs, 1)) * 100
    worker_utilization = (active_jobs / max(available_workers, 1)) * 100
    
    return {
        'concurrent_jobs_submitted': active_jobs,
        'total_jobs_processed': total_jobs,
        'average_completion_time': round(avg_completion_time, 2),
        'failure_rate_percent': round(failure_rate, 2),
        'worker_utilization_percent': round(worker_utilization, 2),
        'successful_jobs': total_jobs - failed_jobs
    }

def should_use_concurrent_mode(prompts: List[str]) -> bool:
    """
    Determine if concurrent mode should be used based on prompt count
    
    Args:
        prompts: List of prompts to process
        
    Returns:
        True if concurrent mode should be used
    """
    # Use concurrent mode for 2+ prompts
    return len(prompts) >= 2

def log_performance_summary(metrics: Dict, execution_time: float):
    """
    Log performance summary for analysis
    
    Args:
        metrics: Performance metrics dictionary
        execution_time: Total execution time in seconds
    """
    logger.info("🎯 PERFORMANCE SUMMARY:")
    logger.info(f"   Total Execution Time: {execution_time:.1f}s")
    logger.info(f"   Jobs Processed: {metrics['total_jobs_processed']}")
    logger.info(f"   Successful Jobs: {metrics['successful_jobs']}")
    logger.info(f"   Average Job Time: {metrics['average_completion_time']:.1f}s")
    logger.info(f"   Failure Rate: {metrics['failure_rate_percent']:.1f}%")
    logger.info(f"   Worker Utilization: {metrics['worker_utilization_percent']:.1f}%")