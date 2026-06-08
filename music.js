// music.js — lecteur musique partagé pour le site LANDING2.
//
// Le moteur audio (AudioManager + MusicPlayer + thème, ~83 Ko) n'est PAS
// chargé au démarrage de la page : il est injecté à la DEMANDE, au premier
// clic sur le bouton MUSIC. Les visiteurs qui n'écoutent pas la musique ne
// téléchargent jamais ces 83 Ko. Compatible file:// (clé USB) : injection
// de <script> classique, pas de fetch.
//
// Les 3 fichiers audio sont embarqués localement dans LANDING2/audio/ → le site
// est autonome et se déploie tel quel (GitHub Pages, n'importe quel hébergeur).

var _audio = null;
var _music = null;
var _musicPlaying = false;
var _rafId = null;
var _audioReady = false;    // les 3 scripts moteur sont chargés
var _audioLoading = false;  // chargement en cours (garde anti double-clic)

// Scripts audio (locaux), dans l'ordre de dépendance.
var _AUDIO_SCRIPTS = [
  'audio/AudioManager.js',
  'audio/MusicPlayer.js',
  'audio/theme_galaxtarus.js'
];

// Charge une liste de <script> en séquence (respect de l'ordre), puis done().
function _loadAudioScripts(urls, done) {
  var i = 0;
  (function next() {
    if (i >= urls.length) { done(); return; }
    var s = document.createElement('script');
    s.src = urls[i++];
    s.onload = next;
    s.onerror = function () {
      console.error('music.js — échec de chargement : ' + s.src);
      _audioLoading = false;
      var btn = document.getElementById('btn-music');
      if (btn) btn.innerHTML = '&#9654; &nbsp;MUSIC';
    };
    document.head.appendChild(s);
  })();
}

function _musicLoop() {
  if (_music) _music.update();
  _rafId = requestAnimationFrame(_musicLoop);
}

// Démarre la lecture (moteur audio déjà chargé à ce stade).
function _startMusic() {
  var btn = document.getElementById('btn-music');
  if (!_audio) {
    _audio = new GALAXTARUS.audio.AudioManager();
    _music = new GALAXTARUS.audio.MusicPlayer(_audio);
  }
  _audio.init();
  _music.play('theme_galaxtarus');
  _musicPlaying = true;
  if (btn) { btn.innerHTML = '&#9208; &nbsp;MUSIC'; btn.classList.add('playing'); }
  if (!_rafId) _musicLoop();
}

function toggleMusic() {
  var btn = document.getElementById('btn-music');

  // Premier clic : charger le moteur audio à la demande, puis jouer.
  if (!_audioReady) {
    if (_audioLoading) return;  // déjà en cours, on ignore les re-clics
    _audioLoading = true;
    if (btn) btn.innerHTML = '&#8987; &nbsp;MUSIC';  // sablier pendant le chargement
    _loadAudioScripts(_AUDIO_SCRIPTS, function () {
      _audioReady = true;
      _audioLoading = false;
      _startMusic();
    });
    return;
  }

  // Clics suivants : lecture / pause normale.
  if (!_musicPlaying) {
    _startMusic();
  } else {
    _music.stop();
    _musicPlaying = false;
    if (btn) { btn.innerHTML = '&#9654; &nbsp;MUSIC'; btn.classList.remove('playing'); }
  }
}
