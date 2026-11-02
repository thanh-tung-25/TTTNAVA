"""Create original, reproducible lesson-specific draft exercises and DOCX files.

Uses only Python's standard library. No existing question bank is modified here.
"""
import calendar
import datetime as dt
import hashlib
import json
import math
import random
import re
import sys
import unicodedata
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction as F
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tai-lieu' / 'toan-lop-2-den-5-50-cau'
NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Lan', 'Mai', 'Minh', 'Nam', 'Ngọc', 'Phúc', 'Trang']
OBJECTS = ['viên bi', 'que tính', 'nhãn vở', 'chiếc bút', 'quyển vở', 'tấm thẻ']


def fmt(value):
    if isinstance(value, F):
        return str(value.numerator) if value.denominator == 1 else f'{value.numerator}/{value.denominator}'
    if isinstance(value, Decimal):
        return format(value.normalize(), 'f').replace('.', ',')
    return str(value)


def result(prompt, answer, explanation, wrong=None, proof=None):
    return dict(prompt=prompt, expected=fmt(answer), explanation=explanation,
                wrong=[fmt(x) for x in (wrong or [])], proof=proof)


def computed(prompt, answer, explanation, op, *args):
    return result(prompt, answer, explanation, proof={'op': op, 'args': [str(x) for x in args]})


def arithmetic(r, grade, p):
    maximum = p.get('max', 100 if grade == 2 else 1000)
    op = p.get('op', r.choice(['+', '-']))
    if op in ['+', '-']:
        while True:
            a, b = r.randint(1, maximum - 1), r.randint(1, maximum - 1)
            if op == '-' and a < b: a, b = b, a
            if p.get('a_digits') and len(str(a)) != p['a_digits']: continue
            if p.get('b_digits') and len(str(b)) != p['b_digits']: continue
            value = a + b if op == '+' else a - b
            if value > maximum: continue
            digits = len(str(max(a,b)))
            carry = any((a // (10**i) % 10 + b // (10**i) % 10 >= 10) if op == '+' else (a // (10**i) % 10 < b // (10**i) % 10) for i in range(digits))
            if p.get('carry') is not None and carry != p['carry']: continue
            break
    elif op == '×':
        b = p.get('table', r.randint(2, 9))
        a = r.randint(1, 10) if p.get('table') else r.randint(10**(p.get('digits', 2)-1), min(10**p.get('digits',2)-1,maximum // b))
        value = a * b
    else:
        b = p.get('table', r.randint(2, 9))
        value = r.randint(1, 10) if p.get('table') else r.randint(max(1,math.ceil(10**(p.get('digits',2)-1)/b)), min(10**p.get('digits',2)-1,maximum)//b)
        a = value * b
    style = r.randrange(5)
    name, obj = r.choice(NAMES), r.choice(OBJECTS)
    if style == 0:
        prompt = f'Tính: {a} {op} {b} = ?'
    elif style == 1:
        prompt = f'Điền số thích hợp: {a} {op} {b} = ...'
    elif style == 2:
        prompt = f'Kết quả của phép tính {a} {op} {b} là bao nhiêu?'
    elif style == 3:
        prompt = {'+':f'{name} có {a} {obj}, được tặng thêm {b} {obj}. {name} có tất cả bao nhiêu {obj}?',
                  '-':f'{name} có {a} {obj}, cho bạn {b} {obj}. {name} còn bao nhiêu {obj}?',
                  '×':f'Có {b} hộp, mỗi hộp có {a} {obj}. Có tất cả bao nhiêu {obj}?',
                  ':':f'Chia đều {a} {obj} vào {b} hộp. Mỗi hộp có bao nhiêu {obj}?'}[op]
    else:
        prompt = f'{name} cần tìm giá trị của {a} {op} {b}. Em hãy giúp bạn tìm kết quả.'
    return computed(prompt, value, f'Thực hiện phép tính: {a} {op} {b} = {value}.', {'+':'add','-':'sub','×':'mul',':':'div'}[op], a,b)


def number(r, grade, p):
    maximum = p.get('max', 1000)
    a = r.randint(10, maximum-1)
    style = r.choice([2,3,4]) if p.get('place_only') else r.randrange(7)
    if p.get('round_numbers'):
        a = r.randrange(10,100)*10
    if style == 0:
        return computed(f'Số liền sau của {a} là số nào?', a+1, f'{a} + 1 = {a+1}.', 'add',a,1)
    if style == 1:
        return computed(f'Số liền trước của {a} là số nào?', a-1, f'{a} - 1 = {a-1}.', 'sub',a,1)
    digits = len(str(a))
    place = r.randrange(digits)
    value = a // 10**place % 10
    label = ['đơn vị','chục','trăm','nghìn','chục nghìn','trăm nghìn','triệu','chục triệu','trăm triệu'][place]
    if style == 2:
        return computed(f'Chữ số hàng {label} của số {a} là chữ số nào?',value,f'Đếm các hàng từ phải sang trái; hàng {label} của {a} là {value}.','digit',a,place)
    if style == 3:
        return computed(f'Chữ số {value} ở hàng {label} trong số {a} có giá trị bao nhiêu?',value*10**place,f'Giá trị theo hàng là {value} × {10**place} = {value*10**place}.','mul',value,10**place)
    if style == 4:
        parts=[(a//10**i%10)*10**i for i in reversed(range(digits)) if a//10**i%10]
        return computed('Viết số có tổng phân tích: '+' + '.join(map(str,parts))+' = ?',a,f'Cộng các giá trị theo hàng được {a}.','sum',*parts)
    step=r.choice([1,2,5,10] if maximum<=100 else [10,100])
    a=min(a,maximum-1-3*step)
    if style==5:
        return computed(f'Điền số còn thiếu: {a}; {a+step}; ...; {a+3*step}.',a+2*step,f'Dãy số tăng đều {step} đơn vị: số cần điền là {a+step} + {step} = {a+2*step}.','add',a+step,step)
    return computed(f'Số nào gồm {a//10} chục và {a%10} đơn vị?',a,f'{a//10} × 10 + {a%10} = {a}.','sum',a//10*10,a%10)


def compare(r, grade, p):
    maximum=p.get('max',1000)
    a,b=r.sample(range(1,maximum),2)
    if p.get('round_numbers'): a,b=a//10*10,b//10*10
    if a==b:b+=10
    if r.randrange(3)==0:
        values=r.sample(range(1,maximum),4); largest=r.choice([True,False]);value=max(values) if largest else min(values)
        return result('Trong các số '+', '.join(map(str,values))+', số '+('lớn nhất' if largest else 'bé nhất')+' là số nào?',value,f'So sánh từ hàng cao nhất; số cần chọn là {value}.',[v for v in values if v!=value])
    symbol='>' if a>b else '<'
    return result(f'Điền dấu thích hợp: {a} ... {b}.',symbol,f'{a} {symbol} {b}. So sánh số chữ số, rồi so sánh từng hàng từ trái sang phải.',['<','>','='])


def components(r, grade, p):
    a,b=r.randint(2,40),r.randint(2,40);total=a+b
    field=r.randrange(4)
    prompts=[f'Trong phép cộng {a} + {b} = {total}, tổng là số nào?',f'Trong phép cộng {a} + {b} = {total}, số hạng thứ hai là số nào?',f'Trong phép trừ {total} - {a} = {b}, số bị trừ là số nào?',f'Trong phép trừ {total} - {a} = {b}, hiệu là số nào?']
    values=[total,b,total,b]
    return result(prompts[field],values[field],['Tổng là kết quả phép cộng.','Số hạng thứ hai là số đứng sau dấu cộng.','Số bị trừ đứng trước dấu trừ.','Hiệu là kết quả phép trừ.'][field]+f' Vì vậy chọn {values[field]}.')


def missing(r,grade,p):
    if p.get('mult'):
        a,b=r.randint(2,9),r.randint(2,9);total=a*b
        if r.choice([True,False]): return computed(f'Tìm số còn thiếu: ... × {b} = {total}.',a,f'Lấy tích chia cho thừa số đã biết: {total} : {b} = {a}.','div',total,b)
        return computed(f'Tìm số còn thiếu: {total} : ... = {a}.',b,f'Lấy số bị chia chia cho thương: {total} : {a} = {b}.','div',total,a)
    a,b=r.randint(2, p.get('max',100)//2),r.randint(2,p.get('max',100)//2);total=a+b
    style=r.randrange(3)
    if style==0:return computed(f'Tìm số còn thiếu: ... + {b} = {total}.',a,f'Lấy tổng trừ số hạng đã biết: {total} - {b} = {a}.','sub',total,b)
    if style==1:return computed(f'Tìm số còn thiếu: ... - {a} = {b}.',total,f'Lấy hiệu cộng số trừ: {b} + {a} = {total}.','add',b,a)
    return computed(f'Tìm số còn thiếu: {total} - ... = {b}.',a,f'Lấy số bị trừ trừ hiệu: {total} - {b} = {a}.','sub',total,b)


def difference(r,grade,p):
    a,b=sorted(r.sample(range(2,80 if grade==2 else 500),2));name,other=r.sample(NAMES,2);obj=r.choice(OBJECTS)
    if r.choice([True,False]):
        return computed(f'{name} có {b} {obj}, {other} có {a} {obj}. {name} có nhiều hơn {other} bao nhiêu {obj}?',b-a,f'Lấy số lớn trừ số bé: {b} - {a} = {b-a}.','sub',b,a)
    return computed(f'{name} có {a} {obj}, ít hơn {other} {b-a} {obj}. {other} có bao nhiêu {obj}?',b,f'Số của {other} là {a} + {b-a} = {b}.','add',a,b-a)


def multiplication_concept(r,grade,p):
    a,b=r.randint(2,9),r.randint(2,9)
    if p.get('division'):
        if r.randrange(3)==0:
            term,value,why=r.choice([('số chia',b,'đứng sau dấu chia'),('số bị chia',a*b,'đứng trước dấu chia'),('thương',a,'là kết quả phép chia')])
            return result(f'Trong phép chia {a*b} : {b} = {a}, {term} là số nào?',value,f'{term.capitalize()} {why}, đó là {value}.')
        return computed(f'Có {a*b} chiếc bánh, chia đều cho {b} bạn. Mỗi bạn nhận bao nhiêu chiếc bánh?',a,f'Chia đều nên thực hiện {a*b} : {b} = {a}.','div',a*b,b)
    if r.randrange(3)==0:
        term,value,why=r.choice([('tích',a*b,'là kết quả phép nhân'),('thừa số thứ nhất',a,'đứng trước dấu nhân'),('thừa số thứ hai',b,'đứng sau dấu nhân')])
        return result(f'Trong phép nhân {a} × {b} = {a*b}, {term} là số nào?',value,f'{term.capitalize()} {why}, đó là {value}.')
    return computed(f'Có {b} nhóm, mỗi nhóm {a} bạn. Có tất cả bao nhiêu bạn?',a*b,f'Cộng {b} lần số {a}, tức là {a} × {b} = {a*b}.','mul',a,b)


def remainder(r,grade,p):
    divisor=r.randint(2,9);quotient=r.randint(2,10);rem=r.randint(0,divisor-1);a=divisor*quotient+rem
    return computed(f'Chia {a} cho {divisor}. Số dư là bao nhiêu?',rem,f'{a} = {divisor} × {quotient} + {rem}; số dư {rem} nhỏ hơn số chia {divisor}.','mod',a,divisor)


def word_steps(r,grade,p):
    a,b,c=r.randint(5,9 if grade==3 else 40),r.randint(2,9),r.randint(1,9);obj=r.choice(OBJECTS)
    if p.get('steps',2)==3:
        d=r.randint(1,5);value=a*b+c-d
        return computed(f'Một cửa hàng có {b} hộp, mỗi hộp {a} {obj}. Cửa hàng nhập thêm {c} {obj}, rồi bán {d} {obj}. Còn lại bao nhiêu {obj}?',value,f'Ban đầu có {a} × {b} = {a*b}. Sau khi nhập có {a*b} + {c} = {a*b+c}. Còn lại {a*b+c} - {d} = {value}.','sum',a*b,c,-d)
    value=a*b+c
    return computed(f'Có {b} hộp, mỗi hộp có {a} {obj}; ngoài ra còn {c} {obj} rời. Có tất cả bao nhiêu {obj}?',value,f'Trong các hộp có {a} × {b} = {a*b}. Tất cả có {a*b} + {c} = {value}.','sum',a*b,c)


def expression(r,grade,p):
    a,b,c=r.randint(2,30),r.randint(2,9),r.randint(1,15)
    if p.get('letter'):
        if r.choice([True,False]):return computed(f'Với a = {a}, giá trị biểu thức a × {b} + {c} là bao nhiêu?',a*b+c,f'Thay a = {a}: {a} × {b} + {c} = {a*b} + {c} = {a*b+c}.','sum',a*b,c)
        return computed(f'Với b = {b}, giá trị biểu thức ({a} + b) × {c} là bao nhiêu?',(a+b)*c,f'Thay b = {b}, tính trong ngoặc trước: ({a} + {b}) × {c} = {a+b} × {c} = {(a+b)*c}.','mul',a+b,c)
    if r.choice([True,False]):return computed(f'Tính giá trị biểu thức {a} + {b} × {c}.',a+b*c,f'Nhân trước, cộng sau: {b} × {c} = {b*c}; {a} + {b*c} = {a+b*c}.','sum',a,b*c)
    return computed(f'Tính giá trị biểu thức ({a} + {b}) × {c}.',(a+b)*c,f'Tính trong ngoặc trước: {a} + {b} = {a+b}; {a+b} × {c} = {(a+b)*c}.','mul',a+b,c)


def round_number(r,grade,p):
    unit=p.get('unit',r.choice([10,100]));a=r.randint(unit,unit*90-1);value=((a+unit//2)//unit)*unit
    return computed(f'Làm tròn số {a} đến hàng { {10:"chục",100:"trăm",1000:"nghìn",10000:"chục nghìn",100000:"trăm nghìn"}[unit]}.',value,f'Xét chữ số ngay bên phải hàng làm tròn: từ 5 trở lên làm tròn lên, dưới 5 làm tròn xuống. Kết quả là {value}.','round',a,unit)


def parity(r,grade,p):
    a=r.randint(10,9999)
    if r.choice([True,False]):return result(f'Số {a} là số chẵn hay số lẻ?','số chẵn' if a%2==0 else 'số lẻ',f'Chữ số tận cùng là {a%10}; các số tận cùng bằng 0, 2, 4, 6, 8 là số chẵn.',['số chẵn','số lẻ','không phải số tự nhiên'])
    value=a+2 if a%2==0 else a+1
    return computed(f'Số chẵn nhỏ nhất lớn hơn {a} là số nào?',value,f'Số chẵn tận cùng bằng 0, 2, 4, 6 hoặc 8. Số cần tìm là {value}.','sum',a,2 if a%2==0 else 1)


def roman(r,grade,p):
    n=r.randint(1,20);pairs=[(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')];left=n;s=''
    for v,letters in pairs:
        while left>=v:s+=letters;left-=v
    if r.choice([True,False]):return result(f'{r.choice(NAMES)} ghi số La Mã {s}. Số đó có giá trị bao nhiêu?',n,f'Trong số La Mã này, I là 1, V là 5, X là 10; đọc {s} được {n}.')
    return result(f'Số {n} được viết bằng chữ số La Mã như thế nào?',s,f'{n} được viết là {s}.',[v for v in ['I','II','III','IV','V','VI','IX','X','XI','XIV','XV','XIX','XX'] if v!=s])


def conversion(r,grade,p):
    units=p['units'];large,small,factor=r.choice(units);a=r.randint(1,30 if grade>=3 else 8);extra=r.randint(1,min(factor-1,9)) if factor>1 else 0;style=r.randrange(3)
    if style==0:return computed(f'Điền số: {a} {large} = ... {small}.',a*factor,f'1 {large} = {factor} {small}, nên {a} × {factor} = {a*factor} {small}.','mul',a,factor)
    if style==1:return computed(f'Điền số: {a*factor} {small} = ... {large}.',a,f'Lấy {a*factor} : {factor} = {a} {large}.','div',a*factor,factor)
    return computed(f'Đổi {a} {large} {extra} {small} ra {small}.',a*factor+extra,f'{a} {large} = {a*factor} {small}; cộng thêm {extra} {small} được {a*factor+extra} {small}.','sum',a*factor,extra)


def measure_story(r,grade,p):
    unit=p.get('unit','kg');a,b=r.randint(2,35),r.randint(1,30);name=r.choice(NAMES)
    if r.choice([True,False]):return computed(f'{name} có {a} {unit} gạo và mua thêm {b} {unit} gạo. Tổng khối lượng gạo là bao nhiêu {unit}?' if unit=='kg' else f'Một bình có {a} {unit} nước, thêm {b} {unit} nước. Có tất cả bao nhiêu {unit} nước?',a+b,f'Cộng các số đo cùng đơn vị: {a} + {b} = {a+b} ({unit}).','add',a,b)
    total=a+b
    return computed(f'Một vật chứa có {total} {unit}, lấy bớt {b} {unit}. Còn lại bao nhiêu {unit}?',a,f'Trừ các số đo cùng đơn vị: {total} - {b} = {a} ({unit}).','sub',total,b)


def money(r,grade,p):
    price=r.choice([100,200] if grade==2 else [1000,2000,5000,10000,20000]);n=r.randint(2,4 if grade==2 else 5)
    if r.choice([True,False]):return computed(f'Có {n} tờ tiền, mỗi tờ {price} đồng. Có tất cả bao nhiêu đồng?',price*n,f'Tổng số tiền: {price} × {n} = {price*n} đồng.','mul',price,n)
    paid=price*(n+1)
    return computed(f'{r.choice(NAMES)} mua một quyển vở giá {price*n} đồng và đưa {paid} đồng. Bạn được trả lại bao nhiêu đồng?',price,f'Tiền trả lại: {paid} - {price*n} = {price} đồng.','sub',paid,price*n)


def temperature(r,grade,p):
    a,b=r.randint(10,35),r.randint(1,8)
    if r.choice([True,False]):return computed(f'Buổi sáng nhiệt độ {a}°C, buổi trưa tăng thêm {b}°C. Buổi trưa nhiệt độ bao nhiêu độ C?',a+b,f'{a} + {b} = {a+b} (°C).','add',a,b)
    return computed(f'Nhiệt độ giảm từ {a+b}°C xuống {a}°C. Nhiệt độ giảm bao nhiêu độ C?',b,f'{a+b} - {a} = {b} (°C).','sub',a+b,a)


def clock(r,grade,p):
    hour=r.randint(1,11);minute=r.choice([0,30]) if grade==2 else r.randint(0,59)
    style=r.randrange(3)
    if style==0:
        return computed(f'Đồng hồ chỉ {hour} giờ {minute} phút. Tính từ 0 giờ cùng ngày đến lúc đó là bao nhiêu phút?',hour*60+minute,f'{hour} giờ = {hour*60} phút; cộng {minute} phút được {hour*60+minute} phút.','sum',hour*60,minute) if grade>=3 else computed(f'{r.choice(NAMES)} bắt đầu học lúc {hour} giờ và học trong 1 giờ. Bạn học xong lúc mấy giờ?',hour+1,f'{hour} + 1 = {hour+1} (giờ).','add',hour,1)
    duration=r.randint(1,4)*30 if grade>=3 else r.randint(1,3)*60
    start=hour*60+minute;end=start+duration
    return computed(f'Một hoạt động bắt đầu lúc {hour} giờ {minute:02} phút và kết thúc lúc {end//60} giờ {end%60:02} phút. Hoạt động kéo dài bao nhiêu '+('phút?' if grade>=3 else 'giờ?'),duration if grade>=3 else duration//60,f'Từ giờ bắt đầu đến giờ kết thúc là {duration} phút'+(f', tức {duration//60} giờ.' if grade==2 else '.'),'sub',end if grade>=3 else end//60,start if grade>=3 else hour)


def date_question(r,grade,p):
    weekdays=['thứ Hai','thứ Ba','thứ Tư','thứ Năm','thứ Sáu','thứ Bảy','Chủ nhật'];style=r.randrange(4)
    if style<2:
        day=r.randrange(7);later=r.randint(1,12);value=weekdays[(day+later)%7]
        return result(f'Hôm nay là {weekdays[day]}. Sau {later} ngày nữa là ngày nào trong tuần?',value,f'Một tuần có 7 ngày. Đếm tiếp {later} ngày từ {weekdays[day]} được {value}.',weekdays)
    month=r.randint(1,12);days=calendar.monthrange(2026,month)[1]
    if style==2:return result(f'Tháng {month} năm 2026 có bao nhiêu ngày?',days,f'Theo lịch năm 2026, tháng {month} có {days} ngày.',[28,29,30,31])
    day=r.randint(1,days-6);delta=r.randint(1,5)
    return computed(f'{r.choice(NAMES)} bắt đầu nghỉ ngày {day} tháng {month} năm 2026. Sau {delta} ngày là ngày bao nhiêu của tháng {month}?',day+delta,f'Vẫn trong tháng {month}: {day} + {delta} = {day+delta}.','add',day,delta)


def statistics(r,grade,p):
    names=r.sample(NAMES,4);values=r.sample(range(2,30),4);desc='; '.join(f'{n}: {v} quyển' for n,v in zip(names,values));style=r.randrange(4)
    if p.get('pictogram'):
        per=r.choice([2,5,10]);symbols=r.randint(2,9)
        return computed(f'Biểu đồ tranh ghi mỗi ngôi sao biểu thị {per} quyển sách. Cột của {names[0]} có {symbols} ngôi sao. Bạn có bao nhiêu quyển sách?',per*symbols,f'Lấy số ngôi sao nhân số sách ứng với một ngôi sao: {symbols} × {per} = {per*symbols}.','mul',per,symbols)
    prefix=('Biểu đồ cột' if p.get('bar') else 'Bảng số liệu')+' số sách đã đọc ghi: '+desc+'. '
    if style==0:return computed(prefix+'Cả bốn bạn đọc bao nhiêu quyển?',sum(values),'Cộng các số liệu: '+' + '.join(map(str,values))+f' = {sum(values)}.','sum',*values)
    if style==1:return result(prefix+'Bạn nào đọc nhiều sách nhất?',names[values.index(max(values))],f'Số lớn nhất là {max(values)}, tương ứng với {names[values.index(max(values))]}.',names)
    if style==2:return computed(prefix+f'{names[0]} và {names[1]} đọc tổng cộng bao nhiêu quyển?',values[0]+values[1],f'{values[0]} + {values[1]} = {values[0]+values[1]}.','add',values[0],values[1])
    return computed(prefix+'Số sách nhiều nhất hơn số sách ít nhất bao nhiêu quyển?',max(values)-min(values),f'{max(values)} - {min(values)} = {max(values)-min(values)}.','sub',max(values),min(values))


def probability(r,grade,p):
    red,blue=r.randint(1,15),r.randint(1,15);style=r.randrange(3)
    if style==0:return result(f'Túi có {red} viên bi đỏ và {blue} viên bi xanh. Lấy ngẫu nhiên một viên. Việc lấy được bi vàng là chắc chắn, có thể hay không thể?','không thể','Túi không có viên bi vàng nên không thể lấy được bi vàng.',['chắc chắn','có thể','không thể'])
    if style==1:return result(f'Túi chỉ có {red+blue} viên bi đỏ. Lấy ngẫu nhiên một viên. Việc lấy được bi đỏ là chắc chắn, có thể hay không thể?','chắc chắn','Tất cả các viên bi trong túi đều màu đỏ.',['chắc chắn','có thể','không thể'])
    return result(f'Túi có {red} viên bi đỏ và {blue} viên bi xanh. Lấy ngẫu nhiên một viên. Việc lấy được bi đỏ là chắc chắn, có thể hay không thể?','có thể','Có bi đỏ nhưng cũng có bi xanh, nên có thể lấy được bi đỏ nhưng không chắc chắn.',['chắc chắn','có thể','không thể'])


def frequency(r,grade,p):
    total=r.randint(10,50);count=r.randint(1,total-1)
    if p.get('ratio'):
        return computed(f'Tung đồng xu {total} lần, mặt ngửa xuất hiện {count} lần. Tỉ số số lần xuất hiện mặt ngửa so với tổng số lần tung là bao nhiêu? Viết phân số tối giản.',F(count,total),f'Tỉ số là {count}/{total} = {fmt(F(count,total))}.','div',count,total)
    return computed(f'Gieo một con xúc xắc {total} lần. Mặt 6 chấm xuất hiện {count} lần. Những mặt khác xuất hiện tất cả bao nhiêu lần?',total-count,f'Lấy tổng số lần trừ số lần mặt 6 chấm: {total} - {count} = {total-count}.','sub',total,count)


def points(r,grade,p):
    a,b,c=r.sample('ABCDEFGHIKLMNPQRSTUV',3);x,y=r.randint(1,20),r.randint(1,20)
    if p.get('midpoint'):
        if r.choice([True,False]):return computed(f'{b} là trung điểm của đoạn {a}{c}, {a}{c} dài {2*x} cm. Đoạn {a}{b} dài bao nhiêu cm?',x,f'Trung điểm chia đoạn thành hai phần bằng nhau: {2*x} : 2 = {x} cm.','div',2*x,2)
        return computed(f'Ba điểm {a}, {b}, {c} thẳng hàng, {b} nằm giữa {a} và {c}. Biết {a}{b} = {x} cm, {b}{c} = {y} cm. {a}{c} dài bao nhiêu cm?',x+y,f'{a}{c} = {a}{b} + {b}{c} = {x} + {y} = {x+y} cm.','add',x,y)
    style=r.randrange(3)
    if style==0:return result(f'Dùng thước nối hai điểm {a} và {b}. Hình vừa vẽ có hai đầu mút {a}, {b} được gọi là gì?','đoạn thẳng',f'Hình nối hai điểm {a} và {b} và có hai đầu mút là đoạn thẳng {a}{b}.',['đường thẳng kéo dài vô hạn','đường cong','đoạn thẳng'])
    if style==1:return result(f'Đặt thước qua cả ba điểm {a}, {b}, {c} và thấy chúng cùng nằm trên một đường thẳng. Ba điểm đó được gọi là gì?','ba điểm thẳng hàng','Các điểm cùng nằm trên một đường thẳng là các điểm thẳng hàng.',['ba điểm thẳng hàng','ba đỉnh của một tam giác','ba điểm không thẳng hàng'])
    return computed(f'Đường gấp khúc {a}{b}{c} có hai đoạn dài {x} cm và {y} cm. Đường gấp khúc dài bao nhiêu cm?',x+y,f'Cộng độ dài các đoạn: {x} + {y} = {x+y} cm.','add',x,y)


def polygon(r,grade,p):
    shape,sides=r.choice([('hình tam giác',3),('hình tứ giác',4),('hình vuông',4),('hình chữ nhật',4)])
    letters=''.join(r.sample('ABCDEFGHIKLMNPQRSTUV',sides));n=r.randint(2,8 if grade>=3 else 4);style=r.randrange(4)
    if style==0:return result(f'{shape.capitalize()} {letters} có bao nhiêu cạnh?',sides,f'{shape.capitalize()} có {sides} cạnh và {sides} đỉnh.')
    if style==1:return computed(f'Có {n} {shape} rời nhau. Đếm tất cả các đỉnh của các hình được bao nhiêu đỉnh?',n*sides,f'Mỗi {shape} có {sides} đỉnh. Cộng {n} lần số {sides} được {n*sides}.','mul',n,sides)
    if style==2:return result(f'Bạn {r.choice(NAMES)} vẽ {shape} {letters}. Hình có bao nhiêu đỉnh?',sides,f'{shape.capitalize()} có {sides} đỉnh.')
    a=r.randint(2,20)
    return computed(f'Một sợi dây gồm {n} đoạn thẳng nối tiếp nhau, mỗi đoạn dài {a} cm. Tổng chiều dài sợi dây là bao nhiêu cm?',n*a,f'Cộng {n} đoạn, mỗi đoạn {a} cm, được {n*a} cm.','mul',n,a)


def solids(r,grade,p):
    n=r.randint(2,12);name=r.choice(NAMES);style=r.randrange(4)
    if p.get('sphere_cylinder'):
        if style==0:return computed(f'{name} có {n} mô hình khối trụ. Mỗi khối trụ có 2 mặt phẳng hình tròn. Các mô hình có tất cả bao nhiêu mặt phẳng hình tròn?',2*n,f'Mỗi khối có 2 mặt phẳng hình tròn: {n} × 2 = {2*n}.','mul',n,2)
        if style==1:return result(f'{name} quan sát một quả bóng có dạng khối cầu. Khối cầu có bao nhiêu đỉnh?',0,'Khối cầu có mặt cong và không có đỉnh.')
        if style==2:return result(f'{name} quan sát hộp sữa có hai đáy hình tròn bằng nhau và một mặt cong bao quanh. Hộp sữa có dạng khối nào?','khối trụ','Khối trụ có hai mặt đáy hình tròn bằng nhau và một mặt cong bao quanh.',['khối trụ','khối cầu','khối lập phương'])
        return result(f'{name} chọn một vật có dạng khối cầu. Vật nào phù hợp?','quả bóng tròn','Quả bóng tròn có dạng khối cầu.',['quả bóng tròn','lon nước ngọt hình trụ','hộp giày hình hộp chữ nhật'])
    if style==0:return computed(f'{name} xếp {n} mô hình khối lập phương rời nhau. Mỗi khối có 6 mặt. Tổng số mặt là bao nhiêu?',6*n,f'Mỗi khối có 6 mặt: {n} × 6 = {6*n}.','mul',n,6)
    if style==1:return result(f'Mô hình khối hộp chữ nhật của {name} có bao nhiêu đỉnh?',8,'Khối hộp chữ nhật có 8 đỉnh.')
    if style==2:return result(f'{name} đếm các cạnh của một khối lập phương. Có bao nhiêu cạnh?',12,'Khối lập phương có 12 cạnh.')
    return result(f'{name} có một khối lập phương cạnh {n} cm. Các mặt của khối có dạng hình gì?','hình vuông','Sáu mặt của khối lập phương đều là các hình vuông bằng nhau.',['hình vuông','hình tam giác','hình tròn'])


def angles(r,grade,p):
    letters=''.join(r.sample('ABCDEFGHIKLMNPQRSTUV',3));name=r.choice(NAMES)
    if grade==3:
        fact=r.randrange(3)
        if fact==0:return result(f'{name} đặt ê ke vào góc {letters}; hai cạnh góc trùng với hai cạnh góc vuông của ê ke. Góc đó là góc gì?','góc vuông','Hai cạnh trùng với hai cạnh góc vuông của ê ke nên đây là góc vuông.',['góc vuông','góc không vuông','đường thẳng'])
        if fact==1:return result(f'Hình chữ nhật {"".join(r.sample("ABCDEFGHIKLMNPQRSTUV",4))} do {name} vẽ có bao nhiêu góc vuông?',4,'Hình chữ nhật có 4 góc vuông.')
        return result(f'{name} dùng ê ke kiểm tra một góc của hình vuông cạnh {r.randint(2,25)} cm. Góc ấy là góc gì?','góc vuông','Cả bốn góc của hình vuông đều là góc vuông.',['góc vuông','góc không vuông','góc không xác định'])
    angle=r.choice(list(range(10,90,5))+list(range(95,180,5))+[90,180]);kind='góc nhọn' if angle<90 else 'góc vuông' if angle==90 else 'góc tù' if angle<180 else 'góc bẹt'
    if p.get('measure') and r.choice([True,False]):
        return result(f'Thước đo góc cho biết góc {letters} có số đo {angle}°. Số đo của góc này là bao nhiêu độ?',angle,f'Đọc đúng vạch trên thước: góc {letters} có số đo {angle}°.')
    return result(f'Góc {letters} có số đo {angle}°. Đó là loại góc nào?',kind,'Góc nhọn nhỏ hơn 90°, góc vuông bằng 90°, góc tù lớn hơn 90° và nhỏ hơn 180°, góc bẹt bằng 180°.',['góc nhọn','góc vuông','góc tù','góc bẹt'])


def lines(r,grade,p):
    a,b,c,d=r.sample('ABCDEFGHIKLMNPQRSTUV',4);length=r.randint(2,30)
    if p.get('parallel'):
        style=r.randrange(3)
        if style==0:return result(f'Trong hình chữ nhật {a}{b}{c}{d}, cạnh {a}{b} song song với cạnh nào?',c+d,f'Hai cạnh đối diện của hình chữ nhật song song: {a}{b} song song {c}{d}.',[c+d,b+c,a+d])
        if style==1:return result(f'Hai đường thẳng {a}{b} và {c}{d} cùng nằm trên một mặt phẳng và không bao giờ cắt nhau dù kéo dài. Chúng có quan hệ gì?','song song','Hai đường thẳng trong một mặt phẳng không cắt nhau là hai đường thẳng song song.',['song song','vuông góc','trùng nhau'])
        return result(f'Một hình bình hành có cạnh {a}{b} dài {length} cm. Cạnh đối diện {c}{d} có quan hệ như thế nào với {a}{b}?','song song và bằng nhau','Trong hình bình hành, hai cạnh đối diện song song và bằng nhau.',['song song và bằng nhau','vuông góc và bằng nhau','luôn cắt nhau'])
    if r.choice([True,False]):return result(f'Hai đường thẳng {a}{b} và {c}{d} cắt nhau tạo thành một góc vuông. Chúng có quan hệ gì?','vuông góc','Hai đường thẳng cắt nhau tạo thành góc vuông là hai đường thẳng vuông góc.',['vuông góc','song song','không cắt nhau'])
    return result(f'Trong hình chữ nhật {a}{b}{c}{d}, cạnh {a}{b} vuông góc với cạnh nào?',b+c,f'Hai cạnh kề của hình chữ nhật vuông góc với nhau: {a}{b} và {b}{c}.',[b+c,c+d,a+b])


def parallelogram(r,grade,p):
    letters=''.join(r.sample('ABCDEFGHIKLMNPQRSTUV',4));a=r.randint(2,40)
    if r.choice([True,False]):return computed(f'Hình thoi {letters} có cạnh dài {a} cm. Tổng độ dài bốn cạnh là bao nhiêu cm?',4*a,f'Hình thoi có bốn cạnh bằng nhau: {a} × 4 = {4*a} cm.','mul',a,4)
    return result(f'Hình bình hành {letters} có cạnh {letters[0]}{letters[1]} dài {a} cm. Cạnh đối diện dài bao nhiêu cm?',a,f'Trong hình bình hành, các cạnh đối diện bằng nhau nên cạnh đối diện dài {a} cm.')


def circle(r,grade,p):
    radius=r.randint(1,40);center=r.choice('OIK');edge=r.choice('ABCD');style=r.randrange(3)
    if style==0:return computed(f'Hình tròn tâm {center} có bán kính {radius} cm. Đường kính dài bao nhiêu cm?',2*radius,f'Đường kính gấp đôi bán kính: {radius} × 2 = {2*radius} cm.','mul',radius,2)
    if style==1:return computed(f'Đường kính hình tròn tâm {center} dài {2*radius} cm. Bán kính dài bao nhiêu cm?',radius,f'Bán kính bằng nửa đường kính: {2*radius} : 2 = {radius} cm.','div',2*radius,2)
    return result(f'{edge} nằm trên đường tròn tâm {center}; đoạn {center}{edge} dài {radius} cm. Đoạn {center}{edge} được gọi là gì?','bán kính','Đoạn thẳng nối tâm với một điểm trên đường tròn là bán kính.',['bán kính','đường kính','chu vi'])


def perimeter(r,grade,p):
    shape=p.get('shape',r.choice(['square','rectangle','triangle']));a,b=r.randint(2,40),r.randint(2,40)
    if shape=='square':return computed(f'Hình vuông cạnh {a} cm có chu vi bao nhiêu cm?',4*a,f'Chu vi hình vuông bằng cạnh nhân 4: {a} × 4 = {4*a} cm.','mul',a,4)
    if shape=='rectangle':return computed(f'Hình chữ nhật dài {a+b} cm, rộng {a} cm. Chu vi bằng bao nhiêu cm?',2*(2*a+b),f'Chu vi: ({a+b} + {a}) × 2 = {2*(2*a+b)} cm.','mul',2*a+b,2)
    c=r.randint(abs(a-b)+1,a+b-1)
    return computed(f'Ba cạnh của một hình tam giác dài {a} cm, {b} cm, {c} cm. Chu vi hình tam giác bằng bao nhiêu cm?',a+b+c,f'Cộng ba cạnh: {a} + {b} + {c} = {a+b+c} cm.','sum',a,b,c)


def area(r,grade,p):
    shape=p.get('shape',r.choice(['square','rectangle']));a,b=r.randint(2,30),r.randint(2,30)
    if shape=='square':return computed(f'Hình vuông cạnh {a} cm có diện tích bao nhiêu cm²?',a*a,f'Diện tích hình vuông bằng cạnh nhân cạnh: {a} × {a} = {a*a} cm².','mul',a,a)
    if shape=='rectangle':return computed(f'Mảnh giấy hình chữ nhật dài {a+b} cm, rộng {a} cm. Diện tích là bao nhiêu cm²?',a*(a+b),f'Diện tích hình chữ nhật: {a+b} × {a} = {a*(a+b)} cm².','mul',a+b,a)
    if shape=='unit':return computed(f'Một hình được ghép kín từ {a} hàng ô vuông bằng nhau; mỗi hàng {b} ô. Mỗi ô có diện tích 1 cm². Diện tích hình là bao nhiêu cm²?',a*b,f'Có {a} × {b} = {a*b} ô, mỗi ô 1 cm² nên diện tích là {a*b} cm².','mul',a,b)
    if shape=='triangle':return computed(f'Hình tam giác có đáy {2*a} cm, chiều cao tương ứng {b} cm. Diện tích là bao nhiêu cm²?',a*b,f'Diện tích: {2*a} × {b} : 2 = {a*b} cm².','mul',a,b)
    if shape=='trapezoid':
        c=r.randint(2,20);return computed(f'Hình thang có hai đáy {2*a} cm và {2*c} cm, chiều cao {b} cm. Diện tích là bao nhiêu cm²?',(a+c)*b,f'Diện tích: ({2*a} + {2*c}) × {b} : 2 = {(a+c)*b} cm².','mul',a+c,b)
    radius=Decimal(r.randint(1,50));pi=Decimal('3.14')
    if r.choice([True,False]):return computed(f'Hình tròn có bán kính {fmt(radius)} cm. Lấy π = 3,14. Chu vi bằng bao nhiêu cm?',radius*2*pi,f'Chu vi: {fmt(radius)} × 2 × 3,14 = {fmt(radius*2*pi)} cm.','mul',radius*2,pi)
    return computed(f'Hình tròn có bán kính {fmt(radius)} cm. Lấy π = 3,14. Diện tích bằng bao nhiêu cm²?',radius*radius*pi,f'Diện tích: {fmt(radius)} × {fmt(radius)} × 3,14 = {fmt(radius*radius*pi)} cm².','mul',radius*radius,pi)


def fraction(r,grade,p):
    skill=p.get('skill','concept');den=r.randint(2,9 if grade==3 else 15);num=r.randint(1,den-1);factor=r.randint(2,9)
    if skill=='part':
        total=den*factor;return computed(f'Chia đều {total} chiếc bánh cho {den} bạn. Mỗi bạn được 1/{den} số bánh. Mỗi bạn nhận bao nhiêu chiếc?',factor,f'Một phần {den} của {total} là {total} : {den} = {factor}.','div',total,den)
    if skill=='concept':return result(f'Chia một tấm giấy thành {den} phần bằng nhau, tô màu {num} phần. Phân số chỉ phần tô màu là gì?',f'{num}/{den}',f'Tử số là số phần tô màu ({num}); mẫu số là tổng số phần bằng nhau ({den}).',[f'{den}/{num}',f'{num+den}/{den}',f'{num}/{den+1}'])
    if skill=='division':return computed(f'Chia đều {num} chiếc bánh cho {den} bạn. Mỗi bạn được bao nhiêu chiếc bánh? Viết phân số tối giản.',F(num,den),f'Số bánh mỗi bạn nhận là {num} : {den} = {num}/{den} = {fmt(F(num,den))}.','div',num,den)
    if skill=='equivalent':return computed(f'Điền tử số còn thiếu: {num}/{den} = .../{den*factor}.',num*factor,f'Mẫu số nhân {factor} nên tử số cũng nhân {factor}: {num} × {factor} = {num*factor}.','mul',num,factor)
    if skill=='reduce':return computed(f'Rút gọn phân số {num*factor}/{den*factor} về phân số tối giản.',F(num,den),f'Chia cả tử và mẫu cho ước chung lớn nhất {math.gcd(num*factor,den*factor)} được {fmt(F(num,den))}.','div',num*factor,den*factor)
    if skill=='common':
        second=r.randint(2,15);common=math.lcm(den,second)
        return result(f'Quy đồng hai phân số {num}/{den} và 1/{second} bằng mẫu số chung nhỏ nhất. Mẫu số chung đó là bao nhiêu?',common,f'Số nhỏ nhất chia hết cho {den} và {second} là {common}.')
    if skill=='compare':
        other=F(r.randint(1,15),r.randint(2,15));value=F(num,den);symbol='>' if value>other else '<' if value<other else '='
        return result(f'Điền dấu: {num}/{den} ... {fmt(other)}.',symbol,f'Quy đồng mẫu số hoặc nhân chéo để so sánh: {num}/{den} {symbol} {fmt(other)}.',['<','>','='])
    if skill=='mixed':
        whole=r.randint(1,12);value=F(whole*den+num,den)
        return computed(f'Viết hỗn số {whole} {num}/{den} thành phân số tối giản.',value,f'Tử số mới: {whole} × {den} + {num} = {whole*den+num}; giữ mẫu {den}, rồi rút gọn được {fmt(value)}.','div',whole*den+num,den)
    if skill=='of_number':return computed(f'Một lớp có {den*factor} học sinh, {num}/{den} số học sinh tham gia câu lạc bộ. Có bao nhiêu học sinh tham gia?',num*factor,f'Số học sinh tham gia: {den*factor} : {den} × {num} = {num*factor}.','mul',factor,num)
    op=skill if skill in ['add','sub','mul','div'] else r.choice(['add','sub','mul','div']);a=F(num,den);b=F(r.randint(1,15),r.randint(2,15))
    if op=='sub' and a<b:a,b=b,a
    value={'add':lambda:a+b,'sub':lambda:a-b,'mul':lambda:a*b,'div':lambda:a/b}[op]()
    sign={'add':'+','sub':'-','mul':'×','div':':'}[op]
    return computed(f'Tính {fmt(a)} {sign} {fmt(b)}. Viết kết quả là phân số tối giản hoặc số tự nhiên.',value,f'{fmt(a)} {sign} {fmt(b)} = {fmt(value)}; '+({'add':'quy đồng mẫu số rồi cộng tử số.','sub':'quy đồng mẫu số rồi trừ tử số.','mul':'nhân các tử số và các mẫu số rồi rút gọn.','div':'nhân phân số thứ nhất với phân số đảo ngược của phân số thứ hai rồi rút gọn.'}[op]),op,a,b)


def decimal_question(r,grade,p):
    skill=p.get('skill','concept');a=Decimal(r.randint(1,9999))/100;b=Decimal(r.randint(1,999))/100
    if skill=='concept':
        den=r.choice([10,100,1000]);num=r.randint(1,den*9)
        return computed(f'Viết phân số thập phân {num}/{den} dưới dạng số thập phân.',Decimal(num)/den,f'{num}/{den} = {fmt(Decimal(num)/den)}; mẫu số {den} ứng với {len(str(den))-1} chữ số ở phần thập phân.','div',num,den)
    if skill=='compare':return result(f'Điền dấu: {fmt(a)} ... {fmt(b)}.','>' if a>b else '<' if a<b else '=',f'So sánh phần nguyên rồi từng hàng thập phân: {fmt(a)} '+('>' if a>b else '<' if a<b else '=')+f' {fmt(b)}.',['<','>','='])
    if skill=='round':
        places=r.choice([0,1,2]);value=a.quantize(Decimal(10)**-places,rounding=ROUND_HALF_UP)
        return computed(f'Làm tròn {fmt(a)} đến hàng '+{0:'đơn vị',1:'phần mười',2:'phần trăm'}[places]+'.',value,f'Xét chữ số ngay sau hàng cần làm tròn; kết quả là {fmt(value)}.','decimal_round',a,places)
    if skill=='powers':
        factor=r.choice([Decimal('10'),Decimal('100'),Decimal('1000'),Decimal('0.1'),Decimal('0.01'),Decimal('0.001')]);op=r.choice(['mul','div']);value=a*factor if op=='mul' else a/factor;sign='×' if op=='mul' else ':'
        return computed(f'Tính {fmt(a)} {sign} {fmt(factor)}.',value,f'{fmt(a)} {sign} {fmt(factor)} = {fmt(value)}.','mul' if op=='mul' else 'div',a,factor)
    op=skill if skill in ['add','sub','mul','div'] else r.choice(['add','sub','mul','div'])
    if op=='sub' and a<b:a,b=b,a
    if op=='div':a=(a*b).quantize(Decimal('0.0001'))
    value={'add':lambda:a+b,'sub':lambda:a-b,'mul':lambda:a*b,'div':lambda:a/b}[op]();sign={'add':'+','sub':'-','mul':'×','div':':'}[op]
    return computed(f'Tính: {fmt(a)} {sign} {fmt(b)}.',value,f'{fmt(a)} {sign} {fmt(b)} = {fmt(value)}. Kiểm tra bằng phép tính ngược.','div' if op=='div' else op,a,b)


def properties(r,grade,p):
    a,b,c=r.randint(2,99),r.randint(2,30),r.randint(2,20);op=p.get('op','add')
    if p.get('distributive'):
        return computed(f'Tính thuận tiện: {a} × {b} + {a} × {c}.',a*(b+c),f'Đặt thừa số chung {a}: {a} × ({b} + {c}) = {a} × {b+c} = {a*(b+c)}.','mul',a,b+c)
    if op=='add':return computed(f'Tính bằng cách nhóm thuận tiện: {a} + {b} + {100-a}.',100+b,f'Dùng tính chất giao hoán và kết hợp: ({a} + {100-a}) + {b} = 100 + {b} = {100+b}.','add',100,b)
    return computed(f'Tính thuận tiện: {a} × 5 × {2*b}.',a*b*10,f'Nhóm 5 × {2*b} = {10*b}; nhân với {a} được {a*b*10}.','mul',a,10*b)


def sum_difference(r,grade,p):
    small=r.randint(5,150);diff=r.randint(1,100);large=small+diff;total=small+large;want=r.choice(['số lớn','số bé']);value=large if want=='số lớn' else small
    return computed(f'Hai số có tổng {total}, hiệu {diff}. Tìm {want}.',value,f'Số lớn = ({total} + {diff}) : 2 = {large}; số bé = ({total} - {diff}) : 2 = {small}.','div',total+diff if want=='số lớn' else total-diff,2)


def ratio_problem(r,grade,p):
    a,b=sorted(r.sample(range(1,10),2));unit=r.randint(3,50);small=a*unit;large=b*unit;want=r.choice([True,False]);value=small if want else large;relation=p.get('relation','sum')
    if relation=='difference':return computed(f'Hai số có tỉ số {a}/{b}, hiệu bằng {large-small}. Tìm '+('số bé.' if want else 'số lớn.'),value,f'Hiệu số phần là {b} - {a} = {b-a}; một phần là {large-small} : {b-a} = {unit}. Số cần tìm là {unit} × {a if want else b} = {value}.','mul',unit,a if want else b)
    return computed(f'Hai số có tỉ số {a}/{b}, tổng bằng {small+large}. Tìm '+('số bé.' if want else 'số lớn.'),value,f'Tổng số phần là {a} + {b} = {a+b}; một phần là {small+large} : {a+b} = {unit}. Số cần tìm là {unit} × {a if want else b} = {value}.','mul',unit,a if want else b)


def average(r,grade,p):
    n=r.randint(2,5);mean=r.randint(10,60);values=[mean]*(n);delta=r.randint(1,9);values[0]-=delta;values[1]+=delta;r.shuffle(values)
    return computed('Tìm số trung bình cộng của các số '+', '.join(map(str,values))+'.',mean,'Tổng các số là '+str(sum(values))+f'; chia cho {n} được {mean}.','div',sum(values),n)


def unitary(r,grade,p):
    price=r.randint(2,20)*1000;n,m=r.sample(range(2,10),2)
    return computed(f'Mua {n} quyển vở cùng loại hết {n*price} đồng. Mua {m} quyển vở loại đó hết bao nhiêu đồng?',m*price,f'Một quyển giá {n*price} : {n} = {price} đồng. {m} quyển giá {price} × {m} = {m*price} đồng.','mul',price,m)


def percent(r,grade,p):
    skill=p.get('skill','ratio');pct=r.choice([5,10,15,20,25,30,40,50,60,75,80,90]);total=r.randint(2,30)*100;part=total*pct//100
    if skill=='of':return computed(f'Một trường có {total} học sinh; {pct}% tham gia ngày hội. Có bao nhiêu học sinh tham gia?',part,f'{total} × {pct} : 100 = {part} học sinh.','div',total*pct,100)
    if skill=='chart':return computed(f'Biểu đồ quạt tròn cho biết {pct}% trong {total} quyển sách là truyện. Có bao nhiêu quyển truyện?',part,f'{total} × {pct} : 100 = {part}.','div',total*pct,100)
    return computed(f'Trong {total} cây đã trồng có {part} cây ăn quả. Cây ăn quả chiếm bao nhiêu phần trăm tổng số cây?',pct,f'{part} : {total} × 100 = {pct}%. Chỉ điền số đứng trước kí hiệu %.','div',part*100,total)


def map_scale(r,grade,p):
    scale=r.choice([100,200,500,1000,10000]);cm=r.randint(2,30)
    return computed(f'Bản đồ có tỉ lệ 1 : {scale}. Một đoạn trên bản đồ dài {cm} cm. Độ dài thực tế của đoạn đó là bao nhiêu cm?',scale*cm,f'Mỗi 1 cm trên bản đồ ứng với {scale} cm thực tế. Độ dài thực tế là {cm} × {scale} = {scale*cm} cm.','mul',cm,scale)


def volume(r,grade,p):
    a,b,c=r.randint(2,100),r.randint(2,40),r.randint(2,40);skill=p.get('skill','box')
    if skill=='cube':return computed(f'Khối lập phương cạnh {a} cm có thể tích bao nhiêu cm³?',a**3,f'Thể tích bằng cạnh × cạnh × cạnh: {a} × {a} × {a} = {a**3} cm³.','mul',a*a,a)
    if skill=='surface_cube':
        faces=r.choice([4,6]);label='xung quanh' if faces==4 else 'toàn phần'
        return computed(f'Hình lập phương cạnh {a} cm có diện tích {label} bao nhiêu cm²?',faces*a*a,f'Diện tích một mặt là {a} × {a} = {a*a}. Diện tích {label} bằng {a*a} × {faces} = {faces*a*a} cm².','mul',a*a,faces)
    if skill=='surface_box':
        allfaces=r.choice([True,False]);value=2*(a*b+a*c+b*c) if allfaces else 2*(a+b)*c
        return computed(f'Hình hộp chữ nhật có đáy dài {a} cm, rộng {b} cm, chiều cao {c} cm. Diện tích '+('toàn phần' if allfaces else 'xung quanh')+' là bao nhiêu cm²?',value,f'Diện tích xung quanh: ({a} + {b}) × 2 × {c} = {2*(a+b)*c} cm².'+(f' Cộng diện tích hai đáy {2*a*b} cm² được {value} cm².' if allfaces else ''),'sum',2*(a+b)*c,2*a*b if allfaces else 0)
    return computed(f'Một khối hộp chữ nhật dài {a} cm, rộng {b} cm, cao {c} cm. Thể tích là bao nhiêu cm³?',a*b*c,f'Thể tích bằng dài × rộng × cao: {a} × {b} × {c} = {a*b*c} cm³.','mul',a*b,c)


def time_calculation(r,grade,p):
    a,b=r.randint(1,8)*60+r.randint(0,59),r.randint(1,3)*60+r.randint(0,59);op=p.get('op',r.choice(['add','sub']))
    if op=='sub' and a<b:a,b=b,a
    if op=='mul':
        factor=r.randint(2,6);return computed(f'Tính {a//60} giờ {a%60} phút × {factor}. Đổi kết quả ra phút.',a*factor,f'{a//60} giờ {a%60} phút = {a} phút; {a} × {factor} = {a*factor} phút.','mul',a,factor)
    if op=='div':
        divisor=r.randint(2,6);a*=divisor;return computed(f'Chia đều {a//60} giờ {a%60} phút cho {divisor}. Mỗi phần bao nhiêu phút?',a//divisor,f'Đổi ra {a} phút; {a} : {divisor} = {a//divisor} phút.','div',a,divisor)
    value=a+b if op=='add' else a-b;sign='+' if op=='add' else '-'
    return computed(f'Tính {a//60} giờ {a%60} phút {sign} {b//60} giờ {b%60} phút. Đổi kết quả ra phút.',value,f'Đổi hai số đo ra {a} phút và {b} phút; {a} {sign} {b} = {value} phút.',op,a,b)


def motion(r,grade,p):
    v=r.randint(5,90);t=r.randint(1,6);s=v*t;skill=p.get('skill',r.choice(['speed','distance','time']))
    if skill=='speed':return computed(f'Một xe đi đều {s} km trong {t} giờ. Vận tốc của xe là bao nhiêu km/giờ?',v,f'Vận tốc = quãng đường : thời gian = {s} : {t} = {v} km/giờ.','div',s,t)
    if skill=='time':return computed(f'Một xe đi đều với vận tốc {v} km/giờ trên quãng đường {s} km. Thời gian đi là bao nhiêu giờ?',t,f'Thời gian = quãng đường : vận tốc = {s} : {v} = {t} giờ.','div',s,v)
    return computed(f'Một xe đi đều với vận tốc {v} km/giờ trong {t} giờ. Quãng đường đi được là bao nhiêu km?',s,f'Quãng đường = vận tốc × thời gian = {v} × {t} = {s} km.','mul',v,t)


def decimal_measure(r,grade,p):
    large,small,factor=r.choice(p.get('units',[('m','cm',100),('kg','g',1000),('km','m',1000)]));whole=r.randint(1,30);part=r.randint(1,min(factor-1,99));value=Decimal(whole)+Decimal(part)/factor
    return computed(f'Viết {whole} {large} {part} {small} dưới dạng số thập phân theo đơn vị {large}.',value,f'{part} {small} = {fmt(Decimal(part)/factor)} {large}; cộng {whole} {large} được {fmt(value)} {large}.','div',whole*factor+part,factor)


def decimal_fraction(r,grade,p):
    den=r.choice([10,100,1000]);num=r.randint(1,999);factor=r.choice([2,4,5]);value=F(num,den)
    if r.choice([True,False]):return result(f'Phân số {num*factor}/{den*factor} bằng phân số thập phân nào dưới đây?',f'{num}/{den}',f'Chia cả tử và mẫu cho {factor}: {num*factor}/{den*factor} = {num}/{den}.',[f'{num+1}/{den}',f'{num}/{den*10}',f'{num*10}/{den}'])
    return result(f'Trong các phân số sau, phân số nào có mẫu số là một lũy thừa của 10?',f'{num}/{den}',f'Mẫu số {den} là 10, 100 hoặc 1000 nên {num}/{den} là phân số thập phân.',[f'{num}/3',f'{num}/7',f'{num}/9'])


def century(r,grade,p):
    year=r.randint(1001,2099);value=(year-1)//100+1
    if r.choice([True,False]):return computed(f'Năm {year} thuộc thế kỉ thứ mấy?',value,f'Các năm từ {(value-1)*100+1} đến {value*100} thuộc thế kỉ {value}.','century',year)
    return conversion(r,grade,dict(units=[('phút','giây',60),('thế kỉ','năm',100)]))


def estimate(r,grade,p):
    a,b=r.randint(110,989),r.randint(11,89);ra=((a+50)//100)*100;rb=((b+5)//10)*10
    return computed(f'Ước lượng {a} × {b} bằng cách làm tròn số thứ nhất đến hàng trăm, số thứ hai đến hàng chục rồi nhân. Kết quả ước lượng là bao nhiêu?',ra*rb,f'Làm tròn được {ra} và {rb}; tích ước lượng là {ra} × {rb} = {ra*rb}.','mul',ra,rb)


def nets(r,grade,p):
    name=r.choice(NAMES);a=r.randint(2,40);style=r.randrange(4)
    if style==0:return result(f'{name} khai triển một hình lập phương cạnh {a} cm. Hình khai triển gồm bao nhiêu hình vuông?',6,'Hình lập phương có 6 mặt là 6 hình vuông bằng nhau.')
    if style==1:return result(f'{name} khai triển một hình trụ. Hai đáy có dạng hình gì?','hai hình tròn bằng nhau','Hai đáy của hình trụ là hai hình tròn bằng nhau.',['hai hình tròn bằng nhau','hai hình tam giác','hai hình thoi'])
    if style==2:return result(f'Một hộp chữ nhật do {name} gấp có chiều dài {a} cm. Bỏ qua mép dán, hình khai triển đầy đủ của hộp có bao nhiêu mặt?',6,'Hình hộp chữ nhật có 6 mặt nên hình khai triển đầy đủ có 6 mặt.')
    return computed(f'{name} chuẩn bị gấp {a} hộp lập phương kín, mỗi hộp cần 6 hình vuông làm mặt. Cần tổng cộng bao nhiêu hình vuông?',a*6,f'{a} × 6 = {a*6} hình vuông.','mul',a,6)


def enlarged(r,grade,p):
    a,b=r.randint(2,50),r.randint(2,9);name=r.choice(NAMES);obj=r.choice(OBJECTS)
    if p.get('reduce'):
        return computed(f'{name} có {a*b} {obj}. Giảm số đó đi {b} lần thì còn bao nhiêu {obj}?',a,f'Giảm một số đi {b} lần là chia cho {b}: {a*b} : {b} = {a}.','div',a*b,b)
    if p.get('compare'):
        return computed(f'{name} có {a*b} {obj}, bạn khác có {a} {obj}. Số của {name} gấp mấy lần số của bạn?',b,f'Lấy số lớn chia số bé: {a*b} : {a} = {b} lần.','div',a*b,a)
    return computed(f'{name} có {a} {obj}. Bạn khác có số {obj} gấp {b} lần số của {name}. Bạn khác có bao nhiêu {obj}?',a*b,f'Gấp lên {b} lần là nhân với {b}: {a} × {b} = {a*b}.','mul',a,b)


def powers(r,grade,p):
    a=r.randint(2,999);factor=r.choice([10,100,1000]);op=r.choice(['mul','div'])
    if op=='mul':return computed(f'Tính: {a} × {factor}.',a*factor,f'Nhân số tự nhiên với {factor}, viết thêm {len(str(factor))-1} chữ số 0 vào bên phải: {a*factor}.','mul',a,factor)
    return computed(f'Tính: {a*factor} : {factor}.',a,f'Chia cho {factor}: {a*factor} : {factor} = {a}.','div',a*factor,factor)


def sequence(r,grade,p):
    maximum=p.get('max',100);a=r.randint(2,maximum-5);style=r.randrange(4)
    if style==0:return computed(f'Trên tia số, vạch biểu diễn {a} nằm ngay trước vạch biểu diễn số nào? Các vạch ghi các số tự nhiên liên tiếp.',a+1,f'Số liền sau {a} là {a} + 1 = {a+1}.','add',a,1)
    if style==1:return computed(f'Trên tia số, vạch ngay bên trái số {a} ghi số nào? Các vạch ghi các số tự nhiên liên tiếp.',a-1,f'Số liền trước {a} là {a} - 1 = {a-1}.','sub',a,1)
    if style==2:return computed(f'Điền số tự nhiên còn thiếu: {a}; {a+1}; ...; {a+3}.',a+2,f'Hai số tự nhiên liên tiếp hơn kém nhau 1. Sau {a+1} là {a+2}.','add',a,2)
    return computed(f'Từ số {a} trên tia số, tiến sang phải 3 đơn vị. Đến số nào?',a+3,f'Tiến sang phải 3 đơn vị: {a} + 3 = {a+3}.','add',a,3)


FUNCTIONS={fn.__name__:fn for fn in [arithmetic,number,compare,components,missing,difference,multiplication_concept,remainder,word_steps,expression,round_number,parity,roman,conversion,measure_story,money,temperature,clock,date_question,statistics,probability,frequency,points,polygon,solids,angles,lines,parallelogram,circle,perimeter,area,fraction,decimal_question,properties,sum_difference,ratio_problem,average,unitary,percent,map_scale,volume,time_calculation,motion,decimal_measure,decimal_fraction,century,estimate,nets,enlarged,powers,sequence]}


def catalog(grade,book):
    bank={}
    def set_(numbers,kind,**params):
        for n in numbers:bank[n]=[(kind,params)]
    def mix(numbers,*skills):
        for n in numbers:bank[n]=[(kind,params) for kind,params in skills]
    def S(kind,**params):return (kind,params)
    lengths=S('conversion',units=[('m','cm',100),('m','dm',10),('km','m',1000)])
    small_units=S('conversion',units=[('cm','mm',10),('kg','g',1000),('l','ml',1000)])
    areas=S('conversion',units=[('m²','dm²',100),('dm²','cm²',100),('cm²','mm²',100)])
    measures=S('conversion',units=[('tấn','kg',1000),('tạ','kg',100),('yến','kg',10)])
    if grade==2:
        set_([1],'number',max=100);set_([2],'sequence',max=100);set_([3],'components');set_([4,13],'difference')
        set_([5],'arithmetic',max=100,carry=False);set_([7,8],'arithmetic',max=20,op='+',a_digits=1,b_digits=1,carry=True)
        set_([9],'arithmetic',max=20);set_([11,12],'arithmetic',max=20,op='-',carry=True)
        set_([15],'measure_story',unit='kg');set_([16],'measure_story',unit='l');mix([17],S('measure_story',unit='kg'),S('measure_story',unit='l'))
        set_([19],'arithmetic',max=100,op='+',a_digits=2,b_digits=1,carry=True);set_([20],'arithmetic',max=100,op='+',a_digits=2,b_digits=2,carry=True)
        set_([22],'arithmetic',max=100,op='-',a_digits=2,b_digits=1,carry=True);set_([23],'arithmetic',max=100,op='-',a_digits=2,b_digits=2,carry=True)
        set_([25],'points');set_([26,27,34],'polygon');mix([28],S('points'),S('polygon'))
        set_([29],'clock');set_([30],'date_question');mix([31],S('clock'),S('date_question'))
        mix([33],S('arithmetic',max=20),S('arithmetic',max=100));mix([35],S('measure_story',unit='kg'),S('measure_story',unit='l'),S('clock'),S('date_question'))
        mix([36],S('arithmetic',max=100),S('polygon'),S('measure_story',unit='kg'),S('date_question'))
        set_([37,38],'multiplication_concept');set_([39],'arithmetic',op='×',table=2);set_([40],'arithmetic',op='×',table=5)
        set_([41,42],'multiplication_concept',division=True);set_([43],'arithmetic',op=':',table=2);set_([44],'arithmetic',op=':',table=5)
        set_([46,47],'solids',sphere_cylinder=True);set_([48,51,52,68],'number',max=1000)
        set_([49],'number',max=1000,round_numbers=True);set_([50],'compare',max=1000,round_numbers=True);set_([53],'compare',max=1000)
        bank[55]=[lengths];set_([56],'money');bank[57]=[lengths];mix([58],lengths,S('money'))
        set_([59],'arithmetic',max=1000,op='+',carry=False);set_([60],'arithmetic',max=1000,op='+',carry=True)
        set_([61],'arithmetic',max=1000,op='-',carry=False);set_([62],'arithmetic',max=1000,op='-',carry=True)
        set_([64,67],'statistics');set_([65],'statistics',pictogram=True);set_([66],'probability')
        set_([69],'arithmetic',max=100);set_([70],'arithmetic',max=1000)
        mix([71],S('arithmetic',op='×',table=2),S('arithmetic',op=':',table=5));mix([72],S('polygon'),S('solids',sphere_cylinder=True))
        mix([73],lengths,S('clock'),S('money'));mix([74],S('statistics'),S('probability'))
        mix([75],S('number',max=1000),S('arithmetic',max=1000),S('arithmetic',op='×',table=5),S('statistics'),S('polygon'),S('money'))
    if grade==3:
        set_([1],'number',max=1000);set_([2],'arithmetic',max=1000);set_([3],'missing',max=1000)
        mix([4],S('arithmetic',op='×',table=2),S('arithmetic',op=':',table=5))
        for lesson,table in [(5,3),(6,4),(9,6),(10,7),(11,8),(12,9)]:mix([lesson],S('arithmetic',op='×',table=table),S('arithmetic',op=':',table=table))
        mix([7],S('polygon'),lengths);set_([13],'missing',mult=True);set_([14],'fraction',skill='part')
        set_([16],'points',midpoint=True);set_([17],'circle');set_([18,20],'angles');set_([19],'polygon');set_([21],'solids')
        set_([23],'arithmetic',op='×',digits=2,max=100);set_([24],'enlarged');set_([25],'remainder');set_([26],'arithmetic',op=':',digits=2,max=99)
        set_([27],'enlarged',reduce=True);set_([28],'word_steps')
        for n,u in [(30,('cm','mm',10)),(31,('kg','g',1000)),(32,('l','ml',1000))]:set_([n],'conversion',units=[u])
        set_([33],'temperature');mix([34],small_units,S('temperature'))
        set_([36],'arithmetic',op='×',digits=3,max=1000);set_([37],'arithmetic',op=':',digits=3,max=999)
        set_([38,42],'expression');set_([39],'enlarged',compare=True)
        mix([41],S('arithmetic',op='×',digits=3,max=1000),S('arithmetic',op=':',digits=3,max=999));mix([43],S('circle'),S('perimeter'),small_units)
        mix([44],S('arithmetic',max=1000),S('expression'),S('word_steps'),S('circle'),small_units)
        set_([45],'number',max=10000);set_([46],'compare',max=10000);set_([47],'roman');set_([48],'round_number')
        set_([50],'perimeter');set_([51],'area',shape='unit');set_([52],'area')
        set_([54],'arithmetic',op='+',max=10000);set_([55],'arithmetic',op='-',max=10000)
        set_([56],'arithmetic',op='×',digits=4,max=10000);set_([57],'arithmetic',op=':',digits=4,max=9999)
        set_([59,76],'number',max=100000);set_([60],'compare',max=100000);mix([61],S('round_number',unit=1000),S('round_number',unit=10000))
        set_([63],'arithmetic',op='+',max=100000);set_([64],'arithmetic',op='-',max=100000)
        mix([66,67],S('clock'),S('date_question'));set_([68],'money')
        set_([70],'arithmetic',op='×',digits=5,max=100000);set_([71],'arithmetic',op=':',digits=5,max=99999)
        set_([73,75],'statistics');set_([74],'probability');set_([77],'arithmetic',max=100000)
        mix([78],S('arithmetic',op='×',digits=5,max=100000),S('arithmetic',op=':',digits=5,max=99999));mix([79],S('perimeter'),S('area'),small_units)
        mix([80],S('statistics'),S('probability'));mix([81],S('number',max=100000),S('arithmetic',max=100000),S('area'),S('money'),S('statistics'))
    if grade==4:
        set_([1],'number',max=100000);set_([2],'arithmetic',max=100000);set_([3],'parity');set_([4],'expression',letter=True);set_([5],'word_steps',steps=3)
        set_([7],'angles',measure=True);set_([8],'angles');set_([10,67],'number',max=1000000);set_([11,12,33],'number',max=1000000000);set_([13],'round_number',unit=100000)
        set_([11],'number',max=1000000000,place_only=True);set_([14],'compare',max=1000000000);set_([15],'sequence',max=1000000);bank[17]=[measures];bank[18]=[areas];set_([19],'century');mix([20],measures,areas,S('century'))
        set_([22],'arithmetic',op='+',max=1000000);set_([23],'arithmetic',op='-',max=1000000);set_([24],'properties',op='add');set_([25],'sum_difference')
        set_([27,28],'lines');set_([29,30],'lines',parallel=True);set_([31],'parallelogram');set_([34],'arithmetic',max=1000000)
        mix([35],S('angles'),S('lines'),S('parallelogram'));mix([36],measures,areas,S('century'))
        mix([37],S('number',max=1000000),S('arithmetic',max=1000000),S('sum_difference'),S('angles'),measures)
        set_([38],'arithmetic',op='×',digits=4,max=100000);set_([39],'arithmetic',op=':',digits=4,max=9999);set_([40],'properties',op='mul');set_([41],'powers');set_([42],'properties',distributive=True)
        # These two lessons specifically require two-digit multipliers/divisors.
        set_([43],'two_digit',op='×');set_([44],'two_digit',op=':');set_([45],'estimate');set_([46],'average');set_([47],'unitary')
        set_([49],'statistics');set_([50],'statistics',bar=True);set_([51],'frequency')
        for n,skill in [(53,'concept'),(54,'division'),(55,'equivalent'),(56,'reduce'),(57,'common'),(58,'compare'),(60,'add'),(61,'sub'),(63,'mul'),(64,'div'),(65,'of_number')]:set_([n],'fraction',skill=skill)
        set_([68],'arithmetic',max=1000000);mix([69],S('fraction',skill='reduce'),S('fraction',skill='compare'));set_([70],'fraction',skill='operations')
        mix([71],S('perimeter'),S('area'),areas);mix([72],S('statistics'),S('frequency'))
        mix([73],S('number',max=1000000),S('fraction',skill='operations'),S('arithmetic',max=1000000),S('area'),S('statistics'))
    if grade==5:
        set_([1],'number',max=1000000);set_([2],'arithmetic',max=1000000);mix([3],S('fraction',skill='reduce'),S('fraction',skill='compare'))
        set_([4],'decimal_fraction');set_([5],'fraction',skill='operations');mix([6],S('fraction',skill='add'),S('fraction',skill='sub'));set_([7],'fraction',skill='mixed')
        mix([8],S('perimeter'),S('area'),areas);set_([10],'decimal_question',skill='concept');set_([11],'decimal_question',skill='compare');set_([12],'decimal_measure');set_([13],'decimal_question',skill='round')
        set_([15],'conversion',units=[('km²','ha',100),('ha','m²',10000)]);bank[16]=[areas];mix([17],areas,S('conversion',units=[('ha','m²',10000)]))
        for n,skill in [(19,'add'),(20,'sub'),(21,'mul'),(22,'div'),(23,'powers')]:set_([n],'decimal_question',skill=skill)
        set_([25],'area',shape='triangle');set_([26],'area',shape='trapezoid');set_([27],'area',shape='circle');mix([28],S('area',shape='triangle'),S('area',shape='trapezoid'),S('area',shape='circle'))
        mix([30],S('decimal_question',skill='concept'),S('decimal_question',skill='compare'),S('decimal_question',skill='round'));set_([31],'decimal_question',skill='operations')
        mix([32],S('polygon'),S('angles'),S('circle'));mix([33],S('area',shape='triangle'),S('area',shape='trapezoid'),S('area',shape='circle'))
        set_([34],'decimal_measure');mix([35],S('decimal_question',skill='operations'),S('area',shape='triangle'),S('area',shape='trapezoid'),S('decimal_measure'))
        mix([36],S('percent',skill='ratio'),S('fraction',skill='division'));set_([37],'map_scale');set_([38],'ratio_problem',relation='sum');set_([39],'ratio_problem',relation='difference')
        set_([40],'percent',skill='ratio');set_([41],'percent',skill='of');set_([42,43],'decimal_question',skill='operations')
        set_([45],'volume');set_([46],'conversion',units=[('dm³','cm³',1000)]);set_([47],'conversion',units=[('m³','dm³',1000),('m³','cm³',1000000)])
        set_([49],'nets');set_([50],'volume',skill='surface_box');set_([51],'volume',skill='surface_cube');set_([52],'volume');set_([53],'volume',skill='cube');mix([54],S('volume'),S('volume',skill='cube'))
        set_([56],'conversion',units=[('giờ','phút',60),('phút','giây',60),('ngày','giờ',24)]);set_([57],'time_calculation');mix([58],S('time_calculation',op='mul'),S('time_calculation',op='div'))
        set_([59],'motion',skill='speed');mix([60],S('motion',skill='distance'),S('motion',skill='time'));set_([61],'motion')
        set_([63,66],'statistics');set_([64],'percent',skill='chart');set_([65],'frequency',ratio=True)
        mix([68],S('number',max=1000000),S('fraction',skill='reduce'),S('decimal_question',skill='compare'))
        mix([69],S('arithmetic',max=1000000),S('fraction',skill='operations'),S('decimal_question',skill='operations'));mix([70],S('percent',skill='ratio'),S('percent',skill='of'),S('ratio_problem',relation='sum'))
        mix([71],S('area',shape='triangle'),S('area',shape='circle'),S('volume'),S('volume',skill='surface_box'));mix([72],areas,S('decimal_measure'),S('time_calculation'))
        set_([73],'motion');mix([74],S('statistics'),S('percent',skill='chart'),S('frequency',ratio=True))
        mix([75],S('decimal_question',skill='operations'),S('percent',skill='of'),S('motion'),S('area',shape='circle'),S('volume'),S('statistics'))
    # A general-practice lesson mixes the skills already taught within its chapter.
    for chapter in book['chapters']:
        previous=[]
        for lesson in chapter['lessons']:
            n=lesson['sortOrder']
            if n not in bank:
                if 'Luyện tập chung' not in lesson['name'] or not previous:raise ValueError(f'Unmapped lesson {grade}/{n}: {lesson["name"]}')
                bank[n]=list(previous)
            for skill in bank[n]:
                if skill not in previous:previous.append(skill)
    return bank


def two_digit(r,grade,p):
    a,b=r.randint(100,999),r.randint(11,99)
    if p['op']=='×':return computed(f'Tính {a} × {b}.',a*b,f'{a} × {b} = {a*b}. Có thể tách {b} thành {b//10*10} + {b%10} để kiểm tra.','mul',a,b)
    return computed(f'Tính {a*b} : {b}.',a,f'{a*b} : {b} = {a}, vì {a} × {b} = {a*b}.','div',a*b,b)

FUNCTIONS['two_digit']=two_digit


def numeric(text):
    try:return F(str(text).replace(',','.'))
    except (ValueError,ZeroDivisionError):return None


def verify(problem):
    proof=problem.get('proof')
    if not proof:return
    args=[F(x) for x in proof['args']];op=proof['op']
    expected=numeric(problem['expected'])
    if op=='add':value=args[0]+args[1]
    elif op=='sub':value=args[0]-args[1]
    elif op=='mul':value=args[0]*args[1]
    elif op=='div':value=args[0]/args[1]
    elif op=='sum':value=sum(args)
    elif op=='digit':value=int(args[0])//10**int(args[1])%10
    elif op=='mod':value=args[0]%args[1]
    elif op=='round':value=(args[0]//args[1]+(1 if (args[0]%args[1])*2>=args[1] else 0))*args[1]
    elif op=='century':value=(int(args[0])-1)//100+1
    elif op=='decimal_round':value=F(Decimal(proof['args'][0]).quantize(Decimal(10)**-int(args[1]),rounding=ROUND_HALF_UP))
    else:raise ValueError('Unknown proof '+op)
    if expected!=value:raise ValueError(f'Wrong answer: {problem}, evaluated {value}')


def question(problem,r,index):
    verify(problem)
    expected=problem['expected'];val=numeric(expected)
    is_fill=(index%5 in [3,4]) and val is not None
    if is_fill:
        accepted=[expected]
        canonical=fmt(val)
        if canonical not in accepted:accepted.append(canonical)
        if ',' in expected:accepted.append(expected.replace(',','.'))
        return dict(type='fill_in',prompt=problem['prompt'],options=[],answer={'accepted':accepted},explanation=problem['explanation'],difficulty='medium')
    candidates=[expected]
    for wrong in problem['wrong']:
        if wrong not in candidates and (val is None or numeric(wrong)!=val):candidates.append(wrong)
    if val is not None:
        for offset in r.sample([1,2,3,5,10,-1,-2,-3],8):
            v=val+offset
            if v<0 or v==val:continue
            text=fmt(v)
            if text not in candidates and all(numeric(c)!=v for c in candidates):candidates.append(text)
            if len(candidates)>=4:break
    if len(candidates)<2:raise ValueError('Missing distractors '+repr(problem))
    candidates=candidates[:4];r.shuffle(candidates)
    key='abcd'[candidates.index(expected)]
    return dict(type='single_choice',prompt=problem['prompt'],options=[dict(key='abcd'[i],text=x) for i,x in enumerate(candidates)],answer={'key':key},explanation=problem['explanation'],difficulty='easy' if index<20 else 'medium')


def paragraph(text,style=None):
    prop=f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ''
    return f'<w:p>{prop}<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'


def write_docx(file,grade,chapter,lesson,questions):
    lines=[paragraph(f'TOÁN LỚP {grade} — {lesson["name"]}', 'Title'),paragraph('Bộ 50 câu hỏi tự soạn — Bản nháp để giáo viên duyệt'),paragraph(f'Môn: Toán'),paragraph(f'Lớp: {grade}'),paragraph('Học kì: '+('1' if chapter['semester']=='hk1' else '2')),paragraph('Chủ đề: '+chapter['name']),paragraph('Bài học: '+lesson['name']),paragraph('Gồm trắc nghiệm và điền đáp án; có đáp án và lời giải ngay sau mỗi câu.'),paragraph('')]
    for i,q in enumerate(questions,1):
        lines.append(paragraph(f'Câu {i}. {q["prompt"]}','Heading2'))
        for o in q['options']:lines.append(paragraph(o['key'].upper()+'. '+o['text']))
        answer=q['answer']['key'].upper() if q['type']=='single_choice' else ' | '.join(q['answer']['accepted'])
        lines.extend([paragraph('Loại: '+('một đáp án' if q['type']=='single_choice' else 'điền')),paragraph('Đáp án: '+answer),paragraph('Lời giải: '+q['explanation']),paragraph('Độ khó: '+('dễ' if q['difficulty']=='easy' else 'vừa')),paragraph('')])
    xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+''.join(lines)+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>'
    styles='<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/></w:rPr></w:style></w:styles>'
    with zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>')
        z.writestr('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/_rels/document.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
        z.writestr('word/document.xml',xml);z.writestr('word/styles.xml',styles)


def slug(text):
    value=unicodedata.normalize('NFD',text).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',value).strip('-')[:110]


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest=[]
    for grade in range(2,6):
        book=json.loads((ROOT/f'backend/seed-data/math-grade{grade}-kntt.json').read_text(encoding='utf8'))
        bank=catalog(grade,book);folder=OUT/f'lop-{grade}';folder.mkdir(exist_ok=True)
        for chapter in book['chapters']:
            for lesson in chapter['lessons']:
                number_=lesson['sortOrder'];r=random.Random(grade*10000+number_);skills=bank[number_];seen=set();questions=[];proof_count=0;attempts=0
                while len(questions)<50:
                    attempts+=1
                    if attempts>4000:raise ValueError(f'Not enough unique questions: {grade}/{number_}')
                    kind,params=skills[len(questions)%len(skills)]
                    problem=FUNCTIONS[kind](r,grade,params)
                    if problem['prompt'] in seen:continue
                    q=question(problem,r,len(questions));seen.add(q['prompt']);questions.append(q);proof_count+=int(bool(problem['proof']))
                filename=f'50-cau-hoi-toan-lop-{grade}-bai-{number_:02}-{slug(lesson["name"].split(". ",1)[1])}.docx'
                file=folder/filename;write_docx(file,grade,chapter,lesson,questions)
                manifest.append(dict(grade=grade,lessonId=lesson['id'],lessonName=lesson['name'],chapterId=chapter['id'],chapterName=chapter['name'],semester=chapter['semester'],file=str(file.relative_to(ROOT)).replace('\\','/'),sha256=hashlib.sha256(file.read_bytes()).hexdigest(),questionCount=50,calculationChecks=proof_count,skills=skills,questions=questions))
        print(json.dumps({'grade':grade,'files':sum(m['grade']==grade for m in manifest),'questions':sum(m['questionCount'] for m in manifest if m['grade']==grade)}),flush=True)
    data=ROOT/'backend/backups/generated-primary-50-manifest.json';data.parent.mkdir(exist_ok=True)
    data.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    for grade in range(2,6):
        with zipfile.ZipFile(OUT.parent/f'toan-lop-{grade}-50-cau-moi-bai.zip','w',zipfile.ZIP_DEFLATED) as archive:
            for file in sorted((OUT/f'lop-{grade}').glob('*.docx')):archive.write(file,f'lop-{grade}/{file.name}')
    with zipfile.ZipFile(OUT.parent/'toan-lop-2-den-5-50-cau-moi-bai.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for grade in range(2,6):
            for file in sorted((OUT/f'lop-{grade}').glob('*.docx')):archive.write(file,f'lop-{grade}/{file.name}')
    print(json.dumps({'files':len(manifest),'questions':sum(m['questionCount'] for m in manifest),'calculationChecks':sum(m['calculationChecks'] for m in manifest)}))


if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8');main()
