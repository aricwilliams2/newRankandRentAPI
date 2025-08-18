## Frontend: "Download Report" button that screenshots the analytics page to a PDF (no extra requests)

This guide shows how to add a button that captures your current analytics view and saves it as a PDF. It runs entirely in the browser (client-only) and makes zero additional API calls.

### 1) Install lightweight dependencies (or load on demand)

```bash
npm install html2canvas jspdf
```

You can also load them on demand via dynamic import (shown below) so they don't bloat your bundle until the user clicks the button.

### 2) Mark the analytics section you want to capture

Wrap the visible analytics UI (charts, tables, KPIs) with a stable container. Give it an id.

```tsx
<div id="analytics-report-area">
  {/* Your analytics charts, KPIs, tables, etc. */}
  <AnalyticsCharts />
  <AnalyticsSummary />
</div>
```

Optional: add `class="no-report"` to elements you want to exclude (e.g., live controls) and temporarily hide them during capture.

### 3) Add a button that captures the container and saves a PDF

```tsx
import React from 'react';

export function AnalyticsReportButton() {
  const handleDownload = async () => {
    // Load libs only when needed
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    const target = document.getElementById('analytics-report-area') || document.body;
    // Hide elements you don't want in the report (optional)
    const hidden: HTMLElement[] = Array.from(target.querySelectorAll('.no-report')) as HTMLElement[];
    hidden.forEach(el => (el.style.visibility = 'hidden'));

    try {
      const scale = Math.min(2, window.devicePixelRatio || 1); // crisp but not too heavy
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;

      // Multi-page render of one tall image
      let remainingHeight = renderHeight;
      let offsetY = 0;

      // First page
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin - offsetY,
        renderWidth,
        Math.min(remainingHeight, pageHeight - margin * 2)
      );
      remainingHeight -= (pageHeight - margin * 2);
      offsetY += (pageHeight - margin * 2);

      // Additional pages if needed
      while (remainingHeight > 0) {
        pdf.addPage();
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin - offsetY,
          renderWidth,
          Math.min(remainingHeight, pageHeight - margin * 2)
        );
        remainingHeight -= (pageHeight - margin * 2);
        offsetY += (pageHeight - margin * 2);
      }

      pdf.save('analytics-report.pdf');
    } finally {
      // Restore hidden elements
      hidden.forEach(el => (el.style.visibility = ''));
    }
  };

  return (
    <button onClick={handleDownload}>
      Download Report (PDF)
    </button>
  );
}
```

### 4) Place the button in your analytics page header/tool bar

```tsx
<div className="analytics-header">
  <h2>Analytics</h2>
  <AnalyticsReportButton />
</div>
```

### Tips
- Ensure charts/images are fully rendered before capture (wait for loading states to finish).
- For third-party images/charts, proper CORS headers help `html2canvas` include them. The `useCORS: true` flag is enabled above.
- If your analytics area has a dark background, the PDF uses `backgroundColor: '#ffffff'` so it prints on white.
- Use `.no-report` to temporarily hide controls (date pickers, dropdowns) during capture.


