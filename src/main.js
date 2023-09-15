/*
    Coding Notes:
    
    This app was written with some irregular specifications which may look like amateur coding. 

    * I wanted the code to be small, so you'll see single character variable names
        * but I'm not too experienced at code size-optimization, so you might be scratching your head at other things you see
    * I wanted to avoid dependency on a UI library, so you'll see dynamic HTML with inline event definition
    
    Also, this code was written more for fun than for production, so many decisions were made
    without deep consideration.

    That said, if you see a glaring mistake, where I could have coded better, please feel free 
    to message me with suggestions. I love to learn.

*/

// document.onreadystatechange = () => {
//     console.log(`readyState: ${document.readyState}`);
//     if (document.readyState === 'complete') {
//         init();
//     }
// };

let ui = {}; // cache of DOM elements
let settings = {
    sender: {
        clipboardBufferSize: 0 // 0 == unlimited
    },
    receiver: {}
};

const appData = { 
    s: {
        unpackedFiles: [],
        packedJson: ''
    },
    r: {
        unpackedFiles: []
    }
};
    
/**
 * A functional programming method for adding event listener to an element
 * It help to keep the code smaller by recycling a single variable for all
 * the DOM elements
 * CON: Makes reading a bit more difficult, but it makes sense once you understand
 * what I'm trying to do
 * @param {*} element 
 * @param {*} eventType 
 * @param {*} listener 
 * @returns 
 */
function addEventListener2(element,eventType,listener) {
    if(!element) return;
    element.addEventListener(eventType,listener);            
};
function addEventListener3(element,listeners) {
    for(const [k,v] of Object.entries(listeners)) {
        element.addEventListener(k,v);
    }
}        

/*
    these are events that bubble up to the document from various
    controls that are added/removed on the page dynamically
*/
function initBubblingEvents() {

    document.addEventListener('click', (ev) => {
        
        let events = {
            '.copySingle': (ev) => { 
                let t = ev.target;
                let id = t.value;
                //let file = fileUtil.packSingleFile(appData.s.unpackedFiles,id);
                let file = packSingleFile(appData.s.unpackedFiles,id);
                copyToClipboard(JSON.stringify(file));
                glow(t);
            },
            '.receiveLink': (ev) => { 
                fileLinkOnclickHandler(ev) 
            },
            '.remove': (ev) => { 
                let id = ev.target.value;
                deleteFileFromSendQueue(appData.s.unpackedFiles, id);
            },
            '.copyJs':  (ev) => { 
                let t = ev.target;
                let id = t.value;
                makeJsPaste(id);
                glow(t);
            }
        };
        
        // Build a list of event handlers to call based on the class
        // Element.matches() returns true if an element would be selected
        // by the specified CSS selector. In this case, the dynamic elements
        // are identified by their class property. In hindsight, this does
        // make the code a bit fragile.
        let filteredEvents = Object.keys(events)
            .filter(key=>ev.target.matches(key));

        filteredEvents.forEach(o=>events[o](ev));

    });

};

function pd(e) {e.preventDefault()}

window['init'] = function init() {

    // Build a cache of all the DOM elements with ids
    document.querySelectorAll('[id]')
        .forEach(o=>ui[o.id]=o);

    initBubblingEvents();
    const ael = addEventListener2;
    const aels = addEventListener3;

    appData.s.packedJson = '';    
    ael(ui.showPasteable, 'click', () => {drawSendFileTable(appData.s.unpackedFiles)});

    //=================================================================

    function placeholderToggler(el,inactive, active) {
        
        function sph(v) {
            el.setAttribute('placeholder',v);
        }

        sph(inactive);
        aels(el, {
            focus: () => { sph(active) },
            blur: () => { sph(inactive) }
        });

    }

    ui.pasteToBox.value = '';
    aels(ui.pasteToBox, {
        paste: handlePaste,
        // focus: (ev) => {
        //     'Paste your file blob here.';
        //     sa(ev,'x-placeholder', ga(ev,'placeholder'));
        //     sa(ev,'placeholder', 'Press Ctrl+V to paste.');
        //     //ev.target.setAttribute('x-placeholder', ev.target.getAttribute('placeholder'));
        //     //ev.target.setAttribute('placeholder', 'Press Ctrl+V to paste.');
        // },
        // blur: (ev) => {
        //     sa(ev,'placeholder', ga(ev,'x-placeholder'));
        //     //ev.target.setAttribute('placeholder', ev.target.getAttribute('x-placeholder'));
        // }
    });

    placeholderToggler(ui.pasteToBox,'Paste your file blob here.','Press Ctrl+V to paste.');

    //=================================================================
    ((el) => {        
        ael(el,'click', (ev) => { 
            clickAllFileLinks(); 
            glow(ev.target);
        });
        el.disabled = true;
    })(ui.saveAllFiles);
    
    //=================================================================
    ((el) => {
        ael(el,'click', () => {
            ui.fileReceiveList.innerHTML = 'No files have been received.';
            ui.pasteToBox.value = '';
            ui.saveAllFiles.disabled = true;
            el.disabled = true;
            //ui.clearFiles.disabled = true;
        });
        el.disabled = true;
    })(ui.clearFiles);

    //=================================================================
    aels(document.body,
        {dragover:pd,
        drop:pd});    

    const t = (e,b) => (e) => e.target.classList.toggle('drag-enter',b);

    aels(ui.dropZone,
        {drop:handleFileDrop,
        dragover:pd,
        dragenter:t(true),
        dragleave:t(false)
    });

    //=================================================================
    ((el) => {
        el.disabled = true;
        ael(el, 'click', (ev) => {
            copyToClipboard(appData.s.packedJson);
            glow(ev.target);
        });
    })(ui.copyAllButton);
    
    //=================================================================
    // when user picks files with the file input element
    ael(ui.fileInput, 'change', (ev) => onNewFiles(ev.target.files));

    //=================================================================
    ael(ui.browseLink, 'click', (ev) => {
        pd(ev);
        ui.fileInput.click();
    });

    //=================================================================    
    (el => {
        ael(el,'input', (ev) => {
            updateClipboardBufferSize(ev.target.value);                
        });
        updateClipboardBufferSize(el.value);    
    })(ui.clipboardBufferSize);
    receive
    document.querySelector('.loadingBar').style.setProperty('display','none');
};

function glow(elm) {
    elm.classList.add('glow');        
    setTimeout(() => {        
        elm.classList.remove('glow');
    }, 300);
};

// const fileUtil = (() => {

    async function fileListToBase64(fileList) {
        // create function which return resolved promise
        // with data:base64 string
        function getBase64(file) {
            const reader = new FileReader();
            return new Promise(resolve => {
                reader.onload = ev => {
                    resolve({
                        name: file.name,
                        size: file.size,
                        data: ev.target.result
                    });
                }
                reader.readAsDataURL(file);
            })
        }
        // here will be array of promisified functions
        const promises = []

        // loop through fileList with for loop
        for (let i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            if (file instanceof DataTransferItem)
                file = file.getAsFile();
            promises.push(getBase64(file));
        }

        // array with base64 strings
        return Promise.all(promises);            
        
    }

    /*
        repackedFiles the files for transmitting as JSON
        {
            info: [
                ['file1.txt',12345], // name, size
                ['file2.txt',4345]
            ]
            ,data: [
                'file1_as_base64_string',
                'file2_as_base64_string',
            ]
        }

        the physical model is actually an array of arrays where:
            repackedFiles[0] == array of file info arrays
            repackedFiles[1] == array of file data
        example (using above model):
            [
                [
                    ['file1.txt',12345], // name, size
                    ['file2.txt',4345]
                ],
                [
                    'file1_as_base64_string',
                    'file2_as_base64_string'
                ]
            ]
        
        The reason repackedFiles is an array is to save bytes in the clipboard
        
        The base64 data is kept separate from the fileinfo so that the code
        can detect missing files in the case that the remote clipboard buffer is too small
        
        You could save a few bytes per file if you used a custom text format (vs JSON), ex:
        file1.txt\t12345\nfile1_as_base64_string\n
        but that would complicate the code for not much return on investment
    */
    function packFiles(unpackedFiles) {
        let repackedFiles = [
            [] // file metadata
            ,[] // file data as base64 string
        ];
        unpackedFiles.forEach((file => {
            repackedFiles[0].push(
                [
                    file.name
                    ,file.size
                ]
            );
            repackedFiles[1].push(file.data);
        }));
        return repackedFiles;
    };

    function packSingleFile(unpackedFiles,id) {
        let file = unpackedFiles[id];
        return [
            [[file.name,file.size]],
            [file.data]
        ];
    }

    function unpackFiles(packedFiles) {
        let unpackedFiles = [];

        for(let i=0;i<packedFiles[0].length;i++) {
            let file = packedFiles[0][i];
            unpackedFiles.push(
                {
                    name: file[0],
                    size: file[1],
                    data: null
                }
            )
        }

        for(let i=0;i<packedFiles[1].length;i++) {
            unpackedFiles[i].data = packedFiles[1][i];
        }

        return unpackedFiles;

    }

    async function processDroppedFiles(data) {
        
        return new Promise((resolve, reject) => {
            try {

                fileListToBase64(data)
                    .then((files) => {
                        files.sort((a,b) => { 
                            return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
                        });
                        
                        resolve(files);
                    });
                                    
            } catch (error) {
                reject(error)
            }                
        });

        
    };     
    
//     return {
//         processDroppedFiles
//         ,packFiles
//         ,unpackFiles
//         ,packSingleFile
//     };

// })();

function processFileBlobJson(fileBlobJson) {            

    function parseJsonAndUnpack(json) {
        //const files = fileUtil.unpackFiles(
        const files = unpackFiles(
            JSON.parse(json)
        );
        return files;
    };

    try {
        appData.r.unpackedFiles = parseJsonAndUnpack(fileBlobJson);
        testFileLengths(appData.r.unpackedFiles);
        clearError();
    } catch (err) {
        showError('Broken JSON received, attempting repair.');
        let fixedJson = fixBrokenJson(fileBlobJson);
        try {
            appData.r.unpackedFiles = parseJsonAndUnpack(fixedJson);
            showError('JSON repair was successful!');
        } catch (err) {
            showError('JSON repair failed.');
            return;
        }
    }

    drawReceiveFileTable(appData.r.unpackedFiles);

}

function handlePaste(ev) {

    pd(ev);
    ev.target.blur();
    // get text representation of clipboard
    let paste = (ev.clipboardData || window.clipboardData).getData('text');        
    
    // NOTE: this number is only accurate if the data was cut off b/c of a small clipboard buffer
    // however, it's a moot point b/c the only time bufferSizeSpan is visible is when the data was cut off
    ui.bufferSizeSpan.innerText = paste.length.toString();

    //event.target.value = paste;
    processFileBlobJson(paste);

}

function fixBrokenJson(brokenJson) {

    /*
        a complete block of data JSON should look this:

        ["data:text/plain;base64,XYZ"]

        starts with '["data:'
        ends with: '"]'

        The last data block should look like:
        ["data:text/plain;base64,XYZ"]]

        where the closing bracket completes the array of data-blocks

        Algorithm:
        1. Look in the JSON for last instance of '["data:'
            1.a. If no instance is found, then all the data is missing
                and it is impossible to transfer the files.
                Probable cause: user's remote clipboard buffer is too small,
                or they tried to transfer a bunch of files at once and the
                FileInfo array is too long.

                fixes: copy less files at once

        2. Starting from character after '["data:', find next instance of '"'
        2.a. if the closing quote is found, then the data is good to keep
                and you can fix by just adding the missing ']', and another ']'
                to close the whole array
        2.b. if no closing quote is found, then the data is no good
                discard it, and terminate JSON at the end of the last data block
    */

    let startIndex = brokenJson.length - 1;
    let a = '"data:';
    let b = '"';
    let i = startIndex * 2;

    while(startIndex > 0) {
        let lastDataIndex = brokenJson.lastIndexOf(a,startIndex);

        if (-1 === lastDataIndex)
            return null; //throw 'No data URLs were found in the JSON.'

        let nextQuoteIndex = brokenJson.indexOf(b, lastDataIndex + a.length);

        if(-1 === nextQuoteIndex) {
            startIndex = startIndex - 1;
        } else {
            return [
                brokenJson.substring(0,nextQuoteIndex+1),
                ']]'
            ].join('');
        }

        if (--i < 0)
            throw 'Loop breaker in fixBrokenJson';

    }

}

////////////////////////////////////////////////////////////////////////
//const htmlUtil = (() => {

    /*
    function exampleDrawTable() {
        
        const data = {
            headers: ['1', '2', '3'],
            rows: [
                ['a','b','c'],
                ['d','e','f'],
                ['g','h','i'],
            ]
        };

        return drawTable(data);

    }
    */


    function drawRows(itemsArray) {
        return itemsArray.map(o=>drawRow(o,false)).join('');
    };

    function drawRow(items, isHeader = false) {
        let tag = (true === isHeader) ? 'th' : 'td';

        return [
            '<tr>',
            ...items.map(item=>`<${tag}>${item}</${tag}>`),
            '</tr>'
        ].join('');
    }

    function drawTable(data) {
        return [
            '<table>',
            ...(data.headers ? drawRow(data.headers,true) : ''),
            ...(data.rows ? drawRows(data.rows,false) : ''),
            '</table>'
        ].join('');
    };

    function createElement(html) {
        let template = document.createElement('template');
        template.innerHTML = html.trim();
        let documentFragment = template.content;
        return documentFragment;
    }

//     return {
//         drawTable,
//         createElement
//     };

// })();


function sendFile(file) {
    var a = document.createElement('a');
    a.href = file.data;
    a.download = file.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    a = null;
}     

function fileLinkOnclickHandler(ev) {
    // create a dynamic file link and download it
    pd(ev);
    const link = ev.target;
    const index = link.getAttribute('data-index');
    const file = appData.r.unpackedFiles[index];
    sendFile(file);        
};

function showHide(el,tf) {
    el.style.setProperty('display', tf ? 'block' : 'none');
}

///////////////////////////////////////////////////
// const validationUtil = (() => {

    // tests to see if the Sender has dropped too many
    // files and will overflow the Receiver's clipboard buffer
    function testForSenderClipboardBufferOverflow() {
        
        let blobTextLength = appData.s.packedJson.length;
    
        let isBufferError = 
            (0 != settings.sender.clipboardBufferSize) // 0 == unlimited
            && (blobTextLength > settings.sender.clipboardBufferSize);
    
        showHide(ui.fileReceiveError,isBufferError);    
        
    };
    
    function updateClipboardBufferSize(value) {

        let number = Number(value);
        let badInput = Number.isNaN(number);
        
        if(badInput)
            settings.sender.clipboardBufferSize = 0;
        else                
            settings.sender.clipboardBufferSize = number;

        if(ui.clipboardBufferSize) {
            ui.clipboardBufferSize.nextElementSibling
                .classList.toggle('invalid',badInput);

            testForSenderClipboardBufferOverflow();
        }
        
    }
        
    function testFileLengths(files) {
        for(let i=0;i<files.length;i++) {
            let file = files[i];
            file.isFileLengthError = !testFileLength(file);
        }
    }
    function testFileLength(file) {
        if(!file.data)
            return false;

        // https://stackoverflow.com/a/32140193/740639
        let expectedLength = ((4 * file.size / 3) + 3) & ~3;
        let base64Length = (file.data.split(',').at(-1) || '').length;

        // return false when mismatched lengths
        return (expectedLength === base64Length);
    }

//     return {
//         clipboardBufferSize,
//         testForSenderClipboardBufferOverflow,
//         testFileLengths
//     };

// })();
///////////////////////////////////////////////////

function deleteFileFromSendQueue(unpackedFiles, id) {
    unpackedFiles.splice(id,1);
    afterFileProcessed(unpackedFiles);
};

function drawReceiveFileTable(files) {

    ui.saveAllFiles.disabled = true;
    ui.clearFiles.disabled = true;
    let goodFilesCount=0;
    let container = ui.fileReceiveList;

    while(container.firstChild) 
        container.firstChild.remove();

    if (!files) {
        container.innerHTML =  'No files have been received.';
        return;
    }

    // sort files by name
    // and broken files at the bottom
    files.sort((a,b) => { 
        if (null === b.data)
            return -1;

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())}
    );

    let data = {
        headers: ['File', 'Size', 'Status', 'Single File'],
        rows: []
    }
    
    let isFileFailure = false;
    files.forEach(file => {
        let row = [];
        let isGoodStatus = true;
        let index = files.indexOf(file);
        let rowError = 'Failure';

        if(file.isFileLengthError) {            
            row.push(`<span class="failure">${file.name}</span>`);
            rowError = 'Length of the received file did not match what was expected.';
            isGoodStatus = false;            
        } else {
            row.push(`<a href="#" class="receiveLink" data-index="${index}">${file.name}</a>`)
            goodFilesCount++;        
        }
        row.push(file.size);
        row.push(isGoodStatus ? 'Success' : rowError);
        data.rows.push(row);
    });

    // let tableHtml = htmlUtil.drawTable(data);
    // let tableElement = htmlUtil.createElement(tableHtml);
    let tableHtml = drawTable(data);
    let tableElement = createElement(tableHtml);
      
    container.appendChild(tableElement);

    showHide(ui.fileReceiveError,isFileFailure);

    if(goodFilesCount) {
        ui.saveAllFiles.disabled = false;
        ui.clearFiles.disabled = false;
    }

};

// interesting note: the js minifier that I used renamed a global scope variable
// to b, which was originally the name of rb(), and it caused the error:
// "ReferenceError: can't access lexical declaration 'b' before initialization"
function renderButton (className,value,text) { 
    return `<button type="button" class="${className}" value="${value}">${text}</button>`.replaceAll('&','&#x1f4cb; Copy '); 
}

function drawSendFileTable(unpackedFiles) {

    ui.copyAllButton.disabled = true;
    let container = ui.fileSendQueue.querySelector('div');
    while(container.firstChild) 
        container.firstChild.remove();

    if(!unpackedFiles.length) {
        container.innerHTML = 'The queue is currently empty.';
        return;
    }
    // sort files by name
    // and broken files at the bottom
    unpackedFiles.sort((a,b) => { 
        if (null === b.data)
            return -1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())}
    );

    let sp = ui.showPasteable.checked;

    let data = {
        headers: ['File', 'Size', 'Remove', 'Single File', 
            ...(sp ? ['JS Pasteable'] : '')
        ],
        rows: []
    };

    /*
    data.rows = unpackedFiles.map((o,i)=>[
            o.name,
            o.size,
            `<button type="button" class="remove" value="${i}">Remove</button>`,
            `<button type="button" class="copySingle" value="${i}">&#x1f4cb; Copy Single File</button>`,
            ...(sp ? [`<button type="button" class="copyJs" value="${i}">&#x1f4cb; Copy Pasteable</button>`] : '')
        ]
    );
    */
    
    //if(sp) data.headers.push('JS Pasteable');
    
    /* 
    NOTE: On refactoring / size optimizing code

    /// this for-loop is ~180 bytes more than above refactored Array.map code (which is slightly less readable)
    
    for(let i=0;i<unpackedFiles.length;i++) {
        let file = unpackedFiles[i];
        let row = [];
        //row.push(`<a href="${file.data}" download="${file.name}">${file.name}</a>`)
        row.push(file.name);
        row.push(file.size);
        row.push(`<button type="button" class="remove" value="${i}">Remove</button>`);
        row.push(`<button type="button" class="copySingle" value="${i}">&#x1f4cb; Copy Single File</button>`);
        if (sp) row.push(`<button type="button" class="copyJs" value="${i}">&#x1f4cb; Copy Pasteable</button>`);
        data.rows.push(row);
    } 

    /// this version is 45 bytes less than the Array.map above (but even less readable)
    let b = (c,i,t) => `<button type="button" class="${c}" value="${i}">${t}</button>`.replaceAll('&','&#x1f4cb; Copy ');
    
    data.rows = unpackedFiles.map((o,i)=>[
            o.name,
            o.size,
            b('remove',i,'Remove'),
            b('copySingle',i,'& Single File'),
            ...(sp ? [b('copyJs',i,'& Pasteable')] : '')
        ]
        );

        /// I did not compare their minified outputs
    
    */
    
        data.rows = unpackedFiles.map((o,i)=>[
                o.name,
                o.size,
                renderButton('remove',i,'Remove'),
                renderButton('copySingle',i,'& Single File'),
                ...(sp ? [renderButton('copyJs',i,'& Pasteable')] : '')
            ]
        );

    // let tableHtml = htmlUtil.drawTable(data);
    // let tableElement = htmlUtil.createElement(tableHtml);
    let tableHtml = drawTable(data);
    let tableElement = createElement(tableHtml);
        
    container.appendChild(tableElement);
    ui.copyAllButton.disabled = false;

};

function makeJsPaste(id) {
    
    let file = appData.s.unpackedFiles[id];

    let code = [
        `var a=document.createElement('a');`,
        `a.href='${file.data}';`,
        `a.download='${file.name}';`,
        `document.body.appendChild(a).click();`,
        `a.parentElement.removeChild(a);`,
        `a=undefined;`
    ].join('');
    
    copyToClipboard(code);    
    
}

function clickAllFileLinks() {
    ui.fileReceiveQueue
        .querySelectorAll('a')
        .forEach(o=>o.click());        
}

function copyToClipboard(text) {
    if (!navigator || !navigator.clipboard || !navigator.clipboard.writeText) {
        copyToClipboard = clipboardFallback;
        clipboardFallback(text);
        return;
    }
    navigator.clipboard.writeText(text);
}

function clipboardFallback(text) {
    let el = document.getElementById('clipboardSource');

    if(!el) {
        el = document.createElement('textarea');
        el.id = 'clipboardSource';
        document.body.appendChild(el);
    }
    
    el.value = text;
    el.focus();
    el.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        // can't copy
        console.log('cannot copy to clipboard');
    }
    el.value = '';
}


function afterFileProcessed(unpackedFiles) {
    appData.s.unpackedFiles = unpackedFiles;
    //let packedFiles = fileUtil.packFiles(unpackedFiles);    
    let packedFiles = packFiles(unpackedFiles);    
    appData.s.packedJson = JSON.stringify(packedFiles);
    drawSendFileTable(unpackedFiles);
    testForSenderClipboardBufferOverflow();
};

async function onNewFiles(fileItems) {
    toggleDropZone(true);

    //return fileUtil.processDroppedFiles(
    return processDroppedFiles(
        fileItems)
    .then((files) => {
        afterFileProcessed(files);
    }).then(() => {
        toggleDropZone(false);
    });

};

function toggleDropZone(isWaiting) {
    let cl = ui.dropZone.classList;
    if(isWaiting) {
        cl.remove('drag-enter','ready');
        cl.add('waiting');
    } else {
        cl.remove('drag-enter','waiting');
        cl.add('ready');
    }
}

function handleFileDrop(ev) {

    pd(ev);
    if(!ev.dataTransfer.files.length) {
        toggleDropZone(false);
        return;
    }
    
    onNewFiles(ev.dataTransfer.items);

}

function clearError() {
    let el = ui.errorMessage;
    el.querySelector('div').innerText = '';
    el.classList.remove('visible');
}
function showError(message) {
    ui.errorMessage.querySelector('div').innerHTML += `<p>${message}</p>` ;
    ui.errorMessage.classList.add('visible');
}

document.addEventListener("readystatechange", () => {
    if (document.readyState === 'complete') {
        init();
    }
});
