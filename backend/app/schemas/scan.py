"""
Scan schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ScanBase(BaseModel):
    filename: str
    original_filename: Optional[str] = None


class ScanCreate(ScanBase):
    pass


class LiveScanRequest(BaseModel):
    target: str
    scan_type: str = "quick" # quick, full, service, vuln
    use_nikto: bool = False
    use_zap: bool = False
    use_selenium: bool = False


class ScanList(ScanBase):
    id: int
    status: str
    upload_time: datetime
    file_size: Optional[int] = None
    
    class Config:
        from_attributes = True


class ScanResponse(ScanBase):
    id: int
    user_id: int
    status: str
    upload_time: datetime
    processed_at: Optional[datetime] = None
    file_size: Optional[int] = None
    parsed_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True