import * as THREE from 'three';
import DATA from './e01_data.json';
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
const cache=new WeakMap<THREE.AnimationClip,any[]>();
export function applyRetarget(c:any,id:string,t:number,clip:THREE.AnimationClip|undefined){
 c.group.userData.nativeMotionBones=0;
 if(!clip)return;
 let weight=0,time=0;
 if(id==='mama'){
  if(t<29.6||t>=31.85)return;weight=.88;time=t-29.6;
 }else{
  const line=(DATA as any[]).find(l=>l.who===id&&t>=l.start-.22&&t<l.end+.45);if(!line)return;
  weight=.72*smooth((t-line.start+.22)/.40)*(1-smooth((t-line.end)/.45));if(id==='tarek'){const gate=(a:number,b:number,c:number,d:number)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));weight*=1-Math.max(gate(14.65,14.85,17.5,17.95),gate(20.55,20.9,23.9,24.2),gate(25.7,26.05,27.45,27.8));}time=Math.max(0,t-line.start+.10);
 }
 if(id==='kevin')weight*=smooth((t-11.05)/.65)*(1-smooth((t-14.55)/1.10));
 if(weight<=1e-6)return;
 let tracks=cache.get(clip);if(!tracks){tracks=clip.tracks.filter(tr=>tr.name.endsWith('.quaternion')).map((track:any)=>({bone:track.name.slice(0,-11),interpolant:track.createInterpolant(),start:track.times[0],end:track.times[track.times.length-1]}));cache.set(clip,tracks);}
 for(const tr of tracks){
  const name=tr.bone.split('/').pop();
  const spine=/^spine_0[123]$|^neck_01$/.test(name),upper=/^(clavicle|upperarm|lowerarm|hand)_/.test(name),finger=/^(thumb|index|middle|ring|pinky)_/.test(name);
  if(!spine&&!upper&&!finger)continue;
  if(finger||name==='neck_01')continue; // Authored grips and gaze stay authoritative.
  const protectedSuffix=c.handBones?.R.name.endsWith('_l')?'_l':'_r';if(id!=='kevin'&&name.endsWith(protectedSuffix))continue;
  if(id==='tarek'&&t>=25.7&&t<35.7&&finger)continue;
  const bone=c.bones[name];if(!bone)continue;
  const value=tr.interpolant.evaluate(Math.min(tr.end,tr.start+time));bone.quaternion.slerp(new THREE.Quaternion(value[0],value[1],value[2],value[3]),weight);c.group.userData.nativeMotionBones++;
 }
 c.group.updateMatrixWorld(true);
}
