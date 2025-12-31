from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum

from .imaging import BaseResponse, ModalityType, ModelType, ProcessingStatus

# Analysis-specific Enums
class AnalysisType(str, Enum):
    STATISTICAL = "statistical"
    COMPARATIVE = "comparative"
    TEMPORAL = "temporal"
    COHORT = "cohort"
    PERFORMANCE = "performance"

class MetricType(str, Enum):
    ACCURACY = "accuracy"
    SENSITIVITY = "sensitivity"
    SPECIFICITY = "specificity"
    PRECISION = "precision"
    RECALL = "recall"
    F1_SCORE = "f1_score"
    AUC = "auc"
    DICE_COEFFICIENT = "dice_coefficient"
    JACCARD_INDEX = "jaccard_index"
    MEAN_IOU = "mean_iou"

class ComparisonOperator(str, Enum):
    GREATER_THAN = "gt"
    LESS_THAN = "lt"
    EQUAL = "eq"
    BETWEEN = "between"

# Performance Analysis Schemas
class ModelPerformanceMetric(BaseModel):
    """Individual performance metric"""
    metric_type: MetricType
    value: float = Field(..., ge=0.0, le=1.0)
    confidence_interval: Optional[tuple[float, float]] = None
    sample_size: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ModelPerformanceAnalysis(BaseModel):
    """Model performance analysis result"""
    model_id: str
    modality: ModalityType
    model_type: ModelType
    metrics: List[ModelPerformanceMetric]
    test_dataset_info: Dict[str, Any]
    analysis_date: datetime = Field(default_factory=datetime.now)
    recommendations: List[str] = Field(default_factory=list)

class PerformanceComparisonRequest(BaseModel):
    """Request for model performance comparison"""
    model_ids: List[str] = Field(..., min_items=2, max_items=10)
    modality: ModalityType
    metrics: List[MetricType]
    dataset_filter: Optional[Dict[str, Any]] = None
    significance_threshold: float = Field(0.05, ge=0.001, le=0.1)

class ModelComparison(BaseModel):
    """Model comparison result"""
    model_a: str
    model_b: str
    metric_type: MetricType
    value_a: float
    value_b: float
    difference: float
    p_value: Optional[float] = None
    significant: bool = False
    winner: Optional[str] = None

class PerformanceComparisonResponse(BaseResponse):
    """Performance comparison response"""
    comparison_id: str
    models_compared: List[str]
    modality: ModalityType
    comparisons: List[ModelComparison]
    statistical_summary: Dict[str, Any]
    recommendations: List[str]

# Statistical Analysis Schemas
class StatisticalTest(str, Enum):
    T_TEST = "t_test"
    WILCOXON = "wilcoxon"
    MANN_WHITNEY = "mann_whitney"
    CHI_SQUARE = "chi_square"
    FISHER_EXACT = "fisher_exact"
    ANOVA = "anova"
    KRUSKAL_WALLIS = "kruskal_wallis"

class StatisticalAnalysisRequest(BaseModel):
    """Statistical analysis request"""
    analysis_type: AnalysisType
    job_ids: List[str] = Field(..., min_items=1)
    statistical_tests: List[StatisticalTest]
    grouping_variables: Optional[List[str]] = None
    confidence_level: float = Field(0.95, ge=0.8, le=0.99)
    
    @validator('confidence_level')
    def validate_confidence_level(cls, v):
        if not 0.8 <= v <= 0.99:
            raise ValueError('Confidence level must be between 0.8 and 0.99')
        return v

class StatisticalResult(BaseModel):
    """Statistical test result"""
    test_type: StatisticalTest
    test_statistic: float
    p_value: float
    confidence_interval: Optional[tuple[float, float]] = None
    effect_size: Optional[float] = None
    interpretation: str
    significant: bool

class StatisticalAnalysisResponse(BaseResponse):
    """Statistical analysis response"""
    analysis_id: str
    analysis_type: AnalysisType
    sample_size: int
    tests_performed: List[StatisticalResult]
    descriptive_statistics: Dict[str, Any]
    visualizations: Optional[List[str]] = None
    conclusions: List[str]

# Cohort Analysis Schemas
class CohortDefinition(BaseModel):
    """Cohort definition criteria"""
    name: str
    inclusion_criteria: Dict[str, Any]
    exclusion_criteria: Optional[Dict[str, Any]] = None
    minimum_size: int = Field(10, ge=1)
    
class CohortAnalysisRequest(BaseModel):
    """Cohort analysis request"""
    cohorts: List[CohortDefinition] = Field(..., min_items=1, max_items=5)
    outcome_variables: List[str]
    time_period: Optional[tuple[datetime, datetime]] = None
    adjustment_variables: Optional[List[str]] = None

class CohortMetrics(BaseModel):
    """Cohort-specific metrics"""
    cohort_name: str
    sample_size: int
    demographics: Dict[str, Any]
    outcome_metrics: Dict[str, float]
    confidence_intervals: Dict[str, tuple[float, float]]

class CohortAnalysisResponse(BaseResponse):
    """Cohort analysis response"""
    analysis_id: str
    cohorts_analyzed: List[CohortMetrics]
    comparative_analysis: Dict[str, Any]
    survival_analysis: Optional[Dict[str, Any]] = None
    recommendations: List[str]

# Temporal Analysis Schemas
class TimePoint(BaseModel):
    """Time point for temporal analysis"""
    timestamp: datetime
    measurements: Dict[str, float]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class TemporalTrend(BaseModel):
    """Temporal trend analysis result"""
    variable: str
    trend_direction: str  # "increasing", "decreasing", "stable", "cyclical"
    slope: Optional[float] = None
    r_squared: Optional[float] = None
    seasonal_component: Optional[bool] = None
    change_points: Optional[List[datetime]] = None

class TemporalAnalysisRequest(BaseModel):
    """Temporal analysis request"""
    job_ids: List[str] = Field(..., min_items=3)  # Need multiple time points
    variables_to_analyze: List[str]
    time_window: Optional[tuple[datetime, datetime]] = None
    detect_change_points: bool = True
    seasonal_analysis: bool = False

class TemporalAnalysisResponse(BaseResponse):
    """Temporal analysis response"""
    analysis_id: str
    time_range: tuple[datetime, datetime]
    trends_detected: List[TemporalTrend]
    seasonality_analysis: Optional[Dict[str, Any]] = None
    forecasting: Optional[Dict[str, Any]] = None
    anomalies_detected: List[Dict[str, Any]] = Field(default_factory=list)

# Quality Assurance Schemas
class QualityMetric(BaseModel):
    """Quality assessment metric"""
    metric_name: str
    metric_value: float
    threshold: float
    status: str  # "pass", "warning", "fail"
    description: str

class ImageQualityAssessment(BaseModel):
    """Image quality assessment"""
    image_id: str
    overall_score: float = Field(..., ge=0.0, le=10.0)
    quality_metrics: List[QualityMetric]
    artifacts_detected: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class QualityAssessmentRequest(BaseModel):
    """Quality assessment request"""
    job_ids: List[str]
    assessment_type: str = Field("comprehensive")  # "basic", "comprehensive", "custom"
    quality_thresholds: Optional[Dict[str, float]] = None

class QualityAssessmentResponse(BaseResponse):
    """Quality assessment response"""
    assessment_id: str
    assessments: List[ImageQualityAssessment]
    summary_statistics: Dict[str, Any]
    quality_distribution: Dict[str, int]
    failing_images: List[str] = Field(default_factory=list)

# Data Visualization Schemas
class VisualizationType(str, Enum):
    BAR_CHART = "bar_chart"
    LINE_CHART = "line_chart"
    SCATTER_PLOT = "scatter_plot"
    HISTOGRAM = "histogram"
    BOX_PLOT = "box_plot"
    VIOLIN_PLOT = "violin_plot"
    HEATMAP = "heatmap"
    ROC_CURVE = "roc_curve"
    CONFUSION_MATRIX = "confusion_matrix"

class VisualizationRequest(BaseModel):
    """Visualization request"""
    job_ids: List[str]
    visualization_types: List[VisualizationType]
    variables: List[str]
    grouping_variable: Optional[str] = None
    filter_criteria: Optional[Dict[str, Any]] = None
    style_preferences: Optional[Dict[str, Any]] = None

class VisualizationResult(BaseModel):
    """Visualization result"""
    visualization_id: str
    visualization_type: VisualizationType
    title: str
    image_base64: str
    description: str
    interactive_url: Optional[str] = None

class VisualizationResponse(BaseResponse):
    """Visualization response"""
    visualizations: List[VisualizationResult]
    summary: str

# Predictive Analytics Schemas
class PredictiveModelType(str, Enum):
    LINEAR_REGRESSION = "linear_regression"
    LOGISTIC_REGRESSION = "logistic_regression"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    NEURAL_NETWORK = "neural_network"
    TIME_SERIES = "time_series"

class PredictiveAnalysisRequest(BaseModel):
    """Predictive analysis request"""
    training_job_ids: List[str] = Field(..., min_items=10)
    target_variable: str
    feature_variables: List[str]
    model_type: PredictiveModelType
    validation_split: float = Field(0.2, ge=0.1, le=0.4)
    cross_validation_folds: int = Field(5, ge=3, le=10)

class PredictiveModelResult(BaseModel):
    """Predictive model result"""
    model_id: str
    model_type: PredictiveModelType
    training_accuracy: float
    validation_accuracy: float
    feature_importance: Dict[str, float]
    model_parameters: Dict[str, Any]
    performance_metrics: List[ModelPerformanceMetric]

class PredictiveAnalysisResponse(BaseResponse):
    """Predictive analysis response"""
    analysis_id: str
    model_result: PredictiveModelResult
    predictions: Optional[List[Dict[str, Any]]] = None
    model_interpretation: Dict[str, Any]
    recommendations: List[str]

# Reporting and Export Schemas
class ReportTemplate(str, Enum):
    CLINICAL_SUMMARY = "clinical_summary"
    RESEARCH_REPORT = "research_report"
    QUALITY_REPORT = "quality_report"
    COMPARATIVE_ANALYSIS = "comparative_analysis"
    STATISTICAL_REPORT = "statistical_report"

class ReportGenerationRequest(BaseModel):
    """Report generation request"""
    analysis_ids: List[str]
    template: ReportTemplate
    include_visualizations: bool = True
    include_raw_data: bool = False
    custom_sections: Optional[List[str]] = None
    recipient_info: Optional[Dict[str, str]] = None

class ReportSection(BaseModel):
    """Report section"""
    section_id: str
    title: str
    content: Union[str, Dict[str, Any]]
    section_type: str = "text"  # "text", "table", "visualization", "summary"
    order: int

class GeneratedReport(BaseModel):
    """Generated report"""
    report_id: str
    template_used: ReportTemplate
    generated_at: datetime
    sections: List[ReportSection]
    executive_summary: str
    conclusions: List[str]
    recommendations: List[str]
    metadata: Dict[str, Any]

class ReportGenerationResponse(BaseResponse):
    """Report generation response"""
    report: GeneratedReport
    download_urls: Dict[str, str]  # format -> url
    expires_at: datetime

# Analytics Dashboard Schemas
class DashboardWidget(BaseModel):
    """Dashboard widget configuration"""
    widget_id: str
    widget_type: str
    title: str
    data_source: str
    configuration: Dict[str, Any]
    position: Dict[str, int]  # x, y, width, height

class DashboardConfiguration(BaseModel):
    """Dashboard configuration"""
    dashboard_id: str
    name: str
    description: Optional[str] = None
    widgets: List[DashboardWidget]
    layout: str = "grid"
    auto_refresh_interval: Optional[int] = None  # seconds
    permissions: Dict[str, List[str]] = Field(default_factory=dict)

class DashboardData(BaseModel):
    """Dashboard data response"""
    dashboard_id: str
    last_updated: datetime
    widget_data: Dict[str, Any]  # widget_id -> data
    alerts: List[Dict[str, Any]] = Field(default_factory=list)

# Advanced Analytics Schemas
class MLExperimentRequest(BaseModel):
    """Machine learning experiment request"""
    experiment_name: str
    dataset_job_ids: List[str]
    algorithm_configs: List[Dict[str, Any]]
    evaluation_metrics: List[MetricType]
    hyperparameter_tuning: bool = False
    cross_validation: bool = True

class MLExperimentResult(BaseModel):
    """ML experiment result"""
    experiment_id: str
    best_model: Dict[str, Any]
    all_results: List[Dict[str, Any]]
    hyperparameter_optimization: Optional[Dict[str, Any]] = None
    feature_analysis: Dict[str, Any]
    model_comparison: List[ModelComparison]

class AnomalyDetectionRequest(BaseModel):
    """Anomaly detection request"""
    job_ids: List[str]
    detection_method: str = "isolation_forest"
    contamination_rate: float = Field(0.1, ge=0.01, le=0.5)
    features: Optional[List[str]] = None

class AnomalyDetectionResponse(BaseResponse):
    """Anomaly detection response"""
    detection_id: str
    anomalies_found: int
    anomalous_cases: List[Dict[str, Any]]
    anomaly_scores: Dict[str, float]  # job_id -> score
    detection_summary: Dict[str, Any]