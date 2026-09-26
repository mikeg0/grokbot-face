# Face Lab

A standalone Grok Bot face animation playground with 18 shapes, 11 colors, 39 states, six actions, and a 30.75-second demo sequence. Everything runs in the browser from the included HTML, CSS, and JavaScript files.

## Run locally

Open `index.html` directly, or serve this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then visit <http://127.0.0.1:4173/>. No package installation or build is required.

## Controls

Choose a shape, state, color, or action to enter free play. Replay restarts the demo sequence, and dragging its timeline pauses and seeks. Move your pointer over the face during free play to control its gaze. Press **R** to randomize or **Space** to pause. Reduced-motion preferences start the demo paused.

## Publish on GitHub Pages

Push this directory to a public GitHub repository. In **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/ (root)**, then save. The site will be available at `https://<owner>.github.io/<repository>/`.

## Files

- `index.html`: page layout and controls.
- `styles.css`: page styling.
- `app.js`: interaction and demo sequence.
- `face-data.js`: shape, color, and state data.
- `face-runtime.js`: standalone renderer extracted from the local Grok Bot app.

The included renderer is ready to run; source extraction tools and the reference recording are not required.
