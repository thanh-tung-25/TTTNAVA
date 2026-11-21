export const paperPeriods=[['midterm1','Giữa kì I','hk1'],['final1','Cuối kì I','hk1'],['midterm2','Giữa kì II','hk2'],['final2','Cuối kì II','hk2'],['other','Đề khác','year']];
export const paperPeriodLabel=value=>paperPeriods.find(([id])=>id===value)?.[1]||'Đề khác';
