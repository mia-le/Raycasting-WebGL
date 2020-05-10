class ClippedQuadric extends UniformProvider {
    constructor(id, ...programs) {
        super(`clippedQuadrics[${id}]`);
        this.surface = new Mat4();
        this.clipper = new Mat4();
        this.otherClipper = new Mat4();
        this.materialColor = new Vec3();
        this.specularColor = new Vec3();
        this.procMix = 0.0;
        this.reflectance = new Vec3();
        this.checker = 0.0;
        this.wooden = 0.0;
        this.addComponentsAndGatherUniforms(...programs);
    }

    makeUnitSphere() {
        this.surface.set(
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            0,  0,  0, -1);

        this.clipper.set(
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            0,  0,  0, -2);
    }

    makeUnitCylinder() {
        this.surface.set(1, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, -1);
        this.clipper.set(0, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, -1);
    }

    makeUnitCone() {
        this.surface.set(
            1, 0, 0, 0,
            0, -0.2, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 0);

        this.clipper.set(
            0, 0, 0, 0,
            0, 1, 0, 4,
            0, 0, 0, 0,
            0, 0, 0, 0);
    }

    makeUnitParaboloid() {
        this.surface.set(
            1, 0, 0, 0,
            0, 0, 0, -1,
            0, 0, 1, 0,
            0, 0, 0, 0);

        this.clipper.set(
            0, 0, 0, 0,
            0, 1, 0, -1,
            0, 0, 0, 0,
            0, 0, 0, 0);
    }

    makePlane() {
        this.surface.set(
            0, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, -1);

        this.clipper.set(
            1, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, -900);

        this.otherClipper.set(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, -900);
    }

    makeBishopHead(){
        this.surface.set(
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            0,  0,  0, -1);

        this.clipper.set(
            0, 1, 0, 0.1,
            0,-4,0,0,
            0,0,0,0,
            -0.1,1,0,0);
    }

    // transforms both the surface and the clipper matrices according
    // to the transformation matrix T
    transform(T) {
        const S = T.clone();
        // transform surface
        S.invert();               // T is now T-1
        this.surface.premul(S);
        this.clipper.premul(S);   // A is now T-1 * A
        S.transpose();            // T is now T-1T
        this.surface.mul(S);
        this.clipper.mul(S);      // A is now A'
    }

    transformSurface(T) {
        const S = T.clone();
        S.invert();
        this.surface.premul(S);
        S.transpose();
        this.surface.mul(S);
    }

    transformClipping(T) {
        const S = T.clone();
        S.invert();
        this.clipper.premul(S);
        S.transpose();
        this.surface.mul(S);
    };
}
