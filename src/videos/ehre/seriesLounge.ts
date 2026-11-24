import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Repeatable, generated surface detail; no remote assets or random frame changes.
function surface(kind:'wood'|'fabric'|'stone',base:string){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d')!;
 x.fillStyle=base;x.fillRect(0,0,512,512);let seed=7123;
 const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let n=0;n<6500;n++){
  const a=rand(),b=rand();x.fillStyle=rand()>.5?'rgba(255,241,211,.045)':'rgba(0,0,0,.055)';
  if(kind==='wood')x.fillRect(a*512,b*512,80+rand()*230,.5+rand()*1.8);
  else if(kind==='fabric')x.fillRect(a*512,b*512,1,4);
  else x.fillRect(a*512,b*512,1+rand()*4,1+rand()*2);
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}

export function buildSeriesLounge(old:any){
 const g=new THREE.Group();g.name='Palast lounge — production set v3';
 const material=(color:string,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const oak=new THREE.MeshStandardMaterial({map:surface('wood','#554034'),roughness:.47});
 const upholstery=new THREE.MeshStandardMaterial({map:surface('fabric','#67534a'),roughness:.93});
 const stone=new THREE.MeshStandardMaterial({map:surface('stone','#74716b'),roughness:.42});
 const brass=material('#aa8a53',.31,.75),black=material('#262927',.48,.35),wall=material('#303b38',.91);
 const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number)=>{
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;
 };
 const box=(w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,r=.02)=>mesh(r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const cyl=(r1:number,r2:number,h:number,mat:THREE.Material,x:number,y:number,z:number)=>mesh(new THREE.CylinderGeometry(r1,r2,h,24),mat,x,y,z);
 const line=(points:THREE.Vector3[],radius:number,mat:THREE.Material)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,6,false),mat,0,0,0);
 // Plank joints and varied tones give the floor scale and grounded contact shadows.
 const floors=['#524c43','#585044','#4c473e','#62584b'].map(c=>material(c,.72));
 for(let row=0;row<12;row++)for(let col=0;col<5;col++){
  const x=-3.5+col*1.65+(row%2)*.4;
  box(1.64,.055,.63,floors[(row+col)%4],x,-.034,-3.6+row*.64,.003);
 }
 box(8,3.2,.12,wall,0,1.6,2.64);
 box(.12,3.2,6,material('#666157',.9),-3.45,1.6,-.3);
 box(.12,3.2,6,material('#454a45',.9),3.45,1.6,-.3);
 box(8,.12,.065,oak,0,.06,2.54);
 for(let i=0;i<27;i++)box(.036,2.42,.065,oak,-3.1+i*.105,1.5,2.53,.008);
 // Sofa: separate compressed cushions, rounded arms, piping, seams and raised feet.
 box(3.3,.19,.87,oak,0,.20,1.76,.045);
 for(const x of [-1.4,1.4])for(const z of [1.44,2.02])cyl(.035,.025,.17,black,x,.085,z);
 for(let i=0;i<4;i++){
  const x=-1.2+i*.8;
  box(.786,.19,.76,upholstery,x,.335,1.72,.075);
  const back=box(.786,.66,.19,upholstery,x,.72,2.10,.065);back.rotation.x=-.10;
  for(const y of [.405,.50])line([new THREE.Vector3(x-.36,y,y===.405?1.38:2),new THREE.Vector3(x,y+.006,y===.405?1.37:2),new THREE.Vector3(x+.36,y,y===.405?1.38:2)],.003,material('#927a68',.9));
 }
 for(const x of [-1.7,1.7])box(.18,.48,.91,upholstery,x,.43,1.73,.07);
 for(const x of [-1.4,1.4]){const p=box(.30,.31,.14,material('#9b896b',.95),x,.60,1.96,.055);p.rotation.z=x>0?.15:-.15;}
 const rug=new THREE.MeshStandardMaterial({map:surface('fabric','#84786a'),roughness:1});
 box(3.15,.013,1.95,rug,0,.006,.57,.006);
 // Preserve phone and hero shisha hierarchy/positions used by the story.
 old.table.traverse((o:any)=>{if(!o.isMesh)return;
  for(const m of (Array.isArray(o.material)?o.material:[o.material])){
   if(m.map&&o.geometry.type==='CircleGeometry'){m.map=null;m.color.set('#62665f');m.roughness=.32;m.metalness=.08;m.needsUpdate=true;}
   else if(m.color&&m.color.r>.4&&m.color.g>.15&&m.color.b<.12){m.color.set('#a88b5b');m.roughness=.3;m.metalness=.6;}
  }
 });
 for(const o of [...old.table.children] as any[]){
  if(!o.isMesh)continue;
  const p=o.geometry.parameters;
  if(o.geometry.type==='CylinderGeometry'&&p.radiusTop===.03){o.visible=false;continue;}
  if(o.geometry.type==='CylinderGeometry'&&p.radiusTop===.035){o.visible=false;continue;}
  if(o.geometry.type==='CylinderGeometry'&&p.radiusTop===.62)o.material=stone;
  if(o.geometry.type==='CircleGeometry')o.material=stone;
  if(o.geometry.type==='CylinderGeometry'&&p.radiusTop===.08)o.material=black;
 }
 old.table.traverse((o:any)=>{
  if(!o.isMesh)return;
  if(o.geometry.type==='SphereGeometry')o.material=new THREE.MeshPhysicalMaterial({color:'#718e83',transparent:true,opacity:.62,roughness:.12,metalness:.12});
  if(o.geometry.type==='TubeGeometry')o.material=material('#30342f',.75);
 });
 g.add(old.table);
 // Glasses with solid rims and coasters; placed away from the test and phone.
 const glass=new THREE.MeshPhysicalMaterial({color:'#deddd4',transparent:true,opacity:.27,roughness:.08,metalness:.08,side:THREE.DoubleSide});
 for(const [x,z] of [[-.50,.75],[.43,.80]]){
  cyl(.09,.09,.008,oak,x,.482,z);
  cyl(.057,.046,.12,glass,x,.546,z);
  cyl(.048,.045,.038,material('#945a24',.18),x,.505,z);
  const rim=mesh(new THREE.TorusGeometry(.056,.002,6,24),brass,x,.606,z);rim.rotation.x=Math.PI/2;
 }
 // Rear service bar, stocked shelves and credible work surfaces.
 box(1.35,.85,.64,oak,2.55,.425,1.93,.025);
 box(1.46,.065,.72,stone,2.53,.88,1.93,.016);
 for(const y of [1.23,1.75,2.28]){
  box(1.30,.045,.24,oak,2.46,y,2.41,.008);
  box(1.2,.012,.02,new THREE.MeshBasicMaterial({color:'#d9b67b'}),2.46,y-.03,2.29,.002);
  for(let j=0;j<6;j++){
   const x=1.96+j*.20;
   cyl(.057,.054,.14,material(['#8a7864','#66736a','#82634f'][j%3],.36),x,y+.09,2.40);
   cyl(.061,.061,.025,brass,x,y+.172,2.40);
  }
 }
 // Backlit sign faces the camera (front of a plane is +Z, cameras here look +Z).
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;
 ctx.clearRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#e2cda2';ctx.font='300 96px Arial';ctx.fillText('P A L A S T',512,130);ctx.font='24px Arial';ctx.fillText('S H I S H A   L O U N G E',512,188);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sign=mesh(new THREE.PlaneGeometry(1.7,.425),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false,side:THREE.DoubleSide}),.12,2.12,2.555);sign.rotation.y=Math.PI;
 for(const x of [-1.45,1.25]){
  cyl(.009,.009,.61,black,x,2.86,1.25);
  cyl(.13,.23,.20,brass,x,2.46,1.25);
  cyl(.12,.20,.012,new THREE.MeshBasicMaterial({color:'#ffe1a0'}),x,2.355,1.25);
  const light=new THREE.PointLight('#ffd6a0',3.4,4,2);light.position.set(x,2.32,1.25);g.add(light);
 }
 // Entrance preserves Abi's position and light path.
 for(const z of [-1.82,-.57])box(.11,2.26,.09,oak,3.24,1.13,z,.012);
 box(.11,.12,1.34,oak,3.24,2.24,-1.195,.01);
 box(.1,.03,1.32,brass,3.23,.02,-1.195,.003);
 // Plant uses thin tapered leaf silhouettes, rather than a stack of green spheres.
 cyl(.20,.145,.36,material('#626a5e',.85),-2.60,.18,2.02);
 for(let i=0;i<15;i++){
  const a=i*2.399,r=.10+(i%4)*.025,y=.68+(i%5)*.105;
  const top=new THREE.Vector3(-2.6+Math.cos(a)*r,y,2.02+Math.sin(a)*r);
  line([new THREE.Vector3(-2.6,.30,2.02),top.clone().lerp(new THREE.Vector3(-2.6,.3,2.02),.4),top],.006,material('#4c6150'));
  const leaf=mesh(new THREE.SphereGeometry(1,12,8),material(i%2?'#405c47':'#627b56',.78),top.x,top.y,top.z);leaf.scale.set(.065,.19,.012);leaf.rotation.set(.45,a,Math.cos(a)*.75);
 }
 return {group:g,table:old.table,update:(_t:number)=>{}};
}
