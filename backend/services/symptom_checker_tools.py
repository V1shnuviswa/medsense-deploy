"""Custom tools for the symptom checker agent."""
from typing import Optional, Type

# Import BaseTool from correct location
try:
    from langchain_core.tools import BaseTool
except ImportError:
    from langchain.tools import BaseTool

# Import callbacks from correct location  
try:
    from langchain_core.callbacks.manager import CallbackManagerForToolRun
except ImportError:
    try:
        from langchain.callbacks.manager import CallbackManagerForToolRun
    except ImportError:
        from langchain_core.callbacks import CallbackManagerForToolRun

from pydantic import BaseModel, Field
from tavily import TavilyClient
from services.symptom_checker_config import config
import json


class MedicalSearchInput(BaseModel):
    """Input schema for medical search tool."""
    query: str = Field(description="The medical query to search for")


class MedicalSearchTool(BaseTool):
    """Tool for searching medical information using Tavily."""
    
    name: str = "medical_search"
    description: str = """
    Searches for accurate medical information about symptoms, conditions, treatments, and remedies.
    Use this when you need to find reliable medical information to help diagnose symptoms or suggest treatments.
    Input should be a clear medical query.
    """
    args_schema: Type[BaseModel] = MedicalSearchInput
    
    def _run(
        self,
        query: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Search for medical information."""
        try:
            tavily_client = TavilyClient(api_key=config.TAVILY_API_KEY)
            
            # Perform search with medical context
            search_query = f"medical information symptoms treatment: {query}"
            results = tavily_client.search(
                query=search_query,
                max_results=config.MAX_WEB_SOURCES,
                search_depth="advanced",
                include_raw_content=False
            )
            
            if not results or "results" not in results:
                return "No medical information found."
            
            # Format results with clear source attribution
            formatted_results = []
            sources_list = []
            
            for idx, result in enumerate(results["results"][:config.MAX_WEB_SOURCES], 1):
                url = result.get('url', 'N/A')
                title = result.get('title', 'N/A')
                content = result.get('content', 'N/A')
                
                formatted_results.append(
                    f"Source {idx} - {title}:\n"
                    f"Content: {content}\n"
                    f"Reference URL: {url}\n"
                )
                
                sources_list.append({
                    "title": title,
                    "url": url
                })
            
            result_text = "\n".join(formatted_results)
            result_text += "\n\n[SOURCES_START]\n" + json.dumps(sources_list) + "\n[SOURCES_END]"
            
            return result_text
            
        except Exception as e:
            return f"Error searching medical information: {str(e)}"


class SymptomAnalysisInput(BaseModel):
    """Input schema for symptom analysis tool."""
    symptoms: str = Field(description="The symptoms to analyze")


class SymptomAnalysisTool(BaseTool):
    """Tool for analyzing symptoms and providing structured diagnosis."""
    
    name: str = "analyze_symptoms"
    description: str = """
    Analyzes symptoms and provides a structured medical assessment.
    Use this after gathering information to create a comprehensive diagnosis.
    Input should be a description of symptoms to analyze.
    """
    args_schema: Type[BaseModel] = SymptomAnalysisInput
    
    def _run(
        self,
        symptoms: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Analyze symptoms and return structured output."""
        # This tool acts as a structured formatter
        return f"Analyzing symptoms: {symptoms}. Please provide comprehensive diagnosis including possible conditions, severity, and recommendations."


class TreatmentRecommendationInput(BaseModel):
    """Input schema for treatment recommendation tool."""
    condition: str = Field(description="The medical condition to get treatment recommendations for")


class TreatmentRecommendationTool(BaseTool):
    """Tool for getting treatment and remedy recommendations."""
    
    name: str = "treatment_recommendations"
    description: str = """
    Searches for treatment options, remedies, medications, diet recommendations, and precautions for a specific condition.
    Use this after identifying possible conditions to provide comprehensive treatment guidance.
    Input should be the medical condition name.
    """
    args_schema: Type[BaseModel] = TreatmentRecommendationInput
    
    def _run(
        self,
        condition: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Get treatment recommendations."""
        try:
            tavily_client = TavilyClient(api_key=config.TAVILY_API_KEY)
            
            # Search for treatment information
            search_query = f"treatment remedies medications diet precautions for {condition}"
            results = tavily_client.search(
                query=search_query,
                max_results=config.MAX_WEB_SOURCES,
                search_depth="advanced",
                include_raw_content=False
            )
            
            if not results or "results" not in results:
                return "No treatment information found."
            
            # Format results with source URLs
            formatted_results = []
            sources_list = []
            
            for idx, result in enumerate(results["results"][:config.MAX_WEB_SOURCES], 1):
                url = result.get('url', 'N/A')
                title = result.get('title', 'N/A')
                content = result.get('content', 'N/A')
                
                formatted_results.append(
                    f"Source {idx} - {title}:\n"
                    f"{content}\n"
                    f"Reference: {url}\n"
                )
                
                sources_list.append({
                    "title": title,
                    "url": url
                })
            
            result_text = "\n".join(formatted_results)
            result_text += "\n\n[SOURCES_START]\n" + json.dumps(sources_list) + "\n[SOURCES_END]"
            
            return result_text
            
        except Exception as e:
            return f"Error getting treatment recommendations: {str(e)}"


def get_tools():
    """Return list of all available tools."""
    return [
        MedicalSearchTool(),
        SymptomAnalysisTool(),
        TreatmentRecommendationTool(),
    ]
