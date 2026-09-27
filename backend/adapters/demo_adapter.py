"""
Demo / Replay Data Adapter for Multi-Model Forecast Blending System.
Provides isolated, clearly labeled replay data for Step 1 UI testing.
"""

import json
import os
from typing import List, Dict, Any
from backend.schemas.forecast import ForecastSource
from backend.schemas.observation import Observation
from backend.schemas.health import ModelHealth
from backend.schemas.skill import ModelSkill
from backend.schemas.weight import ModelWeight

DEMO_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "demo", "sample_replay.json")


class DemoAdapter:
    @staticmethod
    def load_demo_data() -> Dict[str, Any]:
        if os.path.exists(DEMO_FILE):
            with open(DEMO_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "models": [],
            "forecasts": [],
            "observations": [],
            "model_health": [],
            "model_weights": [],
            "verification": []
        }

    @classmethod
    def get_forecasts(cls) -> List[ForecastSource]:
        raw = cls.load_demo_data().get("forecasts", [])
        return [ForecastSource(**item) for item in raw]

    @classmethod
    def get_observations(cls) -> List[Observation]:
        raw = cls.load_demo_data().get("observations", [])
        return [Observation(**item) for item in raw]

    @classmethod
    def get_health(cls) -> List[ModelHealth]:
        raw = cls.load_demo_data().get("model_health", [])
        return [ModelHealth(**item) for item in raw]

    @classmethod
    def get_weights(cls) -> List[ModelWeight]:
        raw = cls.load_demo_data().get("model_weights", [])
        return [ModelWeight(**item) for item in raw]

    @classmethod
    def get_verification(cls) -> List[ModelSkill]:
        raw = cls.load_demo_data().get("verification", [])
        return [ModelSkill(**item) for item in raw]
