"""
Observation Schema for Multi-Model Forecast Blending System.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class Observation(BaseModel):
    observation_id: str = Field(..., description="Unique identifier for observation point/reading")
    timestamp: str = Field(..., description="Timestamp of observation (ISO format)")
    latitude: float = Field(..., description="Station or pixel latitude")
    longitude: float = Field(..., description="Station or pixel longitude")
    variable: str = Field(..., description="Observed weather variable, e.g. 'precip_surface', 'temperature_2m'")
    value: float = Field(..., description="Observed value")
    unit: str = Field(..., description="Measurement unit, e.g., 'mm/h', 'K', 'm/s'")
    source: str = Field(..., description="Observation provider name, e.g. 'AWS_INDIA', 'IMD_SYNOP', 'METAR_DEMO'")
    quality_flag: Optional[str] = Field("passed", description="Quality assurance status: 'passed', 'suspect', 'rejected'")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata such as elevation or sensor model")
