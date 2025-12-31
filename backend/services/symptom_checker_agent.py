"""Symptom Checker Agent using LangChain Zero-Shot React Agent with Chain of Thought."""
from typing import Dict, Any, List
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
from services.symptom_checker_tools import get_tools
import json
import re


class SymptomCheckerAgent:
    """Agent for analyzing symptoms and providing medical recommendations."""
    
    def __init__(self):
        """Initialize the symptom checker agent."""
        # Initialize LLM with Moonshot API
        self.llm = ChatOpenAI(
            model=config.MOONSHOT_MODEL,
            temperature=config.MOONSHOT_TEMPERATURE,
            openai_api_key=config.MOONSHOT_API_KEY,
            openai_api_base=config.MOONSHOT_BASE_URL,
            request_timeout=config.API_TIMEOUT,
        )
        
        # Get tools
        self.tools = get_tools()
        
        # Create the prompt with Chain of Thought reasoning
        self.prompt = self._create_prompt()
        
        # Create the agent
        self.agent = create_react_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Create agent executor with better error handling
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors="Check your output and make sure it conforms to the expected format! Use the correct format:\nThought: [your thought]\nAction: [tool name]\nAction Input: [tool input]",
            max_iterations=15,
            return_intermediate_steps=True,
            early_stopping_method="generate",
        )
    
    def _create_prompt(self) -> PromptTemplate:
        """Create the React agent prompt with chain of thought reasoning."""
        template = """You are a compassionate and expert medical AI assistant specialized in symptom analysis and diagnosis. 
Your role is to provide empathetic, conversational, detailed, and accurate medical guidance.

IMPORTANT COMMUNICATION STYLE:
- Start by acknowledging the patient's concerns with deep empathy and understanding
- Use a warm, conversational, caring tone throughout
- Explain medical concepts in detailed yet simple, understandable language
- Show genuine care and concern for their wellbeing
- Be reassuring while being honest about the condition
- Provide comprehensive information with multiple detailed points for each section

PROCESS:
1. Acknowledge and validate their symptoms with empathy
2. Search for relevant medical information with credible sources
3. Explain the likely condition in detail - what's happening, why, and what to expect
4. Provide comprehensive treatment recommendations with clear medical disclaimers
5. Offer detailed diet and lifestyle advice with specific examples
6. Give clear, specific guidance on when to seek professional help and which specialist to see

You have access to the following tools:

{tools}

Use the following format:

Question: the input question or symptoms you must analyze
Thought: you should always think about what to do, use chain of thought reasoning
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: your final answer must be a valid JSON object 

CRITICAL: Your Final Answer MUST be a valid JSON object with this EXACT structure:
{{
    "symptoms": "clear, detailed list of symptoms mentioned by the user",
    "opening_message": "A warm, deeply empathetic opening message acknowledging their concerns and validating their feelings (2-3 SHORT sentences, show genuine care)",
    "diagnosis": ["You're experiencing Computer Vision Syndrome combined with occupational strain", "Prolonged screen exposure causes eye strain as your eyes constantly adjust to digital images", "Common triggers include inadequate lighting and poor posture", "With proper ergonomic adjustments, most people see improvement within 1-2 weeks"],
    "medications": ["medication 1 with brief dosing info", "medication 2 with usage notes", "medication 3 with when to use", "medication 4 if applicable", "medication 5 if applicable"],
    "medication_disclaimer": "⚠️ CRITICAL: Do NOT take any medications without consulting your doctor first. These are suggestions ONLY for discussion with your healthcare provider who must evaluate your specific situation.",
    "diet": ["specific diet recommendation 1", "specific diet recommendation 2", "specific diet recommendation 3", "specific diet recommendation 4", "specific diet recommendation 5"],
    "precautions": "STRUCTURED advice in SHORT PARAGRAPHS separated by double line breaks (\\n\\n). START WITH: Immediate Remedies (4-5 immediate actions to take now - apply warm compress, take breaks, do stretches, adjust lighting, practice 20-20-20 rule). Then include: What to monitor (2 sentences), Warning signs requiring emergency care (2 sentences - use 'seek emergency medical attention' or 'go to emergency department', NEVER mention specific emergency numbers like 911). Use paragraph breaks for readability.",
    "doctor_visit": "yes or no - whether doctor consultation is recommended",
    "doctor_specialist": "If doctor_visit is yes, specify EXACT specialist type (e.g., Cardiologist, Neurologist, Gastroenterologist, Pulmonologist, Endocrinologist, Dermatologist, Orthopedist, ENT Specialist, General Practitioner) and brief reason (1-2 sentences). Example: 'Cardiologist for cardiac evaluation. Chest pain requires ECG and stress tests.'",
    "severity": "low, moderate, or high",
    "recommendations": "STRUCTURED recommendations in SHORT PARAGRAPHS separated by double line breaks (\\n\\n). Include: Next steps (2 sentences - if urgent, say 'seek emergency medical attention immediately' without mentioning specific numbers), Timeline (1-2 sentences), Encouragement (1-2 sentences). Use paragraph breaks for readability.",
    "dos_donts": {{"dos": ["Do action 1 (brief)", "Do action 2 (brief)", "Do action 3 (brief)"], "donts": ["Don't action 1 (brief)", "Don't action 2 (brief)", "Don't action 3 (brief)"]}},
    "sources": [{{"title": "source title", "url": "source url"}}]
}}

FORMATTING RULES - VERY IMPORTANT:
- Diagnosis: Provide as ARRAY of 4-6 clear bullet points, each explaining a key aspect (what's happening, why, causes, outcome). NEVER use labels like "Point 1:", "Point 2:", "Point 3:", etc. Start each array item directly with the medical information.
- Precautions: Use \\n\\n (double line breaks) between paragraphs. MUST start with "Immediate Remedies" section containing 4-5 specific immediate actions
- Use \\n\\n (double line breaks) between paragraphs for all long text fields
- Keep each paragraph/point to 1-2 sentences maximum
- Make it scannable and easy to read

DETAILED RESPONSE REQUIREMENTS:
- Diagnosis: Provide 4-6 bullet points as an ARRAY of strings. Each point should be a complete sentence WITHOUT labels like "Point 1:", "Point 2:", etc. Just start directly with the medical information. WRONG: "Point 1: You're experiencing...". CORRECT: "You're experiencing..."
- Medications: Provide 4-5 specific medications with brief usage context
- Diet: Provide 5-6 specific, actionable dietary recommendations with details
- Precautions: MUST start with "Immediate Remedies" followed by 4-5 immediate actions (e.g., apply warm compress, take regular breaks, perform stretches, adjust lighting, practice 20-20-20 rule), then monitoring advice and warning signs
- Recommendations: 4-5 sentences with comprehensive guidance, timeline, and encouragement
- Doctor Specialist: MUST specify exact specialist type (Cardiologist, Neurologist, Gastroenterologist, etc.) and brief reason
- Do's and Don'ts: Provide 3 specific do's and 3 specific don'ts in object format with arrays

EXAMPLE OF DETAILED CONVERSATIONAL TONE:
- Instead of: "You have gastroenteritis. Stay hydrated."
- Say: "Based on your symptoms, it sounds like you might be experiencing gastroenteritis, commonly known as the stomach flu. This happens when your stomach and intestines become inflamed, usually from a viral infection. The sharp pain you're feeling is your digestive system reacting to the inflammation, while the diarrhea is actually your body's protective mechanism trying to flush out the irritant. The good news is that most cases of viral gastroenteritis are self-limiting, meaning they typically resolve on their own within 24-72 hours as your immune system fights off the infection. While it's uncomfortable now, this is a very common condition that affects millions of people each year, and with proper hydration and rest, you should start feeling noticeably better within a few days."

IMPORTANT MEDICATION DISCLAIMER:
- ALWAYS emphasize that medications should NOT be taken without proper doctor consultation
- Make the disclaimer prominent and clear
- Explain that individual medical history matters

GLOBAL APPLICABILITY - CRITICAL:
- NEVER mention country-specific emergency numbers (like 911, 999, 112, etc.)
- Instead use: "call emergency services", "seek emergency medical attention immediately", "go to the nearest emergency department"
- NEVER say "call 911" or "dial 911"
- NEVER suggest driving yourself - say "do not drive yourself, call for emergency transport" or "have someone drive you"
- Use globally applicable medical advice

DOCTOR SPECIALIST SPECIFICATION:
- If doctor_visit is "yes", ALWAYS include the "doctor_specialist" field
- Specify the exact type of specialist (e.g., "Gastroenterologist for digestive issues", "Cardiologist for heart-related symptoms", "General Practitioner for initial evaluation")
- Briefly explain why this specialist is recommended

Extract source URLs from the tool results and include them in the sources field.

CRITICAL FORMATTING RULES:
- Each line must start with the correct keyword (Thought:, Action:, Action Input:, Observation:, Final Answer:)
- Never combine keywords on the same line (e.g., WRONG: "Thought:Action:", RIGHT: "Thought:" on one line, "Action:" on next line)
- Always put a space after the colon
- Final Answer must be ONLY the JSON object, nothing else

Begin!

Question: {input}
{agent_scratchpad}"""
        
        return PromptTemplate(
            template=template,
            input_variables=["input", "agent_scratchpad"],
            partial_variables={
                "tools": "\n".join([f"{tool.name}: {tool.description}" for tool in self.tools]),
                "tool_names": ", ".join([tool.name for tool in self.tools]),
            }
        )
    
    def analyze_symptoms(self, symptoms: str) -> Dict[str, Any]:
        """
        Analyze symptoms and return structured diagnosis.
        
        Args:
            symptoms: User's symptom description
            
        Returns:
            Dictionary with diagnosis, medications, diet, precautions, etc.
        """
        try:
            # Run the agent
            result = self.agent_executor.invoke({"input": symptoms})
            
            # Extract the output
            output = result.get("output", "")
            
            # Try to parse JSON from the output
            parsed_result = self._parse_output(output)
            
            return parsed_result
            
        except Exception as e:
            return {
                "error": str(e),
                "symptoms": symptoms,
                "diagnosis": ["Unable to process symptoms at this time.", "Please consult with a healthcare professional for proper evaluation."],
                "possible_conditions": [],
                "medications": [],
                "medication_disclaimer": "⚠️ IMPORTANT: Do not take any medications without proper consultation with a qualified healthcare professional.",
                "diet": [],
                "precautions": "Please consult with a healthcare professional immediately.",
                "doctor_visit": "yes",
                "doctor_specialist": "General Practitioner or Emergency Medicine Physician for immediate evaluation",
                "urgency": "soon",
                "severity": "unknown",
                "recommendations": "We recommend consulting with a healthcare professional for proper evaluation.",
                "when_to_seek_emergency": "Seek immediate medical attention for severe symptoms",
                "dos_donts": {"dos": ["Seek medical attention", "Monitor symptoms", "Stay calm"], "donts": ["Ignore symptoms", "Self-medicate", "Delay seeking help"]}
            }
    
    def _parse_output(self, output: str) -> Dict[str, Any]:
        """Parse the agent output into structured format."""
        try:
            # Extract sources from the entire agent output if present
            sources = []
            sources_match = re.search(r'\[SOURCES_START\](.*?)\[SOURCES_END\]', output, re.DOTALL)
            if sources_match:
                try:
                    sources_json = sources_match.group(1).strip()
                    sources = json.loads(sources_json)
                except:
                    pass
            
            # Try to find JSON in the output
            json_match = re.search(r'\{.*\}', output, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                parsed = json.loads(json_str)
                
                # Add sources if not already present
                if 'sources' not in parsed or not parsed['sources']:
                    parsed['sources'] = sources
                elif sources:
                    # Merge sources, avoiding duplicates
                    existing_urls = {s.get('url') for s in parsed.get('sources', [])}
                    for source in sources:
                        if source.get('url') not in existing_urls:
                            parsed['sources'].append(source)
                
                return parsed
            else:
                # If no JSON found, create structured response from text
                response = self._create_fallback_response(output)
                response['sources'] = sources
                return response
        except json.JSONDecodeError:
            response = self._create_fallback_response(output)
            response['sources'] = []
            return response
    
    def _create_fallback_response(self, text: str) -> Dict[str, Any]:
        """Create a fallback structured response from unstructured text."""
        return {
            "symptoms": "Various symptoms mentioned",
            "diagnosis": ["Requires professional evaluation", "Unable to provide detailed diagnosis"],
            "possible_conditions": ["Requires professional evaluation"],
            "medications": ["Consult doctor for appropriate medications"],
            "medication_disclaimer": "⚠️ IMPORTANT: Do not take any medications without proper consultation with a qualified healthcare professional. The medications listed are for informational purposes only.",
            "diet": ["Balanced diet", "Stay hydrated", "Adequate rest"],
            "precautions": "Monitor symptoms closely and consult healthcare provider as soon as possible.",
            "doctor_visit": "yes",
            "doctor_specialist": "General Practitioner for comprehensive evaluation",
            "urgency": "soon",
            "severity": "moderate",
            "recommendations": "Please consult with a healthcare professional for proper diagnosis and treatment.",
            "when_to_seek_emergency": "Severe pain, difficulty breathing, chest pain, or sudden changes in symptoms",
            "dos_donts": {"dos": ["Seek medical attention", "Monitor symptoms", "Stay hydrated"], "donts": ["Ignore symptoms", "Self-medicate", "Delay seeking help"]}
        }


# Create global agent instance
agent = SymptomCheckerAgent()
