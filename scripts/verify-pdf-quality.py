"""Inspect saved browser downloads independently of the website's status text."""
from pathlib import Path
import json
import shutil
import subprocess
from pypdf import PdfReader
import pymupdf as fitz

folder=Path('research/pdf-quality')
source=PdfReader('tests/fixtures/readable-36-pages-2.5mb.pdf')
source_text=[page.extract_text() or '' for page in source.pages]
report=[]
for path in sorted(folder.glob('*.pdf')):
    reader=PdfReader(path)
    text=[page.extract_text() or '' for page in reader.pages]
    doc=fitz.open(path)
    images=[]
    for index,page in enumerate(doc):
        for image in page.get_image_info():
            x0,y0,x1,y1=image['bbox']
            images.append({'page':index+1,'width':image['width'],'height':image['height'],'dpi_x':image['width']*72/(x1-x0),'dpi_y':image['height']*72/(y1-y0)})
    note_path=path.with_suffix('.txt')
    note=note_path.read_text(encoding='utf-8') if note_path.exists() else ''
    raster='Image-based output' in note or path.name=='strong-one-page.pdf'
    if raster:
        assert images,path
        assert all(i['dpi_x']>=149.99 and i['dpi_y']>=149.99 for i in images),(path,images)
    else:
        assert len(text)==36,path
        assert all(f'page {i+1}' in page_text.lower() and 'Balanced keeps real selectable text' in page_text for i,page_text in enumerate(text)),path
        assert text==source_text,(path,'Selectable text changed')
    report.append({'file':str(path),'bytes':path.stat().st_size,'kb':round(path.stat().st_size/1024,2),'pages':len(text),'pages_with_text':sum(bool(t.strip()) for t in text),'text_characters':sum(map(len,text)),'raster_output':raster,'minimum_image_dpi':min((min(i['dpi_x'],i['dpi_y']) for i in images),default=None),'status':note})
    if path.name in ['compress-pdf.pdf','compress-pdf-to-100kb.pdf','strong-one-page.pdf']:
        # Rasterize actual downloads for visual review at a common inspection size.
        poppler=shutil.which('pdftoppm')
        if poppler:
            subprocess.run([poppler,'-f','1','-singlefile','-r','108','-png',str(path),str(path.with_suffix(''))],check=True,capture_output=True)
        else:
            doc[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).save(str(path.with_suffix('.png')))
    doc.close()
folder.joinpath('verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
for item in report:
    print(json.dumps({k:v for k,v in item.items() if k!='status'}))
