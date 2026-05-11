import logging
import os
import time
from typing import Set, List
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

class SeleniumService:
    """Service to crawl JS-dynamic websites using Selenium"""
    
    def __init__(self):
        self.chrome_options = Options()
        self.chrome_options.add_argument("--headless")
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-gpu")
        # In Docker, the driver is usually at /usr/bin/chromedriver
        self.driver_path = "/usr/bin/chromedriver"

    def crawl(self, base_url: str, max_pages: int = 10) -> Set[str]:
        """
        Crawl a website and return a set of discovered internal URLs
        """
        logger.info(f"Starting Selenium crawl on {base_url}")
        discovered_urls = {base_url}
        urls_to_visit = [base_url]
        visited_urls = set()
        
        parsed_base = urlparse(base_url)
        domain = parsed_base.netloc
        
        driver = None
        try:
            # Check if driver exists at path, otherwise use manager
            if os.path.exists(self.driver_path):
                service = Service(self.driver_path)
            else:
                logger.info("Chromedriver not found at system path, using manager")
                service = Service(ChromeDriverManager().install())
                
            driver = webdriver.Chrome(service=service, options=self.chrome_options)
            driver.set_page_load_timeout(30)
            
            while urls_to_visit and len(visited_urls) < max_pages:
                current_url = urls_to_visit.pop(0)
                if current_url in visited_urls:
                    continue
                    
                visited_urls.add(current_url)
                logger.info(f"Crawling {current_url}...")
                
                try:
                    driver.get(current_url)
                    # Wait a bit for JS to render
                    time.sleep(2)
                    
                    # Find all links
                    links = driver.find_elements(By.TAG_NAME, "a")
                    for link in links:
                        try:
                            href = link.get_attribute("href")
                            if not href:
                                continue
                                
                            # Normalize and filter
                            full_url = urljoin(current_url, href)
                            parsed_href = urlparse(full_url)
                            
                            # Only stay on same domain
                            if parsed_href.netloc == domain:
                                # Remove fragments
                                clean_url = f"{parsed_href.scheme}://{parsed_href.netloc}{parsed_href.path}"
                                if clean_url not in discovered_urls:
                                    discovered_urls.add(clean_url)
                                    urls_to_visit.append(clean_url)
                        except:
                            continue
                                
                except Exception as e:
                    logger.warning(f"Error crawling {current_url}: {e}")
                    
            logger.info(f"Selenium crawl completed. Found {len(discovered_urls)} URLs")
            return discovered_urls
            
        except Exception as e:
            logger.error(f"Failed to initialize Selenium driver: {e}")
            return discovered_urls
        finally:
            if driver:
                driver.quit()
