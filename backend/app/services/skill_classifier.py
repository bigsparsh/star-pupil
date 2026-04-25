"""
Skill Classification Module

Uses LLM (Groq) via LangGraph to extract skills from natural language recruiter queries.
Supports batch processing for parallel skill extraction.
"""
import asyncio
from typing import Optional, TypedDict
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, END

from app.core.config import settings
from app.schemas.recruiter import ExtractedSkills


SKILL_EXTRACTION_PROMPT = """You are a technical skill extraction expert. 
Analyze the following recruiter query and extract the technical skills mentioned.

Categorize skills as:
- primary_skills: Core skills that are explicitly required
- secondary_skills: Related/supporting skills that would be nice to have

IMPORTANT: Normalize skill names properly:
- Programming languages: use common lowercase names (e.g., "swift", "python", "java")
- C++ should be normalized to "c++" or "cpp"
- C# should be normalized to "c#" or "csharp"  
- Objective-C should be "objective-c"
- Node.js should be "nodejs" or "node"
- Include common variations as secondary skills (e.g., "golang" for "go", "js" for "javascript")

Return ONLY valid JSON in this exact format:
{{
    "primary_skills": ["skill1", "skill2"],
    "secondary_skills": ["skill3", "skill4"]
}}

Recruiter Query: {query}

JSON Response:"""


# State for LangGraph workflow
class SkillExtractionState(TypedDict):
    query: str
    result: Optional[dict]
    error: Optional[str]
    retry_count: int


class SkillClassifierService:
    """Service for extracting and classifying skills from natural language queries."""
    
    def __init__(self):
        self.llm: Optional[ChatGroq] = None
        self.parser = JsonOutputParser()
        self._graph: Optional[StateGraph] = None
        self._max_retries = 2
        
    def _get_llm(self) -> ChatGroq:
        """Lazily initialize the LLM client."""
        if self.llm is None:
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY not configured")
            self.llm = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name="llama-3.1-70b-versatile",
                temperature=0.1,
            )
        return self.llm
    
    def _build_graph(self) -> StateGraph:
        """Build LangGraph workflow for skill extraction with retry logic."""
        if self._graph is not None:
            return self._graph
            
        workflow = StateGraph(SkillExtractionState)
        
        async def extract_node(state: SkillExtractionState) -> SkillExtractionState:
            """Extract skills using LLM."""
            try:
                llm = self._get_llm()
                prompt = ChatPromptTemplate.from_template(SKILL_EXTRACTION_PROMPT)
                chain = prompt | llm | self.parser
                
                result = await chain.ainvoke({"query": state["query"]})
                return {**state, "result": result, "error": None}
            except Exception as e:
                return {**state, "error": str(e), "retry_count": state["retry_count"] + 1}
        
        def should_retry(state: SkillExtractionState) -> str:
            """Decide whether to retry or end."""
            if state.get("result") is not None:
                return "end"
            if state["retry_count"] < self._max_retries:
                return "retry"
            return "fallback"
        
        async def fallback_node(state: SkillExtractionState) -> SkillExtractionState:
            """Use fallback extraction when LLM fails."""
            fallback_result = self._fallback_extraction(state["query"])
            return {
                **state, 
                "result": {
                    "primary_skills": fallback_result.primary_skills,
                    "secondary_skills": fallback_result.secondary_skills,
                }
            }
        
        # Add nodes
        workflow.add_node("extract", extract_node)
        workflow.add_node("fallback", fallback_node)
        
        # Add edges
        workflow.set_entry_point("extract")
        workflow.add_conditional_edges(
            "extract",
            should_retry,
            {
                "end": END,
                "retry": "extract",
                "fallback": "fallback",
            }
        )
        workflow.add_edge("fallback", END)
        
        self._graph = workflow.compile()
        return self._graph
    
    async def extract_skills(self, query: str) -> ExtractedSkills:
        """
        Extract skills from a recruiter query using LLM with LangGraph.
        
        Args:
            query: Natural language recruiter query
            
        Returns:
            ExtractedSkills with primary and secondary skills
        """
        try:
            graph = self._build_graph()
            
            initial_state: SkillExtractionState = {
                "query": query,
                "result": None,
                "error": None,
                "retry_count": 0,
            }
            
            final_state = await graph.ainvoke(initial_state)
            result = final_state.get("result", {})
            
            return ExtractedSkills(
                primary_skills=[s.lower().strip() for s in result.get("primary_skills", [])],
                secondary_skills=[s.lower().strip() for s in result.get("secondary_skills", [])],
            )
        except Exception as e:
            # Ultimate fallback
            return self._fallback_extraction(query)
    
    async def extract_skills_batch(self, queries: list[str]) -> list[ExtractedSkills]:
        """
        Extract skills from multiple queries in parallel.
        
        Args:
            queries: List of natural language recruiter queries
            
        Returns:
            List of ExtractedSkills corresponding to each query
        """
        tasks = [self.extract_skills(query) for query in queries]
        return await asyncio.gather(*tasks, return_exceptions=False)
    
    def _fallback_extraction(self, query: str) -> ExtractedSkills:
        """Fallback skill extraction using simple keyword matching."""
        # Common tech skills for basic matching
        common_skills = {
            # Programming languages
            "python", "javascript", "typescript", "java", "go", "golang", "rust",
            "swift", "kotlin", "scala", "ruby", "php", "perl", "lua", "haskell",
            "elixir", "erlang", "clojure", "dart", "r", "julia", "zig", "nim",
            "c", "c++", "cpp", "c#", "csharp", "objective-c", "objc",
            # Frontend
            "react", "vue", "angular", "svelte", "nextjs", "nuxt", "remix",
            "html", "css", "sass", "tailwind", "bootstrap",
            # Backend
            "node", "nodejs", "fastapi", "django", "flask", "express", "spring",
            "rails", "laravel", "asp.net", "gin", "echo", "fiber",
            # Mobile
            "ios", "android", "react native", "flutter", "swiftui", "jetpack compose",
            # DevOps & Cloud
            "kubernetes", "k8s", "docker", "aws", "gcp", "azure", "terraform",
            "ansible", "jenkins", "github actions", "gitlab ci", "circleci",
            # Databases
            "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
            "sqlite", "oracle", "sql server", "dynamodb", "cassandra", "neo4j",
            # Other
            "graphql", "rest", "api", "microservices", "machine learning", "ml",
            "ai", "deep learning", "nlp", "data science", "pandas", "numpy",
            "pytorch", "tensorflow", "scikit-learn", "opencv",
            "git", "ci/cd", "devops", "linux", "sql", "nosql", "blockchain",
        }
        
        # Normalize aliases
        skill_aliases = {
            "c++": ["cpp", "cplusplus"],
            "c#": ["csharp", "c sharp"],
            "objective-c": ["objc", "obj-c"],
            "javascript": ["js"],
            "typescript": ["ts"],
            "golang": ["go"],
            "nodejs": ["node", "node.js"],
            "postgresql": ["postgres"],
            "kubernetes": ["k8s"],
            "react native": ["reactnative"],
        }
        
        query_lower = query.lower()
        words = set(query_lower.replace(",", " ").replace(".", " ").split())
        
        found_skills = []
        for skill in common_skills:
            if skill in query_lower or skill in words:
                found_skills.append(skill)
        
        # Check for aliases
        for main_skill, aliases in skill_aliases.items():
            for alias in aliases:
                if alias in query_lower and main_skill not in found_skills:
                    found_skills.append(main_skill)
                    break
        
        # Dedupe while preserving order
        found_skills = list(dict.fromkeys(found_skills))
        
        # First half as primary, rest as secondary
        mid = len(found_skills) // 2 or len(found_skills)
        return ExtractedSkills(
            primary_skills=found_skills[:mid],
            secondary_skills=found_skills[mid:],
        )


# Singleton instance
skill_classifier = SkillClassifierService()
