"""
Main Entry Point for Operational Hybrid AI-NWP Multi-Model Forecast Blending System Backend.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import router as api_router
from backend.utils.config import AppConfig
from backend.utils.logger import logger, SystemStatusCatalog, log_status


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Operational Multi-Model Blending Server...")
    cfg = AppConfig.get_configured_sources()
    logger.info(f"Project: {cfg.project_name} | Org: {cfg.organization}")
    logger.info(f"Data Mode: {cfg.data_mode} | Environment: {cfg.environment}")
    for source in cfg.forecast_sources:
        log_status(
            source.source_id,
            source.status_label,
            f"Model source configured ({source.source_name})"
        )
    yield
    logger.info("Shutting down Operational Multi-Model Blending Server...")


app = FastAPI(
    title=AppConfig.PROJECT_NAME,
    description="Operational system for multi-model weather forecast blending, evaluation, and extreme event support.",
    version="1.0.0-step1",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable CORS for frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
