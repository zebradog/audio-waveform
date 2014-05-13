var MAX_STROKE = 16;

var config = [];
config["resolution"] = 128;
config["stroke"] = view.size.width/config['resolution'];
config["wave offset"] = 0;
config["amplitude"] = 0.5;
config["play"] = true;
config["smooth"] = true;
config["export svg"] = function(){
	var svg = project.exportSVG({ asString: true });
	downloadDataUri({
		data: 'data:image/svg+xml;base64,' + btoa(svg),
		filename: 'export.svg'
	});
};
config["file"] =  'audio/male-spoken.mp3';
config["type"] = "peak";

var gui = new dat.GUI();
gui.add(config,'file',{
  "Male Speaking": 'audio/male-spoken.mp3',
  "Female Opera": 'audio/female-opera.mp3',
  "Tom's Diner": 'audio/toms-diner.mp3',
  "20-20k Sweep": 'audio/sweep.wav',
  "Impulse": 'audio/impulse.wav',
  "White Noise": 'audio/whitenoise.wav'
}).onChange(function(value) {
  view.pause();
  loadAudio(value);
  
});
gui.add(config, 'play').onChange(function(value){
  if(value){
    if(source) loadAudio(config["file"]);
  }else{
    if(source) source.stop();
  }
}).listen();
gui.add(config, 'stroke',0,MAX_STROKE).listen();
gui.add(config, 'resolution',16,2048).onChange(function(value){
  calculateData();
  var s = view.size.width/config['resolution'];
  config["stroke"] = s > MAX_STROKE ? MAX_STROKE : s;
});
gui.add(config, 'type',{
  'Sound Wave': 'peak',
  'Sound Pressure': 'rms'
}).onChange(function(value){
  calculateData();
});
var offsetControl = gui.add(config, 'wave offset',0,256).onChange(function(value){
  calculateData();
});
gui.add(config, 'amplitude',0,3);
gui.add(config, 'smooth');
gui.add(config, 'export svg');

var path = new Path({
  strokeColor: 'black',
  opacity: 1.0
});

var indicator = new Path.Circle(new Point(0, 0),6);
indicator.style = {
    fillColor: 'red'
};

var group = new Group({
  children: [path,indicator],
  strokeJoin: 'round',
  strokeCap: 'butt'
});

var audio, source, step, data;

view.onFrame = function() {

  group.strokeWidth = config["stroke"];
  indicator.visible = config["play"];

  if(data){
    path.removeSegments();
    var currentPosition = (audio.currentTime % source.buffer.duration)/source.buffer.duration;
    var selected = Math.floor(data.length * currentPosition);
    for (var i=0; i < data.length; i++) {
      var p = new Point(i * (view.size.width/data.length), data[i] * view.size.height * config["amplitude"] + view.size.height/2)
      path.add(p);
      if(config["play"] && i == selected) indicator.position = p;
    }
    group.position = view.center;
  }
  
  if(config["smooth"]) path.smooth();

  
}

var AudioContext = window.AudioContext || window.webkitAudioContext;
loadAudio(config["file"]);

function calculateData(){
  data = [];
  var leftChannel = source.buffer.getChannelData(0); // Float32Array describing left channel
  var step = Math.floor(source.buffer.length / config["resolution"]);
  if(config["type"] == "rms"){
    var j = 0;
    var rms = 0;
    for (var i = 0; i < leftChannel.length; i++) {
      var k = i % step;
      if(k){
        rms += leftChannel[i]*leftChannel[i];
      }else{
        rms /= step;
        data[j++] = -Math.sqrt(rms);
        rms = 0;
      }
    }
    
  }else{
    for (var i=0; i < config["resolution"]; i++) {
     var j = Math.floor(i*step)+Math.floor(config["wave offset"]);
     if(j >= leftChannel.length) j = leftChannel.length - 1;
      data[i] = leftChannel[j];
    }
  }
}

function loadAudio(file){
  view.pause();
  if (AudioContext) {
    if(!audio) audio = new AudioContext();
    if(source) source.stop();
    source = audio.createBufferSource();
    // Connect source to output also so we can hear it
    source.connect(audio.destination);
    loadAudioBuffer(file);
    
    config["play"] = true;
    
  } else {
    alert('Audio not supported');
  }
}

function loadAudioBuffer(url) {
  // Load asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    audio.decodeAudioData(
      request.response,
      function(buffer) {
        source.buffer = buffer;
        calculateData();
        source.loop = true;
        source.start(0);
        view.play();
      },

      function(buffer) {
        alert("Error loading MP3");
      }
    );
  };
  request.send();
}

function downloadDataUri(options) {
	if (!options.url)
		options.url = "http://download-data-uri.appspot.com/";
	$('<form method="post" action="' + options.url
		+ '" style="display:none"><input type="hidden" name="filename" value="'
		+ options.filename + '"/><input type="hidden" name="data" value="'
		+ options.data + '"/></form>').appendTo('body').submit().remove();
}