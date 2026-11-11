"""Build reviewed Q1 lesson vocabulary and Word question banks from scanned PDFs.

Run with PYTHONPATH=.tmp-chinese-tools python backend/scripts/build-chinese-lessons-3-6.py.
Source page numbers refer to the supplied PDF, starting at 1.
"""
from pathlib import Path
import json
import random
from zipfile import ZipFile, ZIP_DEFLATED
from docx import Document
from docx.shared import Inches, Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tai-lieu/tieng-trung-bai-3-6'
TITLES = {3:'很高兴认识你',4:'你去哪儿',5:'你要吃什么',6:'你在哪儿工作'}
# Hanzi | pinyin | Vietnamese meaning | source page. Separate main/extended lists.
DATA = {
3: ('''请问|qǐngwèn|xin hỏi|5
请|qǐng|xin, mời|5
问|wèn|hỏi|5
觉得|juéde|cảm thấy, cho rằng|6
这|zhè|này, đây|7
那|nà|kia, đó|8
的|de|của; trợ từ nối định ngữ|9
名片|míngpiàn|danh thiếp|10
身体|shēntǐ|cơ thể, sức khỏe|10
对不起|duìbuqǐ|xin lỗi|11
没关系|méi guānxi|không sao, không có gì|11
没事|méi shì|không sao, không có việc gì|11
有|yǒu|có|12
没有|méiyǒu|không có, chưa có|12
朋友|péngyou|bạn bè|13
高兴|gāoxìng|vui mừng|13
认识|rènshi|quen, biết một người|14
先生|xiānsheng|ông, ngài; cách xưng hô lịch sự|15
女士|nǚshì|bà, cô; cách xưng hô lịch sự|15
马|mǎ|họ Mã; con ngựa|15
黄文丽|Huáng Wénlì|Hoàng Văn Lệ, tên nhân vật|15
也|yě|cũng|16
小|xiǎo|nhỏ, bé|16
大|dà|to, lớn|16
都|dōu|đều|17
忙|máng|bận|17''', '''进|jìn|vào|5
坐|zuò|ngồi|5
请假|qǐngjià|xin nghỉ phép|5
还|hái|vẫn, còn; cũng khá|6
好吃|hǎochī|ngon, dùng cho đồ ăn|6
烤鸭|kǎoyā|vịt quay|6
便宜|piányi|rẻ|6
这些|zhèxiē|những cái này|7
那些|nàxiē|những cái kia|8
书|shū|sách|8
汉语书|Hànyǔ shū|sách tiếng Hán|12
英语书|Yīngyǔ shū|sách tiếng Anh|12
女朋友|nǚ péngyou|bạn gái|13
男朋友|nán péngyou|bạn trai|13
好朋友|hǎo péngyou|bạn tốt, bạn thân|13
王|Wáng|họ Vương|15
黄|Huáng|họ Hoàng|15
老师|lǎoshī|giáo viên|15
名字|míngzi|tên|19
爸爸|bàba|bố|21
妈妈|māma|mẹ|21
公司|gōngsī|công ty|21
买|mǎi|mua|25
我们|wǒmen|chúng tôi, chúng ta|26
谁|shéi|ai|29
学生|xuésheng|học sinh, sinh viên|29
中国人|Zhōngguó rén|người Trung Quốc|32
英国人|Yīngguó rén|người Anh|36
美国人|Měiguó rén|người Mỹ|36
泰国人|Tàiguó rén|người Thái Lan|38
时间|shíjiān|thời gian|40
就是|jiùshì|chính là|40
金钱|jīnqián|tiền bạc|40
吃|chī|ăn|40
一|yī|một|40
堑|qiàn|hào, hố; trở ngại trong câu tục ngữ|40
长|zhǎng|tăng trưởng, tăng thêm|40
智|zhì|trí tuệ, sự khôn ngoan|40
人|rén|người|40
往|wǎng|hướng về, đi về phía|40
高处|gāochù|nơi cao|40
走|zǒu|đi, bước đi|40
水|shuǐ|nước|40
低处|dīchù|nơi thấp|40
流|liú|chảy|40
叫|jiào|gọi, tên là|2
什么|shénme|gì, cái gì|2
新|xīn|mới|2
很|hěn|rất|2
毛笔|máobǐ|bút lông|2
哪|nǎ|nào|2
飞机|fēijī|máy bay|2
国|guó|nước, quốc gia|2
越南|Yuènán|Việt Nam|2
美|měi|đẹp; yếu tố chỉ Mỹ trong tên nước|2
咖啡|kāfēi|cà phê|2
不|bù|không; từ phủ định|2
贵姓|guìxìng|quý tính; hỏi họ một cách lịch sự|2
中国|Zhōngguó|Trung Quốc|2
呢|ne|trợ từ; dùng để hỏi lại trong bài|2
贵|guì|đắt; quý trong cách nói kính trọng|2'''),
4: ('''小姐|xiǎojiě|cô, tiểu thư; cách xưng hô trong bài|6
师傅|shīfu|bác tài, thầy; cách gọi người thợ lành nghề|6
去|qù|đi, đến; hướng xa người nói|7
哪儿|nǎr|ở đâu|7
哪里|nǎlǐ|ở đâu, chỗ nào|7
人民|rénmín|nhân dân|8
广场|guǎngchǎng|quảng trường|8
人民广场|Rénmín Guǎngchǎng|Quảng trường Nhân Dân|16
知道|zhīdào|biết một thông tin|10
了|le|trợ từ; biểu thị thay đổi trạng thái trong bài|10
远|yuǎn|xa|11
近|jìn|gần|11
到|dào|đến, tới; nhấn mạnh điểm đến|7
多少|duōshao|bao nhiêu|12
钱|qián|tiền|12
块|kuài|đồng, tệ; đơn vị tiền trong khẩu ngữ|12
谢谢|xièxie|cảm ơn|14
不客气|bú kèqi|không có gì; đáp lại lời cảm ơn|14
再见|zàijiàn|tạm biệt, hẹn gặp lại|13''', '''早上|zǎoshang|buổi sáng sớm|5
上午|shàngwǔ|buổi sáng|5
中午|zhōngwǔ|buổi trưa|5
下午|xiàwǔ|buổi chiều|5
晚上|wǎnshang|buổi tối|5
半夜|bànyè|nửa đêm|5
女士|nǚshì|bà, cô; cách xưng hô lịch sự|6
姑娘|gūniang|cô gái|6
妹妹|mèimei|em gái|6
美女|měinǚ|người đẹp, cô gái đẹp|6
小哥哥|xiǎo gēge|anh trai trẻ; cách gọi thân mật|6
帅哥|shuàigē|chàng trai đẹp trai|6
司机|sījī|tài xế, người lái xe|6
来|lái|đến; hướng về người nói|7
人民币|rénmínbì|nhân dân tệ|8
步行街|bùxíngjiē|phố đi bộ|8
河内|Hénèi|Hà Nội|8
巴亭广场|Bātíng Guǎngchǎng|Quảng trường Ba Đình|8
学校|xuéxiào|trường học|9
公司|gōngsī|công ty|9
医院|yīyuàn|bệnh viện|9
超市|chāoshì|siêu thị|9
宿舍|sùshè|ký túc xá|9
电影院|diànyǐngyuàn|rạp chiếu phim|9
明白|míngbai|hiểu rõ|10
离|lí|cách; chỉ khoảng cách|11
找|zhǎo|tìm; trả lại tiền thừa|12
多|duō|nhiều|12
少|shǎo|ít|12
再|zài|lại, thêm, nữa|13
感谢|gǎnxiè|cảm ơn, cảm tạ|14
不用谢|bú yòng xiè|không cần cảm ơn, không có gì|14
客气|kèqi|khách sáo|14
机场|jīchǎng|sân bay|24
火车站|huǒchēzhàn|ga tàu hỏa|24
博物馆|bówùguǎn|bảo tàng|24
公园|gōngyuán|công viên|24
饭店|fàndiàn|nhà hàng; khách sạn tùy ngữ cảnh|26
杯|bēi|cốc, ly; lượng từ đồ uống|27
可乐|kělè|nước cô la|27
个|gè|cái; lượng từ thông dụng|27
面包|miànbāo|bánh mì|27
瓶|píng|chai; lượng từ đồ đựng trong chai|27
坐|zuò|ngồi; đi bằng phương tiện|28
公共汽车|gōnggòng qìchē|xe buýt|28
地铁|dìtiě|tàu điện ngầm|28
公安局|gōng'ānjú|cơ quan công an|28
邮局|yóujú|bưu điện|28
饭馆儿|fànguǎnr|quán ăn, nhà hàng|28
厕所|cèsuǒ|nhà vệ sinh|28
大概|dàgài|khoảng, có lẽ|29
塞翁失马|sài wēng shī mǎ|tái ông mất ngựa; họa phúc khó lường|30
亡羊补牢|wáng yáng bǔ láo|mất dê mới sửa chuồng; sửa sai khi còn kịp|30
宰相|zǎixiàng|tể tướng|30
肚里|dù lǐ|trong bụng|30
能|néng|có thể, có khả năng|30
撑船|chēngchuán|chống thuyền, chèo thuyền|30
小牛|Xiǎo Niú|Tiểu Ngưu, tên nhân vật|31
小刘|Xiǎo Liú|Tiểu Lưu, tên nhân vật|31
拍球|pāi qiú|vỗ bóng, đập bóng|31
九|jiǔ|chín|31
六|liù|sáu|31
比|bǐ|so với; dùng trong so sánh|31'''),
5: ('''要|yào|muốn, cần, phải|5
想|xiǎng|muốn, nhớ, nghĩ|5
吃|chī|ăn|6
一点儿|yìdiǎnr|một chút|8
个|gè|cái; lượng từ thông dụng|10
牛肉|niúròu|thịt bò|6
青菜|qīngcài|rau xanh|6
还|hái|còn, thêm, vẫn|29
碗|wǎn|bát; lượng từ đồ đựng trong bát|13
米饭|mǐfàn|cơm trắng|11
其他|qítā|khác, những cái khác|16
有点儿|yǒudiǎnr|hơi, có chút|8
饿|è|đói|14
饱|bǎo|no|14
喝|hē|uống|7
杯|bēi|cốc, ly; lượng từ đồ uống|7
奶茶|nǎichá|trà sữa|7
茶|chá|trà|7
快|kuài|nhanh, sắp|14
慢|màn|chậm, trễ|14
还是|háishi|hay là; nối lựa chọn trong câu hỏi|12
一共|yígòng|tổng cộng, tất cả|13
馒头|mántou|bánh màn thầu|6
包子|bāozi|bánh bao có nhân|6''', '''记得|jìde|nhớ, ghi nhớ|5
菜|cài|món ăn, rau|6
新鲜|xīnxiān|tươi, tươi mới|6
饺子|jiǎozi|sủi cảo|6
蔬菜|shūcài|rau củ|6
牛奶|niúnǎi|sữa bò|7
杯子|bēizi|cái cốc, cái ly|7
和|hé|và|7
好吃|hǎochī|ngon, dùng cho đồ ăn|7
好喝|hǎohē|ngon, dùng cho đồ uống|7
泡茶|pào chá|pha trà|7
买|mǎi|mua|9
卖|mài|bán|9
位|wèi|vị; lượng từ kính trọng cho người|10
口|kǒu|người; lượng từ đếm thành viên gia đình|10
本|běn|quyển; lượng từ sách|11
饭|fàn|cơm, bữa ăn|11
饭馆儿|fànguǎnr|quán ăn|11
饭店|fàndiàn|nhà hàng; khách sạn tùy ngữ cảnh|11
斤|jīn|cân Trung Quốc, bằng 500 gam|12
公斤|gōngjīn|kilôgam, bằng 1000 gam|12
或者|huòzhě|hoặc; nối lựa chọn trong câu trần thuật|12
份|fèn|suất, phần; lượng từ|13
咖啡|kāfēi|cà phê|13
孩子|háizi|con, trẻ con|15
几|jǐ|mấy, bao nhiêu; thường hỏi số lượng nhỏ|15
第|dì|tiền tố chỉ thứ tự|15
第一|dì yī|thứ nhất|15
第三|dì sān|thứ ba|15
别的|biéde|cái khác, thứ khác|16
别|bié|đừng; dùng trong lời ngăn cản|16
水果|shuǐguǒ|hoa quả, trái cây|17
种|zhǒng|loại; lượng từ chỉ chủng loại|17
种|zhòng|trồng|17
树|shù|cây|17
苹果|píngguǒ|táo|18
芒果|mángguǒ|xoài|18
香蕉|xiāngjiāo|chuối|18
椰子|yēzi|dừa|18
番石榴|fānshíliu|ổi|18
石榴|shíliu|lựu|18
榴莲|liúlián|sầu riêng|18
菠萝蜜|bōluómì|mít|18
菠萝|bōluó|dứa, thơm|18
西瓜|xīguā|dưa hấu|18
橙子|chéngzi|cam|18
橘子|júzi|quýt|18
黄瓜|huángguā|dưa chuột|18
胡萝卜|húluóbo|cà rốt|18
两|liǎng|hai; thường dùng trước lượng từ|20
三|sān|ba|21
张|zhāng|tờ, chiếc; lượng từ vật có bề mặt phẳng|23
棵|kē|cây; lượng từ cho cây|23
朵|duǒ|bông, đóa; lượng từ cho hoa|23
条|tiáo|con, chiếc; lượng từ vật dài|23
只|zhī|con; lượng từ cho nhiều loài vật|23
幅|fú|bức; lượng từ cho tranh|23
面|miàn|mặt; lượng từ cho vật có mặt phẳng như gương|23
大杯|dà bēi|cốc lớn|24
小杯|xiǎo bēi|cốc nhỏ|24
旅游|lǚyóu|du lịch|25
礼物|lǐwù|quà tặng|27
服务员|fúwùyuán|nhân viên phục vụ|35
售货员|shòuhuòyuán|nhân viên bán hàng|33
真|zhēn|thật, thật là|34
衣服|yīfu|quần áo|38
件|jiàn|chiếc; lượng từ cho áo, sự việc|38
民以食为天|mín yǐ shí wéi tiān|dân lấy cái ăn làm đầu|39
车到山前必有路|chē dào shān qián bì yǒu lù|xe đến trước núi ắt có đường; rồi sẽ có cách|39
有志者事竟成|yǒu zhì zhě shì jìng chéng|có chí thì nên|39
喜欢|xǐhuan|thích|40
甜|tián|ngọt|40
辣|là|cay|40
酸|suān|chua|40
苦|kǔ|đắng|40'''),
6: ('''在|zài|ở; đang|5
工作|gōngzuò|làm việc; công việc|6
苹果|píngguǒ|quả táo|6
公司|gōngsī|công ty|6
留学生|liúxuéshēng|du học sinh|10
留学|liúxué|du học|10
学|xué|học|11
学习|xuéxí|học, học tập|11
汉语|Hànyǔ|tiếng Hán, tiếng Trung|11
英语|Yīngyǔ|tiếng Anh|26
朋友|péngyou|bạn bè|25
男朋友|nán péngyou|bạn trai|25
女朋友|nǚ péngyou|bạn gái|26
对|duì|đúng|13
做|zuò|làm|7
大学|dàxué|đại học|15
中学|zhōngxué|trung học|15
教|jiāo|dạy|16
海伦|Hǎilún|Helen, tên nhân vật|18
马文|Mǎ Wén|Mã Văn, tên nhân vật|18
北京|Běijīng|Bắc Kinh|18
上海|Shànghǎi|Thượng Hải|18
苹果公司|Píngguǒ Gōngsī|công ty Apple|18''', '''正在|zhèngzài|đang; chỉ hành động diễn ra|5
正|zhèng|đang, đúng lúc|5
东西|dōngxi|đồ, đồ vật|5
半|bàn|nửa|6
看|kàn|nhìn, xem, đọc, thăm, khám|6
现在|xiànzài|bây giờ, hiện tại|6
份|fèn|phần, suất; lượng từ|6
干|gàn|làm, làm việc|7
当|dāng|làm, đảm nhiệm một vai trò|7
办|bàn|làm, giải quyết, tổ chức|7
弄|nòng|làm, xử lý|7
搞|gǎo|làm, tiến hành|7
手机|shǒujī|điện thoại di động|8
电话|diànhuà|điện thoại|8
打电话|dǎ diànhuà|gọi điện thoại|8
电话号码|diànhuà hàomǎ|số điện thoại|8
电脑|diànnǎo|máy tính|9
笔记本电脑|bǐjìběn diànnǎo|máy tính xách tay|9
手提电脑|shǒutí diànnǎo|máy tính xách tay, máy tính cầm tay|9
电视|diànshì|truyền hình, tivi|9
电视机|diànshìjī|máy thu hình, tivi|9
难|nán|khó|11
容易|róngyì|dễ|11
上课|shàngkè|vào lớp, học trên lớp|11
下课|xiàkè|tan lớp, hết giờ học|11
上班|shàngbān|đi làm, vào ca|11
下班|xiàbān|tan làm, hết ca|11
同学|tóngxué|bạn học|12
同事|tóngshì|đồng nghiệp|12
坏|huài|xấu, hư, hỏng|12
错|cuò|sai, nhầm|13
不错|bú cuò|khá tốt, không tệ|13
没错|méi cuò|không sai, đúng vậy|13
图书馆|túshūguǎn|thư viện|13
教学楼|jiàoxuélóu|tòa nhà giảng dạy|13
漂亮|piàoliang|đẹp, xinh đẹp|14
好看|hǎokàn|đẹp, ưa nhìn; hay khi nói về phim, sách|14
衣服|yīfu|quần áo|14
套|tào|bộ; lượng từ cho đồ đi thành bộ|14
地方|dìfang|nơi, chỗ|14
长城|Chángchéng|Vạn Lý Trường Thành|14
小学|xiǎoxué|tiểu học|15
初中|chūzhōng|trung học cơ sở, cấp hai|15
高中|gāozhōng|trung học phổ thông, cấp ba|15
读|dú|đọc; học một cấp học|15
外语|wàiyǔ|ngoại ngữ|16
听|tīng|nghe|16
说|shuō|nói|16
写|xiě|viết|16
能|néng|có thể, có khả năng|17
可以|kěyǐ|có thể, được phép|17
会|huì|biết làm; sẽ|17
见面|jiànmiàn|gặp mặt|20
睡觉|shuìjiào|ngủ|20
帮忙|bāngmáng|giúp đỡ|20
请假|qǐngjià|xin nghỉ phép|20
结婚|jiéhūn|kết hôn|20
小时|xiǎoshí|giờ, tiếng đồng hồ|20
天|tiān|ngày|20
这儿|zhèr|ở đây, chỗ này|24
英国人|Yīngguó rén|người Anh|25
出租车|chūzūchē|xe taxi|28
西安|Xī'ān|Tây An|28
医生|yīshēng|bác sĩ|32
病人|bìngrén|bệnh nhân|32
忙|máng|bận|32
听不见|tīng bu jiàn|không nghe thấy|33
手机号|shǒujī hào|số điện thoại di động|28''')
}

# Context questions: prompt | correct | three distractors | explanation.
CONTEXT = {
3: '''Chọn cách nói “Đây là danh thiếp của tôi”.|这是我的名片。|这是我名片的。|这的我是名片。|这是名片的我。|我的名片: danh thiếp của tôi; 的 đứng giữa người sở hữu và vật.
Điền từ: 我___名片。(Tôi không có danh thiếp.)|没有|不有|不是|不在|Phủ định của 有 là 没有.
Đáp lại “对不起” bằng câu nào phù hợp?|没关系。|再见。|你去哪儿？|多少？|没关系 dùng để đáp lại lời xin lỗi.
Chọn cách nói “Tôi cũng rất vui”.|我也很高兴。|我很也高兴。|我高兴也很。|也我高兴很。|也 đứng sau chủ ngữ, trước 很高兴.
Chọn câu đúng để nói “Tôi rất vui”.|我很高兴。|我是很高兴。|我高兴是。|很我是高兴。|Tính từ làm vị ngữ không cần thêm 是 trong mẫu câu này.
Trong bài khóa 1, người họ Cao đưa cho người họ Mã vật gì?|Danh thiếp|Vé tàu|Cốc trà|Quyển vở|Bài khóa có câu 这是我的名片.
Trong bài khóa 1, người họ Mã có danh thiếp không?|Không có|Có hai chiếc|Có ba chiếc|Có rất nhiều|Người họ Mã nói 我没有名片.
Điền từ: 他们___是中国人。(Họ đều là người Trung Quốc.)|都|的|名片|谁|都 biểu thị toàn bộ các thành viên đều có đặc điểm nêu sau đó.
Chọn câu hỏi họ một cách lịch sự.|请问，您贵姓？|你多少姓？|您在哪姓？|您姓什么钱？|您贵姓 là cách hỏi họ lịch sự.
“这是我的女朋友。” có nghĩa là gì?|Đây là bạn gái của tôi.|Đây là cô giáo của tôi.|Đó là bạn trai của tôi.|Tôi không có bạn.|女朋友 nghĩa là bạn gái; 这 nghĩa là đây.
“时间就是金钱。” có ý nghĩa gì?|Thời gian là tiền bạc.|Nước chảy chỗ trũng.|Tôi rất bận.|Bạn bè là giáo viên.|时间 là thời gian, 金钱 là tiền bạc.
“吃一堑，长一智。” nhắc nhở điều gì?|Qua vấp ngã thì thêm khôn ngoan.|Phải mua thêm đồ ăn.|Chỉ cần học số đếm.|Mọi người đều vui.|Đây là tục ngữ nói về kinh nghiệm có được từ vấp ngã.
Điền từ: 这是___书。(Đây là sách của cô giáo.)|老师的|的老师|老师是|是老师|Định ngữ sở hữu đứng trước 的 rồi đến danh từ 书.
Chọn cách nói “Tôi cũng rất vui được làm quen với bạn”.|认识你我也很高兴。|我认识也你很高兴。|高兴也你我认识很。|你也很我认识高兴。|认识你 nêu việc quen bạn; 我也很高兴 nêu cảm xúc của tôi.
Trong bài khóa 2, 欧文 là người nước nào?|Mỹ|Anh|Trung Quốc|Việt Nam|欧文 nói 我不是英国人，我是美国人.
Chọn từ trái nghĩa với 小.|大|也|都|的|小 là nhỏ; 大 là to, lớn.''',
4: '''Chọn câu hỏi “Bạn đi đâu?”.|你去哪儿？|你哪儿去的？|哪儿你钱？|你多少去？|Mẫu hỏi điểm đến là 你去哪儿.
Điền từ: 人民广场远___远？|不|没|吗|的|Câu hỏi chính phản lặp tính từ: 远不远.
Đổi 你有名片吗？ sang câu hỏi chính phản.|你有没有名片？|你有不有名片？|你有名片不吗？|你没不有名片？|有 có dạng chính phản đặc biệt là 有没有.
Chọn cách hỏi giá.|多少钱？|哪儿钱？|谁钱？|什么远？|多少 hỏi số lượng, 多少钱 hỏi bao nhiêu tiền.
“不远，很近。” nghĩa là gì?|Không xa, rất gần.|Rất xa, không gần.|Đã tới, rất xa.|Không biết giá.|远 là xa, 近 là gần.
Trong bài khóa 2, tiền đi xe là bao nhiêu?|29 tệ|19 tệ|39 tệ|9 tệ|Bài khóa ghi 二十九块.
Đáp lại 谢谢 bằng câu nào?|不客气。|对不起。|不知道。|我很忙。|不客气 là lời đáp lịch sự khi được cảm ơn.
“知道了” trong bài thể hiện điều gì?|Bây giờ đã biết, đã hiểu.|Chưa từng biết.|Đang hỏi họ.|Đã ăn no.|了 biểu thị sự thay đổi sang trạng thái đã biết.
Chọn từ dùng cho chuyển động hướng về người nói.|来|去|钱|远|来 là đến về phía người nói, 去 là đi ra xa phía người nói.
Điền từ: 我家___学校很近。|离|再|到|多少|Mẫu khoảng cách: A 离 B + tính từ.
Chọn cách đọc số 53.|五十三|三十五|五百三|十五三|五十 là năm mươi, thêm 三 thành năm mươi ba.
Chọn cách đọc số 2009.|二千零九|二百九|二千九百|二十九|零 biểu thị phần hàng bị khuyết trong số hai nghìn không trăm linh chín.
Chọn câu hỏi chính phản đúng.|你是不是中国人？|你是不中国人是？|你是中国人是不是吗？|你不中国人是？|Động từ 是 được lặp thành 是不是.
“我坐地铁去学校。” nghĩa là gì?|Tôi đi tàu điện ngầm đến trường.|Tôi đi máy bay đến trường.|Tôi ở trường đọc sách.|Tôi mua vé xem phim.|坐地铁 là đi bằng tàu điện ngầm.
Trong bài vè, 小牛 đánh chín quả, 小刘 đánh sáu quả. 小牛 nhiều hơn mấy quả?|Ba quả|Hai quả|Sáu quả|Chín quả|九减六等于三: 9 trừ 6 bằng 3.
Tục ngữ nào nói về việc kịp thời khắc phục sai lầm?|亡羊补牢|时间就是金钱|你好|很高兴认识你|亡羊补牢: mất dê mới sửa chuồng, nhấn mạnh sửa sai khi còn kịp.''',
5: '''Điền lượng từ: 两___米饭。|碗|本|位|棵|Cơm trong bát dùng lượng từ 碗.
Điền lượng từ: 三___汉语书。|本|杯|口|朵|Sách dùng lượng từ 本.
Điền lượng từ: 一___老师。|位|碗|杯|斤|位 là lượng từ kính trọng dành cho người.
Chọn cách nói “Hai cốc trà”.|两杯茶|二杯茶|两本茶|二位茶|Trước lượng từ 杯 thường dùng 两 khi chỉ số lượng hai.
Điền từ hỏi lựa chọn: 你喝茶___咖啡？|还是|或者|和的|也的|Trong câu hỏi lựa chọn trực tiếp, dùng 还是.
Điền từ: 茶___咖啡都可以。(Trà hoặc cà phê đều được.)|或者|还是吗|有点儿|多少|或者 nối các lựa chọn trong câu trần thuật.
Chọn câu “Tôi muốn mua một món quà”.|我要买一个礼物。|我想你一个礼物。|我卖要一个礼物。|我要一个买礼物的。|要 + 买 diễn đạt muốn mua; 一个礼物 là một món quà.
“我想你。” nghĩa phù hợp là gì?|Tôi nhớ bạn.|Tôi bán bạn.|Tôi gọi bạn ăn.|Tôi không quen bạn.|想 đứng trước đại từ chỉ người trong câu này mang nghĩa nhớ.
Điền từ: 请快___，我很饿。|一点儿|有点儿|多少|或者|快一点儿 là nhanh lên một chút; tính từ + 一点儿.
Điền từ: 这个菜___辣。|有点儿|一点儿的|个|杯|有点儿 + tính từ diễn đạt hơi, có chút; thường dùng cho cảm nhận không như mong muốn.
Trong bài khóa 1, khách gọi bao nhiêu bát cơm?|Hai bát|Một bát|Ba bát|Bốn bát|Khách nói 两碗米饭.
Trong bài khóa 1, tổng tiền là bao nhiêu?|50 tệ|18 tệ|28 tệ|29 tệ|Nhân viên trả lời 五十块.
Trong bài khóa 2, khách chọn trà sữa cốc nào?|Cốc nhỏ|Cốc lớn|Hai cốc lớn|Không gọi trà sữa|Khách đáp 小杯 khi được hỏi 大杯还是小杯.
Trong bài khóa 2, khách chọn cà phê cốc nào?|Cốc lớn|Cốc nhỏ|Ba cốc nhỏ|Không gọi cà phê|Khách đáp 大杯 khi nhân viên hỏi kích cỡ cà phê.
Trong bài khóa 2, tổng tiền hai đồ uống là bao nhiêu?|28 tệ|50 tệ|18 tệ|38 tệ|Bài khóa ghi 一共二十八块.
Một 斤 theo đơn vị hiện hành ở Trung Quốc đại lục bằng bao nhiêu?|500 gam|1000 gam|100 gam|50 gam|斤 là nửa kilôgam; 公斤 là một kilôgam. Không đồng nhất 斤 với cân Việt Nam.
Chọn cặp đối nghĩa.|饿 — 饱|茶 — 奶茶|牛肉 — 青菜|杯 — 碗|饿 là đói, 饱 là no.
Trong 种水果, nếu 种 nghĩa là “trồng” thì đọc thế nào?|zhòng|zhǒng|chóng|zhōng|种 đọc zhòng khi là động từ trồng; zhǒng khi nghĩa là loại.
“有志者事竟成。” tương ứng câu nào?|Có chí thì nên.|Thời gian là tiền bạc.|Tái ông mất ngựa.|Nước chảy chỗ trũng.|Câu này khích lệ ý chí và sự kiên trì.
Chọn từ trái nghĩa với 买.|卖|喝|吃|想|买 mǎi là mua; 卖 mài là bán, khác thanh điệu.''',
6: '''Chọn câu “Tôi làm việc ở công ty Apple”.|我在苹果公司工作。|我工作在苹果的。|苹果我在工作公司。|公司在我苹果工作。|Mẫu câu: chủ ngữ + 在 + địa điểm + động từ.
Điền từ: 他___看电视。(Anh ấy đang xem tivi.)|正在|多少|名片|老师|正在 đứng trước động từ để chỉ hành động đang diễn ra.
Chọn câu phủ định “Tôi không học tiếng Hán ở đây”.|我不在这儿学汉语。|我在不这儿学汉语。|我不在这儿汉语学。|我学不这儿在汉语。|Phủ định của mẫu địa điểm dùng 不在 trước địa điểm.
Trong bài khóa 1, 马文 là người ở đâu?|Thượng Hải|Bắc Kinh|Tây An|Hà Nội|马文 nói 不是，我是上海人 khi được hỏi có phải người Bắc Kinh không.
Trong bài khóa 1, 海伦 là người nước nào?|Mỹ|Anh|Trung Quốc|Thái Lan|海伦 nói 我是美国人.
Trong bài khóa 1, 马文 làm việc ở đâu?|Công ty Apple|Bệnh viện|Thư viện|Ga tàu|马文 nói 我在苹果公司工作.
Trong bài khóa 1, 海伦 là ai?|Du học sinh|Tài xế|Bác sĩ|Nhân viên bán hàng|海伦 nói 我是留学生.
Trong bài khóa 2, bạn trai của 海伦 là người nước nào?|Anh|Mỹ|Trung Quốc|Việt Nam|海伦 nói 他是英国人.
Trong bài khóa 2, bạn trai của 海伦 làm gì?|Dạy tiếng Anh ở đại học|Học tiếng Hán ở trung học|Bán táo ở siêu thị|Lái xe taxi|海伦 nói 他在大学教英语.
Trong bài khóa 2, bạn gái của 高小明 là giáo viên cấp nào?|Trung học|Đại học|Tiểu học|Mầm non|高小明 nói 她是中学老师.
Điền từ: 你的手机___是多少？|号|杯|本|碗|手机号 là số điện thoại di động.
Chọn cặp đối nghĩa về thời gian làm việc.|上班 — 下班|上班 — 上课|下班 — 下课|工作 — 学习|上班 là vào ca, đi làm; 下班 là tan làm.
Chọn cặp đối nghĩa.|难 — 容易|同学 — 同事|汉语 — 英语|电脑 — 手机|难 là khó, 容易 là dễ.
Trong 我会说汉语, 会 biểu thị điều gì?|Kỹ năng biết nói tiếng Hán|Địa điểm học|Số lượng sách|Lời xin lỗi|会 + động từ có thể biểu thị kỹ năng học được.
Chọn câu “Tôi đang ở thư viện”.|我在图书馆。|我图书馆在。|在我馆图书。|我图在书馆。|Chủ ngữ + 在 + địa điểm nêu vị trí.
Chọn cách nói “Tôi ngủ một tiếng”.|我睡一个小时觉。|我睡觉一个小时的觉觉。|我觉睡个一小时。|我一个觉小时睡。|睡觉 là động từ ly hợp; có thể chèn bổ ngữ thời lượng giữa 睡 và 觉.
“听不见” nghĩa là gì?|Không nghe thấy|Không nhìn thấy|Không đọc được|Không muốn viết|听 là nghe; 不见 trong kết cấu này biểu thị không đạt được kết quả cảm nhận.
Chọn từ chỉ người cùng làm việc.|同事|同学|学生|孩子|同事 là đồng nghiệp; 同学 là bạn học.
Điền từ: 老师在大学___英语。|教|叫|喝|买|教 jiāo là dạy, khác 叫 jiào là gọi.
Chọn câu hỏi nơi làm việc.|你在哪儿工作？|你工作多少？|你什么钱工作？|你工作谁的哪？|在 + 哪儿 hỏi địa điểm diễn ra công việc.'''
}

def vocabulary(lesson):
    rows=[]
    for group, block in zip(('main','extended'),DATA[lesson]):
        for line in block.splitlines():
            h,p,m,page=line.split('|')
            rows.append(dict(hanzi=h,pinyin=p,meaning=m,page=int(page),group=group))
    return rows

def make_questions(lesson, rows):
    rng=random.Random(20261108+lesson)
    questions=[]
    def add(prompt, correct, distractors, explanation, difficulty='Dễ'):
        options=[correct]+list(distractors)
        assert len(options)==4 and len(set(options))==4, (prompt,options)
        rng.shuffle(options)
        questions.append(dict(prompt=prompt,options=options,answer='ABCD'[options.index(correct)],explanation=explanation,difficulty=difficulty))
    for row in rows:
        h,p,m=row['hanzi'],row['pinyin'],row['meaning']
        # Distractors exclude alternative readings of the same character and equal values.
        pool=[r for r in rows if r['hanzi']!=h and r['pinyin']!=p and r['meaning']!=m]
        explanation=f'{h} đọc là {p}, nghĩa là {m}. Tham chiếu: PDF bài {lesson}, trang {row["page"]}.'
        for field,prompt,correct in [
            ('meaning',f'Trong bài học, “{h}” có nghĩa là gì?',m),
            ('hanzi',f'Chọn Hán tự có phiên âm “{p}” và nghĩa “{m}”.',h),
            ('pinyin',f'Chọn phiên âm đúng của “{h}” với nghĩa “{m}”.',p)]:
            candidates=list(dict.fromkeys(r[field] for r in pool if r[field]!=correct))
            add(prompt,correct,rng.sample(candidates,3),explanation)
    for line in CONTEXT[lesson].splitlines():
        prompt,correct,a,b,c,explanation=line.split('|')
        add(prompt,correct,[a,b,c],explanation,'Vừa')
    return questions

def document():
    doc=Document()
    sec=doc.sections[0]
    sec.page_height=Inches(11.7);sec.page_width=Inches(8.3)
    sec.top_margin=sec.bottom_margin=Inches(.65)
    sec.left_margin=sec.right_margin=Inches(.7)
    style=doc.styles['Normal'];style.font.name='Calibri';style.font.size=Pt(11)
    style.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Microsoft YaHei')
    style.paragraph_format.space_after=Pt(3)
    footer=sec.footer.paragraphs[0];footer.alignment=2
    footer.add_run('Trang ')
    field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');footer._p.append(field)
    return doc

def question_lines(lesson, questions):
    lines=['MÔN: Tiếng Trung','LỚP: HSK 1',f'CHỦ ĐỀ: Bài {lesson} {TITLES[lesson]} - Từ vựng chính và từ mở rộng']
    for i,q in enumerate(questions,1):
        lines.extend([f'Câu {i}. {q["prompt"]}',*[f'{label}. {option}' for label,option in zip('ABCD',q['options'])],f'Đáp án: {q["answer"]}',f'Lời giải: {q["explanation"]}',f'Độ khó: {q["difficulty"]}'])
    return lines

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest=[]
    for lesson in TITLES:
        rows=vocabulary(lesson);questions=make_questions(lesson,rows)
        lines=question_lines(lesson,questions)
        doc=document()
        for line in lines:
            para=doc.add_paragraph()
            run=para.add_run(line)
            if line.startswith(('MÔN:','LỚP:','CHỦ ĐỀ:','Câu ')):run.bold=True
            # Keep a complete question together when it fits a page.
            para.paragraph_format.keep_with_next=not line.startswith('Độ khó:')
        name=f'cau-hoi-tu-vung-tieng-trung-bai-{lesson}'
        doc.save(OUT/f'{name}.docx')
        (OUT/f'{name}.txt').write_text('\n'.join(lines)+'\n',encoding='utf8')
        vdoc=document();vdoc.add_heading(f'TỪ VỰNG TIẾNG TRUNG — BÀI {lesson}',0)
        vdoc.add_paragraph(TITLES[lesson])
        vdoc.add_paragraph('Từ vựng đối chiếu từ PDF bài học. Phần mở rộng gồm từ trong ví dụ, ngữ pháp, bài khóa và luyện tập. Pinyin ghi theo nghĩa và ngữ cảnh; tên riêng viết hoa. Số trang tính từ trang đầu PDF.')
        for group,title in [('main','I. Từ vựng chính'),('extended','II. Từ vựng mở rộng và ôn tập trong bài')]:
            vdoc.add_heading(title,1)
            table=vdoc.add_table(rows=1,cols=5);table.style='Table Grid'
            for cell,text in zip(table.rows[0].cells,['STT','Chữ Hán','Pinyin','Nghĩa tiếng Việt','Trang PDF']):cell.text=text
            for i,row in enumerate([r for r in rows if r['group']==group],1):
                for cell,text in zip(table.add_row().cells,[str(i),row['hanzi'],row['pinyin'],row['meaning'],str(row['page'])]):cell.text=text
        vdoc.add_heading('III. Tự ôn',1)
        vdoc.add_paragraph('Che cột nghĩa để nhớ nghĩa tiếng Việt; che chữ Hán để viết lại từ; đọc pinyin thành tiếng. Làm bản câu hỏi cùng bài, kiểm tra lời giải và ghi lại từ còn sai.')
        vdoc.save(OUT/f'tu-vung-tieng-trung-bai-{lesson}.docx')
        # Plain import format keeps one vocabulary item per line for the existing app.
        vocabtext='[TU VUNG]\n'+'\n'.join(f'{r["hanzi"]} | {r["pinyin"]} | {r["meaning"]} | | | | | | | | | {r["group"]}' for r in rows)
        imp=document()
        for line in vocabtext.splitlines():imp.add_paragraph(line)
        imp.save(OUT/f'tu-vung-nhap-web-bai-{lesson}.docx')
        (OUT/f'du-lieu-bai-{lesson}.json').write_text(json.dumps(dict(lesson=lesson,title=TITLES[lesson],vocabulary=rows,questions=questions),ensure_ascii=False,indent=2),encoding='utf8')
        manifest.append(dict(lesson=lesson,vocabulary=len(rows),questions=len(questions),main=sum(r['group']=='main' for r in rows)))
    (OUT/'thong-ke.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    note='''# Tiếng Trung Q1 — Bài 3, 4, 5, 6

Mỗi bài gồm:
- `cau-hoi-tu-vung-tieng-trung-bai-N.docx`: bản Word câu hỏi, 4 lựa chọn, đáp án, lời giải và độ khó theo mẫu bài 1–2. Dùng bản này để nhập ngân hàng câu hỏi trên website.
- `tu-vung-tieng-trung-bai-N.docx`: bảng chữ Hán, pinyin, nghĩa và trang nguồn để học từ vựng.
- `tu-vung-nhap-web-bai-N.docx`: bản từ vựng theo định dạng nhập của website, tách từ chính và từ mở rộng.
- `.txt` và `.json`: nội dung để tra cứu, kiểm tra và tái sử dụng.

Câu hỏi được biên soạn từ từ vựng, ví dụ, ngữ pháp, bài khóa và phần mở rộng trong bốn PDF người dùng cung cấp. Mỗi mục từ có ba câu về nghĩa, nhận diện chữ và pinyin; cuối mỗi bộ có câu vận dụng. Câu hỏi không phải bản chép nguyên văn toàn bộ bài tập PDF. Không suy đoán đáp án bài nghe khi chưa có âm thanh. Không thực hiện các yêu cầu giao bài trong PDF như gửi danh thiếp lên nhóm.

Đã chuẩn hóa một số lỗi trong slide: 买 mǎi / 卖 mài; 种 zhǒng (loại) / zhòng (trồng); 教 jiāo (dạy); 小刘 là Tiểu Lưu. 斤 ở Trung Quốc đại lục là 500 g, 公斤 là 1 kg. Chữ 块 trong bài 4 (đơn vị tiền) khác nghĩa 快 trong bài 5 (nhanh). Pinyin từ điển thường giữ thanh gốc; 一 và 不 trong một số cụm ghi theo biến điệu khi đọc. Phần từ vựng chính dựa trên cả bảng tổng hợp và các slide “Từ mới”, nên có từ không xuất hiện trong bảng đầu bài.

Các file được lưu trong dự án; chưa tự nhập hoặc xuất bản lên cơ sở dữ liệu của website.

## Thống kê

'''
    for m in manifest:note+=f'- Bài {m["lesson"]}: {m["vocabulary"]} mục từ ({m["main"]} chính), {m["questions"]} câu hỏi.\n'
    (OUT/'HUONG-DAN.md').write_text(note,encoding='utf8')
    with ZipFile(OUT.parent/'tieng-trung-bai-3-6.zip','w',ZIP_DEFLATED) as z:
        for p in OUT.iterdir():
            if p.is_file() and not p.name.startswith('nguon-'):z.write(p,p.name)
    print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__':main()
