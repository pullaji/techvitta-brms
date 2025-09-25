import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize PDF.js worker on app start
import { initPDFJS } from "./utils/pdfInit";
import { runPDFTests } from "./utils/pdfWorkerTest";

// Initialize PDF.js
try {
  initPDFJS();
  console.log('✅ PDF.js initialized successfully');
  
  // Run tests to verify everything is working
  runPDFTests().then(results => {
    if (results.overallSuccess) {
      console.log('✅ PDF.js tests passed - ready for processing');
    } else {
      console.warn('⚠️ PDF.js tests failed - check configuration');
    }
  });
} catch (error) {
  console.warn('⚠️ PDF.js initialization failed:', error);
}

createRoot(document.getElementById("root")!).render(<App />);
