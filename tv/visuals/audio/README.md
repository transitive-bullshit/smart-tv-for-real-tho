# Visual-lab sample audio

Original, explicitly simulated dialogue for local visual testing. The voices are synthesized samples, not recordings of the owner or the live Realtime assistant.

| File | Dialogue | Kokoro voice |
| --- | --- | --- |
| `request.mp3` | “Hey, can you help me find something calm to watch tonight?” | `af_heart`, American English |
| `reply.mp3` | “Of course. Something quiet for a slower evening. How about a nature documentary?” | `bm_george`, British English |

Generated locally October 18, 2026 with Python 3.12.14, `kokoro-onnx` 0.6.1, `soundfile` 0.13.1 and the Kokoro v1.0 model. The upstream [model](https://huggingface.co/hexgrad/Kokoro-82M) and [voice data](https://huggingface.co/hexgrad/Kokoro-82M/tree/main/voices) are published under Apache-2.0; [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx#license) is MIT. Only the generated audio ships here; the model and generator are not build/runtime dependencies. The dialogue and resulting sample files are included under this project's MIT license.

Model files came from the maintainer's [model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1):

| File | SHA-256 |
| --- | --- |
| `kokoro-v1.0.onnx` | `beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a` |
| `voices-v1.0.bin` | `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |

To regenerate in a scratch directory with uv and ffmpeg:

```sh
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python kokoro-onnx==0.6.1 soundfile==0.13.1
curl -fL -o kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx
curl -fL -o voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin
.venv/bin/python - <<'PY'
import soundfile as sf
from kokoro_onnx import Kokoro

model = Kokoro('kokoro-v1.0.onnx', 'voices-v1.0.bin')
clips = [
    ('request', 'Hey, can you help me find something calm to watch tonight?', 'af_heart', 'en-us'),
    ('reply', 'Of course. Something quiet for a slower evening. How about a nature documentary?', 'bm_george', 'en-gb'),
]
for name, text, voice, lang in clips:
    samples, rate = model.create(text, voice=voice, speed=1.0, lang=lang)
    sf.write(name + '.wav', samples, rate, subtype='PCM_16')
PY
for clip in request reply; do
  ffmpeg -hide_banner -loglevel error -y -i "$clip.wav" \
    -af loudnorm=I=-19:TP=-3:LRA=7 -ar 24000 -ac 1 -b:a 48k \
    -map_metadata -1 "$clip.mp3"
done
```

The checked-in clips are 24 kHz mono MP3s, approximately 3.14 and 5.41 seconds long, with a target loudness of -19 LUFS and -3 dB true peak.
