"""
Scanning service to run Nmap scans
"""
import asyncio
import logging
import os
import tempfile
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ScannerService:
    """Service to execute Nmap scans and return results as XML"""
    
    def __init__(self):
        self.nmap_path = "nmap"  # Assumes nmap is in PATH
        
    async def run_scan(self, target: str, scan_type: str = "quick") -> Optional[str]:
        """
        Execute Nmap scan on target
        scan_type: 'quick', 'full', 'service', 'vuln'
        """
        
        # Build nmap command
        # Default options: XML output (-oX -), No ping (-Pn), Service version (-sV)
        args = ["-oX", "-", "-Pn", "-sV"]
        
        if scan_type == "quick":
            args.extend(["-T4", "-F"])
        elif scan_type == "full":
            args.extend(["-p-", "-T4"])
        elif scan_type == "service":
            args.extend(["-sC"])
        elif scan_type == "vuln":
            args.extend(["--script=vuln"])
        else:
            args.extend(["-F"]) # Default to fast scan
            
        args.append(target)
        
        logger.info(f"Starting Nmap scan on {target} with type {scan_type}")
        
        try:
            # Execute nmap process
            process = await asyncio.create_subprocess_exec(
                self.nmap_path,
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"Nmap scan failed for {target}: {stderr.decode()}")
                return None
            
            xml_output = stdout.decode('utf-8')
            logger.info(f"Nmap scan completed successfully for {target}")
            return xml_output
            
        except Exception as e:
            logger.error(f"Error executing nmap for {target}: {e}")
            return None
