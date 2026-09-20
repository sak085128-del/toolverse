import qrcodeSource from "./vendor/qrcode.min.js?raw";
const moduleObj = { exports: {} };
new Function("module", "exports", qrcodeSource)(moduleObj, moduleObj.exports);
const qrcode = moduleObj.exports;
export default qrcode;