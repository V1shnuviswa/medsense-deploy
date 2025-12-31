"""Medical Report Analysis Agent using LangChain."""
import os
from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
import json


class MedicalReportAgent:
    """Agentic system for analyzing medical reports."""
    
    def __init__(self, api_key: str, base_url: str, model: str = "moonshotai/kimi-k2-instruct"):
        """Initialize the medical report agent."""
        self.llm = ChatOpenAI(
            api_key=api_key,
            base_url=base_url,
            model=model,
            temperature=0.0
        )
        # Use HuggingFace embeddings (works locally without API keys)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
    def analyze_report(self, report_text: str) -> Dict[str, Any]:
        """
        Analyze a medical report and extract biomarkers, recommendations, etc.
        
        Args:
            report_text: The raw text extracted from the medical report
            
        Returns:
            Dictionary containing analysis results
        """
        
        analysis_prompt = f"""You are an expert medical analyst. Analyze the following medical report and extract ONLY abnormal biomarkers.

MEDICAL REPORT:
{report_text}

Provide your analysis in the following JSON format:
{{
    "summary": "A detailed 2-3 paragraph summary explaining what this report shows in simple, patient-friendly language",
    "biomarkers_high": [
        {{"name": "Biomarker name", "value": "X mg/dL", "normal_range": "Y-Z mg/dL", "explanation": "What this means and why it's concerning"}},
        ...
    ],
    "biomarkers_low": [
        {{"name": "Biomarker name", "value": "X mg/dL", "normal_range": "Y-Z mg/dL", "explanation": "What this means and why it's concerning"}},
        ...
    ],
    "biomarkers_borderline": [
        {{"name": "Biomarker name", "value": "X mg/dL", "normal_range": "Y-Z mg/dL", "explanation": "What this means and why it needs monitoring"}},
        ...
    ],
    "precautions": [
        "Specific precaution 1",
        "Specific precaution 2",
        ...
    ],
    "recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2",
        ...
    ],
    "daily_routine": [
        "Morning: Specific activity/medication",
        "Afternoon: Specific activity/medication",
        "Evening: Specific activity/medication",
        "Before bed: Specific activity/medication"
    ],
    "complete_analysis": "A very detailed, comprehensive explanation of all abnormal findings, what they mean, and what actions should be taken. Include specific medical details."
}}

IMPORTANT INSTRUCTIONS:
1. Extract ONLY abnormal biomarkers (High, Low, or Borderline) - DO NOT include normal values
2. Categorize each abnormal biomarker accurately as high, low, or borderline
3. For each abnormal value, provide clear explanation of why it's concerning
4. Give specific, actionable recommendations for the abnormal values
5. Include a detailed daily healthcare routine to address the issues
6. Make the complete_analysis comprehensive and educational about the abnormal findings
7. Include units for all numerical values
8. Return ONLY valid JSON, no additional text"""

        try:
            response = self.llm.invoke([HumanMessage(content=analysis_prompt)])
            
            # Parse the JSON response
            content = response.content.strip()
            
            # Clean up the response to extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            analysis = json.loads(content)
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response content: {content}")
            # Return a structured error response
            return {
                "summary": "Error analyzing report. Please try again.",
                "biomarkers_high": [],
                "biomarkers_low": [],
                "biomarkers_borderline": [],
                "precautions": ["Please consult with your healthcare provider"],
                "recommendations": ["Report analysis failed. Please contact support."],
                "daily_routine": [],
                "complete_analysis": f"Analysis error: {str(e)}"
            }
        except Exception as e:
            print(f"Analysis error: {e}")
            return {
                "summary": "Error analyzing report. Please try again.",
                "biomarkers_high": [],
                "biomarkers_low": [],
                "biomarkers_borderline": [],
                "precautions": ["Please consult with your healthcare provider"],
                "recommendations": ["Report analysis failed. Please contact support."],
                "daily_routine": [],
                "complete_analysis": f"Analysis error: {str(e)}"
            }


class ReportChatAgent:
    """Agentic chatbot for answering questions about medical reports."""
    
    def __init__(self, api_key: str, base_url: str, model: str = "moonshotai/kimi-k2-instruct"):
        """Initialize the report chat agent."""
        self.llm = ChatOpenAI(
            api_key=api_key,
            base_url=base_url,
            model=model,
            temperature=0.3
        )
        # Use HuggingFace embeddings (works locally without API keys)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        self.vector_stores = {}  # Cache vector stores by report ID
        
    def create_vector_store(self, report_id: str, report_text: str, analysis: Dict[str, Any]) -> str:
        """
        Create a vector store for a medical report.
        
        Args:
            report_id: Unique identifier for the report
            analysis: The analysis results
            report_text: The raw report text
            
        Returns:
            Collection ID
        """
        # Combine report text and analysis for better context
        combined_text = f"""MEDICAL REPORT:
{report_text}

ANALYSIS SUMMARY:
{analysis.get('summary', '')}

COMPLETE ANALYSIS:
{analysis.get('complete_analysis', '')}

HIGH BIOMARKERS:
{json.dumps(analysis.get('biomarkers_high', []), indent=2)}

LOW BIOMARKERS:
{json.dumps(analysis.get('biomarkers_low', []), indent=2)}

BORDERLINE BIOMARKERS:
{json.dumps(analysis.get('biomarkers_borderline', []), indent=2)}

PRECAUTIONS:
{json.dumps(analysis.get('precautions', []), indent=2)}

RECOMMENDATIONS:
{json.dumps(analysis.get('recommendations', []), indent=2)}

DAILY ROUTINE:
{json.dumps(analysis.get('daily_routine', []), indent=2)}
"""
        
        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_text(combined_text)
        
        # Create vector store
        collection_name = f"report_{report_id}"
        chroma_path = os.getenv("CHROMA_DB_PATH", "./chroma_db")
        vector_store = Chroma.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            collection_name=collection_name,
            persist_directory=chroma_path
        )
        
        self.vector_stores[report_id] = vector_store
        return collection_name
        
    def chat(self, report_id: str, question: str, report_text: str, analysis: Dict[str, Any], chat_history: List[Dict] = None) -> str:
        """
        Answer a question about the medical report.
        
        Args:
            report_id: Report identifier
            question: User's question
            report_text: Raw report text
            analysis: Analysis results
            chat_history: Previous chat messages
            
        Returns:
            Answer to the question
        """
        # Get or create vector store
        if report_id not in self.vector_stores:
            collection_name = f"report_{report_id}"
            chroma_path = os.getenv("CHROMA_DB_PATH", "./chroma_db")
            try:
                vector_store = Chroma(
                    collection_name=collection_name,
                    embedding_function=self.embeddings,
                    persist_directory=chroma_path
                )
                self.vector_stores[report_id] = vector_store
            except:
                self.create_vector_store(report_id, report_text, analysis)
                vector_store = self.vector_stores[report_id]
        else:
            vector_store = self.vector_stores[report_id]
        
        # Retrieve relevant context
        docs = vector_store.similarity_search(question, k=3)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # Build chat history context
        history_text = ""
        if chat_history:
            for msg in chat_history[-5:]:  # Last 5 messages
                history_text += f"{msg['role'].upper()}: {msg['content']}\n"
        
        # Create prompt
        prompt = f"""You are a helpful medical assistant helping a patient understand their medical report. 
Answer the patient's question based on the report context provided. Be clear, compassionate, and educational.

REPORT CONTEXT:
{context}

CHAT HISTORY:
{history_text}

PATIENT QUESTION: {question}

Provide a clear, detailed answer that:
1. Directly answers the question
2. Uses simple language the patient can understand
3. Includes specific values and ranges from their report when relevant
4. Provides actionable advice when appropriate
5. Encourages consulting with their healthcare provider for serious concerns

Answer:"""

        try:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            print(f"Chat error: {e}")
            return "I apologize, but I encountered an error processing your question. Please try rephrasing it or contact support if the issue persists."
