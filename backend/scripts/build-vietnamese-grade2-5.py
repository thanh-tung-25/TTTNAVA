"""Original supplemental exercises, indexed by verified KNTT lessons.

No textbook reading is reconstructed from its title. Every comprehension
question contains its original supplementary passage, including in exams.
"""
import importlib.util
import json
import random
import hashlib
import zipfile
import sys
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('tv1',Path(__file__).with_name('build-vietnamese-grade1.py'))
tv=importlib.util.module_from_spec(spec);spec.loader.exec_module(tv)
OUT=ROOT/'tai-lieu/tieng-viet-lop-2-den-5-50-cau'

# setting, object, helpful action, reason, result, feeling, takeaway, title.
SCENES=[
 ('thư viện trường','một cuốn truyện tranh','chia sẻ sách với bạn','bạn chưa có sách để đọc','hai bạn cùng đọc hết một câu chuyện','vui vì có người bạn cùng đọc','biết chia sẻ sách với bạn','Cuốn truyện được sẻ chia'),
 ('sân trường','một quả bóng','rủ bạn mới cùng chơi','bạn mới còn đứng một mình','bạn mới mỉm cười và tham gia trò chơi','vui vì giúp bạn hòa nhập','biết quan tâm đến bạn mới','Người bạn mới'),
 ('lớp học','một hộp bút màu','lắng nghe ý tưởng của bạn','cả nhóm cần thống nhất cách vẽ','nhóm hoàn thành bức tranh chung','tự hào về tinh thần hợp tác','biết lắng nghe và hợp tác','Bức tranh của nhóm'),
 ('góc học tập','một tờ thời khóa biểu','xếp sách theo lịch học','ngày mai có những môn học khác hôm nay','chiếc cặp có đủ sách cần dùng','yên tâm vì đã chuẩn bị xong','biết chuẩn bị đồ dùng học tập','Chiếc cặp sẵn sàng'),
 ('vườn nhà','một bình tưới nhỏ','tưới nước quanh gốc cây','đất quanh gốc đã khô','đất quanh gốc cây được làm ẩm','vui khi chăm sóc được cây','biết chăm sóc cây xanh','Bình tưới nhỏ'),
 ('sân nhà','một chiếc hộp giấy','làm một món đồ chơi từ giấy cũ','giấy còn sạch có thể được dùng lại','chiếc hộp trở thành một chiếc xe đồ chơi','thích thú vì tự làm được đồ chơi','biết sáng tạo và tiết kiệm','Chiếc xe từ hộp giấy'),
 ('phòng khách','một cuốn album','nghe bà kể chuyện gia đình','hai bạn muốn hiểu thêm về người thân','những bức ảnh có thêm lời kể gần gũi','ấm áp khi nghe chuyện về gia đình','biết lắng nghe và quý trọng người thân','Chuyện trong cuốn album'),
 ('bàn ăn','một rổ rau','giúp mẹ nhặt rau','mẹ đang bận chuẩn bị bữa tối','rổ rau được nhặt sạch','vui vì làm được việc vừa sức','biết chia sẻ công việc gia đình','Bữa cơm có phần việc của em'),
 ('công viên','một túi giấy','nhặt giấy vụn bỏ vào thùng rác','lối đi đang có nhiều giấy vụn','lối đi trở nên sạch hơn','vui khi thấy công viên sạch','biết giữ gìn nơi công cộng','Lối đi sạch sẽ'),
 ('bờ ao cùng người lớn','một cuốn sổ nhỏ','ghi lại hình ảnh chim trên cành','hai bạn muốn nhớ điều vừa quan sát','trang sổ có hình vẽ và ghi chú về chim','thích thú trước thiên nhiên','biết quan sát và ghi chép','Trang sổ bên bờ ao'),
 ('vườn hoa','một chiếc máy ảnh đồ chơi','đứng ngắm hoa mà không hái','hoa cần được giữ lại cho mọi người cùng ngắm','những bông hoa vẫn nguyên vẹn trên cây','vui vì đã giữ được vẻ đẹp chung','biết yêu quý hoa và cây','Ngắm hoa trong vườn'),
 ('bãi biển cùng cô giáo','một chiếc giỏ nhỏ','thu gom vỏ chai bị bỏ lại','rác đang nằm trên bãi cát','một khoảng bờ biển được dọn sạch','vui khi góp phần bảo vệ biển','biết bảo vệ môi trường biển','Chiếc giỏ bên bờ biển'),
 ('góc đọc sách','một tấm thiệp','viết lời cảm ơn cô giáo','cô đã kiên nhẫn giúp cả nhóm học đọc','tấm thiệp có những lời cảm ơn chân thành','biết ơn người đã giúp mình','biết bày tỏ lòng biết ơn','Tấm thiệp nhỏ'),
 ('nhà văn hóa','một tờ giấy ghi chép','nghe người thợ giới thiệu nghề làm gốm','hai bạn muốn biết chiếc bình được làm ra thế nào','hai bạn ghi được các bước tạo hình chiếc bình','khâm phục sự khéo léo của người thợ','biết quý trọng công sức lao động','Gặp người thợ gốm'),
 ('sân trường trong giờ sinh hoạt','một tập tranh','giới thiệu tranh về quê hương','cả lớp đang cùng tìm hiểu nơi mình sống','các bạn biết thêm những cảnh đẹp gần nhà','tự hào về quê hương','biết chia sẻ điều tốt đẹp về quê hương','Quê hương qua tranh vẽ'),
 ('phòng truyền thống của trường','một cuốn sổ tay','ghi lại lời giới thiệu của cô giáo','hai bạn muốn nhớ câu chuyện về người đi trước','cuốn sổ có thêm một trang ghi chép','biết ơn những người góp sức cho quê hương','biết tìm hiểu và trân trọng quá khứ','Một trang ghi chép'),
 ('sân chơi','một chiếc ví nhặt được','mang chiếc ví đến chỗ bác bảo vệ','chủ nhân của chiếc ví có thể đang tìm nó','người làm rơi được bác bảo vệ báo đến nhận ví','nhẹ nhõm vì đã làm điều đúng','biết trung thực với đồ nhặt được','Chiếc ví trên sân'),
 ('góc học tập của nhóm','một mô hình giấy','thử lại cách ghép các bộ phận','lần ghép đầu chưa thành công','mô hình đứng vững sau khi được sửa','tự tin hơn nhờ kiên trì','biết kiên trì khi gặp khó khăn','Mô hình đứng vững'),
 ('sân trường ngày hội','một chiếc micro','nói chậm và rõ khi giới thiệu tiết mục','các bạn phía dưới cần nghe được lời giới thiệu','mọi người nghe rõ tên tiết mục tiếp theo','tự tin hơn trước đám đông','biết chuẩn bị và giao tiếp rõ ràng','Lời giới thiệu trong ngày hội'),
 ('trạm quan sát thời tiết của trường','một bảng ghi chép','đối chiếu các lần quan sát bầu trời','hai bạn muốn trình bày thông tin chính xác','bảng ghi chép được sửa cho rõ hơn','hài lòng vì thông tin dễ hiểu','biết kiểm tra thông tin trước khi trình bày','Bảng ghi chép bầu trời'),
 ('góc đọc sách về biển đảo','một tấm bản đồ','tìm các địa danh theo lời hướng dẫn','hai bạn muốn hiểu thêm về đất nước','những địa danh vừa tìm được đánh dấu trong sổ','háo hức muốn học thêm','biết tìm hiểu đất nước qua bản đồ','Tìm địa danh trên bản đồ'),
 ('phòng học','một chậu cây nhỏ','nhường phần thuyết trình cho bạn cùng nhóm','bạn cũng đã chuẩn bị rất chu đáo','cả hai đều có cơ hội trình bày','vui khi bạn được thể hiện khả năng','biết tôn trọng đóng góp của mỗi người','Ai cũng có phần việc'),
 ('sân khấu của lớp','một con rối giấy','động viên bạn thử lại lời thoại','bạn quên lời trong lần tập đầu','bạn đọc được lời thoại ở lần tập tiếp theo','mừng vì bạn lấy lại tự tin','biết động viên khi bạn gặp khó khăn','Lần tập tiếp theo'),
 ('vườn rau của trường','một chiếc thước nhỏ','đo rồi ghi chiều cao cây','nhóm muốn theo dõi sự lớn lên của cây','bảng theo dõi có số đo của ngày hôm đó','thích thú với việc quan sát cây lớn','biết quan sát có ghi chép','Cây lớn từng ngày'),
 ('góc trải nghiệm','một tờ hướng dẫn','đọc kĩ từng bước trước khi làm','nhóm muốn thực hiện đúng thao tác','sản phẩm được hoàn thành theo hướng dẫn','yên tâm vì đã làm cẩn thận','biết đọc hướng dẫn trước khi thực hiện','Làm theo từng bước'),
 ('sân nhà sau cơn mưa','một chiếc lá rụng','quan sát giọt nước trên lá','ánh sáng làm giọt nước trở nên nổi bật','hai bạn vẽ lại điều vừa nhìn thấy','ngạc nhiên trước vẻ đẹp nhỏ bé','biết khám phá vẻ đẹp từ điều gần gũi','Giọt nước trên lá'),
 ('thư viện','một tập sách giới thiệu nghề nghiệp','tra cứu ý nghĩa một từ mới','hai bạn chưa hiểu từ ấy trong bài đọc','cả hai giải thích được từ bằng lời của mình','vui vì hiểu thêm một điều mới','biết chủ động tìm hiểu điều chưa rõ','Từ mới trong trang sách'),
 ('nhà văn hóa trong buổi giao lưu','một tờ giấy giới thiệu','hỏi bạn về trò chơi ở quê bạn','hai bạn muốn hiểu những nét riêng của nhau','cuộc trò chuyện có thêm nhiều điều thú vị','vui vì được biết thêm một người bạn','biết tôn trọng sự khác biệt','Câu chuyện trong buổi giao lưu'),
 ('phòng học','một bản kế hoạch nhỏ','chia công việc phù hợp cho từng bạn','nhóm muốn ai cũng tham gia được','mỗi thành viên đều nhận một việc vừa sức','tin tưởng vào sức mạnh của tập thể','biết phân công và hợp tác','Bản kế hoạch của nhóm'),
 ('góc sáng tạo','một bức vẽ phong cảnh','bổ sung chi tiết sau khi nghe góp ý','bức vẽ ban đầu chưa thể hiện rõ ý tưởng','bức vẽ có thêm nét riêng và rõ ý hơn','vui vì học được từ góp ý của bạn','biết tiếp nhận góp ý để tiến bộ','Bức vẽ được hoàn thiện'),
 ('sân trường','một cuốn sách cần trả','đến đúng nơi hẹn để trả sách','bạn đã hẹn sẽ nhận lại sách hôm nay','cuốn sách được trả đúng lời hứa','thoải mái vì giữ được lời hứa','biết có trách nhiệm với lời hứa','Cuốn sách đến đúng hẹn'),
 ('thư viện trong buổi giới thiệu sách','một tờ phiếu đọc','ghi rõ tên sách và điều mình thích','các bạn khác cần biết cuốn sách nói về điều gì','tờ phiếu giúp một bạn chọn được sách muốn đọc','vui khi giới thiệu được sách hay','biết chia sẻ thông tin đọc sách','Tờ phiếu giới thiệu sách'),
]

NAMES=['An','Bình','Chi','Hà','Lan','Mai','Minh','Nam','Ngọc','Phúc','Huy','Linh']
BAD=['giấu đồ dùng của bạn','làm hỏng sản phẩm chung','bỏ dở mọi việc','chê cười người gặp khó khăn']

def scene_index(title,chapter,order):
 text=(title+' '+chapter).lower()
 for keys,ids in [(['sách','thư viện','chữ','học sinh','học tập'],[0,3,26,31]),(['mẹ','bố','ông','bà','gia đình','ngưỡng cửa','em tôi'],[6,7,12]),(['biển','đảo','trường sa'],[11,20]),(['rừng','cây','hoa','mùa','nắng','mưa','thiên nhiên'],[4,9,10,23,25]),(['bạn','cộng đồng','yêu thương'],[1,2,16,21,22,27]),(['nghề','thợ','nghệ','sáng tạo','nhạc','vẽ'],[5,13,17,18,29]),(['quê','đất nước','lịch sử','cha ông','ngàn năm'],[14,15,20]),(['khám phá','kì thú','hành tinh','thế giới'],[9,19,24,27])]:
  if any(re.search(r'(?<!\w)'+re.escape(k)+r'(?!\w)',text) for k in keys):return ids[order%len(ids)]
 return order%len(SCENES)

def story(idx,r,grade):
 place,obj,action,reason,result,emotion,message,title=SCENES[idx]
 a,b=r.sample(NAMES,2);time=r.choice(['Sáng thứ Bảy','Chiều thứ Sáu','Một buổi sáng','Một buổi chiều'])
 sentences=[f'{time}, {a} cùng {b} đến {place}.',f'Hai bạn mang theo {obj}.',f'{a} {action} vì {reason}.',f'Sau đó, {result}.',f'{a} cảm thấy {emotion}.']
 if grade>=3:sentences.insert(2,'Hai bạn trao đổi để hiểu việc cần làm trước khi bắt đầu.')
 if grade>=4:sentences.append('Trên đường về, hai bạn kể lại từng việc để nhớ bài học từ trải nghiệm ấy.')
 if grade>=5:sentences.append('Qua trải nghiệm này, cả hai hiểu rằng một hành động nhỏ cũng có thể đem lại điều có ích.')
 return dict(text=' '.join(sentences),a=a,b=b,time=time,place=place,obj=obj,action=action,reason=reason,result=result,emotion=emotion,message=message,title=title)

def question(prompt,answer,wrongs,why,r,fill=False):
 return tv.make_question(prompt,answer,wrongs,why,r,fill)

def reading(s,mode,r,grade):
 prefix='Đọc ngữ liệu bổ trợ tự soạn: “'+s['text']+'” '
 def Q(p,a,w,e,fill=False):return question(prefix+p,a,w,e,r,fill)
 other=[x for x in SCENES if x[0]!=s['place']]
 if mode==0:return Q('Sự việc mở đầu diễn ra vào thời gian nào?',s['time'],['Vào nửa đêm','Sáng Chủ nhật','Tối thứ Hai'],'Câu mở đầu ghi thời gian: '+s['time']+'.')
 if mode==1:return Q('Hai bạn đến đâu?',s['place'],[x[0] for x in other],f'Câu mở đầu cho biết hai bạn đến {s["place"]}.')
 if mode==2:return Q(f'Ai đi cùng {s["a"]}?',s['b'],[n for n in NAMES if n not in [s['a'],s['b']]],f'Câu đầu nhắc tới {s["a"]} và {s["b"]}.',fill=True)
 if mode==3:return Q('Hai bạn mang theo vật gì?',s['obj'],[x[1] for x in other if x[1]!=s['obj']],'Đoạn văn nêu rõ vật hai bạn mang theo là '+s['obj']+'.')
 if mode==4:return Q(f'{s["a"]} đã làm việc gì?',s['action'],[x[2] for x in other if x[2]!=s['action']],f'Đoạn văn kể: {s["a"]} {s["action"]}.')
 if mode==5:return Q(f'Vì sao {s["a"]} thực hiện việc đó?',s['reason'],[x[3] for x in other if x[3]!=s['reason']],'Từ “vì” dẫn ra lí do: '+s['reason']+'.')
 if mode==6:return Q('Kết quả được nêu sau từ “Sau đó” là gì?',s['result'],[x[4] for x in other if x[4]!=s['result']],'Đoạn văn nêu kết quả: '+s['result']+'.')
 if mode==7:return Q(f'Cảm xúc nào của {s["a"]} được nói rõ trong đoạn?',s['emotion'],['tức giận vì bị giành đồ','buồn vì không có ai giúp','thất vọng vì bỏ cuộc giữa chừng'],'Cụm sau “cảm thấy” cho biết cảm xúc: '+s['emotion']+'.')
 if mode==8:return Q('Việc làm trong đoạn gợi cho em bài học nào?',s['message'],BAD,'Việc '+s['action']+' thể hiện '+s['message']+'.')
 return Q('Nhan đề nào phù hợp nhất với sự việc chính trong đoạn?',s['title'],[x[7] for x in other if x[7]!=s['title']],'Nhan đề này gắn trực tiếp với việc '+s['action']+' và kết quả của việc đó.')

# actor, noun phrase, verb, adjective: unambiguous minimal sentences.
ROWS=[('Lan','bông hoa','ngắm','đẹp'),('Nam','cuốn sách','đọc','hay'),('Bình','cây non','tưới','xanh'),('Mai','bức tranh','vẽ','đẹp'),('An','quả bóng','ném','tròn'),('Hà','chiếc khăn','giặt','sạch'),('Minh','chiếc bàn','lau','sạch'),('Ngọc','chiếc hộp','gấp','nhỏ'),('Phúc','bài hát','hát','vui'),('Chi','bài thơ','đọc','hay'),('Huy','món quà','gói','đẹp'),('Linh','con mèo','ngắm','nhỏ')]
SYN=[('chăm chỉ','siêng năng','lười biếng'),('dũng cảm','can đảm','nhút nhát'),('rộng lớn','bao la','nhỏ hẹp'),('vui vẻ','vui tươi','buồn bã')]

def grammar(grade,sem,index,offset,r):
 name,noun,verb,adj=ROWS[(offset+index//5)%len(ROWS)]
 sentence=f'{name} {verb} {noun}.';mode=index%5
 def Q(p,a,w,e,fill=False):return question(p,a,w,e,r,fill)
 if grade<=3:
  if mode==0:return Q(f'Trong câu “{sentence}”, từ ngữ nào chỉ sự vật?',noun,[verb,adj,'vì'],f'“{noun}” gọi tên một sự vật.')
  if mode==1:return Q(f'Trong câu “{sentence}”, từ nào chỉ hoạt động?',verb,[noun,adj,'và'],f'“{verb}” chỉ việc {name} thực hiện.',fill=True)
  if mode==2:return Q(f'Trong cụm “{noun} {adj}”, từ nào chỉ đặc điểm?',adj,[noun,'và','của'],f'“{adj}” nêu đặc điểm của {noun}.',fill=True)
  if mode==3:return Q(f'Bộ phận “{name}” trong câu “{sentence}” trả lời câu hỏi nào?','Ai?',['Ở đâu?','Khi nào?','Vì sao?'],'Tên người trả lời câu hỏi “Ai?”.')
  if grade==2:return Q(f'Điền dấu kết thúc cho câu hỏi “{name} đang làm gì...”','?',['.',',',':'],'Đây là câu hỏi nên dùng dấu chấm hỏi.',fill=True)
  if sem=='hk1':return Q(f'Câu “{noun.capitalize()} đẹp như một món quà.” sử dụng biện pháp nào?','So sánh',['Liệt kê số lượng','Nêu thời gian','Kể theo thứ tự'],'Từ “như” nối hai sự vật trong phép so sánh.')
  return Q(f'Trong câu tự soạn “{noun.capitalize()} mỉm cười chào {name}.”, chi tiết nào làm sự vật giống con người?','mỉm cười chào',[noun,name,'trong câu'],'Sự vật được gán hành động mỉm cười, chào như con người: đó là nhân hóa.')
 if grade==4:
  if mode==0:return Q(f'Trong câu “{sentence}”, từ ngữ nào là danh từ hoặc cụm danh từ gọi tên đồ vật/sự vật?',noun,[verb,adj,'vì'],f'“{noun}” là tên sự vật; “{verb}” là động từ, “{adj}” là tính từ.')
  if mode==1:return Q(f'Xác định động từ trong câu “{sentence}”.',verb,[noun,adj,'và'],f'“{verb}” diễn tả hoạt động.',fill=True)
  if mode==2:return Q(f'Tính từ trong cụm “{noun} {adj}” là từ nào?',adj,[noun,verb,'nhưng'],f'“{adj}” là từ chỉ đặc điểm.',fill=True)
  if mode==3:
   if sem=='hk1':return Q(f'Trong nhóm “{name}, {noun}, sân trường, cây bàng”, đâu là tên riêng của người?',name,[noun,'sân trường','cây bàng'],'Tên riêng dùng để gọi một người cụ thể và được viết hoa.')
   return Q(f'Chủ ngữ trong câu “{sentence}” là gì?',name,[verb+' '+noun,noun,verb],f'Chủ ngữ {name} nêu người thực hiện hoạt động.',fill=True)
  if sem=='hk1':return Q(f'Trong câu “{noun.capitalize()} vui vẻ chào {name}.”, sự vật được nhân hóa bằng cách nào?','Gán hành động của người cho sự vật',['Chỉ nêu số lượng sự vật','Đổi tên người thành tên vật','Nêu một mốc thời gian'],'Hành động vui vẻ chào vốn của người được gán cho sự vật.')
  return Q(f'Trong câu “Buổi sáng, {name} {verb} {noun}.”, “Buổi sáng” bổ sung thông tin gì?','Thời gian',['Người thực hiện','Đồ vật được nói đến','Nguyên nhân'],'Trạng ngữ “Buổi sáng” cho biết hoạt động diễn ra khi nào.')
 word,syn,ant=SYN[(offset+index//5)%len(SYN)]
 if mode==0:return Q(f'Từ nào gần nghĩa với “{word}” khi nói về đặc điểm của người hoặc sự vật?',syn,[ant,'chiếc bàn','đọc sách'],f'“{word}” và “{syn}” có nghĩa gần nhau.')
 if mode==1:return Q(f'Từ nào trái nghĩa với “{word}”?',ant,[syn,'quyển vở','sân trường'],f'“{word}” và “{ant}” biểu thị đặc điểm đối lập.')
 if mode==2:return Q(f'Đọc hai câu: “{name} có một chiếc bàn.” và “Bạn ấy giữ bàn rất sạch.”. “Bạn ấy” thay cho ai?',name,['chiếc bàn','sạch','một chiếc bàn'],'“Bạn ấy” thay cho người vừa được nhắc đến là '+name+'.',fill=True)
 if mode==3:
  if sem=='hk1':return Q(f'Đọc câu “{name} lau chân bàn.”. “Chân” trong “chân bàn” được dùng theo nghĩa nào?','Nghĩa chuyển: bộ phận đỡ đồ vật',['Nghĩa gốc: bộ phận cơ thể người','Tên một hành động','Tên một màu sắc'],'Từ bộ phận cơ thể đỡ cơ thể, “chân” được chuyển sang gọi bộ phận đỡ bàn.')
  return Q(f'Câu “Vì {name} đọc kĩ hướng dẫn nên bạn làm đúng.” thể hiện quan hệ nào?','Nguyên nhân – kết quả',['Tương phản','Giả thiết – kết quả','Tăng tiến'],'Vế sau “vì” nêu nguyên nhân; vế sau “nên” nêu kết quả.')
 if sem=='hk1':return Q(f'Trong câu “{name} giữ gìn {noun}.”, “giữ gìn” có nghĩa phù hợp nào?','Bảo vệ, chăm chút để không bị hư hỏng',['Làm hỏng rồi bỏ đi','Tặng ngay cho người khác','Làm việc không chú ý'],'Trong ngữ cảnh này, giữ gìn là bảo vệ và chăm chút cho sự vật.')
 return Q(f'Hai câu “{name} đọc sách. Cuốn sách giúp bạn hiểu thêm nhiều điều.” được liên kết bằng cách lặp từ nào?','sách',[name,'giúp','nhiều'],'Từ “sách” xuất hiện ở cả hai câu, góp phần liên kết câu.',fill=True)

def writing(s,index,r,grade):
 a=s['a'];context=f'Với đề viết kể lại việc {a} {s["action"]}, '
 def Q(p,ans,wrong,why):return question(p,ans,wrong,why,r)
 if index==0:return Q(context+'câu mở đầu nào giới thiệu đúng sự việc?',f'{s["time"]}, {a} đến {s["place"]}.',['Một con tàu đang ra khơi.','Buổi trưa, mặt trăng sáng rõ.','Em chưa biết hôm nay học môn gì.'],'Câu mở đầu nêu thời gian, nhân vật và địa điểm phù hợp đề viết.')
 if index==1:return Q(context+'câu nào phù hợp để nêu cảm xúc ở cuối đoạn?',f'Em thấy {s["emotion"]}.',['Các hành tinh quay quanh Mặt Trời.','Chiếc bàn có bốn chân.','Bài toán này có ba phép tính.'],'Câu kết bộc lộ cảm xúc gắn với sự việc đã kể.')
 if index==2:return Q(context+'chi tiết nào cần ưu tiên kể?',s['action'],['Cách giải một bài toán không liên quan','Tên một bộ phim chưa xem','Màu sơn của chiếc xe ở nơi khác'],'Ưu tiên hành động chính để đoạn văn bám đề.')
 if index==3:return Q(context+'cách sắp xếp ý nào hợp lí?','Giới thiệu sự việc → kể việc đã làm → nêu kết quả, cảm xúc',['Nêu kết quả → chuyển sang đề khác → bỏ sự việc','Chỉ viết tên nhân vật rồi dừng','Kể nhiều việc không liên quan'],'Kể theo trình tự giúp người đọc theo dõi sự việc rõ ràng.')
 if index==4:return Q(context+'nếu chính em là người thực hiện, nên xưng thế nào để kể ở ngôi thứ nhất?','Em hoặc tôi',['Bạn ấy ở mọi câu','Cái bàn','Cây xanh'],'Người kể xưng em hoặc tôi để kể trải nghiệm của chính mình.')
 if index==5:return Q(context+'câu nào nêu đúng kết quả của việc đã làm?',s['result'].capitalize()+'.',['Mọi đồ dùng đều tự biến mất.','Chẳng ai làm bất cứ việc gì.','Câu chuyện chuyển sang một cuộc thi khác.'],'Câu kết quả phải gắn trực tiếp với hành động đã kể.')
 if index==6:return Q(f'Khi sửa đoạn viết về việc {a} {s["action"]}, em nên làm gì trước khi nộp?','Đọc lại, sửa lỗi chính tả và kiểm tra các ý có bám đề',['Xóa tất cả dấu chấm','Thêm nhiều câu không liên quan','Bỏ qua câu chưa rõ nghĩa'],'Đọc và sửa giúp đoạn văn rõ ý, đúng chính tả và đúng đề.')
 if index==7:return Q(f'Trong buổi trao đổi về việc {a} {s["action"]}, lời góp ý nào lịch sự?','Mình nghĩ bạn có thể kể rõ thêm kết quả của việc đó.',['Bạn viết thế này thì không ai muốn đọc!','Bạn đừng viết bài nữa!','Mình sẽ không nghe bạn nói!'],'Lời góp ý lịch sự nêu điều có thể cải thiện và tôn trọng người viết.')
 if index==8:return Q(context+'thông tin nào giúp người đọc hiểu lí do hành động?',s['reason'],['Số trang của một cuốn sách khác','Chiều dài của chiếc bàn bất kì','Màu của một chiếc xe chưa xuất hiện'],'Lí do giải thích vì sao nhân vật thực hiện việc đó.')
 return Q(f'Khi nghe bạn kể việc {a} {s["action"]}, em nên đặt câu hỏi nào để hiểu rõ trải nghiệm?','Sau việc đó, bạn cảm thấy thế nào?',['Bạn có thể kể chuyện khác không liên quan không?','Sao bạn không im lặng luôn?','Mình không muốn nghe thêm điều gì.'],'Câu hỏi mở về cảm xúc giúp người kể chia sẻ sâu hơn và vẫn bám vào sự việc.')

def main():
 OUT.mkdir(parents=True,exist_ok=True);manifest=[];handbook=['# Tiếng Việt lớp 2–5 — Kết nối tri thức với cuộc sống','','Mục lục đã đối chiếu sách theo từng tập. Mỗi lớp có 32 bài ở Tập 1, 30 bài ở Tập 2 và 4 bộ ôn tập giữa/cuối học kì: **66 Word × 50 câu = 3.300 câu/lớp**.','','Mỗi Word: 20 câu đọc hiểu ngữ liệu bổ trợ, 20 câu từ và câu, 10 câu về kĩ năng viết/nói-nghe; kèm đáp án, lời giải và đề viết tự luyện. Ngữ liệu bổ trợ **tự soạn**, không phải toàn văn hay bản diễn giải bài đọc nguyên bản SGK. Câu đọc hiểu luôn kèm đoạn văn. Bài viết mở cần giáo viên/phụ huynh nhận xét, không chấm như đáp án trắc nghiệm.','','Giữ số bài theo tập; bài thuộc Tập 2 có hậu tố “Tập 2” để tránh nhầm trên danh sách chung. Các bộ ôn tập không đánh số thành bài SGK.','']
 for grade in range(2,6):
  book=json.loads((ROOT/f'backend/seed-data/vietnamese-grade{grade}-kntt.json').read_text(encoding='utf8'));handbook +=[f'## Lớp {grade}','']
  for semester in ['hk1','hk2']:
   handbook +=[f'### Học kì {1 if semester=="hk1" else 2}','']
   for chapter in book['chapters']:
    if chapter['semester']!=semester:continue
    handbook +=[f'#### {chapter["name"]}','']
    for lesson in chapter['lessons']:
     r=random.Random(grade*10000+lesson['sortOrder']);idx=scene_index(lesson['title'],chapter['name'],lesson['sortOrder']);s1=story(idx,r,grade);s2=story(scene_index(lesson['title'],chapter['name'],lesson['sortOrder']+1),r,grade)
     questions=[reading(s,mode,r,grade) for s in [s1,s2] for mode in range(10)]
     questions +=[grammar(grade,semester,i,lesson['sortOrder'],r) for i in range(20)]
     questions +=[writing(s1,i,r,grade) for i in range(10)]
     for i,q in enumerate(questions):
      if grade>=4 and (i>=20 or i%10>=8):q['difficulty']='medium'
     assert len(questions)==50 and len({q['prompt'] for q in questions})==50,lesson['id']
     assert all(len(q['prompt'])<=1000 and q['explanation'] for q in questions)
     folder=OUT/f'lop-{grade}'/semester;folder.mkdir(parents=True,exist_ok=True)
     number=f'bai-{lesson["numberInVolume"]:02}' if lesson['kind']=='lesson' else lesson['id'].split('-review-')[1]+'-on-tap'
     file=folder/f'50-cau-tieng-viet-lop-{grade}-{semester}-{number}-{tv.writer.slug(lesson["title"])}.docx'
     length='4–5 câu' if grade==2 else '5–7 câu' if grade==3 else 'một đoạn văn có mở đoạn, triển khai và kết đoạn' if grade==4 else 'một bài văn có mở bài, thân bài và kết bài'
     notes=[f'Thực hành viết thêm (ngoài 50 câu): Viết {length} kể lại một việc em đã tham gia, gần với chủ điểm “{chapter["name"]}”.', 'Gợi ý: nêu thời gian, nơi diễn ra, người tham gia; kể việc đã làm theo trình tự; nêu kết quả và cảm xúc thật của em.', 'Tiêu chí nhận xét bài viết: đúng đề và chân thực; ý rõ, có trình tự; dùng từ, đặt câu phù hợp; viết đúng chính tả, dấu câu. Giáo viên/phụ huynh nhận xét, không có một đáp án cố định.']
     tv.writer.write_docx(file,grade,chapter,lesson,questions,subject_label='Tiếng Việt',extra_notes=notes)
     manifest.append({'grade':grade,'subjectId':'tieng-viet','lessonId':lesson['id'],'lessonName':lesson['name'],'semester':semester,'chapterId':chapter['id'],'file':file.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'questions':questions})
     handbook.append('- **'+lesson['name']+'** — 50 câu.')
    handbook.append('')
  handbook +=['Nguồn đối chiếu mục lục:']+['- '+url for url in book['sources']]+['']
  print(json.dumps({'grade':grade,'files':sum(x['grade']==grade for x in manifest),'questions':sum(x['grade']==grade for x in manifest)*50}),flush=True)
 handbook +=['## Tải Word','','[Toàn bộ Word lớp 2–5](tai-lieu/tieng-viet-lop-2-den-5-50-cau.zip)','','Trong admin: Nội dung học tập → Lớp → Học kì → Tiếng Việt → Chủ đề → Bài học. Word gốc ở mục Word đã nạp. Nội dung mới được lưu Nháp để giáo viên duyệt trước khi đăng.','']
 text='\n'.join(handbook);(ROOT/'cacbaitiengviet2-5.md').write_text(text,encoding='utf8');(OUT/'README.md').write_text(text,encoding='utf8')
 (ROOT/'backend/backups/vietnamese-grade2-5-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 for grade in [None,2,3,4,5]:
  name='tieng-viet-lop-2-den-5-50-cau.zip' if grade is None else f'tieng-viet-lop-{grade}-50-cau.zip'
  with zipfile.ZipFile(OUT.parent/name,'w',zipfile.ZIP_DEFLATED) as z:
   z.writestr('README.md',text)
   for item in manifest:
    if grade is None or item['grade']==grade:
     file=ROOT/item['file'];z.write(file,file.relative_to(OUT).as_posix())
 print(json.dumps({'files':len(manifest),'questions':len(manifest)*50}))

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8');main()
