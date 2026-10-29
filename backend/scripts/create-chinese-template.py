"""Generate the downloadable Word import format. Python 3 standard library only."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from html import escape

def p(text):
    return '<w:p><w:r><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>'

def table(rows):
    return '<w:tbl>'+''.join('<w:tr>'+''.join('<w:tc>'+p(c)+'</w:tc>' for c in row)+'</w:tr>' for row in rows)+'</w:tbl>'

body = p('TTNAVA — Mẫu nhập Tiếng Trung (ví dụ định dạng, không tự đưa vào nội dung học).')
body += p('Giữ nguyên tiêu đề mục trong dấu []. Dùng bảng hoặc dấu | ngăn cột. Xóa phần hướng dẫn trước khi nhập. Mỗi dòng bảng là một mục; không gộp ô. Cột trống vẫn giữ vị trí.')
body += p('Từ vựng: Hanzi | Pinyin | Nghĩa | Từ loại | Ví dụ | Pinyin ví dụ | Nghĩa ví dụ | URL âm thanh | URL hình | Mẹo nhớ | Bộ thủ | main/extended.')
body += p('Câu hỏi: Type | Prompt | Options | Accepted | Explanation | Audio URL | Difficulty. Type: choice, text, pinyin, matching, ordering, listening, dictation, fill. Các lựa chọn hoặc đáp án thay thế ngăn bởi ;;. Đáp án choice/listening phải trùng nguyên văn một lựa chọn. Difficulty: easy, medium, hard. Câu hỏi cần được admin duyệt trước xuất bản.')
body += p('Ngữ pháp, hội thoại và bài đọc: mỗi đoạn dưới tiêu đề là một mục. Dữ liệu không nhận diện sẽ được giữ ở nhóm Chưa xác định để admin sửa hoặc chủ động xóa.')
body += p('[TU VUNG]')
body += table([['Hanzi','Pinyin','Nghĩa'],['你好','nǐ hǎo','Xin chào']])
body += p('[CAU HOI]')
body += table([['Type','Prompt','Options','Accepted','Explanation'],['choice','你好 có nghĩa là gì?','Xin chào;;Tạm biệt','Xin chào','Lời chào thông dụng.'],['pinyin','Gõ pinyin của 你好 (giữ dấu thanh)','','nǐ hǎo','']])
body += p('[NGU PHAP]') + p('你好 là lời chào.')
body += p('[HOI THOAI]') + p('A: 你好！ B: 你好！')
body += p('[BAI DOC]') + p('你好！')
document='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr/></w:body></w:document>'
target=Path(__file__).resolve().parents[2]/'frontend/assets/templates/chinese-template.docx'
target.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(target,'w',ZIP_DEFLATED) as out:
    out.writestr('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    out.writestr('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    out.writestr('word/document.xml',document)
print(target)
