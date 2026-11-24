// Rhubarb Lip Sync1.14.0, recognizer=phonetic, actual German stems (13).
// Data provenance/cache: film_v7/tools/rhubarb/combined_cues_v7.json.
// Acoustic mouth shapes, not a transcript-derived character clock.
// G/FV and H/L approximate the available rig; no tongue/lip-bite morph exists.
type Shape = "A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"X";
type Cue = [number,number,Shape];
type Stem = {id:string;who:string;start:number;end:number;duration:number;cues:Cue[]};
type MouthChannels = {mouthOpen:number;jaw:number;mouthWidth:number;speechPurse:number};
export type PhonemeChannelsV7 = MouthChannels & {speechActivity:number;speechClosure:number};
const STEMS:Stem[] = [{"id":"L01","who":"dilara","start":0,"end":4.016,"duration":4.016,"cues":[[0,0.04,"B"],[0.04,0.08,"C"],[0.08,0.15,"B"],[0.15,0.22,"C"],[0.22,0.36,"B"],[0.36,0.43,"A"],[0.43,0.5,"D"],[0.5,0.58,"A"],[0.58,0.63,"E"],[0.63,0.68,"F"],[0.68,0.89,"B"],[0.89,0.96,"C"],[0.96,1.04,"A"],[1.04,1.15,"D"],[1.15,1.2,"C"],[1.2,1.27,"G"],[1.27,1.62,"B"],[1.62,1.83,"F"],[1.83,2.04,"E"],[2.04,2.11,"B"],[2.11,2.18,"C"],[2.18,2.32,"G"],[2.32,2.39,"B"],[2.39,2.46,"C"],[2.46,2.6,"G"],[2.6,3.02,"B"],[3.02,3.23,"F"],[3.23,3.31,"A"],[3.31,3.65,"F"],[3.65,3.72,"B"],[3.72,3.79,"E"],[3.79,3.93,"F"],[3.93,4.0,"B"],[4.0,4.01,"X"]]},{"id":"L02","who":"tarek","start":4.436,"end":7.175,"duration":2.738583,"cues":[[0,0.09,"B"],[0.09,0.16,"C"],[0.16,0.23,"B"],[0.23,0.31,"A"],[0.31,0.8,"B"],[0.8,0.95,"X"],[0.95,1.02,"B"],[1.02,1.09,"C"],[1.09,1.3,"B"],[1.3,1.65,"F"],[1.65,1.73,"A"],[1.73,1.77,"C"],[1.77,1.81,"B"],[1.81,2.02,"C"],[2.02,2.3,"B"],[2.3,2.44,"E"],[2.44,2.58,"H"],[2.58,2.72,"B"],[2.72,2.73,"X"]]},{"id":"L03","who":"dilara","start":7.055,"end":9.481,"duration":2.425833,"cues":[[0,0.54,"B"],[0.54,0.68,"C"],[0.68,0.75,"B"],[0.75,0.89,"C"],[0.89,0.98,"A"],[0.98,1.23,"C"],[1.23,1.3,"B"],[1.3,1.65,"F"],[1.65,1.86,"B"],[1.86,1.94,"A"],[1.94,2.0,"F"],[2.0,2.13,"E"],[2.13,2.41,"B"],[2.41,2.42,"X"]]},{"id":"L04","who":"tarek","start":9.381,"end":11.508,"duration":2.127,"cues":[[0,0.06,"B"],[0.06,0.18,"C"],[0.18,0.28,"A"],[0.28,0.34,"B"],[0.34,0.54,"E"],[0.54,0.68,"B"],[0.68,0.82,"C"],[0.82,0.89,"G"],[0.89,0.96,"B"],[0.96,1.1,"C"],[1.1,1.18,"A"],[1.18,1.33,"E"],[1.33,1.4,"C"],[1.4,1.5,"A"],[1.5,1.62,"B"],[1.62,1.76,"G"],[1.76,1.97,"F"],[1.97,2.11,"B"],[2.11,2.12,"X"]]},{"id":"L05","who":"kevin","start":11.558,"end":15.916,"duration":4.357687,"cues":[[0,0.21,"B"],[0.21,0.35,"C"],[0.35,0.49,"B"],[0.49,0.63,"C"],[0.63,0.82,"X"],[0.82,0.86,"B"],[0.86,1.04,"C"],[1.04,1.18,"B"],[1.18,1.39,"F"],[1.39,1.74,"B"],[1.74,2.02,"F"],[2.02,2.23,"B"],[2.23,2.37,"E"],[2.37,2.57,"A"],[2.57,2.7,"B"],[2.7,2.84,"G"],[2.84,2.91,"D"],[2.91,2.98,"C"],[2.98,3.12,"B"],[3.12,3.19,"C"],[3.19,3.4,"B"],[3.4,3.61,"X"],[3.61,3.69,"B"],[3.69,3.76,"G"],[3.76,3.92,"A"],[3.92,3.96,"B"],[3.96,4.07,"C"],[4.07,4.16,"A"],[4.16,4.34,"B"],[4.34,4.35,"X"]]},{"id":"L06","who":"tarek","start":15.716,"end":17.809,"duration":2.092958,"cues":[[0,0.07,"B"],[0.07,0.14,"C"],[0.14,0.21,"F"],[0.21,0.35,"C"],[0.35,0.49,"F"],[0.49,0.63,"G"],[0.63,0.98,"B"],[0.98,1.12,"C"],[1.12,1.2,"A"],[1.2,1.28,"F"],[1.28,1.37,"A"],[1.37,1.45,"D"],[1.45,1.49,"C"],[1.49,1.57,"A"],[1.57,1.8,"D"],[1.8,1.94,"F"],[1.94,2.01,"C"],[2.01,2.08,"B"],[2.08,2.09,"X"]]},{"id":"L07","who":"dilara","start":17.709,"end":20.16,"duration":2.450521,"cues":[[0,0.63,"B"],[0.63,0.71,"A"],[0.71,0.97,"F"],[0.97,1.25,"B"],[1.25,1.32,"F"],[1.32,1.46,"C"],[1.46,2.16,"B"],[2.16,2.23,"C"],[2.23,2.44,"B"],[2.44,2.45,"X"]]},{"id":"L08","who":"tarek","start":20.04,"end":23.412,"duration":3.372,"cues":[[0,0.06,"B"],[0.06,0.22,"A"],[0.22,0.28,"C"],[0.28,0.48,"D"],[0.48,0.55,"F"],[0.55,0.62,"B"],[0.62,0.69,"E"],[0.69,0.83,"F"],[0.83,1.11,"E"],[1.11,1.25,"B"],[1.25,1.53,"F"],[1.53,1.6,"G"],[1.6,1.67,"H"],[1.67,1.74,"B"],[1.74,1.82,"A"],[1.82,1.89,"B"],[1.89,2.1,"C"],[2.1,2.17,"B"],[2.17,2.24,"C"],[2.24,2.39,"A"],[2.39,2.48,"B"],[2.48,2.6,"A"],[2.6,3.08,"B"],[3.08,3.29,"F"],[3.29,3.36,"B"],[3.36,3.37,"X"]]},{"id":"L09","who":"mama","start":23.562,"end":25.052,"duration":1.49,"cues":[[0,0.14,"B"],[0.14,0.35,"E"],[0.35,0.43,"A"],[0.43,0.64,"F"],[0.64,0.72,"A"],[0.72,1.02,"B"],[1.02,1.09,"C"],[1.09,1.16,"B"],[1.16,1.3,"C"],[1.3,1.48,"A"],[1.48,1.49,"X"]]},{"id":"L10","who":"tarek","start":25.252,"end":27.349,"duration":2.096917,"cues":[[0,0.03,"B"],[0.03,0.19,"A"],[0.19,0.27,"C"],[0.27,0.37,"A"],[0.37,0.46,"B"],[0.46,0.53,"G"],[0.53,0.6,"D"],[0.6,0.95,"B"],[0.95,1.09,"C"],[1.09,1.16,"A"],[1.16,1.22,"C"],[1.22,1.28,"A"],[1.28,1.44,"C"],[1.44,1.72,"B"],[1.72,1.86,"C"],[1.86,2.08,"A"],[2.08,2.09,"X"]]},{"id":"L11","who":"mama","start":27.699,"end":31.896,"duration":4.197,"cues":[[0,0.06,"B"],[0.06,0.33,"C"],[0.33,0.4,"B"],[0.4,0.61,"C"],[0.61,0.89,"B"],[0.89,0.96,"H"],[0.96,1.03,"C"],[1.03,1.17,"F"],[1.17,1.24,"B"],[1.24,1.52,"E"],[1.52,1.66,"G"],[1.66,1.94,"B"],[1.94,2.08,"C"],[2.08,2.57,"B"],[2.57,2.78,"E"],[2.78,2.92,"F"],[2.92,2.99,"B"],[2.99,3.13,"C"],[3.13,3.34,"F"],[3.34,3.41,"B"],[3.41,3.55,"C"],[3.55,3.76,"B"],[3.76,3.83,"C"],[3.83,3.97,"E"],[3.97,4.18,"C"],[4.18,4.19,"X"]]},{"id":"L12","who":"tarek","start":31.846,"end":33.114,"duration":1.268,"cues":[[0,0.16,"B"],[0.16,0.3,"C"],[0.3,0.39,"A"],[0.39,0.46,"F"],[0.46,0.59,"C"],[0.59,0.66,"B"],[0.66,0.8,"F"],[0.8,1.01,"C"],[1.01,1.08,"B"],[1.08,1.25,"A"],[1.25,1.26,"X"]]},{"id":"L13","who":"mama","start":33.264,"end":35.79,"duration":2.525729,"cues":[[0,0.06,"B"],[0.06,0.18,"C"],[0.18,0.39,"B"],[0.39,0.6,"C"],[0.6,0.95,"B"],[0.95,1.03,"A"],[1.03,1.11,"D"],[1.11,1.2,"A"],[1.2,1.39,"B"],[1.39,1.65,"X"],[1.65,1.7,"B"],[1.7,1.81,"F"],[1.81,2.51,"B"],[2.51,2.52,"X"]]}];
const REST:PhonemeChannelsV7={mouthOpen:0,jaw:0,mouthWidth:.42,speechPurse:0,speechActivity:0,speechClosure:0};
// Gross aperture is slow; lip rounding/closure can anticipate the next sound.
// Values target a .34 maximum mouth-open morph through the speech mapping.
const SHAPES:Record<Shape,MouthChannels>={
 A:{mouthOpen:0,jaw:0,mouthWidth:.42,speechPurse:0},
 B:{mouthOpen:.075,jaw:.02,mouthWidth:.46,speechPurse:0},
 C:{mouthOpen:.31,jaw:.075,mouthWidth:.46,speechPurse:0},
 D:{mouthOpen:.48,jaw:.12,mouthWidth:.44,speechPurse:0},
 E:{mouthOpen:.25,jaw:.06,mouthWidth:.37,speechPurse:.13},
 F:{mouthOpen:.115,jaw:.03,mouthWidth:.33,speechPurse:.24},
 G:{mouthOpen:.045,jaw:.01,mouthWidth:.43,speechPurse:0},
 H:{mouthOpen:.25,jaw:.06,mouthWidth:.45,speechPurse:0},
 X:REST,
};
const JAW_HALF=.075,LIP_HALF=.060,CLOSURE_HALF=.045,EDGE=.075;
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*x*(x*(x*6-15)+10);};
// Analytic Hann integration: continuous value and velocity, no frame history.
const cumulative=(x:number,half:number)=>{
 if(x<=-half)return 0;if(x>=half)return 1;
 return .5+x/(2*half)+Math.sin(Math.PI*x/half)/(2*Math.PI);
};
const overlap=(start:number,end:number,local:number,half:number)=>
 cumulative(end-local,half)-cumulative(start-local,half);
/** Merge last among facial channels. Brows/gaze remain authored; speech owns lips. */
export function phonemePerformance(id:string,t:number):PhonemeChannelsV7{
 const stem=STEMS.find(s=>s.who===id&&t>=s.start&&t<s.end);
 if(!stem)return {...REST};
 const local=t-stem.start,duration=Math.min(stem.duration,stem.end-stem.start);
 if(local<0||local>=duration)return {...REST};
 const out={...REST};
 for(const [start,end,value] of stem.cues){
  if(end<=local-JAW_HALF)continue;if(start>=local+JAW_HALF)break;
  const shape=SHAPES[value],jaw=overlap(start,end,local,JAW_HALF),lip=overlap(start,end,local,LIP_HALF);
  out.mouthOpen+=shape.mouthOpen*jaw;out.jaw+=shape.jaw*jaw;
  out.mouthWidth+=(shape.mouthWidth-REST.mouthWidth)*lip;
  out.speechPurse+=shape.speechPurse*lip;
  if(value!=='X')out.speechActivity+=lip;
  if(value==='A')out.speechClosure+=overlap(start,end,local,CLOSURE_HALF);
 }
 const gain=smooth(Math.min(local,duration-local)/EDGE);
 out.mouthOpen*=gain;out.jaw*=gain;out.speechPurse*=gain;
 out.mouthWidth=REST.mouthWidth+(out.mouthWidth-REST.mouthWidth)*gain;
 out.speechActivity=Math.min(1,out.speechActivity)*gain;
 out.speechClosure=Math.min(1,out.speechClosure)*gain;
 return out;
}
