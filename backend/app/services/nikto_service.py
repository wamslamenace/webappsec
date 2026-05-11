import asyncio
import logging
import json
import os
import tempfile
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class NiktoService:
    """Service to execute Nikto web server scans"""
    
    def __init__(self):
        self.nikto_path = "nikto"  # Assumes nikto is in PATH
        
    async def run_scan(self, target: str, port: int = 80) -> List[Dict[str, Any]]:
        """
        Execute Nikto scan on target
        Returns a list of findings in internal vulnerability format
        """
        logger.info(f"Starting Nikto scan on {target}:{port}")
        
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            output_file = tmp.name
            
        # Nikto command: -h target -p port -o output -Format json
        args = [
            "-h", target,
            "-p", str(port),
            "-o", output_file,
            "-Format", "json",
            "-Tuning", "123457890" # Exclude dangerous/long tests if needed, but here we go for most
        ]
        
        try:
            process = await asyncio.create_subprocess_exec(
                self.nikto_path,
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if not os.path.exists(output_file) or os.path.getsize(output_file) == 0:
                logger.warning(f"Nikto produced no output for {target}:{port}")
                return []
                
            with open(output_file, 'r') as f:
                data = json.load(f)
                
            findings = self._parse_nikto_results(data)
            logger.info(f"Nikto scan completed for {target}:{port} with {len(findings)} findings")
            return findings
            
        except Exception as e:
            logger.error(f"Error executing Nikto for {target}:{port}: {e}")
            return []
        finally:
            if os.path.exists(output_file):
                os.remove(output_file)

    def _parse_nikto_results(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse Nikto JSON output into internal format"""
        vulnerabilities = []
        
        # Nikto JSON structure: {"vulnerabilities": [...]}
        items = data.get("vulnerabilities", [])
        for item in items:
            # Map Nikto severity/info to our format
            # Nikto doesn't provide explicit severity in all versions, we'll infer or default to Medium
            description = item.get("msg", "No description")
            
            vulnerabilities.append({
                "severity": "Medium", # Defaulting to Medium as Nikto findings are usually significant
                "description": f"Nikto: {description}",
                "recommendation": "Review the Nikto finding and apply recommended web server hardening.",
                "url": item.get("url", ""),
                "method": item.get("method", "")
            })
            
        return vulnerabilities
