# Voice agent tool surface

Updated October 2, 2026. Tools are declared in `src/contracts.ts`, described and exposed in `src/realtime.ts`, and executed by `src/coordinator.ts`. Reconnect voice after instruction or tool changes; existing Realtime sessions keep their original configuration.

## Enabled tools

| Tool | User intent | Scope |
| --- | --- | --- |
| `get_room_state` | What is playing? What is the volume? | Connection state, TV foreground and volume/output, YouTube video ID/playback/position/duration, Xbox title when available. Video titles require metadata; this is not visual screen perception. |
| `start_game` | Open Hades | Configured installed game aliases only; selects Xbox HDMI. |
| `set_room_volume` | Set volume to ten; silence the TV | LG hardware volume, clamped to 0–configured maximum (currently 40). Zero silences output. |
| `change_room_volume` | Louder; quieter | Relative adjustment from fresh TV volume, delta -20 to +20 per call, same final volume cap. |
| `show_home` | TV Home; Xbox Home | Explicit target; Xbox Home also selects Xbox HDMI. |
| `find_youtube_video` | Find a song/video | Real YouTube Data API search; artist/song/version context retained for corrections. |
| `play_youtube_video` | Play the selected result | Opaque candidate ID from the current search; opens native LG YouTube when needed. |
| `control_video` | Pause; resume; next track; previous video | Native YouTube playback context determines next/previous. Previous may restart the current video. This does not create or edit a playlist. |
| `seek_video` | Jump to 1:30; forward 30 seconds; start over | Absolute or signed relative seconds; start over is absolute zero. Default unspecified forward/back jump: 10 seconds. |
| `set_video_speed` | Play at 1.5×; normal speed | 0.25–2×; the receiver may reject an unsupported rate. |
| `set_video_captions` | English captions; captions off | BCP-47 language such as `en` or `th`, or null to turn off. The requested language must be available for the current video. No available-track catalog is exposed yet. |
| `set_video_autoplay` | Turn autoplay off/on | Enables/disables native YouTube autoplay after the current video. |
| `return_to_xbox` | Back to Xbox | Pauses foreground YouTube then selects HDMI 3; does not relaunch, save, or pause a game. |

## Sound

The room-volume tools control LG's selected sound output, currently the HDMI ARC soundbar on HDMI 2. These are not separate YouTube-player volume controls. There is no dedicated mute/unmute tool with previous-volume restoration, output-selector tool, equalizer, or sound-mode control. During developer-run testing, retain the user's instruction to keep volume zero unless changed explicitly.

The voice prompt supplies amounts when the user omits them: 3 points normally, 2 for “a little,” 5 for “more,” and 10 for “much” or “a lot,” with the appropriate sign. “Turn it down more” requests another five-point reduction without clarification. Explicit amounts take priority; “again” repeats the last requested delta when known. The existing backend bounds and maximum still apply.

## Conditional ad skip

`skip_video_ad` is implemented but absent from the voice tool list when `youtubePremium` is true or `enableAdSkip` is false. The coordinator also rejects direct requests under either condition. Defaults and the current room are Premium=true, enableAdSkip=false. Premium is a configured declaration, not automatically inferred from YouTube authorization.

To enable for a non-Premium room, set both `youtubePremium: false` and `enableAdSkip: true` in ignored `.local/config.json`, reload the controller, and reconnect voice. Even then, the bridge requires a recent (at most ten seconds old) eligible-ad event. Missing, stale, consumed, new-ad, or disconnected eligibility cannot authorize another skip. It does not bypass unskippable ads. No live ad test was performed on this Premium account.

## Boundaries and verification

Next/previous, speed, captions, autoplay, and conditional ad skip have local tests. Their real-TV/voice checks remain pending as of this update. Settings/ad commands return accepted rather than pretending to have independently observed the setting. Existing seek controls have receiver checks, and the user subsequently reported they were working well.

The voice assistant favors the most likely reasonable interpretation of everyday reversible commands. It calls tools without a spoken preamble, then uses at most a short acknowledgment, usually 1–5 words. It chooses the best plausible search result and infers unspecified Home from the current source. Clarification is reserved for requests with no reasonable interpretation or usable arguments. Developer traces retain detailed outcomes; failures remain explicit and acceptance is not fabricated completion. These are prompt instructions; spoken behavior still needs a fresh-session check.

Pairing, account login, developer setup, overlay Show/Hide, diagnostic probes, and arbitrary remote navigation are operator controls, not voice tools. TV power, arbitrary HDMI selection, queue editing, shuffle/repeat, likes/subscriptions, video quality, and general in-app navigation are not currently exposed.
