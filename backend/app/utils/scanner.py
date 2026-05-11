import re
from urllib.parse import urlparse

def normalize_target_url(target: str, port: int, protocol: str = "http") -> str:
    """
    Normalize a target string and port into a valid URL.
    Handles cases where target might already be a URL.
    """
    # If target already has a protocol, use it
    if target.startswith(("http://", "https://")):
        parsed = urlparse(target)
        # Reconstruct without the original port/path/query if we want to enforce the scan parameters
        # Or just return the target if it matches the domain
        # For our purposes, we usually want: protocol://hostname:port/
        hostname = parsed.hostname or parsed.netloc.split(':')[0]
        return f"{parsed.scheme}://{hostname}:{port}"
    
    # If target is just a hostname or IP
    # Remove any paths or trailing slashes just in case
    clean_target = target.split('/')[0]
    return f"{protocol}://{clean_target}:{port}"

def get_base_domain(target: str) -> str:
    """Extract base domain/hostname from a target string or URL"""
    if "://" in target:
        target = target.split("://")[1]
    
    # Remove path, query, fragment
    target = target.split("/")[0].split("?")[0].split("#")[0]
    
    # Remove port if present
    if ":" in target:
        target = target.split(":")[0]
        
    return target
