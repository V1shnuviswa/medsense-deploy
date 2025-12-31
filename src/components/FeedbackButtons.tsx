import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackButtonsProps {
    featureType: 'symptom_check' | 'report_analysis';
    referenceId: string;
    onSubmit?: () => void;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ featureType, referenceId, onSubmit }) => {
    const [feedback, setFeedback] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if feedback already given for this item
    useEffect(() => {
        // Reset feedback state when referenceId changes (new report)
        setFeedback(null);
        setIsSubmitting(false);

        const storageKey = `feedback_${featureType}_${referenceId}`;
        const savedFeedback = localStorage.getItem(storageKey);
        if (savedFeedback !== null) {
            setFeedback(savedFeedback === 'true');
        }
    }, [featureType, referenceId]);

    const submitFeedback = async (isHelpful: boolean) => {
        if (isSubmitting || feedback !== null) return;

        setIsSubmitting(true);
        setFeedback(isHelpful);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    feature_type: featureType,
                    reference_id: referenceId,
                    is_helpful: isHelpful
                })
            });

            if (response.ok) {
                // Save to localStorage to prevent asking again
                const storageKey = `feedback_${featureType}_${referenceId}`;
                localStorage.setItem(storageKey, isHelpful.toString());
                onSubmit?.();
            } else {
                // Reset on error
                setFeedback(null);
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setFeedback(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Already submitted - show thank you message
    if (feedback !== null) {
        return (
            <div className="w-full bg-gradient-to-r from-emerald-900/20 to-emerald-800/20 border border-emerald-700/50 rounded-lg py-3 px-6">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-emerald-400 text-lg">✓</span>
                    <span className="text-emerald-300 font-medium">Thanks for your feedback!</span>
                </div>
            </div>
        );
    }

    // Full-width feedback buttons
    return (
        <div className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-3 px-6">
            <div className="flex items-center justify-between gap-8">
                <span className="text-slate-300 font-medium">Was this helpful?</span>
                <div className="flex gap-3">
                    <button
                        onClick={() => submitFeedback(true)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:bg-emerald-900/30 hover:border-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        title="Yes, this was helpful"
                    >
                        <ThumbsUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-slate-200 font-medium">Yes</span>
                    </button>
                    <button
                        onClick={() => submitFeedback(false)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:bg-red-900/30 hover:border-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        title="No, this was not helpful"
                    >
                        <ThumbsDown className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                        <span className="text-slate-200 font-medium">No</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackButtons;
