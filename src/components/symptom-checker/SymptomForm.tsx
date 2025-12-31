import { useState } from 'react';

const examples = [
  'I have a persistent headache and vomiting',
  'I feel chest pain and shortness of breath',
  'I have fever, cough and body ache for 3 days',
  'Sharp stomach pain and diarrhea',
];

interface SymptomFormProps {
  onAnalyze: (symptoms: string) => void;
  error: string | null;
}

export default function SymptomForm({ onAnalyze, error }: SymptomFormProps) {
  const [symptoms, setSymptoms] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.trim()) {
      onAnalyze(symptoms);
    }
  };

  const handleExampleClick = (example: string) => {
    setSymptoms(example);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-scale-in">
      {/* Textarea */}
      <div>
        <label htmlFor="symptoms" className="block text-white font-semibold text-lg mb-3">
          Describe your symptoms in detail:
        </label>
        <textarea
          id="symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          className="w-full px-4 py-3 bg-blue-900/10 border border-blue-600/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[160px] resize-y"
          placeholder="Example: I have a severe headache, nausea, and sensitivity to light for the past 2 days..."
          required
        />
      </div>

      {/* Quick Examples */}
      <div className="rounded-2xl p-6 border border-blue-600/20">
        <h4 className="text-base font-semibold text-blue-400 mb-4">
          Quick Examples (Click to use):
        </h4>
        <div className="flex flex-wrap gap-3">
          {examples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="bg-blue-900/20 text-blue-300 text-sm px-5 py-2.5 rounded-xl border border-blue-600/30
                       hover:bg-blue-600 hover:text-white hover:border-blue-500
                       transition-all duration-300 font-medium"
            >
              {example.split(' ').slice(0, 3).join(' ')}...
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-2xl p-4 animate-slide-in">
          <p className="text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <button
          type="submit"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl
                   font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105
                   transition-all duration-300 flex items-center justify-center gap-2"
        >
          Analyze Symptoms
        </button>
        <button
          type="button"
          onClick={() => setSymptoms('')}
          className="bg-slate-700 text-slate-200 px-8 py-4 rounded-xl font-semibold text-lg
                   hover:bg-slate-600 hover:shadow-md transition-all duration-300"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
