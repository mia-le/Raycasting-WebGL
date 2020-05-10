class Light extends UniformProvider {
    constructor(id, ...programs) {
        super(`lights[${id}]`);

        this.position = new Vec4();
        this.powerDensity = new Vec3();

        this.addComponentsAndGatherUniforms(...programs);
    }
}
