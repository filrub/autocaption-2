from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import numpy as np
import cv2
import insightface
import sys
import os
import logging
from typing import Optional

# ----------------------
# Logging setup
# ----------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ----------------------
# Configuration
# ----------------------
PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")
DET_SIZE = int(os.environ.get("DET_SIZE", 640))
USE_GPU = os.environ.get("USE_GPU", "0") == "1"

# ----------------------
# Global model reference
# ----------------------
model: Optional[insightface.app.FaceAnalysis] = None

# ----------------------
# Lifespan handler (startup/shutdown)
# ----------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global model
    logger.info("Loading InsightFace model...")
    
    ctx_id = 0 if USE_GPU else -1
    model = insightface.app.FaceAnalysis(
        name="buffalo_l",  # Best accuracy model
        providers=['CUDAExecutionProvider', 'CPUExecutionProvider'] if USE_GPU else ['CPUExecutionProvider']
    )
    model.prepare(ctx_id=ctx_id, det_size=(DET_SIZE, DET_SIZE))
    
    logger.info(f"Model loaded (GPU: {USE_GPU}, det_size: {DET_SIZE}x{DET_SIZE})")
    
    yield  # App runs here
    
    # Shutdown
    logger.info("Shutting down...")
    model = None

app = FastAPI(
    title="InsightFace Recognition Server",
    version="1.0.0",
    lifespan=lifespan
)

# ----------------------
# Enable CORS
# ----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Health check endpoint (IMPORTANT for your app!)
# ----------------------
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "recognition",
        "gpu": USE_GPU,
        "det_size": DET_SIZE
    }

# ----------------------
# Root endpoint
# ----------------------
@app.get("/")
async def root():
    return {
        "message": "InsightFace Recognition Server",
        "version": "1.0.0",
        "endpoints": ["/health", "/detect_faces"]
    }

# ----------------------
# Detect faces endpoint
# ----------------------
@app.post("/detect_faces")
async def detect_faces(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and decode image
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        
        # Detect faces
        faces = model.get(img)
        
        results = []
        for face in faces:
            results.append({
                "bbox": face.bbox.astype(int).tolist(),
                "embedding": face.embedding.tolist(),
                "det_score": float(face.det_score) if hasattr(face, 'det_score') else None
            })
        
        logger.info(f"Detected {len(results)} faces in {file.filename}")
        
        return {
            "faces": results,
            "count": len(results),
            "image_size": [img.shape[1], img.shape[0]]  # width, height
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------
# Run server
# ----------------------
if __name__ == "__main__":
    logger.info(f"Starting server on {HOST}:{PORT}")
    
    uvicorn_config = {
        "host": HOST,
        "port": PORT,
        "log_level": "info"
    }
    
    if getattr(sys, "frozen", False):
        # Running in PyInstaller bundle
        uvicorn.run(app, **uvicorn_config)
    else:
        # Dev mode with reload
        uvicorn.run("server:app", reload=True, **uvicorn_config)