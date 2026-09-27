"""
ModelSkill Schema for Multi-Model Forecast Blending System.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ModelSkill(BaseModel):
    source_id: str = Field(..., description="Target model source ID")
    region: str = Field(..., description="Geographic region name, e.g. 'PAN_INDIA', 'WEST_COAST'")
    variable: str = Field(..., description="Target weather variable")
    lead_time: int = Field(..., description="Lead time in hours")
    season: str = Field(..., description="Climatological season: 'MONSOON', 'WINTER', 'PRE_MONSOON', 'POST_MONSOON', 'ANNUAL'")
    weather_regime: str = Field(..., description="Weather regime: 'MONSOON_TROUGH', 'WESTERN_DISTURBANCE', 'CYCLONIC_CIRCULATION', 'QUIET'")
    metric: str = Field(..., description="Verification metric name: 'RMSE', 'MAE', 'BIAS', 'CRPS', 'POD', 'FAR'")
    score: float = Field(..., description="Evaluation metric score value")
    verification_period: str = Field(..., description="Historical evaluation timeframe, e.g. 'LAST_30_DAYS', 'MONSOON_2025'")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Sample size, confidence interval, etc.")
