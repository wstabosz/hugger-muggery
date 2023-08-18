// read in html, css, and js files
// replace 

const fs = require('fs');
const path = require('path');
const buildDir = './build';

if (!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir);
}

let paths = {
    in: {
        html: `./src/main.html`,
        css: `./src/main.css`,
        js: `./src/main.js`,
        head: `./src/head.inject.html`
    },
    out: {
        packed: `${buildDir}/packed.html`,
        packedMin: `${buildDir}/packed.min.html`,
        pasteToSave: `${buildDir}/pasteToSave.js.txt`,
    }
};

// const pack = function() {
//     const noCompress = require('@node-minify/no-compress');

//     let pieces = {
//         html:'',
//         js:'',
//         css:''
//     };

//     minify({
//         compressor: noCompress,
//         input: paths.js,
//         output: './main.min.js',
//         sync: true,
//         callback: function(err, min) {
//             pieces.js = min;            
//         }, 
//     });

// }
const minify_html_css_js = function(pieces) {

    const minify = require('@node-minify/core');
    const htmlMinifier = require('@node-minify/html-minifier');
    const uglify = require('@node-minify/uglify-es');
    const crass = require('@node-minify/crass');

    let minPieces = {
        html:'',
        js:'',
        css:''
    };
    
    minify({
        compressor: uglify,
        content: pieces.js,      
        sync: true,
        callback: (err,min) => {
            minPieces.js = min; 
        }
    })

    minify({
        compressor: htmlMinifier,
        content: pieces.html,
        sync: true,
        options: {
            removeAttributeQuotes: false
        },
        callback: (err,min) => {
            minPieces.html = min; 
        }
    });
        
    minify({
        compressor: crass,
        content: pieces.css,
        sync: true,    
        callback: (err,min) => {
            minPieces.css = min; 
        }
    });

    return minPieces;

}

/**
 * Replaces the <link> tag with an inline <style> tag
 * @param {*} html 
 * @param {*} css 
 * @returns 
 * @note this regex is not thoroughly tested
 */
const injectCss = function(html, css) {
    return html.replace(/(.*)<link[^>]*>(.*)/,`$1<style>${css}</style>$2`);
};

/**
 * Replaces the linked <script> tag with an inlined <script> tag
 * @param {*} html 
 * @param {*} js 
 * @returns 
 * @note this regex is not thoroughly tested 
 * @note You cannot inline a script block for a JS pasteables. 
 *       When it is base64-decoded and injected to the DOM, the script will not get executed
 */
const injectJs = function(html, js) {    
    return html.replace(/(.*)<script.*\/script>(.*)/,`$1<script lang="JavaScript">${js}<\/script>$2`)
}

/**
 * Generates a block of JS that can be pasted into about:blank
 * to render a page.
 * NOTE: navigator.clipboard doesn't work on about:blank
 * @param {*} html 
 * @param {*} js 
 * @param {*} extraJs 
 * @note This method of install is a bit buggy, better to just use getJsPasteable_link
 * @returns 
 */
// const getJsPasteable = function(html,js,extraJs) {

//     let buff = Buffer.from(html,'utf-8');
//     const html64 = buff.toString('base64');

//     buff = Buffer.from(js,'utf-8');
//     const js64 = buff.toString('base64');

// let code = `
// document.getElementsByTagName('html')[0].innerHTML=atob('${html64}');
// var s=document.createElement('script');
// s.innerText=atob('${js64}');
// document.getElementsByTagName('body')[0].appendChild(s);
// ${extraJs};
// `

//     return code.split('\n').join('');

// }

const getJsPasteable_link = function(text) {

    let buff = Buffer.from(text,'utf-8');
    const base64 = buff.toString('base64');
    let name = 'app.html';

    let instructions = 
`
1. Click download link to save ${name} to your computer.
2. Open ${name}
`.split('\n').join('<br>');

    return `
var a=document.createElement('a');
a.href='data:text/html;base64,${base64}';
a.download='${name}';
a.innerText='Download';
document.body.innerHTML='${instructions}';
document.body.appendChild(a);
`.split('\n').join('');

    //,`a.click();`
}

const readFiles = function() {
    return {
        html: fs.readFileSync(paths.in.html, { encoding: 'utf8' })
        ,css: fs.readFileSync(paths.in.css, { encoding: 'utf8' })
        ,js: fs.readFileSync(paths.in.js, { encoding: 'utf8' })
        ,head: fs.readFileSync(paths.in.head, { encoding: 'utf8' })
    };
};

const packNoMinify = function(pieces) {
    
    
    let html = injectCss(pieces.html,pieces.css);
    html = injectJs(html,pieces.js);

    fs.writeFileSync(paths.out.packed, html,{ encoding: 'utf8' });
}

const minifyAndPack = function (pieces) {
    
    let minPieces = minify_html_css_js(pieces);
    let html_css = injectCss(minPieces.html,minPieces.css);    
    let html_css_js = injectJs(html_css,minPieces.js);

    fs.writeFileSync(paths.out.packedMin, html_css_js,{ encoding: 'utf8' }); 
    
    // a(1) indicates the app was loaded from the pasted file
    html_css_js = injectJs(html_css,minPieces.js.replace('a(0)','a(1)'));
    let pasteable = getJsPasteable_link(html_css_js);
    fs.writeFileSync(paths.out.pasteToSave, pasteable,{ encoding: 'utf8' }); 

}

const preprocess = function(pieces) {    
    pieces.html = pieces.html.replace('<!--%head%-->',pieces.head);
}

const main = function() {
    let pieces = readFiles();
    preprocess(pieces);
    packNoMinify(pieces);
    minifyAndPack(pieces);
}

main();