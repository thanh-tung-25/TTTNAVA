"""Grade 1 Vietnamese: approved grouped pathway A and self-contained draft Word bank."""
import importlib.util
import hashlib
import json
import random
import re
import sys
import unicodedata as ud
import zipfile
from pathlib import Path
from functools import lru_cache

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('math_writer',Path(__file__).with_name('build-primary-math-bank.py'))
writer=importlib.util.module_from_spec(spec);spec.loader.exec_module(writer)
OUT=ROOT/'tai-lieu/tieng-viet-lop-1-phuong-an-a'
TONES={'\u0300':'huyền','\u0301':'sắc','\u0309':'hỏi','\u0303':'ngã','\u0323':'nặng'}
ONSETS=['ngh','ng','gh','ch','kh','nh','ph','th','tr','qu','gi','b','c','d','đ','g','h','k','l','m','n','p','r','s','t','v','x']

@lru_cache(maxsize=None)
def strip_tone(word):return ud.normalize('NFC',''.join(c for c in ud.normalize('NFD',word.lower()) if c not in TONES))
def tone(word):return next((TONES[c] for c in ud.normalize('NFD',word) if c in TONES),'ngang')
@lru_cache(maxsize=None)
def onset(word):return next((s for s in ONSETS if strip_tone(word).startswith(s)),'')

RIMES={
 'a':'ba bà cá cà lá má nhà gà cha xa ngà ra ta già giá pha phá phà va và vá qua quà quả quạ', 'e':'bé bè chè xe ve mẹ tre me ghé nghe vẽ vè xé xẻ', 'ê':'bê bế bề ghế khế dê lễ quê ghê nghề phê xê',
 'o':'bò cò chó cỏ đỏ to nhỏ gió giò giỏ', 'ô':'cô bố cổ hồ tô ngô phố', 'ơ':'bơ bờ cờ mơ chợ phở giơ giở',
 'i':'bi bí đi dì chị thi chỉ ghi ghì nghi nghỉ nghĩ gì phì', 'u':'thu đủ tủ chú mũ cũ ngủ giũ phu phú', 'ư':'thư tư từ chữ sư giữ ngư',
 'ia':'bia bìa chia chìa kia mía thìa', 'ua':'cua chua đua lúa múa rùa', 'ưa':'mưa trưa dưa thưa xưa cửa',
 'oi':'voi còi coi bói đòi gói hỏi', 'ai':'mai mái bài cái chai dài gái', 'ôi':'tôi xôi nồi đồi thổi ngồi', 'ơi':'chơi bơi hơi lời mới tới',
 'ui':'vui núi mùi túi bụi cúi', 'ưi':'gửi cửi', 'ay':'bay tay hay ngày máy chạy', 'ây':'cây mây thấy giấy đẩy xây',
 'ao':'sao cao báo gạo đào cáo', 'eo':'mèo kéo kẹo chèo bèo đèo', 'au':'rau cau lau màu đau cháu', 'âu':'câu cầu trâu sâu nâu dâu',
 'iu':'chịu dịu líu ríu', 'ưu':'hưu cừu bưu lưu',
 'on':'con non nón hòn gọn', 'an':'bàn bạn lan đàn ngan', 'ôn':'thôn tôn bốn chồn khôn', 'ơn':'sơn hơn đơn cơn lớn',
 'un':'bún run giun lùn', 'en':'sen đen kèn chen', 'ên':'bên lên tên quên', 'in':'tin pin chín nhìn',
 'am':'cam nam làm cám', 'ăm':'năm tăm chăm nằm', 'âm':'ấm cầm mâm nấm thầm',
 'em':'em kem xem đem', 'êm':'đêm êm thêm nếm', 'im':'chim tim tím tìm',
 'om':'đom khóm còm', 'ôm':'tôm ôm cốm hôm', 'ơm':'cơm rơm thơm', 'um':'chum chùm bụm', 'ưm':'hừm',
 'ot':'ngọt mọt sọt', 'at':'cát hát mát bát', 'ôt':'cột một bột tốt', 'ơt':'ớt bớt vợt',
 'ut':'bút út hút chút', 'ưt':'bứt nứt mứt', 'et':'mẹt vẹt nét', 'êt':'tết kết vết', 'it':'mít vịt ít thịt',
 'op':'họp góp cọp', 'ap':'sáp đạp tháp', 'ôp':'hộp lốp xốp', 'ơp':'lớp chớp khớp',
 'up':'úp búp chụp', 'ep':'dép đẹp kẹp', 'êp':'bếp nếp xếp', 'ip':'nhịp kịp dịp',
 'ach':'sách khách sạch gạch', 'ich':'lịch thích kịch', 'êch':'ếch chếch',
 'ang':'bang làng vàng hàng', 'ăng':'trăng răng măng nắng', 'âng':'nâng tầng vâng',
 'ong':'ong bóng trong vòng', 'ông':'ông công sông bông', 'ung':'cung cùng thùng', 'ưng':'rừng mừng trứng',
 'eng':'keng xẻng', 'iêng':'chiêng tiếng riêng miếng', 'anh':'anh xanh chanh cành', 'inh':'xinh kính hình bình',
 'iêc':'biếc chiếc tiếc', 'ươc':'nước bước thước',
 'uôi':'chuối suối tuổi đuôi', 'ươi':'tươi cười người mười', 'uôm':'buồm nhuộm', 'ươm':'bướm cườm lượm',
 'uôn':'buôn cuốn chuồn', 'ươn':'vườn vươn mượn', 'uông':'chuông buồng luống', 'ương':'gương đường trường',
 'uôt':'chuột ruột vuốt', 'ươt':'mượt lướt ướt', 'uôp':'chuộp', 'ươp':'mướp cướp ướp',
 'oang':'khoang hoang thoáng', 'oac':'xoạc khoác', 'oanh':'khoanh doanh', 'oach':'hoạch xoạch',
 'oat':'thoát hoạt', 'oăt':'choắt ngoắt', 'uân':'xuân quân tuần', 'uât':'luật xuất',
 'oai':'xoài khoai ngoài', 'oay':'xoay loay', 'uya':'khuya', 'uyên':'khuyên thuyền chuyện', 'uyêt':'tuyết quyết duyệt',
}
WORDS={}
for rhyme,words in RIMES.items():
 for word in words.split():
  assert strip_tone(word).endswith(rhyme),(word,rhyme)
  assert word not in WORDS,(word,'duplicate')
  WORDS[word]=rhyme

def syllable(text):return [w.strip('.,!?;:') for w in text.split() if w.strip('.,!?;:')]

def make_question(prompt,correct,wrongs,why,r,fill=False):
 correct=str(correct);options=[correct]
 for wrong in wrongs:
  wrong=str(wrong)
  if wrong.casefold() not in [x.casefold() for x in options]:options.append(wrong)
 if len(options)<3:raise ValueError('Need distinct distractors: '+prompt)
 if fill:
  return dict(type='fill_in',prompt=prompt,options=[],answer={'accepted':[correct]},explanation=why,difficulty='medium')
 options=options[:4];r.shuffle(options)
 return dict(type='single_choice',prompt=prompt,options=[{'key':'abcd'[i],'text':v} for i,v in enumerate(options)],answer={'key':'abcd'[options.index(correct)]},explanation=why,difficulty='easy')

def build_curriculum():
 book={'book':'Tiếng Việt 1 – Lộ trình gộp bài phương án A','subjectId':'tieng-viet','grade':1,'yearId':'2026-2027','sources':['Cấu trúc do người dùng cung cấp','https://loigiaihay.com/sgk-tieng-viet-1-ket-noi-tri-thuc-voi-cuoc-song-c1181.html'],'chapters':[]};number=0
 def chapter(title,semester,units):
  nonlocal number
  idx=len(book['chapters'])+1;c={'id':f'tv1-a-c{idx:02}','name':f'Chủ đề {idx}: {title}','semester':semester,'sortOrder':idx,'lessons':[]}
  for title,kind,targets in units:
   number+=1;c['lessons'].append({'id':f'tv1-a-b{number:02}','name':f'Bài {number}. {title}','sortOrder':number,'kind':kind,'targets':targets})
  book['chapters'].append(c)
 def U(title,kind,targets):return (title,kind,targets.split() if isinstance(targets,str) else targets)
 chapter('Làm quen âm, chữ và dấu thanh','hk1',[
  U('a, b, c, e, ê – Dấu sắc và dấu huyền','letters','a b c e ê'),
  U('o, ô, ơ – Dấu hỏi, dấu ngã, dấu nặng','letters','o ô ơ'),
  U('d, đ, i, k','letters','d đ i k'),U('l, m, n, h','letters','l m n h'),U('u, ư, ch, kh','letters','u ư ch kh'),
  U('Ôn tập âm, chữ và sáu thanh','letters','a b c e ê o ô ơ d đ i k l m n h u ư ch kh')])
 chapter('Âm ghép và quy tắc chính tả','hk1',[
  U('Phân biệt g và gh','spelling','g gh'),U('gi và ph','letters','gi ph'),U('nh và th','letters','nh th'),
  U('Phân biệt ng và ngh','spelling','ng ngh'),U('r, s, t, tr','letters','r s t tr'),U('v, x, y, p và qu','letters','v x y p qu'),
  U('ia, ua, ưa','rimes','ia ua ưa'),U('Ôn tập âm ghép và chính tả','spelling','g gh ng ngh')])
 chapter('Vần kết thúc bằng i, y, u, o','hk1',[
  U('oi, ai, ôi, ơi','rimes','oi ai ôi ơi'),U('ui, ưi, ay, ây','rimes','ui ưi ay ây'),U('ao, eo, au, âu','rimes','ao eo au âu'),
  U('iu, ưu và ôn các vần kết thúc bằng u','rimes','iu ưu au âu'),U('Ôn tập các vần đã học','rimes','oi ai ôi ơi ui ưi ay ây ao eo au âu iu ưu')])
 chapter('Vần kết thúc bằng n, m','hk1',[
  U('on, an, ôn, ơn','rimes','on an ôn ơn'),U('un, en, ên, in','rimes','un en ên in'),
  U('am, ăm, âm, em, êm, im','rimes','am ăm âm em êm im'),U('om, ôm, ơm, um, ưm','rimes','om ôm ơm um ưm'),
  U('Ôn tập vần kết thúc bằng n, m','rimes','on an ôn ơn un en ên in am ăm âm em êm im om ôm ơm um')])
 chapter('Vần kết thúc bằng t, p','hk1',[
  U('ot, at, ôt, ơt','rimes','ot at ôt ơt'),U('ut, ưt, et, êt, it','rimes','ut ưt et êt it'),
  U('op, ap, ôp, ơp','rimes','op ap ôp ơp'),U('up, ep, êp, ip','rimes','up ep êp ip'),
  U('Ôn tập vần kết thúc bằng t, p','rimes','ot at ôt ơt ut ưt et êt it op ap ôp ơp up ep êp ip')])
 chapter('Vần kết thúc bằng c, ch, ng, nh','hk1',[
  U('ach, ich, êch','rimes','ach ich êch'),U('ang, ăng, âng','rimes','ang ăng âng'),U('ong, ông, ung, ưng','rimes','ong ông ung ưng'),
  U('eng, iêng, anh, inh','rimes','eng iêng anh inh'),U('iêc, ươc và luyện đọc mở rộng','rimes','iêc ươc iêng anh'),
  U('Ôn tập c, ch, ng, nh','rimes','ach ich êch ang ăng âng ong ông ung ưng eng iêng anh inh iêc ươc')])
 chapter('Vần có nguyên âm đôi','hk1',[
  U('uôi, ươi, uôm, ươm','rimes','uôi ươi uôm ươm'),U('uôn, ươn, uông, ương','rimes','uôn ươn uông ương'),
  U('uôt, ươt, uôp, ươp','rimes','uôt ươt uôp ươp'),U('Ôn tập vần có nguyên âm đôi','rimes','uôi ươi uôm ươm uôn ươn uông ương uôt ươt uôp ươp')])
 chapter('Vần có âm đệm và luyện đọc tổng hợp','hk1',[
  U('oang, oac, oanh, oach','rimes','oang oac oanh oach'),U('oat, oăt, uân, uât','rimes','oat oăt uân uât'),
  U('oai, oay, uya, uyên, uyêt','rimes','oai oay uya uyên uyêt'),U('Ôn tập âm đệm','rimes','oang oac oanh oach oat oăt uân uât oai oay uya uyên uyêt')])
 chapter('Ôn tập học kì 1','hk1',[U('Ôn tập âm, vần và dấu thanh','rimes',list(RIMES))])
 themes=['Tôi và các bạn','Mái ấm gia đình','Mái trường mến yêu','Điều em cần biết','Bài học từ cuộc sống','Thiên nhiên kì thú','Thế giới trong mắt em','Đất nước và con người']
 for idx,title in enumerate(themes):
  chapter(title,'hk2',[U('Luyện đọc và đọc hiểu – '+title,'reading',{'theme':idx,'part':1}),U('Từ ngữ và câu – '+title,'language',{'theme':idx}),U('Đọc hiểu mở rộng – '+title,'reading',{'theme':idx,'part':2}),U('Ôn tập chủ đề – '+title,'reading',{'theme':idx,'part':3})])
 chapter('Ôn tập cuối năm','hk2',[U('Ôn tập đọc hiểu, từ và câu','reading',{'theme':-1,'part':4})])
 return book


def phonics(lesson,r,known,allowed):
 kind=lesson['kind'];targets=lesson['targets'];all_words=list(WORDS)
 if kind!='rimes':all_words=[w for w in all_words if WORDS[w] in ['a','e','ê','o','ô','ơ','i','u','ư'] and (not onset(w) or onset(w) in allowed) and all(c in allowed for c in WORDS[w])]
 current=[w for w in all_words if (WORDS[w] in targets if kind=='rimes' else any((t in strip_tone(w) if t in 'aăâeêioôơuưy' else onset(w)==t) for t in targets))]
 if not current:raise ValueError('Empty word bank '+lesson['name'])
 word=r.choice(current);rhyme=WORDS[word];initial=onset(word);mode=r.randrange(7)
 def Q(prompt,answer,wrongs,why,fill=False):return make_question(prompt,answer,wrongs,why,r,fill)
 if kind=='spelling' and mode<4:
  eligible=[w for w in current if onset(w) in targets];word=r.choice(eligible);initial=onset(word)
  if initial in ['gh','ngh']:wrong=(('g' if initial=='gh' else 'ng')+word[len(initial):])
  else:wrong=(('gh' if initial=='g' else 'ngh')+word[len(initial):])
  other=r.choice([w for w in eligible if w!=word]);prompt=r.choice([f'Chọn cách viết đúng để điền vào câu: “Bé đọc tiếng ...”. Tiếng cần viết là “{word}”.',f'Trong các cách viết dưới đây, cách nào viết đúng tiếng “{word}”?',f'Để viết tiếng “{word}”, con chọn cách nào đúng quy tắc g/gh hoặc ng/ngh?'])
  if mode<4:return Q(prompt,word,[wrong,word+'h',word[1:]],f'Tiếng “{word}” viết với {initial}. gh và ngh đứng trước e, ê, i; g và ng dùng trước các nguyên âm khác.')
  rest=word[len(initial):]
  return Q(f'Điền g, gh, ng hoặc ngh vào chỗ trống để được tiếng “{word}”: ...{rest}.',initial,['g','gh','ng','ngh'],f'Điền {initial} được “{word}”. gh/ngh đi với e, ê, i; g/ng đi với các nguyên âm khác.',fill=mode==6)
 if mode==0:
  if kind=='rimes':
   wrongs=[w for w in known if WORDS[w]!=rhyme]
   if len(wrongs)<3:wrongs=[w for w in all_words if WORDS[w]!=rhyme]
   r.shuffle(wrongs);return Q(f'Tiếng nào dưới đây có vần “{rhyme}”?',word,wrongs,f'Tiếng “{word}” có vần {rhyme}; dấu thanh không làm đổi tên vần.')
  target=r.choice(targets);vowel=target in 'aăâeêioôơuưy'
  good=[w for w in current if target in strip_tone(w)] if vowel else [w for w in current if onset(w)==target]
  if good:
   wrongs=[w for w in known if (target not in strip_tone(w) if vowel else onset(w)!=target)]
   if len(wrongs)<3:wrongs=[w for w in all_words if (target not in strip_tone(w) if vowel else onset(w)!=target)]
   correct=r.choice(good);r.shuffle(wrongs)
   return Q(f'Tiếng nào có '+('chữ' if vowel else 'âm đầu')+f' “{target}”?',correct,wrongs,f'Tiếng “{correct}” có '+('chữ' if vowel else 'âm đầu')+f' {target}.')
 if mode==1 and kind=='rimes':return Q(f'Tiếng “{word}” có vần nào?',rhyme,r.sample([v for v in RIMES if v!=rhyme],3),f'Tách dấu thanh khi nhận diện: tiếng “{word}” có vần {rhyme}.',fill=r.choice([True,False]))
 if mode==2 or (kind=='spelling' and mode==4):
  thanh=tone(word)
  return Q(f'Tiếng “{word}” mang thanh nào?',thanh,['ngang','sắc','huyền','hỏi','ngã','nặng'],f'Tiếng “{word}” '+('không có dấu thanh nên mang thanh ngang.' if thanh=='ngang' else f'có dấu {thanh} nên mang thanh {thanh}.'),fill=r.choice([True,False]))
 if (mode==3 or (kind=='spelling' and mode==5)) and initial and not word.startswith('gi'):
  return Q(f'Âm đầu của tiếng “{word}” được viết là gì?',initial,r.sample([x for x in ONSETS if x!=initial],3),f'Tiếng “{word}” bắt đầu bằng {initial}.',fill=r.choice([True,False]))
 if mode==4:
  base=strip_tone(word)
  if word==base and initial:
   return Q(f'Ghép “{initial}” với “{word[len(initial):]}”, không thêm dấu thanh, được tiếng nào?',word,r.sample([w for w in known if w!=word],min(3,len([w for w in known if w!=word]))),f'Ghép {initial} với {word[len(initial):]} được “{word}”.')
  words=r.sample(current,min(4,len(current)))
  if len(words)==4:
   chosen=r.choice(words)
   return Q('Quan sát dãy tiếng: '+' – '.join(words)+f'. Tiếng ở vị trí thứ {words.index(chosen)+1} là tiếng nào?',chosen,words,f'Đếm từ trái sang phải; vị trí thứ {words.index(chosen)+1} là “{chosen}”.')
 if mode==5 and kind=='letters':
  letter=r.choice(targets);wrongs=[x.upper() for x in ONSETS+list('aăâeêioôơuưy') if x!=letter];r.shuffle(wrongs)
  return Q(f'Cách viết in hoa tương ứng với “{letter}” là gì?',letter.upper(),wrongs,f'Dạng in hoa của “{letter}” là “{letter.upper()}”.')
 # A short, explicit list remains self-contained when a question is drawn alone.
 choices=r.sample(current,min(5,len(current)));target=r.choice(choices)
 return Q('Đọc dãy tiếng: '+' – '.join(choices)+f'. Tiếng nào được viết ở cuối dãy?',choices[-1],choices,f'Tiếng ở cuối dãy là “{choices[-1]}”.')


# Original mini-stories. Each item provides exact facts used in its questions.
# Values: setting, object, helpful action, next event, message.
SCENARIOS=[
 [
  ('sân trường','quả bóng','rủ bạn cùng chơi','cả hai cùng cười vui','biết rủ bạn cùng chơi'),
  ('lớp học','chiếc bút chì','cho bạn mượn bút','bạn viết xong bài','biết giúp đỡ bạn'),
  ('thư viện','cuốn truyện','chia sẻ cuốn truyện với bạn','hai bạn cùng đọc','biết chia sẻ với bạn'),
  ('góc xếp hình','bộ xếp hình','cùng bạn xếp một ngôi nhà','ngôi nhà nhỏ được xếp xong','biết hợp tác với bạn'),
  ('sân trường','chiếc mũ','nhặt mũ và trả lại bạn','bạn nhận lại mũ','biết trả lại đồ nhặt được'),
 ],
 [
  ('phòng khách','rổ đồ chơi','cùng em cất đồ chơi','căn phòng trở nên gọn gàng','biết giúp đỡ người thân'),
  ('góc học tập','chiếc quạt giấy','quạt nhẹ cho bà nghỉ','bà mỉm cười với bạn','biết quan tâm đến bà'),
  ('khu vườn','bình tưới nhỏ','cùng bố tưới cây','những gốc cây được tưới nước','biết giúp bố chăm cây'),
  ('bàn ăn','rổ rau','giúp mẹ nhặt rau','mẹ cảm ơn bạn','biết giúp mẹ việc vừa sức'),
  ('hiên nhà','đôi dép','xếp dép ngay ngắn cho em','em tìm được dép của mình','biết chăm sóc em nhỏ'),
 ],
 [
  ('lớp học','bảng con','giơ tay xin phát biểu','cô giáo mời bạn trả lời','biết thực hiện nội quy lớp học'),
  ('thư viện trường','cuốn sách','đặt sách về đúng kệ','kệ sách được xếp gọn','biết giữ gìn sách chung'),
  ('sân trường','chiếc chổi nhỏ','cùng bạn quét lá','sân trường sạch hơn','biết giữ trường lớp sạch đẹp'),
  ('góc học tập của lớp','hộp bút màu','dùng bút màu vẽ hoa','bức tranh có thêm bông hoa','biết chăm chỉ học tập'),
  ('bồn hoa của trường','bình nước','tưới cây cùng cô giáo','cây trong bồn được tưới','biết chăm sóc cây xanh'),
 ],
 [
  ('bồn rửa tay','bánh xà phòng','rửa tay trước khi ăn','đôi tay được rửa sạch','biết giữ vệ sinh'),
  ('cổng trường','chiếc cặp','chào cô giáo trước khi về','cô giáo mỉm cười chào lại','biết chào hỏi lễ phép'),
  ('phòng khách','chiếc điện thoại','gọi bố khi có người lạ gõ cửa','bố dặn bạn không tự mở cửa','biết hỏi người lớn khi cần'),
  ('cổng công viên','tấm biển hướng dẫn','nhờ chú bảo vệ giúp tìm mẹ','mẹ được báo đến đón bạn','biết nhờ người phụ trách giúp đỡ'),
  ('vỉa hè','chiếc ô','đợi mẹ để cùng qua đường','hai mẹ con cùng đi trên vạch dành cho người đi bộ','biết đi cùng người lớn khi qua đường'),
 ],
 [
  ('sân trường','chiếc ví nhỏ','mang ví nhặt được đến chỗ cô giáo','người làm rơi nhận lại ví','biết trung thực'),
  ('góc đọc sách','cuốn truyện bị rách bìa','nhận lỗi vì vô ý làm rách bìa','bạn cùng cô sửa lại bìa','biết nhận lỗi và sửa lỗi'),
  ('vườn nhà','cây non','dựng lại cây bị nghiêng','cây được buộc vào một cọc nhỏ','biết chăm sóc cây'),
  ('sân chơi','chai nước','bỏ chai rỗng vào thùng rác','sân chơi gọn sạch hơn','biết bỏ rác đúng chỗ'),
  ('hiên lớp','chiếc khăn','cho bạn mượn khăn lau tay','bạn cảm ơn bạn nhỏ','biết giúp đỡ khi bạn cần'),
 ],
 [
  ('vườn hoa','bông hoa vàng','đứng ngắm hoa cùng bạn','hai bạn chỉ ngắm mà không hái hoa','biết yêu quý cây hoa'),
  ('sân nhà sau cơn mưa','chiếc lá','quan sát giọt nước trên lá','bạn thấy giọt nước long lanh','biết quan sát thiên nhiên'),
  ('bờ biển','vỏ ốc rỗng','ngắm vỏ ốc cùng bố','bạn kể cho bố điều mình thấy','biết chia sẻ điều quan sát được'),
  ('công viên','chiếc ống nhòm đồ chơi','ngắm chim trên cành cây','hai bạn giữ yên lặng để ngắm chim','biết không làm phiền con vật'),
  ('vườn rau','chiếc lá xanh','quan sát chú bướm đậu trên lá','chú bướm lại bay sang bông hoa','biết chú ý quan sát'),
 ],
 [
  ('hiên nhà buổi sáng','chiếc lá','ngắm nắng chiếu qua lá','bạn nhận ra màu lá trong nắng','biết quan sát cảnh vật'),
  ('bên cửa sổ','cuốn sổ nhỏ','ghi lại điều mình nhìn thấy','trang sổ có hình mây và cây','biết ghi lại điều quan sát được'),
  ('vườn nhà','hộp màu','vẽ cây đang ra lá','bức vẽ có nhiều lá xanh','biết thể hiện điều mình thấy'),
  ('sân trường','cánh hoa rụng','quan sát màu của cánh hoa','bạn kể với cô điều mình thấy','biết chia sẻ cảm nhận'),
  ('bên ao cùng bố','chiếc lá sen','ngắm giọt nước trên lá sen','bố cùng bạn quan sát','biết khám phá cùng người lớn'),
 ],
 [
  ('trạm cứu hỏa','chiếc mũ bảo hộ','nghe chú lính cứu hỏa giới thiệu công việc','bạn cảm ơn các chú','biết trân trọng người giúp cộng đồng'),
  ('làng quê','bó lúa','nghe bác nông dân kể chuyện mùa gặt','bạn hiểu thêm về công việc trồng lúa','biết quý trọng công sức lao động'),
  ('bờ Hồ Gươm','cuốn sổ vẽ','cùng mẹ ngắm cảnh hồ','bạn vẽ một hàng cây bên hồ','biết yêu cảnh đẹp quê hương'),
  ('vườn hoa của khu phố','chiếc túi giấy','nhặt giấy vụn cùng người lớn','vườn hoa sạch hơn','biết góp sức giữ nơi ở sạch đẹp'),
  ('sân trường ngày hội','lá cờ nhỏ','hát cùng các bạn','cả sân trường vang tiếng hát','biết yêu mái trường và quê hương'),
 ],
]
NAMES=['An','Bình','Chi','Hà','Lan','Mai','Minh','Nam','Ngọc','Phúc']
MISBEHAVIOURS=['trêu chọc bạn','vứt đồ bừa bãi','giấu đồ của bạn','làm hỏng đồ dùng','bỏ mặc việc đang làm']

def story(theme,r):
 setting,obj,action,after,message=r.choice(SCENARIOS[theme]);name,friend=r.sample(NAMES,2)
 sentences=[f'{name} và {friend} đang ở {setting}.',f'{name} có {obj} và {action}.',f'Sau đó, {after}.']
 return {'text':' '.join(sentences),'name':name,'friend':friend,'setting':setting,'object':obj,'action':action,'after':after,'message':message,'sentences':sentences}

def reading(lesson,r,index):
 theme=lesson['targets']['theme'];theme=r.randrange(8) if theme==-1 else theme
 s=story(theme,r);prefix='Đọc đoạn văn tự soạn: “'+s['text']+'” '
 mode=index%10
 def Q(prompt,answer,wrongs,why,fill=False):return make_question(prefix+prompt,answer,wrongs,why,r,fill)
 if mode==0:return Q('Bạn nào thực hiện việc được kể ở câu thứ hai?',s['name'],[n for n in NAMES if n!=s['name']],f'Câu thứ hai bắt đầu bằng tên {s["name"]} và kể việc bạn làm.',fill=True)
 if mode==1:return Q('Hai bạn đang ở đâu?',s['setting'],[x[0] for x in SCENARIOS[(theme+1)%8] if x[0]!=s['setting']],f'Câu đầu cho biết hai bạn đang ở {s["setting"]}.')
 if mode==2:return Q(f'{s["name"]} có vật gì trong câu chuyện?',s['object'],[x[1] for x in SCENARIOS[(theme+2)%8] if x[1]!=s['object']],f'Câu thứ hai ghi rõ {s["name"]} có {s["object"]}.')
 if mode==3:return Q(f'{s["name"]} đã làm gì?',s['action'],[x[2] for x in SCENARIOS[(theme+3)%8] if x[2]!=s['action']],f'Đoạn văn kể {s["name"]} {s["action"]}.')
 if mode==4:return Q('Sự việc nào được kể sau cùng?',s['after'],[x[3] for x in SCENARIOS[(theme+4)%8] if x[3]!=s['after']],f'Câu cuối, sau từ “Sau đó”, kể: {s["after"]}.')
 if mode==5:return Q('Việc làm của bạn nhỏ thể hiện điều gì?',s['message'],MISBEHAVIOURS,f'Việc {s["action"]} thể hiện bạn {s["message"]}.')
 if mode==6:return Q(f'Bạn nào cùng xuất hiện với {s["name"]} trong câu đầu?',s['friend'],[n for n in NAMES if n not in [s['name'],s['friend']]],f'Câu đầu nhắc đến {s["name"]} và {s["friend"]}.',fill=True)
 if mode==7:
  phrase=s['object'];n=len(syllable(phrase));return Q(f'Cụm “{phrase}” có mấy tiếng?',str(n),['1','2','3','4','5'],f'Tách thành: '+ ' – '.join(syllable(phrase))+f', có {n} tiếng.',fill=True)
 if mode==8:return Q('Từ ngữ nào cho biết câu chuyện chuyển sang sự việc tiếp theo?','Sau đó',['Ở đâu','Bao giờ','Tại sao'],'Câu cuối bắt đầu bằng “Sau đó”, báo hiệu sự việc tiếp theo.')
 return Q('Câu nào thể hiện đúng nội dung vừa đọc?',f'{s["name"]} {s["action"]}.',[f'{s["name"]} {bad}.' for bad in r.sample(MISBEHAVIOURS,3)],f'Nội dung đúng là việc được kể trong đoạn: {s["name"]} {s["action"]}.')


def language(lesson,r,index):
 theme=lesson['targets']['theme'];s=story(theme,r);mode=index%5
 if mode==0:
  phrase=s['object'];n=len(syllable(phrase));return make_question(f'{s["name"]} có {phrase} ở {s["setting"]}. Cụm “{phrase}” có bao nhiêu tiếng?',str(n),['1','2','3','4','5'],'Các tiếng là: '+' – '.join(syllable(phrase))+f'. Có {n} tiếng.',r,fill=True)
 if mode==1:
  sentence=f'{s["name"]} {s["action"]}.';wrong=[sentence[0].lower()+sentence[1:],sentence[:-1],sentence[:-1]+',']
  return make_question(f'Chọn cách viết đúng câu kể về việc {s["name"]} {s["action"]}: viết hoa chữ đầu và có dấu chấm cuối câu.',sentence,wrong,'Câu kể cần viết hoa chữ đầu câu và có dấu chấm kết thúc.',r)
 if mode==2:
  prompt=f'{s["name"]} đang ở đâu';return make_question(f'Điền dấu kết thúc phù hợp cho câu hỏi: “{prompt}...”','?',['.',',','!'],'Câu hỏi “ở đâu” kết thúc bằng dấu chấm hỏi.',r)
 if mode==3:
  return make_question(f'Bạn giúp {s["name"]} nhặt đồ. {s["name"]} nên nói lời nào?','Cảm ơn bạn đã giúp mình.',['Bạn đừng giúp ai nữa.','Mình sẽ giấu đồ của bạn.','Mình không nói gì đâu.'],'Khi được giúp đỡ, cần nói lời cảm ơn lịch sự.',r)
 return make_question(f'Đọc câu: “{s["name"]} {s["action"]}.” Tiếng đầu tiên trong câu là gì?',s['name'],[n for n in NAMES if n!=s['name']],f'Câu bắt đầu bằng tên {s["name"]}.',r,fill=True)


def main():
 book=build_curriculum();OUT.mkdir(parents=True,exist_ok=True)
 (ROOT/'backend/seed-data/vietnamese-grade1-a.json').write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 manifest=[];known=[];allowed=set()
 for chapter in book['chapters']:
  folder=OUT/chapter['semester'];folder.mkdir(exist_ok=True)
  for lesson in chapter['lessons']:
   r=random.Random(310000+lesson['sortOrder']);questions=[];seen=set();attempts=0
   if lesson['kind'] in ['letters','spelling']:
    allowed.update(lesson['targets'])
    stage=[w for w in WORDS if WORDS[w] in ['a','e','ê','o','ô','ơ','i','u','ư'] and (not onset(w) or onset(w) in allowed) and all(c in allowed for c in WORDS[w])]
   elif lesson['kind']=='rimes':stage=[w for w,v in WORDS.items() if v in lesson['targets']]
   else:stage=[]
   known=list(dict.fromkeys(known+stage))
   while len(questions)<50:
    attempts+=1
    if attempts>20000:raise ValueError('Insufficient variety '+lesson['name'])
    if lesson['kind'] in ['letters','spelling','rimes']:q=phonics(lesson,r,known,allowed)
    elif lesson['kind']=='reading':q=reading(lesson,r,len(questions))
    else:q=language(lesson,r,len(questions))
    if q['prompt'] in seen:continue
    assert len(q['prompt'])<=1000,(lesson['id'],len(q['prompt']))
    assert q['explanation'] and (q['answer'].get('accepted') or q['answer'].get('key'))
    assert len({o['text'].casefold() for o in q['options']})==len(q['options'])
    questions.append(q);seen.add(q['prompt'])
   filename=f'50-cau-tieng-viet-lop-1-bai-{lesson["sortOrder"]:02}-{writer.slug(lesson["name"].split(". ",1)[1])}.docx'
   file=folder/filename;writer.write_docx(file,1,chapter,lesson,questions,subject_label='Tiếng Việt')
   manifest.append({'grade':1,'subjectId':'tieng-viet','lessonId':lesson['id'],'lessonName':lesson['name'],'semester':chapter['semester'],'chapterId':chapter['id'],'file':str(file.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'questions':questions})
  print(json.dumps({'chapter':chapter['id'],'files':len(chapter['lessons'])}),flush=True)
 (ROOT/'backend/backups/vietnamese-grade1-a-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 with zipfile.ZipFile(OUT.parent/'tieng-viet-lop-1-phuong-an-a-50-cau.zip','w',zipfile.ZIP_DEFLATED) as archive:
  for item in manifest:
   file=ROOT/item['file'];archive.write(file,str(file.relative_to(OUT)))
 lines=['# Tiếng Việt lớp 1 — Lộ trình gộp bài phương án A','','Mỗi bài trên web có **50 câu**, Word riêng, đáp án và lời giải.','','Đây là lộ trình học trên web theo phương án gộp có chọn lọc, không phải số thứ tự bài nguyên bản của SGK. Giữ riêng g/gh và ng/ngh. Văn bản đọc hiểu được tự soạn; mỗi câu đọc hiểu luôn kèm đoạn văn cần đọc để dùng độc lập trong đề ngẫu nhiên.','','Các mục bị lặp hoặc nhầm dấu trong bản ban đầu đã chuẩn hóa, ví dụ: `am, ăm, âm`; `ang, ăng, âng`; `ơt, ưt, ươt, ươp`; tên vần không mang dấu thanh. Không tạo bài riêng cho các vần không có đủ ngữ liệu thông dụng như `ưn`, `ưp`.','','Phần làm quen tư thế ngồi, cầm bút và nét cơ bản cần thực hành với phụ huynh/giáo viên; không dùng điểm trắc nghiệm để kết luận năng lực viết tay.','','| Học kì | Chủ đề | Bài học | Câu hỏi |','|---|---:|---:|---:|']
 for sem,title in [('hk1','Học kì 1'),('hk2','Học kì 2')]:
  chapters=[c for c in book['chapters'] if c['semester']==sem];n=sum(len(c['lessons']) for c in chapters);lines.append(f'| {title} | {len(chapters)} | {n} | {n*50} |')
 for sem,title in [('hk1','Học kì 1 — Âm, chữ, vần'),('hk2','Học kì 2 — Đọc hiểu, từ và câu')]:
  lines+=['',f'## {title}','']
  for c in book['chapters']:
   if c['semester']!=sem:continue
   lines +=[f'### {c["name"]}','']+[f'- **{l["name"]}** — 50 câu.' for l in c['lessons']]
 lines+=['','## Tải Word','','[Tải toàn bộ Word dạng ZIP](tai-lieu/tieng-viet-lop-1-phuong-an-a-50-cau.zip)','','Trong admin: **Nội dung học tập → Lớp 1 → Học kì → Tiếng Việt**. Xem tệp gốc tại **Word đã nạp**.','','Nguồn mục tiêu: cấu trúc người dùng cung cấp và [mục lục Tiếng Việt 1 Kết nối tri thức](https://loigiaihay.com/sgk-tieng-viet-1-ket-noi-tri-thuc-voi-cuoc-song-c1181.html). Bài tập và đoạn đọc là nội dung tự soạn.','']
 handbook='\n'.join(lines)
 (ROOT/'cacbaitiengviet1.md').write_text(handbook,encoding='utf8')
 with zipfile.ZipFile(OUT.parent/'tieng-viet-lop-1-phuong-an-a-50-cau.zip','a',zipfile.ZIP_DEFLATED) as archive:
  archive.writestr('README.md',handbook)
 print(json.dumps({'files':len(manifest),'questions':len(manifest)*50,'chapters':len(book['chapters'])}))


if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8');main()
