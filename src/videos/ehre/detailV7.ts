import * as THREE from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {buildHome as baseHome} from './seriesHomeV5';
import {hoseCurve as baseHose} from './sceneDetailV6';
export function buildHomeV7(){
 const g=baseHome();
 for(const o of [...g.children]){
  if((o as any).isGroup&&Math.abs(o.position.x+2.08)<.01)o.visible=false;
  if(o.position.x>-1.4&&o.position.x< -1.1&&o.position.y>.77&&o.position.y<1.3&&o.position.z>1.8)o.removeFromParent();
 }
 const m=(color:string,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 box(7,.08,7,0,3.2,0,m('#e1d8ca',.96));
 for(const x of [.81,1.89])box(.055,2.25,.16,x,1.125,2.31,m('#ac9b87',.7));box(1.14,.055,.16,1.35,2.25,2.31,m('#ac9b87',.7));
 for(const y of [.62,1.62]){for(const x of [1.02,1.68])box(.018,.65,.018,x,y,2.251,m('#85705b'));for(const z of [y-.325,y+.325])box(.68,.018,.018,1.35,z,2.251,m('#85705b'));}
 const mirror=new Reflector(new THREE.PlaneGeometry(.63,.80),{textureWidth:512,textureHeight:768,color:0xa9aaa5,clipBias:.003});mirror.rotation.y=Math.PI;mirror.position.set(-.85,1.55,2.243);g.add(mirror);
 const plant=new THREE.Group();g.add(plant);g.userData.plant=plant;
 return g;
}
export function attachHomePlant(home:THREE.Group,model:any){
 const plant=model.scene.clone(true);plant.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(plant,true),center=bounds.getCenter(new THREE.Vector3()),height=bounds.max.y-bounds.min.y;
 const holder=new THREE.Group();plant.position.set(-center.x,-bounds.min.y,-center.z);holder.add(plant);holder.scale.setScalar(.43/height);holder.position.set(-1.25,.78,1.95);home.userData.plant.add(holder);
}
type Capsule={a:THREE.Vector3;b:THREE.Vector3;r:number;held?:boolean};
function bodies(set:any){const capsules:Capsule[]=[];for(const id of ['tarek','kevin','dilara']){const c=set.cast[id];if(!c.group.visible||!c.bones)continue;const p=(name:string)=>c.bones[name]?.getWorldPosition(new THREE.Vector3());const held=c.grip.R.parent.name.endsWith('_l')?'l':'r';for(const side of ['l','r'])for(const [a,b,r] of [['thigh','calf',.078],['calf','foot',.052],['upperarm','lowerarm',.05],['lowerarm','hand',.039]] as [string,string,number][]){const start=p(a+'_'+side),end=p(b+'_'+side);if(start&&end)capsules.push({a:start,b:end,r,held:id==='tarek'&&a==='lowerarm'&&side===held});}const hip=p('pelvis'),chest=p('neck_01');if(hip&&chest)capsules.push({a:hip,b:chest,r:.17});}return capsules;}
const nearest=(p:THREE.Vector3,c:Capsule)=>{const axis=c.b.clone().sub(c.a),u=Math.max(0,Math.min(1,p.clone().sub(c.a).dot(axis)/Math.max(.0001,axis.lengthSq())));return c.a.clone().addScaledVector(axis,u);};
export function hoseCurveV7(start:THREE.Vector3,port:THREE.Vector3,b:any,set:any){
 const points=baseHose(start,port,b).getPoints(128),capsules=bodies(set),tube=.009;
 for(let pass=0;pass<4;pass++)for(let i=1;i<128;i++){
  const p=points[i];for(const c of capsules){if(c.held&&i<9)continue;const q=nearest(p,c),delta=p.clone().sub(q),d=delta.length(),radius=c.r+tube+.008;if(d<radius){if(d<.0001)delta.set(0,0,-1);else delta.divideScalar(d);p.copy(q).addScaledVector(delta,radius);}}
  const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz),r=b.radius+tube+.012;if(p.y<b.top+tube+.012&&d<r){p.x=b.x+dx/Math.max(.001,d)*r;p.z=b.z+dz/Math.max(.001,d)*r;}p.y=Math.max(.025,p.y);
 }
 let clearance=10;for(let i=2;i<127;i++)for(const c of capsules){if(c.held&&i<9)continue;clearance=Math.min(clearance,points[i].distanceTo(nearest(points[i],c))-c.r-tube);}
 set.root.userData.hoseClearance=clearance;
 class Curve extends THREE.Curve<THREE.Vector3>{constructor(){super();}getPoint(t:number,target=new THREE.Vector3()){const value=Math.min(127.9999,t*128),i=Math.floor(value);return target.copy(points[i]).lerp(points[i+1],value-i);}}
 return new Curve();
}
