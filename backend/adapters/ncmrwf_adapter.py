"""
NCMRWF NWP Operational Adapter Placeholder.
In Step 1, this checks whether live NCMRWF credentials/URLs are configured.
If not, returns structured offline/unconfigured status.
"""

from typing import List, Optional
from backend.schemas.forecast import ForecastSource
from backend.utils.config import AppConfig
from backend.utils.logger import log_status, SystemStatusCatalog


class NCMRWFAdapter:
    @classmethod
    def fetch_ncum_forecast(cls) -> List[ForecastSource]:
        if not AppConfig.NCMRWF_NCUM_URL or not AppConfig.NCMRWF_API_KEY:
            log_status(
                "ncmrwf_ncum",
                SystemStatusCatalog.UNAVAILABLE,
                "NCMRWF NCUM operational URL/Key unconfigured. Awaiting authorized data stream access."
            )
            return []
        # Future Step: live API fetching logic
        return []

    @classmethod
    def fetch_neps_forecast(cls) -> List[ForecastSource]:
        if not AppConfig.NCMRWF_NEPS_URL or not AppConfig.NCMRWF_API_KEY:
            log_status(
                "ncmrwf_neps",
                SystemStatusCatalog.UNAVAILABLE,
                "NCMRWF NEPS operational URL/Key unconfigured. Awaiting authorized data stream access."
            )
            return []
        # Future Step: live API fetching logic
        return []
