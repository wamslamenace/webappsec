import httpx
import logging
import re
from bs4 import BeautifulSoup
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

from app.utils.scanner import normalize_target_url

class WebScannerService:
    """Service to perform web-level vulnerability scanning using Beautiful Soup"""
    
    def __init__(self):
        self.headers = {
            "User-Agent": "VulnPatchAI-Scanner/1.0",
        }
        self.timeout = 10.0

    async def scan_web_target(self, target: str, port: int, protocol: str = "http", use_selenium: bool = False) -> List[Dict[str, Any]]:
        """Scan a web target for common vulnerabilities"""
        vulnerabilities = []
        url = normalize_target_url(target, port, protocol)
        
        # 0. Optional: Use Selenium to discover more URLs if it's a dynamic site
        urls_to_scan = [url]
        if use_selenium:
            try:
                from app.services.selenium_service import SeleniumService
                selenium_service = SeleniumService()
                discovered = selenium_service.crawl(url)
                urls_to_scan.extend([u for u in discovered if u != url])
            except Exception as e:
                logger.error(f"Selenium crawling failed for {url}: {e}")

        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout, follow_redirects=True, verify=False) as client:
            for current_url in urls_to_scan:
                try:
                    logger.info(f"Scanning URL: {current_url}")
                    response = await client.get(current_url)
                    
                    # 1. Check for missing security headers (only for root/base usually, but we check all)
                    vulnerabilities.extend(self._check_security_headers(response.headers))
                    
                    # 2. Parse HTML with Beautiful Soup
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # 3. Check for sensitive information in comments
                    vulnerabilities.extend(self._check_comments(soup))
                    
                    # 4. Check for insecure forms
                    vulnerabilities.extend(self._check_forms(soup, protocol))
                    
                    # 5. Check for information leakage in meta tags
                    vulnerabilities.extend(self._check_meta_tags(soup))
                    
                except Exception as e:
                    logger.error(f"Error scanning web target {current_url}: {e}")
            
        return vulnerabilities

    def _check_security_headers(self, headers: Dict[str, str]) -> List[Dict[str, Any]]:
        vulns = []
        security_headers = {
            "X-Frame-Options": "Missing X-Frame-Options header (Clickjacking risk)",
            "X-Content-Type-Options": "Missing X-Content-Type-Options header (MIME sniffing risk)",
            "Strict-Transport-Security": "Missing HSTS header (Insecure transport risk)",
            "Content-Security-Policy": "Missing CSP header (XSS/Injection risk)"
        }
        
        for header, description in security_headers.items():
            if header not in headers:
                vulns.append({
                    "severity": "Low",
                    "description": description,
                    "recommendation": f"Add the {header} header to your web server configuration."
                })
        return vulns

    def _check_comments(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        vulns = []
        # Find comments
        comments = soup.find_all(string=lambda text: isinstance(text, str) and '<!--' in text or '-->' in text)
        # This is a bit simplified, BS4 handles comments via Comment object usually
        from bs4 import Comment
        comments = soup.find_all(string=lambda text: isinstance(text, Comment))
        
        sensitive_patterns = [
            (r'password', 'Potential password in HTML comment'),
            (r'todo', 'TODO comment found, might reveal internal logic'),
            (r'api[_-]key', 'Potential API key in HTML comment'),
            (r'db[_-]', 'Database reference in HTML comment')
        ]
        
        for comment in comments:
            for pattern, description in sensitive_patterns:
                if re.search(pattern, comment, re.IGNORECASE):
                    vulns.append({
                        "severity": "Medium",
                        "description": f"{description}: '{comment.strip()[:50]}...'",
                        "recommendation": "Remove sensitive information and internal notes from production HTML comments."
                    })
        return vulns

    def _check_forms(self, soup: BeautifulSoup, protocol: str) -> List[Dict[str, Any]]:
        vulns = []
        forms = soup.find_all('form')
        
        for form in forms:
            action = form.get('action', '')
            # Check for insecure form submission
            if action.startswith('http://') or (not action.startswith('https://') and protocol == 'http'):
                vulns.append({
                    "severity": "High",
                    "description": "Form submission over insecure channel (non-HTTPS)",
                    "recommendation": "Ensure all forms submit data over HTTPS."
                })
            
            # Check for autocomplete on sensitive fields
            password_inputs = form.find_all('input', {'type': 'password'})
            for pwd in password_inputs:
                if pwd.get('autocomplete') != 'off':
                    vulns.append({
                        "severity": "Low",
                        "description": "Password field with autocomplete enabled",
                        "recommendation": "Set autocomplete='off' on password input fields."
                    })
        return vulns

    def _check_meta_tags(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        vulns = []
        # Check for generator meta tag (version disclosure)
        generator = soup.find('meta', {'name': 'generator'})
        if generator:
            vulns.append({
                "severity": "Low",
                "description": f"Software version disclosure via generator meta tag: {generator.get('content')}",
                "recommendation": "Remove the 'generator' meta tag to avoid version disclosure."
            })
        return vulns
