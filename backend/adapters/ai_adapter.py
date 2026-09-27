"""
AI Weather Model Operational Adapter Placeholder.
In Step 1, checks whether AI deep learning endpoint is configured.
If not, returns structured offline/unconfigured status.
"""

from typing import List
from backend.schemas.forecast import ForecastSource
from backend.utils.config import AppConfig
from backend.utils.logger import log_status, SystemStatusCatalog


class AIAdapter:
    @classmethod
    def fetch_ai_forecast(cls) -> List[ForecastSource]:
        if not AppConfig.AI_MODEL_URL or not AppConfig.AI_MODEL_API_KEY:
            log_status(
                "ai_graphcast",
                SystemStatusCatalog.UNAVAILABLE,
                "AI Model operational URL/Key unconfigured. Awaiting inference stream access."
            )
            return []
        # Future Step: AI model endpoint invocation
        return []
