"""
Configuration Utility for Multi-Model Forecast Blending System.
Uses environment variables with safe defaults and clear live/demo flags.
"""

import os
from typing import List
from backend.schemas.config import SystemConfigResponse, ForecastSourceConfig, ObservationSourceConfig


class AppConfig:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Hybrid AI–NWP Multi-Model Forecast Blending System")
    ORGANIZATION: str = os.getenv("ORGANIZATION", "Ministry of Earth Sciences (MoES) / NCMRWF")
    ENVIRONMENT: str = os.getenv("APP_ENV", "development")
    DATA_MODE: str = os.getenv("DATA_MODE", "demo_replay")  # 'demo_replay' or 'live_operational'
    
    # Endpoints & API Keys (Read strictly from ENV)
    NCMRWF_NCUM_URL: str = os.getenv("NCMRWF_NCUM_URL", "")
    NCMRWF_NEPS_URL: str = os.getenv("NCMRWF_NEPS_URL", "")
    AI_MODEL_URL: str = os.getenv("AI_MODEL_URL", "")
    OBS_PROVIDER_URL: str = os.getenv("OBS_PROVIDER_URL", "")
    
    NCMRWF_API_KEY: str = os.getenv("NCMRWF_API_KEY", "")
    AI_MODEL_API_KEY: str = os.getenv("AI_MODEL_API_KEY", "")

    @classmethod
    def get_configured_sources(cls) -> SystemConfigResponse:
        forecast_sources = [
            ForecastSourceConfig(
                source_id="ncmrwf_ncum",
                source_name="NCMRWF NCUM (Global NWP)",
                model_type="nwp_deterministic",
                endpoint_url=cls.NCMRWF_NCUM_URL or None,
                enabled=True,
                is_live_connected=bool(cls.NCMRWF_NCUM_URL and cls.NCMRWF_API_KEY),
                status_label="live" if (cls.NCMRWF_NCUM_URL and cls.NCMRWF_API_KEY) else "demo_replay"
            ),
            ForecastSourceConfig(
                source_id="ncmrwf_neps",
                source_name="NCMRWF NEPS (Ensemble NWP)",
                model_type="nwp_ensemble",
                endpoint_url=cls.NCMRWF_NEPS_URL or None,
                enabled=True,
                is_live_connected=bool(cls.NCMRWF_NEPS_URL and cls.NCMRWF_API_KEY),
                status_label="live" if (cls.NCMRWF_NEPS_URL and cls.NCMRWF_API_KEY) else "demo_replay"
            ),
            ForecastSourceConfig(
                source_id="ai_graphcast",
                source_name="AI Weather Model (Global Deep Learning)",
                model_type="ai_ml",
                endpoint_url=cls.AI_MODEL_URL or None,
                enabled=True,
                is_live_connected=bool(cls.AI_MODEL_URL and cls.AI_MODEL_API_KEY),
                status_label="live" if (cls.AI_MODEL_URL and cls.AI_MODEL_API_KEY) else "demo_replay"
            ),
            ForecastSourceConfig(
                source_id="demo_replay",
                source_name="Demo/Replay Data Source",
                model_type="demo_replay",
                endpoint_url=None,
                enabled=True,
                is_live_connected=False,
                status_label="demo_replay"
            ),
        ]

        obs_sources = [
            ObservationSourceConfig(
                source_id="obs_provider_main",
                source_name="Configurable Weather Observation Network",
                provider_type="aws_synop",
                endpoint_url=cls.OBS_PROVIDER_URL or None,
                enabled=True,
                is_live_connected=bool(cls.OBS_PROVIDER_URL),
                status_label="live" if cls.OBS_PROVIDER_URL else "demo_replay"
            )
        ]

        return SystemConfigResponse(
            project_name=cls.PROJECT_NAME,
            organization=cls.ORGANIZATION,
            environment=cls.ENVIRONMENT,
            data_mode=cls.DATA_MODE,
            forecast_sources=forecast_sources,
            observation_sources=obs_sources,
        )
