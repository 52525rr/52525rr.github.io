const video = document.getElementById("video");
const input = document.getElementById("input");
const i1 = document.getElementById("canvas1");
const i2 = document.getElementById("canvas2");

power2Square = 256

W=power2Square; H=W
i1.width=W; i1.height=H
i2.width=W; i2.height=H
START = 0

FPS = 15
bits = 4
threshold = 16
colorstick = 4

size = 0
b=8-bits
OP=[]

var slider = document.getElementById("myRange");
var output = document.getElementById("demo");
slider.oninput = function() {
  if (START == 0){
  threshold = this.value/8
  output.innerHTML = `Threshold: ${this.value}`;
  }
}
var slider2 = document.getElementById("myRange2");
var output2 = document.getElementById("demo2");
slider2.oninput = function() {
  if (START == 0){
  colorstick = this.value
  output2.innerHTML = `Color stickiness: ${this.value}`;
  }
}
var slider3 = document.getElementById("myRange3");
var output3 = document.getElementById("demo3");
slider3.oninput = function() {
  if (START == 0){
  FPS = this.value
  output3.innerHTML = `Framerate: ${this.value}`;
  }
}

input.addEventListener("input", async function(){
	let videoObjectUrl = URL.createObjectURL(input.files[0]);

	video.src = videoObjectUrl;
	video.load();

});
let seekResolve = () => {};

video.addEventListener("seeked", async function(){
  if(seekResolve)
    seekResolve();
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function get(x,y,frame){
  let i=(y*width+x)*4
  return ([frame[i++],frame[i++],frame[i++],frame[i++]])
}

function bin(x,b){
  x=Math.floor(x)
  x=x.toString(2)
  x=x.padStart(b, '0')
  x=String(x)
  return(x)
}

function vec(x,y,s){
  sr=0; sg=0; sb=0; sa=0;
  for(let j=y; j<y+s; j++){
    for(let i=x; i<x+s; i++){
      c = get(i,j,del);
      sr += c[0];
      sg += c[1];
      sb += c[2];
      sa += c[3];
    }
  }

  ss=s*s
  sr/=ss; sg/=ss; sb/=ss; sa/=ss;

  tr=0; tg=0; tb=0;
  for(let j=y; j<y+s; j++){
    for(let i=x; i<x+s; i++){
      c = get(i,j,del);
      tr += Math.sqrt((c[0]-sr)**2+(c[1]-sg)**2+(c[2]-sb)**2)
    }
  }
  //tr=(Math.sqrt(tr/ss))*Math.sqrt(s)//Math.log(s)/Math.log(2)
  vector = Math.sqrt(tr/ss)*Math.log(s)/Math.log(2)

  //tr=tr/ss
  return([vector,[Math.floor(sr),Math.floor(sg),Math.floor(sb),Math.floor(sa)]])
}

function qt(x,y,s){
  A=vec(x,y,s)
  if(s>1 && A[0]>threshold && A[1][3]!=0){
    OP.push(1); size++
    let z = s/2
    qt(x  ,y  ,z)
    qt(x+z,y  ,z)
    qt(x  ,y+z,z)
    qt(x+z,y+z,z)
  }else{
    OP.push(0);size++
    if(A[1][3]<1){
     OP.push(0);size++
    }else{
     OP.push(1);size++
     OP.push(A[1]);size+=3*bits
    }
    }
  }
var width = power2Square; var height = width

function computedelta(l,c){
  delta = []; cc=[0,0,0,0]
  for(let i = 0; i<c.length; i+=4){
    cc[0] = (Math.abs(Math.floor((c[i+0]>>b)/colorstick) - (Math.floor(l[i+0]>>b)/colorstick)))
    cc[1] = (Math.abs(Math.floor((c[i+1]>>b)/colorstick) - (Math.floor(l[i+1]>>b)/colorstick)))
    cc[2] = (Math.abs(Math.floor((c[i+2]>>b)/colorstick) - (Math.floor(l[i+2]>>b)/colorstick)))
    if((cc[0]+cc[1]+cc[2])<1){cc[3]=0}else{cc[3]=255} 

    delta.push(c[i],c[i+1],c[i+2],cc[3])
    }
  return(delta)
  }

function draw(x,y,s){
    if(OP[I++]==1){
      let z=s/2
      draw(x  ,y  ,z)
      draw(x+z,y  ,z)
      draw(x  ,y+z,z)
      draw(x+z,y+z,z)
    }else{
      if(OP[I++]==1){
        a=OP[I++]
        ctx2.fillStyle = `rgb(${a[0]},${a[1]},${a[2]})`
        ctx2.fillRect(x,y,s,s)
      }
    }
  }

let started = false;
video.addEventListener("canplaythrough", async function(){
  if(started)
    return;
  started = true;

  prev = ctx2.getImageData(0, 0, width, height);
  //video.height = 240; video.width = 160;
  video.height = 0; video.width = 0;
  video.currentTime = 0
  const FRAMES = Math.ceil(video.duration*FPS)
  console.log(FRAMES)
  ctx2.fillRect(0,0,power2Square,power2Square)
  prev = ctx2.getImageData(0, 0, width, height);
  START = 1
  let i=0;

  while (i<FRAMES){
    i++;
    document.getElementById("F").innerText = `Frame ${i} / ${FRAMES}`;
    document.getElementById("S").innerText = `Total size ${Math.ceil(size/6)} bytes`;

    prev = ctx1.getImageData(0, 0, width, height);

    video.currentTime=i/FPS;
    await new Promise((resolve, reject) => seekResolve = resolve);

    ctx1.drawImage(video, 0, 0, width, height)
    fr = ctx1.getImageData(0, 0, width, height);

    del=computedelta(prev.data,fr.data)
    I=OP.length  
    qt(0,0,power2Square);

    draw(0,0,power2Square)
    //prev = ctx2.getImageData(0, 0, width, height);

  }
  str = ""
  str += bin(OP[0],16)
  str += bin(OP[1],16)
  str += bin(OP[2],16)  
  str += bin(OP[3],16)
  str += bin(OP[4],4)
  str=""
  i=0
  while(i<OP.length){
    if(OP[i++]==1){
      str+="1"
    }else{
      str+="0"
      if(OP[i++]==1){
        str+="1"
        a=OP[i++]
        str+=bin(Math.floor(a[0])>>b,bits)
        str+=bin(Math.floor(a[1])>>b,bits)
        str+=bin(Math.floor(a[2])>>b,bits)
      }else{ 
        str+="0"
      }
    }
  }
  console.log(str.length)
  str2=""
  chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  for(let i=0; i<str.length; i+=6){
    str2+=chars[Math.floor("0b"+(str.slice(i,i+6)))]
  }
  console.log(str2)
});