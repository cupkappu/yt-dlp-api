#!/usr/bin/env python3
"""
yt-dlp API Server
A RESTful API server for yt-dlp functionality with streaming support.
"""

import asyncio
import io
import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Any

import yt_dlp
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="yt-dlp API Server",
    description="A RESTful API server for yt-dlp functionality with streaming support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for tracking active tasks
active_tasks: Dict[str, Dict[str, Any]] = {}
completed_tasks: Dict[str, Dict[str, Any]] = {}

# Configuration
class Config:
    TEMP_DIR = Path(tempfile.gettempdir()) / "ytdlp_api"
    MAX_TASK_AGE = timedelta(hours=1)  # Keep completed tasks for 1 hour
    CHUNK_SIZE = 8192  # 8KB chunks for streaming
    MAX_CONCURRENT_DOWNLOADS = 3

config = Config()

# Ensure temp directory exists
config.TEMP_DIR.mkdir(exist_ok=True)

# Pydantic models for request/response
class DownloadRequest(BaseModel):
    url: HttpUrl
    format: str = "best"
    options: Optional[Dict[str, Any]] = None

class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending, downloading, completed, failed
    progress: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class VideoInfo(BaseModel):
    id: str
    title: str
    duration: Optional[int] = None
    uploader: Optional[str] = None
    upload_date: Optional[str] = None
    formats: list
    thumbnails: list
    description: Optional[str] = None
    webpage_url: str

# Utility functions
def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe use in headers"""
    return "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()

def cleanup_old_tasks():
    """Clean up old completed tasks"""
    now = datetime.now()
    expired_tasks = []
    
    for task_id, task in completed_tasks.items():
        if now - task['updated_at'] > config.MAX_TASK_AGE:
            expired_tasks.append(task_id)
    
    for task_id in expired_tasks:
        task = completed_tasks.pop(task_id)
        # Clean up file if it exists
        if task.get('filename') and Path(task['filename']).exists():
            try:
                Path(task['filename']).unlink()
                logger.info(f"Cleaned up file: {task['filename']}")
            except Exception as e:
                logger.warning(f"Failed to clean up file {task['filename']}: {e}")

def file_stream_generator(filepath: Path):
    """Generator function for streaming file content"""
    with open(filepath, "rb") as file:
        while chunk := file.read(config.CHUNK_SIZE):
            yield chunk

# yt-dlp integration
class YTDLPWrapper:
    def __init__(self):
        self.ydl_opts_base = {
            'quiet': True,
            'no_warnings': False,
            'ignoreerrors': False,
        }
    
    def get_video_info(self, url: str) -> VideoInfo:
        """Get video information without downloading"""
        ydl_opts = self.ydl_opts_base.copy()
        ydl_opts.update({
            'simulate': True,
            'skip_download': True,
        })
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return VideoInfo(
                    id=info.get('id', ''),
                    title=info.get('title', 'Unknown'),
                    duration=info.get('duration'),
                    uploader=info.get('uploader'),
                    upload_date=info.get('upload_date'),
                    formats=info.get('formats', []),
                    thumbnails=info.get('thumbnails', []),
                    description=info.get('description'),
                    webpage_url=info.get('webpage_url', url)
                )
        except Exception as e:
            logger.error(f"Error getting video info for {url}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to get video info: {str(e)}")
    
    def get_formats(self, url: str) -> list:
        """Get available formats for a video"""
        ydl_opts = self.ydl_opts_base.copy()
        ydl_opts.update({
            'listformats': True,
            'simulate': True,
            'skip_download': True,
        })
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info.get('formats', [])
        except Exception as e:
            logger.error(f"Error getting formats for {url}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to get formats: {str(e)}")

ytdlp_wrapper = YTDLPWrapper()

# Background task for downloading
async def download_task(task_id: str, url: str, format: str = "best", options: Optional[Dict] = None):
    """Background task for downloading videos"""
    task = active_tasks[task_id]
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(
            dir=config.TEMP_DIR, 
            delete=False, 
            suffix='.tmp'
        ) as temp_file:
            temp_filename = temp_file.name
        
        # Configure yt-dlp options
        ydl_opts = ytdlp_wrapper.ydl_opts_base.copy()
        ydl_opts.update({
            'outtmpl': temp_filename,
            'format': format,
        })
        
        # Apply custom options
        if options:
            ydl_opts.update(options)
        
        # Progress hook for tracking download progress
        def progress_hook(d):
            if d['status'] == 'downloading':
                task['progress'] = d.get('_percent_str', '0%')
                task['updated_at'] = datetime.now()
            elif d['status'] == 'finished':
                task['progress'] = '100%'
                task['updated_at'] = datetime.now()
        
        ydl_opts['progress_hooks'] = [progress_hook]
        
        # Perform download
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            final_filename = ydl.prepare_filename(info)
            
            # Rename temp file to final filename
            if final_filename != temp_filename:
                Path(temp_filename).rename(final_filename)
            
            # Update task status
            task.update({
                'status': 'completed',
                'filename': final_filename,
                'info': info,
                'updated_at': datetime.now()
            })
            
            # Move to completed tasks
            completed_tasks[task_id] = task
            active_tasks.pop(task_id)
            
            logger.info(f"Download completed for task {task_id}: {final_filename}")
            
    except Exception as e:
        # Update task status to failed
        task.update({
            'status': 'failed',
            'error': str(e),
            'updated_at': datetime.now()
        })
        
        # Clean up temporary file if it exists
        if 'temp_filename' in locals() and Path(temp_filename).exists():
            try:
                Path(temp_filename).unlink()
            except:
                pass
        
        # Move to completed tasks (failed)
        completed_tasks[task_id] = task
        active_tasks.pop(task_id)
        
        logger.error(f"Download failed for task {task_id}: {e}")

# API endpoints
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "yt-dlp API Server",
        "version": "1.0.0",
        "endpoints": {
            "info": "GET /info/{url} - Get video information",
            "formats": "GET /formats/{url} - Get available formats",
            "download": "POST /download - Start async download",
            "stream": "POST /stream - Direct streaming download",
            "task": "GET /task/{task_id} - Get task status",
            "tasks": "GET /tasks - List active tasks",
            "health": "GET /health - Health check"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now()}

@app.get("/info/{url:path}")
async def get_video_info(url: str):
    """Get video information"""
    try:
        info = ytdlp_wrapper.get_video_info(url)
        return info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting info for {url}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/formats/{url:path}")
async def get_video_formats(url: str):
    """Get available formats for a video"""
    try:
        formats = ytdlp_wrapper.get_formats(url)
        return {"formats": formats}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting formats for {url}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/download")
async def start_download(
    request: DownloadRequest,
    background_tasks: BackgroundTasks
):
    """Start an asynchronous download task"""
    # Check concurrent download limit
    if len(active_tasks) >= config.MAX_CONCURRENT_DOWNLOADS:
        raise HTTPException(
            status_code=429, 
            detail=f"Too many concurrent downloads (max: {config.MAX_CONCURRENT_DOWNLOADS})"
        )
    
    task_id = str(uuid.uuid4())
    now = datetime.now()
    
    # Create task
    task = {
        'task_id': task_id,
        'url': str(request.url),
        'format': request.format,
        'options': request.options or {},
        'status': 'pending',
        'progress': '0%',
        'created_at': now,
        'updated_at': now
    }
    
    active_tasks[task_id] = task
    
    # Start background task
    background_tasks.add_task(
        download_task, 
        task_id, 
        str(request.url), 
        request.format, 
        request.options
    )
    
    logger.info(f"Started download task {task_id} for {request.url}")
    
    return {
        "task_id": task_id,
        "status": "started",
        "message": "Download task started successfully"
    }

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a download task"""
    # Check active tasks
    if task_id in active_tasks:
        task = active_tasks[task_id]
        return TaskStatus(**task)
    
    # Check completed tasks
    if task_id in completed_tasks:
        task = completed_tasks[task_id]
        return TaskStatus(**task)
    
    raise HTTPException(status_code=404, detail="Task not found")

@app.get("/tasks")
async def list_tasks():
    """List all active and recent completed tasks"""
    cleanup_old_tasks()  # Clean up old tasks
    
    return {
        "active_tasks": list(active_tasks.values()),
        "completed_tasks": list(completed_tasks.values())[-10:],  # Last 10 completed tasks
        "stats": {
            "active": len(active_tasks),
            "completed": len(completed_tasks),
            "max_concurrent": config.MAX_CONCURRENT_DOWNLOADS
        }
    }

@app.post("/stream")
async def stream_download(request: DownloadRequest):
    """Direct streaming download (synchronous)"""
    # Check concurrent download limit
    if len(active_tasks) >= config.MAX_CONCURRENT_DOWNLOADS:
        raise HTTPException(
            status_code=429, 
            detail=f"Too many concurrent downloads (max: {config.MAX_CONCURRENT_DOWNLOADS})"
        )
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(
        dir=config.TEMP_DIR, 
        delete=False, 
        suffix='.tmp'
    ) as temp_file:
        temp_filename = temp_file.name
    
    try:
        # Configure yt-dlp for download
        ydl_opts = ytdlp_wrapper.ydl_opts_base.copy()
        ydl_opts.update({
            'outtmpl': temp_filename,
            'format': request.format,
        })
        
        if request.options:
            ydl_opts.update(request.options)
        
        # Perform download
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(str(request.url), download=True)
            final_filename = ydl.prepare_filename(info)
            
            # Rename if necessary
            if final_filename != temp_filename:
                Path(temp_filename).rename(final_filename)
                temp_filename = final_filename
        
        # Get filename for Content-Disposition header
        safe_filename = sanitize_filename(os.path.basename(temp_filename))
        
        # Determine media type based on file extension
        ext = Path(temp_filename).suffix.lower()
        media_types = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.flv': 'video/x-flv',
        }
        media_type = media_types.get(ext, 'application/octet-stream')
        
        # Return streaming response
        return StreamingResponse(
            file_stream_generator(Path(temp_filename)),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "X-Filename": safe_filename
            }
        )
        
    except Exception as e:
        # Clean up temporary file on error
        if Path(temp_filename).exists():
            try:
                Path(temp_filename).unlink()
            except:
                pass
        
        logger.error(f"Stream download failed for {request.url}: {e}")
        raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("yt-dlp API Server starting up...")
    # Clean up any leftover temporary files
    for file in config.TEMP_DIR.glob("*.tmp"):
        try:
            file.unlink()
        except:
            pass

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("yt-dlp API Server shutting down...")
    # Clean up active downloads
    for task_id, task in list(active_tasks.items()):
        if task.get('filename') and Path(task['filename']).exists():
            try:
                Path(task['filename']).unlink()
            except:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
