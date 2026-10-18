# Target user journeys

Updated September 30, 2026. These are the intended everyday and filmed experiences. [Roadmap](roadmap.md) owns priorities and pass criteria; [implementation status](implementation-status.md) records what actually worked. Core voice/media controls, baseline overlay coexistence and automatic ambient entry have physical evidence. Final animated design, repeatability and recovery still need their combined TV pass.

## 1. Talk to the room

Start on LG Home, or with Room Ambient showing. The laptop microphone and assistant speaker stay available as the TV changes source.

| Request | Intended result |
| --- | --- |
| “Open Hades on Xbox.” | Select the configured Xbox input, activate the installed game and show concise live assistant feedback. |
| “A little quieter.” | Lower the actual TV/soundbar output by two points without changing the picture or asking for an amount. |
| “Turn it down more.” | Lower it another five points immediately, with at most a brief “Quieter.” acknowledgment. |
| “Go to Xbox Home.” | Show the console dashboard. |
| “Back to TV Home.” | Show LG Home. |

Keep Xbox Home and TV Home distinct. Game activation does not mean a save has loaded; switching away does not promise to pause/save the game. Unattended testing remains at volume zero. Audible volume demonstrations require the owner to choose an appropriate level for the session.

## 2. Play music, correct it, control it

Start with Xbox visible; repeat from LG Home for cold/warm coverage. Use at least two unfamiliar song requests in validation.

| Request | Intended result |
| --- | --- |
| “Play [song] by [artist], the music video.” | Infer native YouTube, resolve a real search result, launch/connect when needed and play it. |
| “No, play [another song].” | Retain the artist when appropriate and replace the video in the current YouTube session. |
| “Actually, the live version.” | Refine the retained request and play the best plausible live result without asking the user to choose between reasonable matches. |
| “Skip ahead thirty seconds.” | Seek relative to a fresh observed position. |
| “Pause. … Continue.” | Pause/resume the current receiver. |
| “Back to Xbox.” | Pause YouTube explicitly, select Xbox HDMI and return to the console's actual state. |

Next/previous, speed, captions and autoplay are a separate extended-control acceptance row, not necessary to cram into the short film. The receiver’s queue/history determines next/previous. Captions require an available language. Ad skip stays disabled in the owner’s Premium setup. [Complete implemented tool surface](agent-tools.md).

## 3. The room becomes ambient

Start on LG Home with Room Ambient closed. After LG's native idle signal (about ten minutes in observed runs), the laptop opens the slideshow. Photos fill the screen, titles remain legible, motion stays gentle, and the selected scene does not repeat too soon. Normal YouTube/Xbox use must remain untouched.

OK reveals the ambient lab settings. Back hides settings first, then exits the app directly. A deliberate exit must respect the cooldown and require a new eligible idle transition before reopening. If the controller restarts or reconnects to an already-visible Home clock, it may recover after ten seconds of fresh stable idle observations and any saved cooldown. Test this existing-clock recovery and waking/standby separately; do not claim ambient activation from every app.

Two automatic Home-idle launches are recorded and the owner reports seeing the slideshow open automatically. The private foreground guard has several hours of positive display feedback. Detailed evidence and remaining checks are in [ambient scope and acceptance](ambient-screensaver.md#scope-and-acceptance). An awake controller is required for automatic entry; once open, the TV slideshow runs independently of that controller.

## 4. Change your mind and recover naturally

Interrupt a search or source transition with a new destination. The newest request takes priority, no delayed old result takes over, and the orb/text immediately follows the current request. If the receiver is unavailable, the assistant gives one short useful recovery message. The operator can reconnect and retry without re-entering valid credentials or reading raw logs.

This journey is a reliability requirement even when the final edit primarily shows the happy path. Confident, concise copy must remain truthful about errors and unobserved results.

## Shared presentation contract

The public landing page offers an explicitly scripted version of the room experience at `/demo/`, also buildable as a standalone static site. Visitors can try a request, correction, return to a fictional game and ambient artwork without a key, account or microphone. Fictional media and illustrative timing are labeled; this surface does not establish hardware acceptance. The owner selected a warm cinematic room and instant demo first, with optional live AI voice later. See [the launch story](launch-plan.md#landing-page-story).

Use plain-text links without decorative arrow icons. Internal controller/lab navigation stays in the same tab; external authentication and reference links may open separately.

The assistant overlay and laptop experience use the selected Ember Thinking Orbs + restrained Voice Glow treatment: warm orange foregrounds and accents against the existing cool cyan backgrounds and surfaces. Idle is calm; listening is attentive; thinking communicates work; speaking follows real response audio; completion settles quickly. Detailed timing, IDs and caveats belong in diagnostics. The preview lab retains exploratory themes; the everyday experience has one coherent default.

The overlay is native on the TV above YouTube/Xbox. Baseline coexistence is verified. The animated package shares the lab's renderer and receives real state/audio levels, is installed as 0.0.5 with short native frame-rate measurements, and still needs its combined sustained-performance checks. Updates within the same app should not relaunch it. Source transitions may require restoration; explicit dismissal should feel predictable. The existing brief native launch flash is acceptable for the initial demo.

Open mic is optional after an audible-room test. Push-to-talk with an independent microphone is an honest baseline; no Magic Remote voice integration or TV microphone support is implied. The exact filming sequence and result sheet live in [demo session](demo-session.md).

## Scope boundaries

Keep LG’s native apps, direct Xbox HDMI and the existing narrow adapters. This is semantic control of the listed devices/apps, not a general agent able to navigate any TV app or game. [Feasibility research](feasibility.md) preserves the original alternatives and supporting sources; it is not the current work queue.
