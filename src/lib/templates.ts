export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  // B-09: Template gallery metadata
  defaultColor: string;
  category: string;
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
  { id: 'minimal-executive', name: 'Minimal Executive', description: 'Clean, professional, and understated.', defaultColor: '#6366f1', category: 'Business', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'corporate-classic', name: 'Corporate Classic', description: 'Traditional business layout.', defaultColor: '#1e40af', category: 'Corporate', styles: { fontFamily: 'font-serif', headerLayout: 'row', borderRadius: '4px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'modern-startup', name: 'Modern Startup', description: 'Bold and clear for modern tech.', defaultColor: '#7c3aed', category: 'Tech', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '8px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'dark-mode-tech', name: 'Dark Mode Tech', description: 'Sleek dark theme for developers.', defaultColor: '#22d3ee', category: 'Tech', styles: { fontFamily: 'font-mono', headerLayout: 'split', borderRadius: '4px', tableStyle: 'minimal', accentStyle: 'solid' } },
  { id: 'neon-creative', name: 'Neon Creative', description: 'Vibrant and energetic.', defaultColor: '#f43f5e', category: 'Creative', styles: { fontFamily: 'font-sans', headerLayout: 'row-reverse', borderRadius: '16px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'legal-standard', name: 'Legal Standard', description: 'Formal and structured.', defaultColor: '#374151', category: 'Legal', styles: { fontFamily: 'font-serif', headerLayout: 'col', borderRadius: '0px', tableStyle: 'bordered', accentStyle: 'none' } },
  { id: 'freelance-bold', name: 'Freelance Bold', description: 'Expressive and personalized.', defaultColor: '#f97316', category: 'Freelance', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '12px', tableStyle: 'striped', accentStyle: 'solid' } },
  { id: 'elegant-serif', name: 'Elegant Serif', description: 'Luxurious and refined.', defaultColor: '#a16207', category: 'Luxury', styles: { fontFamily: 'font-serif', headerLayout: 'row', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'architect-blueprint', name: 'Architect Blueprint', description: 'Technical and precise.', defaultColor: '#0ea5e9', category: 'Engineering', styles: { fontFamily: 'font-mono', headerLayout: 'split', borderRadius: '0px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'agency-pro', name: 'Agency Pro', description: 'High visual impact.', defaultColor: '#8b5cf6', category: 'Agency', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '6px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'retail-receipt', name: 'Retail Receipt', description: 'Simple, itemized focus.', defaultColor: '#64748b', category: 'Retail', styles: { fontFamily: 'font-mono', headerLayout: 'col', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'medical-billing', name: 'Medical Billing', description: 'Trustworthy and clear.', defaultColor: '#10b981', category: 'Healthcare', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '4px', tableStyle: 'striped', accentStyle: 'solid' } },
  { id: 'construction-heavy', name: 'Construction Heavy', description: 'Bold and industrial.', defaultColor: '#d97706', category: 'Construction', styles: { fontFamily: 'font-sans', headerLayout: 'row', borderRadius: '0px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'photo-studio', name: 'Photo Studio', description: 'Visual-first and minimalist.', defaultColor: '#ec4899', category: 'Creative', styles: { fontFamily: 'font-sans', headerLayout: 'row-reverse', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'education-academic', name: 'Academic', description: 'Structured and legible.', defaultColor: '#059669', category: 'Education', styles: { fontFamily: 'font-serif', headerLayout: 'split', borderRadius: '2px', tableStyle: 'bordered', accentStyle: 'solid' } },
  { id: 'nonprofit-care', name: 'Nonprofit Care', description: 'Warm and inviting.', defaultColor: '#14b8a6', category: 'Nonprofit', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '16px', tableStyle: 'minimal', accentStyle: 'solid' } },
  { id: 'event-glamour', name: 'Event Glamour', description: 'High-end events.', defaultColor: '#a855f7', category: 'Events', styles: { fontFamily: 'font-sans', headerLayout: 'row', borderRadius: '8px', tableStyle: 'modern', accentStyle: 'gradient' } },
  { id: 'consulting-pro', name: 'Consulting Pro', description: 'Focus on strategy.', defaultColor: '#475569', category: 'Consulting', styles: { fontFamily: 'font-sans', headerLayout: 'split', borderRadius: '0px', tableStyle: 'minimal', accentStyle: 'none' } },
  { id: 'logistics-freight', name: 'Logistics', description: 'Data-dense and tabular.', defaultColor: '#0284c7', category: 'Logistics', styles: { fontFamily: 'font-mono', headerLayout: 'col', borderRadius: '0px', tableStyle: 'striped', accentStyle: 'solid' } },
  { id: 'retro-80s', name: 'Retro 80s', description: 'Fun, nostalgic vibes.', defaultColor: '#e11d48', category: 'Creative', styles: { fontFamily: 'font-mono', headerLayout: 'row-reverse', borderRadius: '8px', tableStyle: 'bordered', accentStyle: 'gradient' } },
];
