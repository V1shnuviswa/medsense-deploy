import React, { useState } from 'react';
import { Search, BookOpen, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    journal: string;
    year: string;
    link: string;
    doi: string | null;
}

const OpenEvidence: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const searchEvidence = async (searchTerm: string) => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);
        setResults([]);
        // Update query state if called from quick search
        setQuery(searchTerm);

        try {
            const response = await fetch(`/api/evidence/search?query=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Failed to fetch results');

            const data = await response.json();
            setResults(data.results);
        } catch (err) {
            setError('Failed to retrieve evidence. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        searchEvidence(query);
    };

    const quickSearches = [
        "Diabetes",
        "Cardiac Arrest",
        "Roy Taylor Diabetes"
    ];

    return (
        <div className="space-y-8 page-transition">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                        <BookOpen className="h-8 w-8 text-blue-400" />
                        <h1 className="text-4xl font-bold text-white tracking-tight">Clinical Evidence</h1>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        Access real-time medical literature and clinical evidence from PubMed.
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                <form onSubmit={handleSearch} className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for medical topics, conditions, or treatments..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                    </button>
                </form>

                {/* Quick Search Suggestions */}
                <div className="flex items-center flex-wrap gap-2 animate-fade-in">
                    <span className="text-sm text-slate-400 mr-2 flex items-center">
                        <Search className="h-3 w-3 mr-1" /> Quick Search:
                    </span>
                    {quickSearches.map((term) => (
                        <button
                            key={term}
                            onClick={() => searchEvidence(term)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-slate-800/80 hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/30 text-slate-300 text-sm rounded-lg border border-slate-700 transition-all cursor-pointer"
                        >
                            {term}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
                {error && (
                    <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center text-red-400">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-400">Searching PubMed database...</p>
                    </div>
                )}

                {!loading && searched && results.length === 0 && !error && (
                    <div className="text-center py-12 text-slate-500">
                        No results found for "{query}". Try refining your search terms.
                    </div>
                )}

                <div className="grid gap-6">
                    {results.map((article) => (
                        <div key={article.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-medium text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full border border-blue-800">
                                    {article.journal} • {article.year}
                                </span>
                                <a
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </a>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                <a href={article.link} target="_blank" rel="noopener noreferrer">
                                    {article.title}
                                </a>
                            </h3>

                            <div className="text-sm text-slate-400 mb-4 italic">
                                {article.authors.join(', ')}
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                    <FileText className="h-3 w-3 mr-1" /> Abstract
                                </h4>
                                <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all">
                                    {article.abstract}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OpenEvidence;
