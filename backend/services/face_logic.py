import numpy as np
import cv2
from PIL import Image
import io

class FaceLogic:
    def __init__(self, tolerance=0.6):
        """
        Initialize face recognition service using OpenCV.
        
        Args:
            tolerance: Distance threshold for face matching (lower = stricter, default=0.6)
        """
        self.tolerance = tolerance
        
        # Initialize OpenCV face detectors
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        if self.face_cascade.empty():
            print("❌ ERROR: Could not load haarcascade_frontalface_default.xml")
            
        self.face_cascade_alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
        if self.face_cascade_alt.empty():
            print("❌ ERROR: Could not load haarcascade_frontalface_alt.xml")
            
        print("✅ Face Recognition Service initialized with OpenCV")
        
        # Create debug directory if it doesn't exist
        import os
        self.debug_dir = "debug_images"
        try:
            if not os.path.exists(self.debug_dir):
                os.makedirs(self.debug_dir)
        except Exception as e:
            print(f"⚠️ Warning: Could not create local debug directory: {e}")
            self.debug_dir = "/tmp/debug_images"
            try:
                if not os.path.exists(self.debug_dir):
                    os.makedirs(self.debug_dir)
                print(f"✅ Using fallback debug directory: {self.debug_dir}")
            except Exception as e2:
                print(f"❌ Error: Could not create fallback debug directory: {e2}")
                self.debug_dir = None

    def get_embedding(self, image_bytes):
        """
        Extract face embedding from image bytes using OpenCV.
        
        Args:
            image_bytes: Image data as bytes or file-like object
            
        Returns:
            numpy array of face encoding (128-d), or None if no face detected
        """
        try:
            # Load image from bytes
            if isinstance(image_bytes, bytes):
                image = Image.open(io.BytesIO(image_bytes))
            else:
                image = Image.open(image_bytes)
            
            print(f"📷 Received image: {image.size} pixels, mode: {image.mode}")
            
            # Convert to grayscale for detection
            image_np = np.array(image.convert('RGB'))
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            
            print(f"🔍 Gray image shape: {gray.shape}")
            
            # Enhance contrast using histogram equalization
            gray_eq = cv2.equalizeHist(gray)
            
            # 1. Try default cascade on equalized image (lenient)
            faces = self.face_cascade.detectMultiScale(gray_eq, 1.1, 2, minSize=(30, 30))
            
            # 2. If valid, try with original gray image
            if len(faces) == 0:
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 2, minSize=(30, 30))
            
            # 3. If still no face, try alternate cascade
            if len(faces) == 0:
                print("🔄 Retrying with alternate cascade...")
                faces = self.face_cascade_alt.detectMultiScale(gray_eq, 1.1, 2, minSize=(30, 30))
            
            # 4. If still no face, try ultra-lenient parameters
            if len(faces) == 0:
                print("🔄 Retrying with ultra-lenient parameters...")
                faces = self.face_cascade_alt.detectMultiScale(gray_eq, 1.05, 1, minSize=(20, 20))
            
            print(f"👤 Detected {len(faces)} face(s)")
            
            if len(faces) == 0:
                print("⚠️ No face detected in image")
                # Save debug image
                if self.debug_dir:
                    import time
                    timestamp = int(time.time())
                    try:
                        cv2.imwrite(f"{self.debug_dir}/failed_{timestamp}.jpg", cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR))
                    except:
                        pass
                return None
            
            if len(faces) > 1:
                print(f"⚠️ Multiple faces detected ({len(faces)}), using largest face")
            
            # Get the largest face
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest_face
            
            print(f"✂️ Face region: x={x}, y={y}, w={w}, h={h}")
            
            # Extract face region
            face_roi = image_np[y:y+h, x:x+w]
            
            # Convert to grayscale for structural embedding
            face_roi_gray = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
            
            # Resize to small thumbnail (11x11) 
            # 11x11 = 121 pixels
            face_small = cv2.resize(face_roi_gray, (11, 11))
            
            # Flatten to create a vector (121 elements)
            embedding = face_small.flatten().astype(float)
            
            # Pad to 128 dimensions to match DB schema and previous logic
            if len(embedding) < 128:
                embedding = np.pad(embedding, (0, 128 - len(embedding)))
            
            embedding = embedding / (np.linalg.norm(embedding) + 1e-8)  # Normalize
            
            print(f"✅ Extracted 128-d grayscale embedding (structural 11x11 padded)")
            return embedding
        
        except Exception as e:
            print(f"❌ Error extracting face embedding: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_embeddings_batch(self, image_bytes):
        """
        Extract all face embeddings from an image (for group photos).
        
        Args:
            image_bytes: Image data as bytes or file-like object
            
        Returns:
            List of face encodings
        """
        try:
            if isinstance(image_bytes, bytes):
                image = Image.open(io.BytesIO(image_bytes))
            else:
                image = Image.open(image_bytes)
            
            # Convert to grayscale for detection
            image_np = np.array(image.convert('RGB'))
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            gray_eq = cv2.equalizeHist(gray)
            
            # Detect all faces (made more lenient for webcam images)
            faces = self.face_cascade.detectMultiScale(gray_eq, 1.1, 2, minSize=(20, 20))
            
            # Fallback to non-equalized
            if len(faces) == 0:
                 faces = self.face_cascade.detectMultiScale(gray, 1.1, 2, minSize=(20, 20))

            embeddings = []
            for (x, y, w, h) in faces:
                # Extract face region
                face_roi = image_np[y:y+h, x:x+w]
                
                # Convert to grayscale
                face_roi_gray = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
                
                # Structural embedding (11x11 = 121 elements)
                face_small = cv2.resize(face_roi_gray, (11, 11))
                embedding = face_small.flatten().astype(float)
                
                # Pad to 128 dimensions
                if len(embedding) < 128:
                    embedding = np.pad(embedding, (0, 128 - len(embedding)))
                    
                embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
                embeddings.append(embedding)
            
            print(f"✅ Detected {len(embeddings)} face(s) in image")
            return embeddings
        
        except Exception as e:
            print(f"❌ Error extracting face embeddings: {e}")
            return []

    def compute_distance(self, embedding1, embedding2):
        """
        Compute Euclidean distance between two face embeddings.
        
        Args:
            embedding1: First face encoding
            embedding2: Second face encoding
            
        Returns:
            float: Distance between embeddings (lower = more similar)
        """
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        # Normalize embeddings
        emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-8)
        emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-8)
        
        # Compute Euclidean distance
        distance = np.linalg.norm(emb1_norm - emb2_norm)
        return float(distance)

    def match_face(self, known_embedding, test_embedding, tolerance=None):
        """
        Check if two face embeddings match.
        
        Args:
            known_embedding: Reference face encoding
            test_embedding: Test face encoding
            tolerance: Optional override for matching threshold
            
        Returns:
            bool: True if faces match
        """
        if tolerance is None:
            tolerance = self.tolerance
        
        distance = self.compute_distance(known_embedding, test_embedding)
        return distance <= tolerance

    def recognize_face(self, test_embedding, known_embeddings_dict, tolerance=None):
        """
        Recognize a face against a database of known faces.
        
        Args:
            test_embedding: Face encoding to identify
            known_embeddings_dict: Dict of {student_id: embedding}
            tolerance: Optional override for matching threshold
            
        Returns:
            tuple: (matched_student_id, distance) or (None, None) if no match
        """
        if tolerance is None:
            tolerance = self.tolerance
        
        best_match_id = None
        best_distance = float('inf')
        
        for student_id, known_embedding in known_embeddings_dict.items():
            distance = self.compute_distance(test_embedding, known_embedding)
            
            if distance < best_distance and distance <= tolerance:
                best_distance = distance
                best_match_id = student_id
        
        return best_match_id, best_distance if best_match_id else None

# Global instance
face_service = FaceLogic(tolerance=0.6)
