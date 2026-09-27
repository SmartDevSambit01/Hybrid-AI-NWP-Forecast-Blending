"""
ModelHealth Schema for Multi-Model Forecast Blending System.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ModelHealth(BaseModel):
    source_id: str = Field(..., description="Target model source ID")
    freshness: str = Field(..., description="Data freshness status: 'on_schedule', 'lagging_15m', 'stale_6h', etc.")
    availability: float = Field(..., description="Fraction of expected data feeds received (0.0 to 1.0)")
    latency: float = Field(..., description="Ingestion latency in seconds")
    missing_data: bool = Field(..., description="Flag indicating if required fields or runs are missing")
    anomaly_status: str = Field("normal", description="Data anomaly level: 'normal', 'warning', 'critical', 'unknown'")
    health_status: str = Field(..., description="Overall model operational state: 'healthy', 'degraded', 'failing', 'offline', 'demo_replay'")
    last_successful_update: Optional[str] = Field(None, description="ISO timestamp of last verified update")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional health diagnostic counters")
