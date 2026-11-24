import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {buildSeriesLounge as baseLounge} from './seriesLounge';
import {staticFile} from 'remotion';

const ROOT='ehre/v6/vendor/';
export const environmentAssets=['bar_chair_round_01','wine_bottles_01','potted_plant_02'];
const loader=new THREE.TextureLoader();
function texture(asset:string,map:string,srgb=false,repeat:[number,number]=[1,1]){
 const t=loader.load(staticFile(ROOT+asset+'/'+map+'.jpg'));t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;return t;
}
export function buildLoungeV7(old:any){
 const bar:any=baseLounge(old),g=bar.group;g.name='PALAST / violet lounge v6';
 const mat=(color:string,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,r=.008)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const brick=new THREE.MeshStandardMaterial({map:texture('brick_wall_001','Diffuse',true,[3,1.5]),normalMap:texture('brick_wall_001','nor_gl',false,[3,1.5]),roughnessMap:texture('brick_wall_001','Rough',false,[3,1.5]),normalScale:new THREE.Vector2(.8,.8),color:'#777383',roughness:.85});
 const leather=new THREE.MeshStandardMaterial({map:texture('leather_red_02','coll1',true,[2,1]),normalMap:texture('leather_red_02','nor_gl',false,[2,1]),roughnessMap:texture('leather_red_02','Rough',false,[2,1]),color:'#6d3657',roughness:.48,normalScale:new THREE.Vector2(.55,.55)});
 const toRemove:THREE.Object3D[]=[];
 g.traverse((o:any)=>{
  if(!o.isMesh)return;
  if(o.material?.roughness===.93&&o.material.map)o.material=leather;
  if(o.material?.color?.getHexString()==='303b38')o.material=brick;
  if(o.position.x>=1.9&&o.position.x<=3.1&&Math.abs(o.position.z-2.4)<.015&&o.geometry.type==='CylinderGeometry')toRemove.push(o);
  if(o.position.x< -2.3&&o.position.x> -2.9&&o.position.z>1.75&&o.position.z<2.3)toRemove.push(o);
  if(o.geometry.type==='CylinderGeometry'&&o.position.y===2.46)o.material=mat('#4b3a32',.35,.55);
  if(o.position.x===2.55&&o.position.y===.425){o.scale.y=1.20;o.position.y=.51;}
  if(o.position.x===2.53&&o.position.y===.88)o.position.y=1.05;
 });toRemove.forEach(o=>o.removeFromParent());
 // Re-stage the table away from knees. All original hero items move with it.
 old.table.position.z=.38;
 for(const o of [...old.table.children] as any[]){
  if(o.isGroup){o.visible=false;continue;} // replace the old overlapping sphere/stem assembly
  if(o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.width<.10){o.position.set(.14,.480,.34);}
  if(o.isMesh&&o.geometry.type==='CylinderGeometry'&&o.geometry.parameters.radiusTop===.07)o.position.set(.35,.490,.22);
 }
 // Existing two glasses/coasters are in room space, not in the table group.
 const positions=[{old:[-.50,.75],next:[.30,.25]},{old:[.43,.80],next:[-.10,.03]}];
 for(const p of positions)for(const o of g.children){if(Math.abs(o.position.x-p.old[0])<.001&&Math.abs(o.position.z-p.old[1])<.001)o.position.set(p.next[0],o.position.y,p.next[1]);}
 const brass=mat('#b9a17c',.22,.85),dark=mat('#272323',.55,.15);
 const hook=new THREE.Group();hook.name='Hero shisha / flat-bottom glass and fitted hardware';hook.position.set(-.42,.477,.50);g.add(hook);
 const add=(geo:THREE.BufferGeometry,m:THREE.Material,y:number)=>{const o=new THREE.Mesh(geo,m);o.position.y=y;o.castShadow=o.receiveShadow=true;hook.add(o);return o;};
 const profile=[[.075,0],[.105,.006],[.121,.045],[.130,.11],[.118,.16],[.07,.21],[.035,.25],[.035,.27]].map(([x,y])=>new THREE.Vector2(x,y));
 const glass=new THREE.MeshPhysicalMaterial({color:'#8ca99c',transparent:true,opacity:1,transmission:.78,thickness:.007,ior:1.47,roughness:.08,metalness:0,side:THREE.DoubleSide,depthWrite:false});add(new THREE.LatheGeometry(profile,40),glass,0);
 add(new THREE.CylinderGeometry(.074,.074,.003,32),glass,.0015);
 add(new THREE.CylinderGeometry(.10,.105,.075,32),new THREE.MeshPhysicalMaterial({color:'#b0c2ba',transparent:false,opacity:1,transmission:.82,thickness:.07,ior:1.333,roughness:.09}),.047);
 add(new THREE.CylinderGeometry(.039,.039,.018,32),dark,.27);
 add(new THREE.CylinderGeometry(.016,.023,.35,24),brass,.455);
 for(const y of [.30,.35,.56,.61]){const ring=add(new THREE.TorusGeometry(.026,.005,8,28),brass,y);ring.rotation.x=Math.PI/2;}
 add(new THREE.CylinderGeometry(.105,.095,.016,40),brass,.622);
 add(new THREE.CylinderGeometry(.046,.028,.065,32),mat('#733f32',.85),.665);
 const foilShape=new THREE.Shape();foilShape.absarc(0,0,.047,0,Math.PI*2,false);for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)if(x*x+y*y<12){const hole=new THREE.Path();hole.absarc(x*.011,y*.011,.0015,0,Math.PI*2,true);foilShape.holes.push(hole);}const foil=new THREE.Mesh(new THREE.ExtrudeGeometry(foilShape,{depth:.0015,bevelEnabled:false,curveSegments:16}),mat('#b9bab8',.32,.95));foil.rotation.x=-Math.PI/2;foil.position.y=.6975;hook.add(foil);
 for(let i=0;i<3;i++){const coal=new THREE.Mesh(new RoundedBoxGeometry(.024,.021,.024,2,.002),new THREE.MeshStandardMaterial({color:'#292321',emissive:'#d4481d',emissiveIntensity:.6,roughness:.95}));coal.position.set((i-1)*.022,.7095,(i%2)*.016);hook.add(coal);}
 const cuff=add(new THREE.CylinderGeometry(.018,.018,.065,20),brass,.325);cuff.rotation.z=Math.PI/2;cuff.position.x=.038;
 const hosePort=new THREE.Object3D();hosePort.position.set(.071,.325,0);hook.add(hosePort);
 box('Acoustic ceiling',8,.12,9,0,3.20,-.5,mat('#27212d',.96),.01);
 for(let i=0;i<7;i++)box('Ceiling acoustic baffle',.045,.08,5,-3+i,3.10,-.1,mat('#463342',.9),.008);
 // Physical LED channels: saturated violet backs the room, warm keys keep faces readable.
 RectAreaLightUniformsLib.init();
 const led=new THREE.MeshBasicMaterial({color:new THREE.Color('#a340ff').multiplyScalar(4),toneMapped:false});
 const pink=new THREE.MeshBasicMaterial({color:new THREE.Color('#e866e3').multiplyScalar(3),toneMapped:false});
 box('Ceiling LED channel',6.6,.045,.045,0,2.89,2.48,dark);box('Ceiling violet diffuser',6.55,.018,.018,0,2.862,2.445,led,.004);
 box('Sofa underglow',3.22,.018,.025,0,.12,1.30,led,.003);
 for(const x of [-1.88,1.88]){box('Vertical violet channel',.042,2.4,.042,x,1.55,2.46,dark);box('Vertical violet diffuser',.012,2.35,.012,x,1.55,2.431,led,.003);}
 for(const y of [1.22,1.74,2.27])box('Bar shelf magenta trim',1.26,.012,.018,2.46,y-.035,2.285,pink,.003);
 const wallGlow=new THREE.RectAreaLight('#9e43ff',9,4.8,.06);wallGlow.position.set(0,2.79,2.30);wallGlow.lookAt(0,2.6,2.65);g.add(wallGlow);
 const floorGlow=new THREE.RectAreaLight('#8d36ff',4,2.7,.04);floorGlow.position.set(0,.14,1.29);floorGlow.lookAt(0,.03,.4);g.add(floorGlow);
 const barGlow=new THREE.PointLight('#b05af3',3,3.5,2);barGlow.position.set(2.4,1.9,2.1);g.add(barGlow);
 // Visible speakers, framed menu, small practical service props.
 for(const x of [-1.75,1.75]){
  box('Wall speaker',.23,.35,.16,x,2.30,2.42,dark,.018);
  for(const [y,r] of [[2.24,.072],[2.39,.025]]){const cone=new THREE.Mesh(new THREE.CircleGeometry(r,32),mat('#0c0d10',.75));cone.position.set(x,y,2.333);cone.rotation.y=Math.PI;g.add(cone);const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.004,6,32),brass);rim.position.copy(cone.position);g.add(rim);}
 }
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#1b1721';ctx.fillRect(0,0,512,768);ctx.fillStyle='#c19fe6';ctx.textAlign='center';ctx.font='32px Arial';ctx.fillText('PALAST',256,90);ctx.font='19px Arial';['SHISHA  ·  LOUNGE','CLASSIC BLENDS','MINT  ·  DOUBLE APPLE','CITRUS  ·  BERRY','TEA  ·  COFFEE','OPEN LATE'].forEach((t,i)=>ctx.fillText(t,256,195+i*76));
 const menuTex=new THREE.CanvasTexture(canvas);menuTex.colorSpace=THREE.SRGBColorSpace;box('Menu frame',.52,.77,.04,1.23,1.97,2.50,brass,.008);const menu=new THREE.Mesh(new THREE.PlaneGeometry(.49,.74),new THREE.MeshStandardMaterial({map:menuTex,roughness:.7}));menu.rotation.y=Math.PI;menu.position.set(1.23,1.97,2.475);g.add(menu);
 box('Napkin holder',.13,.07,.09,2.83,1.12,1.80,brass,.012);box('Paper napkins',.108,.025,.075,2.83,1.165,1.80,mat('#d5cdbd',.95),.004);
 const slots:any={};for(const name of environmentAssets){const group=new THREE.Group();group.name='Asset slot '+name;g.add(group);slots[name]=group;}
 const bubbles:THREE.Mesh[]=[];for(let i=0;i<7;i++){const bubble=new THREE.Mesh(new THREE.SphereGeometry(.004,8,6),new THREE.MeshPhysicalMaterial({color:'#dbe8df',roughness:.08,transparent:true,opacity:.45,depthWrite:false}));hook.add(bubble);bubbles.push(bubble);}
 return {...bar,hosePort,slots,tableBounds:{x:0,z:.38,radius:.62,top:.476,bottom:.425},update:(t:number)=>{const draw=t>12.18&&t<12.95;bubbles.forEach((b,i)=>{b.visible=draw;b.position.set(Math.sin(i*2.4)*.055,.018+((t*3+i*.17)%1)*.062,Math.cos(i*2.4)*.045);});}};
}
export function attachLoungeAssets(bar:any,models:any[]){
 const place=(asset:number,x:number,y:number,z:number,height:number,rot=0)=>{
  const model=models[asset].scene.clone(true);model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model,true),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
  const scale=height/size.y;const holder=new THREE.Group();model.position.set(-center.x,-b.min.y,-center.z);holder.add(model);holder.scale.setScalar(scale);holder.rotation.y=rot;holder.position.set(x,y,z);holder.traverse((o:any)=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;if(o.material?.transparent)o.material.depthWrite=false;}});bar.slots[environmentAssets[asset]].add(holder);
 };
 for(const group of Object.values(bar.slots) as THREE.Group[])group.clear();
 place(0,2.04,0,1.10,.83,-.15);place(0,3.02,0,1.10,.83,.15);
 place(1,2.45,1.083,1.94,.30,Math.PI);place(1,2.46,1.253,2.39,.31,Math.PI);place(1,2.46,1.773,2.39,.31,Math.PI);
 place(2,-2.55,0,2.03,1.38,.2);place(2,1.90,0,2.22,1.28,-.4);
}
