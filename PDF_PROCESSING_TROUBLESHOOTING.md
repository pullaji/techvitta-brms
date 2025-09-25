# PDF Processing Troubleshooting Guide

## ✅ Fixed Issues

### 1. PDF.js Worker Configuration Error
**Problem**: `No "GlobalWorkerOptions.workerSrc" specified`

**Solution**: 
- Created `src/utils/pdfWorkerConfig.ts` utility
- Automatic worker configuration from CDN
- Proper error handling for worker issues

**Code Fix**:
```typescript
import { configurePDFWorker } from '@/utils/pdfWorkerConfig';

// Configure PDF.js worker
configurePDFWorker();
```

### 2. OCR Fallback for Image-based PDFs
**Problem**: `Pdf reading is not supported` - Tesseract can't read PDFs directly

**Solution**:
- PDF pages are rendered to canvas first
- Canvas is converted to image data URL
- Tesseract processes the rendered images
- Higher scale (2.0) for better OCR accuracy

**Code Fix**:
```typescript
// Render PDF page to canvas
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
canvas.height = viewport.height;
canvas.width = viewport.width;

await page.render({
  canvasContext: context,
  viewport: viewport,
  canvas: canvas
}).promise;

// Convert to image and run OCR
const imageDataUrl = canvas.toDataURL('image/png');
const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng');
```

### 3. Enhanced Error Handling
**Problem**: Generic error messages, no fallback processing

**Solution**:
- Detailed error messages with specific guidance
- Proper error categorization
- User-friendly troubleshooting steps

## 🔧 Technical Implementation

### PDF Processing Pipeline

1. **Text-based PDFs**:
   ```
   PDF File → PDF.js Text Extraction → Transaction Parsing → Database
   ```

2. **Image-based PDFs**:
   ```
   PDF File → PDF.js Page Rendering → Canvas → Image → OCR → Transaction Parsing → Database
   ```

### Worker Configuration

The system now automatically configures PDF.js worker from multiple sources:

1. **Primary**: CDN (cdnjs.cloudflare.com)
2. **Fallback**: Alternative CDN (unpkg.com)
3. **Local**: Local worker file (if available)

### Error Categories

| Error Type | Cause | Solution |
|------------|-------|----------|
| **Worker Error** | PDF.js worker not configured | Automatic worker configuration |
| **Invalid PDF** | Corrupted or invalid PDF | Try different file |
| **Password Protected** | PDF requires password | Remove password protection |
| **Image-based PDF** | No text layer | OCR processing on rendered pages |
| **Empty PDF** | No content | Check file content |
| **Unsupported Format** | Non-standard PDF | Convert to standard format |

## 🚀 Performance Optimizations

### 1. Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['pdfjs-dist', 'tesseract.js', 'xlsx', 'papaparse']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
          'ocr': ['tesseract.js'],
          'excel': ['xlsx'],
          'csv': ['papaparse']
        }
      }
    }
  }
});
```

### 2. Dynamic Imports
- PDF.js, Tesseract.js, XLSX, and PapaParse are loaded dynamically
- Reduces initial bundle size
- Better performance for large files

### 3. Canvas Rendering
- Higher scale (2.0) for better OCR accuracy
- Efficient memory management
- Progress tracking for multi-page PDFs

## 📋 Testing Checklist

### PDF Processing Tests

- [ ] **Text-based PDF**: Standard bank statement with text layer
- [ ] **Image-based PDF**: Scanned bank statement (OCR required)
- [ ] **Mixed PDF**: Combination of text and images
- [ ] **Multi-page PDF**: Multiple pages with transactions
- [ ] **Large PDF**: File size > 5MB
- [ ] **Corrupted PDF**: Invalid or damaged file
- [ ] **Password-protected PDF**: Requires password
- [ ] **Empty PDF**: No content

### Error Handling Tests

- [ ] **Worker configuration**: PDF.js worker setup
- [ ] **Network issues**: CDN unavailable
- [ ] **Memory limits**: Large file processing
- [ ] **Browser compatibility**: Different browsers
- [ ] **Mobile devices**: Touch devices

## 🛠️ Troubleshooting Steps

### For Users

1. **PDF not processing**:
   - Ensure PDF is not password-protected
   - Check file size (max 10MB)
   - Try a different PDF file
   - Convert to images if needed

2. **Slow processing**:
   - Large files take longer
   - OCR processing is slower than text extraction
   - Check browser console for progress

3. **No transactions found**:
   - Verify PDF contains bank statement data
   - Check if format is recognized
   - Try manual transaction entry

### For Developers

1. **Worker errors**:
   ```typescript
   // Check worker configuration
   import { getPDFJSInfo } from '@/utils/pdfWorkerConfig';
   console.log(getPDFJSInfo());
   ```

2. **OCR issues**:
   ```typescript
   // Test OCR functionality
   import { testPDFJS } from '@/utils/pdfWorkerConfig';
   const isWorking = await testPDFJS();
   ```

3. **Memory issues**:
   - Monitor browser memory usage
   - Process large files in chunks
   - Clear canvas after each page

## 📊 Monitoring and Logging

### Console Logs

The system provides detailed logging:

```
PDF.js worker configured: //cdnjs.cloudflare.com/...
PDF.js version: 5.4.149
Processing page 1 of 3...
Page 1 OCR Progress: 45%
Page 1 OCR completed
Successfully parsed 15 transactions using OCR on rendered pages
```

### Error Tracking

All errors are logged with context:

```
PDF.js error: InvalidPDFException
OCR error: No text could be extracted
Extraction method used: OCR on rendered pages
Extracted text length: 0 characters
```

## 🔮 Future Improvements

### Planned Enhancements

1. **Web Workers**: Move PDF processing to background threads
2. **Caching**: Cache processed PDFs for faster re-processing
3. **Batch Processing**: Process multiple PDFs simultaneously
4. **Advanced OCR**: Support for multiple languages
5. **PDF Optimization**: Compress large PDFs before processing

### Performance Targets

- **Text-based PDFs**: < 2 seconds for 10 pages
- **Image-based PDFs**: < 10 seconds for 10 pages
- **Memory usage**: < 100MB for processing
- **Success rate**: > 95% for standard bank statements

## 📞 Support

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Worker not loading | Refresh page, check network |
| OCR too slow | Reduce file size, use text-based PDF |
| No transactions found | Check PDF format, try manual entry |
| Memory errors | Close other tabs, restart browser |
| Processing fails | Check console logs, try different file |

### Getting Help

1. Check browser console for error details
2. Verify PDF file is valid and readable
3. Try with a different PDF file
4. Check network connection for CDN access
5. Restart browser if memory issues persist

The enhanced PDF processing system now handles both text-based and image-based PDFs with proper error handling and user feedback.
