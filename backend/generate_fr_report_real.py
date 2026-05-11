import sys
import os
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from app.services.report_service import ReportService
from app.core.database import SessionLocal
from app.models.scan import Scan
from app.models.user import User

async def generate_test_fr_report():
    db = SessionLocal()
    try:
        # Get a scan and a user
        scan = db.query(Scan).order_by(Scan.upload_time.desc()).first()
        user = db.query(User).first()
        
        if not scan or not user:
            print("No scan or user found in DB")
            return
            
        print(f"Generating report for scan {scan.id} and user {user.id} in French...")
        
        service = ReportService(db)
        report = await service.generate_report(
            scan_id=scan.id,
            report_type="detailed",
            user_id=user.id,
            format="pdf",
            language="fr"
        )
        
        print(f"Report generated successfully!")
        print(f"Report ID: {report.id}")
        print(f"Report Title: {report.title}")
        print(f"Report Path: {report.file_path}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(generate_test_fr_report())
