"""
ModelWeight Schema for Multi-Model Forecast Blending System.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ModelWeight(BaseModel):
    source_id: str = Field(..., description="Model source identifier")
    weight: float = Field(..., description="Assigned dynamic or baseline weight (0.0 to 1.0)")
    reason: str = Field(..., description="Explanation/provenance of weight (e.g. 'Step 1 Equal Weight / Placeholder Baseline')")
    calculated_at: str = Field(..., description="Timestamp when weight was computed (ISO format)")
    variable: Optional[str] = Field(None, description="Variable for which weight applies")
    lead_time: Optional[int] = Field(None, description="Lead time in hours for which weight applies")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optimizer flags or variance terms")
