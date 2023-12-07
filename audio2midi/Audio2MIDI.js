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
                wr = Math.cos(Math.PI * k / size);
                wi = Math.sin(Math.PI * k / size);

                E_Real = ar[k]
                E_Imag = ai[k]
                O_Real = ar[k+size]*wr - ai[k+size]*wi;
                O_Imag = ar[k+size]*wi + ai[k+size]*wr;

                ar[k]      = E_Real + O_Real;
                ai[k]      = E_Imag + O_Imag;
                ar[k+size] = E_Real - O_Real;
                ai[k+size] = E_Imag - O_Imag;
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
const audioContext = new AudioContext({sampleRate: 26000});
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
    while(b >= 128){
        m.push(0x80 | (b & 0x7f))
        b >>= 7
    }
    m.push(0x00 | (b & 0x7f))
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
        tmp = audio.slice(start - size/2,start+size/2);
        re = []
        im = []
        for(let i=0; i<tmp.length; i+=skip){
            re.push(tmp[i] || 0)
            im.push(0)
        }

        q = FFT([applyWindow(re),im]);
        div = Math.sqrt(size/skip);
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

        iter = 6
        for(let i=0; i<iter; i++){
            w = Math.sqrt(i+1)
            let q = FFTfrom(start,size*d,d);
            magnitude = []
            for(let i=0; i<q[0].length/2; i++){
                magnitude.push(Math.sqrt((q[0][i]**2) + (q[1][i]**2)))
            }
            l = magnitude.length
            binsizeAdjusted = binsize/d
            for(let i=0; i<l; i++){
                let n = i*binsizeAdjusted
                index = Math.round(freqToMidi(n))
                ilo = Math.round(freqToMidi(n - binsizeAdjusted/2))
                ihi = Math.round(freqToMidi(n + binsizeAdjusted/2))

                r = ihi - ilo + 1
                for(let j=ilo; j<ihi; j++){
                    MIDIframe[j] += (magnitude[i]/r - MIDIframe[j])/(8*Math.sqrt(Math.sqrt(d)))
                }
                MIDIframe[index] += (magnitude[i]/r - MIDIframe[index])/(8*Math.sqrt(Math.sqrt(d)))

            }
            //console.log(MIDIframe.slice())
            d *= 2
        }
        return MIDIframe
    }
    const FFTsize = 512
    timeIntervalms = 15
    k = 10

    MIDarray = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01]

    tempo = 120
    PPQN = 1920
    MIDarray = writeNumber(MIDarray, PPQN, 2)
    incr = tempo/60 * PPQN * timeIntervalms/1000

    MIDarray.push(0x4d, 0x54, 0x72, 0x6b)
    tbuffer = [0x00, 0xFF, 0x51, 0x03]
    tbuffer = writeNumber(tbuffer, 60000000/tempo, 3)

    for(let i = 0; i<9; i++){
        tbuffer.push(0, 0xC0 | i, 79)
    }

    time = 0
    timelast = 0
    function ch(n){
        return Math.min(n/16 | 0, 8)
    }
    samp = Math.ceil((len / rate) / (timeIntervalms / 1000))
    //samp = 1500
    //console.log(samp)
    for(let i=0; i<samp; i++){

        time = timelast 
        time += incr
        k = p(i * timeIntervalms/1000 * rate, FFTsize)
        for(let j=0; j<128; j++){
            val = Math.sqrt(k[j]/1) * 112
            //val = k[j] * 16 * 4
            k[j] = Math.min(Math.round(val), 127)
            if (val > 127){
                //console.log("maxout" , j, val)
            }
        }
        thres = 1
        for(let j=0; j<128; j++){
            n = k[j]
            if(n > thres){
                tbuffer.push(0x00, 0x90 | ch(n), j, n)
            }
        }
        tbuffer = writeVLQ(tbuffer, (time - timelast) | 0)
        tbuffer.push(0x9F, 0, 1)
        tbuffer.push(0x00, 0x8F, 0, 1)
        for(let j=0; j<128; j++){
            n = k[j]
            if(n > thres){
                tbuffer.push(0x00, 0x80 | ch(n), j, n)
            }
        }
        HTMLwritetext(`processing audio section ${i} of ${samp}\n${Math.round(i/samp * 10000)/100}% complete`)
        if(i % 128 == 0){await sleep(1)}
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
