TODO:

* clean up embedded css 

#clipboardBufferOverflowError : change css to classname instead of id

* write detailed usage instructions

* test in other browsers
- Works in firefox

IN PROGRESS:


DONE:
* UI: show error messages on receive error for cut off data
* UI: disable copy to clipboard button if queue is empty
* UI - delete file from sender queue
* sort files by name in processFiles
* Add file preview box to receiver
* Copy to clipboard button.
* multi-file drop, and get
* move tabs into their own divs, don't reuse UI elements
* UI: indicate when copied to clipboard
* UI: indicate when files dragging over target zone
* buffer overflow setting and warning
* performance: 
        A tags with data take a long time to calculate CSS styles (when switching DOM tabs)
        Fix: create file download links on demand at download time
* Split screen with both sender and receiver.
        ** why? 
        * because I was sending and receiving files between hosts, and stopping to click on the correct tab (send/receive)
        slows down and interferes with the drag-and-drop from Windows Explorer. Clicking the tab causes the OS to bring
        the browser window to top of z-order. Which may cause it to overlap Windows Explorer, necessitating an additional click
        to z-order-top Windows Explorer.

* Paste to deploy - Write JS snippet that the user can paste into a web browser JS console which will render this app onto a blank browser Window.  For usage when Internet access is disable on the remote host. 

* async code when working with big files because the UI locks up and it triggers the web browser "wait/cancel" prompt


REJECTED:
* option to auto download on paste 

NOTES:
https://github.com/mpgn/ropycat - similar idea to mine, but uses keyboard simulator to transfer files for when clipboard is totally disabled. Future enhancement to mine: accept input from keyboard simulator

https://www.npmjs.com/package/@fidian/rumkin-compression
- add this to build.js to compress consoleDownloader.js by 60%


some interesting security reads about attacks that use base64 encoded files hidden in html emails
https://thedfirreport.com/2023/08/28/html-smuggling-leads-to-domain-wide-ransomware/
https://attack.mitre.org/techniques/T1027/006/