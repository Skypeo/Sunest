const { useEffect } = React;

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "tilt": 22,
  "yaw": -28,
  "rows": 3,
  "cols": 4,
  "cellsPerModule": 4,
  "frameColor": "#f3f3f3",
  "cellColor": "#0e1a2b",
  "envIntensity": 1.0,
  "sunIntensity": 1.6,
  "sunAngle": 55,
  "sunAzimuth": -40,
  "autoRotate": false,
  "showShadow": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULS);

  // Push every tweak change down into the Three.js scene
  useEffect(() => {
    const apply = () => {
      if (window.__updatePanel) {
        window.__updatePanel(tweaks);
        return true;
      }
      return false;
    };
    if (!apply()) {
      const id = setInterval(() => { if (apply()) clearInterval(id); }, 50);
      return () => clearInterval(id);
    }
  }, [tweaks]);

  const {
    TweaksPanel, TweakSection, TweakSlider, TweakToggle,
    TweakColor, TweakRadio, TweakButton
  } = window;

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Orientation" />
      <TweakSlider label="Inclinaison" value={tweaks.tilt}
        min={0} max={45} step={1} unit="°"
        onChange={(v) => setTweak('tilt', v)} />
      <TweakSlider label="Rotation" value={tweaks.yaw}
        min={-180} max={180} step={1} unit="°"
        onChange={(v) => setTweak('yaw', v)} />
      <TweakToggle label="Rotation auto" value={tweaks.autoRotate}
        onChange={(v) => setTweak('autoRotate', v)} />

      <TweakSection label="Géométrie" />
      <TweakSlider label="Colonnes" value={tweaks.cols}
        min={2} max={8} step={1}
        onChange={(v) => setTweak('cols', v)} />
      <TweakSlider label="Rangées" value={tweaks.rows}
        min={2} max={6} step={1}
        onChange={(v) => setTweak('rows', v)} />
      <TweakRadio label="Cellules / module" value={tweaks.cellsPerModule}
        options={[
          { label: '3×3', value: 3 },
          { label: '4×4', value: 4 },
          { label: '5×5', value: 5 },
        ]}
        onChange={(v) => setTweak('cellsPerModule', v)} />

      <TweakSection label="Matériaux" />
      <TweakColor label="Cadre" value={tweaks.frameColor}
        onChange={(v) => setTweak('frameColor', v)} />
      <TweakColor label="Cellules" value={tweaks.cellColor}
        onChange={(v) => setTweak('cellColor', v)} />
      <TweakSlider label="Reflets (env)" value={tweaks.envIntensity}
        min={0} max={2.5} step={0.05}
        onChange={(v) => setTweak('envIntensity', v)} />

      <TweakSection label="Éclairage" />
      <TweakSlider label="Intensité soleil" value={tweaks.sunIntensity}
        min={0} max={3.5} step={0.05}
        onChange={(v) => setTweak('sunIntensity', v)} />
      <TweakSlider label="Hauteur soleil" value={tweaks.sunAngle}
        min={5} max={90} step={1} unit="°"
        onChange={(v) => setTweak('sunAngle', v)} />
      <TweakSlider label="Azimut soleil" value={tweaks.sunAzimuth}
        min={-180} max={180} step={1} unit="°"
        onChange={(v) => setTweak('sunAzimuth', v)} />
      <TweakToggle label="Ombre portée" value={tweaks.showShadow}
        onChange={(v) => setTweak('showShadow', v)} />

      <TweakSection label="Préréglages" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <TweakButton label="Référence" secondary
          onClick={() => setTweak({ tilt: 22, yaw: -28, sunAngle: 55, sunAzimuth: -40, sunIntensity: 1.6 })} />
        <TweakButton label="De face" secondary
          onClick={() => setTweak({ tilt: 0, yaw: 0, sunAngle: 80, sunAzimuth: 0, sunIntensity: 1.4 })} />
        <TweakButton label="Coucher" secondary
          onClick={() => setTweak({ tilt: 35, yaw: 45, sunAngle: 25, sunAzimuth: 70, sunIntensity: 2.2 })} />
        <TweakButton label="Vue arrière" secondary
          onClick={() => setTweak({ tilt: 15, yaw: 180, sunAngle: 70, sunAzimuth: -20, sunIntensity: 1.2 })} />
      </div>
    </TweaksPanel>
  );
}

const mountEl = document.createElement('div');
document.body.appendChild(mountEl);
ReactDOM.createRoot(mountEl).render(<App />);
