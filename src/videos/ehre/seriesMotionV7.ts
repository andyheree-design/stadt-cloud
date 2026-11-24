import DATA from './e01_data.json';
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*x*(x*(x*6-15)+10);};
export const captureNames=['m_sit_chair_idle_neutral_01','m_sit_chair_gestic_thoughtful','m_gestic_talk_neutral_01','f_gestic_talk_neutral_01','m_sit_stand_up_chair_01','m_sit_down_chair_01','m_waiting_walk','f_waiting_walk','m_gestic_listen_neutral_01'];
const sample=(clip:any,time:number)=>{const f=Math.max(0,Math.min(clip.frames.length-1,time*clip.fps)),i=Math.floor(f),u=f-i,a=clip.frames[i],b=clip.frames[Math.min(i+1,clip.frames.length-1)];return {pelvis:a.pelvis.map((v:number,k:number)=>v+(b.pelvis[k]-v)*u)};};
const progress=(clip:any,t:number)=>{const a=clip.frames[0].pelvis[1],b=clip.frames[clip.frames.length-1].pelvis[1];return Math.max(0,Math.min(1,(sample(clip,t).pelvis[1]-a)/(b-a||1)));};
export function capturedPose(id:string,t:number,p:any,clips:any){
 if(id==='tarek'){
  const rise=t<15?0:t<17.5?progress(clips.m_sit_stand_up_chair_01,t-15):t<21?1:t<23.9?1-progress(clips.m_sit_down_chair_01,t-21):0;
  p.sit=1-rise;p.pos=[...p.pos];p.pos[0]-=Math.sin(p.rotY??0)*.40*rise;p.pos[2]-=Math.cos(p.rotY??0)*.40*rise;
 }
 if(id==='mama'){
  p.pos=[.65,0,1.35];p.rotY=0;p.grounded=!(t>=23.55&&t<25.15);
  p.armL={out:.10,fwd:.03,elbow:.16};p.handL={curl:-.55};
  if(t>=29.6&&t<31.85){p.armR={out:.15,fwd:.3,elbow:1.2};p.handR={curl:-.55,index:-.5,thumb:-.6};p.headTilt=-.05;}
 }
 p.smoke=0;return p;
}
export function applySeriesCapture(c:any,id:string,t:number,clips:any){
 const seated=id==='kevin'||id==='tarek';
 if(id==='mama'){
  if(t>=23.55&&t<25.15)c.applyCapture(clips.f_waiting_walk,18+(t-23.55)*1.25,{legs:true,originTime:18,skipLeft:true,twist:true});
  else c.applyCapture(clips.f_gestic_talk_neutral_01,5.5+t-29.6,{skipLeft:false,skipRight:true,skipHead:true,twist:true});
  return;
 }
 c.applyCapture(seated?clips.m_sit_chair_idle_neutral_01:id==='dilara'?clips.f_gestic_talk_neutral_01:clips.m_gestic_listen_neutral_01,seated?1+t*.75:id==='dilara'?8+t*.55:1+t*.65,{skipHead:true,skipRight:id==='dilara'||id==='tarek',skipLeft:false,twist:true,weight:.38});
 const l=(DATA as any[]).find(l=>l.who===id&&t>=l.start-.16&&t<l.end+.25);
 if(l){const g=id==='kevin'?smooth((t-11.05)/.65)*(1-smooth((t-14.55)/1.10)):1;const w=g*smooth((t-l.start+.16)/.30)*(1-smooth((t-l.end)/.25));
  const clip=id==='dilara'?clips.f_gestic_talk_neutral_01:id==='kevin'?clips.m_sit_chair_gestic_thoughtful:clips.m_gestic_talk_neutral_01;
  c.applyCapture(clip,(id==='dilara'?5.5:id==='kevin'?7:4)+Math.max(0,t-l.start),{skipHead:true,skipRight:id==='dilara'||id==='tarek',skipLeft:false,twist:true,weight:w});
 }
 if(id==='tarek'){
  if(t>=15&&t<17.5)c.applyCapture(clips.m_sit_stand_up_chair_01,t-15,{skipRight:true,skipHead:true,twist:true,weight:smooth((t-15)/.25)*(1-smooth((t-17.15)/.35))});
  if(t>=21&&t<23.9)c.applyCapture(clips.m_sit_down_chair_01,t-21,{skipRight:true,skipHead:true,twist:true,weight:smooth((t-21)/.25)*(1-smooth((t-23.5)/.40))});
  const smoke=smooth((t-11.85)/.40)*(1-smooth((t-12.95)/.45));// Mouthpiece contact is solved after the authored body layer in the composition.
 }
}
