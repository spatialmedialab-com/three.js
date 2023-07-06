import * as THREE from 'three';

import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';

import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class VR {

	constructor( editor ) {

		const signals = editor.signals;

		let group = null;

		let camera = null;
		let renderer = null;

		let video = null;

		const intersectables = [];

		this.currentSession = null;

		const onSessionStarted = async ( session ) => {

			const sidebar = document.getElementById( 'sidebar' );
			sidebar.style.width = '300px';
			sidebar.style.height = '700px';

			//

			if ( group === null ) {

				group = new InteractiveGroup( renderer );
				editor.sceneHelpers.add( group );

				const mesh = new HTMLMesh( sidebar );
				mesh.position.set( 1, 1.5, - 0.5 );
				mesh.rotation.y = - 0.5;
				mesh.scale.setScalar( 2 );
				group.add( mesh );

				intersectables.push( mesh );

				video = document.getElementById( 'video' );
				video.style.display = 'none';
				document.body.appendChild( video );
				const texture = new THREE.VideoTexture( video );
				texture.colorSpace = THREE.SRGBColorSpace;

				const planeGeometry = new THREE.PlaneGeometry( 9, 16 );
				planeGeometry.scale( 0.075, 0.075, 0.075 );
				const material = new THREE.MeshBasicMaterial( { map: texture } );
				const planeMesh = new THREE.Mesh( planeGeometry, material );
				planeMesh.position.set( 0, 1.5, - 0.75 );
				group.add( planeMesh );
				intersectables.push( planeMesh );

				// Grab

				// Store the initial offset between the planeMesh and the controller
				let offset = new THREE.Vector3();

				// Add 'mousedown' event listener to the planeMesh
				planeMesh.addEventListener('mousedown', function (event) {
				offset.copy(planeMesh.position).sub(controller1.position); // Update the offset
				planeMesh.parent = controller1; // Set the parent of planeMesh to controller1
				});

				// Add 'mousemove' event listener to the planeMesh
				planeMesh.addEventListener('mousemove', function (event) {
				if (planeMesh.parent === controller1) { // Check if the parent is set to controller1
					const { x, y, z } = controller1.position.clone().add(offset);
					planeMesh.position.set(x, y, z); // Update the position of the planeMesh
				}
				});

				// Add 'mouseup' event listener to the planeMesh 
				planeMesh.addEventListener('mouseup', function () {
				planeMesh.parent = group; // Set the parent back to group
				});

				// controllers

				const geometry = new THREE.BufferGeometry();
				geometry.setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 5 ) ] );

				const controller1 = renderer.xr.getController( 0 );
				controller1.add( new THREE.Line( geometry ) );
				group.add( controller1 );

				const controller2 = renderer.xr.getController( 1 );
				controller2.add( new THREE.Line( geometry ) );
				group.add( controller2 );

				//

				const controllerModelFactory = new XRControllerModelFactory();

				const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
				controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
				group.add( controllerGrip1 );

				const controllerGrip2 = renderer.xr.getControllerGrip( 1 );
				controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
				group.add( controllerGrip2 );

			}

			camera = editor.camera.clone();

			group.visible = true;

			this.currentSession = session;
			this.currentSession.addEventListener( 'end', onSessionEnded );

			await renderer.xr.setSession( this.currentSession );

			if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {

				const constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };
				navigator.mediaDevices.getUserMedia( constraints )

					.then( stream => {

						video.srcObject = stream;
						video.play();

					} )
					.catch( error => {

						console.error( 'Unable to access the camera/webcam.', error );

					} );

			} else {

				console.error( 'MediaDevices interface not available.' );

			}

		};

		const onSessionEnded = async () => {

			const sidebar = document.getElementById( 'sidebar' );
			sidebar.style.width = '';
			sidebar.style.height = '';

			//

			editor.camera.copy( camera );

			group.visible = false;

			this.currentSession.removeEventListener( 'end', onSessionEnded );
			this.currentSession = null;

			await renderer.xr.setSession( null );

			signals.exitedVR.dispatch();

		};

		// signals

		signals.toggleVR.add( () => {

			if ( this.currentSession === null ) {

				const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor' ] };
				navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );

			} else {

				this.currentSession.end();

			}

		} );

		signals.rendererCreated.add( ( value ) => {

			renderer = value;
			renderer.xr.enabled = true;

		} );

	}

}

export { VR };
