const {app, BrowserWindow, ipcMain, dialog} = require("electron")
const fs = require("fs")
const path = require("path")
const eventTypes = require("./eventTypes.json")
const {exec} = require("child_process")
let cookedDir = ""
let projectDir = ""

let cookedFiles = []
let contentFiles = []

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * @param {string} root
 * @return {string[]}
 */
function readAllDirs(root) {
    let files = []
    let dirs = []

    console.log("Preparing to read" + root + "...")

    let found = fs.readdirSync(root)

    for(let i = 0; i < found.length; i++){
        let file = found[i]

        if (file.includes(".")) {
            files.push(path.join(root, file));
        } else {
            // If a directory, queue it for scanning
            dirs.push(file);
        }
    }

    // Scan all the queued directories
    for(let i = 0; i < dirs.length; i++){
        let nextDir = path.join(root, dirs[i]);
        files = files.concat(readAllDirs(nextDir))
    }

    return files
}

function readContent() {

}

function readCooked() {

}

function updateProgress(options){
    if(typeof options === 'string'){
        options = {task: options}
    }

    win.webContents.send(eventTypes.update_progress, options)
}

function completeTask(){
    win.webContents.send(eventTypes.update_progress, {finished:true})
}

function openComparisonResult(result){
    let compWin = new BrowserWindow({height: 900, width: 1200, autoHideMenuBar: false, show: false, webPreferences:{nodeIntegration: true}})
    compWin.loadFile("./comparison.html")

    compWin.on("ready-to-show", () => {
        compWin.show()

        console.log("funneling data!")
        compWin.webContents.send(eventTypes.funnel_data, result)
    })
}

async function runComparison(){

    updateProgress({ task: "Starting process..." })

    await delay(100)

    updateProgress("Reading contents...")
    let project = readAllDirs(projectDir);

    updateProgress("Reading cooked...")

    let cooked = readAllDirs(cookedDir)
    console.dir(cooked);

    await delay(100)

    updateProgress("Compiling differences...")

    await delay (100)

    updateProgress("Completed!")

    await delay(100)

    completeTask()

    openComparisonResult({cooked, project})
}

function bindEvents() {
    ipcMain.on(eventTypes.close, ()=>{
        app.exit(0)
    })

    ipcMain.on(eventTypes.select_project, () => {
        dialog.showOpenDialog(win, { title: "choose directory", properties: [ 'openDirectory']}).then(result => {
            console.log(result.canceled)
            console.log(result.filePaths)

            if(result.filePaths.length > 0){
                projectDir = result.filePaths[0]

                win.webContents.send(eventTypes.selected_folders, {projectDir, cookedDir})
            }

        }).catch(err => {
            console.log(err)
        })
    })

    ipcMain.on(eventTypes.select_cooked, () => {
        dialog.showOpenDialog(win, { title: "choose directory", properties: [ 'openDirectory']}).then(result => {
            console.log(result.canceled)
            console.log(result.filePaths)

            if(result.filePaths.length > 0){
                cookedDir = result.filePaths[0]

                win.webContents.send(eventTypes.selected_folders, {projectDir, cookedDir})
            }

        }).catch(err => {
            console.log(err)
        })
    })

    ipcMain.on(eventTypes.open_file, (event, args) => {
        console.log("explorer " + args.file)
        exec("explorer " + args.file);
    })

    ipcMain.on(eventTypes.selected_folders, (i, event) => {
        console.dir(event)
        projectDir = event.projectDir
        cookedDir = event.cookedDir
    })

    ipcMain.on(eventTypes.run_compare, () => {
        runComparison()
    })
}

let win = null

function makeWindow() {
    win = new BrowserWindow({ show: false, height: 600, width: 1200, autoHideMenuBar: true, frame: false, webPreferences:{nodeIntegration: true} })
    win.loadFile("./index.html");

    win.on("ready-to-show", e => {
        win.show()
        bindEvents()
    })
}

function main() {
    //let files = readAllDirs("C:\\Users\\spide\\Dropbox\\UnrealProjects\\RustwalkerLegends\\")
    app.on("ready", makeWindow)
}

main()