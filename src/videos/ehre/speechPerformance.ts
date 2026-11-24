import DATA from './e01_data.json';
const LINES=DATA as any[];
const shapes=(char:string)=>{
 if(/[mbp]/i.test(char))return {open:.04,width:.41,press:.65,purse:.05};
 if(/[ouüöw]/i.test(char))return {open:.52,width:.36,press:0,purse:.30};
 if(/[aä]/i.test(char))return {open:.75,width:.43,press:0,purse:0};
 if(/[eiiy]/i.test(char))return {open:.40,width:.48,press:0,purse:0};
 if(/[fv]/i.test(char))return {open:.16,width:.43,press:.15,purse:0};
 return {open:.23,width:.43,press:.04,purse:0};
};
// Grapheme-guided articulation gated by the recorded envelope; not claimed as forced phoneme alignment.
export function speechPerformance(id:string,t:number){
 const l=LINES.find(l=>l.who===id&&t>=l.start&&t<l.end);
 if(!l)return {mouthOpen:0,jaw:0,mouthWidth:.42,lipPress:.06,speechPurse:0};
 const frame=(t-l.start)*30,idx=Math.floor(frame);
 const e=[0,1,2,3,4].reduce((a,k)=>a+(l.env[Math.max(0,idx-k)]??0),0)/5;
 const text=String(l.sub).replace(/[^a-zäöüß]/gi,'');const pos=Math.min(text.length-1,(t-l.start)/(l.end-l.start)*text.length),i=Math.floor(pos),u=pos-i;
 const a=shapes(text[i]??''),b=shapes(text[Math.min(i+1,text.length-1)]??'');
 const mix=(key:keyof typeof a)=>a[key]*(1-u)+b[key]*u;
 return {mouthOpen:Math.min(.85,e)*mix('open')*.68,jaw:e*.20,mouthWidth:.42+(mix('width')-.42)*Math.min(1,e*2),lipPress:mix('press')*Math.min(1,e*2),speechPurse:mix('purse')*Math.min(1,e*2)};
}
