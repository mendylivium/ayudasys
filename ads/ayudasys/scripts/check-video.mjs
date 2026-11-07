import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto(pathToFileURL(path.resolve('out/ayudasys-may-tala-may-tiwala-1080p.mp4')).href);
 await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const result=await page.evaluate(async()=>{
  const video=document.querySelector('video');
  const metadata={width:video.videoWidth,height:video.videoHeight,duration:video.duration};
  for(const second of [2,10,20,28,35,43,49,53]){
   await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=()=>reject(Error('Video decode failed'));video.currentTime=second;});
   if(video.readyState<2)throw Error('Frame unavailable at '+second);
  }
  video.muted=true;
  video.currentTime=0;
  await video.play();
  await new Promise(resolve=>setTimeout(resolve,1200));
  if(video.currentTime<.5)throw Error('Playback did not advance');
  video.pause();
  return {...metadata,seekChecks:8,playback:'passed'};
 });
 console.log(JSON.stringify(result));
} finally {await browser.close();}
