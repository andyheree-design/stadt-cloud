import React,{useMemo,useEffect,useState} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender} from 'remotion';
import {buildGlbHuman,loadGlb} from './glbHumanPerformance';
import {ComposerReady} from '../../lib/ComposerReady';
import {NOINK} from '../bridge/ink';
import {blendExpr} from './set';
import DATA from './e01_data.json';

const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*x*(x*(x*6-15)+10);};
const Inner:React.FC<{t:number}>=({t})=>{
 const {camera,scene,advance}=useThree();const [data,setData]=useState<any>(null);
 const [hold]=useState(()=>delayRender('Performance assets'));
 useEffect(()=>{Promise.all([
  loadGlb(staticFile('ehre/v5/abi_cinematic.glb')),loadGlb(staticFile('ehre/mama_series.glb')),loadGlb(staticFile('ehre/tarek.glb')),
  fetch(staticFile('ehre/v5/f_gestic_talk_neutral_01.json')).then(r=>r.json()),
  fetch(staticFile('ehre/v5/m_sit_chair_gestic_thoughtful.json')).then(r=>r.json())
 ]).then(setData).catch(cancelRender);},[hold]);
 useEffect(()=>{if(data)requestAnimationFrame(()=>requestAnimationFrame(()=>{advance(performance.now());continueRender(hold);}));},[data]);
 const actors=useMemo(()=>data?[0,1,2].map((i)=>{
  const c=buildGlbHuman(data[i],{natural:true});c.group.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(c.group,true);c.group.scale.setScalar([2.02,1.60,1.78][i]/(b.max.y-b.min.y));return c;
 }):[],[data]);
 const props=useMemo(()=>{
  const g=new THREE.Group();
  const tip=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.21,20),new THREE.MeshStandardMaterial({color:'#d6cab0',metalness:.6,roughness:.27}));g.add(tip);
  const hose=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#82654a',roughness:.65}));g.add(hose);
  const vase=new THREE.Mesh(new THREE.SphereGeometry(.12,24,16),new THREE.MeshPhysicalMaterial({color:'#607f70',roughness:.18,metalness:.13,transparent:true,opacity:.75}));vase.position.set(-.40,.57,-.10);vase.scale.y=1.15;g.add(vase);
  return {g,tip,hose,vase};
 },[]);
 const set=useMemo(()=>{
  const g=new THREE.Group();const m=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.7});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,color:string)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m(color));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);};
  box(7,.04,6,0,-.03,0,'#4a4238');box(7,3.2,.15,0,1.6,1.5,'#1d302a');
  for(let i=0;i<26;i++)box(.025,2.6,.07,-1.8+i*.14,1.3,1.38,'#725b40');
  box(1.6,.18,.65,0,.34,.55,'#59453d');box(1.6,.6,.13,0,.72,.89,'#59453d');
  return g;
 },[]);
 scene.background=new THREE.Color('#111b17');
 const shot=t<4?0:t<8?1:2;const local=t-[0,4,8][shot];
 actors.forEach((c,i)=>{c.group.visible=i===shot;});
 const c=actors[shot];
 if(c){
  const motherLine=(DATA as any[]).find(l=>l.id==='L09');
  const voiceFrame=Math.floor((local-.45)*30);
  const mouthEnergy=shot===1&&voiceFrame>=0?[0,1,2,3,4].reduce((v,k)=>v+(motherLine?.env[Math.max(0,voiceFrame-k)]??0),0)/5:0;
  const blinkTime=local%3.6,blink=blinkTime<.16?Math.sin(Math.PI*blinkTime/.16)**2:0;
  const smoke=shot===2?smooth((local-.25)/.8)*(1-smooth((local-2.3)/.8)):0;
  c.pose({pos:[0,0,.3],sit:shot===2?1:0,grounded:true,rotY:0,smoke:0,headYaw:shot===1?.12-.38*smooth((local-1.9)/.8):0,
   armL:{out:.08,elbow:shot===2?.8:.14},armR:{out:.10,elbow:shot===2?.85:.15},
   handR:{curl:shot===2?-.9:.15,index:shot===2?-.8:.15,thumb:shot===2?-1:.15},
   face:blendExpr(shot===0?{determined:.6,neutral:.4}:shot===1?{neutral:.8,smile:.2}:{neutral:1},{mouthOpen:mouthEnergy*.8,jaw:mouthEnergy*.4,blink})});
  if(shot===1)c.applyCapture(data[3],5.5+local,{weight:1,skipHead:true});
  if(shot===2){c.applyCapture(data[4],1+local,{skipRight:true,weight:.85});c.reachMouth(smoke);}
  c.group.updateMatrixWorld(true);
  if(shot===2&&smoke>.99&&Math.round(t*30)%10===0&&!(c.group.userData.lastReport===Math.round(t*30))){console.log('V5_CONTACT '+JSON.stringify({frame:Math.round(t*30),gripError:c.group.userData.gripError,mouth:c.mouth.getWorldPosition(new THREE.Vector3()).toArray(),grip:c.grip.R.getWorldPosition(new THREE.Vector3()).toArray()}));c.group.userData.lastReport=Math.round(t*30);}
  const cam=camera as THREE.PerspectiveCamera;cam.layers.enable(NOINK);
  if(shot===0){cam.fov=34;cam.position.set(.42,1.27,-2.85);cam.lookAt(0,1.13,.3);}
  else if(shot===1){cam.fov=32;cam.position.set(.32,1.34,-1.55);cam.lookAt(0,1.27,.3);}
  else{cam.fov=33;cam.position.set(.42,1.04,-1.25);cam.lookAt(-.03,1.03,.3);}
  cam.updateProjectionMatrix();
  props.g.visible=shot===2;
  if(shot===2){
   const mouth=c.mouth.getWorldPosition(new THREE.Vector3()),grip=c.grip.R.getWorldPosition(new THREE.Vector3());
   const dir=mouth.clone().sub(grip).normalize();props.tip.position.copy(grip);props.tip.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
   const points=[grip.clone().addScaledVector(dir,-.105),grip.clone().add(new THREE.Vector3(-.05,-.25,-.08)),new THREE.Vector3(-.38,.50,-.10),new THREE.Vector3(-.40,.67,-.10)];
   props.hose.geometry.dispose();props.hose.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.012,8,false);
  }
 }
 return <>
  <hemisphereLight args={['#d5e2dc','#4b3629',.65]}/>
  <directionalLight position={[-2,3,-3]} intensity={2.2} color="#ffe3c0" castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={.008}/>
  <pointLight position={[1.3,2,1]} intensity={10} color="#e5ab5d" distance={5}/>
  <pointLight position={[-1.3,1.7,-1]} intensity={2} color="#9aafcc" distance={4}/>
  <primitive object={set}/><primitive object={props.g}/>
  {actors.map((a,i)=><primitive key={i} object={a.group} dispose={null}/>)}
 </>;
};
export const EhrePerformanceLab:React.FC=()=>{const t=useCurrentFrame()/30;return <AbsoluteFill style={{background:'#111',color:'#e8dfd0'}}>
 <ThreeCanvas width={1080} height={1920} shadows camera={{near:.03,far:30}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}}><Inner t={t}/><ComposerReady/></ThreeCanvas>
 <div style={{position:'absolute',top:70,left:60,fontFamily:'Arial',fontSize:24,letterSpacing:3}}>V5 · PRÓBA {t<4?'ABI / MODEL':t<8?'MAMA / RUCH':'TAREK / KONTAKT'}</div>
 </AbsoluteFill>;};
