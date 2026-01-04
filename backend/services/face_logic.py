import numpy as np
import cv2
from PIL import Image
import io
import os
import time

# DeepFace can be heavy, so we import it inside methods or at global scope if we are sure it's installed
try:
    from deepface import DeepFace
    HAS_DEEPFACE = True
except ImportError:
    HAS_DEEPFACE = False
    print("⚠️ Warning: DeepFace not found. Using fallback structural recognition.")

class FaceLogic:
    def __init__(self, tolerance=0.5):
        """
        Initialize face recognition service.
        If DeepFace is available, uses Facenet (128-d).
        Otherwise, falls back to structural grayscale (121-d -> 128-d).
        """
        self.tolerance = tolerance
        self.model_name = "Facenet"   # 128-dimensional embedding
        self.detector_backend = "opencv" # Fast and reliable for centered faces
        
        # Debug directory
        self.debug_dir = "debug_images"
        if not os.path.exists(self.debug_dir):
            try:
                os.makedirs(self.debug_dir)
            except:
                self.debug_dir = "/tmp/debug_images"
                if not os.path.exists(self.debug_dir):
                    try: os.makedirs(self.debug_dir)
                    except: self.debug_dir = None

        if HAS_DEEPFACE:
            print(f"✅ Face Recognition Service initialized with DeepFace ({self.model_name})")
            # Pre-warm the model
            try:
                # Dummy call to trigger download/load
                DeepFace.represent(img_path=np.zeros((100, 100, 3), dtype=np.uint8), 
                                 model_name=self.model_name, 
                                 enforce_detection=False)
                print(f"✅ {self.model_name} model loaded and ready")
            except Exception as e:
                print(f"⚠️ Model pre-warm failed: {e}")
        else:
            # Fallback to OpenCV HAAR Cascades
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            print("⚠️ Falling back to basic OpenCV structural embeddings")

    def get_embedding(self, image_bytes):
        """
        Extract high-accuracy face embedding.
        """
        try:
            # Load image
            if isinstance(image_bytes, bytes):
                img_np = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
            else:
                image = Image.open(image_bytes).convert("RGB")
                img_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

            if img_np is None:
                print("❌ Failed to decode image")
                return None

            if HAS_DEEPFACE:
                # Use DeepFace for state-of-the-art embedding
                objs = DeepFace.represent(
                    img_path=img_np,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=True,
                    align=True
                )
                
                if not objs: return None
                
                # Largest face
                largest_obj = max(objs, key=lambda x: x['facial_area']['w'] * x['facial_area']['h'])
                embedding = np.array(largest_obj["embedding"])
                
                print(f"✅ DeepFace: Extracted {len(embedding)}-d embedding")
                return embedding
            else:
                # Fallback to Grayscale Structural Embedding (from previous version)
                gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
                
                if len(faces) == 0: return None
                
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                face_roi = gray[y:y+h, x:x+w]
                face_small = cv2.resize(face_roi, (11, 11))
                embedding = face_small.flatten().astype(float)
                
                # Pad to 128
                if len(embedding) < 128:
                    embedding = np.pad(embedding, (0, 128 - len(embedding)))
                
                embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
                print(f"⚠️ Fallback: Extracted {len(embedding)}-d structural embedding")
                return embedding

        except Exception as e:
            print(f"❌ Error in get_embedding: {e}")
            return None

    def get_embeddings_batch(self, image_bytes):
        """
        Extract multiple faces (for group photos/live tracking).
        """
        try:
            if isinstance(image_bytes, bytes):
                img_np = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
            else:
                img_np = cv2.cvtColor(np.array(Image.open(image_bytes).convert("RGB")), cv2.COLOR_RGB2BGR)

            if img_np is None: return []

            if HAS_DEEPFACE:
                objs = DeepFace.represent(
                    img_path=img_np,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=False,
                    align=True
                )
                embeddings = [np.array(obj["embedding"]) for obj in objs if "embedding" in obj]
                print(f"✅ DeepFace: Detected {len(embeddings)} face(s)")
                return embeddings
            else:
                # Fallback
                gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
                embeddings = []
                for (x, y, w, h) in faces:
                    face_roi = gray[y:y+h, x:x+w]
                    face_small = cv2.resize(face_roi, (11, 11))
                    emb = face_small.flatten().astype(float)
                    if len(emb) < 128: emb = np.pad(emb, (0, 128 - len(emb)))
                    emb = emb / (np.linalg.norm(emb) + 1e-8)
                    embeddings.append(emb)
                return embeddings

        except Exception as e:
            print(f"❌ Error in batch recognition: {e}")
            return []

    def compute_distance(self, embedding1, embedding2):
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        # DeepFace Facenet embeddings are designed for Euclidean distance
        # Standard threshold for Facenet is around 0.4 - 0.6
        distance = np.linalg.norm(emb1 - emb2)
        return float(distance)

    def match_face(self, known_embedding, test_embedding, tolerance=None):
        if tolerance is None: tolerance = self.tolerance
        distance = self.compute_distance(known_embedding, test_embedding)
        return distance <= tolerance

    def recognize_face(self, test_embedding, known_embeddings_dict, tolerance=None):
        if tolerance is None: tolerance = self.tolerance
        best_match_id = None
        best_distance = float('inf')
        
        for student_id, known_embedding in known_embeddings_dict.items():
            distance = self.compute_distance(test_embedding, known_embedding)
            if distance < best_distance and distance <= tolerance:
                best_distance = distance
                best_match_id = student_id
        
        return best_match_id, best_distance if best_match_id else None

# Global instance
# Using 0.5 as a balanced choice for Facenet
face_service = FaceLogic(tolerance=0.5)
