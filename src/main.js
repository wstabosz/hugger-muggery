/*
To anyone scrutinizing this code:
    
    This app was written with some irregular specifications which may look like amateur coding. 

    * I wanted the code to be small, so you'll see single character variable names
        * but I'm not too experienced at code size-optimization, so you might be scratching your head at other things you see
    * I wanted to avoid dependency on a UI library, so you'll see dynamic HTML with inline event definition
    
    Also, this code was written more for fun than for production, so many decisions were made
    without deep consideration.

    That said, if you see a glaring mistake, where I could have coded better, please feel free 
    to message me with suggestions. I love to learn.

*/
function a(how) {
    let ui = {}; // cache of DOM elements
    let settings = {
        sender: {
            clipboardBufferSize: 0 // 0 == unlimited
        },
        receiver: {}
    };

    const appData = { 
        s: {
            unpackedFiles: {}
        },
        r: {
            unpackedFiles: {}            
        }
    };

    let root = '.';
    const paths = {
        aboutHtml: `${root}/about.html`
    };

    let me = {
        ui,
        settings,
        appData,
        paths
    };

    /**
     * Build a cache of all the DOM elements with ids
     */

    const initUi = () => {
        document.querySelectorAll('[id]')
            .forEach(o=>ui[o.id]=o);
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
    const addEventListener2 = function(element,eventType,listener) {
        if(!element) return;
        element.addEventListener(eventType,listener);            
    };

    const initDocumentEvents = () => {

        document.addEventListener('click', (ev) => {

            let events = {
                '.copySingle': (ev) => { 
                    let t = ev.target;
                    let id = t.value;
                    let file = fileUtil.packSingleFile(appData.s.unpackedFiles,id);
                    sendTextToClipboard(JSON.stringify(file));
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

            let keys = Object.keys(events);
            let filteredEvents = keys.filter(o=>ev.target.matches(o));

            filteredEvents.forEach(o=>events[o](ev));

        });

    };
    
    const pd = (e) => {e.preventDefault()}
    const init = function(how) {

        //const c = cacheElement;
        initUi();
        initDocumentEvents();
        const ael = addEventListener2;
        let el = null;
        
        /**
         * Sets the reference for the variable named "el"          
         * @param {*} newEl a new dom element
         * @returns false if the new element is undefined.
         * FUTURE FEATURE: the app can be built with args that will exclude the Sender/Receiver, 
         * so the DOM elements may be missing. setEl was a retrofit, a better solution would
         * be to have separate init functions Sender/Receiver
         */
        const setEl = (newEl) => {
            el = null;
            if(undefined === newEl)
                return false;
            el = newEl;
                return true;
        }

        const validateInput = {
            clipboardBufferSize: (value) => {

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
        };


        if(setEl(ui.copyFromBox)) {
            el.value = '';
        }

        if(setEl(ui.showPasteable)) {
            ael(el, 'click', () => {drawSendFileTable(appData.s.unpackedFiles)});
        }

        if(setEl(ui.pasteToBox)) {
            ael(el,'paste', handlePaste);
            ael(el, 'focus', (ev) => {
                ev.target.setAttribute('x-placeholder', ev.target.getAttribute('placeholder'));
                ev.target.setAttribute('placeholder', 'Press Ctrl+V to paste.');                
            });
            ael(el, 'blur', (ev) => {                
                ev.target.setAttribute('placeholder', ev.target.getAttribute('x-placeholder'));
            });
            el.value = '';
        }
        
        if(setEl(ui.saveAllFiles)) {        
            ael(el,'click', (ev) => { 
                clickAllFileLinks(); 
                glow(ev.target);
            });
            el.disabled = true;
        }

        if(setEl(ui.clearFiles)) {
            ael(el,'click', (ev) => {
                ui.fileReceiveList.innerHTML = 'No files have been received.';
                ui.pasteToBox.value = '';
                ui.saveAllFiles.disabled = true;
                ui.clearFiles.disabled = true;
            });
            el.disabled = true;
        }
    
        if(setEl(ui.dropZone)) {
            ael(document.body,'dragover', (ev)=>pd(ev))
            ael(document.body,'drop', (ev)=>pd(ev))
            ael(el,'drop', handleFileDrop);
            ael(el,'dragover', (ev)=>pd(ev));
            //ael(el,'dragover', dragOverHandler);
            ael(el,'dragenter', (ev) => {
                // if(!ev.dataTransfer.types.every(o=>'Files' === o))
                //     return;
                ev.target.classList.toggle('drag-enter', true);
            });
            ael(el,'dragleave', (ev) => {
                ev.target.classList.toggle('drag-enter', false);
            });
        }

        if(setEl(ui.copyToClipboardButton)) {    
            el.disabled = true;
            ael(el, 'click', (ev) => {
                copyToClipboard(ui.copyFromBox);
                glow(ev.target);
            });
        }
        
        if(setEl(ui.fileInput)) {
            // when user picks files with the file input element
            ael(el, 'change', (ev) => onNewFiles(ev.target.files));
        }

        if(setEl(ui.browseLink)) {
            ael(el, 'click', (ev) => {
                pd(ev);
                fileInput.click();
            });
        }

        if(setEl(ui.clipboardBufferSize)) {
            ael(el,'input', (ev) => {
                validateInput.clipboardBufferSize(ev.target.value);                
            });
        }               

        // set the initial mode
        if(setEl(ui.clipboardBufferSize)) {
            // if==true then this means the Sender div is present in the DOM
            // it may not be present if the app was built to only include the Receiver
            validateInput.clipboardBufferSize(el.value);
        }

        if (how==1) {
            // how == 1 means the app was loaded from the portable version
            // which is missing the contents for the About tab
            ui.aboutLabel.remove();
        }
        
        /*
        WORK IN PROGRESS: accept files via keyboard simulator (or real keystrokes from a masochist)        
        ael(ui.pasteToBox, 'input', debounce((ev) => {
            console.log('manual text entry received');
            let fileBlobJson = ev.target.value;
            
            if (fileBlobJson.substr(-3) !== '***') 
                return

            console.log('received keyboard simulation [end-of-transmission] message');
            processFileBlobJson(fileBlobJson.substr(0,fileBlobJson.length-3));

        }));
        */

    };

    const glow = function(elm) {
        elm.classList.add('glow');        
        setTimeout(() => {        
            elm.classList.remove('glow');
        }, 300);
    };
    
    const fileUtil = (() => {

        async function fileListToBase64(fileList) {
            // create function which return resolved promise
            // with data:base64 string
            const getBase64 = function(file) {
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
        const packFiles = function(unpackedFiles) {
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

        const packSingleFile = function(unpackedFiles,id) {
            let file = unpackedFiles[id];
            return [
                [[file.name,file.size]],
                [[file.data]]
            ];
        }

        const unpackFiles = function(packedFiles) {
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

        const processDroppedFiles = async (data) => {
            
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
        
        return {
            processDroppedFiles
            ,packFiles
            ,unpackFiles
            ,packSingleFile
        };

    })();

    const processFileBlobJson = function(fileBlobJson) {            

        const parseJsonAndUnpack = function(json) {
            const files = fileUtil.unpackFiles(
                JSON.parse(json)
            );                
            return files;
        };

        try {
            appData.r.unpackedFiles = parseJsonAndUnpack(fileBlobJson);
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

    const handlePaste = function(ev) {

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

    const fixBrokenJson = function(brokenJson) {

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

    const htmlUtil = (() => {

        /*
        const exampleDrawTable = function() {
            
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


        const drawRows = function(itemsArray) {
            return itemsArray.map(o=>drawRow(o,false)).join('');
        };

        const drawRow = function(items, isHeader = false) {
            let tag = (true === isHeader) ? 'th' : 'td';

            return [
                '<tr>',
                ...items.map(item=>`<${tag}>${item}</${tag}>`),
                '</tr>'
            ].join('');
        }

        const drawTable = function(data) {
            return [
                '<table>',
                ...(data.headers ? drawRow(data.headers,true) : ''),
                ...(data.rows ? drawRows(data.rows,false) : ''),
                '</table>'
            ].join('');
        };

        const createElement = function(html) {
            let template = document.createElement('template');
            template.innerHTML = html.trim();
            let documentFragment = template.content;
            return documentFragment;
        }

        return {
            drawTable,
            createElement
        };

    })();
    
    
    const sendFile = function(file) {
        var a = document.createElement('a');
        a.href = file.data;
        a.download = file.name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        a = null;
    }     

    const fileLinkOnclickHandler = function(ev) {
        // create a dynamic file link and download it
        pd(ev);
        const link = ev.target;
        const index = link.getAttribute('data-index');
        const file = appData.r.unpackedFiles[index];
        sendFile(file);        
    };

    const drawReceiveFileTable = function(files) {

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
            headers: ['File', 'Size', 'Status'],
            rows: []
        }
        
        let isFileFailure = false;
        files.forEach(file => {
            let row = [];
            let isGoodStatus = true;
            let index = files.indexOf(file);
            if(null !== file.data) {
                row.push(`<a href="#" class="receiveLink" data-index="${index}">${file.name}</a>`)
                goodFilesCount++;
            } else {
                row.push(`<span class="failure">${file.name}</span>`);
                isGoodStatus = false;
                isFileFailure = true;
            }
            row.push(file.size);
            row.push(isGoodStatus ? 'Success' : 'Failure');
            data.rows.push(row);
        });

        let tableHtml = htmlUtil.drawTable(data);
        let tableElement = htmlUtil.createElement(tableHtml);
        
        // attach the event handlers
        // tableElement.querySelectorAll('a').forEach(a=>{
        //     a.addEventListener('click',fileLinkOnclickHandler);
        // });

        container.appendChild(tableElement);

        //let errorMessage = ui.fileReceiveQueue.querySelector('p');
        ui.fileReceiveError.style.setProperty('display', isFileFailure ? 'block' : 'none');

        if(goodFilesCount) {
            ui.saveAllFiles.disabled = false;
            ui.clearFiles.disabled = false;
        }

    };

    const deleteFileFromSendQueue = function(unpackedFiles, id) {
        unpackedFiles.splice(id,1);
        afterFileProcessed(unpackedFiles);
    };

    const drawSendFileTable = function(unpackedFiles) {

        copyToClipboardButton.disabled = true;
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

        data.rows = unpackedFiles.map((o,i)=>[
                o.name,
                o.size,
                `<button type="button" class="remove" value="${i}">Remove</button>`,
                `<button type="button" class="copySingle" value="${i}">&#x1f4cb; Copy Single File</button>`,
                ...(sp ? [`<button type="button" class="copyJs" value="${i}">&#x1f4cb; Copy Pasteable</button>`] : '')
            ]
        );
        
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

         let b = (c,i,t) => `<button type="button" class="${c}" value="${i}">${t}</button>`.replaceAll('&','&#x1f4cb; Copy ');
        
         data.rows = unpackedFiles.map((o,i)=>[
                 o.name,
                 o.size,
                 b('remove',i,'Remove'),
                 b('copySingle',i,'Single File'),
                 ...(sp ? [b('copyJs',i,'Pasteable')] : '')
             ]
          );
 
        let tableHtml = htmlUtil.drawTable(data);
        let tableElement = htmlUtil.createElement(tableHtml);
        
        // let buttons = tableElement.querySelectorAll('button.remove');
        // for(let i=0;i<buttons.length;i++) {
        //     let button = buttons[i];
        //     button.addEventListener('click',(ev) => {
        //         let id = ev.target.value;
        //         deleteFileFromSendQueue(files, id);
        //     });
        // }
        // buttons = tableElement.querySelectorAll('button.copy').forEach(o=>{
        //     o.addEventListener('click',(ev) => {
        //         let t = ev.target;
        //         let id = t.value;
        //         makeJsPaste(id);
        //         glow(t);
        //     });
        // });
        
        container.appendChild(tableElement);
        copyToClipboardButton.disabled = false;

    };

    const makeJsPaste = function(id) {
        
        let file = appData.s.unpackedFiles[id];

        let code = [
            `var a=document.createElement('a');`,
            `a.href='${file.data}';`,
            `a.download='${file.name}';`,
            `document.body.appendChild(a).click();`,
            `a.parentElement.removeChild(a);`,
            `a=undefined;`
        ].join('');
        
        sendTextToClipboard(code);    

    }

    // this is a retrofit, it's a bit wonky
    // originally, ui.copyFromBox was only ever going to
    // contain the JSON for the packed files
    const sendTextToClipboard = function (text) {
        let t = ui.copyFromBox.value;
        ui.copyFromBox.value = text;
        copyToClipboard(ui.copyFromBox);
        ui.copyFromBox.value = t;
    };

    const clickAllFileLinks = function() {
        ui.fileReceiveQueue
            .querySelectorAll('a')
            .forEach(o=>o.click());        
    }

    const copyToClipboard = function(element) {

        const fallback = (element) => {
            element.focus();
            element.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                // can't copy
            }
        }
        if (!navigator || !navigator.clipboard || !navigator.clipboard.writeText) {
            fallback(element);
            return;
        }

        navigator.clipboard.writeText(element.value);

        // navigator.clipboard.writeText(element.value).then(() => {
        //     console.log('good: navigator.clipboard.writeText');
        // }, () => {
        //     console.log('bad: navigator.clipboard.writeText');
        // });
    }

    // tests to see if the Sender has dropped too many
    // files and will overflow the Receiver's clipboard buffer
    const testForSenderClipboardBufferOverflow = function() {
        
        let blobTextLength = ui.copyFromBox.value.length;

        let isBufferError = 
            (0 != settings.sender.clipboardBufferSize) // 0 == unlimited
            && (blobTextLength > settings.sender.clipboardBufferSize);

        ui.clipboardBufferOverflowError.style.setProperty('display', isBufferError ? 'block' : 'none');
        
    };

    const afterFileProcessed = (unpackedFiles) => {
        appData.s.unpackedFiles = unpackedFiles;
        let packedFiles = fileUtil.packFiles(unpackedFiles);
        ui.copyFromBox.value = JSON.stringify(packedFiles);            
        drawSendFileTable(unpackedFiles);
        testForSenderClipboardBufferOverflow();      
    };

    const onNewFiles = function(fileItems) {
        toggleDropZone(true);

        return fileUtil.processDroppedFiles(
            fileItems)
        .then((files) => {
            afterFileProcessed(files);
        }).then(() => {
            toggleDropZone(false);
        });

    };

    const toggleDropZone = function(isWaiting) {
        let cl = ui.dropZone.classList;
        if(isWaiting) {
            cl.remove('drag-enter','ready');
            cl.add('waiting');
        } else {
            cl.remove('drag-enter','waiting');
            cl.add('ready');
        }
    }

    const handleFileDrop = function(ev) {

        pd(ev);
        if(!ev.dataTransfer.files.length) {
            toggleDropZone(false);
            return;
        }
        
        onNewFiles(ev.dataTransfer.items);

    }

    const clearError  = function(message) {
        let el = ui.errorMessage;
        el.querySelector('div').innerText = '';
        el.classList.remove('visible');
    }
    const showError = function(message) {
        ui.errorMessage.querySelector('div').innerText += message + '\n';
        ui.errorMessage.classList.add('visible');
    }

    const dragOverHandler = function(ev) {
        pd(ev);
    }

    document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
            init(how);
        }
    };
    
    // if (how==0) {
    //     document.onreadystatechange = () => {
    //         if (document.readyState === 'complete') {
    //             init();
    //         }
    //     };
    // } else {
    //     init(how);
    // }
    
    return me;
}
var b = a(0);