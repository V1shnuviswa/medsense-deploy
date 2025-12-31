"""General Health Chatbot Agent using LangChain."""
from typing import Dict, Any, List

# Import agents from correct location
try:
    # Try importing from langchain-classic (for langchain 1.x)
    from langchain_classic.agents import AgentExecutor, create_react_agent
except ImportError:
    try:
        # Fallback to old langchain (< 1.0)
        from langchain.agents import AgentExecutor, create_react_agent
    except ImportError:
        # For other versions
        from langchain.agents import create_react_agent
        from langchain.agents.agent import AgentExecutor

from langchain_openai import ChatOpenAI

# Import prompts from the correct location
try:
    from langchain_core.prompts import PromptTemplate
except ImportError:
    from langchain.prompts import PromptTemplate

# Import memory from the correct location
try:
    from langchain_classic.memory import ConversationBufferMemory
except ImportError:
    try:
        from langchain.memory import ConversationBufferMemory
    except ImportError:
        from langchain_core.memory import ConversationBufferMemory

from services.symptom_checker_config import config
from services.health_chatbot_tools import get_chatbot_tools
import json
import re


class HealthChatbotAgent:
    """Agent for answering general health questions."""
    
    def __init__(self):
        """Initialize the health chatbot agent."""
        # Initialize LLM with Moonshot API (using same config as symptom checker)
        self.llm = ChatOpenAI(
            model=config.MOONSHOT_MODEL,
            temperature=0.3,  # Slightly higher for more conversational responses
            openai_api_key=config.MOONSHOT_API_KEY,
            openai_api_base=config.MOONSHOT_BASE_URL,
            request_timeout=config.API_TIMEOUT,
        )
        
        # Get tools
        self.tools = get_chatbot_tools()
        
        # Create the prompt
        self.prompt = self._create_prompt()
        
        # Create the agent
        self.agent = create_react_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Create agent executor
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors="Check your output and make sure it conforms to the expected format!",
            max_iterations=10,
            return_intermediate_steps=True,
            early_stopping_method="generate",
        )
        
        # Conversation memory (simple in-memory storage)
        self.conversations: Dict[str, List[Dict[str, str]]] = {}
    
    def _create_prompt(self) -> PromptTemplate:
        """Create the React agent prompt for general health chatbot."""
        template = """You are a friendly and knowledgeable health assistant chatbot. Your role is to answer general health questions in a conversational, helpful, and empathetic manner.

IMPORTANT GUIDELINES:
- Provide accurate, evidence-based health information
- Be conversational, warm, and empathetic
- Keep responses concise but informative (3-5 sentences typically)
- Always include relevant disclaimers when appropriate
- Encourage consulting healthcare professionals for specific medical concerns
- Use simple, easy-to-understand language
- If asked about specific symptoms or medical diagnosis, gently redirect to the main symptom checker

TOPICS YOU CAN HELP WITH:
- General health and wellness tips
- Nutrition and diet basics
- Exercise and fitness guidance
- Sleep hygiene
- Stress management
- Preventive health measures
- General medication information
- Healthy lifestyle habits
- Mental health awareness

WHAT YOU SHOULD NOT DO:
- Diagnose specific medical conditions (redirect to symptom checker)
- Recommend specific medications for individual cases
- Replace professional medical advice
- Provide emergency medical guidance

You have access to the following tools:

{tools}

IMPORTANT: For simple greetings or general questions that don't require searching, you can answer directly without using tools.

Use the following format EXACTLY:

Question: the health question you must answer
Thought: Do I need to search for information, or can I answer this directly?
Action: [ONLY if you need to search] the action to take, should be one of [{tool_names}]
Action Input: [ONLY if using a tool] the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat if needed)
Thought: I now have enough information to answer (or I can answer directly)
Final Answer: your conversational, friendly response to the user's question

EXAMPLES:

Example 1 (Simple greeting - NO TOOL NEEDED):
Question: Hi, how are you?
Thought: This is a simple greeting. I can answer directly without searching.
Final Answer: Hello! I'm doing well, thank you for asking. I'm here to help answer your health and wellness questions. What would you like to know about today?

Example 2 (Health question - NEEDS TOOL):
Question: What are the benefits of vitamin D?
Thought: I should search for detailed information about vitamin D benefits.
Action: nutrition_info
Action Input: vitamin D
Observation: [search results about vitamin D]
Thought: I now have good information to provide a comprehensive answer.
Final Answer: [response based on search results]

CRITICAL FORMATTING:
- Keep responses conversational and friendly
- DO NOT use emojis - provide text-only responses
- Format with line breaks for readability if needed
- Always be empathetic and supportive
- Use clear, professional language without emoji decorations
- For simple questions, go straight to Final Answer after Thought
- ALWAYS include "Final Answer:" before your response

Begin!

Question: {input}
Thought:{agent_scratchpad}"""
        
        return PromptTemplate(
            template=template,
            input_variables=["input", "agent_scratchpad"],
            partial_variables={
                "tools": "\n".join([f"{tool.name}: {tool.description}" for tool in self.tools]),
                "tool_names": ", ".join([tool.name for tool in self.tools]),
            }
        )
    
    def chat(self, message: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Process a chat message and return a response.
        
        Args:
            message: User's message
            session_id: Session identifier for conversation tracking
            
        Returns:
            Dictionary with response and metadata
        """
        try:
            # Initialize conversation history if needed
            if session_id not in self.conversations:
                self.conversations[session_id] = []
            
            # Add user message to history
            self.conversations[session_id].append({
                "role": "user",
                "content": message
            })
            
            # Run the agent
            result = self.agent_executor.invoke({"input": message})
            
            # Extract the output
            response = result.get("output", "I'm sorry, I couldn't process that request. Please try again.")
            
            # Add assistant response to history
            self.conversations[session_id].append({
                "role": "assistant",
                "content": response
            })
            
            # Keep only last 20 messages to prevent memory bloat
            if len(self.conversations[session_id]) > 20:
                self.conversations[session_id] = self.conversations[session_id][-20:]
            
            return {
                "response": response,
                "session_id": session_id,
                "success": True
            }
            
        except Exception as e:
            error_response = "I apologize, but I encountered an error processing your question. Please try rephrasing or ask something else."
            
            self.conversations[session_id].append({
                "role": "assistant",
                "content": error_response
            })
            
            return {
                "response": error_response,
                "session_id": session_id,
                "success": False,
                "error": str(e)
            }
    
    def get_conversation_history(self, session_id: str = "default") -> List[Dict[str, str]]:
        """Get conversation history for a session."""
        return self.conversations.get(session_id, [])
    
    def clear_conversation(self, session_id: str = "default"):
        """Clear conversation history for a session."""
        if session_id in self.conversations:
            del self.conversations[session_id]


# Create global chatbot instance
chatbot_agent = HealthChatbotAgent()
