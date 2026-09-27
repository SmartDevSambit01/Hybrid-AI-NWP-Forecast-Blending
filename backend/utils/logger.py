"""
Structured Logging and Diagnostics Utility for Operational Forecast Blending System.
Categorizes system data status: healthy, delayed, unavailable, invalid, stale, demo_replay.
"""

import logging
import sys
from typing import Optional, Dict, Any

# Configure standard logger format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("MoES_NCMRWF_Blending")


class SystemStatusCatalog:
    HEALTHY = "healthy"
    DELAYED = "delayed"
    UNAVAILABLE = "unavailable"
    INVALID = "invalid"
    STALE = "stale"
    DEMO_REPLAY = "demo_replay"


def log_status(source_id: str, status: str, message: str, extra: Optional[Dict[str, Any]] = None):
    """Logs system state with strict operational status taxonomy."""
    payload = f"[{source_id.upper()}] Status={status} - {message}"
    if extra:
        payload += f" | Details={extra}"
    
    if status in (SystemStatusCatalog.UNAVAILABLE, SystemStatusCatalog.INVALID):
        logger.error(payload)
    elif status in (SystemStatusCatalog.DELAYED, SystemStatusCatalog.STALE):
        logger.warning(payload)
    else:
        logger.info(payload)
