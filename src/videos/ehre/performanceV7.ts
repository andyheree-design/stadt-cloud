import * as THREE from 'three';
export const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*x*(x*(x*6-15)+10);};
export const hold=(t:number,a:number,b:number,c:number,d:number)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const accent=(t:number,a:number,len=.75)=>{const u=(t-a)/len;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;};
export function enrichPose(id:string,t:number,p:any){
 if(id==='dilara'){
  p.handL={curl:-.13,index:-.06,thumb:-.12};
  const challenge=hold(t,0,.30,3.4,4.2),read=hold(t,7.0,7.4,8.9,9.3);
  p.armR={out:.15+.045*challenge,fwd:.56+.35*challenge+.30*read,elbow:.97-.26*challenge-.25*read};
  p.armL={out:.10+.16*accent(t,1.4),fwd:.07+.28*accent(t,1.4),elbow:.20+.70*accent(t,1.4)};
  const shock=accent(t,17.8,1.5);p.faceX={...p.faceX,browRaise:t<11.558?-.25:.12+.35*shock,browFurrow:t<11.558?.55:0,eyeOpen:shock>.1?.98:.86,lipPress:.05*(1-shock)};
 }
 if(id==='tarek'){
  const phone=hold(t,25.95,26.65,35.7,36.0);p.handL={curl:-.14-.58*phone,index:-.08-.44*phone,thumb:-.12-.48*phone+.16*accent(t,27.08,.24)};
  p.headPitch=(p.headPitch??0)+.24*hold(t,26.0,26.35,26.8,27.45);
  p.armL={...p.armL,out:.18,fwd:.20+.35*phone,elbow:.78+.45*phone};
  const guilty=hold(t,4.3,4.7,6.5,7.0);p.faceX={...p.faceX,browRaise:t<3.1?.48:t>=15.9&&t<17.8?-.28:.12+.19*guilty,browFurrow:t>=15.9&&t<17.8?.65:0,eyeOpen:t<3.1?.99:.86,lipPress:.05+.06*accent(t,1.7,1.1)};
 }
 if(id==='kevin'){
  const explain=hold(t,11.8,12.15,13.0,13.6);p.handL={curl:-.18,index:-.13,thumb:-.15};p.handR={curl:-.17-.30*explain,index:-.06*(1-explain),thumb:-.14-.12*explain};
  const recoil=hold(t,15.85,16.15,17.2,18.0);p.headTilt=.07*recoil;p.faceX={...p.faceX,browRaise:.08+.30*recoil,eyeOpen:.85+.12*recoil,lipPress:.12*recoil};
 }
 if(id==='mama'){
  p.handL={curl:t<25.15?-.52:-.12,index:t<25.15?-.40:-.06,thumb:t<25.15?-.45:-.10};p.face={neutral:.35,smile:.65};p.faceX={...p.faceX,browRaise:.17+.16*accent(t,30.35,.9),mouthCurve:.38,smileLimit:.40,eyeOpen:.77,cheek:.22};
  p.headYaw=-.05;p.headPitch=.025;p.armL={out:.10,fwd:.04,elbow:.22};
 }
 const blinks:Record<string,number[]>={tarek:[1.48,5.0,10.5,15.95,20.8,26.12,28.9,32.9,35.5],dilara:[2.2,6.9,10.1,16.0,19.7,25.8,29.2,32.0,35.5],kevin:[3.1,7.1,10.8,14.75,16.3,22.6,27.4,31.4,35.5],mama:[23.84,24.93,29.86,31.35]};
 const blink=Math.max(0,...blinks[id].map(a=>accent(t,a,.14)));
 p.faceX={...p.faceX,blink};return p;
}
export function applyLiving(c:any,id:string,t:number){
 const k={tarek:0,dilara:1.7,kevin:3.2,mama:4.1}[id]??0;
 const breath=.005*(.5+.5*Math.sin(t*1.45+k));
 let lean=0,turn=0,side=0,nod=0,tilt=0,eyeX=0,eyeY=.015;
 if(id==='tarek'){
  lean=.055*hold(t,4.35,4.8,6.6,7.1)+.065*accent(t,9.5,1.6)+.045*accent(t,14.9,1.1)+.07*accent(t,21.1,1.8);
  lean+=.24*hold(t,26.0,26.6,26.85,27.55);
  turn=.55*Math.max(hold(t,11.558,11.908,17.809,18.159),hold(t,33.2,33.55,35.7,36.05));side=-.025*accent(t,1.7,1.4)+.46*hold(t,26.0,26.6,26.85,27.55);
  nod=-.038*accent(t,5.2,.85)-.055*accent(t,20.1,1.0);tilt=.035*hold(t,4.5,4.9,6.6,7.2);
  eyeX=.085*hold(t,.25,.40,1.2,1.5)-.07*hold(t,11.3,11.4,15.7,16.0);eyeY+=.12*hold(t,26.0,26.2,27.0,27.7);
 }
 if(id==='dilara'){
  lean=.065*hold(t,.0,.3,3.0,4.3)+.045*accent(t,7.2,1.6);side=.025*hold(t,6.0,6.7,9.3,10.1)-.02*hold(t,17.8,18.2,20.2,21.0);
  nod=-.055*accent(t,1.35,.8)-.045*accent(t,8.0,.8);tilt=-.055*hold(t,17.7,18.0,19.5,20.0);
  eyeX=-.06*hold(t,4.2,4.35,6.9,7.1)+.10*hold(t,18.0,18.15,19.2,19.7);eyeY=.09*hold(t,27.0,27.25,29.0,29.6);
 }
 if(id==='kevin'){
  turn=-.45;lean=.07*hold(t,11.25,11.7,14.7,15.7)-.07*hold(t,15.8,16.15,17.2,18.0);
  nod=-.035*accent(t,12.4,.85);tilt=.05*hold(t,14.7,14.9,15.5,16.1);
  eyeX=.08*hold(t,11.1,11.3,13.0,13.4);eyeY=.12*hold(t,15.8,16.1,18.0,18.8);
 }
 if(id==='mama'){
  lean=.02*accent(t,30.2,1.2);turn=.035*hold(t,29.6,29.9,30.9,31.8);tilt=.045*hold(t,29.7,30.0,31.4,31.85);nod=-.045*accent(t,30.35,.8);
  eyeX=.035*accent(t,24.1,.8);eyeY=.025;
 }
 c.addActing({lean,turn,side,headNod:nod,headTilt:tilt,breath});c.lookEyes(eyeX,eyeY);
 if(id==='kevin'||id==='tarek'){
  const rest=id==='kevin'?1-hold(t,11.05,11.70,14.55,15.65):hold(t,11.50,11.85,13.60,14.10);
  if(rest>0){const front=new THREE.Vector3(0,0,-1).applyQuaternion(c.group.quaternion);
   const knees=[c.bones.calf_l,c.bones.calf_r].sort((a:any,b:any)=>c.group.worldToLocal(a.getWorldPosition(new THREE.Vector3())).x-c.group.worldToLocal(b.getWorldPosition(new THREE.Vector3())).x);
   for(const [handSide,knee] of [['L',knees[0]],['R',knees[1]]] as const){
    if(id==='tarek'&&handSide==='R')continue;
    const suffix=c.handBones[handSide].name.slice(-1),chain=['upperarm','lowerarm','hand'].map(n=>c.bones[n+'_'+suffix]);
    const before=chain.map((b:any)=>b.quaternion.clone()),target=knee.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.055,0)).addScaledVector(front,-.015);
    for(let i=0;i<6;i++){c.orientPalm(handSide,new THREE.Vector3(0,-1,0),front,1);c.reachHand(handSide,target,1);}
    const wanted=chain.map((b:any)=>b.quaternion.clone());chain.forEach((b:any,i:number)=>b.quaternion.copy(before[i]).slerp(wanted[i],rest));c.group.updateMatrixWorld(true);
   }
  }
 }

}

const standard=(color:string,roughness=.55,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export function makePhone(contact='Mama'){
 const g=new THREE.Group();g.name='Smartphone — screen, chassis, camera lenses';
 const body=new THREE.Mesh(new THREE.BoxGeometry(.073,.151,.010),standard('#20242b',.28,.65));g.add(body);
 const c=document.createElement('canvas');c.width=512;c.height=1024;const x=c.getContext('2d')!;
 const gradient=x.createLinearGradient(0,0,512,1024);gradient.addColorStop(0,'#293a56');gradient.addColorStop(1,'#10151f');x.fillStyle=gradient;x.fillRect(0,0,512,1024);
 x.textAlign='center';x.fillStyle='#eee';x.font='30px Arial';x.fillText('Eingehender Anruf',256,165);x.font='bold 65px Arial';x.fillText(contact,256,270);
 x.fillStyle='#677a99';x.beginPath();x.arc(256,430,100,0,Math.PI*2);x.fill();x.fillStyle='#ddc6b1';x.beginPath();x.arc(256,420,42,0,Math.PI*2);x.fill();x.fillStyle='#eee';x.font='28px Arial';x.fillText('Mobil',256,590);
 for(const [cx,color,label] of [[135,'#c64d59','Ablehnen'],[377,'#50b77b','Annehmen']] as const){x.fillStyle=color;x.beginPath();x.arc(cx,795,53,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.font='22px Arial';x.fillText(label,cx,895);}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.066,.140),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));screen.position.z=-.0052;screen.rotation.y=Math.PI;g.add(screen);
 const connected=document.createElement('canvas');connected.width=512;connected.height=1024;const cc=connected.getContext('2d')!;cc.drawImage(c,0,0);cc.fillStyle='#293a56';cc.fillRect(30,105,452,100);cc.fillStyle='#eee';cc.font='30px Arial';cc.textAlign='center';cc.fillText('Mobil · Verbunden',256,165);cc.fillStyle='#10151f';cc.fillRect(40,710,440,250);cc.fillStyle='#bc4858';cc.beginPath();cc.arc(256,800,54,0,Math.PI*2);cc.fill();cc.fillStyle='#fff';cc.font='25px Arial';cc.fillText('Lautsprecher',256,920);const callMap=new THREE.CanvasTexture(connected);callMap.colorSpace=THREE.SRGBColorSpace;
 const locked=document.createElement('canvas');locked.width=512;locked.height=1024;const lc=locked.getContext('2d')!;lc.fillStyle='#192333';lc.fillRect(0,0,512,1024);lc.fillStyle='#d9e0ec';lc.textAlign='center';lc.font='95px Arial';lc.fillText('22:14',256,310);lc.font='26px Arial';lc.fillText('Dienstag',256,365);const lockMap=new THREE.CanvasTexture(locked);lockMap.colorSpace=THREE.SRGBColorSpace;
 g.userData.phoneScreen=screen;g.userData.incomingMap=tex;g.userData.callMap=callMap;g.userData.lockMap=lockMap;
 const island=new THREE.Mesh(new THREE.BoxGeometry(.032,.034,.003),standard('#17191c',.28,.7));island.position.set(-.017,.048,.006);g.add(island);
 for(const [a,b] of [[-.024,.054],[-.009,.054],[-.024,.040]]){const lens=new THREE.Mesh(new THREE.CylinderGeometry(.0058,.0058,.003,20),standard('#0d1b2a',.09,.65));lens.rotation.x=Math.PI/2;lens.position.set(a,b,.008);g.add(lens);}
 const speaker=new THREE.Mesh(new THREE.BoxGeometry(.015,.0015,.001),standard('#07090b'));speaker.position.set(0,.065,-.006);g.add(speaker);
 return g;
}
export function mouthpiece(){
 const g=new THREE.Group();g.name='Complete shisha mouthpiece with sanitary tip and hose connector';
 const metal=standard('#bbc4cb',.22,.85),grip=standard('#272331',.65,.08),tip=standard('#e7e0d2',.36,.02);
 const add=(top:number,bottom:number,height:number,y:number,m:THREE.Material)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,24),m);o.position.y=y;g.add(o);return o;};
 add(.007,.010,.15,-.012,grip);add(.009,.011,.021,-.095,metal);add(.0062,.007,.025,.068,metal);add(.0035,.0062,.040,.086,tip);
 for(const y of [-.080,-.046,-.012,.022,.052]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.008,.0012,6,28),metal);ring.rotation.x=Math.PI/2;ring.position.y=y;g.add(ring);}
 const opening=new THREE.Mesh(new THREE.CircleGeometry(.0028,20),standard('#292627',.8));opening.rotation.x=-Math.PI/2;opening.position.y=.1062;g.add(opening);return g;
}
export function shoppingBag(){
 const g=new THREE.Group();g.name='Drugstore paper shopping bag';
 const paper=standard('#ece5d7',.94),edge=standard('#c8baa4',.98);
 const body=new THREE.Mesh(new THREE.BoxGeometry(.24,.28,.105),paper);body.position.y=-.19;g.add(body);
 for(const z of [-.042,.042]){const h=new THREE.Mesh(new THREE.TorusGeometry(.045,.004,7,30,Math.PI),edge);h.position.set(0,-.05,z);g.add(h);}
 const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d')!;x.fillStyle='#ece5d7';x.fillRect(0,0,512,512);x.fillStyle='#203b78';x.textAlign='center';x.font='bold italic 190px Arial';x.fillText('dm',256,290);x.fillStyle='#ebbc3c';x.fillRect(110,330,292,22);x.fillStyle='#d04c4e';x.fillRect(145,352,235,18);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const logo=new THREE.Mesh(new THREE.PlaneGeometry(.19,.19),new THREE.MeshStandardMaterial({map:t,roughness:.96}));logo.position.set(0,-.19,-.053);logo.rotation.y=Math.PI;g.add(logo);
 const receipt=new THREE.Mesh(new THREE.BoxGeometry(.045,.085,.0008),standard('#faf9ee',.99));receipt.position.set(.065,-.075,-.033);receipt.rotation.z=.13;g.add(receipt);return g;
}
export const PHONE_REST=new THREE.Vector3(-.70,.435,1.52);
export function animateTarekPhone(c:any,phone:THREE.Group,t:number){
 const active=t<35.7;phone.visible=active;
 if(!active)return;
 const screen=phone.userData.phoneScreen;screen.material.map=t<26.0?phone.userData.lockMap:t<27.35?phone.userData.incomingMap:phone.userData.callMap;
 if(t<26.05){phone.position.copy(PHONE_REST);phone.rotation.set(Math.PI/2,0,0);return;}
 const reach=smooth((t-26.05)/.65),lift=smooth((t-26.70)/.70),holdLevel=1-smooth((t-33.2)/.9);
 const skull=c.skull.getWorldPosition(new THREE.Vector3()),front=new THREE.Vector3(0,0,-1).applyQuaternion(c.group.quaternion),left=new THREE.Vector3(-1,0,0).applyQuaternion(c.group.quaternion);
 const held=skull.clone().addScaledVector(front,.26).addScaledVector(left,.11).add(new THREE.Vector3(0,-.26-.18*(1-holdLevel),0));
 const normalHold=front.clone().negate(),axisHold=new THREE.Vector3(.90,.44,0).applyQuaternion(c.group.quaternion).normalize();
 const normal=new THREE.Vector3(0,-1,0).lerp(normalHold,lift).normalize(),axis=front.clone().lerp(axisHold,lift).normalize();
 const offset=new THREE.Vector3(-.045,.018,.015).lerp(normalHold.clone().multiplyScalar(-.018).addScaledVector(axisHold,-.025),lift);
 const center=PHONE_REST.clone().lerp(held,lift).add(new THREE.Vector3(0,.045*Math.sin(Math.PI*lift),0)),target=center.clone().add(offset);
 for(let pass=0;pass<(reach>.98?4:1);pass++){c.orientPalm('L',normal,axis,reach);c.reachHand('L',target,reach);}
 const wrist=c.grip.L.getWorldPosition(new THREE.Vector3());phone.position.copy(t<26.7?PHONE_REST:wrist.clone().sub(offset));
 c.group.userData.phoneGripOffset=offset.toArray();
 const q0=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0)),q1=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.08,c.group.rotation.y+Math.PI,.06));
 phone.quaternion.copy(q0).slerp(q1,lift);
 c.group.userData.phoneContactError=t>=26.7?phone.position.clone().add(offset).distanceTo(wrist):undefined;
}

export function protectBag(c:any,t:number){
 const w=hold(t,1.7,2.15,2.8,3.3)+hold(t,19.7,20.1,20.65,21.0);if(w<.001||!c.acc.bag)return;
 const mesh=c.acc.bag as THREE.SkinnedMesh;let index=mesh.userData.frontContact;
 if(index===undefined){mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox!,target=box.getCenter(new THREE.Vector3());target.z=box.max.z;const position=mesh.geometry.attributes.position;let best=Infinity;index=0;for(let i=0;i<position.count;i++){const d=new THREE.Vector3().fromBufferAttribute(position,i).distanceToSquared(target);if(d<best){best=d;index=i;}}mesh.userData.frontContact=index;}
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(c.group.quaternion);const contact=mesh.localToWorld(mesh.getVertexPosition(index,new THREE.Vector3())).addScaledVector(forward,.018);
 c.orientPalm('L',forward.clone().negate(),new THREE.Vector3(0,1,0),Math.min(1,w));c.reachHand('L',contact,Math.min(1,w));
}
