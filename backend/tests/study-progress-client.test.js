import {beforeEach,afterEach,it,expect,vi} from 'vitest';

const mocks=vi.hoisted(()=>({api:vi.fn(),sync:vi.fn(),element:(tag,attributes={},children=[])=>({tag,attributes,children:[...children],textContent:attributes.text||'',append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;this.textContent='';}})}));
vi.mock('../../frontend/assets/js/api.js',()=>({api:mocks.api,el:mocks.element}));
vi.mock('../../frontend/assets/js/ui-core.js',()=>({syncDiamondTotal:mocks.sync}));
import {studyReward} from '../../frontend/assets/js/study-reward.js';

const settle=async()=>{for(let n=0;n<20;n++)await new Promise(resolve=>setImmediate(resolve));};
const progress=()=>mocks.api.mock.calls.filter(([path])=>path.endsWith('/progress'));
const completed=()=>mocks.api.mock.calls.filter(([path])=>path.endsWith('/finish'));
beforeEach(()=>{
 vi.stubGlobal('document',{body:{dataset:{role:'student'}}});vi.stubGlobal('window',new EventTarget());mocks.api.mockReset();mocks.sync.mockReset();
 mocks.api.mockImplementation(async path=>({data:path.endsWith('/study-sessions')?{id:'session',required:5}:path.endsWith('/finish')?{reward:{earned:1}}:{saved:true}}));
});
afterEach(()=>vi.unstubAllGlobals());
it('persists a partial visit without claiming a reward',async()=>{
 const tracker=studyReward({activity:'words',sourceId:'set',required:5});tracker.item('one');await settle();
 expect(progress()).toHaveLength(1);expect(progress()[0][1]).toMatchObject({keepalive:true,body:{items:[{id:'one'}]}});expect(completed()).toHaveLength(0);
});
it('keeps saving items after the five-item reward has been claimed',async()=>{
 const tracker=studyReward({activity:'words',sourceId:'set',required:5});for(let n=0;n<5;n++)tracker.item(String(n));await settle();expect(tracker.awarded).toEqual({earned:1});
 tracker.item('six');tracker.item('seven');await settle();expect(completed()).toHaveLength(1);
 const saved=progress().flatMap(([,options])=>options.body.items.map(item=>item.id));expect(new Set(saved)).toEqual(new Set(['0','1','2','3','4','six','seven']));
});
it('card flips save coverage independently of reward self-assessment',async()=>{
 const tracker=studyReward({activity:'cards',sourceId:'set'});tracker.track('word');await settle();expect(progress()).toHaveLength(1);expect(completed()).toHaveLength(0);
});
it('queues quick successive answers while session creation is in flight',async()=>{
 let release;mocks.api.mockImplementation(path=>path.endsWith('/study-sessions')?new Promise(resolve=>{release=()=>resolve({data:{id:'session',required:5}});}):Promise.resolve({data:{saved:true}}));
 const tracker=studyReward({activity:'listening',sourceId:'set'});for(let n=0;n<12;n++)tracker.track(String(n),'choice '+n);release();await settle();
 expect(mocks.api.mock.calls.filter(([path])=>path.endsWith('/study-sessions'))).toHaveLength(1);
 expect(progress().every(([,options])=>options.body.items.length<=5)).toBe(true);expect(progress().flatMap(([,options])=>options.body.items)).toHaveLength(12);
});
it('reopens an expired session once and keeps pending coverage',async()=>{
 let starts=0,requests=0;mocks.api.mockImplementation(async path=>{
  if(path.endsWith('/study-sessions'))return {data:{id:'session'+(++starts),required:5}};
  if(++requests===1)throw Object.assign(Error('Expired'),{code:'STUDY_SESSION_EXPIRED'});return {data:{saved:true}};
 });
 const tracker=studyReward({activity:'words',sourceId:'set'});tracker.track('word');await settle();expect(starts).toBe(2);expect(progress()).toHaveLength(2);expect(progress()[1][0]).toContain('session2');expect(progress()[1][1].body.items).toEqual([{id:'word'}]);
});
it('retains pending items after a network failure and a later retry persists them',async()=>{
 let failed=false;mocks.api.mockImplementation(async path=>{if(path.endsWith('/study-sessions'))return {data:{id:'session',required:5}};if(!failed){failed=true;throw Error('Offline');}return {data:{saved:true}};});
 const tracker=studyReward({activity:'words',sourceId:'set'});tracker.track('first');await settle();expect(progress()).toHaveLength(1);tracker.track('second');await settle();expect(progress()[1][1].body.items).toEqual([{id:'first'},{id:'second'}]);
});
it('sends recording duration with answered question IDs and skips tracking in admin previews',async()=>{
 const tracker=studyReward({activity:'recording',sourceId:'set'});tracker.evidence({duration:8});tracker.track('1');await settle();expect(progress()[0][1].body).toEqual({items:[{id:'1'}],duration:8});
 mocks.api.mockClear();document.body.dataset.role='admin';studyReward({activity:'words',sourceId:'set'}).item('word');await settle();expect(mocks.api).not.toHaveBeenCalled();
});
