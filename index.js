
const Config = require('./-appconfig.js');
const BUILDCONFIG = require('../../-buildconfig.js');//5/25/20 -- loads from root project
// const test = require(__dirname + "/test.js");
const fs = require('fs');
var fs_path = require('path');
const Ecmascript6ClassTranspiler = require(__dirname+'/Ecmascript6ClassTranspiler.js');
var compiler = new Ecmascript6ClassTranspiler;
var JavaScriptObfuscator = require('javascript-obfuscator');
var args = process.argv.slice(2);
var exec = require('child_process').exec;
dir = args[0] ?  args[0] : __dirname;

// console.log("__dirname",BUILDCONFIG);

// compiler.Build(
//     `import '/src/modules/test2.mjs';


//     namespace("com.ui.Test", class {

//     })`, 
//     res => console.log(res)
// )
compiler.Build(getInputSrc(), res => save(res))

function getInputSrc(path){
    path = path||BUILDCONFIG.Input;
    return fs.readFileSync(path, "utf8");
}


var child;
function save(res){
    var obfuscationResult; 
    var encSrc;
    if(BUILDCONFIG.Encrypt){
        console.log("Encrypting compilation to: ", BUILDCONFIG.Output.EncryptPath);
        obfuscationResult = JavaScriptObfuscator.obfuscate(res,{
            compact: true,
            controlFlowFlattening: false,
            controlFlowFlatteningThreshold: 1,
            numbersToExpressions: false,
            simplify: true,
            shuffleStringArray: true,
            splitStrings: false,
            stringArrayThreshold: .75,
            ignoreRequireImports:true
        });
        encSrc = obfuscationResult.getObfuscatedCode();
        // console.log("LoadsAsync",BUILDCONFIG.LoadsAsync)
        // if(BUILDCONFIG.LoadsAsync){
        //     res = `(async ()=>{ ${encSrc} })()`
        // } else {
        //     res = `(()=>{ ${encSrc} })()`
        // }
        // res=encSrc;
        // console.log("encSrc",encSrc)
        if(BUILDCONFIG.LoadsAsync){
            encSrc = `(async ()=>{ ${encSrc} })()`
        }
        fs.writeFileSync(BUILDCONFIG.Output.EncryptPath, encSrc);
    }
    if(BUILDCONFIG.LoadsAsync){
        res = `(async ()=>{ ${res} })()`
    } else {
        res = `(()=>{ ${res} })()`
    }

    
    console.log("Saving compilation to: ", BUILDCONFIG.Output.SourcePath);
    fs.writeFileSync(BUILDCONFIG.Output.SourcePath, res);
    var uncompressed_size = getFilesizeInBytes(BUILDCONFIG.Output.SourcePath)
    console.log(`SAVED: ${Math.round(uncompressed_size/1024).toFixed()}kb`, BUILDCONFIG.Output.SourcePath);

    setTimeout(e=>{
        child = exec("java -jar node_modules/od-toolset/tools/closure-compiler-v20200719.jar --dependency_mode NONE --compilation_level "+BUILDCONFIG.CompilationLevel+" --js " + BUILDCONFIG.Output.SourcePath + "  --js_output_file " + BUILDCONFIG.Output.CompressedPath + " -W QUIET --language_in "+BUILDCONFIG.InputLanguage+" --language_out " + BUILDCONFIG.OutputLanguage, function (error, stdout, stderr){
            var compressed_size = getFilesizeInBytes(BUILDCONFIG.Output.CompressedPath)
            console.log(`COMPRESSED TO: ${Math.round(compressed_size/1024).toFixed()}kb`);
            if(stderr || error !== null){
                console.log("Error -> "+error,stderr);
            }
        });
    },5000);
}


function getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

module.exports = child;