import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function ModelViewer({ modelUrl, onClose }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);
  const [loadingError, setLoadingError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Detect file format from URL
    const getFileExtension = (url) => {
      const match = url.match(/\.([^./?#]+)(?:[?#]|$)/i);
      return match ? match[1].toLowerCase() : '';
    };

    const setupModel = (model) => {
      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center the model
      model.position.sub(center);

      // Scale to fit in view
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.multiplyScalar(scale);

      // Add model to scene
      scene.add(model);

      // Enable shadows on model
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Add default material if none exists
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
          }
        }
      });

      // Adjust camera to fit model
      camera.position.set(0, size.y * scale, size.z * scale * 2);
      controls.target.set(0, 0, 0);
      controls.update();

      setIsLoading(false);
    };

    const onError = (error) => {
      console.error('Error loading 3D model:', error);
      setLoadingError('Errore nel caricamento del modello 3D');
      setIsLoading(false);
    };

    // Load 3D model based on file extension
    const extension = getFileExtension(modelUrl);

    try {
      if (extension === 'gltf' || extension === 'glb') {
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf) => setupModel(gltf.scene),
          (progress) => console.log('Loading:', (progress.loaded / progress.total * 100) + '%'),
          onError
        );
      } else if (extension === 'obj') {
        const loader = new OBJLoader();
        loader.load(
          modelUrl,
          (obj) => setupModel(obj),
          (progress) => console.log('Loading:', (progress.loaded / progress.total * 100) + '%'),
          onError
        );
      } else if (extension === 'ply') {
        const loader = new PLYLoader();
        loader.load(
          modelUrl,
          (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc, flatShading: false });
            const mesh = new THREE.Mesh(geometry, material);
            setupModel(mesh);
          },
          (progress) => console.log('Loading:', (progress.loaded / progress.total * 100) + '%'),
          onError
        );
      } else if (extension === 'fbx') {
        const loader = new FBXLoader();
        loader.load(
          modelUrl,
          (fbx) => setupModel(fbx),
          (progress) => console.log('Loading:', (progress.loaded / progress.total * 100) + '%'),
          onError
        );
      } else {
        setLoadingError(`Formato non supportato: .${extension}`);
        setIsLoading(false);
      }
    } catch (error) {
      onError(error);
    }

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
    };
  }, [modelUrl]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      background: 'rgba(0,0,0,0.9)'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
        zIndex: 1001,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
          3D Model Viewer
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 1001
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div style={{ color: 'white', fontSize: '16px' }}>Caricamento modello 3D...</div>
        </div>
      )}

      {/* Error message */}
      {loadingError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(220, 38, 38, 0.9)',
          padding: '20px 32px',
          borderRadius: '12px',
          color: 'white',
          textAlign: 'center',
          zIndex: 1001,
          maxWidth: '80%'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Errore</div>
          <div style={{ fontSize: '14px' }}>{loadingError}</div>
        </div>
      )}

      {/* Controls info */}
      {!isLoading && !loadingError && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.7)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          zIndex: 1001
        }}>
          <div><strong>Controlli:</strong></div>
          <div>• Click sinistro + trascina: Ruota</div>
          <div>• Click destro + trascina: Sposta</div>
          <div>• Scroll: Zoom</div>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
