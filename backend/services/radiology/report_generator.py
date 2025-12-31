"""
RadExtract-based Report Generation Service
Structured radiology report generation using NLP and template-based approaches
"""

import re
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

class ReportSection(Enum):
    CLINICAL_HISTORY = "clinical_history"
    TECHNIQUE = "technique"
    FINDINGS = "findings"
    IMPRESSION = "impression"
    RECOMMENDATIONS = "recommendations"

class Modality(Enum):
    CT = "CT"
    MRI = "MRI"
    XRAY = "X-ray"
    ULTRASOUND = "Ultrasound"
    MAMMOGRAPHY = "Mammography"
    PET = "PET"
    NUCLEAR = "Nuclear Medicine"

@dataclass
class Finding:
    """Structured finding with anatomical location and description"""
    location: str
    description: str
    severity: str  # Normal, Mild, Moderate, Severe
    confidence: float
    measurement: Optional[str] = None
    coordinates: Optional[List[float]] = None

@dataclass
class ReportTemplate:
    """Template structure for different report types"""
    name: str
    modality: Modality
    sections: List[ReportSection]
    required_fields: List[str]
    template_text: Dict[str, str]

class RadExtractProcessor:
    """
    RadExtract-inspired processor for structured report generation
    Based on Google's LangExtract methodology for radiology reports
    """
    
    def __init__(self):
        self.anatomical_regions = self._load_anatomical_regions()
        self.finding_patterns = self._load_finding_patterns()
        self.severity_keywords = self._load_severity_keywords()
        self.measurement_patterns = self._compile_measurement_patterns()
        
    def _load_anatomical_regions(self) -> Dict[str, List[str]]:
        """Load anatomical region mappings"""
        return {
            "brain": [
                "frontal lobe", "parietal lobe", "temporal lobe", "occipital lobe",
                "cerebellum", "brainstem", "corpus callosum", "ventricles",
                "basal ganglia", "thalamus", "hippocampus", "amygdala"
            ],
            "chest": [
                "lungs", "heart", "mediastinum", "pleura", "ribs", "sternum",
                "clavicles", "aorta", "pulmonary arteries", "bronchi"
            ],
            "abdomen": [
                "liver", "gallbladder", "pancreas", "spleen", "kidneys",
                "adrenals", "stomach", "small bowel", "colon", "appendix"
            ],
            "pelvis": [
                "bladder", "prostate", "uterus", "ovaries", "rectum",
                "sacrum", "iliac bones", "hip joints"
            ],
            "spine": [
                "cervical spine", "thoracic spine", "lumbar spine", "sacrum",
                "vertebral bodies", "intervertebral discs", "spinal cord"
            ]
        }
    
    def _load_finding_patterns(self) -> Dict[str, List[str]]:
        """Load common finding patterns for different pathologies"""
        return {
            "normal": [
                "normal", "unremarkable", "within normal limits", "no abnormality",
                "intact", "preserved", "appropriate", "expected"
            ],
            "abnormal": [
                "abnormal", "pathological", "concerning", "suspicious",
                "irregular", "asymmetric", "enlarged", "decreased"
            ],
            "lesion": [
                "lesion", "mass", "nodule", "opacity", "density",
                "enhancement", "signal", "attenuation"
            ],
            "inflammation": [
                "inflammation", "edema", "swelling", "fluid",
                "effusion", "consolidation", "infiltrate"
            ]
        }
    
    def _load_severity_keywords(self) -> Dict[str, List[str]]:
        """Load severity classification keywords"""
        return {
            "mild": ["mild", "minimal", "slight", "small", "trace"],
            "moderate": ["moderate", "moderate-sized", "intermediate"],
            "severe": ["severe", "marked", "extensive", "large", "significant"],
            "critical": ["critical", "massive", "life-threatening", "emergent"]
        }
    
    def _compile_measurement_patterns(self) -> List[re.Pattern]:
        """Compile regex patterns for measurement extraction"""
        patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:x\s*\d+(?:\.\d+)?)*\s*(mm|cm|m)',
            r'(\d+(?:\.\d+)?)\s*(ml|cc|l)',
            r'(\d+(?:\.\d+)?)\s*degrees?',
            r'(\d+(?:\.\d+)?)\s*%'
        ]
        return [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
    
    def extract_findings(self, text: str) -> List[Finding]:
        """Extract structured findings from free text"""
        findings = []
        sentences = self._split_sentences(text)
        
        for sentence in sentences:
            finding = self._process_sentence(sentence)
            if finding:
                findings.append(finding)
        
        return findings
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences for processing"""
        # Simple sentence splitting - in production, use more sophisticated NLP
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _process_sentence(self, sentence: str) -> Optional[Finding]:
        """Process individual sentence to extract finding"""
        # Find anatomical location
        location = self._extract_location(sentence)
        if not location:
            return None
        
        # Extract description
        description = sentence.strip()
        
        # Determine severity
        severity = self._classify_severity(sentence)
        
        # Extract measurements
        measurement = self._extract_measurements(sentence)
        
        # Calculate confidence (simplified)
        confidence = self._calculate_confidence(sentence)
        
        return Finding(
            location=location,
            description=description,
            severity=severity,
            confidence=confidence,
            measurement=measurement
        )
    
    def _extract_location(self, text: str) -> Optional[str]:
        """Extract anatomical location from text"""
        text_lower = text.lower()
        
        for region, locations in self.anatomical_regions.items():
            for location in locations:
                if location in text_lower:
                    return location
        
        return None
    
    def _classify_severity(self, text: str) -> str:
        """Classify severity of finding"""
        text_lower = text.lower()
        
        for severity, keywords in self.severity_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return severity.title()
        
        # Check for normal indicators
        for keyword in self.finding_patterns["normal"]:
            if keyword in text_lower:
                return "Normal"
        
        return "Mild"  # Default
    
    def _extract_measurements(self, text: str) -> Optional[str]:
        """Extract measurements from text"""
        for pattern in self.measurement_patterns:
            match = pattern.search(text)
            if match:
                return match.group(0)
        return None
    
    def _calculate_confidence(self, text: str) -> float:
        """Calculate confidence score for finding"""
        # Simplified confidence calculation
        confidence = 0.5
        
        # Increase confidence for specific measurements
        if any(pattern.search(text) for pattern in self.measurement_patterns):
            confidence += 0.2
        
        # Increase confidence for specific anatomical terms
        if any(location in text.lower() for locations in self.anatomical_regions.values() for location in locations):
            confidence += 0.2
        
        # Decrease confidence for uncertain language
        uncertain_words = ["possibly", "likely", "probably", "suggests", "may"]
        if any(word in text.lower() for word in uncertain_words):
            confidence -= 0.1
        
        return min(max(confidence, 0.0), 1.0)

class ReportGenerator:
    """Main report generation service"""
    
    def __init__(self):
        self.processor = RadExtractProcessor()
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, ReportTemplate]:
        """Load report templates for different modalities"""
        templates = {}
        
        # Brain MRI Template
        templates["brain_mri"] = ReportTemplate(
            name="Brain MRI Report",
            modality=Modality.MRI,
            sections=[
                ReportSection.CLINICAL_HISTORY,
                ReportSection.TECHNIQUE,
                ReportSection.FINDINGS,
                ReportSection.IMPRESSION,
                ReportSection.RECOMMENDATIONS
            ],
            required_fields=["patient_name", "patient_id", "study_date"],
            template_text={
                "technique": "Multiplanar, multisequence MRI of the brain was performed on a 3.0 Tesla scanner without and with intravenous gadolinium contrast.",
                "findings_header": "BRAIN: ",
                "impression_header": "IMPRESSION: "
            }
        )
        
        # Chest X-ray Template
        templates["chest_xray"] = ReportTemplate(
            name="Chest X-ray Report",
            modality=Modality.XRAY,
            sections=[
                ReportSection.CLINICAL_HISTORY,
                ReportSection.TECHNIQUE,
                ReportSection.FINDINGS,
                ReportSection.IMPRESSION
            ],
            required_fields=["patient_name", "patient_id", "study_date"],
            template_text={
                "technique": "Frontal and lateral chest radiographs were obtained.",
                "findings_header": "CHEST: ",
                "impression_header": "IMPRESSION: "
            }
        )
        
        # CT Abdomen Template
        templates["ct_abdomen"] = ReportTemplate(
            name="CT Abdomen Report",
            modality=Modality.CT,
            sections=[
                ReportSection.CLINICAL_HISTORY,
                ReportSection.TECHNIQUE,
                ReportSection.FINDINGS,
                ReportSection.IMPRESSION,
                ReportSection.RECOMMENDATIONS
            ],
            required_fields=["patient_name", "patient_id", "study_date"],
            template_text={
                "technique": "Axial CT images of the abdomen and pelvis were obtained with oral and intravenous contrast.",
                "findings_header": "ABDOMEN AND PELVIS: ",
                "impression_header": "IMPRESSION: "
            }
        )
        
        return templates
    
    def generate_report(
        self,
        template_name: str,
        patient_info: Dict[str, Any],
        findings_text: str,
        ai_analysis: Optional[Dict[str, Any]] = None,
        segmentation_results: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate structured radiology report"""
        
        template = self.templates.get(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        # Extract structured findings
        structured_findings = self.processor.extract_findings(findings_text)
        
        # Generate report sections
        report_sections = {}
        
        # Clinical History
        if ReportSection.CLINICAL_HISTORY in template.sections:
            report_sections["clinical_history"] = self._generate_clinical_history(patient_info)
        
        # Technique
        if ReportSection.TECHNIQUE in template.sections:
            report_sections["technique"] = template.template_text.get("technique", "")
        
        # Findings
        if ReportSection.FINDINGS in template.sections:
            report_sections["findings"] = self._generate_findings_section(
                structured_findings, template, ai_analysis, segmentation_results
            )
        
        # Impression
        if ReportSection.IMPRESSION in template.sections:
            report_sections["impression"] = self._generate_impression(
                structured_findings, ai_analysis
            )
        
        # Recommendations
        if ReportSection.RECOMMENDATIONS in template.sections:
            report_sections["recommendations"] = self._generate_recommendations(
                structured_findings, ai_analysis
            )
        
        # Generate metadata
        metadata = {
            "report_id": f"RPT_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "template_used": template_name,
            "generated_at": datetime.now().isoformat(),
            "patient_info": patient_info,
            "structured_findings_count": len(structured_findings),
            "ai_assisted": ai_analysis is not None,
            "segmentation_assisted": segmentation_results is not None
        }
        
        return {
            "report_id": metadata["report_id"],
            "template_name": template.name,
            "sections": report_sections,
            "structured_findings": [
                {
                    "location": f.location,
                    "description": f.description,
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "measurement": f.measurement
                }
                for f in structured_findings
            ],
            "metadata": metadata,
            "formatted_report": self._format_report(report_sections, template, patient_info)
        }
    
    def _generate_clinical_history(self, patient_info: Dict[str, Any]) -> str:
        """Generate clinical history section"""
        age = patient_info.get("age", "Unknown")
        gender = patient_info.get("gender", "Unknown")
        diagnosis = patient_info.get("diagnosis", "Clinical correlation requested")
        
        return f"{age}-year-old {gender.lower()} with {diagnosis}."
    
    def _generate_findings_section(
        self,
        findings: List[Finding],
        template: ReportTemplate,
        ai_analysis: Optional[Dict[str, Any]],
        segmentation_results: Optional[Dict[str, Any]]
    ) -> str:
        """Generate findings section with AI integration"""
        
        findings_text = template.template_text.get("findings_header", "FINDINGS: ")
        
        # Group findings by anatomical region
        findings_by_region = {}
        for finding in findings:
            region = self._get_anatomical_region(finding.location)
            if region not in findings_by_region:
                findings_by_region[region] = []
            findings_by_region[region].append(finding)
        
        # Generate findings text
        for region, region_findings in findings_by_region.items():
            findings_text += f"\n\n{region.upper()}: "
            
            for i, finding in enumerate(region_findings):
                if i > 0:
                    findings_text += " "
                
                findings_text += f"{finding.description}"
                
                if finding.measurement:
                    findings_text += f" measuring {finding.measurement}"
                
                findings_text += "."
        
        # Add AI analysis if available
        if ai_analysis and ai_analysis.get("findings"):
            findings_text += "\n\nAI-ASSISTED ANALYSIS: "
            for ai_finding in ai_analysis["findings"]:
                findings_text += f"{ai_finding.get('region', 'Unknown region')}: {ai_finding.get('finding', 'No description')} "
                findings_text += f"(Confidence: {ai_finding.get('confidence', 0):.0f}%). "
        
        # Add segmentation results if available
        if segmentation_results and segmentation_results.get("results"):
            findings_text += "\n\nQUANTITATIVE ANALYSIS: "
            for seg_result in segmentation_results["results"]:
                findings_text += f"{seg_result.get('class', 'Unknown')}: {seg_result.get('volume', 'Unknown volume')}. "
        
        return findings_text
    
    def _generate_impression(
        self,
        findings: List[Finding],
        ai_analysis: Optional[Dict[str, Any]]
    ) -> str:
        """Generate impression section"""
        
        # Classify findings by severity
        severe_findings = [f for f in findings if f.severity in ["Severe", "Critical"]]
        abnormal_findings = [f for f in findings if f.severity not in ["Normal", "Mild"]]
        
        impression = ""
        
        if severe_findings:
            impression += "Significant abnormalities identified: "
            for finding in severe_findings:
                impression += f"{finding.location} shows {finding.description.lower()}. "
        elif abnormal_findings:
            impression += "Mild to moderate abnormalities noted: "
            for finding in abnormal_findings[:3]:  # Limit to top 3
                impression += f"{finding.location} demonstrates {finding.description.lower()}. "
        else:
            impression += "No significant abnormalities detected. "
        
        # Add AI confidence if available
        if ai_analysis and ai_analysis.get("confidence_scores", {}).get("overall"):
            confidence = ai_analysis["confidence_scores"]["overall"]
            impression += f"AI analysis confidence: {confidence:.1f}%. "
        
        impression += "Clinical correlation recommended."
        
        return impression
    
    def _generate_recommendations(
        self,
        findings: List[Finding],
        ai_analysis: Optional[Dict[str, Any]]
    ) -> str:
        """Generate recommendations section"""
        
        recommendations = []
        
        # Check for severe findings
        severe_findings = [f for f in findings if f.severity in ["Severe", "Critical"]]
        if severe_findings:
            recommendations.append("Urgent clinical correlation recommended.")
            recommendations.append("Consider immediate specialist consultation.")
        
        # Check for follow-up needs
        moderate_findings = [f for f in findings if f.severity == "Moderate"]
        if moderate_findings:
            recommendations.append("Follow-up imaging in 3-6 months to assess progression.")
        
        # AI-based recommendations
        if ai_analysis and ai_analysis.get("reasoning_trace"):
            if "follow-up" in ai_analysis["reasoning_trace"].lower():
                recommendations.append("AI analysis suggests follow-up imaging.")
        
        # Default recommendation
        if not recommendations:
            recommendations.append("Routine clinical follow-up as clinically indicated.")
        
        return " ".join(recommendations)
    
    def _get_anatomical_region(self, location: str) -> str:
        """Map specific location to broader anatomical region"""
        location_lower = location.lower()
        
        for region, locations in self.processor.anatomical_regions.items():
            if any(loc in location_lower for loc in locations):
                return region.title()
        
        return "Other"
    
    def _format_report(
        self,
        sections: Dict[str, str],
        template: ReportTemplate,
        patient_info: Dict[str, Any]
    ) -> str:
        """Format complete report as text"""
        
        formatted_report = f"""
RADIOLOGY REPORT

Patient: {patient_info.get('name', 'Unknown')}
ID: {patient_info.get('id', 'Unknown')}
DOB: {patient_info.get('date_of_birth', 'Unknown')}
Study Date: {patient_info.get('study_date', datetime.now().strftime('%Y-%m-%d'))}
Modality: {template.modality.value}

"""
        
        # Add sections in order
        for section in template.sections:
            section_name = section.value.replace('_', ' ').title()
            section_content = sections.get(section.value, "")
            
            if section_content:
                formatted_report += f"{section_name.upper()}:\n{section_content}\n\n"
        
        formatted_report += f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        formatted_report += "AI-assisted structured reporting system\n"
        
        return formatted_report
    
    def get_available_templates(self) -> List[Dict[str, Any]]:
        """Get list of available report templates"""
        return [
            {
                "id": template_id,
                "name": template.name,
                "modality": template.modality.value,
                "sections": [s.value for s in template.sections],
                "required_fields": template.required_fields
            }
            for template_id, template in self.templates.items()
        ]
    
    def validate_report_data(self, template_name: str, data: Dict[str, Any]) -> List[str]:
        """Validate report data against template requirements"""
        template = self.templates.get(template_name)
        if not template:
            return [f"Template '{template_name}' not found"]
        
        errors = []
        
        # Check required fields
        for field in template.required_fields:
            if field not in data or not data[field]:
                errors.append(f"Required field '{field}' is missing or empty")
        
        return errors

# Export the main service
report_generator = ReportGenerator()