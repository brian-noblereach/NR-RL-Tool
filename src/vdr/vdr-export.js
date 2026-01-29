// vdr-export.js - Export VDR to DOCX format
// Uses docx.js library loaded via CDN

/**
 * Generate and download DOCX file
 */
export async function generateDocx(vdr) {
  // Ensure docx library is loaded
  if (typeof docx === 'undefined') {
    throw new Error('DOCX library not loaded. Please check your internet connection.');
  }

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    LevelFormat,
    PageBreak
  } = docx;

  // Format dates
  const baselineDate = formatDateForDoc(vdr.baselineDate);
  const generatedDate = formatDateForDoc(vdr.generatedDate);
  
  // Build document filename
  const safeVentureName = vdr.ventureName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const filename = `VDR - ${safeVentureName} - ${generatedDate}.docx`;

  // Create document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24 // 12pt
          }
        }
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32, // 16pt
            bold: true,
            font: "Arial"
          },
          paragraph: {
            spacing: { before: 240, after: 240 },
            outlineLevel: 0
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28, // 14pt
            bold: true,
            font: "Arial"
          },
          paragraph: {
            spacing: { before: 200, after: 120 },
            outlineLevel: 1
          }
        }
      ]
    },
    numbering: {
      config: [
        {
          reference: "vdr-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240, // 8.5 inches in DXA
              height: 15840 // 11 inches in DXA
            },
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: buildDocumentContent(vdr, baselineDate, generatedDate)
      }
    ]
  });

  // Generate and download
  const buffer = await Packer.toBlob(doc);
  downloadBlob(buffer, filename);
}

/**
 * Build the document content array
 */
function buildDocumentContent(vdr, baselineDate, generatedDate) {
  const content = [];

  // Title
  content.push(
    new docx.Paragraph({
      heading: docx.HeadingLevel.HEADING_1,
      children: [
        new docx.TextRun({
          text: `VDR - ${vdr.ventureName} - ${generatedDate}`,
          bold: true
        })
      ]
    })
  );

  // Metadata section
  const metaParts = [];
  if (vdr.portfolio) {
    metaParts.push(`Portfolio: ${vdr.portfolio}`);
  }
  metaParts.push(`Baseline Date: ${baselineDate}`);
  if (vdr.advisorName) {
    metaParts.push(`Advisor: ${vdr.advisorName}`);
  }
  if (vdr.isHealthRelated) {
    metaParts.push(`Health-Related Venture`);
  }

  content.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: metaParts.join(' | '),
          size: 20, // 10pt
          italics: true
        })
      ],
      spacing: { after: 120 }
    })
  );

  // Summary
  content.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: `${vdr.categoriesWithGaps} categories with advancement goals • ${vdr.totalGap} total levels to advance`,
          size: 22 // 11pt
        })
      ],
      spacing: { after: 400 }
    })
  );

  // Add horizontal line (simulated with underscores or spacing)
  content.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: "─".repeat(80),
          size: 16,
          color: "CCCCCC"
        })
      ],
      spacing: { after: 200 }
    })
  );

  // Sections
  for (const section of vdr.sections) {
    // Category heading
    content.push(
      new docx.Paragraph({
        heading: docx.HeadingLevel.HEADING_2,
        children: [
          new docx.TextRun({
            text: `${section.category} (Current: ${section.baselineLevel} → Goal: ${section.goalLevel})`,
            bold: true
          })
        ],
        spacing: { before: 300, after: 120 }
      })
    );

    // Deliverables as bullet list
    for (const deliverable of section.deliverables) {
      content.push(
        new docx.Paragraph({
          numbering: {
            reference: "vdr-bullets",
            level: 0
          },
          children: [
            new docx.TextRun({
              text: deliverable,
              size: 24 // 12pt
            })
          ],
          spacing: { after: 80 }
        })
      );
    }

    // Add spacing after section
    content.push(
      new docx.Paragraph({
        children: [],
        spacing: { after: 200 }
      })
    );
  }

  // Footer
  content.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: "─".repeat(80),
          size: 16,
          color: "CCCCCC"
        })
      ],
      spacing: { before: 400, after: 120 }
    })
  );

  content.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: "Generated by NobleReach RL Goals & VDR Companion Tool",
          size: 18, // 9pt
          italics: true,
          color: "666666"
        })
      ]
    })
  );

  return content;
}

/**
 * Format date for document display
 */
function formatDateForDoc(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr.split('T')[0];
  }
}

/**
 * Download blob as file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
