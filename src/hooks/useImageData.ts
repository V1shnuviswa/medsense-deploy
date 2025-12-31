import { useState } from 'react';
import { readImageFile } from 'itk-wasm';
import { medicalViewerService } from '../services/medicalViewerService';

export interface ImageData {
    itkImage: any;
    data: Uint16Array;
    dimensions: { x: number; y: number; z: number };
    spacing: { x: number; y: number; z: number };
    origin: { x: number; y: number; z: number };
    direction: number[];
    modality: string;
    seriesDescription: string;
    pixelType: string;
}

export interface PatientInfo {
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
}

export function useImageData() {
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [loadingImage, setLoadingImage] = useState(false);
    const [backendConnected, setBackendConnected] = useState(true);
    const [currentStudyId, setCurrentStudyId] = useState<string | null>(null);

    // ITK-wasm image loading function
    const loadMedicalImage = async (file: File): Promise<ImageData> => {
        try {
            const { image } = await readImageFile(file);

            // Convert ITK image data to our format
            const imageData: ImageData = {
                itkImage: image,
                data: new Uint16Array(image.data as ArrayBuffer),
                dimensions: {
                    x: image.size[0],
                    y: image.size[1],
                    z: image.size[2] || 1
                },
                spacing: {
                    x: image.spacing[0] || 1.0,
                    y: image.spacing[1] || 1.0,
                    z: image.spacing[2] || 1.0
                },
                origin: {
                    x: image.origin[0] || 0,
                    y: image.origin[1] || 0,
                    z: image.origin[2] || 0
                },
                direction: image.direction || [1, 0, 0, 0, 1, 0, 0, 0, 1],
                modality: 'Unknown',
                seriesDescription: 'ITK Image',
                pixelType: image.imageType?.componentType || 'uint16'
            };

            return imageData;
        } catch (error: any) {
            console.error('ITK image loading failed:', error);
            throw new Error(`Failed to load medical image: ${error.message}`);
        }
    };

    // Handle file upload with ITK-wasm
    const handleFileUpload = async (
        event: React.ChangeEvent<HTMLInputElement>,
        patientInfo: PatientInfo,
        callbacks?: {
            onSliceUpdate?: (slices: { axial: number; sagittal: number; coronal: number }) => void;
            onCursorUpdate?: (cursor: { x: number; y: number; z: number }) => void;
            onPatientUpdate?: (patient: Partial<PatientInfo>) => void;
            onModalClose?: () => void;
        }
    ) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        setUploadedFiles(Array.from(files));

        try {
            setLoadingImage(true);

            // Load image using ITK-wasm
            const loadedImageData = await loadMedicalImage(file);

            // Update state with loaded image
            setImageData(loadedImageData);

            // Initialize slice positions
            if (callbacks?.onSliceUpdate) {
                callbacks.onSliceUpdate({
                    axial: Math.floor(loadedImageData.dimensions.z / 2),
                    sagittal: Math.floor(loadedImageData.dimensions.x / 2),
                    coronal: Math.floor(loadedImageData.dimensions.y / 2)
                });
            }

            if (callbacks?.onCursorUpdate) {
                callbacks.onCursorUpdate({
                    x: Math.floor(loadedImageData.dimensions.x / 2),
                    y: Math.floor(loadedImageData.dimensions.y / 2),
                    z: Math.floor(loadedImageData.dimensions.z / 2)
                });
            }

            // Try to upload to backend for additional processing
            try {
                if (backendConnected) {
                    const uploadResponse = await medicalViewerService.uploadDicomFiles(
                        files,
                        patientInfo.id,
                        loadedImageData.modality || 'Unknown',
                        loadedImageData.seriesDescription || 'ITK Image'
                    );

                    setCurrentStudyId(uploadResponse.study_id);

                    // Update patient info from DICOM metadata if available
                    if (uploadResponse.files.length > 0) {
                        const firstFile = uploadResponse.files[0];
                        try {
                            const dicomImage = await medicalViewerService.getDicomImage(firstFile.id);
                            if (dicomImage.metadata) {
                                if (callbacks?.onPatientUpdate) {
                                    callbacks.onPatientUpdate({
                                        name: dicomImage.metadata.patient_name || patientInfo.name,
                                        studyDate: dicomImage.metadata.study_date || patientInfo.studyDate,
                                        modality: dicomImage.metadata.modality || patientInfo.modality
                                    });
                                }

                                // Update image data with DICOM metadata
                                setImageData(prevData => prevData ? {
                                    ...prevData,
                                    modality: dicomImage.metadata.modality || prevData.modality,
                                    seriesDescription: dicomImage.metadata.series_number ?
                                        `Series ${dicomImage.metadata.series_number}` : prevData.seriesDescription
                                } : prevData);
                            }
                        } catch (metadataError) {
                            console.warn('Could not extract DICOM metadata:', metadataError);
                        }
                    }
                }
            } catch (backendError) {
                console.warn('Backend upload failed, continuing with local processing:', backendError);
                setBackendConnected(false);
            }

            if (callbacks?.onModalClose) {
                callbacks.onModalClose();
            }

        } catch (error: any) {
            console.error('File loading failed:', error);
            alert(`Failed to load medical image: ${error.message}`);
        } finally {
            setLoadingImage(false);
        }
    };

    return {
        imageData,
        uploadedFiles,
        loadingImage,
        backendConnected,
        currentStudyId,
        setImageData,
        setBackendConnected,
        loadMedicalImage,
        handleFileUpload
    };
}
