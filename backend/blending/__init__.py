"""
Blending Engine Module for Multi-Model Forecast Blending System.
Step 2: Baseline Equal-Weight Blend Engine.
"""

from .engine import compute_equal_weight_blend, BaselineBlendResult

__all__ = ["compute_equal_weight_blend", "BaselineBlendResult"]
