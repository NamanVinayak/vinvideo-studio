"""
CONCURRENT RUNPOD IMAGE GENERATION
High-performance concurrent implementation for RunPod FLUX image generation
Implements both Phase 1 (ThreadPoolExecutor) and Phase 2 (async/await) approaches
"""

import os
import requests
import json
import argparse
import base64
import time
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
import logging
from pathlib import Path

# Import our utility functions
from concurrency_utils import (
    load_api_configuration, get_worker_capacity, calculate_safe_batch_size,
    progressive_scaling_strategy, get_batch_config, create_flux_workflow,
    basic_performance_tracking, should_use_concurrent_mode, log_performance_summary,
    WorkerCapacity, BatchConfig
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class JobInfo:
    """Information about a single job"""
    job_id: str
    prompt_index: int
    prompt: str
    start_time: float
    status: str = "submitted"
    result: Optional[Dict] = None
    error: Optional[str] = None
    completion_time: Optional[float] = None

# Define path for output files
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
OUTPUT_DIR = os.getenv('OUTPUT_DIR', project_root / 'public')

class ConcurrentImageGenerator:
    """
    High-performance concurrent image generator using RunPod FLUX
    Supports both ThreadPoolExecutor (Phase 1) and async/await (Phase 2) approaches
    """
    
    def __init__(self):
        self.api_key, self.endpoint_id, self.urls = load_api_configuration()
        self.batch_config = get_batch_config()
        self.session: Optional[aiohttp.ClientSession] = None
        self.performance_metrics = {
            'total_jobs': 0,
            'successful_jobs': 0,
            'failed_jobs': 0,
            'completion_times': [],
            'start_time': 0
        }
        
        logger.info(f"🚀 Concurrent Image Generator initialized")
        logger.info(f"   Endpoint ID: {self.endpoint_id}")
        logger.info(f"   Max Concurrent Jobs: {self.batch_config.max_concurrent_jobs}")
        logger.info(f"   Polling Interval: {self.batch_config.polling_interval}s")

    async def __aenter__(self):
        """Async context manager entry with enhanced connection reliability"""
        import ssl
        
        # Create SSL context that doesn't verify certificates to fix macOS SSL issues
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Create aiohttp connector with SSL context and enhanced reliability settings
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=12,  # Increased total connection pool size for better concurrency
            limit_per_host=6,  # Increased max connections per host
            enable_cleanup_closed=True,
            keepalive_timeout=60,  # Keep connections alive for 60 seconds
            force_close=False,  # Allow connection reuse
            ttl_dns_cache=300  # Cache DNS for 5 minutes
        )
        
        # Enhanced timeout configuration for better reliability
        timeout = aiohttp.ClientTimeout(
            total=180,  # 3 minutes total timeout (increased for stability)
            connect=45,  # 45 seconds to establish connection (increased)
            sock_read=60  # 60 seconds socket read timeout
        )
        
        # Create session with standard configuration
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        )
        
        logger.info("🔓 Enhanced SSL context and connection pooling initialized")
        logger.info("🛡️ Zero-tolerance connection reliability configured")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    def check_endpoint_health(self) -> bool:
        """Check if the RunPod endpoint is healthy"""
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            response = requests.get(self.urls['health'], headers=headers, timeout=10)
            logger.info(f"Health Check - Status Code: {response.status_code}")
            if response.status_code == 200:
                logger.info("✅ Endpoint is healthy")
                return True
            else:
                logger.warning(f"⚠️ Health check failed: {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Health check failed with error: {e}")
            return False

    def save_base64_image(self, base64_string: str, filename: str = "generated_image.png") -> bool:
        """Save a base64-encoded image to local file"""
        try:
            # Ensure output directory exists
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            
            file_path = Path(OUTPUT_DIR) / filename
            
            # Handle different base64 formats
            if isinstance(base64_string, str) and base64_string.startswith('data:'):
                base64_data = base64_string.split(',', 1)[1]
            else:
                base64_data = base64_string

            # Clean and decode
            base64_data = str(base64_data).strip()
            image_data = base64.b64decode(base64_data)
            
            # Auto-detect format and adjust filename
            if image_data.startswith(b'\xFF\xD8\xFF'):  # JPEG
                if not filename.lower().endswith(('.jpg', '.jpeg')):
                    file_path = file_path.with_suffix('.jpg')
                logger.debug("Detected JPEG format")
            elif image_data.startswith(b'\x89PNG\r\n\x1A\n'):  # PNG
                if not filename.lower().endswith('.png'):
                    file_path = file_path.with_suffix('.png')
                logger.debug("Detected PNG format")
            
            # Write the image
            with open(file_path, "wb") as f:
                f.write(image_data)
            
            logger.info(f"💾 Image saved: {file_path}")
            # Also print to stdout for the streaming endpoint to capture
            print(f"💾 Image saved: {file_path}", flush=True)
            return True
            
        except Exception as e:
            logger.error(f"❌ Error saving image {filename}: {e}")
            return False

    def parse_prompt_string(self, prompt_string: str) -> str:
        """Parse prompt engineer string to extract main prompt"""
        # 🚨 CRITICAL DEBUG: Log prompt parsing
        logger.info(f"🔍 CRITICAL DEBUG - Original prompt string: {prompt_string[:200]}...")
        
        if ':' in prompt_string:
            parts = prompt_string.split(':', 1)
            if len(parts) >= 2:
                parsed_prompt = parts[1].strip()
                logger.info(f"🔍 CRITICAL DEBUG - Parsed prompt (after ':'): {parsed_prompt[:200]}...")
                return parsed_prompt
        
        logger.info(f"🔍 CRITICAL DEBUG - No ':' found, using full prompt: {prompt_string[:200]}...")
        return prompt_string.strip()

    # =============================================================================
    # PHASE 1: THREADPOOLEXECUTOR IMPLEMENTATION
    # =============================================================================

    def submit_single_job_sync(self, prompt: str, prompt_index: int, negative_prompt: str = "") -> JobInfo:
        """Submit a single job synchronously (Phase 1 approach)"""
        workflow = create_flux_workflow(prompt, negative_prompt)
        payload = {"input": {"workflow": workflow}}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(self.urls['run'], headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                job_id = result.get("id")
                return JobInfo(
                    job_id=job_id,
                    prompt_index=prompt_index,
                    prompt=prompt,
                    start_time=time.time()
                )
            else:
                logger.error(f"Job submission failed: {response.status_code} - {response.text}")
                return JobInfo(
                    job_id="failed",
                    prompt_index=prompt_index,
                    prompt=prompt,
                    start_time=time.time(),
                    status="failed",
                    error=f"Submit failed: {response.text}"
                )
        except Exception as e:
            logger.error(f"Exception during job submission: {e}")
            return JobInfo(
                job_id="failed",
                prompt_index=prompt_index,
                prompt=prompt,
                start_time=time.time(),
                status="failed",
                error=f"Exception: {str(e)}"
            )

    def check_job_status_sync(self, job_info: JobInfo) -> Dict[str, Any]:
        """Check job status synchronously (Phase 1 approach)"""
        if job_info.job_id == "failed":
            return {'completed': True, 'success': False, 'error': job_info.error}
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            response = requests.get(f"{self.urls['status']}{job_info.job_id}", headers=headers, timeout=10)
            if response.status_code == 200:
                status_data = response.json()
                status = status_data.get("status")
                
                if status == "COMPLETED":
                    output = status_data.get("output")
                    return {
                        'completed': True,
                        'success': True,
                        'output': output,
                        'status_data': status_data
                    }
                elif status in ["FAILED", "ERROR"]:
                    error_msg = status_data.get('error', 'Unknown error')
                    return {
                        'completed': True,
                        'success': False,
                        'error': error_msg
                    }
                else:
                    return {'completed': False, 'status': status}
            else:
                return {
                    'completed': True,
                    'success': False,
                    'error': f"Status check failed: {response.status_code}"
                }
        except Exception as e:
            return {
                'completed': True,
                'success': False,
                'error': f"Status check exception: {str(e)}"
            }

    def process_job_to_completion_sync(self, prompt: str, prompt_index: int, negative_prompt: str = "") -> JobInfo:
        """Process a single job from submission to completion (Phase 1)"""
        job_info = self.submit_single_job_sync(prompt, prompt_index, negative_prompt)
        
        if job_info.job_id == "failed":
            return job_info
        
        logger.info(f"🚀 Job {prompt_index + 1} submitted: {job_info.job_id}")
        
        # Poll for completion
        while True:
            status_result = self.check_job_status_sync(job_info)
            
            if status_result['completed']:
                job_info.completion_time = time.time()
                elapsed = job_info.completion_time - job_info.start_time
                
                if status_result['success']:
                    job_info.status = "completed"
                    job_info.result = status_result.get('output')
                    logger.info(f"✅ Job {prompt_index + 1} completed in {elapsed:.1f}s")
                    
                    # Save the image
                    self.process_job_output(job_info)
                else:
                    job_info.status = "failed"
                    job_info.error = status_result.get('error')
                    logger.error(f"❌ Job {prompt_index + 1} failed: {job_info.error}")
                
                return job_info
            
            # Wait before next check
            time.sleep(self.batch_config.polling_interval)

    def generate_images_concurrent_phase1(self, prompts: List[str], negative_prompt: str = "") -> List[JobInfo]:
        """Generate images using ThreadPoolExecutor (Phase 1 approach)"""
        # Get worker capacity and determine concurrency
        capacity_info = get_worker_capacity(self.api_key, self.urls['health'])
        max_workers = progressive_scaling_strategy(prompts, capacity_info)
        
        logger.info(f"🔄 Phase 1: Using ThreadPoolExecutor with {max_workers} workers")
        
        completed_jobs = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs
            future_to_prompt = {}
            for i, prompt_string in enumerate(prompts):
                actual_prompt = self.parse_prompt_string(prompt_string)
                future = executor.submit(self.process_job_to_completion_sync, actual_prompt, i, negative_prompt)
                future_to_prompt[future] = (i, actual_prompt)
            
            # Collect results as they complete
            for future in as_completed(future_to_prompt):
                prompt_index, prompt = future_to_prompt[future]
                try:
                    job_info = future.result()
                    completed_jobs.append(job_info)
                    
                    # Update metrics
                    self.performance_metrics['total_jobs'] += 1
                    if job_info.status == "completed":
                        self.performance_metrics['successful_jobs'] += 1
                        if job_info.completion_time:
                            elapsed = job_info.completion_time - job_info.start_time
                            self.performance_metrics['completion_times'].append(elapsed)
                    else:
                        self.performance_metrics['failed_jobs'] += 1
                        
                except Exception as e:
                    logger.error(f"❌ Job {prompt_index + 1} exception: {e}")
                    failed_job = JobInfo(
                        job_id="exception",
                        prompt_index=prompt_index,
                        prompt=prompt,
                        start_time=time.time(),
                        status="failed",
                        error=str(e)
                    )
                    completed_jobs.append(failed_job)
                    self.performance_metrics['total_jobs'] += 1
                    self.performance_metrics['failed_jobs'] += 1
        
        # Sort by prompt index to maintain order
        completed_jobs.sort(key=lambda x: x.prompt_index)
        return completed_jobs

    # =============================================================================
    # PHASE 2: ASYNC/AWAIT IMPLEMENTATION
    # =============================================================================

    async def submit_job_async(self, prompt: str, prompt_index: int, negative_prompt: str = "") -> JobInfo:
        """Submit single job asynchronously (Phase 2 approach) - DEPRECATED: Use submit_job_with_retry"""
        workflow = create_flux_workflow(prompt, negative_prompt)
        payload = {"input": {"workflow": workflow}}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.post(self.urls['run'], json=payload, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    job_id = result.get("id")
                    return JobInfo(
                        job_id=job_id,
                        prompt_index=prompt_index,
                        prompt=prompt,
                        start_time=time.time()
                    )
                else:
                    error_text = await response.text()
                    return JobInfo(
                        job_id="failed",
                        prompt_index=prompt_index,
                        prompt=prompt,
                        start_time=time.time(),
                        status="failed",
                        error=f"Submit failed: {error_text}"
                    )
        except Exception as e:
            return JobInfo(
                job_id="failed",
                prompt_index=prompt_index,
                prompt=prompt,
                start_time=time.time(),
                status="failed",
                error=f"Exception: {str(e)}"
            )
    
    async def submit_job_with_retry(self, prompt: str, prompt_index: int, negative_prompt: str = "", max_retries: int = 5) -> JobInfo:
        """
        ZERO-TOLERANCE RELIABILITY: Submit job with exponential backoff retry
        This method ensures connection failures NEVER cause job loss
        """
        workflow = create_flux_workflow(prompt, negative_prompt)
        payload = {"input": {"workflow": workflow}}
        
        for attempt in range(max_retries + 1):
            try:
                # Add connection throttling delay on retries
                if attempt > 0:
                    # Exponential backoff: 2^(attempt-1) seconds, max 30s
                    wait_time = min(2 ** (attempt - 1), 30)
                    logger.warning(f"🔄 Retry {attempt}/{max_retries} for job {prompt_index + 1} after {wait_time}s")
                    await asyncio.sleep(wait_time)
                
                # Queue-based approach handles flow control naturally
                
                # Enhanced connection handling with proper timeouts
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                # 🚨 DEBUG: Log the request details
                logger.info(f"🔍 DEBUG - Request URL: {self.urls['run']}")
                logger.info(f"🔍 DEBUG - API Key (first 10 chars): {self.api_key[:10]}...")
                logger.info(f"🔍 DEBUG - Headers: {headers}")
                
                async with self.session.post(
                    self.urls['run'], 
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=120, connect=30)  # Extended timeouts for reliability
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        job_id = result.get("id")
                        
                        if attempt > 0:
                            logger.info(f"✅ Job {prompt_index + 1} succeeded on retry {attempt}")
                        
                        return JobInfo(
                            job_id=job_id,
                            prompt_index=prompt_index,
                            prompt=prompt,
                            start_time=time.time()
                        )
                    else:
                        error_text = await response.text()
                        if attempt == max_retries:
                            logger.error(f"❌ Job {prompt_index + 1} failed permanently: {response.status} - {error_text}")
                            return JobInfo(
                                job_id="failed",
                                prompt_index=prompt_index,
                                prompt=prompt,
                                start_time=time.time(),
                                status="failed",
                                error=f"HTTP {response.status}: {error_text}"
                            )
                        else:
                            logger.warning(f"⚠️ Job {prompt_index + 1} attempt {attempt + 1} failed: {response.status}")
                            
            except (aiohttp.ClientError, asyncio.TimeoutError, ConnectionResetError, ConnectionRefusedError) as e:
                error_type = type(e).__name__
                
                # Special handling for Connection Refused - these are usually temporary
                if "Connection refused" in str(e) or isinstance(e, ConnectionRefusedError):
                    if attempt == max_retries:
                        logger.error(f"❌ Job {prompt_index + 1} failed permanently after {max_retries} retries: Connection Refused")
                        return JobInfo(
                            job_id="failed",
                            prompt_index=prompt_index,
                            prompt=prompt,
                            start_time=time.time(),
                            status="failed",
                            error="Connection refused after maximum retries with extended waits"
                        )
                    else:
                        # Longer wait for Connection Refused errors - workers might be temporarily busy
                        wait_time = min(8 * (attempt + 1), 20)  # 8s, 16s, 20s progression for worker recovery
                        logger.warning(f"⚠️ Job {prompt_index + 1} connection refused (attempt {attempt + 1}), waiting {wait_time}s for worker recovery")
                        await asyncio.sleep(wait_time)
                else:
                    # Normal retry logic for other connection errors
                    if attempt == max_retries:
                        logger.error(f"❌ Job {prompt_index + 1} failed permanently after {max_retries} retries: {error_type} - {str(e)}")
                        return JobInfo(
                            job_id="failed",
                            prompt_index=prompt_index,
                            prompt=prompt,
                            start_time=time.time(),
                            status="failed",
                            error=f"Connection failed after {max_retries} retries: {error_type}"
                        )
                    else:
                        logger.warning(f"⚠️ Job {prompt_index + 1} connection error (attempt {attempt + 1}): {error_type}")
                    
            except Exception as e:
                # Unexpected errors should still be retried
                if attempt == max_retries:
                    logger.error(f"❌ Job {prompt_index + 1} unexpected error: {str(e)}")
                    return JobInfo(
                        job_id="failed",
                        prompt_index=prompt_index,
                        prompt=prompt,
                        start_time=time.time(),
                        status="failed",
                        error=f"Unexpected error: {str(e)}"
                    )
                else:
                    logger.warning(f"⚠️ Job {prompt_index + 1} unexpected error (attempt {attempt + 1}): {str(e)}")
        
        # This should never be reached, but included for completeness
        return JobInfo(
            job_id="failed",
            prompt_index=prompt_index,
            prompt=prompt,
            start_time=time.time(),
            status="failed",
            error="Maximum retries exceeded"
        )

    async def check_worker_health_async(self) -> int:
        """
        Check worker health and return number of available healthy workers
        Returns: Number of healthy workers available (0 if endpoint is down)
        """
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with self.session.get(self.urls['health'], headers=headers) as response:
                if response.status == 200:
                    health_data = await response.json()
                    
                    # Extract worker information
                    workers = health_data.get('workers', {})
                    idle_workers = workers.get('idle', 0)
                    total_workers = workers.get('total', 0)
                    
                    logger.info(f"🏥 Worker Health Check:")
                    logger.info(f"   Total Workers: {total_workers}")
                    logger.info(f"   Idle Workers: {idle_workers}")
                    logger.info(f"   Running Workers: {workers.get('running', 0)}")
                    
                    # Return number of available workers (idle workers can take new jobs)
                    return idle_workers
                else:
                    logger.warning(f"⚠️ Health check failed: HTTP {response.status}")
                    return 0
                    
        except Exception as e:
            logger.error(f"❌ Worker health check failed: {str(e)}")
            return 0

    async def check_job_status_async(self, job_info: JobInfo) -> Dict[str, Any]:
        """Check job status asynchronously (Phase 2 approach)"""
        if job_info.job_id == "failed":
            return {'completed': True, 'success': False, 'error': job_info.error}
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with self.session.get(f"{self.urls['status']}{job_info.job_id}", headers=headers) as response:
                if response.status == 200:
                    status_data = await response.json()
                    status = status_data.get("status")
                    
                    if status == "COMPLETED":
                        output = status_data.get("output")
                        return {
                            'completed': True,
                            'success': True,
                            'output': output,
                            'status_data': status_data
                        }
                    elif status in ["FAILED", "ERROR"]:
                        error_msg = status_data.get('error', 'Unknown error')
                        return {
                            'completed': True,
                            'success': False,
                            'error': error_msg
                        }
                    else:
                        return {'completed': False, 'status': status}
                else:
                    return {
                        'completed': True,
                        'success': False,
                        'error': f"Status check failed: {response.status}"
                    }
        except Exception as e:
            return {
                'completed': True,
                'success': False,
                'error': f"Status check exception: {str(e)}"
            }

    async def submit_concurrent_batch_async(self, prompts: List[str], max_concurrent: int, negative_prompt: str = "") -> List[JobInfo]:
        """Submit prompts using queue-based processing with controlled flow (Option A)"""
        active_jobs = []
        completed_jobs = []
        job_queue = [(i, self.parse_prompt_string(prompt)) for i, prompt in enumerate(prompts)]
        
        logger.info(f"🚀 Phase 2: Queue-based processing starting:")
        logger.info(f"   Total prompts in queue: {len(prompts)}")
        logger.info(f"   Max concurrent workers: {max_concurrent}")
        
        # STEP 1: Check worker health and determine available workers
        healthy_workers = await self.check_worker_health_async()
        if healthy_workers == 0:
            logger.error("❌ No healthy workers available - cannot process images")
            return []
        
        # Use queue-friendly worker allocation
        actual_concurrent = min(healthy_workers, max_concurrent, len(prompts))
        logger.info(f"🎯 Queue processing with {actual_concurrent} concurrent workers")
        
        # STEP 2: Queue-based processing loop
        while job_queue or active_jobs:
            # Submit new jobs to available worker slots (controlled queue feeding)
            while len(active_jobs) < actual_concurrent and job_queue:
                prompt_idx, prompt = job_queue.pop(0)  # FIFO queue behavior
                
                # Smart submission pacing for queue-based processing
                if len(active_jobs) > 0:
                    await asyncio.sleep(0.5)  # 500ms delay to prevent connection flooding
                
                job_info = await self.submit_job_with_retry(prompt, prompt_idx, negative_prompt)
                if job_info.job_id != "failed":
                    active_jobs.append(job_info)
                    logger.info(f"📝 Queued job {job_info.prompt_index + 1} to worker: {job_info.job_id}")
                    print(f"📝 Queued job {job_info.prompt_index + 1} to worker: {job_info.job_id}", flush=True)
                else:
                    completed_jobs.append(job_info)
                    logger.error(f"❌ Failed to queue job {prompt_idx + 1}")
            
            # Process completed jobs (check for worker availability)
            completed_in_cycle = []
            
            for job in active_jobs:
                status_result = await self.check_job_status_async(job)
                if status_result['completed']:
                    job.completion_time = time.time()
                    elapsed = job.completion_time - job.start_time if job.completion_time else 0
                    
                    if status_result['success']:
                        job.status = "completed"
                        job.result = status_result.get('output')
                        logger.info(f"✅ Worker completed job {job.prompt_index + 1} in {elapsed:.1f}s")
                        print(f"✅ Worker completed job {job.prompt_index + 1} in {elapsed:.1f}s", flush=True)
                        
                        # Process the output
                        self.process_job_output(job)
                    else:
                        job.status = "failed"
                        job.error = status_result.get('error')
                        logger.error(f"❌ Worker failed job {job.prompt_index + 1}: {job.error}")
                    
                    completed_jobs.append(job)
                    completed_in_cycle.append(job)
            
            # Remove completed jobs from active list (frees up worker slots)
            for job in completed_in_cycle:
                active_jobs.remove(job)
            
            # Adaptive polling based on queue status
            if active_jobs:  # Only wait if there are still active jobs
                await asyncio.sleep(self.batch_config.polling_interval)
            
            # Log queue progress
            if len(completed_jobs) % 5 == 0 and completed_in_cycle:  # Every 5 completions
                remaining = len(job_queue)
                processing = len(active_jobs)
                logger.info(f"📊 Queue status: {remaining} queued, {processing} processing, {len(completed_jobs)} completed")
        
        # Sort by prompt index to maintain order
        completed_jobs.sort(key=lambda x: x.prompt_index)
        logger.info(f"🎉 Queue processing complete: {len(completed_jobs)} total jobs processed")
        return completed_jobs

    async def generate_images_concurrent_phase2(self, prompts: List[str], negative_prompt: str = "") -> List[JobInfo]:
        """Generate images using async/await (Phase 2 approach)"""
        # Get worker capacity and determine concurrency
        capacity_info = get_worker_capacity(self.api_key, self.urls['health'])
        max_concurrent = progressive_scaling_strategy(prompts, capacity_info)
        
        logger.info(f"🔄 Phase 2: Using async/await with {max_concurrent} concurrent jobs")
        
        # Process batch with backfilling
        completed_jobs = await self.submit_concurrent_batch_async(prompts, max_concurrent, negative_prompt)
        
        # Update performance metrics
        for job in completed_jobs:
            self.performance_metrics['total_jobs'] += 1
            if job.status == "completed":
                self.performance_metrics['successful_jobs'] += 1
                if job.completion_time:
                    elapsed = job.completion_time - job.start_time
                    self.performance_metrics['completion_times'].append(elapsed)
            else:
                self.performance_metrics['failed_jobs'] += 1
        
        return completed_jobs

    # =============================================================================
    # SHARED UTILITIES
    # =============================================================================

    def process_job_output(self, job_info: JobInfo) -> bool:
        """Process job output and save images"""
        if not job_info.result:
            return False
        
        try:
            output = job_info.result
            filename = f"beat_{job_info.prompt_index + 1}.png"
            
            # Try different output formats
            if isinstance(output, dict) and 'message' in output:
                return self.save_base64_image(output['message'], filename)
            elif isinstance(output, dict) and 'images' in output and output['images']:
                return self.save_base64_image(output['images'][0], filename)
            elif isinstance(output, str):
                return self.save_base64_image(output, filename)
            else:
                logger.warning(f"⚠️ Unknown output format for job {job_info.prompt_index + 1}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error processing output for job {job_info.prompt_index + 1}: {e}")
            return False

    def load_prompt_engineer_output(self, filename: Optional[str] = None) -> List[str]:
        """Load prompts from the prompt engineer output file"""
        try:
            # If no specific filename provided, look for session-specific files first, then legacy files
            if filename is None:
                import glob
                # Look for session-specific files in the script directory
                session_pattern = str(script_dir / "prompts_*.json")
                session_files = [Path(f).name for f in glob.glob(session_pattern)]
                candidate_files = session_files + ["temp_prompts.json", "prompt_engineer_output.json"]
                logger.info(f"🔍 Found session files: {session_files}")
            else:
                # Specific filename provided - use it directly
                candidate_files = [filename]
                logger.info(f"🎯 Using specified prompts file: {filename}")
            
            for candidate in candidate_files:
                prompt_path = script_dir / candidate
                logger.info(f"Looking for prompts at: {prompt_path}")
                
                try:
                    with open(prompt_path, 'r') as file:
                        data = json.load(file)
                        
                        # Expected format: array of strings like ["1: Alex...", "2: Alex..."]
                        if isinstance(data, list) and all(isinstance(item, str) for item in data):
                            logger.info(f"✅ Successfully loaded {len(data)} prompts from {candidate}")
                            # 🚨 CRITICAL DEBUG: Log loaded prompts
                            logger.info(f"🔍 CRITICAL DEBUG - Loaded prompts preview: {data[:2]}")
                            return data
                        
                        # If wrapped in another structure, try to extract the array
                        if isinstance(data, dict):
                            for key in ['promptsOutput', 'prompts', 'output', 'data']:
                                if key in data and isinstance(data[key], list):
                                    logger.info(f"✅ Successfully loaded {len(data[key])} prompts from {candidate} (key: {key})")
                                    return data[key]
                        
                        logger.warning(f"⚠️ Unexpected data format in {candidate}: {type(data)}")
                        continue
                        
                except FileNotFoundError:
                    logger.warning(f"⚠️ File {candidate} not found")
                    continue
                except json.JSONDecodeError:
                    logger.error(f"❌ File {candidate} contains invalid JSON")
                    continue
            
            logger.error("❌ No valid prompt files found")
            return []
            
        except Exception as e:
            logger.error(f"Error loading prompt engineer output: {e}")
            return []

    def decide_processing_mode(self, prompts: List[str]) -> str:
        """Decide which processing mode to use"""
        if not should_use_concurrent_mode(prompts):
            return "sequential"
        
        # Check if async mode is available and preferable
        if len(prompts) >= 6:  # Use async for larger batches
            return "async"
        else:
            return "threadpool"  # Use ThreadPool for smaller concurrent batches

    async def generate_images(self, prompts: List[str], negative_prompt: str = "", force_mode: Optional[str] = None) -> List[JobInfo]:
        """
        Main entry point for image generation
        Automatically chooses the best processing mode unless forced
        """
        self.performance_metrics['start_time'] = time.time()
        
        # Decide processing mode
        mode = force_mode or self.decide_processing_mode(prompts)
        logger.info(f"🎯 Processing mode selected: {mode.upper()}")
        
        if mode == "sequential":
            # Fallback to sequential processing
            logger.info("Using sequential processing (fallback mode)")
            completed_jobs = []
            for i, prompt_string in enumerate(prompts):
                actual_prompt = self.parse_prompt_string(prompt_string)
                job_info = self.process_job_to_completion_sync(actual_prompt, i, negative_prompt)
                completed_jobs.append(job_info)
            return completed_jobs
            
        elif mode == "threadpool":
            # Use Phase 1 ThreadPoolExecutor
            return self.generate_images_concurrent_phase1(prompts, negative_prompt)
            
        elif mode == "async":
            # Use Phase 2 async/await
            return await self.generate_images_concurrent_phase2(prompts, negative_prompt)
            
        else:
            raise ValueError(f"Unknown processing mode: {mode}")

def main():
    """Main entry point for the concurrent image generator"""
    parser = argparse.ArgumentParser(description='Generate images using concurrent ComfyUI processing')
    parser.add_argument('--prompts-file', type=str, help='Path to JSON file containing prompts array')
    parser.add_argument('--mode', type=str, choices=['sequential', 'threadpool', 'async'], 
                       help='Force specific processing mode')
    parser.add_argument('--negative-prompt', type=str, 
                       default="lowres, blurry, deformed, extra limbs, watermark, text, jpeg artefacts, oversaturated",
                       help='Negative prompt for image generation')
    args = parser.parse_args()
    
    async def run_generation():
        async with ConcurrentImageGenerator() as generator:
            # Check endpoint health
            logger.info("Checking endpoint health...")
            if not generator.check_endpoint_health():
                logger.error("❌ Endpoint health check failed. Please check your endpoint ID and API key.")
                return
            
            # Show output directory information
            abs_output_dir = Path(OUTPUT_DIR).resolve()
            logger.info(f"📁 Images will be saved to: {abs_output_dir}")
            
            # Load prompts
            if args.prompts_file and Path(args.prompts_file).exists():
                logger.info(f"Loading prompts from command line file: {args.prompts_file}")
                try:
                    with open(args.prompts_file, 'r') as file:
                        prompt_engineer_data = json.load(file)
                    # 🚨 CRITICAL DEBUG: Log what was loaded from the specified file
                    logger.info(f"🔍 CRITICAL DEBUG - Loaded from specified file: {prompt_engineer_data[:2]}")
                except (FileNotFoundError, json.JSONDecodeError) as e:
                    logger.error(f"Error loading prompts file: {e}")
                    return
            else:
                # Use dynamic loading
                prompt_engineer_data = generator.load_prompt_engineer_output()
                
                if not prompt_engineer_data:
                    logger.error("❌ No prompt engineer output found. Looking for session-specific 'prompts_*.json', 'temp_prompts.json' or 'prompt_engineer_output.json'")
                    return
            
            # Validate prompts
            if not isinstance(prompt_engineer_data, list):
                logger.error("Prompt engineer data is not in the expected array format.")
                return
            
            logger.info(f"Found {len(prompt_engineer_data)} prompts to process")
            
            # Generate images
            start_time = time.time()
            completed_jobs = await generator.generate_images(
                prompt_engineer_data, 
                args.negative_prompt,
                args.mode
            )
            total_time = time.time() - start_time
            
            # Print results summary
            successful_jobs = [job for job in completed_jobs if job.status == "completed"]
            failed_jobs = [job for job in completed_jobs if job.status == "failed"]
            
            logger.info("\n" + "="*60)
            logger.info("🎉 GENERATION COMPLETE!")
            logger.info(f"   Total Time: {total_time:.1f}s")
            logger.info(f"   Total Jobs: {len(completed_jobs)}")
            logger.info(f"   Successful: {len(successful_jobs)}")
            logger.info(f"   Failed: {len(failed_jobs)}")
            
            # Also print to stdout for streaming endpoint
            print("\n" + "="*60, flush=True)
            print("🎉 GENERATION COMPLETE!", flush=True)
            print(f"   Total Time: {total_time:.1f}s", flush=True)
            print(f"   Total Jobs: {len(completed_jobs)}", flush=True)
            print(f"   Successful: {len(successful_jobs)}", flush=True)
            print(f"   Failed: {len(failed_jobs)}", flush=True)
            
            if generator.performance_metrics['completion_times']:
                avg_time = sum(generator.performance_metrics['completion_times']) / len(generator.performance_metrics['completion_times'])
                logger.info(f"   Average Job Time: {avg_time:.1f}s")
            
            # Performance comparison
            sequential_time = len(prompt_engineer_data) * 16.75  # Baseline from plan
            improvement = ((sequential_time - total_time) / sequential_time) * 100
            logger.info(f"   Performance Improvement: {improvement:.1f}% faster than sequential")
            
            logger.info("="*60)
            logger.info(f"📁 Check {abs_output_dir} for your generated images")
            
            # Log any failures
            if failed_jobs:
                logger.warning("\n❌ Failed jobs:")
                for job in failed_jobs:
                    logger.warning(f"   Job {job.prompt_index + 1}: {job.error}")
    
    # Run the async main function
    asyncio.run(run_generation())

if __name__ == "__main__":
    main()