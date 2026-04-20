from pydantic import BaseModel
from typing import List, Optional


class FocusUpdate(BaseModel):
    """
    Represents a single focus measurement at a point in time.
    """
    timestamp: float          # Unix time
    score: int                # 0–100
    state: str                # FOCUSED / DISTRACTED / AWAY
    flags: List[str] = []     # e.g. ["gaze_away", "face_missing"]
    note: Optional[str] = None
