/**
 * PDF Report Generator for mpx-api
 * 
 * Generates professional API test result reports using PDFKit.
 * Style consistent with mpx-scan PDF reports.
 */

import PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

// Color palette (consistent with mpx-scan)
const COLORS = {
  primary: '#1a56db',
  dark: '#1f2937',
  gray: '#6b7280',
  lightGray: '#e5e7eb',
  white: '#ffffff',
  pass: '#16a34a',
  warn: '#ea580c',
  fail: '#dc2626',
  headerBg: '#1e3a5f',
  sectionBg: '#f3f4f6',
};

/**
 * Generate a PDF report from test/collection results
 * @param {Array} results - Array of test result objects from collection-runner
 * @param {object} meta - Metadata: { target, collectionName, totalTime }
 * @param {string} outputPath - Path to write the PDF
 * @returns {Promise<string>} - Resolved path of the generated PDF
 */
export function generatePDFReport(results, meta, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const now = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;
      const total = results.length;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `mpx-api Test Report — ${meta.target || 'API Tests'}`,
          Author: 'mpx-api',
          Subject: 'API Test Results',
          Creator: `mpx-api v${pkg.version}`,
        },
        bufferPages: true,
      });

      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ─── Header ───
      doc.rect(0, 0, doc.page.width, 100).fill(COLORS.headerBg);
      doc.fontSize(22).fillColor(COLORS.white).font('Helvetica-Bold')
        .text('mpx-api Test Report', 50, 30);
      doc.fontSize(10).fillColor('#a0b4cc').font('Helvetica')
        .text(`v${pkg.version}  •  ${now}  •  ${meta.target || 'Collection Run'}`, 50, 60);

      doc.y = 120;

      // ─── Summary Box ───
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
      const gradeColor = passRate === 100 ? COLORS.pass : passRate >= 50 ? COLORS.warn : COLORS.fail;

      doc.roundedRect(50, doc.y, pageWidth, 80, 6).fill(COLORS.sectionBg);
      const summaryTop = doc.y + 12;

      // Pass rate circle
      doc.circle(100, summaryTop + 28, 26).fill(gradeColor);
      doc.fontSize(20).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(`${passRate}%`, 100 - 20, summaryTop + 16, { width: 40, align: 'center' });

      // Summary text
      doc.fontSize(14).fillColor(COLORS.dark).font('Helvetica-Bold')
        .text(`${passed}/${total} tests passed`, 145, summaryTop + 5);

      const timingText = meta.totalTime ? `Total time: ${meta.totalTime}ms` : '';
      const collName = meta.collectionName ? `Collection: ${meta.collectionName}` : '';
      const subtext = [collName, timingText].filter(Boolean).join('  •  ');
      if (subtext) {
        doc.fontSize(10).fillColor(COLORS.gray).font('Helvetica')
          .text(subtext, 145, summaryTop + 25);
      }

      // Counts on right side
      const countsX = 370;
      const counts = [
        { label: 'Passed', count: passed, color: COLORS.pass },
        { label: 'Failed', count: failed, color: COLORS.fail },
        { label: 'Total', count: total, color: COLORS.primary },
      ];
      counts.forEach((c, i) => {
        const cx = countsX + i * 60;
        doc.fontSize(18).fillColor(c.color).font('Helvetica-Bold')
          .text(String(c.count), cx, summaryTop + 5, { width: 50, align: 'center' });
        doc.fontSize(7).fillColor(COLORS.gray).font('Helvetica')
          .text(c.label, cx, summaryTop + 28, { width: 50, align: 'center' });
      });

      doc.y = summaryTop + 68;

      // ─── Detailed Results ───
      for (const result of results) {
        // Check page space
        if (doc.y > doc.page.height - 160) {
          doc.addPage();
          doc.y = 50;
        }

        doc.y += 8;

        // Result header bar
        const statusColor = result.passed ? COLORS.pass : COLORS.fail;
        const statusLabel = result.passed ? '✓ PASS' : '✗ FAIL';

        doc.roundedRect(50, doc.y, pageWidth, 26, 4).fill(statusColor);
        doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold')
          .text(statusLabel, 60, doc.y + 7);
        doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold')
          .text(result.name, 120, doc.y + 7);

        // Response info on right
        if (result.response) {
          const info = `${result.response.method || 'GET'} ${result.response.status} • ${result.response.responseTime}ms`;
          doc.fontSize(8).fillColor('#ffffffcc').font('Helvetica')
            .text(info, 60, doc.y + 8, { width: pageWidth - 20, align: 'right' });
        }

        doc.y += 32;

        // URL
        if (result.response?.url) {
          doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica')
            .text(result.response.url, 60, doc.y, { width: pageWidth - 20 });
          doc.y += 14;
        }

        // Error message
        if (result.error) {
          doc.fontSize(9).fillColor(COLORS.fail).font('Helvetica')
            .text(`Error: ${result.error}`, 60, doc.y, { width: pageWidth - 20 });
          doc.y += doc.heightOfString(`Error: ${result.error}`, { width: pageWidth - 20, fontSize: 9 }) + 6;
        }

        // Assertions
        if (result.assertions && result.assertions.length > 0) {
          for (const assertion of result.assertions) {
            if (doc.y > doc.page.height - 80) {
              doc.addPage();
              doc.y = 50;
            }

            const aColor = assertion.passed ? COLORS.pass : COLORS.fail;
            const aIcon = assertion.passed ? '✓' : '✗';

            doc.fontSize(8).fillColor(aColor).font('Helvetica-Bold')
              .text(aIcon, 65, doc.y);
            doc.fontSize(8).fillColor(COLORS.dark).font('Helvetica')
              .text(assertion.description, 80, doc.y, { width: pageWidth - 45 });
            doc.y += 14;

            if (!assertion.passed) {
              doc.fontSize(7).fillColor(COLORS.gray).font('Helvetica')
                .text(`Expected: ${JSON.stringify(assertion.expected)}  |  Got: ${JSON.stringify(assertion.actual)}`, 80, doc.y, { width: pageWidth - 45 });
              doc.y += 12;
            }
          }
        }

        doc.y += 4;

        // Separator line
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y)
          .strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
        doc.y += 4;
      }

      // ─── Footer on every page ───
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 35;
        doc.fontSize(7).fillColor(COLORS.gray).font('Helvetica')
          .text(
            `Generated by mpx-api v${pkg.version} on ${now}`,
            50, footerY, { width: pageWidth, align: 'center' }
          );
        doc.text(
          `Page ${i + 1} of ${range.count}`,
          50, footerY + 12, { width: pageWidth, align: 'center' }
        );
      }

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
