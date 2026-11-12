"""Create teacher-reviewable Word files from the reviewed lesson JSON files.

Install python-docx in your Python environment or pass --tools-dir PATH.
Run the Node build-chinese-lessons-7-10.mjs generator before this script.
"""
from pathlib import Path
import sys,json,argparse
from zipfile import ZipFile,ZIP_DEFLATED

parser=argparse.ArgumentParser();parser.add_argument('--tools-dir');args=parser.parse_args()
if args.tools_dir:sys.path.insert(0,str(Path(args.tools_dir).resolve()))
from docx import Document
from docx.shared import Inches,Pt
from docx.oxml.ns import qn

root=Path(__file__).resolve().parents[2];out=root/'tai-lieu/tieng-trung-bai-7-10'
def document():
    doc=Document();section=doc.sections[0]
    section.page_height=Inches(11.7);section.page_width=Inches(8.3)
    section.top_margin=section.bottom_margin=Inches(.6)
    section.left_margin=section.right_margin=Inches(.7)
    style=doc.styles['Normal'];style.font.name='Calibri';style.font.size=Pt(11)
    style.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Microsoft YaHei')
    style.paragraph_format.space_after=Pt(3)
    return doc

for number in [7,8,9,10]:
    pack=json.loads((out/f'du-lieu-bai-{number}.json').read_text(encoding='utf8'))
    bank=document()
    for line in (out/f'cau-hoi-tu-vung-tieng-trung-bai-{number}.txt').read_text(encoding='utf8').splitlines():
        paragraph=bank.add_paragraph(line)
        if line.startswith(('MÔN:','LỚP:','CHỦ ĐỀ:','Câu ','[')):
            for run in paragraph.runs:run.bold=True
        if line.startswith(('Câu ','A.','B.','C.','D.','Đáp án:','Lời giải:')):paragraph.paragraph_format.keep_with_next=True
    bank.save(out/f'cau-hoi-tu-vung-tieng-trung-bai-{number}.docx')
    vocab=document();vocab.add_heading(f'TỪ VỰNG — {pack["title"]}',0)
    vocab.add_paragraph('Đối chiếu PDF nguồn; số trang tính từ trang đầu của tệp. Từ chính và từ mở rộng được phân biệt để cô chọn phạm vi học.')
    for group,title in [('main','I. Từ chính'),('extended','II. Từ mở rộng và ôn tập')]:
        vocab.add_heading(title,1);table=vocab.add_table(rows=1,cols=5);table.style='Table Grid'
        for cell,value in zip(table.rows[0].cells,['STT','Chữ Hán','Pinyin','Nghĩa tiếng Việt','Trang PDF']):cell.text=value
        for index,word in enumerate([w for w in pack['vocabulary'] if w['group']==group],1):
            for cell,value in zip(table.add_row().cells,[str(index),word['hanzi'],word['pinyin'],word['meaning'],str(word['page'])]):cell.text=value
    vocab.save(out/f'tu-vung-tieng-trung-bai-{number}.docx')
    speaking=document();speaking.add_paragraph('MÔN: Tiếng Trung');speaking.add_paragraph('LỚP: HSK 1');speaking.add_paragraph(f'CHỦ ĐỀ: {pack["title"]}');speaking.add_paragraph('[LUYEN NOI]')
    for index,question in enumerate(pack['speaking'],1):
        speaking.add_paragraph(f'Câu {index}. {question["text"]}')
        speaking.add_paragraph('Nghĩa: '+question['meaning'])
        speaking.add_paragraph('Đáp án tham khảo: '+question['answer_reference'])
        speaking.add_paragraph('Tiêu chí chấm: '+question['assessment_notes'])
    speaking.save(out/f'luyen-noi-bai-{number}.docx')
    print(json.dumps({'lesson':number,'word_files':3,'vocabulary':len(pack['vocabulary']),'questions':len(pack['questions']),'speaking':len(pack['speaking'])}))
with ZipFile(out.parent/'tieng-trung-bai-7-10.zip','w',ZIP_DEFLATED) as archive:
    for file in sorted(out.iterdir()):
        if file.is_file():archive.write(file,file.name)
