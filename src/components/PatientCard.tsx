import React from 'react';
import { User, Calendar, Activity, FileText, Clock, AlertCircle } from 'lucide-react';

interface PatientCardProps {
  patient: {
    name: string;
    id: string;
    age: number;
    gender: string;
    studyDate: string;
    modality: string;
    bodyPart?: string;
    studyDescription?: string;
    mrn?: string;
    diagnosis?: string;
    physician?: string;
    priority?: string;
    status?: string;
  };
  compact?: boolean;
  showActions?: boolean;
  onViewStudies?: () => void;
  onStartAnalysis?: () => void;
  className?: string;
}

const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  compact = false,
  showActions = false,
  onViewStudies,
  onStartAnalysis,
  className = ''
}) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High': return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'Medium': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
      case 'Low': return 'bg-green-900/30 text-green-300 border-green-700/50';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
      case 'Completed': return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'Pending': return 'bg-orange-900/30 text-orange-300 border-orange-700/50';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  if (compact) {
    return (
      <div className={`bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate">{patient.name}</div>
            <div className="text-sm text-slate-400 truncate">{patient.id} • {patient.age}Y {patient.gender}</div>
          </div>
          {patient.priority && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(patient.priority)}`}>
              {patient.priority}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:bg-slate-800/70 transition-colors ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 space-y-3">
          {/* Patient Header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">{patient.name}</h3>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-slate-400">
              <span>{patient.id}</span>
              <span>•</span>
              <span>{patient.age} years old</span>
              <span>•</span>
              <span>{patient.gender}</span>

              <div className="flex items-center gap-2 ml-1">
                {patient.priority && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(patient.priority)}`}>
                    {patient.priority}
                  </span>
                )}
                {patient.status && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(patient.status)}`}>
                    {patient.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm items-center mb-4">
            {patient.mrn && (
              <>
                <div className="flex items-center gap-2 text-slate-400">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="w-20">MRN:</span>
                </div>
                <div className="text-white font-mono">{patient.mrn}</div>
              </>
            )}

            <>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="w-20">Study Date:</span>
              </div>
              <div className="text-white">{patient.studyDate}</div>
            </>

            <>
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="h-4 w-4 shrink-0" />
                <span className="w-20">Modality:</span>
              </div>
              <div className="text-cyan-300 font-medium">{patient.modality}</div>
            </>

            {patient.bodyPart && (
              <>
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="w-20">Body Part:</span>
                </div>
                <div className="text-white">{patient.bodyPart}</div>
              </>
            )}

            {patient.physician && (
              <>
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="w-20">Physician:</span>
                </div>
                <div className="text-white">{patient.physician}</div>
              </>
            )}

            {patient.diagnosis && (
              <>
                <div className="flex items-center gap-2 text-slate-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="w-20">Diagnosis:</span>
                </div>
                <div className="text-white">{patient.diagnosis}</div>
              </>
            )}
          </div>

          {/* Study Description */}
          {patient.studyDescription && (
            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <div className="text-xs font-medium text-slate-300 mb-1">Study Description</div>
              <div className="text-sm text-slate-200">{patient.studyDescription}</div>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center space-x-3 pt-2 border-t border-slate-600/50">
              <button
                onClick={onViewStudies}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors text-sm"
              >
                <FileText className="h-4 w-4" />
                <span>View Studies</span>
              </button>

              <button
                onClick={onStartAnalysis}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm"
              >
                <Activity className="h-4 w-4" />
                <span>Start Analysis</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientCard;