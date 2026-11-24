import * as THREE from 'three';
// A separate, quiet apartment entrance establishes the mother's flashback location.
export function buildHome(){
  const g=new THREE.Group();
  const material=(c:string)=>new THREE.MeshStandardMaterial({color:c,roughness:.88});
  const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  box(7,.08,7,'#9b826d',0,-.06,0);
  box(7,3.2,.12,'#d9d1c2',0,1.6,2.4);
  box(.12,3.2,6,'#bdb5a8',-2.3,1.6,0);
  box(1.0,2.18,.1,'#665447',1.35,1.09,2.31);
  box(.06,.18,.06,'#bba579',.98,1.03,2.22);
  box(1.2,.72,.38,'#766657',-.85,.36,1.98);
  box(1.3,.06,.44,'#b6a38b',-.85,.75,1.98);
  box(.75,.92,.04,'#69594b',-.85,1.55,2.30);
  box(.64,.81,.04,'#899b97',-.85,1.55,2.27);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.095,.065,.17,24),material('#bd9d86'));pot.position.set(-1.25,.86,1.95);g.add(pot);
  for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),material('#527259'));leaf.scale.set(.7,2.1,.3);leaf.position.set(-1.25+Math.sin(i*2.4)*.08,1.02+i*.018,1.95+Math.cos(i*2.4)*.06);leaf.rotation.z=Math.sin(i*2.4)*.6;g.add(leaf);}
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.17,.25,.27,24),material('#e9ddc8'));shade.position.set(.15,2.55,1.2);g.add(shade);
  const light=new THREE.PointLight('#ffe8c8',3.5,5,2);light.position.set(.15,2.35,1.2);g.add(light);
  // Entryway details: separate parquet boards, coat hooks, shoes and a domestic wall print.
  const timber=['#93816d','#9a8873','#8a7968'];
  for(let row=0;row<18;row++)for(let col=0;col<5;col++)box(1.15,.025,.175,timber[(row+col)%3],-2.1+col*1.16,-.019,-.5+row*.18);
  box(.72,.014,.52,'#69604e',1.32,.005,1.92);
  for(const x of [-1.09,-.81]){const shoe=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material('#4f463e'));shoe.scale.set(.07,.045,.15);shoe.position.set(x,.046,1.67);g.add(shoe);}
  box(.09,.11,.44,'#79634d',-2.18,1.79,.45);
  for(const z of [.29,.61]){const hook=new THREE.Mesh(new THREE.TorusGeometry(.025,.004,6,14,Math.PI),new THREE.MeshStandardMaterial({color:'#9b886b',metalness:.65,roughness:.4}));hook.position.set(-2.10,1.76,z);hook.rotation.y=Math.PI/2;g.add(hook);}
  const coat=new THREE.Group();coat.position.set(-2.08,1.25,.34);g.add(coat);
  const cloth=material('#635f5a');const jacket=new THREE.Mesh(new THREE.BoxGeometry(.10,.63,.34),cloth);coat.add(jacket);
  for(const z of [-.23,.23]){const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.065,.05,.55,12),cloth);sleeve.position.set(.015,-.02,z);sleeve.rotation.x=z>0?.21:-.21;coat.add(sleeve);}
  const c=document.createElement('canvas');c.width=384;c.height=512;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#c5b79f';ctx.fillRect(0,0,384,512);ctx.fillStyle='#828f82';ctx.fillRect(35,35,314,442);
  for(const [x,y,r] of [[135,175,32],[225,185,29],[185,292,23]]){ctx.fillStyle='#d9c9ad';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#554e44';ctx.fillRect(x-r,y+r,r*2,r*2.8);}
  const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
  box(.04,.72,.55,'#685440',-2.20,1.48,.98);
  const print=new THREE.Mesh(new THREE.PlaneGeometry(.48,.65),new THREE.MeshStandardMaterial({map:tx,roughness:.85}));print.rotation.y=Math.PI/2;print.position.set(-2.17,1.48,.98);g.add(print);
  return g;
}
