"""Custom tools for the health chatbot agent."""
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


class GeneralHealthSearchInput(BaseModel):
    """Input schema for general health search tool."""
    query: str = Field(description="The general health query to search for")


class GeneralHealthSearchTool(BaseTool):
    """Tool for searching general health information using Tavily."""
    
    name: str = "general_health_search"
    description: str = """
    Searches for general health and wellness information.
    Use this when you need to find information about health topics, nutrition, fitness, wellness, etc.
    Input should be a clear health-related query.
    """
    args_schema: Type[BaseModel] = GeneralHealthSearchInput
    
    def _run(
        self,
        query: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Search for general health information."""
        try:
            tavily_client = TavilyClient(api_key=config.TAVILY_API_KEY)
            
            # Perform search with health context
            search_query = f"health wellness information: {query}"
            results = tavily_client.search(
                query=search_query,
                max_results=3,  # Fewer results for quick responses
                search_depth="basic",
                include_raw_content=False
            )
            
            if not results or "results" not in results:
                return "No health information found."
            
            # Format results concisely
            formatted_results = []
            
            for idx, result in enumerate(results["results"][:3], 1):
                title = result.get('title', 'N/A')
                content = result.get('content', 'N/A')
                
                formatted_results.append(
                    f"{idx}. {title}\n{content}\n"
                )
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            return f"Error searching health information: {str(e)}"


class NutritionInfoInput(BaseModel):
    """Input schema for nutrition information tool."""
    food_or_nutrient: str = Field(description="The food item or nutrient to get information about")


class NutritionInfoTool(BaseTool):
    """Tool for getting nutrition information."""
    
    name: str = "nutrition_info"
    description: str = """
    Searches for nutritional information about foods, nutrients, or dietary recommendations.
    Use this when users ask about diet, nutrition, foods, vitamins, or nutritional needs.
    Input should be the food item or nutrient name.
    """
    args_schema: Type[BaseModel] = NutritionInfoInput
    
    def _run(
        self,
        food_or_nutrient: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Get nutrition information."""
        try:
            tavily_client = TavilyClient(api_key=config.TAVILY_API_KEY)
            
            # Search for nutrition information
            search_query = f"nutrition benefits health information: {food_or_nutrient}"
            results = tavily_client.search(
                query=search_query,
                max_results=3,
                search_depth="basic",
                include_raw_content=False
            )
            
            if not results or "results" not in results:
                return "No nutrition information found."
            
            # Format results
            formatted_results = []
            
            for idx, result in enumerate(results["results"][:3], 1):
                title = result.get('title', 'N/A')
                content = result.get('content', 'N/A')
                
                formatted_results.append(
                    f"{idx}. {title}\n{content}\n"
                )
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            return f"Error getting nutrition information: {str(e)}"


class WellnessTipsInput(BaseModel):
    """Input schema for wellness tips tool."""
    topic: str = Field(description="The wellness topic to get tips about (e.g., sleep, stress, exercise)")


class WellnessTipsTool(BaseTool):
    """Tool for getting wellness and lifestyle tips."""
    
    name: str = "wellness_tips"
    description: str = """
    Searches for wellness tips and lifestyle advice on topics like sleep, stress management, exercise, mental health, etc.
    Use this when users ask for tips, advice, or guidance on wellness topics.
    Input should be the wellness topic.
    """
    args_schema: Type[BaseModel] = WellnessTipsInput
    
    def _run(
        self,
        topic: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Get wellness tips."""
        try:
            tavily_client = TavilyClient(api_key=config.TAVILY_API_KEY)
            
            # Search for wellness tips
            search_query = f"wellness tips advice best practices: {topic}"
            results = tavily_client.search(
                query=search_query,
                max_results=3,
                search_depth="basic",
                include_raw_content=False
            )
            
            if not results or "results" not in results:
                return "No wellness tips found."
            
            # Format results
            formatted_results = []
            
            for idx, result in enumerate(results["results"][:3], 1):
                title = result.get('title', 'N/A')
                content = result.get('content', 'N/A')
                
                formatted_results.append(
                    f"{idx}. {title}\n{content}\n"
                )
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            return f"Error getting wellness tips: {str(e)}"


def get_chatbot_tools():
    """Return list of all available chatbot tools."""
    return [
        GeneralHealthSearchTool(),
        NutritionInfoTool(),
        WellnessTipsTool(),
    ]
