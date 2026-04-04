"""
Parametric Guard API — Unified Backend
Combines the main gateway API with the Fraud Detection Engine.
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# ─── Firebase Init ────────────────────────────────────────────────────────────
import glob
import firebase_admin
from firebase_admin import credentials

try:
    import json
    
    # Check for Vercel/Render Environment Variables FIRST
    firebase_json = os.environ.get('FIREBASE_CREDENTIALS')
    cred_files = glob.glob("*firebase-adminsdk*.json")
    
    if firebase_json:
        try:
            # Parse the text string back into a Python Dictionary
            cred_dict = json.loads(firebase_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized using FIREBASE_CREDENTIALS environment variable.")
        except Exception as json_err:
            print(f"Error parsing FIREBASE_CREDENTIALS: {json_err}")
            
    elif cred_files:
        cred = credentials.Certificate(cred_files[0])
        firebase_admin.initialize_app(cred)
        print(f"Firebase Admin initialized using local explicit credentials: {cred_files[0]}")
    else:
        firebase_admin.initialize_app()
        print("Firebase Admin initialized via default credentials.")
except Exception as e:
    print(f"Firebase Admin init skip/error: {e}")

# ─── Gateway routes ──────────────────────────────────────────────────────────
from routes import api

# ─── Fraud Engine imports ────────────────────────────────────────────────────
from fraud_engine.api.routes import claims as fraud_claims
from fraud_engine.api.routes import history as fraud_history
from fraud_engine.api.routes import training as fraud_training
from fraud_engine.db.database import init_db as fraud_init_db
from fraud_engine.ml.model_manager import ModelManager

# ─── Logging Setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("fraud_engine.log"),
    ],
)
logger = logging.getLogger(__name__)


# ─── Application Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, clean up on shutdown."""
    logger.info("Starting Parametric Guard API + Fraud Detection Engine...")

    # Initialize fraud engine database tables
    await fraud_init_db()

    # Load or train the ML model
    model_manager = ModelManager()
    model_manager.load_or_train()
    app.state.model_manager = model_manager

    logger.info("Engine ready.")
    yield
    logger.info("Shutting down.")


# ─── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Parametric Guard API",
    description="Parametric insurance platform with integrated fraud detection for gig workers",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Gateway Routers (existing backend-python routes) ─────────────────────────
app.include_router(api.router, prefix="/api")

# ─── Fraud Engine Routers ─────────────────────────────────────────────────────
app.include_router(fraud_claims.router,   prefix="/api/fraud", tags=["Fraud - Claims"])
app.include_router(fraud_history.router,  prefix="/api/fraud", tags=["Fraud - History"])
app.include_router(fraud_training.router, prefix="/api/fraud", tags=["Fraud - Training"])


# ─── Health Checks ────────────────────────────────────────────────────────────
@app.get("/")
def healthcheck():
    return {"message": "ParametricGuard MVP Python Gateway is running."}


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "parametric-guard-unified"}
