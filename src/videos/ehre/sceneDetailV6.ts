import * as THREE from 'three';

export function hoseCurve(start:THREE.Vector3,port:THREE.Vector3,b:any){
 const guide=new THREE.CatmullRomCurve3([start,start.clone().add(new THREE.Vector3(-.06,-.13,-.04)),new THREE.Vector3(-.86,.34,1.20),new THREE.Vector3(-.84,.39,.47),new THREE.Vector3(-.72,.67,.33),port]);
 const points=guide.getPoints(128),radius=b.radius+.027;
 for(const p of points){const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz);if(p.y<b.top+.028&&d<radius){p.x=b.x+dx/Math.max(d,.001)*radius;p.z=b.z+dz/Math.max(d,.001)*radius;}p.y=Math.max(.045,p.y);}
 // Piecewise linear interpolation avoids a spline re-entering the collision volume.
 class SafeCurve extends THREE.Curve<THREE.Vector3>{constructor(){super();}getPoint(t:number,target=new THREE.Vector3()){const u=Math.min(127.99999,t*128),i=Math.floor(u);return target.copy(points[i]).lerp(points[i+1],u-i);}}
 return new SafeCurve();
}

export function smokeSprites(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;
 const g=x.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(220,224,234,.75)');g.addColorStop(.35,'rgba(192,198,216,.4)');g.addColorStop(.7,'rgba(169,174,192,.11)');g.addColorStop(1,'rgba(169,174,192,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const group=new THREE.Group();
 for(let i=0;i<12;i++)group.add(new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false,rotation:i*2.4})));
 return group;
}

const tableSdf=(p:THREE.Vector3,b:any)=>{const radial=Math.hypot(p.x-b.x,p.z-b.z)-b.radius,vertical=Math.abs(p.y-(b.top+b.bottom)/2)-(b.top-b.bottom)/2;return Math.hypot(Math.max(radial,0),Math.max(vertical,0))+Math.min(Math.max(radial,vertical),0);};
export function sceneAudit(set:any,smoking:any,t:number){
 const b=set.bar.tableBounds,contacts:any[]=[];let worst=0;
 for(const id of ['tarek','kevin','dilara']){
  const c=set.cast[id];if(!c.group.visible||!c.bones)continue;
  for(const side of ['l','r'])for(const [a,z,r] of [['upperarm','lowerarm',.046],['lowerarm','hand',.036],['thigh','calf',.075],['calf','foot',.048]] as [string,string,number][]){
   const bone=c.bones[a+'_'+side],end=c.bones[z+'_'+side];if(!bone||!end)continue;
   const p=bone.getWorldPosition(new THREE.Vector3()),q=end.getWorldPosition(new THREE.Vector3());let clearance=10;
   for(let k=0;k<=24;k++)clearance=Math.min(clearance,tableSdf(p.clone().lerp(q,k/24),b)-r);
   worst=Math.min(worst,clearance);if(clearance<-.008)contacts.push({actor:id,limb:a+'_'+side,depth:+(-clearance).toFixed(4)});
  }
 }
 const motion:any={};
 for(const [id,c] of Object.entries(set.cast) as any){if(!c.group.visible||!c.bones)continue;const point=(b:any)=>b.getWorldPosition(new THREE.Vector3()).toArray().map((v:number)=>+v.toFixed(5));motion[id]={feet:['l','r'].map(side=>point(c.bones['foot_'+side])),root:point(c.group),footIK:c.group.userData.footContactError,grip:c.group.userData.testGripErrors};}
 return {frame:Math.round(t*30),tablePenetration:+(-worst).toFixed(4),contacts,motion};
}

// Solve the two contact fingers around the cap, after the body motion is applied.
// The display stays clear; the object remains attached to the wrist throughout.
export function fitTestGrip(c:any,test:THREE.Object3D){
 const suffix=c.grip.R.parent.name.endsWith('_l')?'l':'r';
 const errors:number[]=[];
 for(const [name,z] of [['index',.019],['thumb',-.019]] as const){
  const chain=[1,2,3].map(i=>c.bones[`${name}_0${i}_${suffix}`]) as THREE.Bone[];
  if(chain.some(b=>!b))continue;
  const end=new THREE.Vector3(0,name==='index'?.016:.023,0);
  const target=test.localToWorld(new THREE.Vector3(.075,0,z));
  const initial=chain.map(b=>b.quaternion.clone());
  for(let n=0;n<10;n++)for(let i=2;i>=0;i--){
   c.group.updateMatrixWorld(true);
   const joint=chain[i],pivot=joint.getWorldPosition(new THREE.Vector3());
   const tip=chain[2].localToWorld(end.clone());
   const a=tip.sub(pivot).normalize(),b=target.clone().sub(pivot).normalize();
   const delta=new THREE.Quaternion().setFromUnitVectors(a,b),angle=delta.angleTo(new THREE.Quaternion());
   if(angle>.32)delta.slerp(new THREE.Quaternion(),1-.32/angle);
   const parent=joint.parent!.getWorldQuaternion(new THREE.Quaternion());
   joint.quaternion.copy(parent.clone().invert().multiply(delta).multiply(parent).multiply(joint.quaternion));
   const limit=i===0?(name==='thumb'?1.2:.95):1.65;
   const moved=initial[i].angleTo(joint.quaternion);
   if(moved>limit)joint.quaternion.slerp(initial[i],1-limit/moved);
  }
  c.group.updateMatrixWorld(true);errors.push(chain[2].localToWorld(end.clone()).distanceTo(target));
 }
 c.group.userData.testGripErrors=errors;
}
