/**
 * 
 * This script takes the app's source files and:
 * 
 * 1. packs them into a single html file
 * 2. minifies the packed file
 * 3. create a javascript that can be pasted into the browser's
 *    js console to obtain a copy of the app
 *    
 */

const fs = require('fs');

if (!fs.existsSync('./build')){
    fs.mkdirSync('./build');
}

/**
 * Removes parts of a string that lay inside a pair of markers
 */
const cut = function(string='', markers = ['<!--A-->','<!--B-->']) {
    
    if(typeof markers === 'string') {
        markers = [markers,markers];
    }
    let start;
    
    while (-1 !== (start=string.indexOf(markers[0]))) {
        let end = string.indexOf(markers[1],start+1);
        string = [
            string.substring(0,start), 
            string.substring(end+markers[1].length)
        ].join('');
    }

    return string;

    /*    
    cut('aaa<!--A-->AAAAAAA<!--B-->ccc',['<!--A-->','<!--B-->']) == 'aaaccc';

    */
}


/**
 * 
 * @returns 
 */
const minify_html_css_js = async function(paths) {    

    let minify;
    ({minify} = await import('minify'));

    let miniPieces = {
        html:'',
        js:'',
        css:''
    };    
    
    let keys = Object.keys(miniPieces);
    
    let minifyOptions = {
        // html: {
        //     removeOptionalTags: true
        // }
    };

    for(let i=0;i<keys.length;i++ ) {

        let key = keys[i];
        
        // minify reads a file from disk (does not accept a string to minify)
        await minify(paths.in[key], minifyOptions).then((result) => {
            miniPieces[key] = result;
        });

    }

    return miniPieces;

}

/**
 * Replaces the <link> tag with an inline <style> tag
 * @param {*} html 
 * @param {*} css 
 * @returns 
 */
const injectCss = function(html, css) {
    return html.replace(
        '<link rel=stylesheet href=main.css>'
        ,`<style>${css}</style>`
    );
};

/**
 * Replaces the linked <script> tag with an inlined <script> tag
 * @param {*} html 
 * @param {*} js 
 * @returns 
 */
const injectJs = function(html, js) {    
    return html.replace(
        '<script src=main.js async></script>',
        `<script>${js}</script>`
    );
}

const toBase64 = function(text) {
    let buff = Buffer.from(text,'utf-8');
    return buff.toString('base64');
}
/**
 * Build a script that can be pasted into the browser console
 * to install the HuggerMuggery app. This doesn't actually
 * work though because of various browser security restrictions.
 * Maybe there is a way to get it to work, but I couldn't
 * figure it out.
 * @param {string} text 
 */
const createConsoleLauncher = function(miniPieces,pieces) {

    let base64 = toBase64(miniPieces.packedHtmlCssNoJs);
    let script = miniPieces.js;

return `
var appHtml = atob('${base64}');
document.documentElement.innerHTML = appHtml;
{${script}}
window['init']();
`.split('\n').join('');

}

const createConsoleDownloader = function(packed) {

    let base64 = toBase64(packed);

    let name = 'app.html';

    let instructions = 
`1. Click download link to save ${name} to your computer.
2. Open ${name}
`.split('\n').join('<br>');

    return `
(()=>{Array.prototype.forEach.call(document.styleSheets,o=>o.disabled = true);
let a=document.createElement('a');
a.href='data:text/html;base64,${base64}';
a.download='${name}';
a.innerText='Download';
document.body.innerHTML='${instructions}';
document.body.appendChild(a);})();
`.split('\n').join('');

}

const createPasteables = function(paths, downloader, launcher) {

    let template = fs.readFileSync(paths.in.pasteables, { encoding: 'utf8' });

    template = template.replace(`'%launch%'`, `atob('${toBase64(launcher)}')`);
    template = template.replace(`'%download%'`,`atob('${toBase64(downloader)}')`);

    return template;
}

const readFiles = function(paths) {
    return {
        html: fs.readFileSync(paths.in.html, { encoding: 'utf8' })
        ,css: fs.readFileSync(paths.in.css, { encoding: 'utf8' })
        ,js: fs.readFileSync(paths.in.js, { encoding: 'utf8' })
    };
};

const packNoMinify = function(pieces) {
    let html = injectCss(pieces.html,pieces.css);
    html = injectJs(html,pieces.js);
    return html;
}

const minifyAndPack = async function (paths) {

    let miniPieces = await minify_html_css_js(paths);    
        
    packedHtmlCss = injectCss(miniPieces.html,miniPieces.css);    
    packedHtmlCssJs = injectJs(packedHtmlCss,miniPieces.js);
    packedHtmlCssNoJs = injectJs(packedHtmlCss,'');
    
    miniPieces.packedHtmlCssJs = packedHtmlCssJs;
    miniPieces.packedHtmlCssNoJs = packedHtmlCssNoJs;

    return miniPieces;

}

// const writeOutputFiles = function(paths, {packedHtml ,miniPackedHtml, downloader, launcher}) {

//     fs.writeFileSync(paths.out.packedMin, miniPackedHtml, { encoding: 'utf8' }); 
//     fs.writeFileSync(paths.out.packed, packedHtml, { encoding: 'utf8' }); 
//     fs.writeFileSync(paths.out.consoleDownloader, downloader,{ encoding: 'utf8' }); 
//     //fs.writeFileSync(paths.out.consoleLauncher, launcher,{ encoding: 'utf8' }); 

// }


const main = async function() {
        
    let paths = {
        in: {
            html: `./src/main.html`,
            css: `./src/main.css`,
            js: `./src/main.js`,
            pasteables: `./src/pasteables.template.html`
        },
        out: {
            packed: `./build/packed.html`,
            packedMin: `./build/packed.min.html`,
            consoleDownloader: `./build/consoleDownloader.js`,
            consoleLauncher: `./build/consoleLauncher.js`,
            pasteables: `./build/pasteables.html`
        },
        temp: {
            html: `./build/cut.html`,
            css: `./build/cut.css`
        }
    };

    let pieces = readFiles(paths);
    
    let packedHtml = packNoMinify(pieces);
    fs.writeFileSync(paths.out.packed, packedHtml, { encoding: 'utf8' }); 

    // cut out the parts of the html & css that should be excluded from the minified code
    pieces.html = cut(pieces.html,'<!--cut-->');
    pieces.css = cut(pieces.css,'/*cut*/');
    fs.writeFileSync(paths.temp.html, pieces.html, { encoding: 'utf8' }); 
    fs.writeFileSync(paths.temp.css, pieces.css, { encoding: 'utf8' }); 
    
    //let miniPackedHtml = await ttt(paths.out.packed);
    
    let miniPieces = await minifyAndPack({
        in: {        
            html: paths.temp.html,
            css: paths.temp.css,
            js: paths.in.js
        }
    });

    fs.writeFileSync(paths.out.packedMin, miniPieces.packedHtmlCssJs, { encoding: 'utf8' });     
    
    let downloader = createConsoleDownloader(miniPieces.packedHtmlCssJs);
    fs.writeFileSync(paths.out.consoleDownloader, downloader,{ encoding: 'utf8' }); 


    let launcher = createConsoleLauncher(miniPieces, pieces);
    fs.writeFileSync(paths.out.consoleLauncher, launcher,{ encoding: 'utf8' }); 

    let pasteables = createPasteables(paths, downloader, launcher);
    fs.writeFileSync(paths.out.pasteables, pasteables,{ encoding: 'utf8' }); 

    // delete temp files
    fs.unlinkSync(paths.temp.html);
    fs.unlinkSync(paths.temp.css);

}

main();
