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

		let controller1, controller2;
		let controllerGrip1, controllerGrip2;

		let raycaster;

		const intersected = [];
		const tempMatrix = new THREE.Matrix4();

		// let group;

		const intersectables = [];

		this.currentSession = null;

		const onSessionStarted = async ( session ) => {

			const sidebar = document.getElementById( 'sidebar' );
			sidebar.style.width = '300px';
			sidebar.style.height = '700px';

			//

			animate(scene, camera);

			if ( group === null ) {

				group = new InteractiveGroup( renderer );
				editor.sceneHelpers.add( group );

				const mesh = new HTMLMesh( sidebar );
				mesh.position.set( 1, 1.5, - 0.5 );
				mesh.rotation.y = - 0.5;
				mesh.scale.setScalar( 2 );
				group.add( mesh );

				intersectables.push( mesh );

				// get webcam
				video = document.getElementById( 'video' );
				video.style.display = 'none';
				document.body.appendChild( video );
				const texture = new THREE.VideoTexture( video );
				texture.colorSpace = THREE.SRGBColorSpace;

				// display webcam in VR environment
				const planeGeometry = new THREE.PlaneGeometry( 9, 16 );
				planeGeometry.scale( 0.075, 0.075, 0.075 );
				const material = new THREE.MeshBasicMaterial( { map: texture } );
				const planeMesh = new THREE.Mesh( planeGeometry, material );
				planeMesh.position.set( 0, 1.5, - 0.75 );
				group.add( planeMesh );
				intersectables.push( planeMesh );

				// // Grab

				// // Store the initial offset between the planeMesh and the controller
				// let offset = new THREE.Vector3();

				// // Add 'mousedown' event listener to the planeMesh
				// planeMesh.addEventListener('mousedown', function (event) {
				// offset.copy(planeMesh.position).sub(controller1.position); // Update the offset
				// planeMesh.parent = controller1; // Set the parent of planeMesh to controller1
				// });

				// // Add 'mousemove' event listener to the planeMesh
				// planeMesh.addEventListener('mousemove', function (event) {
				// if (planeMesh.parent === controller1) { // Check if the parent is set to controller1
				// 	const { x, y, z } = controller1.position.clone().add(offset);
				// 	planeMesh.position.set(x, y, z); // Update the position of the planeMesh
				// }
				// });

				// // Add 'mouseup' event listener to the planeMesh 
				// planeMesh.addEventListener('mouseup', function () {
				// planeMesh.parent = group; // Set the parent back to group
				// });

				// // controllers

				// const geometry = new THREE.BufferGeometry();
				// geometry.setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 5 ) ] );

				// const controller1 = renderer.xr.getController( 0 );
				// controller1.add( new THREE.Line( geometry ) );
				// group.add( controller1 );

				// const controller2 = renderer.xr.getController( 1 );
				// controller2.add( new THREE.Line( geometry ) );
				// group.add( controller2 );

				// //

				// const controllerModelFactory = new XRControllerModelFactory();

				// const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
				// controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
				// group.add( controllerGrip1 );

				// const controllerGrip2 = renderer.xr.getControllerGrip( 1 );
				// controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
				// group.add( controllerGrip2 );

				// controllers

				controller1 = renderer.xr.getController( 0 );
				controller1.addEventListener( 'selectstart', onSelectStart );
				controller1.addEventListener( 'selectend', onSelectEnd );
				group.add( controller1 );

				controller2 = renderer.xr.getController( 1 );
				controller2.addEventListener( 'selectstart', onSelectStart );
				controller2.addEventListener( 'selectend', onSelectEnd );
				group.add( controller2 );

				const controllerModelFactory = new XRControllerModelFactory();

				controllerGrip1 = renderer.xr.getControllerGrip( 0 );
				controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
				group.add( controllerGrip1 );

				controllerGrip2 = renderer.xr.getControllerGrip( 1 );
				controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
				group.add( controllerGrip2 );

				//

				const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );

				const line = new THREE.Line( geometry );
				line.name = 'line';
				line.scale.z = 5;

				controller1.add( line.clone() );
				controller2.add( line.clone() );

				raycaster = new THREE.Raycaster();

			}

			camera = editor.camera.clone();

			group.visible = true;

			this.currentSession = session;
			this.currentSession.addEventListener( 'end', onSessionEnded );

			await renderer.xr.setSession( this.currentSession );


			// stream webcam video
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


			// VR controller events
			function onSelectStart( event ) {

				const controller = event.target;

				const intersections = getIntersections( controller );

				if ( intersections.length > 0 ) {

					const intersection = intersections[ 0 ];

					const object = intersection.object;
					object.material.emissive.b = 1;
					controller.attach( object );

					controller.userData.selected = object;

				}

				controller.userData.targetRayMode = event.data.targetRayMode;

			}

			function onSelectEnd( event ) {

				const controller = event.target;

				if ( controller.userData.selected !== undefined ) {

					const object = controller.userData.selected;
					object.material.emissive.b = 0;
					group.attach( object );

					controller.userData.selected = undefined;

				}

			}

			function getIntersections( controller ) {

				controller.updateMatrixWorld();

				tempMatrix.identity().extractRotation( controller.matrixWorld );

				raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
				raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );

				return raycaster.intersectObjects( group.children, false );

			}

			function intersectObjects( controller ) {

				// Do not highlight in mobile-ar

				if ( controller.userData.targetRayMode === 'screen' ) return;

				// Do not highlight when already selected

				if ( controller.userData.selected !== undefined ) return;

				const line = controller.getObjectByName( 'line' );
				const intersections = getIntersections( controller );

				if ( intersections.length > 0 ) {

					const intersection = intersections[ 0 ];

					const object = intersection.object;
					object.material.emissive.r = 1;
					intersected.push( object );

					line.scale.z = intersection.distance;

				} else {

					line.scale.z = 5;

				}

			}

			function cleanIntersected() {

				while ( intersected.length ) {

					const object = intersected.pop();
					object.material.emissive.r = 0;

				}

			}

			function animate() {

				renderer.setAnimationLoop( render );

			}

			function render() {

				cleanIntersected();

				intersectObjects( controller1 );
				intersectObjects( controller2 );

				renderer.render( scene, camera );

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
