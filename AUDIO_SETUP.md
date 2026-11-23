# Approved audio comparison setup

The A/B player is implemented but does not publish any audio by default.

1. Obtain written permission for both before and after recordings.
2. Export aligned audio files of equal duration. Match perceived loudness (integrated LUFS as a starting point) and check true peak to avoid clipping.
3. Place approved files under `audio/` and add a configuration script BEFORE `audio-demos.js` on the homepage:

```html
<script>window.AUDIO_MANIFEST=[{title:"Approved vocal demo",description:"Artist and credits (with permission)",before:"audio/vocal-before.mp3",after:"audio/vocal-after.mp3",permissionConfirmed:true}];</script>
```

4. Verify switching, level match, timing alignment and playback on mobile Safari/Chrome.

No sample audio, Spotify IDs or official cover art were fabricated.
