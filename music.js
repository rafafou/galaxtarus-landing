// music.js (version compacte — voir galaxtarus.com/music.js pour la version commentee)
(function(){
  var KILL='*,*::before,*::after{animation:none!important;transition:none!important;filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}#nebula-bg{display:none!important}#los{display:none!important}.grain{display:none!important}';
  var killed=false;
  function killDecor(){
    if(killed)return; killed=true;
    var s=document.createElement('style'); s.textContent=KILL;
    (document.head||document.documentElement).appendChild(s);
  }
  // Preference visiteur : 'on' / 'off' (memorisee). Defaut : mobile=off, ordi=on.
  var mobile = window.innerWidth <= 820;
  var pref; try{ pref = localStorage.getItem('gzAnim'); }catch(e){}
  var animOn = mobile ? (pref==='on') : (pref!=='off');

  if(!animOn){
    // Animation desactivee -> on coupe tout le decoratif (fond, L.O.S., effets).
    killDecor();
  } else {
    // Animation activee -> on laisse tourner, mais on coupe si la machine rame
    // (nebula.js pose la classe "perf-lite" sur <html> apres ~4,5 s de FPS bas).
    var root=document.documentElement;
    if(root.classList.contains('perf-lite')){ killDecor(); }
    else { try{ var mo=new MutationObserver(function(){ if(root.classList.contains('perf-lite')){ killDecor(); mo.disconnect(); } }); mo.observe(root,{attributes:true,attributeFilter:['class']}); }catch(e){} }
  }

  // Bouton "ANIM" insere entre MUSIQUE et GALAXTARUS dans la barre du haut.
  function addBtn(){
    if(document.getElementById('btn-anim')) return;
    var nav=document.querySelector('nav.top'); if(!nav) return;
    var brand=nav.querySelector('.brand');
    var b=document.createElement('button');
    b.id='btn-anim'; b.className='music-btn'; b.type='button';
    b.textContent = animOn ? '✦ ANIM ✓' : '✦ ANIM';
    b.title = animOn ? 'Animation activee (toucher pour desactiver)' : 'Activer l’animation de fond';
    b.onclick=function(){
      try{ localStorage.setItem('gzAnim', animOn ? 'off' : 'on'); }catch(e){}
      location.reload();
    };
    if(brand) nav.insertBefore(b, brand); else nav.appendChild(b);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
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
      if(btn)btn.innerHTML='&#9654; &nbsp;MUSIQUE';
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
  if(btn){btn.innerHTML='&#9208; &nbsp;MUSIQUE';btn.classList.add('playing');}
  if(!_rafId)_musicLoop();
}
function toggleMusic(){
  var btn=document.getElementById('btn-music');
  if(!_audioReady){
    if(_audioLoading)return;
    _audioLoading=true;
    if(btn)btn.innerHTML='&#8987; &nbsp;MUSIQUE';
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
    if(btn){btn.innerHTML='&#9654; &nbsp;MUSIQUE';btn.classList.remove('playing');}
  }
}
