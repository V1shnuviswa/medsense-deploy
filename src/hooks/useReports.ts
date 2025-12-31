import { useState, useEffect, useCallback } from 'react';
import { reportService, ReportTemplate, GeneratedReport, ReportGenerationRequest } from '../services/reportService';

// Hook for managing report templates
export function useReportTemplates() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const templatesData = await reportService.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refetch: fetchTemplates };
}

// Hook for report generation
export function useReportGeneration() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);

  const generateReport = useCallback(async (request: ReportGenerationRequest) => {
    try {
      setGenerating(true);
      setError(null);
      const report = await reportService.generateReport(request);
      setGeneratedReport(report);
      return report;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setGenerating(false);
    }
  }, []);

  const clearReport = useCallback(() => {
    setGeneratedReport(null);
    setError(null);
  }, []);

  return {
    generateReport,
    generating,
    error,
    generatedReport,
    clearReport
  };
}

// Hook for managing a single report
export function useReport(reportId: string | null) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      setError(null);
      const reportData = await reportService.getReport(reportId);
      setReport(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  const updateReport = useCallback(async (updates: any) => {
    if (!reportId) return;

    try {
      setUpdating(true);
      setError(null);
      const updatedReport = await reportService.updateReport(reportId, updates);
      setReport(updatedReport);
      return updatedReport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, [reportId]);

  const finalizeReport = useCallback(async () => {
    if (!reportId) return;

    try {
      setUpdating(true);
      setError(null);
      const finalizedReport = await reportService.finalizeReport(reportId);
      setReport(finalizedReport);
      return finalizedReport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    report,
    loading,
    error,
    updating,
    updateReport,
    finalizeReport,
    refetch: fetchReport
  };
}

// Hook for report export functionality
export function useReportExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(async (reportId: string, filename?: string) => {
    try {
      setExporting(true);
      setError(null);
      const blob = await reportService.exportReportPDF(reportId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setExporting(false);
    }
  }, []);

  const exportJSON = useCallback(async (reportId: string, filename?: string) => {
    try {
      setExporting(true);
      setError(null);
      const blob = await reportService.exportReportJSON(reportId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `report_${reportId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export JSON';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exportPDF,
    exportJSON,
    exporting,
    error
  };
}

// Hook for listing reports
export function useReportsList(filters?: {
  status?: string;
  patient_id?: string;
  study_id?: string;
  limit?: number;
  offset?: number;
}) {
  const [reports, setReports] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.listReports(filters);
      setReports(data.reports);
      setTotalCount(data.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    totalCount,
    loading,
    error,
    refetch: fetchReports
  };
}