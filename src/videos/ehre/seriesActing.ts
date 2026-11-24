import type {ActorDef,CastId} from './set';

const smooth=(x:number)=>{const u=Math.max(0,Math.min(1,x));return u*u*u*(u*(u*6-15)+10);};
const window=(t:number,a:number,b:number,c:number,d:number)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const beat=(t:number,a:number,length:number)=>{const u=(t-a)/length;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;};
// Authored phrase gestures, independent of the amplitude used for lip movement.
const accents:Record<string,number[]>={tarek:[4.7,6.1,9.7,10.8,16.0,16.9,20.3,21.5,22.5,25.7,31.9],dilara:[.4,1.8,3.0,7.5,8.6,18.1,19.3,30.0],kevin:[12.0,13.2,14.4,15.1],mama:[23.8,24.5]};

export function seriesActing(id:CastId,t:number,base:ActorDef,energy:number):ActorDef{
 const i={tarek:0,dilara:1,kevin:2,mama:3}[id];
 const p={...base,pos:[...base.pos] as [number,number,number]};
 const speech=(accents[id]??[]).reduce((v,a)=>Math.max(v,beat(t,a,.85)),0);
 const settle=(accents[id]??[]).reduce((v,a)=>Math.max(v,beat(t,a+.30,1.2)),0);
 const breath=Math.sin(t*1.42+i*1.7);
 // Tarek plants his feet, leans forward, rises, holds, then visibly sits back down.
 const rise=id==='tarek'?window(t,15.05,16.35,21.85,23.15):0;
 const preparation=id==='tarek'?(beat(t,14.85,.9)+beat(t,21.8,1.15)):0;
 if(id==='tarek'){p.sit=1-rise;p.pos[2]-=.40*rise;(p as any).smoke=window(t,11.85,12.25,12.95,13.40);}
 if(id==='kevin')p.sit=1;
 // Root remains fixed: weight shifts happen through the spine, without foot sliding.
 p.lean=0+.15*preparation+.025*speech;
 p.tilt=0;
 p.headPitch=0+.028*beat(t,12.4+i*.65,1.0)-.022*speech;
 p.headTilt=0;
 const listening=energy<.04;
 // No audio-threshold pose branch: silent holds remain still.
 const seated=(p.sit??0)>.5;
 // Loose asymmetric hands, preparatory movement followed by a slower settle.
 p.armL={out:seated?.12:.075,fwd:seated?.18:.03,elbow:seated?.88:.17};
 p.armR={out:seated?.14:.10,fwd:seated?.17:.04,elbow:seated?.92:.20};
 if(id==='tarek'){
  p.armR={out:.14+.14*speech,fwd:.14+.35*speech,elbow:.62+.52*speech+.08*settle};
  p.armL={out:.12+.07*settle,fwd:.12+.12*settle,elbow:.70+.18*settle};
  // Hands move toward thighs during the weight transfer instead of flapping.
  const brace=preparation*.75;
  p.armL.fwd!*=1-brace;p.armR.fwd!*=1-brace;
  p.armL.elbow!*=1-brace*.5;p.armR.elbow!*=1-brace*.5;
 }
 if(id==='dilara'){
  // Test hand remains controlled; the free hand carries the sentence emphasis.
  const lower=smooth((t-25.2)/1.2);
  p.armR={out:.10,fwd:.38*(1-lower)+.08,elbow:.82*(1-lower)+.25};
  p.armL={out:.08+.19*speech,fwd:.04+.28*speech,elbow:.20+.72*speech};
 }
 if(id==='kevin'){
  p.armR={out:.13+.11*speech,fwd:.18+.24*speech,elbow:.88+.35*speech};
  p.armL={out:.11,fwd:.16,elbow:.90+.04*settle};
 }
 if(id==='mama'){
  p.armL={out:.08+.12*speech,fwd:.08+.12*speech,elbow:.25+.55*speech};
  p.armR={out:.08,fwd:.02,elbow:.18};
 }
 p.handL={curl:.24-.12*speech};
 p.handR=id==='dilara'?{curl:-.65,index:-.35,thumb:-.68}:{curl:.25-.12*speech};
 if(id==='tarek')p.handR={curl:-.95,index:-.85,thumb:-1.0};
 return p;
}
