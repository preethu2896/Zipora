type ComparisonGuidance = {
  description: string;
  heading: string;
  example: string;
  question: string;
  answer: string;
};

export const comparisonGuidance: Record<string, ComparisonGuidance> = {
  'zipora-vs-smallpdf': {
    description: "Compare the PDF merge workflow and free access on Zipora and Smallpdf, including how each handles selected files.",
    heading: "Join a report and an appendix",
    example: "Start with two unlocked PDFs. Compare the file order, total page count and resulting download. Then check whether your next step needs a feature outside Zipora’s merger.",
    question: "Can I rearrange documents before merging?",
    answer: "Yes. In Zipora, use the arrows to move whole documents. Pages inside each source keep their original order.",
  },
  'zipora-vs-iloveimg': {
    description: "Compare image quality controls and pixel resizing on Zipora and iLoveIMG, with an example that checks both dimensions and bytes.",
    heading: "Prepare a photo for a width and size limit",
    example: "Resize a copy to the required pixel width, then compare the original and downloaded byte sizes. If it is still too large, compress the resized image and check fine detail at the size the recipient will see.",
    question: "Can I choose image quality separately from width?",
    answer: "Yes. Resize Image sets the dimensions. Use Image Compressor for a separate quality and format choice, then check both dimensions and bytes.",
  },
  'zipora-vs-tinypng': {
    description: "Compare Zipora and TinyPNG for a transparent logo, a web image and an upload with a fixed byte limit.",
    heading: "Optimize a transparent website logo",
    example: "Start with the same PNG. Check transparency against a dark background and compare bytes at the same dimensions. If the receiver insists on JPEG under a fixed cap, consider whether a white background is acceptable before using a Zipora size preset.",
    question: "Can the 20 KB preset keep transparency?",
    answer: "The preset produces JPEG with a white background. Choose PNG or WebP in the general Image Compressor if the logo needs transparency.",
  },
  'zipora-vs-pdf24': {
    description: "Compare Zipora’s browser PDF tools with PDF24’s online and desktop workflows for merging and exporting pages.",
    heading: "Choose a workflow for a document with offline restrictions",
    example: "Use an unlocked sample to compare page order after merging. If the document owner requires an offline application, check PDF24’s desktop workflow and system requirements separately from its online service.",
    question: "Can Zipora export a merged PDF as page images?",
    answer: "Yes. Download the merged file first, then use PDF to JPG to export one image per page. Save a single page or a numbered ZIP.",
  },
  'zipora-vs-sejda': {
    description: "Compare Zipora and Sejda for extracting PDF pages, reducing file size and checking how the web and desktop versions differ.",
    heading: "Extract a chapter before compressing it",
    example: "Extract only the pages the recipient needs. Test text selection on the smaller document after compression. Check the current limits for the exact web or desktop service you plan to use.",
    question: "Can I extract nonconsecutive pages into one PDF?",
    answer: "Yes. Use Extract pages in Zipora, select the pages, and enable Combine into one PDF.",
  },
  'zipora-vs-adobe-acrobat-online': {
    description: "Compare Zipora and Adobe Acrobat Online for combining PDFs and converting photos, with guidance on keeping the original document.",
    heading: "Build a PDF packet from receipts and a cover sheet",
    example: "Convert receipt photos to a PDF, then merge that output with the cover sheet. Check margins, order and page count. Check Acrobat’s official documentation if the packet needs editing or signing afterward.",
    question: "Will a merged PDF keep my digital signature valid?",
    answer: "A merge creates a new PDF. Keep the signed original and check the receiving organization’s requirements before modifying or submitting a copy.",
  },
  'zipora-vs-canva-background-remover': {
    description: "Compare browser-based background removal in Zipora with Canva’s design workspace. See how to keep transparency when resizing a cutout.",
    heading: "Prepare an image after a cutout",
    example: "Start with Zipora Remove Background to make a transparent PNG. Use Canva if you want to place the cutout into a design. If the export has transparency, keep PNG or choose WebP when compressing in Zipora. A JPEG export gives the image a white background.",
    question: "Can Zipora resize an existing transparent cutout?",
    answer: "Yes. Open the finished cutout in Resize Image and choose PNG output to retain transparency. Use Zipora Remove Background first if you still need to isolate the subject.",
  },
  'zipora-vs-photoroom': {
    description: "Compare Photoroom’s product-photo editing with Zipora’s resizing, compression and portrait print workflows.",
    heading: "Prepare an edited product image for a listing",
    example: "Finish the background and composition in your photo editor. Resize the final image for the listing’s pixel dimensions, then check file size. Use a copy so you retain the edited master.",
    question: "Does Passport Photo Maker replace a product-photo editor?",
    answer: "Passport Photo Maker frames portraits for supported photo sizes and print sheets. Product cutouts, staged backgrounds and listing graphics are different workflows.",
  },
  'zipora-vs-qrcode-monkey': {
    description: "Compare Zipora and QRCode Monkey for creating a static QR code, choosing a download format and testing the final scan.",
    heading: "Test a static QR code for a printed menu",
    example: "Generate both codes from the same final URL and place each at the planned print size. Check contrast and the clear border, then scan the print proof from the distance customers will use.",
    question: "Can I change a Zipora QR code’s destination after printing?",
    answer: "A static code encodes the original URL. If the URL itself must change, generate and print a new code. If you control the original URL, you can update the page it serves.",
  },
  'zipora-vs-compressjpeg': {
    description: "Compare Zipora and CompressJPEG for local JPEG compression, adjustable settings, batch output and fixed upload limits.",
    heading: "Compare a photo at the same dimensions",
    example: "Use copies of the same photo and compare texture, edges and output bytes at the same displayed size. A stricter Zipora size preset may also reduce dimensions, so record both the output size and pixel dimensions.",
    question: "Can both tools compress JPEGs locally?",
    answer: "Zipora processes JPEGs in the browser. CompressJPEG also describes local processing in its published privacy section. Compare the output controls and byte limits for the task you need.",
  },
};
