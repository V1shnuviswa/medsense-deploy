import { useState } from 'react';
import { medicalViewerService } from '../services/medicalViewerService';
import type { ImageData } from './useImageData';
import type { AnalysisResults } from './useAIAnalysis';

export interface ReportData {
    patientName: string;
    patientID: string;
    patientDOB: string;
    studyDate: string;
    referringPhysician: string;
    indication: string;
    findings: string;
    impression: string;
    recommendations: string;
}

export function useReport() {
    const [reportData, setReportData] = useState<ReportData>({
        patientName: 'John Doe',
        patientID: 'P123456',
        patientDOB: '1975-06-15',
        studyDate: new Date().toISOString().split('T')[0],
        referringPhysician: 'Dr. Sarah Johnson',
        indication: '',
        findings: '',
        impression: '',
        recommendations: ''
    });

    const [showReportPanel, setShowReportPanel] = useState(false);

    const generateReport = (
        analysisResults: AnalysisResults | null,
        imageData: ImageData | null
    ) => {
        if (!analysisResults || !imageData) return;

        const findings = `${imageData.modality} examination of the brain demonstrates:\n\n1. TECHNIQUE: ${imageData.seriesDescription}\n   - Image matrix: ${imageData.dimensions.x} × ${imageData.dimensions.y} × ${imageData.dimensions.z}\n   - Slice thickness: ${imageData.spacing.z.toFixed(2)} mm\n\n2. FINDINGS:\n   ${analysisResults.predictions ?
            analysisResults.predictions.slice(0, 3).map((pred: any, i: number) =>
                `- ${pred.class.replace('_', ' ')}: ${(pred.confidence * 100).toFixed(1)}% confidence`
            ).join('\n   ') : ''}
   ${analysisResults.segmented_regions ?
                analysisResults.segmented_regions.map((region: any, i: number) =>
                    `- ${region.label.replace('_', ' ')}: ${region.volume_mm3.toFixed(1)} mm³`
                ).join('\n   ') : ''}
   ${analysisResults.detections ?
                analysisResults.detections.map((det: any, i: number) =>
                    `- ${det.class} detected at (${det.location.join(', ')}), size: ${det.size_mm} mm, confidence: ${(det.confidence * 100).toFixed(1)}%`
                ).join('\n   ') : ''}`;

        const impression = `AI-assisted analysis using ${analysisResults.model} suggests:\n\n${analysisResults.predictions ?
            `Primary finding: ${analysisResults.predictions[0].class.replace('_', ' ')} with ${(analysisResults.predictions[0].confidence * 100).toFixed(1)}% confidence.` :
            analysisResults.detections ?
                `${analysisResults.detections.length} regions of interest detected requiring clinical correlation.` :
                'Automated segmentation completed. Please review results.'
            }\n\nCorrelation with clinical history and prior imaging is recommended.`;

        setReportData(prev => ({
            ...prev,
            findings: findings,
            impression: impression,
            recommendations: 'Follow-up imaging in 3-6 months.\nClinical correlation recommended.\nConsider additional contrast-enhanced sequences if clinically indicated.'
        }));

        setShowReportPanel(true);
    };

    const exportReport = async (
        currentStudyId: string | null,
        imageData: ImageData | null,
        analysisResults: AnalysisResults | null,
        selectedModality: string
    ) => {
        if (!currentStudyId) {
            // Fallback to local export if no backend connection
            exportReportLocal(imageData, analysisResults, selectedModality, currentStudyId);
            return;
        }

        try {
            // Create report in backend
            const reportResponse = await medicalViewerService.createReport({
                study_id: currentStudyId,
                template_name: `${selectedModality.toLowerCase()}_report`,
                impression: reportData.impression,
                findings: reportData.findings,
                recommendations: reportData.recommendations,
                technique: `${selectedModality} examination performed using ${imageData?.seriesDescription || 'standard protocol'}`
            });

            if (reportResponse.report_id) {
                alert(`Report created successfully! Report ID: ${reportResponse.report_id}`);
                // Also export locally for immediate download
                exportReportLocal(imageData, analysisResults, selectedModality, currentStudyId);
            }
        } catch (error) {
            console.error('Backend report creation failed:', error);
            alert('Backend report creation failed, exporting locally instead');
            exportReportLocal(imageData, analysisResults, selectedModality, currentStudyId);
        }
    };

    const exportReportLocal = (
        imageData: ImageData | null,
        analysisResults: AnalysisResults | null,
        selectedModality: string,
        currentStudyId: string | null
    ) => {
        const reportText = `
RADIOLOGY REPORT
================

PATIENT INFORMATION
-------------------
Name: ${reportData.patientName}
ID: ${reportData.patientID}
DOB: ${reportData.patientDOB}
Study Date: ${reportData.studyDate}
Referring Physician: ${reportData.referringPhysician}
${currentStudyId ? `Study ID: ${currentStudyId}` : ''}

EXAMINATION: ${imageData?.modality || 'Medical Imaging'} - ${imageData?.seriesDescription || 'Unknown Series'}

CLINICAL INDICATION
-------------------
${reportData.indication || 'Not specified'}

FINDINGS
--------
${reportData.findings || 'No findings documented'}

IMPRESSION
----------
${reportData.impression || 'No impression documented'}

RECOMMENDATIONS
---------------
${reportData.recommendations || 'No recommendations documented'}

---
Report generated by ITK-SNAP Viewer with AI Analysis
Generated: ${new Date().toLocaleString()}
AI Model: ${analysisResults?.model || 'N/A'}
Modality: ${selectedModality}
${analysisResults?.backend_analysis_id ? `Backend Analysis ID: ${analysisResults.backend_analysis_id}` : ''}
`;

        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `radiology_report_${reportData.patientID}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return {
        reportData,
        showReportPanel,
        setReportData,
        setShowReportPanel,
        generateReport,
        exportReport
    };
}
