import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';
import { Search, Plus, Filter, Download, Eye, CreditCard as Edit, Calendar, User, FileText, Activity } from 'lucide-react';
import PatientCard from '../components/PatientCard';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  lastVisit: string;
  studies: number;
  status: string;
  diagnosis: string;
  physician: string;
  priority: string;
}

const PatientDatabase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    mrn: '',
    diagnosis: '',
    physician: ''
  });

  // Mock data - in real implementation, this would come from API
  const mockPatients: Patient[] = [
    {
      id: 'PAT-001',
      name: 'Sarah Johnson',
      age: 45,
      gender: 'Female',
      mrn: 'MRN-789456',
      lastVisit: '2024-01-15',
      studies: 3,
      status: 'Active',
      diagnosis: 'Brain MRI Follow-up',
      physician: 'Dr. Smith',
      priority: 'High'
    },
    {
      id: 'PAT-002',
      name: 'Michael Chen',
      age: 62,
      gender: 'Male',
      mrn: 'MRN-456789',
      lastVisit: '2024-01-14',
      studies: 5,
      status: 'Completed',
      diagnosis: 'Cardiac Assessment',
      physician: 'Dr. Johnson',
      priority: 'Medium'
    },
    {
      id: 'PAT-003',
      name: 'Emily Rodriguez',
      age: 34,
      gender: 'Female',
      mrn: 'MRN-123456',
      lastVisit: '2024-01-13',
      studies: 2,
      status: 'Pending',
      diagnosis: 'Chest CT Screening',
      physician: 'Dr. Williams',
      priority: 'Low'
    },
    {
      id: 'PAT-004',
      name: 'Robert Thompson',
      age: 58,
      gender: 'Male',
      mrn: 'MRN-987654',
      lastVisit: '2024-01-12',
      studies: 4,
      status: 'Active',
      diagnosis: 'Abdominal Pain Workup',
      physician: 'Dr. Brown',
      priority: 'High'
    }
  ];

  // Use API hook for patients (commented out for now since we're using mock data)
  // const { data: patientsData, loading, error, refetch } = useApi(
  //   () => apiService.getPatients(searchTerm, selectedFilter),
  //   [searchTerm, selectedFilter]
  // );

  const patients = mockPatients;

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || patient.status.toLowerCase() === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleCreatePatient = async () => {
    try {
      // In real implementation, call API
      // await apiService.createPatient({
      //   name: newPatient.name,
      //   age: parseInt(newPatient.age),
      //   gender: newPatient.gender,
      //   mrn: newPatient.mrn,
      //   diagnosis: newPatient.diagnosis,
      //   physician: newPatient.physician
      // });
      
      // For now, just close modal and reset form
      setShowCreateModal(false);
      setNewPatient({
        name: '',
        age: '',
        gender: 'Male',
        mrn: '',
        diagnosis: '',
        physician: ''
      });
      
      alert('Patient created successfully!');
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert('Failed to create patient. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'Medium': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
      case 'Low': return 'bg-green-900/30 text-green-300 border-green-700/50';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
      case 'Completed': return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'Pending': return 'bg-orange-900/30 text-orange-300 border-orange-700/50';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Patient Database</h1>
            <p className="text-slate-400">Manage patient records and imaging studies</p>
          </div>
          <button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span onClick={() => setShowCreateModal(true)}>New Patient</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name, MRN, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            
            <button className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
              <Filter className="h-5 w-5" />
            </button>
            
            <button className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Patient</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">MRN</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Age/Gender</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Last Visit</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Studies</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Priority</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <PatientCard 
                        patient={{
                          ...patient,
                          studyDate: patient.lastVisit,
                          modality: 'Multiple',
                          bodyPart: 'Various'
                        }}
                        compact={true}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-300 font-mono text-sm">{patient.mrn}</td>
                  <td className="py-4 px-6 text-slate-300">{patient.age} / {patient.gender}</td>
                  <td className="py-4 px-6 text-slate-300">{patient.lastVisit}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-1">
                     <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium">{patient.studies}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(patient.priority)}`}>
                      {patient.priority}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedPatient(patient)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-lg transition-colors">
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Patient Details</h2>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">Full Name</label>
                  <p className="text-white font-medium">{selectedPatient.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Medical Record Number</label>
                  <p className="text-white font-mono">{selectedPatient.mrn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Age / Gender</label>
                  <p className="text-white">{selectedPatient.age} years old, {selectedPatient.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Attending Physician</label>
                  <p className="text-white">{selectedPatient.physician}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">Primary Diagnosis</label>
                  <p className="text-white">{selectedPatient.diagnosis}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Last Visit</label>
                  <p className="text-white">{selectedPatient.lastVisit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Total Studies</label>
                  <p className="text-white">{selectedPatient.studies} imaging studies</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Current Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedPatient.status)}`}>
                    {selectedPatient.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
                View Studies
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">
                Start Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Patient Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Patient</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter patient name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Age</label>
                  <input
                    type="number"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Age"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Medical Record Number</label>
                <input
                  type="text"
                  value={newPatient.mrn}
                  onChange={(e) => setNewPatient({...newPatient, mrn: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MRN-XXXXXX"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Diagnosis</label>
                <input
                  type="text"
                  value={newPatient.diagnosis}
                  onChange={(e) => setNewPatient({...newPatient, diagnosis: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Primary diagnosis"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Attending Physician</label>
                <input
                  type="text"
                  value={newPatient.physician}
                  onChange={(e) => setNewPatient({...newPatient, physician: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dr. Smith"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreatePatient}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Create Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDatabase;