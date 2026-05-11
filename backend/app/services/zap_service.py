import logging
import os
import time
from typing import List, Dict, Any
import zapv2

logger = logging.getLogger(__name__)

class ZapService:
    """Service to interact with OWASP ZAP API"""
    
    def __init__(self):
        self.api_key = os.getenv("ZAP_API_KEY", "vulnpatch_zap_key")
        self.zap_url = os.getenv("ZAP_URL", "http://owasp-zap:8080")
        self.zap = None

    def _get_client(self):
        if not self.zap:
            try:
                self.zap = zapv2.ZAPv2(apikey=self.api_key, proxies={'http': self.zap_url, 'https': self.zap_url})
            except Exception as e:
                logger.error(f"Failed to connect to ZAP at {self.zap_url}: {e}")
                return None
        return self.zap

    async def run_scan(self, target_url: str) -> List[Dict[str, Any]]:
        """
        Trigger a ZAP active scan and return results
        """
        zap = self._get_client()
        if not zap:
            return []

        logger.info(f"Starting ZAP scan on {target_url}")
        
        try:
            # 1. Access the target
            zap.urlopen(target_url)
            
            # 2. Spider the target
            logger.info(f"Spidering {target_url}")
            scan_id = zap.spider.scan(target_url)
            while int(zap.spider.status(scan_id)) < 100:
                logger.debug(f"Spider progress: {zap.spider.status(scan_id)}%")
                time.sleep(2)
            
            # 3. Active Scan
            logger.info(f"Active scanning {target_url}")
            scan_id = zap.ascan.scan(target_url)
            while int(zap.ascan.status(scan_id)) < 100:
                logger.info(f"Active scan progress: {zap.ascan.status(scan_id)}%")
                time.sleep(5)
                
            # 4. Get alerts
            alerts = zap.core.alerts(baseurl=target_url)
            findings = self._parse_zap_alerts(alerts)
            
            logger.info(f"ZAP scan completed for {target_url} with {len(findings)} findings")
            return findings
            
        except Exception as e:
            logger.error(f"Error in ZAP scan: {e}")
            return []

    def _parse_zap_alerts(self, alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse ZAP alerts into internal format"""
        vulnerabilities = []
        
        # Risk levels in ZAP: High, Medium, Low, Informational
        for alert in alerts:
            vulnerabilities.append({
                "severity": alert.get("risk", "Medium"),
                "description": f"ZAP: {alert.get('alert')} - {alert.get('description')}",
                "recommendation": alert.get("solution", "Apply standard security patches."),
                "url": alert.get("url", ""),
                "parameter": alert.get("param", ""),
                "evidence": alert.get("evidence", "")
            })
            
        return vulnerabilities
