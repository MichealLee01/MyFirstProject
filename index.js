import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import * as TWEEN from 'three/addons/libs/tween.module.js';
//引入效果合成器扩展库
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// 引入渲染器通道RenderPass
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// 引入OutlinePass通道
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
// 引入CSS2渲染器CSS2DRenderer
import { CSS3DRenderer, CSS3DSprite, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30,window.innerWidth/window.innerHeight,1,3000);
camera.position.set(0, 70, 150);
camera.lookAt(0,0,-20);
scene.add(camera);
// const axeshelper = new THREE.AxesHelper(10);
// scene.add(axeshelper);
const gridHelper = new THREE.GridHelper(500,200,0x444444,0x888888);
scene.add(gridHelper);
const render = new THREE.WebGLRenderer({
    // 设置抗锯齿
  antialias: true,
  logarithmicDepthBuffer: true,
});
render.setSize(window.innerWidth,window.innerHeight);
render.render(scene,camera);
const amblight = new THREE.AmbientLight(0xffffff); // 柔和的白色环境光
scene.add(amblight);

let meters = [];
let otherObjs = [];
let otherMaterials = [];
let lineSegments = [];
// 初始化进度条  
const progressElement = document.getElementById('progress-fill');  
function updateProgress(percent) {  
    progressElement.style.width = percent + '%';  
    progressElement.textContent = percent + '%';  
}  
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./source/draco/");
// 添加draco载入库
loader.setDRACOLoader(dracoLoader);
loader.load("./source/思创大厦.gltf",function(gltf){
    //递归遍历
    gltf.scene.traverse(function(obj){
        if(obj.name.includes("表")){
            meters.push(obj);
        }
        if(obj.isMesh){
            otherObjs.push(obj);
            otherMaterials.push(obj.material);
        }
    });
    scene.add(gltf.scene);
    updateProgress(100); 
    const progressBar = document.getElementById('progress-bar');  
    progressBar.style.visibility = "hidden";
}, 
function (xhr) {  
    // 加载中，根据xhr.loaded和xhr.total计算进度  
    if (xhr.total) {  
        let percentComplete = (Math.min(xhr.loaded / xhr.total, 1) * 100).toFixed(2);  
        console.log(xhr.loaded, xhr.total);
        updateProgress(percentComplete);  
    }  
});

//添加一个巨大的天空球体
const skyGeometry = new THREE.SphereGeometry(1000);
const skyMaterial = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load("./source/backgroup.png"),
});
skyGeometry.scale(1, 1, -1);
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

const lightfront = new THREE.DirectionalLight(0xffffff, 3);
lightfront.position.set(0, 50, 100);
scene.add(lightfront);
const lightback = new THREE.DirectionalLight(0xffffff, 2);
lightback.position.set(0, 50, -100);
scene.add(lightback);
const lightright = new THREE.DirectionalLight(0xffffff, 2);
lightright.position.set(150, 50, 0);
scene.add(lightright);
const lightleftt = new THREE.DirectionalLight(0xffffff, 2);
lightleftt.position.set(-150, 50, 0);
scene.add(lightleftt);

const roomlight = new THREE.PointLight(0xFFFFFF,2);
roomlight.decay = 0;
roomlight.position.set(20,2,-5);
scene.add(roomlight);

document.getElementById("webgl").appendChild(render.domElement);
const controls = new OrbitControls(camera,render.domElement);
controls.enableDamping = true;//控制阻尼器
controls.maxDistance = 350;
window.onresize = function(){
    render.setSize(window.innerWidth,window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
}

let floors = [2,6,10,14,18];
//电梯当前所在高度
let currentHeight1 = 2;
let currentHeight2 = 2;
//添加电梯
const elevatorMesh1 = new THREE.Mesh(
    new THREE.BoxGeometry(2,4,3),
    new THREE.MeshBasicMaterial({color:0x99FF00,})
);
elevatorMesh1.position.set(4,2,-21.5);
scene.add(elevatorMesh1);
const elevatorMesh2 = new THREE.Mesh(
    new THREE.BoxGeometry(2,4,3),
    new THREE.MeshBasicMaterial({color:0x77FF00,})
);
elevatorMesh2.position.set(-4,2,-21.5);
scene.add(elevatorMesh2);
//电梯的补间动画
function elevatorMove(elevatorId,height,time){
    if(elevatorId == 1){
        const elevator1Tween = new TWEEN.Tween(elevatorMesh1.position);
        elevator1Tween.to({
            y:height
        },time);
        elevator1Tween.easing(TWEEN.Easing.Quadratic.InOut);
        elevator1Tween.start();
    }
    else{
        const elevator2Tween = new TWEEN.Tween(elevatorMesh2.position);
        elevator2Tween.to({
            y:height
        },time);
        elevator2Tween.easing(TWEEN.Easing.Quadratic.InOut);
        elevator2Tween.start();
    }
}

function ShowLineSegments(obj){
    if(obj.parent.name.includes("表")) return;
    lineSegments = [];
    const edges = new THREE.EdgesGeometry(obj.geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
        color:0x00ffff,
    })
    const line = new THREE.LineSegments(edges,edgesMaterial);
    obj.add(line);
    lineSegments.push(line);
    obj.material = new THREE.MeshLambertMaterial({
        color:0x004444,
        transparent:true,
        opacity:0.5,
    })
}

//补间动画
function translateCamera(position,target,time){
    //判断两个坐标是否相等，先转成长度，保留整数进行比较
    if(camera.position.length().toFixed(0) == position.length().toFixed(0)){
        return;
    } 
    const tween1 = new TWEEN.Tween(controls.target);
    const tween2 = new TWEEN.Tween(camera.position);
    tween1.to({
        x:target.x,
        y:target.y,
        z:target.z
    },time);
    tween2.to({
        x:position.x,
        y:position.y,
        z:position.z
    },1000);
    tween1.chain(tween2);
    tween1.start();
}

//电梯闪烁
/*const composer = new EffectComposer(render);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const v2 = new THREE.Vector2(window.innerWidth,window.innerHeight);
const outlinePass = new OutlinePass(v2,scene,camera);     
outlinePass.visibleEdgeColor.set(0x00ff00); 
outlinePass.edgeThickness = 4; 
outlinePass.edgeStrength = 6; 
outlinePass.pulsePeriod = 2;
outlinePass.selectedObjects = [elevatorMesh1,elevatorMesh2];
composer.addPass(outlinePass);*/

//添加一个球形灯
const smallBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.05),
    new THREE.MeshBasicMaterial({color:0xffff00})
);
//创建点光源
const pointLight = new THREE.PointLight(0xffff00,10);
pointLight.decay = 1;
//把点光源放在小球中
smallBall.add(pointLight);
smallBall.visible = false;
scene.add(smallBall);

//添加标签
const labelRenderer = new CSS3DRenderer();
function addTag(info,model){
    labelRenderer.setSize(window.innerWidth,window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    //相对标签原位置偏移大小
    labelRenderer.domElement.style.top = '0px';//使标签向上偏移10px
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';//设置鼠标事件，以免模型标签元素遮挡鼠标选择场景模型
    document.body.appendChild(labelRenderer.domElement);

    var div = document.getElementById("tag");
    div.style.visibility = "visible";
    //div.innerHTML = name;
    var label = new CSS3DObject(div);
    var pos = new THREE.Vector3();
    model.getWorldPosition(pos);//获取模型的世界坐标
    label.position.copy(pos);//设置标签的位置
    scene.add(label);
    label.scale.set(0.004,0.004,1);
    var direction = new THREE.Vector3(0,0,1);
    direction.applyQuaternion(model.quaternion);
    if(info.id < 3) label.rotation.y = Math.PI;
    label.position.y += 0.1;

    //更新信息
    var meterName = document.getElementById("metername");
    meterName.innerHTML = info.name;
    var meterStatus = document.getElementById("meterstatus");
    meterStatus.innerHTML =  info.status == "跳闸" ? "在线" : "离线";
    meterStatus.style.color =  info.status == "跳闸" ? "green" : "red";
    var buttonId = document.getElementById("meterchange");
    buttonId.innerHTML = info.status;
    smallBall.position.copy(info.position);
    smallBall.visible = info.status == "跳闸" ? true : false;
}
class MeterInfo{
    constructor(id,name,position,status){
        this.id = id;
        this.name = name;
        this.position = position;
        this.status = status;
    }
}
let currentSelectId = 0;
let meterinfos = [];
for(let i=0;i<6;i++){
    const pos = new THREE.Vector3();
    const info = new MeterInfo(i,"系统组房间电表01",pos,"跳闸");
    meterinfos.push(info);
}

document.getElementById('meter01').addEventListener('click',function(){
    const position = new THREE.Vector3(-31.8,15.3,-20);
    const target = new THREE.Vector3(-31.8,15.3,-16.4);
    translateCamera(position,target,1000);
    const status = meterinfos[0].status;
    const info = new MeterInfo(0,"系统组房间电表01",position,status);
    currentSelectId = info.id;
    meterinfos[0] = info;
    addTag(info,meters[0]);
})
document.getElementById('meter02').addEventListener('click',function(){
    const position = new THREE.Vector3(-30.6,15.3,-20);
    const target = new THREE.Vector3(-30.6,15.3,-16.4);
    translateCamera(position,target,1000);
    const status = meterinfos[1].status;
    const info = new MeterInfo(1,"硬件组房间电表02",position,status);
    currentSelectId = info.id;
    meterinfos[1] = info;
    addTag(info,meters[1]);
})
document.getElementById('meter03').addEventListener('click',function(){
    const position = new THREE.Vector3(-21.3,15.3,-20);
    const target = new THREE.Vector3(-21.3,15.3,-16.4);
    translateCamera(position,target,1000);
    const status = meterinfos[2].status;
    const info = new MeterInfo(2,"测试组房间电表03",position,status);
    currentSelectId = info.id;
    meterinfos[2] = info;
    addTag(info,meters[2]);
})
document.getElementById('meter04').addEventListener('click',function(){
    const position = new THREE.Vector3(-21.3,15.3,-2);
    const target = new THREE.Vector3(-21.3,15.3,-6.1);
    translateCamera(position,target,1000);
    const status = meterinfos[3].status;
    const info = new MeterInfo(3,"经理办公室电表04",position,status);
    currentSelectId = info.id;
    meterinfos[3] = info;
    addTag(info,meters[3]);
})
document.getElementById('meter05').addEventListener('click',function(){
    const position = new THREE.Vector3(-29,15.3,-2);
    const target = new THREE.Vector3(-29,15.3,-6.1);
    translateCamera(position,target,1000);
    const status = meterinfos[4].status;
    const info = new MeterInfo(4,"财务办公室电表05",position,status);
    currentSelectId = info.id;
    meterinfos[4] = info;
    addTag(info,meters[4]);
})
document.getElementById('meter06').addEventListener('click',function(){
    const position = new THREE.Vector3(-41.4,15,-2);
    const target = new THREE.Vector3(-41.4,15,-6.1);
    translateCamera(position,target,1000);
    const status = meterinfos[5].status;
    const info = new MeterInfo(5,"总裁办公室电表06",position,status);
    currentSelectId = info.id;
    meterinfos[5] = info;
    addTag(info,meters[5]);
})
document.getElementById('back').addEventListener('click',function(){
    const position = new THREE.Vector3(0, 70, 150);
    const target = new THREE.Vector3(0,0,-20);
    translateCamera(position,target,0);
    var div = document.getElementById("tag");
    div.style.visibility = "hidden";
    smallBall.visible = false;
    for(let i=0; i<otherObjs.length; i++){
        otherObjs[i].material = otherMaterials[i];
        otherObjs[i].children = [];
    }
})
document.getElementById('meterchange').addEventListener('click',function(){
    var buttonId = document.getElementById("meterchange");
    var status = buttonId.innerHTML;
    var meterStatus = document.getElementById("meterstatus");
    if(status == "跳闸"){
        buttonId.innerHTML = "合闸";
        meterinfos[currentSelectId].status = "合闸";
        meterStatus.innerHTML =  "离线";
        meterStatus.style.color = "red";
        smallBall.visible = false;
    }
    else{
        buttonId.innerHTML = "跳闸";
        meterinfos[currentSelectId].status = "跳闸";
        meterStatus.innerHTML =  "在线";
        meterStatus.style.color = "green";
        smallBall.visible = true;
    }
})

const buttons = document.querySelectorAll('.dtbutton');
buttons.forEach(button => {
  button.addEventListener('click', function() {
    const position = new THREE.Vector3(0, 12, -130);
    const target = new THREE.Vector3(0,0,-20);
    translateCamera(position,target,2000);
    if(otherObjs[0].children.length == 0){
        for(let i=0; i<otherObjs.length; i++){
            ShowLineSegments(otherObjs[i]);
        }
    }
    let targetHeight = 2;
    let currentElevator = button.id.substring(0,3);
    let currentFloor = button.id.substring(4,5);
    if(currentFloor =="1"){
        targetHeight = floors[0];
    }
    else if(currentFloor =="2"){
        targetHeight = floors[1];
    }
    else if(currentFloor =="3"){
        targetHeight = floors[2];
    }
    else if(currentFloor =="4"){
        targetHeight = floors[3];
    }
    else if(currentFloor =="5"){
        targetHeight = floors[4];
    }
    if(currentElevator == "dt1"){
        let moveLength = targetHeight - currentHeight1;
        if(moveLength == 0) return;
        elevatorMove(1,targetHeight,Math.abs(moveLength)*500);
        currentHeight1 = targetHeight;
    }else{
        let moveLength = targetHeight - currentHeight2;
        if(moveLength == 0) return;
        elevatorMove(2,targetHeight,Math.abs(moveLength)*500);
        currentHeight2 = targetHeight;
    }
  });
});

//设置外墙颜色
const colorbuttons = document.querySelectorAll('.colorbutton');
colorbuttons.forEach(button => {
  button.addEventListener('click', function() {
    let colorStr = button.id.substring(0,button.id.length-3);
    const color = new THREE.Color(colorStr);
    for(let i=0; i<otherObjs.length; i++){
        let obj = otherObjs[i];
        if(obj.parent.name.includes("表")) continue;
        if(obj.name.includes("外墙") || obj.parent.name.includes("外墙")
         ||obj.name.includes("6层") || obj.parent.name.includes("6层")){
            //obj.material.color = color;
            let newMaterial = new THREE.MeshBasicMaterial({
                transparent:false,
            });
            newMaterial.color = color;
            obj.material = newMaterial;
        }
    }
  });
});

//设置墙体透明度
const modelbuttons = document.querySelectorAll('.modelbutton');
modelbuttons.forEach(button => {
  button.addEventListener('click', function() {
    if(button.id == "sourceModel"){
        for(let i=0; i<otherObjs.length; i++){
            otherObjs[i].material = otherMaterials[i];
            otherObjs[i].children = [];
        }
    }else if(button.id == "lineModel"){
        if(otherObjs[0].children.length == 0){
            for(let i=0; i<otherObjs.length; i++){
                ShowLineSegments(otherObjs[i]);
            }
        }
    }else if(button.id == "hideWall"){
        for(let i=0; i<otherObjs.length; i++){
            let obj = otherObjs[i];
            if(obj.parent.name.includes("表")) continue;
            if(obj.name.includes("外墙") || obj.parent.name.includes("外墙")){
                obj.material = new THREE.MeshLambertMaterial({
                    color:0x00FFFF,
                    transparent:true,
                    opacity:0.2,
                });
            }
        }
    } else if(button.id == "showWall"){
        for(let i=0; i<otherObjs.length; i++){
            let obj = otherObjs[i];
            if(obj.parent.name.includes("表")) continue;
            if(obj.name.includes("外墙") || obj.parent.name.includes("外墙")){
                obj.material = otherMaterials[i];
            }
        }
    }else if(button.id == "hideFloor"){
        for(let i=0; i<otherObjs.length; i++){
            let obj = otherObjs[i];
            if(obj.parent.name.includes("表")) continue;
            if(obj.name.includes("楼顶1") || obj.parent.name.includes("楼顶1")
            ||obj.name.includes("思创大厦log") || obj.parent.name.includes("思创大厦log")
            ||obj.name.includes("5层") || obj.parent.name.includes("5层")
            ||obj.name.includes("6层") || obj.parent.name.includes("6层")){
                obj.material = new THREE.MeshLambertMaterial({
                    color:0x00FFFF,
                    transparent:true,
                    opacity:0.2,
                });
            }
        }
    } else if(button.id == "showFloor"){
        for(let i=0; i<otherObjs.length; i++){
            let obj = otherObjs[i];
            if(obj.parent.name.includes("表")) continue;
            if(obj.name.includes("楼顶1") || obj.parent.name.includes("楼顶1")
                ||obj.name.includes("思创大厦log") || obj.parent.name.includes("思创大厦log")
                ||obj.name.includes("5层") || obj.parent.name.includes("5层")
                ||obj.name.includes("6层") || obj.parent.name.includes("6层")){
                obj.material = otherMaterials[i];
            }
        }
    }
  });
});

document.getElementById('myCheckbox').addEventListener('change',function(){
    var checkBox = document.getElementById("myCheckbox");
    controls.autoRotate = checkBox.checked;
});

const imageBtns = document.querySelectorAll('.viewimg');
imageBtns.forEach(button => {
  button.addEventListener('click', function() {
    console.log(button.id);
    let pos = new THREE.Vector3();
    let target = new THREE.Vector3();
    if(button.id == "front"){
        pos.set(0, 15, 120);
        target.set(0,0,-20);
    }else if(button.id == "side"){
        pos.set(-160, 15, -10);
        target.set(0,0,-20);
    }
    else if(button.id == "down"){
        pos.set(0, 160, -10);
        target.set(0,0,-20);
    }
    else if(button.id == "zhou"){
        pos.set(-100, 60, 80);
        target.set(0,0,-20);
    }
    translateCamera(pos,target,0);
  });
});

function renderfun(){
    controls.update();
    render.render(scene,camera);
    requestAnimationFrame(renderfun);
    //更新补间动画
    TWEEN.update();
    labelRenderer.render(scene,camera);
    //composer.render();
}
renderfun();