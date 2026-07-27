

const fs = require('fs');
var fs_path = require('path');
const Config = require('./-appconfig.js');//5/25/20 -- loads from root project
const BUILDCONFIG_PATH = resolveBuildConfigPath();//5/25/20 -- loads from root project
const BUILDCONFIG = require(BUILDCONFIG_PATH);
// const test = require(__dirname + "/test.js");
const Ecmascript6ClassTranspiler = require(__dirname+'/Ecmascript6ClassTranspiler.js');
var compiler = new Ecmascript6ClassTranspiler;
var JavaScriptObfuscator = require('javascript-obfuscator');
var args = process.argv.slice(2);
var exec = require('child_process').exec;
dir = args[0] ?  args[0] : __dirname;
const { minify } = require('terser');
const compileHints = getCompileHints();

compiler.Build(getInputSrc(), res => save(res))

function getInputSrc(path){
    path = path||BUILDCONFIG.Input;
    return fs.readFileSync(path, "utf8");
}


var child;
async function save(res){
    var obfuscationResult; 
    var encSrc;
    if(BUILDCONFIG.Encrypt){
        console.log("Encrypting compilation to: ", BUILDCONFIG.Output.EncryptPath);
        obfuscationResult = JavaScriptObfuscator.obfuscate(res,{
            compact: true,
            controlFlowFlattening: false,
            // controlFlowFlatteningThreshold: 0,
            // identifierNamesGenerator:"hexadecimal",
            // numbersToExpressions:true,
            // optionsPreset:"medium-obfuscation",
            // numbersToExpressions: false,
            simplify: false,
            shuffleStringArray: false,
            splitStrings: false,
            // stringArrayThreshold: .75,
            ignoreRequireImports:true
        });
        encSrc = obfuscationResult.getObfuscatedCode();
        if(BUILDCONFIG.LoadsAsync){
            encSrc = `(async (global)=>{ ${encSrc} })(this)`
        }
        encSrc = prependCompileHints(encSrc);
        fs.writeFileSync(BUILDCONFIG.Output.EncryptPath, encSrc);
    }
    if(BUILDCONFIG.LoadsAsync){
        res = `(async (global)=>{ ${res} })(this)`
    } else {
        res = `((global)=>{ ${res} })(this)`
    }

    if (!fs.existsSync(fs_path.dirname(BUILDCONFIG.Output.SourcePath))) {
        fs.mkdirSync(fs_path.dirname(BUILDCONFIG.Output.SourcePath), { recursive: true });
    }
    
    BUILDCONFIG.Output.CompressedPath   = fs_path.resolve(BUILDCONFIG.Output.CompressedPath);
    BUILDCONFIG.Output.SourcePath       = fs_path.resolve(BUILDCONFIG.Output.SourcePath);
    BUILDCONFIG.Output.EncryptPath      = fs_path.resolve(BUILDCONFIG.Output.EncryptPath);

    console.log("Saving compilation to: ", BUILDCONFIG.Output.SourcePath);
    res = prependCompileHints(res);
    fs.writeFileSync(BUILDCONFIG.Output.SourcePath, res);
    var uncompressed_size = getFilesizeInBytes(BUILDCONFIG.Output.SourcePath)
    // console.log(`UNCOMPRESSED SIZE: ${Math.round(uncompressed_size/1024).toFixed()}kb`, BUILDCONFIG.Output.SourcePath);

    await sleep(1000);
    // setTimeout(e=>{
        /**
            URL: https://github.com/google/closure-compiler/issues/3679
            URL: https://github.com/google/closure-compiler
            The default value for --language_in is STABLE (ES_2019 as of 9/2020).
            The default value for --language_out is whatever --language_in is.
         */
            

        console.log("Compressing compilation to: ", BUILDCONFIG.Output.CompressedPath);
        const config = {
            compress: {
              dead_code: true,
              drop_console: false,
              drop_debugger: true,
              keep_classnames: true,
              keep_fargs: true,
              keep_fnames: true,
              keep_infinity: true
            },
            mangle: false,
            module: true,
            sourceMap: false,
            output: {
              comments: false
            }
          };
          const code = fs.readFileSync(BUILDCONFIG.Output.SourcePath, 'utf8');
          const minified = await minify(code, config);
          fs.writeFileSync(BUILDCONFIG.Output.CompressedPath, prependCompileHints(minified.code));
          var compressed_size = getFilesizeInBytes(BUILDCONFIG.Output.CompressedPath);
          console.log(`UNCOMPRESSED SIZE: ${Math.round(uncompressed_size/1024).toFixed()}kb`);
          console.log(`COMPRESSED SIZE: ${Math.round(compressed_size/1024).toFixed()}kb`);

        // child = exec("java -jar node_modules/od-toolset/tools/closure-compiler-v20240317.jar --dependency_mode NONE --compilation_level "+BUILDCONFIG.CompilationLevel+" --js " + BUILDCONFIG.Output.SourcePath + "  --js_output_file " + BUILDCONFIG.Output.CompressedPath + " -W QUIET --language_in "+BUILDCONFIG.InputLanguage+" --language_out " + BUILDCONFIG.OutputLanguage, async function (error, stdout, stderr){
        //     await sleep(3000);
        //     if(stderr || error !== null){
        //         console.log("Error -> "+error,stderr);
        //         return
        //     }
            // var compressed_size = getFilesizeInBytes(BUILDCONFIG.Output.CompressedPath)
            // console.log(`COMPRESSED TO: ${Math.round(compressed_size/1024).toFixed()}kb`);
            
        // });

        // npx terser input.js --output output.min.js --compress --mangle
        // child = exec("npx terser "+BUILDCONFIG.Output.SourcePath+" --output "+BUILDCONFIG.Output.CompressedPath+" --compress --comments false --keep_classnames --keep_fnames", async function (error, stdout, stderr){
        //     if(stderr || error !== null){
        //         console.log("Error -> "+error,stderr);
        //     }
        // });

        //compressJavaScript(BUILDCONFIG.Output.SourcePath, BUILDCONFIG.Output.CompressedPath);
        
    // },5000);
}
sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getCompileHints() {
    const hintsPath = fs_path.resolve(fs_path.dirname(BUILDCONFIG_PATH), 'allFunctionsCalledOnLoad.txt');
    if (!fs.existsSync(hintsPath)) {
        return '';
    }

    const hints = fs.readFileSync(hintsPath, 'utf8').trim();
    return hints ? `${hints}\n` : '';
}

function prependCompileHints(code) {
    if (!compileHints || code.startsWith(compileHints)) {
        return code;
    }

    return `${compileHints}${code}`;
}


function getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

module.exports = child;

function resolveBuildConfigPath() {
    const projectBuildConfigPath = fs_path.resolve(process.cwd(), '-buildconfig.js');
    if (fs.existsSync(projectBuildConfigPath)) {
        return projectBuildConfigPath;
    }

    return require.resolve('../../-buildconfig.js');
}
