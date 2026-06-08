// music.js (version compacte — voir galaxtarus.com/music.js pour la version commentee)
(function(){
  var KILL='*,*::before,*::after{animation:none!important;transition:none!important;filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}#nebula-bg{display:none!important}#los{display:none!important}.grain{display:none!important}';
  var done=false;
  function killDecor(){
    if(done)return; done=true;
    var s=document.createElement('style'); s.textContent=KILL;
    (document.head||document.documentElement).appendChild(s);
  }
  // Mobile (<=820px) : on coupe tout de suite.
  if(window.innerWidth<=820){ killDecor(); return; }
  // Desktop : si nebula.js detecte une machine lente, il pose la classe
  // "perf-lite" sur <html> (apres ~4,5 s de FPS bas). On ecoute ca et on coupe
  // aussi tout le decoratif (L.O.S., flous, lueurs, animations, fond).
  var root=document.documentElement;
  if(root.classList.contains('perf-lite')){ killDecor(); return; }
  try{
    var mo=new MutationObserver(function(){
      if(root.classList.contains('perf-lite')){ killDecor(); mo.disconnect(); }
    });
    mo.observe(root,{attributes:true,attributeFilter:['class']});
  }catch(e){}
})();
var _audio=null,_music=null,_musicPlaying=false,_rafId=null,_audioReady=false,_audioLoading=false;
var _AUDIO_SCRIPTS=['audio/AudioManager.js','audio/MusicPlayer.js','audio/theme_galaxtarus.js'];
function _loadAudioScripts(urls,done){
  var i=0;
  (function next(){
    if(i>=urls.length){done();return;}
    var s=document.createElement('script');
    s.src=urls[i++];
    s.onload=next;
    s.onerror=function(){
      console.error('music.js load fail: '+s.src);
      _audioLoading=false;
      var btn=document.getElementById('btn-music');
      if(btn)btn.innerHTML='&#9654; &nbsp;MUSIC';
    };
    document.head.appendChild(s);
  })();
}
function _musicLoop(){
  if(_music)_music.update();
  _rafId=requestAnimationFrame(_musicLoop);
}
function _startMusic(){
  var btn=document.getElementById('btn-music');
  if(!_audio){
    _audio=new GALAXTARUS.audio.AudioManager();
    _music=new GALAXTARUS.audio.MusicPlayer(_audio);
  }
  _audio.init();
  _music.play('theme_galaxtarus');
  _musicPlaying=true;
  if(btn){btn.innerHTML='&#9208; &nbsp;MUSIC';btn.classList.add('playing');}
  if(!_rafId)_musicLoop();
}
function toggleMusic(){
  var btn=document.getElementById('btn-music');
  if(!_audioReady){
    if(_audioLoading)return;
    _audioLoading=true;
    if(btn)btn.innerHTML='&#8987; &nbsp;MUSIC';
    _loadAudioScripts(_AUDIO_SCRIPTS,function(){
      _audioReady=true;
      _audioLoading=false;
      _startMusic();
    });
    return;
  }
  if(!_musicPlaying){
    _startMusic();
  }else{
    _music.stop();
    _musicPlaying=false;
    if(btn){btn.innerHTML='&#9654; &nbsp;MUSIC';btn.classList.remove('playing');}
  }
}
