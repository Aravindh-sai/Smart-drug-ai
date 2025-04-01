import { createWorker } from 'tesseract.js';

/**
 * Validates PDF file before processing
 * @param {File} file - The PDF file to validate
 * @returns {Object} - Validation result
 */
const validatePDFFile = (file) => {
  // Check file existence
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!file.type || file.type !== 'application/pdf') {
    return { isValid: false, error: 'Invalid file type. Please upload a PDF file.' };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { isValid: false, error: 'Invalid file extension. Please upload a PDF file.' };
  }

  // Check file size
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  // Check maximum file size (100MB)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File is too large. Maximum size is 100MB.' };
  }

  return { isValid: true };
};

/**
 * Extracts text from PDF using the API
 * @param {File} file - The PDF file to process
 * @returns {Promise<string>} - The extracted text
 */
export const extractTextFromPDF = async (file) => {
  try {
    // Validate PDF file
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    console.log('Processing PDF:', file.name, 'Size:', file.size, 'bytes');

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Send request to API
    const response = await fetch('/api/parse', {
      method: 'POST',
      body: formData,
    });

    // Handle response
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases
      if (data.error === 'Failed to parse PDF with both methods') {
        console.error('Both parsing methods failed:', data.details);
        throw new Error('Failed to extract text from PDF. The file might be corrupted or unreadable.');
      }
      throw new Error(data.error || 'Failed to parse PDF');
    }

    if (!data.text || data.text.trim() === '') {
      throw new Error('No readable text found in PDF');
    }

    console.log('Successfully extracted text from PDF using', data.info.method, 'method');
    console.log('Pages:', data.info.pages, 'Text length:', data.info.textLength);
    
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    // Provide more user-friendly error messages
    if (error.message.includes('Failed to extract text')) {
      throw new Error('Unable to read text from this PDF. Please ensure the file is not corrupted and contains readable text.');
    }
    
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};

/**
 * Extracts text from image using Tesseract.js
 * @param {File} file - The image file to process
 * @returns {Promise<string>} - The extracted text
 */
export const extractTextFromImage = async (file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file format. Please upload an image file.');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    console.log('Processing image:', file.name, 'Size:', file.size, 'bytes');

    // Initialize Tesseract worker
    const worker = await createWorker();
    
    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);
    
    try {
      // Perform OCR
      const { data: { text } } = await worker.recognize(imageUrl);
      
      if (!text) {
        throw new Error('No text extracted from image');
      }

      console.log('Successfully extracted text from image');
      return text;
    } finally {
      // Clean up
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);
    }
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Extracts health metrics from text using regex patterns
 * @param {string} text - The text to analyze
 * @returns {Object} - Object containing extracted health metrics
 */
export const extractHealthMetrics = (text) => {
  const metrics = {
    bp_systolic: null,
    bp_diastolic: null,
    diabetes: null,
    cholesterol: null,
    thyroid: null
  };

  try {
    // Blood Pressure patterns
    const bpPatterns = [
      /(?:BP|Blood Pressure|Blood pressure)\s*[:]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i,
      /(?:BP|Blood Pressure|Blood pressure)\s*[:]?\s*(\d{2,3})\s*over\s*(\d{2,3})/i,
      /(?:BP|Blood Pressure|Blood pressure)\s*[:]?\s*(\d{2,3})\s*[-–]\s*(\d{2,3})/i
    ];

    for (const pattern of bpPatterns) {
      const match = text.match(pattern);
      if (match) {
        metrics.bp_systolic = parseInt(match[1]);
        metrics.bp_diastolic = parseInt(match[2]);
        break;
      }
    }

    // Diabetes patterns (looking for blood glucose levels)
    const diabetesPatterns = [
      /(?:Blood Glucose|Blood sugar|FBS|Fasting Blood Sugar)\s*[:]?\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:mg\/dl|mg\/dL|mg\/dl)/i,
      /(?:Blood Glucose|Blood sugar|FBS|Fasting Blood Sugar)\s*[:]?\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:mmol\/L|mmol\/l)/i
    ];

    for (const pattern of diabetesPatterns) {
      const match = text.match(pattern);
      if (match) {
        metrics.diabetes = parseFloat(match[1]);
        break;
      }
    }

    // Cholesterol patterns
    const cholesterolPatterns = [
      /(?:Total Cholesterol|Cholesterol)\s*[:]?\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:mg\/dl|mg\/dL|mg\/dl)/i,
      /(?:Total Cholesterol|Cholesterol)\s*[:]?\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:mmol\/L|mmol\/l)/i
    ];

    for (const pattern of cholesterolPatterns) {
      const match = text.match(pattern);
      if (match) {
        metrics.cholesterol = parseFloat(match[1]);
        break;
      }
    }

    // Thyroid patterns (TSH levels)
    const thyroidPatterns = [
      /(?:TSH|Thyroid Stimulating Hormone)\s*[:]?\s*(\d+(?:\.\d{1,3})?)\s*(?:mIU\/L|mIU\/l|μIU\/ml)/i,
      /(?:TSH|Thyroid Stimulating Hormone)\s*[:]?\s*(\d+(?:\.\d{1,3})?)\s*(?:ng\/ml|ng\/mL)/i
    ];

    for (const pattern of thyroidPatterns) {
      const match = text.match(pattern);
      if (match) {
        metrics.thyroid = parseFloat(match[1]);
        break;
      }
    }

  } catch (error) {
    console.error('Error extracting health metrics:', error);
  }

  return metrics;
};

/**
 * Determines file type and extracts text accordingly
 * @param {File} file - The file to process
 * @returns {Promise<Object>} - Object containing extracted text and health metrics
 */
export const extractTextFromFile = async (file) => {
  const fileType = file.type.toLowerCase();
  let extractedText = '';
  
  if (fileType === 'application/pdf') {
    extractedText = await extractTextFromPDF(file);
  } else if (fileType.startsWith('image/')) {
    extractedText = await extractTextFromImage(file);
  } else {
    throw new Error('Unsupported file type');
  }

  // Extract health metrics from the text
  const healthMetrics = extractHealthMetrics(extractedText);

  return {
    text: extractedText,
    metrics: healthMetrics
  };
}; 