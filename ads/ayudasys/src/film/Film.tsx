import {AbsoluteFill, Html5Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion'
import {Street3D, Vec} from './Street3D'
import {FilmLook} from './Look'
import {camMove, Fade, Line, Sfx, SPEAKER_COLORS, steps, who} from './kit'
import '../theme'
export const FILM_TOTAL = 1620
Object.assign(SPEAKER_COLORS, {'ALING MILA':'#ffe5a0','ANA':'#8ee8d1','STAFF':'#8ee8d1'})
const G=.12, desk: Vec=[-.25,.35,.25], mila: Vec=[.85,G,2.05]
const Tag=({children}:{children:React.ReactNode})=><div style={{position:'absolute',left:100,top:85,fontFamily:'Poppins',fontSize:24,fontWeight:600,letterSpacing:3,color:'#fff',background:'#133c37dd',padding:'14px 24px',borderLeft:'5px solid #f5c56c'}}>{children}</div>
const Brand=()=> <div style={{position:'absolute',right:100,top:92,fontFamily:'Poppins',fontWeight:700,fontSize:27,color:'#fff',textShadow:'0 2px 12px #000'}}>AyudaSys <span style={{fontWeight:500,fontSize:17,opacity:.8}}> / ISANG KUWENTO NG BARANGAY</span></div>
function Opening(){
 const f=useCurrentFrame()
 const walking=who('woman',f,[[0,[-5,G,2.5]],[160,[-1.1,G,2.5]],[240,[-1.1,G,2.5]]],[[160,'worried']])
 const c=camMove(f,[[0,[-5,6.5,20],[-1,2,1]],[140,[-2,2.6,12],[-.6,1.5,1]],[240,[-1.6,2.1,9],[-.1,1.4,1]]],34,.3)
 return <AbsoluteFill><Street3D cam={c} time={.15} actors={[who('owner',f,[[0,desk]]),walking]} /><FilmLook time={.15}/><Tag>UMAGA · BARANGAY MALINAW</Tag><Brand/>
 <div style={{position:'absolute',left:105,top:200,color:'white',fontFamily:'Poppins',fontWeight:800,fontSize:92,lineHeight:1.1,textShadow:'0 4px 20px #1b332e',opacity:interpolate(f,[15,40,130,155],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>May tala.<br/><span style={{color:'#ffe1a2'}}>May tiwala.</span></div>
 <Line at={145} until={235} who="ALING MILA" text="Ana, paano po kami makakakuha?"/>{steps(10,160,16,.07)}<Fade to={18}/></AbsoluteFill>
}
function Conversation(){
 const f=useCurrentFrame()
 const c=camMove(f,[[0,[-1.5,2.05,7.5],[.25,1.35,1.1]],[240,[-1.1,1.95,6.7],[.25,1.35,1.1]]],34,.3)
 return <AbsoluteFill><Street3D cam={c} time={.4} actors={[who('owner',f,[[0,desk]],[[0,'talk'],[130,'happy']]),who('woman',f,[[0,mila]],[[0,'worried'],[140,'happy']])]}/><FilmLook time={.4}/><Tag>01 / KILALANIN ANG PAMILYA</Tag><Brand/>
 <Line at={4} until={116} who="ANA" text="Irehistro muna natin ang pamilya ninyo."/>
 <Line at={120} until={236} who="ANA" text="Saka susuriin ang kwalipikasyon sa programa."/>
 <Sfx at={5} name="8bit/talk" volume={.12}/></AbsoluteFill>
}
function Product({kind}:{kind:'register'|'verify'|'release'}){
 const f=useCurrentFrame(), registration=kind==='register', verification=kind==='verify'
 const screen=registration?'register':verification?(f<145?'verify':'confirm'):(f<120?'released':'dashboard')
 const label=registration?'02 / REHISTRO AT QR STUB':verification?'03 / HANAPIN. BERIPIKAHIN.':'04 / KUMPIRMADO. NAKATALA.'
 const title=registration?'Isang pamilya.\nIsang tala.':verification?'QR ang susi.\nStaff ang susuri.':'Bawat release,\nmay rekord.'
 const text=registration?'Kapag na-enroll sa programa,\nmay QR stub na maiimprenta.':verification?'Tingnan ang detalye.\nTiyakin ang pagkakakilanlan.':'Nakatala ang tumanggap,\nstaff, at oras ng release.'
 const p=interpolate(f,[0,20],[0,1],{extrapolateRight:'clamp'})
 return <AbsoluteFill style={{background:'radial-gradient(ellipse at 80% 15%, #245e52, #102c2a 70%)',fontFamily:'Poppins',color:'white'}}>
 <Tag>{label}</Tag><Brand/>
 <div style={{position:'absolute',left:105,top:250,width:550,opacity:p,transform:`translateY(${(1-p)*30}px)`}}>
 <div style={{fontSize:67,fontWeight:800,lineHeight:1.15,whiteSpace:'pre-line'}}>{title}</div>
 <div style={{width:65,height:5,background:'#f5c56c',margin:'32px 0'}}/>
 <div style={{fontSize:30,lineHeight:1.6,whiteSpace:'pre-line',color:'#c7ded7'}}>{text}</div>
 {!registration&&<div style={{marginTop:40,fontSize:23,color:'#ffe1a2',lineHeight:1.6}}>{verification?'Hindi pa release ang pag-scan.':'Isang release lang bawat\npamilya sa bawat programa.'}</div>}</div>
 <div style={{position:'absolute',left:820,top:190,width:1000,borderRadius:18,overflow:'hidden',border:'2px solid #668f7d',boxShadow:'0 35px 70px #05181799',transform:`translateX(${(1-p)*90}px)`,opacity:p}}>
 <div style={{height:40,background:'#e6ebe6',color:'#53635c',display:'flex',alignItems:'center',gap:9,paddingLeft:17,fontSize:15}}><span>● ● ●</span><span style={{marginLeft:25}}>AyudaSys / aktuwal na demo screen</span></div>
 <Img src={staticFile(`shots/${screen}.png`)} style={{display:'block',width:'100%'}}/></div>
 {registration&&f>=120&&<div style={{position:'absolute',left:1090,top:205,width:530,padding:12,borderRadius:14,background:'#fff',boxShadow:'0 20px 70px #0008',transform:`scale(${interpolate(f,[120,135],[.85,1],{extrapolateRight:'clamp'})})`}}><Img src={staticFile('shots/stub.png')} style={{width:'100%',maxHeight:620,objectFit:'contain',display:'block'}}/></div>}
 <div style={{position:'absolute',left:105,bottom:55,color:'#9cbeb3',fontSize:19}}>DEMO DATA · Kathang-isip ang mga pangalan at barangay.</div>
 {registration?<><Line at={10} until={110} who="ANA" text="Dito nakatala ang inyong pamilya."/><Line at={125} until={233} who="ANA" text="Ito ang QR stub ninyo. Ingatan po."/><Sfx at={120} name="printer" volume={.2}/></>:verification?<><Line at={10} until={130} who="STAFF" text="Nakita na ang tala. Patingin po ng ID."/><Line at={150} until={233} who="STAFF" text="Tugma na. Kukumpirmahin ko ang release."/><Sfx at={6} name="scan" volume={.3}/><Sfx at={145} name="tap" volume={.3}/></>:<><Line at={8} until={115} who="STAFF" text="Naitala na po ang pagtanggap ninyo."/><Line at={130} until={233} who="ANA" text="Makikita rin ang release sa dashboard."/><Sfx at={5} name="check" volume={.3}/></>}
 </AbsoluteFill>
}
function Thanks(){
 const f=useCurrentFrame(), c=camMove(f,[[0,[-1.2,2,7.6],[.25,1.3,1.4]],[180,[-.8,2.3,9],[.25,1.4,1.4]]],34,.25)
 return <AbsoluteFill><Street3D cam={c} time={2} items={[{name:'foodpack',pos:[.6,1.03,1]}]} actors={[who('owner',f,[[0,desk]],[[0,'happy'],[100,'wave']]),who('woman',f,[[0,mila]],[[0,'happy'],[80,'wave']])]}/><FilmLook time={2}/><Tag>PAGKATAPOS NG RELEASE</Tag><Brand/>
 <Line at={8} until={85} who="ALING MILA" text="Salamat, Ana. Malinaw ang bawat hakbang."/><Line at={90} until={175} who="ANA" text="At may tala ang bawat tulong."/></AbsoluteFill>
}
function Ending(){
 const f=useCurrentFrame(), c=camMove(f,[[0,[0,2.5,11],[0,1.6,1]],[240,[0,9,25],[0,3,0]]],34,.15)
 const cast=['owner','woman','kid','grandma','man']
 return <AbsoluteFill><Street3D cam={c} time={2.6} actors={cast.map((id,i)=>who(id,f,[[0,[-1.8+i*.9,G,2.8]]],[[0,'happy'],[20+i*4,'wave']]))}/><FilmLook time={2.6}/>
 <AbsoluteFill style={{background:'linear-gradient(#102c2add, #102c2a55 70%)'}}/>
 <div style={{position:'absolute',top:150,left:0,right:0,textAlign:'center',color:'#fff',fontFamily:'Poppins'}}><div style={{fontSize:30,letterSpacing:6,color:'#ffe1a2'}}>PARA SA MGA TAGAPAGLINGKOD NG BARANGAY</div><div style={{fontSize:126,fontWeight:800,lineHeight:1.3}}>AyudaSys</div><div style={{fontSize:57,fontWeight:600}}>May tala. May tiwala.</div><div style={{fontSize:29,marginTop:35,color:'#e3ebe4'}}>Rehistro ng pamilya · QR stub · Beripikadong release</div><div style={{display:'inline-block',marginTop:40,padding:'18px 42px',borderRadius:8,background:'#f5c56c',color:'#173c34',fontWeight:700,fontSize:29}}>Kilalanin ang AyudaSys</div></div>
 <Sfx at={120} name="chime" volume={.2}/><Fade from={218} to={240} out/></AbsoluteFill>
}
export const Film=()=> <AbsoluteFill style={{background:'#102c2a'}}>
 <Html5Audio src={staticFile('audio/bgm.mp3')} volume={f=>interpolate(f,[0,20,1560,1620],[0,.48,.48,0],{extrapolateRight:'clamp'})}/>
 <Sequence from={0} durationInFrames={240} name="01 - Ang tanong"><Opening/></Sequence>
 <Sequence from={240} durationInFrames={240} name="02 - Ang paliwanag"><Conversation/></Sequence>
 <Sequence from={480} durationInFrames={240} name="03 - Rehistro at QR"><Product kind="register"/></Sequence>
 <Sequence from={720} durationInFrames={240} name="04 - Beripikasyon"><Product kind="verify"/></Sequence>
 <Sequence from={960} durationInFrames={240} name="05 - Release"><Product kind="release"/></Sequence>
 <Sequence from={1200} durationInFrames={180} name="06 - Pasasalamat"><Thanks/></Sequence>
 <Sequence from={1380} durationInFrames={240} name="07 - May tiwala"><Ending/></Sequence>
 </AbsoluteFill>
