"use strict";
/* exported Scene */
class Scene extends UniformProvider {
    constructor(gl) {
        super("scene");
        this.programs = [];

        this.vsQuad = new Shader(gl, gl.VERTEX_SHADER, "quad-vs.glsl");
        this.fsTrace = new Shader(gl, gl.FRAGMENT_SHADER, "trace-fs.glsl");
        this.programs.push(
            this.traceProgram = new TexturedProgram(gl, this.vsQuad, this.fsTrace));

        this.texturedQuadGeometry = new TexturedQuadGeometry(gl);

        this.timeAtFirstFrame = new Date().getTime();
        this.timeAtLastFrame = this.timeAtFirstFrame;

        this.gameObjects = [];

        this.traceMaterial = new Material(this.traceProgram);
        this.envTexture = new TextureCube(gl, [
            "media/posx512.jpg",
            "media/negx512.jpg",
            "media/posy512.jpg",
            "media/negy512.jpg",
            "media/posz512.jpg",
            "media/negz512.jpg",]
        );
        this.traceMaterial.envTexture.set(this.envTexture);
        this.traceMesh = new Mesh(this.traceMaterial, this.texturedQuadGeometry);

        this.traceQuad = new GameObject(this.traceMesh);
        this.gameObjects.push(this.traceQuad);

        this.camera = new PerspectiveCamera(...this.programs);
        this.camera.position.set(0, 5, 18);
        this.camera.update();
        this.addComponentsAndGatherUniforms(...this.programs);

        gl.enable(gl.DEPTH_TEST);

        /* LIGHTS */
        this.lights = [];

        this.sun = this.addLight();
        this.sunNormal = new Vec3(1,4,1);
        this.sunNormal = this.sunNormal.normalize();
        this.sun.position.set(1.2, 3, 2, 0);
        this.sun.powerDensity.set(9, 9, 9);

        this.pointLight = this.addLight();
        this.pointLight.position.set(0.0,1.0,1.0,1.0);
        this.pointLight.powerDensity.set(3, 3, 0);


        /* CLIPPED QUADRIC*/
        this.clippedQuadrics = [];

        const chessBoard = this.addClippedQuadric();
        chessBoard.makePlane();
        chessBoard.transform(new Mat4().translate(0, -5, 0));
        chessBoard.materialColor = new Vec3(1.0,0.0,0.5);
        chessBoard.checker = 1.0;

        const pawnHead = this.addClippedQuadric();
        pawnHead.makeUnitSphere();
        pawnHead.transform(new Mat4().scale(1.3,1.3,1.3).translate(-11, 0, -3));
        pawnHead.materialColor = new Vec3(1.0,1.0,1.0);
        pawnHead.wooden = 1.0;

        const pawnBody = this.addClippedQuadric();
        pawnBody.makeUnitCone();
        pawnBody.transform(new Mat4().scale(2,2,2).translate(-11, 0, -3));
        pawnBody.transform(new Mat4().translate(0, 0, 0));
        pawnBody.materialColor = new Vec3(1.0,1.0,1.0);
        pawnBody.wooden = 1.0;

        const kingCrown = this.addClippedQuadric();
        kingCrown.makeUnitParaboloid();
        kingCrown.transform(new Mat4().scale(1.9,1.9,1.4).translate(3.5, 1.8, -3));
        kingCrown.materialColor = new Vec3(1.0,1.0,1.0);

        const kingHead = this.addClippedQuadric();
        kingHead.makeUnitSphere();
        kingHead.transform(new Mat4().scale(1.4,1.4,1.4).translate(3.5, 1.5, -3));
        kingHead.materialColor = new Vec3(1.0,1.0,1.0);

        const kingBody = this.addClippedQuadric();
        kingBody.makeUnitCylinder();
        kingBody.transform(new Mat4().scale(1.5,2.8,1.4).translate(3.5, -2.2, -3));
        kingBody.materialColor = new Vec3(1.0,1.0,1.0);

        const bishopHead = this.addClippedQuadric();
        bishopHead.makeBishopHead();
        bishopHead.transform(new Mat4().scale(1.3,1.3,1.3).translate(11, 0.6, -3));
        bishopHead.materialColor = new Vec3(1.0,1.0,1.0);

        const bishopBody = this.addClippedQuadric();
        bishopBody.makeUnitCone();
        bishopBody.transform(new Mat4().scale(1,1,1).translate(11, 0, -3));
        bishopBody.materialColor = new Vec3(1.0,1.0,1.0);

        const rookHead = this.addClippedQuadric();
        rookHead.makeBishopHead();
        rookHead.transform(new Mat4().translate(-4, 0.5, -3));
        rookHead.materialColor = new Vec3(1.0,1.0,1.0);

        const rookBody = this.addClippedQuadric();
        rookBody.makeUnitCylinder();
        rookBody.transform(new Mat4().scale(1.5,1.7,1.4).translate(-4, -2.5, -3));
        rookBody.materialColor = new Vec3(1.0,1.0,1);
    }

    addClippedQuadric() {
        const clippedQuadric = new ClippedQuadric(this.clippedQuadrics.length, ...this.programs);
        clippedQuadric.materialColor.set(1, 1, 1);
        clippedQuadric.specularColor.set(1, 1, 1);
        clippedQuadric.reflectance.set(0, 0, 0);
        clippedQuadric.checker = 0;
        clippedQuadric.otherClipper.set(
            0,  0,  0,  0,
            0,  0,  0,  0,
            0,  0,  0,  0,
            0,  0,  0, 0);
        clippedQuadric.wooden = 0;
        this.clippedQuadrics.push(clippedQuadric);
        return clippedQuadric;
    }

    addLight() {
        const light = new Light(this.lights.length, ...this.programs);
        this.lights.push(light);
        return light;
    }

    resize(gl, canvas) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.camera.setAspectRatio(canvas.width / canvas.height);
    }

    update(gl, keysPressed) {
        //jshint bitwise:false
        //jshint unused:false
        const timeAtThisFrame = new Date().getTime();
        const dt = (timeAtThisFrame - this.timeAtLastFrame) / 1000.0;
        const t = (timeAtThisFrame - this.timeAtFirstFrame) / 1000.0;
        this.timeAtLastFrame = timeAtThisFrame;
        //this.time.set(t);
        this.time = t;

        // clear the screen
        gl.clearColor(0.3, 0.0, 0.3, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.camera.move(dt, keysPressed);

        for(const gameObject of this.gameObjects) {
            gameObject.draw(this, this.camera, ...this.clippedQuadrics,...this.lights);
        }


    }
}
