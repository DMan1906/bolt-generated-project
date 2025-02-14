import React, { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { subtract } from 'three-js-csg';

function generateGearGeometry(teeth, module, pressureAngle, thickness) {
    const radius = (teeth * module) / 2;
    const addendum = module;
    const dedendum = 1.25 * module;
    const baseRadius = radius * Math.cos((pressureAngle * Math.PI) / 180);
    const outerRadius = radius + addendum;
    const rootRadius = radius - dedendum;

    const geometry = new THREE.CylinderGeometry(
      outerRadius,
      outerRadius,
      thickness,
      teeth * 2,
      1,
      false,
      0,
      Math.PI*2
    );

    const toothGeometry = new THREE.BoxGeometry(module*2, module*2, thickness);
    const subtractToothGeometry = new THREE.BoxGeometry(module * 2.1, module*2.1, thickness*1.1); // slightly bigger to avoid artifacts

    for (let i = 0; i < teeth; i++) {
        const angle = (i / teeth) * Math.PI * 2;

        // Position and rotate the tooth
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        const tooth = toothGeometry.clone();
        tooth.translate(x, y, 0);
        tooth.rotateZ(angle);

        const subTooth = subtractToothGeometry.clone();
        subTooth.translate(x,y,0);
        subTooth.rotateZ(angle);

        subtract(geometry, subTooth);
    }

    return geometry;
}

function Gear({ teeth, module, pressureAngle, thickness }) {
  const gearGeometry = generateGearGeometry(teeth, module, pressureAngle, thickness);

  return (
    <mesh geometry={gearGeometry}>
      <meshStandardMaterial color="silver" />
    </mesh>
  );
}

function downloadSTL(geometry, filename) {
    function stringifyVector(vec) {
        return `${vec.x} ${vec.y} ${vec.z}`;
    }

    let vertices = geometry.attributes.position.array;
    let normals = geometry.attributes.normal.array;
    let faces = [];

    if (vertices.length % 9 !== 0) {
        console.error("Invalid geometry for STL export. Number of vertices should be a multiple of 9 (3 vertices per triangle).");
        return;
    }

    for (let i = 0; i < vertices.length; i += 9) {
        // Extract vertices for the face
        const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
        const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

        // Extract normals (assuming one normal per vertex)
        const n1 = new THREE.Vector3(normals[i], normals[i+1], normals[i+2]);

        faces.push({v1, v2, v3, normal: n1});
    }

    let stl = "solid gear\n";
    for (const face of faces) {
        stl += `  facet normal ${stringifyVector(face.normal)}\n`;
        stl += "    outer loop\n";
        stl += `      vertex ${stringifyVector(face.v1)}\n`;
        stl += `      vertex ${stringifyVector(face.v2)}\n`;
        stl += `      vertex ${stringifyVector(face.v3)}\n`;
        stl += "    endloop\n";
        stl += "  endfacet\n";
    }
    stl += "endsolid gear\n";

  const blob = new Blob([stl], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function App() {
  const [teeth, setTeeth] = useState(12);
  const [module, setModule] = useState(1);
  const [pressureAngle, setPressureAngle] = useState(20);
  const [thickness, setThickness] = useState(2);
    const gearRef = useRef();

  const handleDownload = useCallback(() => {
    if (gearRef.current) {
        const geometry = generateGearGeometry(teeth, module, pressureAngle, thickness);
        // Convert geometry to indexed before download
        geometry.index = geometry.toNonIndexed().getIndex();
      downloadSTL(geometry, 'gear.stl');
    }
  }, [teeth, module, pressureAngle, thickness]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px' }}>
        <div>
          <label>Teeth: </label>
          <input type="number" value={teeth} onChange={(e) => setTeeth(parseInt(e.target.value))} />
        </div>
        <div>
          <label>Module: </label>
          <input type="number" step="0.1" value={module} onChange={(e) => setModule(parseFloat(e.target.value))} />
        </div>
        <div>
          <label>Pressure Angle: </label>
          <input type="number" step="0.1" value={pressureAngle} onChange={(e) => setPressureAngle(parseFloat(e.target.value))} />
        </div>
        <div>
          <label>Thickness: </label>
          <input type="number" step="0.1" value={thickness} onChange={(e) => setThickness(parseFloat(e.target.value))} />
        </div>
        <button onClick={handleDownload}>Download STL</button>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [10, 10, 10] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[1, 3, 2]} intensity={1} />
          <Gear ref={gearRef} teeth={teeth} module={module} pressureAngle={pressureAngle} thickness={thickness} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
