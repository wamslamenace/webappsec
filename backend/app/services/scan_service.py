"""
Scan processing service
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import asyncio
import logging
import re

from app.core.database import SessionLocal
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.services.xml_parser import NmapXMLParser
from app.services.llm_service import LLMService
from app.services.cve_service import CVEService
from app.services.scanner_service import ScannerService
from app.services.web_scanner_service import WebScannerService
from app.services.websocket_service import manager
from app.utils.scanner import normalize_target_url, get_base_domain
from app.services.zap_service import ZapService

logger = logging.getLogger(__name__)


class ScanService:
    def __init__(self, db: Session):
        self.db = db
        self.xml_parser = NmapXMLParser()
        self.llm_service = LLMService()
        self.cve_service = CVEService()
        self.scanner_service = ScannerService()
        self.web_scanner = WebScannerService()
    
    def _stringify_recommendation(self, rec) -> str:
        """Ensure recommendation is a string for database storage"""
        if rec is None:
            return ""
        if isinstance(rec, str):
            return rec
        if isinstance(rec, (list, dict)):
            try:
                # Try to make it a nice readable string if it's a structured list from LLM
                import json
                if isinstance(rec, list):
                    lines = []
                    for item in rec:
                        if isinstance(item, dict):
                            title = item.get("Section Title") or item.get("title") or ""
                            details = item.get("Bullet point details") or item.get("details") or ""
                            if title: lines.append(f"**{title}**")
                            if isinstance(details, list):
                                lines.extend([f"• {d}" for d in details])
                            elif details:
                                lines.append(f"• {details}")
                            # Fallback for other dict structures
                            if not title and not details:
                                lines.append(f"• {json.dumps(item)}")
                        else:
                            lines.append(f"• {str(item)}")
                    return "\n".join(lines)
                return json.dumps(rec, indent=2)
            except Exception as e:
                logger.warning(f"Failed to stringify recommendation object: {e}")
                return str(rec)
        return str(rec)
    
    async def create_scan(self, user_id: int, filename: str, xml_content: str, file_size: int) -> Scan:
        """Create and process a new scan"""
        
        # Create scan record
        scan = Scan(
            user_id=user_id,
            filename=filename,
            original_filename=filename,
            file_size=file_size,
            raw_data=xml_content,
            status="processing"
        )
        
        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)
        
        # Send initial scan started notification
        await manager.update_scan_progress(user_id, scan.id, {
            "progress": 0,
            "status": "started",
            "message": f"Processing scan: {filename}"
        })
        
        # Process scan asynchronously
        try:
            await self._process_scan(scan, xml_content)
        except Exception as e:
            logger.error(f"Error processing scan {scan.id}: {e}")
            scan.status = "failed"
            scan.error_message = str(e)
            self.db.commit()
            
            # Send failure notification
            await manager.update_scan_progress(user_id, scan.id, {
                "progress": 0,
                "status": "failed",
                "message": f"Scan processing failed: {str(e)}"
            })
            raise
        
        return scan
    
    async def run_live_scan(self, user_id: int, target: str, scan_type: str = "quick", 
                           use_nikto: bool = False, use_zap: bool = False, use_selenium: bool = False) -> Scan:
        """Execute a live Nmap scan and process results with optional advanced tools"""
        
        # Clean target: remove protocol, path, port for Nmap
        clean_target = get_base_domain(target)
        
        # Create initial scan record
        scan = Scan(
            user_id=user_id,
            filename=f"live_{clean_target}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml",
            original_filename=target,
            file_size=0,
            status="scanning"
        )
        
        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)
        
        # Notify user that scan has started
        await manager.update_scan_progress(user_id, scan.id, {
            "progress": 5,
            "status": "scanning",
            "message": f"Nmap is now scanning {clean_target}... this may take a few minutes."
        })
        
        # Run scan in background - IMPORTANT: use fresh session
        asyncio.create_task(self._execute_and_process_live_scan(
            scan.id, user_id, clean_target, scan_type,
            use_nikto, use_zap, use_selenium
        ))
        
        return scan

    async def _execute_and_process_live_scan(self, scan_id: int, user_id: int, target: str, scan_type: str,
                                          use_nikto: bool = False, use_zap: bool = False, use_selenium: bool = False):
        """Execute the actual Nmap process and then lead into normal processing"""
        db = SessionLocal()
        try:
            # 1. Run the actual Nmap scan
            xml_output = await self.scanner_service.run_scan(target, scan_type)
            
            # Re-fetch scan in this session
            scan = db.query(Scan).filter(Scan.id == scan_id).first()
            if not scan:
                logger.error(f"Scan {scan_id} not found in background task")
                return

            if not xml_output:
                raise Exception("Nmap scan failed to produce output")
                
            # 2. Update scan record with XML
            scan.raw_data = xml_output
            scan.file_size = len(xml_output)
            scan.status = "processing"
            db.commit()
            
            # 3. Hand off to normal _process_scan
            # We need to temporarily set the session to this task's session
            original_db = self.db
            self.db = db
            try:
                await self._process_scan(scan, xml_output, use_nikto, use_zap, use_selenium)
            finally:
                self.db = original_db
            
        except Exception as e:
            logger.error(f"Error in live scan for {target}: {e}")
            # Ensure we update status using a fresh connection if the session failed
            try:
                db.rollback()
                scan = db.query(Scan).filter(Scan.id == scan_id).first()
                if scan:
                    scan.status = "failed"
                    scan.error_message = str(e)
                    db.commit()
            except:
                pass
            
            await manager.update_scan_progress(user_id, scan_id, {
                "progress": 0,
                "status": "failed",
                "message": f"Live scan failed: {str(e)}"
            })
        finally:
            db.close()

    async def _process_scan(self, scan: Scan, xml_content: str, 
                           use_nikto: bool = False, use_zap: bool = False, use_selenium: bool = False):
        """Process scan XML and extract vulnerabilities"""
        try:
            # Send progress update - XML parsing
            await manager.update_scan_progress(scan.user_id, scan.id, {
                "progress": 10,
                "status": "parsing",
                "message": "Parsing XML file..."
            })
            
            # Parse XML
            parsed_data = self.xml_parser.parse_xml_file(xml_content)
            scan.parsed_data = parsed_data
            
            # Send progress update - vulnerability extraction
            await manager.update_scan_progress(scan.user_id, scan.id, {
                "progress": 30,
                "status": "extracting",
                "message": "Extracting vulnerabilities..."
            })
            
            # Extract vulnerabilities
            vulnerabilities = []
            services = parsed_data.get("services", [])
            total_services = len(services)
            critical_vulns = []
            
            for idx, service in enumerate(services):
                # Send progress update during vulnerability processing
                progress = 30 + (40 * (idx + 1) / total_services)
                await manager.update_scan_progress(scan.user_id, scan.id, {
                    "progress": int(progress),
                    "status": "analyzing",
                    "message": f"Analyzing service {idx + 1}/{total_services}: {service.get('service_name', 'unknown')}"
                })
                
                for vuln_data in service.get("potential_vulnerabilities", []):
                    # Create vulnerability record
                    vulnerability = Vulnerability(
                        scan_id=scan.id,
                        service_name=service["service_name"],
                        service_version=service["version"],
                        port=service["port"],
                        protocol=service["protocol"],
                        description=vuln_data["description"],
                        severity=vuln_data["severity"],
                        status="open"
                    )
                    
                    # Enhance with CVE information
                    await self._enhance_vulnerability_with_cve(vulnerability, service)
                    
                    # Get LLM analysis
                    await self._enhance_vulnerability_with_llm(vulnerability, service)
                    
                    # Track critical vulnerabilities for immediate notification
                    if vulnerability.severity == "Critical":
                        critical_vulns.append({
                            "service_name": vulnerability.service_name,
                            "version": vulnerability.service_version,
                            "port": vulnerability.port,
                            "description": vulnerability.description,
                            "cve_id": vulnerability.cve_id
                        })
                    
                    vulnerabilities.append(vulnerability)
                
                # 4. Perform Web Level Scanning if applicable (HTTP/HTTPS)
                if service.get("service_name") in ["http", "https", "ssl/http"] or service.get("port") in [80, 443, 8080, 8443]:
                    protocol = "https" if service.get("port") in [443, 8443] or service.get("service_name") == "https" else "http"
                    
                    # Normalize target for web scanning
                    host_for_web = get_base_domain(scan.original_filename)
                    target_url = normalize_target_url(scan.original_filename, service["port"], protocol)
                    
                    # A. Standard Web Scanning (with optional Selenium)
                    await manager.update_scan_progress(scan.user_id, scan.id, {
                        "progress": 75,
                        "status": "web_scanning",
                        "message": f"Performing web analysis for {service.get('service_name')} on port {service.get('port')}..."
                    })
                    
                    web_vulns = await self.web_scanner.scan_web_target(host_for_web, service["port"], protocol, use_selenium)
                    
                    for wv in web_vulns:
                        vulnerability = Vulnerability(
                            scan_id=scan.id,
                            service_name=service["service_name"],
                            service_version=service["version"],
                            port=service["port"],
                            protocol=service["protocol"],
                            description=wv["description"],
                            severity=wv["severity"],
                            recommendation=self._stringify_recommendation(wv.get("recommendation", "")),
                            status="open"
                        )
                        await self._enhance_vulnerability_with_llm(vulnerability, service)
                        vulnerabilities.append(vulnerability)

                    # B. Nikto Scanning
                    if use_nikto:
                        await manager.update_scan_progress(scan.user_id, scan.id, {
                            "progress": 78,
                            "status": "nikto_scanning",
                            "message": f"Running Nikto scan on {scan.original_filename}:{service.get('port')}..."
                        })
                        from app.services.nikto_service import NiktoService
                        nikto_service = NiktoService()
                        nikto_findings = await nikto_service.run_scan(host_for_web, service["port"])
                        
                        for finding in nikto_findings:
                            vulnerability = Vulnerability(
                                scan_id=scan.id,
                                service_name=service["service_name"],
                                service_version=service["version"],
                                port=service["port"],
                                protocol=service["protocol"],
                                description=finding["description"],
                                severity=finding["severity"],
                                recommendation=self._stringify_recommendation(finding.get("recommendation", "")),
                                status="open"
                            )
                            vulnerabilities.append(vulnerability)

                        # C. ZAP Scanning
                        if use_zap:
                            await manager.update_scan_progress(scan.user_id, scan.id, {
                                "progress": 82,
                                "status": "zap_scanning",
                                "message": f"Running OWASP ZAP active scan on {target_url}..."
                            })
                            zap_service = ZapService()
                            zap_findings = await zap_service.run_scan(target_url)
                            
                            for finding in zap_findings:
                                vulnerability = Vulnerability(
                                    scan_id=scan.id,
                                    service_name=service["service_name"],
                                    service_version=service["version"],
                                    port=service["port"],
                                    protocol=service["protocol"],
                                    description=finding["description"],
                                    severity=finding["severity"],
                                    recommendation=self._stringify_recommendation(finding.get("recommendation", "")),
                                    status="open"
                                )
                                vulnerabilities.append(vulnerability)
            
            # Send progress update - saving data
            await manager.update_scan_progress(scan.user_id, scan.id, {
                "progress": 80,
                "status": "saving",
                "message": "Saving scan results..."
            })
            
            # Save vulnerabilities
            self.db.add_all(vulnerabilities)
            
            # Update scan status
            scan.status = "completed"
            scan.processed_at = datetime.utcnow()
            
            self.db.commit()
            
            # Send completion notification with results
            results = {
                "total_vulnerabilities": len(vulnerabilities),
                "critical_count": len(critical_vulns),
                "high_count": len([v for v in vulnerabilities if v.severity == "High"]),
                "medium_count": len([v for v in vulnerabilities if v.severity == "Medium"]),
                "low_count": len([v for v in vulnerabilities if v.severity == "Low"]),
                "services_analyzed": total_services
            }
            
            await manager.notify_scan_complete(scan.user_id, scan.id, results)
            
            # Send critical vulnerability alerts if any
            for critical_vuln in critical_vulns:
                await manager.notify_critical_vulnerability(scan.user_id, critical_vuln)
            
        except Exception as e:
            logger.error(f"Error in _process_scan: {e}")
            raise
    
    async def _enhance_vulnerability_with_cve(self, vulnerability: Vulnerability, service: dict):
        """Enhance vulnerability with CVE information"""
        try:
            service_name = service["service_name"]
            version = service["version"]
            product = service["product"]
            
            logger.info(f"Looking up CVE for {service_name} {version} {product}")
            
            cve_info = await self.cve_service.lookup_cve(
                service_name,
                version,
                product
            )
            
            if cve_info and not cve_info.get("no_cve_found"):
                logger.info(f"Found CVE data for {service_name}: {cve_info.get('cve_id')}")
                vulnerability.cve_id = cve_info.get("cve_id")
                vulnerability.cvss_score = cve_info.get("cvss_score")
                if cve_info.get("severity"):
                    vulnerability.severity = cve_info["severity"]
            else:
                logger.info(f"No CVE found for {service_name} {version}")
                # Ensure fields are explicitly set to indicate no CVE found
                vulnerability.cve_id = None
                vulnerability.cvss_score = None
                
        except Exception as e:
            logger.error(f"CVE lookup failed for {service.get('service_name', 'unknown')}: {e}")
            # Ensure fields are explicitly set to None on error
            vulnerability.cve_id = None
            vulnerability.cvss_score = None
    
    async def _enhance_vulnerability_with_llm(self, vulnerability: Vulnerability, service: dict):
        """Enhance vulnerability with LLM analysis"""
        try:
            service_name = service["service_name"]
            version = service["version"]
            
            logger.info(f"Getting LLM analysis for {service_name} {version}")
            
            analysis = await self.llm_service.analyze_vulnerability(
                service_name=service_name,
                version=version,
                port=service["port"],
                vulnerability_description=vulnerability.description,
                cve_id=vulnerability.cve_id
            )
            
            if analysis:
                logger.info(f"LLM analysis successful for {service_name}")
                if analysis.get("recommendation"):
                    vulnerability.recommendation = self._stringify_recommendation(analysis["recommendation"])
                if analysis.get("remediation_commands"):
                    vulnerability.remediation_commands = analysis["remediation_commands"]
                if analysis.get("severity") and not vulnerability.cvss_score:
                    vulnerability.severity = analysis["severity"]
            else:
                logger.warning(f"No LLM analysis returned for {service_name}")
                
        except Exception as e:
            logger.error(f"LLM analysis failed for {service.get('service_name', 'unknown')}: {e}")
            # Provide basic fallback recommendation
            if not vulnerability.recommendation:
                vulnerability.recommendation = self._stringify_recommendation(f"Update {service.get('service_name', 'service')} to the latest version and review security configuration")
    
    def get_scan(self, scan_id: int) -> Optional[Scan]:
        """Get scan by ID"""
        return self.db.query(Scan).filter(Scan.id == scan_id).first()
    
    def get_user_scans(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Scan]:
        """Get scans for a user"""
        return (
            self.db.query(Scan)
            .filter(Scan.user_id == user_id)
            .order_by(Scan.upload_time.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def delete_scan(self, scan_id: int):
        """Delete a scan and its related data"""
        from app.models.report import Report
        from app.models.feedback import Feedback
        from app.models.patch import Patch
        
        try:
            # Delete in the correct order to respect foreign key constraints
            
            # 1. Delete patches related to vulnerabilities in this scan
            vulnerability_ids = self.db.query(Vulnerability.id).filter(Vulnerability.scan_id == scan_id).all()
            if vulnerability_ids:
                vuln_ids = [v.id for v in vulnerability_ids]
                self.db.query(Patch).filter(Patch.vulnerability_id.in_(vuln_ids)).delete(synchronize_session=False)
            
            # 2. Delete feedback related to vulnerabilities in this scan
            if vulnerability_ids:
                self.db.query(Feedback).filter(Feedback.vulnerability_id.in_(vuln_ids)).delete(synchronize_session=False)
            
            # 3. Delete feedback directly related to this scan
            self.db.query(Feedback).filter(Feedback.scan_id == scan_id).delete()
            
            # 4. Delete reports related to this scan
            self.db.query(Report).filter(Report.scan_id == scan_id).delete()
            
            # 5. Delete vulnerabilities
            self.db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).delete()
            
            # 6. Finally, delete the scan itself
            self.db.query(Scan).filter(Scan.id == scan_id).delete()
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting scan {scan_id}: {e}")
            raise