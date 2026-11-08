import { extraTools } from './extra-tools';
export const tools = [
  { href: '/merge-pdf/', name: 'Merge PDF', description: 'Arrange your documents. Save them as one.' },
  { href: '/split-pdf/', name: 'Split PDF', description: 'Separate ranges. Keep just the pages you need.' },
  { href: '/compress-pdf/', name: 'Compress PDF', description: 'A smaller document, ready to share.' },
  { href: '/jpg-to-pdf/', name: 'JPG to PDF', description: 'Turn your photos into one ordered PDF.' },
  { href: '/pdf-to-jpg/', name: 'PDF to JPG', description: 'Save each page as a shareable image.' },
  ...extraTools.map(tool=>({href:tool.slug==='image-resizer'?'/resize-image/':`/${tool.slug}/`,name:tool.slug==='image-resizer'?'Resize Image':tool.title,description:tool.description})),
];
