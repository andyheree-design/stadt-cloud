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
  const light=new THREE.PointLight('#ffe2b4',6,5,2);light.position.set(.15,2.35,1.2);g.add(light);
  return g;
}
