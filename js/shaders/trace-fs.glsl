Shader.source[document.currentScript.src.split('js/shaders/')[1]] = `#version 300 es 
precision highp float;

out vec4 fragmentColor;
in vec4 rayDir;

uniform struct {
    samplerCube envTexture;
} material;

uniform struct {
    mat4 viewProjMatrix;
    mat4 rayDirMatrix;
    vec3 position;
} camera;

uniform struct {
    mat4 surface;
    mat4 clipper;
    mat4 otherClipper;
    vec3 materialColor;
    vec3 specularColor;
    float procMix;
    vec3 reflectance;
    float checker;
    float wooden;
} clippedQuadrics[16];

uniform struct {
    vec4 position;
    vec3 powerDensity;
} lights[16];

int numClippedQuadrics = 10;
int numLights = 2;

/*
Returns ray parameter t for smallest positive solution
or a negative value if no positive intersection was found
*/
float intersectQuadric(mat4 A, vec4 e, vec4 d) {

    float a = dot(d * A, d);
    float b = dot(d * A, e) + dot(e * A, d);
    float c = dot(e * A, e);

    float discriminant = b*b - 4.0*a*c;

    // if no intersections, return t = -1
    if (discriminant < 0.0) {
        return -1.0;
    }

    // if intersections
    float t1 = (-b + sqrt(discriminant)) / 2.0 / a;
    float t2 = (-b - sqrt(discriminant)) / 2.0 / a;

    // return lesser positive of t1 and t2
    return (t1<0.0)?t2:((t2<0.0)?t1:min(t1, t2));
}

/*
Now also taking in a matrix B
quadric A clipped to quadric B
do ray intersection for A
discard hits not in B
*/
float intersectClippedQuadric(mat4 A, mat4 B, vec4 e, vec4 d) {

    float a = dot(d * A, d);
    float b = dot(d * A, e) + dot(e * A, d);
    float c = dot(e * A, e);

    float discriminant = b*b - 4.0*a*c;

    // if no intersections -> t negative
    if (discriminant < 0.0) {
        return -1.0;
    }

    // if intersections
    float t1 = (-b + sqrt(discriminant)) / 2.0 / a;
    float t2 = (-b - sqrt(discriminant)) / 2.0 / a;

    // determine intersection points
    vec4 r1 = e + d * t1;
    vec4 r2 = e + d * t2;

    // determine if points lie within the clipper
    if (dot(r1 * B, r1) > 0.0) {
        t1 = -1.0;
    }
    if (dot(r2 * B, r2) > 0.0) {
        t2 = -1.0;
    }

    // return lesser of t1 and t2
    return (t1<0.0)?t2:((t2<0.0)?t1:min(t1, t2));
}

/*
Now also taking in a matrix C
quadric A clipped to quadric B and C
do ray intersection for A
discard hits not in B or C
*/
float intersectClippedTwiceQuadric(mat4 A, mat4 B, mat4 C, vec4 e, vec4 d) {

    float a = dot(d * A, d);
    float b = dot(d * A, e) + dot(e * A, d);
    float c = dot(e * A, e);

    float discriminant = b*b - 4.0*a*c;

    // if no intersections -> t negative
    if (discriminant < 0.0) {
        return -1.0;
    }

    // if intersections
    float t1 = (-b + sqrt(discriminant)) / 2.0 / a;
    float t2 = (-b - sqrt(discriminant)) / 2.0 / a;

    // determine intersection points
    vec4 r1 = e + d * t1;
    vec4 r2 = e + d * t2;

    // determine if points lie within the clipper
    if (dot(r1 * B, r1) > 0.0 || dot(r1 * C, r1) > 0.0) {
        t1 = -1.0;
    }
    if (dot(r2 * B, r2) > 0.0 || dot(r2 * C, r2) > 0.0) {
        t2 = -1.0;
    }

    // return lesser of t1 and t2
    return (t1<0.0)?t2:((t2<0.0)?t1:min(t1, t2));
}

/*
  Find the closest hit for clipped quadrics
  */
bool findBestHit(vec4 e, vec4 d, out float t, out int index) {

    bool foundHit = false;
    float bestT = 99999.0;
    int bestIndex = 0;

    for (int i = 0; i < numClippedQuadrics; i++) {
        mat4 surface = clippedQuadrics[i].surface;
        mat4 clipper = clippedQuadrics[i].clipper;
        mat4 otherClipper = clippedQuadrics[i].otherClipper;

        float tCurrent = intersectClippedTwiceQuadric(surface, clipper, otherClipper, e, d);
        // no intersection
        if (tCurrent < 0.0) {
            continue;
        }
        //first found intersection
        else if (foundHit == false) {
            foundHit = true;
            bestT = tCurrent;
            bestIndex = i;
        }
        // update if closer than previous intersection
        else if (tCurrent < bestT) {
            foundHit = true;
            bestT = tCurrent;
            bestIndex = i;
        }
    }

    // if found a hit then output t and index
    if (foundHit) {
        t = bestT;
        index =  bestIndex;
    }

    return foundHit;
}

/* Using Max Phong-Blinn*/
vec3 shade(
vec3 normal, vec3 lightDir, vec3 viewDir,

vec3 powerDensity, vec3 materialColor, vec3 specularColor, float shininess) {

    float cosa =
    clamp( dot(lightDir, normal),0.0,1.0);
    float cosb = clamp(dot(viewDir, normal), 0.0, 1.0);

    vec3 halfway = normalize(viewDir + lightDir);
    float cosDelta = clamp( dot(halfway, normal), 0.0, 1.0);
    return
    (cosa * powerDensity * materialColor)
    + (powerDensity * specularColor * pow(cosDelta, shininess)) * cosa / max(cosb, cosa);

}


float snoise(vec3 r) {
    vec3 s = vec3(7502, 22777, 4767);
    float f = 0.0;
    for(int i=0; i<16; i++) {
        f += sin( dot(s - vec3(32768, 32768, 32768), r)
        / 65536.0);
        s = mod(s, 32768.0) * 2.0 + floor(s / 32768.0);
    }
    return f / 32.0 + 0.5;
}

vec3 makeWooden(vec3 position) {
    vec3 color1 = 5.0 * vec3(0.12, 0.049, 0.004);
    vec3 color2 = 5.0 * vec3(0.12, 0.076, 0.004);
    float freq = 2.0;
    float noiseFreq = 16.0;
    float noiseExp = 4.0;
    float noiseAmp = 5.0;

    float noise = pow(snoise(position * noiseFreq), noiseExp) * noiseAmp;
    float w = fract(position.z * freq + noise);

    return mix(color1, color2, w);
}





void main(void) {
    vec4 e = vec4(camera.position, 1);		 //< ray origin
    vec4 d = vec4(normalize(rayDir).xyz, 0); //< ray direction
    vec3 w = vec3(1, 1, 1); // product of reflectances so far


    for (int iteration = 0; iteration <5; iteration++) {

        float t = 0.0;
        int index = 0;
        bool hit = findBestHit(e, d, t, index);

        if (hit){
            mat4 surface = clippedQuadrics[index].surface;
            vec4 hitPos = e + d * t;
            vec3 normal = normalize((hitPos * surface + surface * hitPos).xyz);
            //if the normal is pointing inwards, this means that we are inside, then we flip it bac
            if(dot(normal, d.xyz) > 0.0) {
                normal *= -1.0;
            }

            vec3 materialColor = clippedQuadrics[index].materialColor;
             vec3 specularColor = clippedQuadrics[index].specularColor;
            float wooden = clippedQuadrics[index].wooden;
            int checker = int(clippedQuadrics[index].checker);
            float shininess = 100.0;

            //origin: surface point (hit) position slightly offset along normal
            vec4 shadowOrigin = hitPos + vec4(0.0001 * normal, 0);

            for (int i = 0; i < numLights; i++) {
                vec3 lightDiff = lights[i].position.xyz - hitPos.xyz / hitPos.w * lights[i].position.w;
                vec3 lightDir = normalize(lightDiff);
                float distanceSquared = dot(lightDiff, lightDiff);
                vec3 powerDensity = lights[i].powerDensity / distanceSquared;

                /*Set Checker Pattern*/
                if ( checker == 1){
                    vec3 oneColor = vec3(0., 0., 0.);
                    if ((fract(hitPos.x / 15.0)<0.5 && fract(hitPos.y /15.5)<0.5)
                    || (fract(hitPos.x / 15.0)>0.5 && fract(hitPos.y /15.0)>0.5)
                    ){
                        oneColor.rgb = abs(sin(vec3(0.0, 0.0, 0.0)));
                    } else {
                        oneColor.rgb = abs(sin(vec3(1.0, 1.0, 1.0)));
                    }
                    materialColor = oneColor;
                }

                materialColor = mix(materialColor, makeWooden(hitPos.xyz), wooden);

                /*Detect Shadow*/
                vec4 shadowDir = vec4(lightDir, 0);
                float bestShadowT = 0.0;
                int shadowIndex = 0;
                bool shadowRayHitSomething = findBestHit(shadowOrigin, shadowDir, bestShadowT, shadowIndex);

                // add light source contribution if needed
                if(!shadowRayHitSomething ||
                bestShadowT  * lights[i].position.w > sqrt(dot(lightDiff, lightDiff))) {
                    fragmentColor.rgb += w * shade(normal, lightDir, -d.xyz, powerDensity, materialColor, specularColor, shininess);
                }

                fragmentColor.rgb += shade(normal, lightDir, -d.xyz, powerDensity, materialColor, specularColor, shininess);
            }
            //update e, d, accumulate w
            e = shadowOrigin;
            d = vec4(reflect(d.xyz, normal), 0);
            w *= clippedQuadrics[index].reflectance;

            //break loop if w is near 0
            if (dot(w, w) < 0.01) {
                break;
            }

        } else {
            fragmentColor.rgb += w * texture(material.envTexture, d.xyz).xyz;
            w *= 0.0;
        }

    }
}

`;