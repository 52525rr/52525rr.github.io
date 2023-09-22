const video = document.getElementById("video");
const input = document.getElementById("input");
const i1 = document.getElementById("canvas1");
const i2 = document.getElementById("canvas2");


power2Square = 256
width = power2Square
height = power2Square

W=power2Square; H=W
i1.width=W; i1.height=H
i2.width=W; i2.height=H
START = 0

FPS = 15
bits = 4
threshold = 128

bitmask = 0b11110000

size = 0
b=8-bits
OP=[]

var slider = document.getElementById("myRange");
var output = document.getElementById("demo");
slider.oninput = function() {
  if (START == 0){
  threshold = this.value
  output.innerHTML = `Threshold: ${this.value}`;
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

function get(x,y,frame){
  let i=(y*width+x)*4
  return ([frame[i++],frame[i++],frame[i++],frame[i++]])
}

function bin(x,b){
 return(String(x.toString(2).padStart(b, '0')))
}

function roundFrame(data){
  out = []
  for(let i = 0; i < data.length; i++){
    out.push(data[i] & bitmask)
  }
  return out
}

function coldist(c1, c2){
  return Math.sqrt(
    (c2[0] - c1[0]) ** 2 +
    (c2[1] - c1[1]) ** 2 +
    (c2[2] - c1[2]) ** 2 
  )
}

function average(x, y, s, frame = frameNow){
  let sum = [0, 0, 0]
  let ss = 0
  for(let j = y; j < y + s; j++){
    for(let i = x; i < x + s; i++){
      let col = get(i, j, frame)
      sum[0] += col[0]
      sum[1] += col[1] 
      sum[2] += col[2] 
      ss++
    }
  }
  return [sum[0]/ss,sum[1]/ss,sum[2]/ss]
}

function vector(x, y, s, frame = frameNow){
  let colComp = average(x, y, s, frame)
  let sum = 0
  for(let j = y; j < y + s; j++){
    for(let i = x; i < x + s; i++){
      sum += coldist(get(i,j,frame),colComp)
    }
  }
  return sum
}

function delta(x, y, s, frame1, frame2){
  let sum = 0
  let dt = 16
  let temp=[0,0,0,0]
  for(let j = y; j < y + s; j++){
    for(let i = x; i < x + s; i++){
      let c = get(i,j,frame1)
      let l = get(i,j,frame2)
      temp[0] = (Math.abs(c[0] - l[0])) / dt
      temp[1] = (Math.abs(c[1] - l[1])) / dt
      temp[2] = (Math.abs(c[2] - l[2])) / dt
      let t = Math.floor(temp[0]) + Math.floor(temp[1]) + Math.floor(temp[2])
      sum += t
    }
  }
  return sum/s/Math.sqrt(s)
}
function quadtree2(x, y, s){
  if(s <= 1 || vector(x,y,s) / s < threshold){
    return({
      'x': x,
      'y': y,
      'size': s,
      'color': average(x, y, s),
    })
  }
  let z = s/2
  return({
    'z1': quadtree2(x  , y  , z),
    'z2': quadtree2(x+z, y  , z),
    'z3': quadtree2(x  , y+z, z),
    'z4': quadtree2(x+z, y+z, z),
   })
}
function quadtree(x, y, s){
  if(delta(x,y,s,frameNow,frameLast) < 1){
    return({
      'x': x,
      'y': y,
      'size': s,
      'color': null,
    })
  }

  if(s <= 1 || vector(x,y,s,frameNow) / s < threshold){
    return({
      'x': x,
      'y': y,
      'size': s,
      'color': average(x, y, s),
    })
  }
  let z = s/2
  return({
    'z1': quadtree(x  , y  , z),
    'z2': quadtree(x+z, y  , z),
    'z3': quadtree(x  , y+z, z),
    'z4': quadtree(x+z, y+z, z),
   })
}

function draw(obj,target = ctx2){
  if(!obj.hasOwnProperty('z1')){
    if(obj.color != null){
      a = obj.color
      target.fillStyle = `rgb(${a[0]},${a[1]},${a[2]})`
      target.fillRect(obj.x,obj.y,obj.size,obj.size)
    }
  }else{
    draw(obj.z1)
    draw(obj.z2)
    draw(obj.z3)
    draw(obj.z4)
  }
}

function setpixel(x,y,val,target = treeBuf){

  let i = (y*width + x) * 4
  target[i++] = val[0]
  target[i++] = val[1]
  target[i++] = val[2]
}
function findDiffs(a1,a2){
  let o = {}
  for(let i = 0; i<Math.max(a1.length,a2.length);i++){
    if(Math.abs(a1[i] - a2[i]) >= 16){o[i+[]] = []+[a1[i],a2[i]]}
  }
  return(o)
}

function setsquare(x,y,s,val,target = treeBuf){
  if (val+[] == [253.00390625, 253.091796875, 251.671875]+[]){console.log(x,y,s)}

  for(let j = y; j < y + s; j++){
    for(let i = x; i < x + s; i++){
      setpixel(i,j,val,target)
    }
  }
}

function draw2(obj, target = treeBuf){
  if(!obj.hasOwnProperty('z1')){
    if(obj.color != null){
      setsquare(obj.x,obj.y,obj.size,obj.color,target)
    }
  }else{
    draw2(obj.z1,target)
    draw2(obj.z2,target)
    draw2(obj.z3,target)
    draw2(obj.z4,target)
  }
}

function encode(obj){
  if(!obj.hasOwnProperty('z1')){
    if(obj.color != null){
      let a = obj.color
      return `01${bin(a[0] >> 4, 4)}${bin(a[1] >> 4, 4)}${bin(a[2] >> 4, 4)}`
    }else{
      return `00`
    }
  }else{
    return `1${encode(obj.z1)}${encode(obj.z2)}${encode(obj.z3)}${encode(obj.z4)}`
  }
}

function encodeb64(str){
  str2=""
  chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  for(let i=0; i<str.length; i+=6){
    str2+=chars[Math.floor("0b"+(str.slice(i,i+6)))]
  }
  return str2
}
let started = false;
video.addEventListener("canplaythrough", async function(){
  if(started)
    return;
  started = true;

  video.height = 0; video.width = 0;
  video.currentTime = 0
  const FRAMES = Math.ceil(video.duration*FPS)

  ctx2.fillRect(0,0,power2Square,power2Square)
  START = 1
  let i=0;
  bitstream = ''
  frameLast = ctx2.getImageData(0, 0, width, height).data
  treeBuf = new Array(4*width*height).fill(0)
  treeBuf2= new Array(4*width*height).fill(0)
  while (i < FRAMES){
    i++;

    video.currentTime=i/FPS;
    await new Promise((resolve, reject) => seekResolve = resolve);

    ctx1.drawImage(video, 0, 0, width, height)
    frameNow = ctx1.getImageData(0, 0, width, height).data
    frameOut = quadtree2(0,0,256)

    draw2(frameOut,treeBuf)
    frameNow = treeBuf.slice()
    frameLast = treeBuf2.slice()
    frameOut = quadtree(0,0,256)

    draw(frameOut)
    draw2(frameOut,treeBuf2)

    bitstream += encode(frameOut)
    size = bitstream.length
    document.getElementById("F").innerText = `Frame ${i} / ${FRAMES}`;
    document.getElementById("S").innerText = `Total size ${Math.ceil(size/6)} bytes`;
    document.getElementById("P").innerText = `Projected size: ${Math.ceil(size/6 * FRAMES / i)} bytes`;
  }
  document.getElementById("text").value = encodeb64(bitstream)
});
