"""
Baseline Equal-Weight Multi-Model Forecast Blending Engine.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 2.

Implements:
F_blend = sum( (1 / N_active) * F_i )
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ModelForecastInput(BaseModel):
    model_id: str
    model_name: str
    value: float
    unit: str = "mm"
    is_active: bool = True


class BaselineModelWeight(BaseModel):
    model_id: str
    weight: float
    value: float
    is_active: bool


class BaselineBlendResult(BaseModel):
    active_count: int
    total_models: int
    blended_value: Optional[float]
    unit: str
    strategy_name: str
    model_weights: List[BaselineModelWeight]
    status: str = Field(description="'ready' or 'no_active_models'")
    message: Optional[str] = None


def compute_equal_weight_blend(
    forecasts: List[ModelForecastInput],
    active_switches: Optional[Dict[str, bool]] = None
) -> BaselineBlendResult:
    """
    Computes equal-weight baseline blend across all active forecast feeds.
    F_blend = (1/N) * sum(F_i) for active models.
    """
    switches = active_switches or {}
    active_list: List[ModelForecastInput] = []
    model_weights: List[BaselineModelWeight] = []

    # Filter active forecasts based on switches and forecast input state
    for fc in forecasts:
        is_active = switches.get(fc.model_id, fc.is_active)
        if is_active:
            active_list.append(fc)

    active_count = len(active_list)
    unit = forecasts[0].unit if forecasts else ""

    # Calculate uniform weight 1/N
    weight_val = (1.0 / active_count) if active_count > 0 else 0.0

    for fc in forecasts:
        is_active = switches.get(fc.model_id, fc.is_active)
        model_weights.append(
            BaselineModelWeight(
                model_id=fc.model_id,
                weight=round(weight_val if is_active else 0.0, 4),
                value=fc.value,
                is_active=is_active,
            )
        )

    if active_count == 0:
        return BaselineBlendResult(
            active_count=0,
            total_models=len(forecasts),
            blended_value=None,
            unit=unit,
            strategy_name="Equal-Weight Baseline (Disabled)",
            model_weights=model_weights,
            status="no_active_models",
            message="No active forecast models selected. Blending cannot proceed.",
        )

    total_sum = sum(fc.value for fc in active_list)
    blended = round(total_sum / active_count, 2)

    return BaselineBlendResult(
        active_count=active_count,
        total_models=len(forecasts),
        blended_value=blended,
        unit=unit,
        strategy_name=f"Equal-Weight Baseline ({active_count}/{len(forecasts)} Active)",
        model_weights=model_weights,
        status="ready",
    )
