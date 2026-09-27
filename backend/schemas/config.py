"""
Configuration Schema for Multi-Model Forecast Blending System.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ForecastSourceConfig(BaseModel):
    source_id: str
    source_name: str
    model_type: str
    endpoint_url: Optional[str] = None
    enabled: bool = True
    is_live_connected: bool = False
    status_label: str = "demo_replay"


class ObservationSourceConfig(BaseModel):
    source_id: str
    source_name: str
    provider_type: str
    endpoint_url: Optional[str] = None
    enabled: bool = True
    is_live_connected: bool = False
    status_label: str = "demo_replay"


class SystemConfigResponse(BaseModel):
    project_name: str = "Hybrid AI–NWP Multi-Model Forecast Blending System"
    organization: str = "Ministry of Earth Sciences (MoES) / NCMRWF"
    environment: str = "development"
    data_mode: str = "demo_replay"
    forecast_sources: List[ForecastSourceConfig]
    observation_sources: List[ObservationSourceConfig]
