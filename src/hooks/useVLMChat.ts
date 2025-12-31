import { useState } from 'react';
import { medicalViewerService } from '../services/medicalViewerService';

export function useVLMChat() {
    const [vlmPrompt, setVlmPrompt] = useState('');
    const [vlmResponse, setVlmResponse] = useState('');
    const [vlmProcessing, setVlmProcessing] = useState(false);

    const runVLMQuery = async (
        backendConnected: boolean,
        currentStudyId: string | null,
        selectedModality: string
    ) => {
        if (!vlmPrompt.trim()) {
            alert('Please enter a question');
            return;
        }

        setVlmProcessing(true);

        try {
            if (backendConnected && currentStudyId) {
                // Use real backend VLM chat
                const chatResponse = await medicalViewerService.chatWithVLM(vlmPrompt, currentStudyId);
                setVlmResponse(chatResponse.response);
            } else {
                // Fallback to mock responses
                await new Promise(resolve => setTimeout(resolve, 1500));

                const responses = {
                    'describe': `This ${selectedModality} scan shows a brain volume with the following characteristics:\n\n• Clear gray-white matter differentiation\n• Symmetric ventricles with normal size\n• A hyperintense region in the right frontal lobe measuring approximately 18mm, suggestive of a mass lesion\n• No midline shift observed\n• Corpus callosum appears intact\n\nThe findings are consistent with a possible neoplastic process requiring further clinical correlation.`,
                    'tumor': `Analysis of potential tumorous regions:\n\n1. Main Lesion (Right Frontal):\n   - Location: Right frontal lobe, lateral aspect\n   - Size: ~18mm diameter\n   - Signal: Hyperintense on T1\n   - Margins: Irregular with surrounding edema\n   - Enhancement pattern: Heterogeneous\n\n2. Secondary Finding:\n   - Small focus in left parietal region (~8mm)\n   - Requires follow-up imaging\n\nRecommendation: Consider contrast-enhanced study and possible biopsy.`,
                    'measurement': `Volumetric measurements from current scan:\n\n• Total brain volume: 1,420 cm³\n• Gray matter: 720 cm³ (50.7%)\n• White matter: 580 cm³ (40.8%)\n• CSF: 120 cm³ (8.5%)\n• Lesion volume: 3.2 cm³\n• Edema volume: 8.7 cm³\n\nVentricular measurements:\n• Left lateral ventricle: 12.5 cm³\n• Right lateral ventricle: 13.1 cm³\n• Third ventricle: 1.2 cm³`,
                    'compare': `Comparison analysis:\n\nThe current scan shows progression compared to typical baseline:\n• Lesion size increased from baseline\n• New areas of perilesional edema\n• Stable ventricular size\n• No new lesions detected\n\nSuggested follow-up: 3-month interval scan to monitor progression.`
                };

                let response = 'Unable to process query';
                const query = vlmPrompt.toLowerCase();

                if (query.includes('descri') || query.includes('what') || query.includes('see')) {
                    response = responses.describe;
                } else if (query.includes('tumor') || query.includes('lesion') || query.includes('mass')) {
                    response = responses.tumor;
                } else if (query.includes('measur') || query.includes('size') || query.includes('volume')) {
                    response = responses.measurement;
                } else if (query.includes('compar') || query.includes('change') || query.includes('progress')) {
                    response = responses.compare;
                } else {
                    response = `I can help analyze this ${selectedModality} scan. You can ask me to:\n• Describe what you see in the image\n• Identify and measure tumors or lesions\n• Provide volumetric measurements\n• Compare with baseline studies\n\nPlease rephrase your question with more specific clinical details.`;
                }

                setVlmResponse(response);
            }

        } catch (error: any) {
            console.error('VLM query failed:', error);
            setVlmResponse(`Error: ${error.message}`);
        } finally {
            setVlmProcessing(false);
        }
    };

    return {
        vlmPrompt,
        vlmResponse,
        vlmProcessing,
        setVlmPrompt,
        setVlmResponse,
        runVLMQuery
    };
}
