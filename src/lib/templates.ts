export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  styles: {
    fontFamily: string;
    headerLayout: 'row' | 'row-reverse' | 'col' | 'col-reverse' | 'split';
    primaryColor?: string; // override
    borderRadius: string;
    tableStyle: 'minimal' | 'striped' | 'bordered' | 'modern';
    watermark?: string;
    accentStyle: 'solid' | 'gradient' | 'none';
  };
}

export const TEMPLATES: InvoiceTemplate[] = [
  { id: 'minimal-executive', name: 'Minimal Executive', description: 'Clean, professional, and understated.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'corporate-classic', name: 'Corporate Classic', description: 'Traditional business layout.', styles: { fontFamily: 'font-serif', headerLayout: 'row', borderRadius: '4px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'modern-startup', name: 'Modern Startup', description: 'Bold and clear for modern tech.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '8px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'dark-mode-tech', name: 'Dark Mode Tech', description: 'Sleek dark theme for developers.', styles: { fontFamily: 'font-mono', headerLayout: 'split', borderRadius: '4px', tableStyle: 'minimal', accentStyle: 'solid' } },
  { id: 'neon-creative', name: 'Neon Creative', description: 'Vibrant and energetic.', styles: { fontFamily: 'font-sans', headerLayout: 'row-reverse', borderRadius: '16px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'legal-standard', name: 'Legal Standard', description: 'Formal and structured.', styles: { fontFamily: 'font-serif', headerLayout: 'col', borderRadius: '0px', tableStyle: 'bordered', accentStyle: 'none' } },
  { id: 'freelance-bold', name: 'Freelance Bold', description: 'Expressive and personalized.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '12px', tableStyle: 'striped', accentStyle: 'solid' } },
  { id: 'elegant-serif', name: 'Elegant Serif', description: 'Luxurious and refined.', styles: { fontFamily: 'font-serif', headerLayout: 'row', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'architect-blueprint', name: 'Architect Blueprint', description: 'Technical and precise.', styles: { fontFamily: 'font-mono', headerLayout: 'split', borderRadius: '0px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'agency-pro', name: 'Agency Pro', description: 'High visual impact.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '6px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'retail-receipt', name: 'Retail Receipt', description: 'Simple, itemized focus.', styles: { fontFamily: 'font-mono', headerLayout: 'col', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'medical-billing', name: 'Medical Billing', description: 'Trustworthy and clear.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '4px', tableStyle: 'striped', accentStyle: 'solid' } },
  { id: 'construction-heavy', name: 'Construction Heavy', description: 'Bold and industrial.', styles: { fontFamily: 'font-sans', headerLayout: 'row', borderRadius: '0px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'photo-studio', name: 'Photo Studio', description: 'Visual-first and minimalist.', styles: { fontFamily: 'font-sans', headerLayout: 'row-reverse', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'education-academic', name: 'Academic', description: 'Structured and legible.', styles: { fontFamily: 'font-serif', headerLayout: 'split', borderRadius: '2px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'nonprofit-care', name: 'Nonprofit Care', description: 'Warm and inviting.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '16px', tableStyle: 'minimal', accentStyle: 'solid' } },
  { id: 'event-glamour', name: 'Event Glamour', description: 'High-end events.', styles: { fontFamily: 'font-sans', headerLayout: 'row', borderRadius: '8px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'consulting-pro', name: 'Consulting Pro', description: 'Focus on strategy.', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'logistics-freight', name: 'Logistics', description: 'Data-dense and tabular.', styles: { fontFamily: 'font-mono', headerLayout: 'col', borderRadius: '0px', tableStyle: 'striped', accentStyle: 'solid' } },
  { id: 'retro-80s', name: 'Retro 80s', description: 'Fun, nostalgic vibes.', styles: { fontFamily: 'font-mono', headerLayout: 'row-reverse', borderRadius: '8px', tableStyle: 'bordered', accentStyle: 'gradient' } },
];
