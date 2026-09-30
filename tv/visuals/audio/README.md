# Visual-lab sample audio

Original, explicitly simulated dialogue for local visual testing. These are synthesized sample voices, not recordings of the owner or the live Realtime assistant.

- `request.mp3`: “Hey, can you help me find something calm to watch tonight?” — macOS Samantha, 175 words/minute.
- `reply.mp3`: “Of course. Something quiet for a slower evening. How about a nature documentary?” — macOS Daniel, 175 words/minute.

Generated September 30, 2026 with the built-in `say` command to AIFF, then encoded with ffmpeg: `-af loudnorm=I=-19:TP=-3:LRA=7 -ar 24000 -ac 1 -b:a 48k`. No third-party music, YouTube content, voice cloning, or owner microphone recording is included. No audio-generation dependency is required to build or play the bundled demo. Reassess synthesized-voice redistribution terms before the public release.
