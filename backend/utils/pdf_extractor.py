"""Utility for extracting text from PDF medical reports."""
import PyPDF2
from typing import Optional
import io


def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    """
    Extract all text from a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Extracted text or None if extraction failed
    """
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            text = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n\n"
            
            return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Optional[str]:
    """
    Extract all text from PDF bytes.
    
    Args:
        pdf_bytes: PDF file as bytes
        
    Returns:
        Extracted text or None if extraction failed
    """
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text() + "\n\n"
        
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF bytes: {e}")
        return None
