function FFT(a){
    ar = a[0];
    ai = a[1];

    function bitrev(n,b){
        let q = 0;
        for(let i=0; i<b; i++){
            q = (q<<1) | (n & 1);
            n >>= 1
        }
        return q
    }
    length = 1;
    q = 0;
    while(length < ar.length){
        length *= 2;
        q += 1;
    }
    for(let i=0; i<length; i++){
        r = bitrev(i,q);
        if(i < r){
            let temp = ar[i];
            ar[i] = ar[r];
            ar[r] = temp;
            temp  = ai[i];
            ai[i] = ai[r];
            ai[r] = temp;
        }
    }
    let size = 1
    for(let i1 = 0; i1 < q; i1++){
        k = 0;

        for(let i2 = 0; i2 < length/size/2; i2++){
            for(let i3 = 0; i3 < size; i3++){
                wr = Math.cos(Math.PI * k / size)
                wi = Math.sin(Math.PI * k / size)

                E_Real = ar[k]
                E_Imag = ai[k]
                O_Real = ar[k+size]*wr - ai[k+size]*wi
                O_Imag = ar[k+size]*wi + ai[k+size]*wr

                ar[k]      = E_Real + O_Real
                ai[k]      = E_Imag + O_Imag
                ar[k+size] = E_Real - O_Real
                ai[k+size] = E_Imag - O_Imag
                k++
            }
            k += size
        }
        size *= 2
    }
    return [ar, ai]
}

function HTMLwritetext(text){
    document.getElementById("text").innerHTML = text
}

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext({sampleRate: 36864});
var name1; 
input.addEventListener("input", async function(){
	const file = input.files[0]
    let n = file.name
    name1 = n.slice(0,n.lastIndexOf("."))

    var reader = new FileReader(document.getElementById("input"));
    reader.onload = function(){
        var arr = reader.result;

        uint8View = new Uint8Array(arr);
        HTMLwritetext("decoding data...")
        sleep(1)
        Promise.resolve(audioContext.decodeAudioData(
            arr,
            ((v) => {processData(v)}),
            )) 
    };
    reader.readAsArrayBuffer(file); 
});
function midiToFreq(n){
    return 440 * 2**((n-69)/12)
}
function freqToMidi(f){
    return Math.log2(f/440) * 12 + 69
}
function writeByte(m,b){
    m.push(b)
    return m
}
function writeVLQ(m,b){
    c = b;
    j = 0
    while(c > 0){
        c >>= 7
        j++
    }
    j = Math.max(j,1)
    for(let i=j-1; i>-1; i--){
        mask = (i == 0 ? 0x00: 0x80)
        m.push(mask | ((b >> (i*7) & 0x7f)))
    }
  return m
}
function writeNumber(m,b,s){
    for(let i=s-1; i >= 0; i--){
        m.push((b >> (i*8)) & 0xff)
    }
    return m
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function processData(v){

    audio = v.getChannelData(0)
    rate = v.sampleRate
    len = v.length
    console.log(v)
    //console.log(len)
    function applyWindow(a){
        let M = a.length;
        for(let i=0; i<M; i++){
            a[i] *= 0.5*(1 -Math.cos(2*Math.PI*i/M));
        }
        return a;
    }
    function FFTfrom(start,size,skip){
        tmp = []
        for(let i = start - size/2; i < start + size/2; i+=skip){
            s=0
            for(let j=i; j<i+skip; j++){
                s += audio[j]/skip
            }
            tmp.push(s || 0)

        }
        re = []
        im = []
        for(let i=0; i<tmp.length; i++){
            re.push(tmp[i] || 0)
            im.push(0)
        }

        q = FFT([applyWindow(re),im]);
        div = q[0].length;
        //div = size;
        for(let i = 0; i < size/skip; i++){
            q[0][i] /= div;
            q[1][i] /= div;
        }
        return q
    }
    
    function p(start,size){
        
        let binsize = rate/size;
        //console.log(binsize)
        let r = new Array(size/2).fill(0);
        d = 1;
        MIDIframe = new Array(128).fill(0)

        iter = 7
        for(let i=0; i<iter; i++){
            w = Math.sqrt(i+1)
            let q = FFTfrom(start,size*d,d);
            magnitude = []
            for(let i=0; i<q[0].length/2 + 1; i++){
                magnitude.push(Math.sqrt((q[0][i]**2) + (q[1][i]**2)))
            }
            l = magnitude.length
            binsizeAdjusted = binsize/d
            for(let i=0; i<l; i++){
                let n = i*binsizeAdjusted
                index = Math.round(freqToMidi(n))
                ilo = Math.round(freqToMidi(n - binsizeAdjusted/2))
                ihi = Math.round(freqToMidi(n + binsizeAdjusted/2))

                r = ihi - ilo + 1// average frequency bins over the frequency range it represents
                for(let j=ilo; j<ihi; j++){
                    MIDIframe[j] += (magnitude[i]/r - MIDIframe[j])/(5)
                }
                MIDIframe[index] += (magnitude[i]/r - MIDIframe[index])/(5)

            }
            //console.log(MIDIframe.slice())
            d *= 2
        }
        return MIDIframe
    }
    const FFTsize = 256
    timeIntervalms = 1/72 * 1000
    k = 10
    ////////////////////////////////////////////////////////////
    // MThd
    MIDarray = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01]

    tempo = 120
    PPQN = 1920
    MIDarray = writeNumber(MIDarray, PPQN, 2)
    incr = tempo/60 * PPQN * timeIntervalms/1000
    ////////////////////////////////////////////////////////////
    // MTrk
    MIDarray.push(0x4d, 0x54, 0x72, 0x6b)
    tbuffer = [0x00, 0xFF, 0x51, 0x03]
    tbuffer = writeNumber(tbuffer, 60000000/tempo, 3)
    ////////////////////////////////////////////////////////////
    // instrument of all channels to ocarina
    for(let i = 0; i<16; i++){
        tbuffer.push(0, 0xC0 | i, 79)
    }

    time = 0
    timelast = 0
    ////////////////////////////////////////////////////////////
    // tp determine number of ticks in total
    samp = Math.ceil((len / rate) / (timeIntervalms / 1000))
    //samp = 1500
    //console.log(samp)
    notesustain = document.getElementById("notestustain").value
    ////////////////////////////////////////////////////////////
    // tracks the volume of the last tick
    sustain = new Array(128).fill(0)
    timestart = new Array(128).fill(0)
    //valtovel = [32, 45, 55, 64, 71, 78, 84, 90, 96, 101, 106, 110, 115, 119, 123];
    //valtovel = [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 127];
    valtovel = [32, 45, 55, 64, 71, 78, 84, 90, 96, 101, 106, 110, 115, 119, 123];

    for(let i=0; i<samp; i++){
        // do the fft
        //time = timelast 
        time += incr
        thres = 4

        k = p((i * timeIntervalms/1000 * rate) | 0, FFTsize)
        for(let j=0; j<128; j++){
            //val = Math.sqrt(k[j]/32) * 90
            //val = Math.sqrt(k[j]) * 100
            val = (k[j]) * 256 * 16

            k[j] = Math.max(Math.min(Math.round(val), 127),0)
            if (val > 127){
                console.log("maxout" , j, val)
            }
        }
        // output to MIDI events
        // k: array - of volume of each notes 
        charray = [0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,15]
        for(let j=0; j<128; j++){
            
            n = Math.floor((k[j])/thres) // I THOUGHT its between 0 ... 1
            //n = Math.floor((k[j])/16*8)
            ln = sustain[j]
            
            while (n > ln){
              tbuffer = writeVLQ(tbuffer,(time-timelast)|0)
              timelast = time
              q = charray[ln] || 0
              tbuffer.push(0x90 | q,j,valtovel[ln])
              ln++
            }
            while (n < ln){
              tbuffer = writeVLQ(tbuffer,(time-timelast)|0)
              timelast = time
              ln--
              q = charray[ln] || 0
              tbuffer.push(0x80 | q,j,valtovel[ln])
            }

            sustain[j] = ln
        }

        HTMLwritetext(`processing audio section ${i} of ${samp}\n${Math.round(i/samp * 10000)/100}% complete`)
        if(i % 128 == 0){await sleep(1)}
    }
    for(let j=0; j<128; j++){
        n = Math.round((k[j])/thres) 
        ln = sustain[j] || 0
        
        //while (n > ln){
        //  tbuffer = writeVLQ(tbuffer,(time-timelast)|0)
        //  timelast = time
        //  q = charray[ln]
        //  tbuffer.push(0x90 | q,j,valtovel[ln])
        //  ln++
        //}
        while (0 < ln){
          tbuffer = writeVLQ(tbuffer,(time-timelast)|0)
          timelast = time
          ln--
          q = charray[ln] || 0
          tbuffer.push(0x80 | q,j,valtovel[ln])
        }
        
        sustain[j] = ln
    }
    tbuffer.push(0x00, 0xFF, 0x2F, 0x00)
    len = writeNumber([], tbuffer.length, 4)
    MIDarray = MIDarray.concat(len ,tbuffer)
    //console.log(MIDarray)

    filename = `${name1}.mid`

    HTMLwritetext(`conversion complete! downloading as ${filename}`)
    var byteArray = new Uint8Array(MIDarray);
	var a = window.document.createElement('a');

	a.href = window.URL.createObjectURL(new Blob([byteArray], { type: 'application/octet-stream' }));
	a.download = filename;

	document.body.appendChild(a)
	a.click();

	document.body.removeChild(a) 
}
