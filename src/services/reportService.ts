// Report generation service for MedSense
import { apiService } from './api';

export interface ReportTemplate {
  id: string;
  name: string;
  modality: string;
  sections: string[];
  required_fields: string[];
}

export interface PatientInfo {
  name: string;
  id: string;
  age: number;
  gender: string;
  date_of_birth?: string;
  study_date: string;
  mrn?: string;
}

export interface StructuredFinding {
  location: string;
  description: string;
  severity: string;
  confidence: number;
  measurement?: string;
}

export interface GeneratedReport {
  report_id: string;
  template_name: string;
  sections: {
    clinical_history?: string;
    technique?: string;
    findings?: string;
    impression?: string;
    recommendations?: string;
  };
  structured_findings: StructuredFinding[];
  metadata: {
    generated_at: string;
    patient_info: PatientInfo;
    ai_assisted: boolean;
    segmentation_assisted: boolean;
  };
  formatted_report: string;
}

export interface ReportGenerationRequest {
  template_name: string;
  patient_info: PatientInfo;
  findings_text: string;
  study_id?: string;
  ai_analysis?: {
    findings: Array<{
      region: string;
      finding: string;
      confidence: number;
      severity: string;
    }>;
    confidence_scores: {
      overall: number;
    };
    reasoning_trace: string;
  };
  segmentation_results?: {
    results: Array<{
      class: string;
      volume: string;
      color: string;
    }>;
    accuracy: number;
    total_volume: string;
  };
}

class ReportService {
  private baseUrl = '/api/reports';

  async getTemplates(): Promise<ReportTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        headers: apiService.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.templates;
    } catch (error) {
      console.error('Failed to fetch report templates:', error);
      throw error;
    }
  }

  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: apiService.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  async getReport(reportId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${reportId}`, {
        headers: apiService.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.report;
    } catch (error) {
      console.error('Failed to fetch report:', error);
      throw error;
    }
  }

  async updateReport(reportId: string, updates: Partial<GeneratedReport['sections']>): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${reportId}`, {
        method: 'PUT',
        headers: apiService.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.report;
    } catch (error) {
      console.error('Failed to update report:', error);
      throw error;
    }
  }

  async finalizeReport(reportId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${reportId}/finalize`, {
        method: 'POST',
        headers: apiService.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.report;
    } catch (error) {
      console.error('Failed to finalize report:', error);
      throw error;
    }
  }

  async exportReportPDF(reportId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${reportId}/export/pdf`, {
        headers: apiService.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to export report as PDF:', error);
      throw error;
    }
  }

  async exportReportJSON(reportId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${reportId}/export/json`, {
        headers: apiService.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to export report as JSON:', error);
      throw error;
    }
  }

  async listReports(filters?: {
    status?: string;
    patient_id?: string;
    study_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    reports: any[];
    total_count: number;
    limit: number;
    offset: number;
  }> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/list?${params}`, {
        headers: apiService.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        reports: data.reports,
        total_count: data.total_count,
        limit: data.limit,
        offset: data.offset,
      };
    } catch (error) {
      console.error('Failed to list reports:', error);
      throw error;
    }
  }

  // Helper method to create a report from analysis results
  createReportFromAnalysis(
    templateName: string,
    patientInfo: PatientInfo,
    vlmResults?: any,
    segmentationResults?: any
  ): ReportGenerationRequest {
    // Generate findings text from VLM results
    let findingsText = '';

    if (vlmResults?.findings) {
      findingsText = vlmResults.findings
        .map((finding: any) => `${finding.region}: ${finding.finding}`)
        .join('. ') + '.';
    }

    if (!findingsText) {
      findingsText = 'No significant abnormalities detected on initial review.';
    }

    return {
      template_name: templateName,
      patient_info: patientInfo,
      findings_text: findingsText,
      ai_analysis: vlmResults ? {
        findings: vlmResults.findings || [],
        confidence_scores: vlmResults.confidence_scores || { overall: 0 },
        reasoning_trace: vlmResults.reasoning_trace || ''
      } : undefined,
      segmentation_results: segmentationResults
    };
  }

  // Helper method to format findings for display
  formatFindingsForDisplay(findings: StructuredFinding[]): string {
    if (!findings || findings.length === 0) {
      return 'No structured findings available.';
    }

    return findings
      .map(finding => {
        let text = `${finding.location}: ${finding.description}`;
        if (finding.measurement) {
          text += ` (${finding.measurement})`;
        }
        text += ` [${finding.severity}, ${Math.round(finding.confidence * 100)}% confidence]`;
        return text;
      })
      .join('\n');
  }

  // Helper method to get severity color
  getSeverityColor(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-500 bg-red-900/20 border-red-700/50';
      case 'severe':
        return 'text-red-400 bg-red-900/20 border-red-700/50';
      case 'moderate':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
      case 'mild':
        return 'text-blue-400 bg-blue-900/20 border-blue-700/50';
      case 'normal':
        return 'text-green-400 bg-green-900/20 border-green-700/50';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700/50';
    }
  }
}

export const reportService = new ReportService();
export default reportService;