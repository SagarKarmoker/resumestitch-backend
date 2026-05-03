import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface ResumeData {
  name?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    linkedin?: string;
    location?: string;
  };
  summary?: string;
  experience?: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
  }>;
  skills?: string[];
  certifications?: string[];
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateResumePdf(data: ResumeData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ────────────────────────────────────────────────────────────
      if (data.name) {
        doc.fontSize(20).font('Helvetica-Bold').text(data.name, { align: 'center' });
        doc.moveDown(0.3);
      }

      if (data.contactInfo) {
        const parts = [
          data.contactInfo.email,
          data.contactInfo.phone,
          data.contactInfo.linkedin,
          data.contactInfo.location,
        ].filter(Boolean);

        doc.fontSize(9).font('Helvetica').fillColor('#555555')
          .text(parts.join('  ·  '), { align: 'center' });
        doc.fillColor('#000000');
      }

      const divider = () => {
        doc.moveDown(0.5)
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .strokeColor('#cccccc')
          .lineWidth(0.5)
          .stroke()
          .moveDown(0.5);
      };

      const sectionHeader = (title: string) => {
        divider();
        doc.fontSize(11).font('Helvetica-Bold').text(title.toUpperCase());
        doc.moveDown(0.4);
      };

      // ── Summary ───────────────────────────────────────────────────────────
      if (data.summary) {
        sectionHeader('Summary');
        doc.fontSize(10).font('Helvetica').text(data.summary, { align: 'justify' });
      }

      // ── Experience ────────────────────────────────────────────────────────
      if (data.experience?.length) {
        sectionHeader('Experience');
        for (const exp of data.experience) {
          doc.fontSize(11).font('Helvetica-Bold').text(exp.title, { continued: true });
          doc.font('Helvetica').fontSize(10).fillColor('#555555')
            .text(`  ·  ${exp.company}  ·  ${exp.startDate} – ${exp.endDate}`);
          doc.fillColor('#000000').moveDown(0.2);

          for (const bullet of exp.bullets) {
            doc.fontSize(10).font('Helvetica')
              .text(`• ${bullet}`, { indent: 10 });
          }
          doc.moveDown(0.5);
        }
      }

      // ── Education ─────────────────────────────────────────────────────────
      if (data.education?.length) {
        sectionHeader('Education');
        for (const edu of data.education) {
          doc.fontSize(11).font('Helvetica-Bold').text(edu.institution, { continued: true });
          doc.font('Helvetica').fontSize(10).fillColor('#555555')
            .text(`  ·  ${edu.degree} in ${edu.field}  ·  ${edu.graduationDate}`);
          doc.fillColor('#000000').moveDown(0.4);
        }
      }

      // ── Skills ────────────────────────────────────────────────────────────
      if (data.skills?.length) {
        sectionHeader('Skills');
        doc.fontSize(10).font('Helvetica').text(data.skills.join('  ·  '), { align: 'justify' });
      }

      // ── Certifications ────────────────────────────────────────────────────
      if (data.certifications?.length) {
        sectionHeader('Certifications');
        for (const cert of data.certifications) {
          doc.fontSize(10).font('Helvetica').text(`• ${cert}`);
        }
      }

      doc.end();
    });
  }

  async generateCoverLetterPdf(body: string, name?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (name) {
        doc.fontSize(13).font('Helvetica-Bold').text(name);
        doc.moveDown(1);
      }

      doc.fontSize(10).font('Helvetica').text(body, { align: 'justify', lineGap: 4 });
      doc.end();
    });
  }

  async generateEmailPdf(subject: string, body: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(13).font('Helvetica-Bold').text('Subject: ' + subject);
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica').text(body, { align: 'justify', lineGap: 4 });
      doc.end();
    });
  }

  bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
