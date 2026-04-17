import firebase_admin
from firebase_admin import credentials, firestore
import glob
import os
import sys

# Set output encoding to UTF-8 to handle any unicode, though I'll remove emojis just in case
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def verify():
    try:
        cred_files = glob.glob("*firebase-adminsdk*.json")
        if not cred_files:
            print("[ERROR] No Firebase Admin SDK JSON found.")
            return

        print(f"[INFO] Found key: {cred_files[0]}")
        cred = credentials.Certificate(cred_files[0])
        
        # Check if already initialized
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        # Try to list collections as a basic check
        collections = db.collections()
        print("[SUCCESS] Firebase initialized successfully!")
        
        collection_names = [c.id for c in collections]
        print(f"[INFO] Available collections: {collection_names}")
        
    except Exception as e:
        print(f"[FAIL] Firebase verification failed: {e}")

if __name__ == "__main__":
    verify()
