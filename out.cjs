const wasmBase64 = "AGFzbQEAAAABCAJgAX8AYAAAAg8BA2VudgdwcmludGxuAAADAgEBCAEBCggBBgBBKhAACw=="
const wasmBuffer = Buffer.from(wasmBase64, "base64");
const mod = new WebAssembly.Module(wasmBuffer);
const importObject = { env: { println: function(value) { return console.log(value); }, } };
const instance = new WebAssembly.Instance(mod, importObject);
module.exports = instance.exports;
