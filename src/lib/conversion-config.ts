export type ToolKind = 'compress' | 'images' | 'extract';
export const conversionConfig = {
  compress: {
    title: 'Compress PDF', subtitle: 'Less file size. More room to share.', description: 'Optimize a PDF on your device, or choose stronger compression for image-heavy documents.',
    upload: 'Drop a PDF here', button: 'Select PDF', action: 'Compress PDF', output: 'zipora-compressed', accept: '.pdf,application/pdf',
    steps: [['Choose a PDF', 'Select one unlocked PDF up to 200 MB.'], ['Pick a method', 'Keep text with structural optimization, or use image-based compression for a smaller visual copy.'], ['Compare and save', 'Review the actual size change, then download your PDF.']],
    faqs: [['Will every PDF get smaller?', 'No. Already optimized PDFs may not shrink with structural optimization. We keep the original bytes if that method would make the file larger.'], ['What does strong compression change?', 'Balanced and Strong try progressively smaller page images, then compare against a text-preserving version and the original. Only the smallest version is returned. If the image-based version wins, selectable text, links, forms, bookmarks, attachments, and signatures are lost. Already optimized PDFs may not shrink further.'], ['Are my files uploaded?', 'No. Processing, size comparisons, and downloads happen on your device.'], ['Are there limits?', 'The input budget is 200 MB. Image-based compression supports up to 150 pages, with rendering capped at 16 megapixels per page. Low-memory devices may need smaller files.']],
  },
  images: {
    title: 'JPG to PDF', subtitle: 'Your photos. One finished document.', description: 'Arrange JPG and PNG images, choose a page size, and bring them together in a PDF.',
    upload: 'Drop your images here', button: 'Select images', action: 'Convert to PDF', output: 'zipora-images', accept: '.jpg,.jpeg,.png,image/jpeg,image/png',
    steps: [['Pick your images', 'Choose JPG or PNG files from your device.'], ['Arrange the pages', 'Use the arrows to choose the order, then set the paper size and margins.'], ['Save one PDF', 'Each image becomes one PDF page. Download the finished document.']],
    faqs: [['Which images can I use?', 'JPG, JPEG, and PNG are supported. Images must be valid, no more than 40 megapixels each, and no more than 200 MB combined.'], ['Can I change the page order?', 'Yes. Move images up or down before conversion. Each image becomes one page in that order.'], ['Will my pictures be cropped?', 'No. Images fit within the chosen page and margins without cropping or stretching. Original-size mode uses the image dimensions with no margins.'], ['Do I need an account?', 'No account, payment, or upload is required. Everything happens inside your browser.']],
  },
  extract: {
    title: 'PDF to JPG', subtitle: 'Every page, ready for its close-up.', description: 'Turn PDF pages into JPG images. One download: a JPG for one page, or a ZIP for the whole set.',
    upload: 'Drop a PDF here', button: 'Select PDF', action: 'Convert to JPG', output: 'zipora-pages', accept: '.pdf,application/pdf',
    steps: [['Choose your PDF', 'Select an unlocked PDF, up to 150 pages and 200 MB.'], ['Choose image quality', 'Pick the resolution and JPEG quality for your exported pages.'], ['Download your pages', 'Save a JPG for a one-page PDF, or a ZIP containing every page for a longer document.']],
    faqs: [['Does each page become a JPG?', 'Yes. Each PDF page becomes a separate JPG, numbered in its original order. This renders the full page rather than extracting embedded photos.'], ['Which download will I get?', 'For a single page, Download JPG saves the image directly. For multiple pages, Download all JPGs saves one ZIP containing every numbered page. There is only one download button.'], ['What happens to transparent areas?', 'Pages are rendered on a white background, because JPG does not support transparency.'], ['Why is my output resolution capped?', 'To protect mobile memory, each page is capped at 16 megapixels and 8192 pixels on either side. Up to 150 pages and 200 MB of image output are supported. Your device may require smaller batches.']],
  },
} as const;
