"""
Portfolio Website Scraper Service

Scrapes user portfolio websites to extract skills and technologies.
Uses HTML parsing and keyword matching to identify technical skills.
"""
import asyncio
import re
from typing import Optional
from dataclasses import dataclass, field
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

from app.core.config import settings


# Common skill keywords to look for in portfolio sites
SKILL_KEYWORDS = {
    # Programming Languages
    "python", "javascript", "typescript", "java", "go", "golang", "rust",
    "swift", "kotlin", "scala", "ruby", "php", "perl", "lua", "haskell",
    "elixir", "erlang", "clojure", "dart", "r", "julia", "zig", "nim",
    "c++", "cpp", "c#", "csharp", "objective-c", "objc",
    
    # Frontend
    "react", "reactjs", "vue", "vuejs", "angular", "svelte", "nextjs",
    "next.js", "nuxt", "nuxtjs", "remix", "gatsby", "html", "css", "sass",
    "scss", "less", "tailwind", "tailwindcss", "bootstrap", "material-ui",
    "chakra", "styled-components", "emotion",
    
    # Backend
    "node", "nodejs", "node.js", "express", "expressjs", "fastapi", "django",
    "flask", "spring", "springboot", "rails", "laravel", "asp.net", "dotnet",
    ".net", "gin", "echo", "fiber", "actix", "rocket", "phoenix", "nestjs",
    
    # Mobile
    "ios", "android", "react native", "react-native", "flutter", "swiftui",
    "jetpack compose", "xamarin", "ionic", "cordova",
    
    # Databases
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
    "sqlite", "oracle", "sql server", "dynamodb", "cassandra", "neo4j",
    "firebase", "supabase", "prisma", "sequelize", "typeorm", "sqlalchemy",
    
    # DevOps & Cloud
    "docker", "kubernetes", "k8s", "aws", "amazon web services", "gcp",
    "google cloud", "azure", "terraform", "ansible", "jenkins", "circleci",
    "github actions", "gitlab ci", "travis", "vercel", "netlify", "heroku",
    "digitalocean", "linode", "nginx", "apache",
    
    # Data & ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "scikit-learn", "sklearn", "pandas", "numpy", "scipy", "matplotlib",
    "jupyter", "data science", "data analysis", "nlp", "computer vision",
    "opencv", "huggingface", "transformers", "llm", "langchain",
    
    # Tools & Other
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "figma",
    "sketch", "adobe xd", "linux", "unix", "bash", "shell", "vim", "vscode",
    "graphql", "rest", "restful", "api", "microservices", "grpc", "websocket",
    "rabbitmq", "kafka", "redis", "celery", "oauth", "jwt", "ci/cd",
    "agile", "scrum", "tdd", "testing", "jest", "pytest", "cypress",
    "selenium", "playwright", "webpack", "vite", "rollup", "esbuild",
    "blockchain", "solidity", "web3", "ethereum", "smart contracts",
}

# Patterns to identify skill sections on portfolio sites
SKILL_SECTION_PATTERNS = [
    r"skills?",
    r"technologies",
    r"tech\s*stack",
    r"expertise",
    r"proficienc(y|ies)",
    r"tools?\s*(i\s*use|&\s*technologies)?",
    r"languages?",
    r"frameworks?",
    r"what\s*i\s*(know|use|work\s*with)",
    r"experience\s*with",
    r"technical\s*skills?",
]


@dataclass
class PortfolioData:
    """Extracted data from a portfolio website."""
    url: str
    skills: list[str] = field(default_factory=list)
    title: str | None = None
    description: str | None = None
    projects_mentioned: int = 0
    success: bool = True
    error: str | None = None
    
    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "skills": self.skills,
            "title": self.title,
            "description": self.description,
            "projects_mentioned": self.projects_mentioned,
            "success": self.success,
            "error": self.error,
        }


class PortfolioScraperService:
    """Service for scraping portfolio websites to extract skills."""
    
    def __init__(self):
        self._skill_pattern = self._build_skill_pattern()
        self._section_pattern = re.compile(
            "|".join(SKILL_SECTION_PATTERNS), 
            re.IGNORECASE
        )
    
    def _build_skill_pattern(self) -> re.Pattern:
        """Build regex pattern for matching skills."""
        # Escape special regex characters and create pattern
        escaped_skills = []
        for skill in SKILL_KEYWORDS:
            escaped = re.escape(skill)
            # Allow for word boundaries
            escaped_skills.append(rf"\b{escaped}\b")
        
        return re.compile("|".join(escaped_skills), re.IGNORECASE)
    
    def _normalize_url(self, url: str) -> str:
        """Ensure URL has proper scheme."""
        if not url:
            return ""
        
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        
        return url
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid and safe to scrape."""
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # Block obviously bad URLs
            blocked_domains = [
                "localhost", "127.0.0.1", "0.0.0.0",
                "internal", "private", "local",
            ]
            
            for blocked in blocked_domains:
                if blocked in parsed.netloc.lower():
                    return False
            
            return True
        except Exception:
            return False
    
    async def scrape_portfolio(self, url: str) -> PortfolioData:
        """
        Scrape a portfolio website and extract skills.
        
        Args:
            url: The portfolio website URL
            
        Returns:
            PortfolioData with extracted information
        """
        url = self._normalize_url(url)
        
        if not url or not self._is_valid_url(url):
            return PortfolioData(
                url=url,
                success=False,
                error="Invalid or unsafe URL"
            )
        
        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; StarTalentBot/1.0; +https://star.dev)",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Only process HTML content
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type.lower():
                    return PortfolioData(
                        url=url,
                        success=False,
                        error="Not an HTML page"
                    )
                
                html_content = response.text
                return self._parse_html(url, html_content)
                
        except httpx.TimeoutException:
            return PortfolioData(url=url, success=False, error="Request timed out")
        except httpx.HTTPStatusError as e:
            return PortfolioData(url=url, success=False, error=f"HTTP {e.response.status_code}")
        except Exception as e:
            return PortfolioData(url=url, success=False, error=str(e)[:100])
    
    def _parse_html(self, url: str, html: str) -> PortfolioData:
        """Parse HTML and extract portfolio data."""
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove script and style elements
        for element in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            element.decompose()
        
        # Extract title
        title = None
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)[:200]
        
        # Extract meta description
        description = None
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            description = meta_desc.get("content", "")[:500]
        
        # Get all text content
        text_content = soup.get_text(separator=" ", strip=True).lower()
        
        # Find skills
        skills = self._extract_skills(soup, text_content)
        
        # Count project mentions
        projects_mentioned = self._count_projects(soup, text_content)
        
        return PortfolioData(
            url=url,
            skills=skills,
            title=title,
            description=description,
            projects_mentioned=projects_mentioned,
            success=True,
        )
    
    def _extract_skills(self, soup: BeautifulSoup, text_content: str) -> list[str]:
        """Extract skills from the page content."""
        found_skills = set()
        
        # Strategy 1: Look in skill-specific sections
        skill_sections = self._find_skill_sections(soup)
        for section in skill_sections:
            section_text = section.get_text(separator=" ", strip=True).lower()
            matches = self._skill_pattern.findall(section_text)
            found_skills.update(matches)
        
        # Strategy 2: Look for skills in lists (ul, ol)
        for list_elem in soup.find_all(["ul", "ol"]):
            list_text = list_elem.get_text(separator=" ", strip=True).lower()
            # Check if this list contains skill-like content
            if self._section_pattern.search(list_text) or len(self._skill_pattern.findall(list_text)) >= 2:
                matches = self._skill_pattern.findall(list_text)
                found_skills.update(matches)
        
        # Strategy 3: Look for badges/tags (common in portfolios)
        for badge in soup.find_all(class_=re.compile(r"(badge|tag|chip|skill|tech)", re.IGNORECASE)):
            badge_text = badge.get_text(strip=True).lower()
            if len(badge_text) < 50:  # Likely a skill tag
                matches = self._skill_pattern.findall(badge_text)
                found_skills.update(matches)
        
        # Strategy 4: Scan full page for common skills (with lower confidence)
        if len(found_skills) < 3:
            # Look in the full text but be more selective
            all_matches = self._skill_pattern.findall(text_content)
            # Count occurrences to filter noise
            from collections import Counter
            skill_counts = Counter(all_matches)
            # Only add skills mentioned multiple times or very specific ones
            for skill, count in skill_counts.items():
                if count >= 2 or skill in {"rust", "go", "swift", "kotlin", "fastapi", "svelte"}:
                    found_skills.add(skill)
        
        # Normalize skill names
        normalized = self._normalize_skills(list(found_skills))
        
        return sorted(normalized)
    
    def _find_skill_sections(self, soup: BeautifulSoup) -> list:
        """Find HTML sections that likely contain skills."""
        sections = []
        
        # Look for headings with skill-related text
        for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
            heading_text = heading.get_text(strip=True).lower()
            if self._section_pattern.search(heading_text):
                # Get the next sibling elements or parent section
                parent = heading.find_parent(["section", "div", "article"])
                if parent:
                    sections.append(parent)
                else:
                    # Get next siblings until next heading
                    current = heading.find_next_sibling()
                    while current and current.name not in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                        sections.append(current)
                        current = current.find_next_sibling()
        
        # Look for sections/divs with skill-related IDs or classes
        for section in soup.find_all(["section", "div", "article"]):
            section_id = section.get("id", "").lower()
            section_class = " ".join(section.get("class", [])).lower()
            
            if self._section_pattern.search(section_id) or self._section_pattern.search(section_class):
                sections.append(section)
        
        return sections
    
    def _count_projects(self, soup: BeautifulSoup, text_content: str) -> int:
        """Count the number of projects mentioned."""
        count = 0
        
        # Look for project sections
        project_patterns = [
            r"\bproject(s)?\b",
            r"\bportfolio\b",
            r"\bwork(s)?\b",
            r"\bcase\s*stud(y|ies)\b",
        ]
        project_pattern = re.compile("|".join(project_patterns), re.IGNORECASE)
        
        # Count project-like headings
        for heading in soup.find_all(["h2", "h3", "h4"]):
            heading_text = heading.get_text(strip=True)
            if project_pattern.search(heading_text):
                # Count items in the following section
                parent = heading.find_parent(["section", "div"])
                if parent:
                    # Count cards or list items
                    cards = parent.find_all(class_=re.compile(r"(card|project|item)", re.IGNORECASE))
                    count += len(cards) if cards else 1
        
        # Also count GitHub links as potential projects
        github_links = soup.find_all("a", href=re.compile(r"github\.com/\w+/\w+"))
        count += len(github_links)
        
        return min(count, 50)  # Cap at reasonable number
    
    def _normalize_skills(self, skills: list[str]) -> list[str]:
        """Normalize skill names to standard format."""
        normalization_map = {
            "nodejs": "node",
            "node.js": "node",
            "reactjs": "react",
            "react.js": "react",
            "vuejs": "vue",
            "vue.js": "vue",
            "nextjs": "nextjs",
            "next.js": "nextjs",
            "nuxtjs": "nuxt",
            "expressjs": "express",
            "tailwindcss": "tailwind",
            "cpp": "c++",
            "cplusplus": "c++",
            "csharp": "c#",
            "golang": "go",
            "postgresql": "postgres",
            "amazon web services": "aws",
            "google cloud": "gcp",
            "scikit-learn": "sklearn",
            "react-native": "react native",
        }
        
        normalized = set()
        for skill in skills:
            skill_lower = skill.lower().strip()
            normalized_skill = normalization_map.get(skill_lower, skill_lower)
            normalized.add(normalized_skill)
        
        return list(normalized)


# Singleton instance
portfolio_scraper = PortfolioScraperService()
