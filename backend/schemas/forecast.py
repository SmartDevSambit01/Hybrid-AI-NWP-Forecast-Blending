"""
ForecastSource Schema for Multi-Model Forecast Blending System.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class EnsembleInfo(BaseModel):
    member_id: Optional[str] = Field(None, description="Identifier for ensemble member, e.g., 'mem_01'")
    total_members: Optional[int] = Field(None, description="Total members in the ensemble run")
    percentile: Optional[float] = Field(None, description="Percentile value if summary statistic")
    std_dev: Optional[float] = Field(None, description="Standard deviation across members")


class ForecastSource(BaseModel):
    source_id: str = Field(..., description="Unique identifier for model source, e.g. 'ncmrwf_ncum'")
    source_name: str = Field(..., description="Human-readable name, e.g. 'NCMRWF NCUM Global Model'")
    model_type: str = Field(..., description="Type of model: 'nwp_deterministic', 'nwp_ensemble', 'ai_ml', 'demo_replay'")
    forecast_time: str = Field(..., description="Timestamp of forecast initialization (ISO format)")
    issue_time: str = Field(..., description="Timestamp when forecast was issued (ISO format)")
    valid_time: str = Field(..., description="Target valid forecast time (ISO format)")
    latitude: float = Field(..., description="Grid latitude in degrees (-90 to +90)")
    longitude: float = Field(..., description="Grid longitude in degrees (-180 to +180)")
    variable: str = Field(..., description="Meteorological variable name, e.g., 'temperature_2m', 'precip_surface'")
    lead_time: int = Field(..., description="Forecast lead time in hours (0, 6, 12, 24, etc.)")
    value: Optional[float] = Field(None, description="Forecast value at target point/time")
    unit: str = Field(..., description="Physical measurement unit, e.g. 'K', 'mm/h', 'm/s', '%'")
    ensemble: Optional[EnsembleInfo] = Field(None, description="Ensemble details if applicable")
    data_status: str = Field("healthy", description="Status: 'healthy', 'delayed', 'unavailable', 'invalid', 'stale', 'demo_replay'")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional provenance or run details")
