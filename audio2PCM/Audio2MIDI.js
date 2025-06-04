const AudioContext = window.AudioContext || window.webkitAudioContext;
var name1; 
input.addEventListener("input", async function(){
	const file = input.files[0]
    let n = file.name
    name1 = n.slice(0,n.lastIndexOf("."))

    var reader = new FileReader(document.getElementById("input"));
    reader.onload = function(){
        var arr = reader.result;
        rate = document.getElementById("rate").value | 0

        uint8View = new Uint8Array(arr);
        const audioContext = new AudioContext({sampleRate: rate});
        Promise.resolve(audioContext.decodeAudioData(
            arr,
            ((v) => {processData(v)}),
            )) 
    };
    reader.readAsArrayBuffer(file); 
});

function processData(v){
    audio = v.getChannelData(0)
    //console.log(audio)
    f = (z) => (Math.min(Math.max((Math.round((z+1)*128)), 0),255)).toString(16).padStart(2, '0')
    s = ""
    for(let i=0; i<audio.length; i++){
        s += f(audio[i])
    }
    document.getElementById("text1").value = s
}
