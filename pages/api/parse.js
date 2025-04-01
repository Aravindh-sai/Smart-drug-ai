import pdfParse from 'pdf-parse';
import formidable from 'formidable';
import fs from 'fs';
import { getDocument } from 'pdfjs-dist';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Validates PDF file and buffer
 * @param {Object} file - The uploaded file object
 * @param {Buffer} buffer - The file buffer
 * @returns {Object} - Validation result
 */
const validatePDF = (file, buffer) => {
  // Check file existence
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (file.mimetype !== 'application/pdf') {
    return { isValid: false, error: 'Invalid file type. Please upload a PDF file.' };
  }

  // Check file extension
  if (!file.originalFilename.toLowerCase().endsWith('.pdf')) {
    return { isValid: false, error: 'Invalid file extension. Please upload a PDF file.' };
  }

  // Check file size
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  // Check buffer
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: 'Failed to read file content' };
  }

  // Check minimum PDF size (PDF header is typically 8 bytes)
  if (buffer.length < 8) {
    return { isValid: false, error: 'File is too small to be a valid PDF' };
  }

  // Check PDF header signature (%PDF-)
  const header = buffer.slice(0, 8).toString('ascii');
  if (!header.includes('%PDF-')) {
    return { isValid: false, error: 'Invalid PDF format. File may be corrupted.' };
  }

  return { isValid: true };
};

/**
 * Alternative method for PDF parsing using pdf.js
 * @param {Buffer} dataBuffer - The PDF buffer
 * @returns {Promise<Object>} - Parsed PDF data
 */
const parsePDFWithFallback = async (dataBuffer) => {
  try {
    console.log('Attempting PDF.js parsing method...');
    
    // Initialize PDF.js worker
    const loadingTask = getDocument({ data: dataBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const numPages = pdf.numPages;
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
      
      // Log progress
      console.log(`Processed page ${i}/${numPages}`);
    }

    if (!fullText.trim()) {
      throw new Error('No text extracted using PDF.js method');
    }

    console.log('Successfully extracted text using PDF.js');
    return {
      text: fullText.trim(),
      numpages: numPages
    };
  } catch (error) {
    console.error('PDF.js parsing failed:', error);
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          reject(err);
        }
        resolve([fields, files]);
      });
    });

    if (!files.file || !files.file[0]) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.file[0];
    const filePath = file.filepath;

    // Read and validate file
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(400).json({ error: 'File not found' });
    }

    // Read file buffer
    const dataBuffer = fs.readFileSync(filePath);
    console.log('File size:', dataBuffer.length, 'bytes');

    // Validate PDF
    const validation = validatePDF(file, dataBuffer);
    if (!validation.isValid) {
      console.error('PDF validation failed:', validation.error);
      return res.status(400).json({ error: validation.error });
    }

    // Try primary method first (pdf-parse)
    try {
      const data = await pdfParse(dataBuffer);
      
      if (!data || !data.text || data.text.trim() === '') {
        console.error('No text extracted from PDF with primary method');
        throw new Error('No text found in PDF');
      }

      console.log('Successfully extracted text from PDF using primary method');
      return res.status(200).json({ 
        text: data.text,
        info: {
          pages: data.numpages,
          textLength: data.text.length,
          method: 'primary'
        }
      });
    } catch (parseError) {
      console.warn('Primary parsing method failed:', parseError.message);
      
      // Try PDF.js fallback method
      try {
        console.log('Attempting PDF.js fallback method...');
        const fallbackData = await parsePDFWithFallback(dataBuffer);
        
        if (!fallbackData || !fallbackData.text || fallbackData.text.trim() === '') {
          throw new Error('No text found in PDF with PDF.js method');
        }

        console.log('Successfully extracted text from PDF using PDF.js method');
        return res.status(200).json({ 
          text: fallbackData.text,
          info: {
            pages: fallbackData.numpages,
            textLength: fallbackData.text.length,
            method: 'pdfjs'
          }
        });
      } catch (fallbackError) {
        console.error('PDF.js fallback method failed:', fallbackError);
        return res.status(400).json({ 
          error: 'Failed to parse PDF with both methods',
          details: {
            primary: parseError.message,
            fallback: fallbackError.message
          }
        });
      }
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Error processing file',
      details: error.message
    });
  }
} 