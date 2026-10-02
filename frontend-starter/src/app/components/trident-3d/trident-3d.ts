import { afterNextRender, Component, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { TridentComponent } from '../trident/trident';
import { tridentPolygons } from './trident-shapes';

/**
 * Trident en 3D (three.js) : la silhouette du trident vectoriel, extrudée en volume.
 * On peut le faire tourner à la souris ou au doigt ; il tourne lentement tout seul
 * (sauf si l'utilisateur a demandé moins d'animations).
 *
 * three.js est chargé à la demande (import dynamique) : il ne pèse pas sur le
 * chargement des autres pages. Sans WebGL (vieux navigateur, tests), on affiche
 * le trident 2D habituel.
 */
@Component({
  selector: 'app-trident-3d',
  imports: [TridentComponent],
  templateUrl: './trident-3d.html',
  styleUrl: './trident-3d.css',
})
export class Trident3dComponent implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly stage = viewChild<ElementRef<HTMLDivElement>>('stage');

  /** Faux si WebGL est indisponible : on retombe sur le trident 2D. */
  readonly webgl = signal(typeof WebGLRenderingContext !== 'undefined');

  /** Tout ce qu'il faudra libérer à la destruction du composant. */
  private cleanup: (() => void)[] = [];
  private destroyed = false;

  constructor() {
    // afterNextRender : le code ne s'exécute que dans le navigateur, une fois le
    // template affiché (la div #stage existe alors).
    afterNextRender(() => {
      if (this.webgl()) void this.start();
    });
  }

  private async start(): Promise<void> {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const stage = this.stage()?.nativeElement;
    if (this.destroyed || !stage) return;

    // ---- Rendu : canvas transparent (le fond de la page reste visible) ----
    let renderer: InstanceType<typeof THREE.WebGLRenderer>;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      this.webgl.set(false); // WebGL refusé par le navigateur
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    // ---- Le trident : chaque pièce est extrudée (épaisseur + bords biseautés) ----
    const material = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.65, roughness: 0.32 });
    const trident = new THREE.Group();
    for (const polygon of tridentPolygons()) {
      // SVG : y vers le bas ; three.js : y vers le haut, d'où le signe moins.
      const shape = new THREE.Shape(polygon.map(([x, y]) => new THREE.Vector2(x, -y)));
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 22,
        bevelEnabled: true,
        bevelThickness: 5,
        bevelSize: 3,
        bevelSegments: 3,
        curveSegments: 12,
      });
      trident.add(new THREE.Mesh(geometry, material));
    }

    // Centre le trident sur son milieu pour qu'il tourne sur lui-même.
    const box = new THREE.Box3().setFromObject(trident);
    trident.position.sub(box.getCenter(new THREE.Vector3()));
    const pivot = new THREE.Group();
    pivot.add(trident);
    pivot.scale.setScalar(1 / 400); // unités SVG (≈1000) → unités 3D (≈2,5)
    pivot.rotation.z = (-32 * Math.PI) / 180; // même inclinaison que le SVG
    scene.add(pivot);

    // ---- Lumières : reflets blancs sur le métal noir + contre-jour rouge ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff3344, 2.5);
    rim.position.set(-3, -2, -3);
    scene.add(rim);

    // Caméra à une distance qui fait tenir le trident dans le cadre. La sphère qui
    // l'englobe est large (il est long et fin) : on se rapproche un peu (× 0,7).
    const radius = new THREE.Box3().setFromObject(pivot).getBoundingSphere(new THREE.Sphere()).radius;
    camera.position.set(0, 0, (0.7 * radius) / Math.sin((camera.fov * Math.PI) / 360));

    // ---- Rotation à la souris / au doigt ----
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // la molette continue de faire défiler la page
    controls.enablePan = false;
    controls.enableDamping = true; // le mouvement s'amortit, plus naturel
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 2.5;

    // ---- Taille : suit celle du composant ----
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = stage;
      if (!width || !height) return;
      renderer.setSize(width, height); // dimensionne aussi le canvas en CSS
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    this.cleanup.push(() => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      trident.children.forEach((mesh) => (mesh as InstanceType<typeof THREE.Mesh>).geometry.dispose());
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cleanup.forEach((release) => release());
  }
}
