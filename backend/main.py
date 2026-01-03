from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import json
import os
import sys

# Diagnostic logging for Hugging Face
print(f"📂 Python Version: {sys.version}")
print(f"📂 Current DIR: {os.getcwd()}")
print(f"📂 Files in {os.getcwd()}: {os.listdir('.')}")

if os.path.exists('services'):
    print(f"📂 Files in services/: {os.listdir('services')}")
else:
    print("❌ ERROR: 'services' directory not found!")

print(f"📂 sys.path: {sys.path}")

# Add current directory to sys.path to resolve module issues
if os.getcwd() not in sys.path:
    sys.path.append(os.getcwd())

try:
    from services.face_logic import face_service
    print("✅ Successfully imported face_service")
except ImportError as e:
    print(f"❌ CRITICAL IMPORT ERROR: {e}")
    # Last ditch effort: absolute import
    try:
        import services.face_logic
        face_service = services.face_logic.face_service
        print("✅ Successfully imported face_service via absolute path")
    except Exception as e2:
        print(f"❌ FATAL: Could not resolve services module: {e2}")

app = FastAPI(
    title="Attendance System AI Backend",
    description="Face Recognition & Attendance Management API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all for debugging 502/CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🚀 FastAPI App initialized and starting up...")

@app.get("/")
async def root():
    return {"message": "Attendance System AI Backend is Running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "face_recognition"}

@app.post("/api/face/register")
async def register_face(image: UploadFile = File(...)):
    """
    Register a face and return its embedding.
    """
    try:
        # Read image bytes
        image_bytes = await image.read()
        
        # Extract face embedding
        embedding = face_service.get_embedding(image_bytes)
        
        if embedding is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the image. Please ensure your face is clearly visible."
            )
        
        # Convert numpy array to list for JSON serialization
        embedding_list = embedding.tolist()
        
        return {
            "success": True,
            "embedding": embedding_list,
            "dimension": len(embedding_list),
            "message": "Face registered successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/api/face/recognize")
async def recognize_faces(
    image: UploadFile = File(...),
    known_embeddings: str = Form(...)
):
    """
    Recognize faces in an image against known embeddings.
    """
    try:
        # Parse known embeddings
        embeddings_dict = json.loads(known_embeddings)
        
        # Read image
        image_bytes = await image.read()
        
        # Extract all face embeddings from image
        detected_embeddings = face_service.get_embeddings_batch(image_bytes)
        
        if not detected_embeddings:
            return {
                "success": True,
                "matches": [],
                "detected_faces": 0,
                "message": "No faces detected in image"
            }
        
        # Match each detected face against known embeddings
        matches = []
        matched_ids = set()
        
        for detected_embedding in detected_embeddings:
            student_id, distance = face_service.recognize_face(
                detected_embedding,
                embeddings_dict
            )
            
            if student_id and student_id not in matched_ids:
                matches.append({
                    "student_id": student_id,
                    "distance": float(distance),
                    "confidence": max(0, 1 - distance)  # Convert distance to confidence
                })
                matched_ids.add(student_id)
        
        return {
            "success": True,
            "matches": matches,
            "detected_faces": len(detected_embeddings),
            "recognized_faces": len(matches),
            "message": f"Recognized {len(matches)} out of {len(detected_embeddings)} detected faces"
        }
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid known_embeddings JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during recognition: {str(e)}")

@app.post("/api/face/verify")
async def verify_face(
    image: UploadFile = File(...),
    known_embedding: str = Form(...)
):
    """
    Verify if a face in the image matches a known embedding.
    """
    try:
        # Parse known embedding
        known_emb = json.loads(known_embedding)
        
        # Read image
        image_bytes = await image.read()
        
        # Extract face embedding
        test_embedding = face_service.get_embedding(image_bytes)
        
        if test_embedding is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the image"
            )
        
        # Check if faces match
        is_match = face_service.match_face(known_emb, test_embedding)
        distance = face_service.compute_distance(known_emb, test_embedding)
        
        return {
            "success": True,
            "match": is_match,
            "distance": float(distance),
            "confidence": max(0, 1 - distance),
            "threshold": face_service.tolerance,
            "message": "Face verified successfully" if is_match else "Face does not match"
        }
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid known_embedding JSON format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during verification: {str(e)}")
