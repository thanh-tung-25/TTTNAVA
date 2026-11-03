"""Original text exercises mapped to Global Success primary Units.

These are supplementary exercises, not copied textbook questions or audio.
Each Unit / Starter / Review / Fun time has 50 independent questions.
"""
import importlib.util
import json
import random
import hashlib
import zipfile
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('tv',Path(__file__).with_name('build-vietnamese-grade1.py'))
tv=importlib.util.module_from_spec(spec);spec.loader.exec_module(tv)
OUT=ROOT/'tai-lieu/tieng-anh-lop-1-den-5-50-cau'

# Unit title | exercise focus | original bilingual vocabulary (core + extension).
DATA={
1:'''In the school playground|greet|ball=quả bóng;bike=xe đạp;book=cuốn sách;Bill=tên riêng Bill
In the dining room|have|cake=bánh ngọt;car=ô tô;cat=con mèo;cup=cái cốc
At the street market|this|apple=quả táo;bag=cái túi;can=lon;hat=cái mũ
In the bedroom|this|dog=con chó;door=cửa ra vào;duck=con vịt;desk=bàn học
At the fish and chip shop|like|fish=cá;milk=sữa;chips=khoai tây chiên;chicken=thịt gà
In the classroom|colour|pen=bút mực;pencil=bút chì;red=màu đỏ;bell=cái chuông
In the garden|there|garden=khu vườn;gate=cái cổng;girl=bạn gái;goat=con dê
In the park|touch|hair=tóc;hand=bàn tay;head=cái đầu;horse=con ngựa
In the shop|count|box=cái hộp;clock=đồng hồ;pot=cái nồi;mop=cây lau nhà
At the zoo|see|monkey=con khỉ;mouse=con chuột;mango=quả xoài;milk=sữa
At the bus stop|action|bus=xe buýt;truck=xe tải;run=chạy;sun=mặt trời
At the lake|look|lake=hồ;leaf=chiếc lá;lemon=quả chanh;Lucy=tên riêng Lucy
In the school canteen|food|noodles=mì;nuts=các loại hạt;bananas=những quả chuối;milk=sữa
In the toy shop|see|teddy bear=gấu bông;top=con quay;tiger=con hổ;turtle=con rùa
At the football match|touch|face=khuôn mặt;foot=bàn chân;football=bóng đá;fan=cái quạt
At home|count|window=cửa sổ;water=nước;washing=việc giặt giũ;Wendy=tên riêng Wendy''',
2:'''At my birthday party|food|popcorn=bỏng ngô;pasta=mì ống;pizza=bánh pizza;party=bữa tiệc
In the backyard|action|kite=con diều;bike=xe đạp;kitten=mèo con;backyard=sân sau
At the seaside|look|sea=biển;sand=cát;sail=cánh buồm;seaside=bờ biển
In the countryside|see|river=con sông;road=con đường;rainbow=cầu vồng;countryside=nông thôn
In the classroom|action|question=câu hỏi;quiz=bài đố;square=hình vuông;classroom=lớp học
On the farm|there|ox=con bò đực;fox=con cáo;box=cái hộp;farm=trang trại
In the kitchen|give|juice=nước ép;jelly=thạch;jam=mứt;kitchen=nhà bếp
In the village|ability|village=ngôi làng;van=xe tải nhỏ;volleyball=bóng chuyền;draw=vẽ
In the grocery store|want|yogurt=sữa chua;yams=khoai từ;yo-yo=con quay yo-yo;store=cửa hàng
At the zoo|like|zoo=vườn thú;zebra=ngựa vằn;zebu=bò u;animal=động vật
In the playground|action|riding=đang cưỡi hoặc đi xe;sliding=đang trượt;driving=đang lái xe;playground=sân chơi
At the café|where|cake=bánh ngọt;grapes=những quả nho;table=cái bàn;café=quán cà phê
In the maths class|number|eleven=số mười một;thirteen=số mười ba;fourteen=số mười bốn;fifteen=số mười lăm
At home|age|brother=anh hoặc em trai;sister=chị hoặc em gái;grandmother=bà;grandfather=ông
In the clothes shop|where|shirt=áo sơ mi;shoes=đôi giày;shorts=quần đùi;shop=cửa hàng
At the campsite|where|tent=cái lều;teapot=ấm trà;blanket=chăn;campsite=khu cắm trại''',
3:'''Hello|greet|hello=xin chào;goodbye=tạm biệt;fine=khỏe;thanks=cảm ơn
Our names|name|name=tên;one=số một;two=số hai;three=số ba
Our friends|friend|friend=bạn;teacher=giáo viên;this=đây;that=kia
Our bodies|touch|head=cái đầu;mouth=miệng;ear=tai;nose=mũi
My hobbies|hobby|singing=ca hát;dancing=nhảy múa;drawing=vẽ;swimming=bơi lội
Our school|school|library=thư viện;classroom=lớp học;playground=sân chơi;gym=phòng thể chất
Classroom instructions|instruction|stand up=đứng lên;sit down=ngồi xuống;open=mở;close=đóng
My school things|have|pen=bút mực;ruler=thước kẻ;rubber=cục tẩy;school bag=cặp sách
Colours|colour|red=màu đỏ;blue=màu xanh dương;green=màu xanh lá;yellow=màu vàng
Break time activities|sports|chess=cờ vua;football=bóng đá;badminton=cầu lông;basketball=bóng rổ
My family|family|father=bố;mother=mẹ;brother=anh hoặc em trai;sister=chị hoặc em gái
Jobs|job|teacher=giáo viên;doctor=bác sĩ;nurse=y tá;farmer=nông dân
My house|house|bedroom=phòng ngủ;kitchen=nhà bếp;bathroom=phòng tắm;living room=phòng khách
My bedroom|there|bed=cái giường;desk=bàn học;chair=cái ghế;lamp=đèn
At the dining table|offer|rice=cơm;bread=bánh mì;milk=sữa;water=nước
My pets|have|dog=con chó;cat=con mèo;bird=con chim;rabbit=con thỏ
Our toys|where|robot=rô-bốt;doll=búp bê;kite=con diều;ball=quả bóng
Playing and doing|action|reading=đang đọc;singing=đang hát;drawing=đang vẽ;cooking=đang nấu ăn
Outdoor activities|action|cycling=đang đạp xe;skating=đang trượt patin;running=đang chạy;walking=đang đi bộ
At the zoo|see|monkey=con khỉ;tiger=con hổ;elephant=con voi;bear=con gấu''',
4:'''My friends|country|Viet Nam=Việt Nam;Japan=Nhật Bản;Australia=Úc;America=Mỹ
Time and daily routines|time|get up=thức dậy;breakfast=bữa sáng;lunch=bữa trưa;dinner=bữa tối
My week|week|Monday=thứ Hai;Tuesday=thứ Ba;Wednesday=thứ Tư;Sunday=Chủ nhật
My birthday party|month|January=tháng Một;March=tháng Ba;May=tháng Năm;December=tháng Mười Hai
Things we can do|ability|swim=bơi;dance=nhảy múa;sing=hát;draw=vẽ
Our school facilities|school|computer room=phòng máy tính;music room=phòng âm nhạc;art room=phòng mĩ thuật;library=thư viện
Our timetables|timetable|Maths=môn Toán;English=môn Tiếng Anh;Science=môn Khoa học;Art=môn Mĩ thuật
My favourite subjects|subject|Music=môn Âm nhạc;PE=môn Thể dục;Vietnamese=môn Tiếng Việt;IT=môn Tin học
Our sports day|sports|football=bóng đá;basketball=bóng rổ;badminton=cầu lông;table tennis=bóng bàn
Our summer holidays|holiday|beach=bãi biển;mountains=núi;swim=bơi;holiday=kì nghỉ
My home|house|flat=căn hộ;house=ngôi nhà;garden=khu vườn;street=đường phố
Jobs|job|doctor=bác sĩ;teacher=giáo viên;driver=tài xế;worker=công nhân
Appearance|appearance|tall=cao;short=thấp hoặc ngắn;long=dài;slim=mảnh mai
Daily activities|time|get up=thức dậy;go to bed=đi ngủ;go to school=đi học;have breakfast=ăn sáng
My family's weekends|weekend|cinema=rạp chiếu phim;park=công viên;visit=thăm;weekend=cuối tuần
Weather|weather|sunny=có nắng;rainy=có mưa;windy=có gió;cloudy=có mây
In the city|city|cinema=rạp chiếu phim;supermarket=siêu thị;bookshop=hiệu sách;post office=bưu điện
At the shopping centre|price|shirt=áo sơ mi;dress=váy liền;shoes=đôi giày;trousers=quần dài
The animal world|animals|elephant=con voi;lion=con sư tử;crocodile=con cá sấu;monkey=con khỉ
At summer camp|future|camp=trại;tent=cái lều;campfire=lửa trại;sing=hát''',
5:'''All about me!|personal|name=tên;address=địa chỉ;hobby=sở thích;hometown=quê hương
Our homes|house|flat=căn hộ;house=ngôi nhà;street=đường phố;floor=tầng
My foreign friends|country|Vietnamese=người Việt Nam;Japanese=người Nhật Bản;Australian=người Úc;English=người Anh
Our free-time activities|free|play chess=chơi cờ vua;read books=đọc sách;watch cartoons=xem phim hoạt hình;go camping=đi cắm trại
My future job|futurejob|pilot=phi công;doctor=bác sĩ;teacher=giáo viên;writer=nhà văn
Our school rooms|schoolrooms|computer room=phòng máy tính;library=thư viện;first floor=tầng một;second floor=tầng hai
Our favourite school activities|schoolact|read books=đọc sách;play games=chơi trò chơi;do projects=làm dự án;sing songs=hát
In our classroom|whose|pencil case=hộp bút;crayons=bút sáp màu;notebook=quyển vở;school bag=cặp sách
Our outdoor activities|past|plant trees=trồng cây;water flowers=tưới hoa;play football=chơi bóng đá;clean the playground=dọn sân chơi
Our school trip|trip|museum=bảo tàng;zoo=vườn thú;bus=xe buýt;train=tàu hỏa
Family time|pastbe|yesterday=hôm qua;last weekend=cuối tuần trước;together=cùng nhau;family=gia đình
Our Tet holiday|will|Tet=Tết;decorate=trang trí;flowers=hoa;lucky money=tiền lì xì
Our special days|will|Teachers' Day=Ngày Nhà giáo;Children's Day=Ngày Quốc tế Thiếu nhi;birthday=sinh nhật;party=bữa tiệc
Staying healthy|healthy|exercise=tập thể dục;vegetables=rau;fruit=trái cây;healthy=khỏe mạnh
Our health|health|headache=đau đầu;toothache=đau răng;stomach ache=đau bụng;sore throat=đau họng
Seasons and the weather|weather|spring=mùa xuân;summer=mùa hè;autumn=mùa thu;winter=mùa đông
Stories for children|story|story=câu chuyện;character=nhân vật;kind=tốt bụng;clever=thông minh
Means of transport|transport|bus=xe buýt;train=tàu hỏa;plane=máy bay;bike=xe đạp
Places of interest|places|museum=bảo tàng;pagoda=chùa;temple=đền;island=hòn đảo
Our summer holidays|future|seafood=hải sản;beach=bãi biển;souvenir=quà lưu niệm;holiday=kì nghỉ'''
}

def units(grade):
 result=[]
 for number,line in enumerate(DATA[grade].splitlines(),1):
  title,kind,words=line.split('|');vocab=[p.split('=',1) for p in words.split(';')]
  assert len(vocab)==4 and len({x[0] for x in vocab})==4
  result.append(dict(number=number,title=title,focus=kind,vocab=vocab))
 assert len(result)==(16 if grade<=2 else 20)
 return result

# Five closed cloze items per focus. {n} is always a named speaker/subject;
# placeholder variation gives three independent short communication contexts.
# Correct forms are explicit, not generated by suffix guessing.
GRAMMAR={
'greet': [('Hello, I ___ {n}.','am'),('How ___ you?','are'),('I am fine, ___ you.','thank'),('___, {n}! See you later.','Goodbye'),('___ name is {n}.','My')],
'name':[("What is your ___?","name"),("My name ___ {n}.","is"),("I ___ {n}.","am"),("How ___ you spell your name?","do"),("What is ___ name? (tên của bạn)","your")],
'this': [('This ___ a book.','is'),('___ is a bag. (Đây)','This'),('It is ___ apple.','an'),('This is ___ hat.','a'),('This is ___ bag. (túi của tôi)','my')],
'have': [('I ___ a book.','have'),('I have ___ apple.','an'),('I have ___ pen.','a'),('Do you ___ a ruler?','have'),('Yes, I ___. (Do you have a pen?)','do')],
'like': [('I ___ milk. (thích)','like'),('Do you ___ fish?','like'),('Yes, I ___. (Do you like milk?)','do'),("No, I ___. (Do you like fish?)","don't"),('I like ___ . (sữa)','milk')],
'there': [('There ___ a dog.','is'),('There ___ two chairs.','are'),('Is ___ a fox?','there'),('Yes, there ___.','is'),("No, there ___.","isn't")],
'touch': [('Touch ___ head. (đầu của bạn)','your'),('Point ___ your foot.','to'),('___ your mouth. (Mở)','Open'),('This ___ my hand.','is'),('I have two ___. (tai)','ears')],
'count': [('How ___ boxes can you see?','many'),('I can see two ___. (hộp)','boxes'),('I ___ see a clock.','can'),('How many ___ can you see? (cửa sổ)','windows'),('I can see ___ pot. (một)','one')],
'see': [('I ___ see a tiger.','can'),('What can you ___?','see'),('I can see ___ elephant.','an'),('That ___ a monkey.','is'),('I can see ___ bear.','a')],
'action': [('She ___ running.','is'),('They ___ playing.','are'),('I ___ reading.','am'),('What are you ___?','doing'),('He is ___ a bike. (đi xe đạp)','riding')],
'look': [('Look ___ the sea!','at'),("___ look at the lake! (Chúng mình hãy)","Let's"),('Look at ___ leaf.','the'),('I can ___ a lemon.','see'),('This ___ a lake.','is')],
'food': [('The popcorn ___ yummy.','is'),('I like ___. (mì ống)','pasta'),('She is ___ noodles. (đang ăn)','having'),('I ___ milk. (thích)','like'),('The bananas ___ on the table.','are')],
'give': [('Pass ___ the jam, please. (cho tôi)','me'),('Here you ___.','are'),('Pass me ___ juice, please.','the'),('Thank ___.','you'),('This ___ jelly.','is')],
'want': [('What do you ___? (muốn)','want'),('I want ___ yogurt.','some'),('I ___ some yams. (muốn)','want'),('Do you want ___ milk?','some'),('Yes, ___. (Vâng, làm ơn)','please')],
'number': [('What ___ is it? (số)','number'),('It ___ eleven.','is'),('Ten and one is ___.','eleven'),('Ten and three is ___.','thirteen'),('Ten and five is ___.','fifteen')],
'age': [('How ___ is your brother?','old'),('He ___ nineteen.','is'),('My sister ___ ten.','is'),('How old ___ you?','are'),('I ___ eight years old.','am')],
'where': [('Where ___ the cake?','is'),('Where ___ the shoes?','are'),('The cake is ___ the table. (trên)','on'),('The ball is ___ the table. (dưới)','under'),('The blanket is ___ the tent. (trong)','in')],
'friend': [('This ___ my friend.','is'),('Is that {n}? Yes, it ___.','is'),('Are they your friends? Yes, they ___.','are'),('___ is my friend, {n}. (Đây)','This'),('These ___ my friends.','are')],
'hobby': [('What is your ___? (sở thích)','hobby'),('I like ___. (bơi lội)','swimming'),('My hobby is ___. (vẽ)','drawing'),('I like ___ books. (đọc)','reading'),('Do you like singing? Yes, I ___.','do')],
'school': [("Let's go ___ the library.",'to'),('Is this your school? Yes, it ___.','is'),('The library ___ big.','is'),('This is ___ classroom. (lớp của chúng tôi)','our'),('There ___ a music room.','is')],
'instruction': [('___ your book, please. (Mở)','Open'),('___ down, please. (Ngồi)','Sit'),('Stand ___, please.','up'),('May I come ___?','in'),('Yes, you ___. (May I come in?)','can')],
'colour': [('What ___ is it? (màu)','colour'),('It ___ red.','is'),('What colour ___ they?','are'),('They ___ blue.','are'),('It is a ___ pen. (đỏ)','red')],
'sports': [('I ___ football at break time.','play'),('What do you ___ at break time?','do'),('Do you like chess? Yes, I ___.','do'),('I play ___. (cầu lông)','badminton'),('She ___ basketball.','plays')],
'family': [('Who ___ that?','is'),('She is my ___. (mẹ)','mother'),('He is my ___. (bố)','father'),('This is ___ sister. (chị/em gái tôi)','my'),('My brother ___ ten.','is')],
'job': [('What does she ___? (làm nghề gì)','do'),('She ___ a doctor.','is'),('He is ___ teacher.','a'),('My father is a ___. (tài xế)','driver'),('She is ___ artist.','an')],
'house': [('Where ___ the kitchen?','is'),('The bedroom is ___ the house. (trong)','in'),('There ___ a garden.','is'),('There ___ two bedrooms.','are'),('This is ___ house. (nhà của tôi)','my')],
'offer': [('Would you like ___ rice?','some'),('Yes, ___. (Vâng, làm ơn)','please'),('No, ___ you.','thank'),('I would ___ some milk.','like'),('Here you ___.','are')],
'country': [('Where are you ___?','from'),('I ___ from Viet Nam.','am'),('She ___ from Japan.','is'),('Where ___ he from?','is'),('They ___ from Australia.','are')],
'time': [('What ___ is it? (mấy giờ)','time'),("It is seven ___.","o'clock"),('I get up ___ six.','at'),('What time ___ she get up?','does'),('She ___ up at six.','gets')],
'week': [('What day ___ it today?','is'),('It ___ Monday.','is'),('I go to school ___ Monday.','on'),('What do you do ___ Sunday?','on'),('We ___ football on Saturday.','play')],
'month': [('When is your ___? (sinh nhật)','birthday'),('My birthday is ___ May.','in'),('___ is the first month.','January'),('My birthday ___ in March.','is'),('December is a ___. (tháng)','month')],
'ability': [('Can you ___? (bơi)','swim'),('Yes, I ___.','can'),("No, I ___.","can't"),('She can ___ a van. (vẽ)','draw'),('He ___ sing. (có thể)','can')],
'timetable': [('What subjects ___ you have today?','do'),('I ___ Maths on Monday.','have'),('She ___ English on Tuesday.','has'),('We have Art ___ Friday.','on'),('What subject ___ she have today?','does')],
'subject': [('What is your favourite ___? (môn học)','subject'),('My favourite subject ___ Music.','is'),('I like English ___ it is interesting. (bởi vì)','because'),('She ___ Maths. (thích)','likes'),('We ___ Science on Friday.','have')],
'holiday': [('I go to the beach ___ summer.','in'),('We ___ in the sea. (bơi)','swim'),('Where do you go ___ summer?','in'),('She ___ her grandparents in summer.','visits'),('I like summer ___. (kì nghỉ)','holidays')],
'appearance': [('What does she ___ like?','look'),('She ___ long hair.','has'),('He ___ tall.','is'),('They ___ slim.','are'),('She has ___ hair. (dài)','long')],
'weekend': [('What do you do ___ weekends?','at'),('We ___ our grandparents. (thăm)','visit'),('My family ___ to the park.','goes'),('She ___ books at weekends.','reads'),('What ___ your family do at weekends?','does')],
'weather': [('What is the weather ___ today?','like'),('It ___ sunny.','is'),('There are four ___ in a year. (mùa)','seasons'),('I like summer ___ I can swim. (bởi vì)','because'),('It is ___ today. (có gió)','windy')],
'city': [('Where ___ the cinema?','is'),('It is next ___ the bookshop.','to'),('Turn ___. (rẽ trái)','left'),('Go ___. (đi thẳng)','straight'),('The supermarket is ___ the school. (gần)','near')],
'price': [('How ___ is the shirt?','much'),('It ___ twenty thousand dong.','is'),('How much ___ the shoes?','are'),('They ___ thirty thousand dong.','are'),('I would ___ a shirt.','like')],
'animals': [('What does a monkey ___? (ăn)','eat'),('An elephant ___ plants.','eats'),('Lions ___ meat.','eat'),('What animals ___ you like?','do'),('I like ___. (khỉ)','monkeys')],
'future': [('I am going ___ swim.','to'),('What are you going to ___?','do'),('We are ___ to sing songs.','going'),('She ___ going to visit Ha Long Bay.','is'),('They ___ going to play games.','are')],
'personal': [('My name ___ {n}.','is'),('I ___ ten years old.','am'),('My hobby ___ reading.','is'),('I live ___ Ha Noi.','in'),('I am ___ Viet Nam.','from')],
'free': [('What do you do in your ___ time?','free'),('I ___ books. (đọc)','read'),('She ___ cartoons.','watches'),('He ___ camping.','goes'),('They like ___ chess. (chơi)','playing')],
'futurejob': [('What would you like to ___ in the future?','be'),('I would like to be ___ pilot.','a'),('She would ___ to be a doctor.','like'),('I want to be ___ artist.','an'),('I would like to be a doctor ___ I want to help people.','because')],
'schoolrooms': [('Where ___ the computer room?','is'),('It is ___ the second floor.','on'),('Where ___ the classrooms?','are'),('They ___ on the first floor.','are'),('The library is next ___ the music room.','to')],
'schoolact': [('What school activity ___ you like?','do'),('I like ___ projects. (làm)','doing'),('She likes ___ books. (đọc)','reading'),('We ___ games at school.','play'),('He likes singing ___. (bài hát)','songs')],
'whose': [('___ pencil case is this? (của ai)','Whose'),('It is ___. (của tôi)','mine'),('These crayons ___ hers.','are'),('This notebook ___ his.','is'),('It is ___ bag. (túi của cô ấy)','her')],
'past': [('___ you plant trees yesterday?','Did'),('Yes, I ___.','did'),("No, I ___.","didn't"),('I ___ football yesterday.','played'),('We ___ flowers yesterday. (đã tưới)','watered')],
'trip': [('Where ___ you go last Sunday?','did'),('I ___ to the zoo.','went'),('How did you ___ there?','get'),('We went there ___ bus.','by'),('Did you enjoy the trip? Yes, I ___.','did')],
'pastbe': [('Where ___ you last weekend?','were'),('I ___ at home.','was'),('She ___ at the park yesterday.','was'),('They ___ at the zoo yesterday.','were'),('Were you at home? Yes, I ___.','was')],
'will': [('What ___ you do at Tet? (sẽ)','will'),('I will ___ my grandparents.','visit'),('Will you decorate the house? Yes, I ___.','will'),("Will you go out? No, I ___.","won't"),('She ___ buy flowers tomorrow. (sẽ)','will')],
'healthy': [('You ___ eat vegetables. (nên)','should'),("You ___ stay up too late. (không nên)","shouldn't"),('We should ___ exercise.','do'),('Fruit ___ good for us.','is'),('You should drink ___. (nước)','water')],
'health': [('What is the ___ with you?','matter'),('I ___ a headache.','have'),('She ___ a toothache.','has'),('You should ___ an adult when you feel ill. (nói với)','tell'),('He ___ a sore throat.','has')],
'story': [('What story are you ___? (đang đọc)','reading'),('The main character ___ kind.','is'),('I ___ a story yesterday. (đã đọc)','read'),('The fox ___ clever.','is'),('I like this story ___ it is interesting.','because')],
'transport': [('How do you ___ to school?','go'),('I go to school ___ bus.','by'),('She goes to school ___ foot.','on'),('He ___ to school by bike.','goes'),('How ___ she go to school?','does')],
'places': [('Where would you like to ___? (thăm)','visit'),('I would ___ to visit the museum.','like'),('We went to the island ___ boat.','by'),('The temple ___ beautiful.','is'),('I want to go there ___ it is interesting.','because')]
}

DISTRACTORS=['am','is','are','have','has','do','does','did','can','will','in','on','at','to','from','a','an','the','some','your','my','his','her','go','goes','going','play','plays','played','what','where','when','who','many','much','book','blue','three']
MALES=['Ben','Tom','Nam','Bill','Minh','Sam'];FEMALES=['Mai','Lucy','Ann','Mary','Linh','Kim']

def Q(prompt,answer,wrongs,why,r,fill=False):return tv.make_question(prompt,answer,wrongs,why,r,fill)

def build_book(grade):
 us=units(grade);block=4 if grade<=2 else 5;book={'book':f'Tiếng Anh {grade} – Global Success','grade':grade,'subjectId':'tieng-anh','yearId':'2026-2027','sources':[f'https://cuppy.hoclieu.vn/book/g{grade}-english-global-success'],'note':'Mục lục theo sách; từ vựng và câu hỏi bổ trợ tự soạn, có từ mở rộng. Không thay thế bài nghe, luyện nói và các bài tập nguyên bản SGK.','chapters':[]};order=0
 for cidx in range(4):
  semester='hk1' if cidx<2 else 'hk2';start=cidx*block+1;end=start+block-1
  chapter={'id':f'gs-en-{grade}-c{cidx+1:02}','name':f'Chủ đề {cidx+1}: Unit {start}–{end}','semester':semester,'sortOrder':cidx+1,'lessons':[]}
  def append(id_,name,kind,scope):
   nonlocal order
   order+=1;chapter['lessons'].append({'id':f'gs-en-{grade}-{id_}','name':name,'title':name,'kind':kind,'unitNumbers':scope,'sortOrder':order})
  if grade>=3 and cidx==0:append('starter','Starter – Ôn tập khởi động','starter',list(range(1,block+1)))
  for n in range(start,end+1):
   append(f'u{n:02}',f'Unit {n}. {us[n-1]["title"]}','unit',[n])
   if grade<=2 and n in [2,6,10,14]:append(f'fun{cidx+1}',f'Fun time {cidx+1} – Unit {start}–{n}','fun',list(range(start,n+1)))
  append(f'review{cidx+1}',f'Review {cidx+1} – Unit {start}–{end}','review',list(range(start,end+1)))
  if grade>=3:append(f'fun{cidx+1}',f'{"Fun time" if grade==3 else "Extension activities"} {cidx+1} – Unit {start}–{end}','fun' if grade==3 else 'extension',list(range(start,end+1)))
  book['chapters'].append(chapter)
 return book

def vocabulary(unit,r):
 questions=[];all_vocab=[pair for grade in DATA for u in units(grade) for pair in u['vocab']]
 for en,vi in unit['vocab']:
  wrong_en=list(dict.fromkeys(e for e,v in all_vocab if e.casefold()!=en.casefold() and v!=vi));r.shuffle(wrong_en)
  wrong_vi=list(dict.fromkeys(v for e,v in all_vocab if v!=vi and e.casefold()!=en.casefold()));r.shuffle(wrong_vi)
  letters=[c for c in en if c.isalpha()];scrambled=letters.copy();r.shuffle(scrambled)
  if scrambled==letters:scrambled=letters[1:]+letters[:1]
  questions +=[
   Q(f'Chọn từ/cụm từ tiếng Anh có nghĩa “{vi}”.',en,wrong_en,f'“{en}” có nghĩa là “{vi}”.',r),
   Q(f'“{en}” có nghĩa tiếng Việt nào sau đây?',vi,wrong_vi,f'“{en}” nghĩa là “{vi}”.',r),
   Q(f'Viết từ/cụm từ tiếng Anh nghĩa là “{vi}”. Gợi ý: bắt đầu bằng chữ {letters[0].upper()}.',en,wrong_en,f'Cách viết đầy đủ là “{en}”.',r,fill=True),
   Q(f'Từ/cụm “{en}” có bao nhiêu chữ cái? Chỉ đếm chữ cái, không tính khoảng trắng và dấu câu.',str(len(letters)),[str(len(letters)+1),str(len(letters)+2),str(max(1,len(letters)-1))],f'Có {len(letters)} chữ cái: '+', '.join(letters)+'.',r,fill=True),
   Q('Sắp xếp các chữ cái '+ ' – '.join(scrambled)+f' thành từ/cụm từ nghĩa là “{vi}”. Viết cả khoảng trắng nếu có.',en,wrong_en,f'Từ/cụm từ cần viết là “{en}”.',r,fill=True)
  ]
 return questions

def grammar(unit,r):
 questions=[];names=r.sample(MALES+FEMALES,3)
 for row,(pattern,answer) in enumerate(GRAMMAR[unit['focus']]):
  for idx,n in enumerate(names):
   sentence=pattern.format(n=n);wrongs=[x for x in DISTRACTORS if x.casefold()!=answer.casefold()]
   # Distractors deliberately contrast grammar; explicit options avoid multiple
   # grammatical alternatives such as "a/the" in an unconstrained blank.
   if answer in ['a','an']:wrongs=['am','are','has']
   elif answer in ['my','your','her','his']:wrongs=['am','are','to']
   elif answer in ['in','on','at','to','by','from']:wrongs=['am','is','are']
   elif answer in ['is','are','am']:wrongs=[x for x in ['is','are','am','be'] if x!=answer]
   elif answer in ['do','does','did']:wrongs=[x for x in ['is','are','am'] if x!=answer]
   elif answer in ['can','will','should',"shouldn't"]:wrongs=['is','are','am']
   else:wrongs=[x for x in ['am','are','from','three'] if x.casefold()!=answer.casefold()]
   prompt=f'{n} đang làm bài luyện mẫu câu. Điền chỗ trống: “{sentence}”'
   questions.append(Q(prompt,answer,wrongs,f'Điền “{answer}” được câu: '+sentence.replace('___',answer),r,fill=idx==2))
 return questions

def reading(unit,r,grade):
 # Closed facts provide enough context for shuffled practice and exams.
 questions=[];names=r.sample(MALES+FEMALES,3)
 for index,a in enumerate(names):
  b=r.choice([n for n in MALES+FEMALES if n!=a]);en,vi=unit['vocab'][index];other_en,other_vi=unit['vocab'][(index+1)%4]
  # For young learners, this is an explicit bilingual word-card game.
  # Older learners read an original English account of the same activity.
  if grade<=2:
   text=f'Trong trò chơi thẻ từ, {a} chọn thẻ “{en}” ({vi}). {b} chọn thẻ “{other_en}” ({other_vi}). {a} giơ thẻ của mình trước, rồi đến {b}.'
   prefix='Đọc tình huống tự soạn: '+text+' '
  else:
   text=f'{a} and {b} are playing a word game in their classroom. {a} chooses the word "{en}". {b} chooses the word "{other_en}". {a} shows the word first. Then {b} shows the other word. They take turns and help each other read the words.'
   prefix='Read the original supplementary text: '+text+' '
  def rq(p,ans,wrongs,why,fill=False):return Q(prefix+p,ans,wrongs,why,r,fill)
  questions +=[
   rq(f'{a} chọn từ/cụm từ nào?',en,[e for e,v in unit['vocab'] if e!=en],f'Tình huống cho biết {a} chọn “{en}”.',fill=True),
   rq(f'{b} chọn từ/cụm từ nào?',other_en,[e for e,v in unit['vocab'] if e!=other_en],f'Tình huống cho biết {b} chọn “{other_en}”.'),
   rq('Ai giơ thẻ/từ của mình trước?',a,[n for n in MALES+FEMALES if n!=a],f'{a} giơ thẻ/từ trước, rồi mới đến {b}.',fill=True),
   rq(f'Người chơi cùng {a} là ai?',b,[n for n in MALES+FEMALES if n not in [a,b]],f'Tình huống nêu hai người chơi là {a} và {b}.'),
   rq(f'Trong tình huống này, thẻ “{en}” mang nghĩa nào?',vi,[v for e,v in unit['vocab'] if v!=vi],f'“{en}” nghĩa là “{vi}”.')
  ]
 return questions

def make_bank(grade,lesson,us):
 r=random.Random(grade*50000+lesson['sortOrder']);selected=[us[n-1] for n in lesson['unitNumbers']]
 if lesson['kind']=='starter':selected=[us[0],us[1],us[3],us[4]]
 if lesson['kind']=='unit':base=selected[0];return vocabulary(base,r)+grammar(base,r)+reading(base,r,grade)
 # Review/Fun time re-generate exercises from precisely their Unit range.
 banks=[vocabulary(u,r)+grammar(u,r)+reading(u,r,grade) for u in selected]
 bank=[];seen=set();candidates=[]
 for i in range(50):
  for other in banks:candidates.append(other[i])
 for q in candidates:
  if q['prompt'] in seen:continue
  seen.add(q['prompt']);bank.append(q)
  if len(bank)==50:break
 return bank

def main():
 OUT.mkdir(parents=True,exist_ok=True);manifest=[];outline=['# Tiếng Anh lớp 1–5 — Global Success','','Mục lục đối chiếu sách; bài tập bổ trợ tự soạn, có từ vựng mở rộng. Mỗi Unit, Starter, Review, Fun time hoặc Extension activities có **50 câu**, đáp án và lời giải; Word riêng.','','Lớp 1–2: 16 Unit + 4 Review + 4 Fun time = 24 Word/lớp. Lớp 3–5: 20 Unit + Starter + 4 Review + 4 bộ mở rộng (Fun time ở lớp 3, Extension activities ở lớp 4–5) = 29 Word/lớp. Tổng **135 Word / 6.750 câu**.','','Các câu này luyện từ vựng, chữ viết, mẫu câu và đọc hiểu tình huống. Đây không phải toàn bộ bài tập nguyên bản SGK và không thay thế luyện nghe/nói. Không dùng phiên âm chữ cái sai trong tài liệu ban đầu; phần đọc âm cần luyện cùng bản âm thanh của sách. Với lớp 1–2, phụ huynh có thể đọc hướng dẫn tiếng Việt.','','Mỗi Unit có 20 câu từ vựng/chữ viết, 15 câu mẫu câu và 15 câu đọc tình huống tự soạn. Mỗi câu đọc kèm đủ dữ kiện, không phụ thuộc tranh hay âm thanh bị thiếu.','']
 for grade in range(1,6):
  us=units(grade);book=build_book(grade);(ROOT/f'backend/seed-data/english-grade{grade}-gs.json').write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n',encoding='utf8');outline +=[f'## Lớp {grade}','']
  for chapter in book['chapters']:
   outline +=[f'### Học kì {1 if chapter["semester"]=="hk1" else 2} — {chapter["name"]}','']
   for lesson in chapter['lessons']:
    questions=make_bank(grade,lesson,us)
    assert len(questions)==50 and len({q['prompt'] for q in questions})==50,lesson['id']
    assert all(len(q['prompt'])<=1000 and q['explanation'] for q in questions),lesson['id']
    folder=OUT/f'lop-{grade}'/chapter['semester'];folder.mkdir(parents=True,exist_ok=True)
    file=folder/f'50-cau-tieng-anh-lop-{grade}-{lesson["id"].split(f"gs-en-{grade}-")[1]}-{tv.writer.slug(lesson["name"])}.docx'
    notes=['Bài tập bổ trợ tự soạn, có từ vựng mở rộng; không phải bản chép nguyên văn bài tập SGK. Không có bài nghe chấm tự động trong tệp này.', 'Tự luyện nói/viết thêm: Chọn 3–5 từ đã học, nói hoặc viết các câu ngắn phù hợp chủ đề. Phụ huynh/giáo viên nhận xét cách dùng từ, mẫu câu và phát âm; phần này ngoài 50 câu và không có một đáp án cố định.']
    tv.writer.write_docx(file,grade,chapter,lesson,questions,subject_label='Tiếng Anh',extra_notes=notes)
    manifest.append({'grade':grade,'subjectId':'tieng-anh','lessonId':lesson['id'],'lessonName':lesson['name'],'semester':chapter['semester'],'chapterId':chapter['id'],'file':file.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'questions':questions})
    outline.append('- **'+lesson['name']+'** — 50 câu.')
   outline.append('')
  outline +=['Nguồn đối chiếu: '+book['sources'][0],''];print(json.dumps({'grade':grade,'wordFiles':sum(x['grade']==grade for x in manifest)}),flush=True)
 outline +=['## Tải Word','','[Toàn bộ Word lớp 1–5](tai-lieu/tieng-anh-lop-1-den-5-50-cau.zip)','','Trong admin: Nội dung học tập → Lớp → Học kì → Tiếng Anh → Chủ đề → Unit/bộ ôn tập. Word gốc tại Word đã nạp. Tất cả câu hỏi mới lưu Nháp để duyệt trước khi đăng.','']
 text='\n'.join(outline);(ROOT/'cacbaitienganh1-5.md').write_text(text,encoding='utf8');(OUT/'README.md').write_text(text,encoding='utf8')
 (ROOT/'backend/backups/english-primary-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 for grade in [None,1,2,3,4,5]:
  name='tieng-anh-lop-1-den-5-50-cau.zip' if grade is None else f'tieng-anh-lop-{grade}-50-cau.zip'
  with zipfile.ZipFile(OUT.parent/name,'w',zipfile.ZIP_DEFLATED) as z:
   z.writestr('README.md',text)
   for item in manifest:
    if grade is None or item['grade']==grade:
     file=ROOT/item['file'];z.write(file,file.relative_to(OUT).as_posix())
 print(json.dumps({'files':len(manifest),'questions':len(manifest)*50}))

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8');main()
