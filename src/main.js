// ==================== Configuration & Constants ====================
const CONFIG = {
    CACHE_SIZE: 1000,
    DOM_CHUNK_SIZE: 50,
    DEBOUNCE_DELAY: 200,
    STORAGE_KEYS: {
        SETTINGS: 'arabicDictSettings'
    },
    CLASS_NAMES: {
        WRAPPED: 'arabic-wrapped-31245',
        DEFINITION_CONTAINER: 'opentip-definition-container-31245',
        DEFINITION_TABLE: 'opentip-definition-table-31245',
        ARABIC_TEXT: 'arabic-text-31245',
        DEFINITION_ROW: 'definition-row-31245',
        DEFINITION_NUMBER: 'definition-number-31245',
        KEYBOARD_HINT: 'keyboard-hint-31245',
        DARK_MODE: 'dark-mode-31245',
        SETTINGS_PANEL: 'dict-settings-panel-31245'
    }
};

// Default settings
const DEFAULT_SETTINGS = {
    extensionEnabled: true,
    darkMode: false,
    popupFontSize: 14,
    popupWidth: 400,
    popupMaxHeight: 300,
    historyEnabled: true,
    history: []
};

// Load settings from storage
let settings = { ...DEFAULT_SETTINGS };

// ==================== Storage Functions ====================
function loadSettings() {
    return new Promise(function(resolve) {
        chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS], function(result) {
            if (result[CONFIG.STORAGE_KEYS.SETTINGS]) {
                settings = { ...DEFAULT_SETTINGS, ...result[CONFIG.STORAGE_KEYS.SETTINGS] };
            }
            applySettings();
            resolve(settings);
        });
    });
}

function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.SETTINGS]: settings });
    applySettings();
}

function applySettings() {
    // Apply dark mode to document
    if (settings.darkMode) {
        document.documentElement.classList.add(CONFIG.CLASS_NAMES.DARK_MODE);
    } else {
        document.documentElement.classList.remove(CONFIG.CLASS_NAMES.DARK_MODE);
    }
    
    // Handle extension enabled/disabled
    if (settings.extensionEnabled) {
        enableExtension();
    } else {
        disableExtension();
    }
    
    // Update any existing popups with new size/font settings
    var containers = document.querySelectorAll('.' + CONFIG.CLASS_NAMES.DEFINITION_CONTAINER);
    containers.forEach(function(container) {
        container.style.fontSize = settings.popupFontSize + 'px';
        container.style.width = settings.popupWidth + 'px';
        container.style.maxHeight = settings.popupMaxHeight + 'px';
        
        if (settings.darkMode) {
            container.style.backgroundColor = '#2d2d2d';
            container.style.color = '#e0e0e0';
            container.style.borderColor = '#444';
        } else {
            container.style.backgroundColor = '';
            container.style.color = '';
            container.style.borderColor = '';
        }
    });
}

// ==================== Extension Toggle Functions ====================
function enableExtension() {
    document.body.classList.remove('extension-disabled');
    if (document.getElementsByClassName(CONFIG.CLASS_NAMES.WRAPPED).length === 0) {
        setTimeout(wrapArabicWords, 0);
    }
}

function disableExtension() {
    document.body.classList.add('extension-disabled');
    
    var wrappedElements = document.getElementsByClassName(CONFIG.CLASS_NAMES.WRAPPED);
    var elementsToRestore = [];
    for (var i = 0; i < wrappedElements.length; i++) {
        elementsToRestore.push(wrappedElements[i]);
    }
    
    elementsToRestore.forEach(function(span) {
        var textNode = document.createTextNode(span.textContent);
        span.parentNode.replaceChild(textNode, span);
    });
    
    activePopups.clear();
    currentlyHoveredElement = null;
    hoveredElementData = null;
}

// ==================== Settings UI ====================
function createSettingsPanel() {
    if (document.querySelector('.' + CONFIG.CLASS_NAMES.SETTINGS_PANEL)) {
        return;
    }
    
    var panel = document.createElement('div');
    panel.className = CONFIG.CLASS_NAMES.SETTINGS_PANEL;
    panel.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: ${settings.darkMode ? '#2d2d2d' : 'white'}; 
                    color: ${settings.darkMode ? '#e0e0e0' : 'black'};
                    padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    max-width: 400px; z-index: 1000000002;">
            <h2 style="margin-top: 0;">Arabic Dictionary Settings</h2>
            
            <label style="display: block; margin-bottom: 15px; padding: 10px; background: ${settings.darkMode ? '#3d3d3d' : '#f0f0f0'}; border-radius: 4px;">
                <input type="checkbox" id="extensionEnabled" ${settings.extensionEnabled ? 'checked' : ''} style="margin-right: 10px;">
                <strong>Enable Extension</strong>
                <div style="font-size: 0.9em; color: ${settings.darkMode ? '#aaa' : '#666'}; margin-top: 5px;">
                    Turn off to disable all dictionary features on this page
                </div>
            </label>
            
            <h3>Appearance</h3>
            
            <label style="display: block; margin-bottom: 15px;">
                <input type="checkbox" id="darkMode" ${settings.darkMode ? 'checked' : ''}>
                Dark Mode
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
                Font Size: 
                <input type="range" id="fontSize" min="10" max="24" value="${settings.popupFontSize}" style="width: 200px;">
                <span id="fontSizeValue">${settings.popupFontSize}px</span>
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
                Popup Width: 
                <input type="range" id="popupWidth" min="250" max="600" value="${settings.popupWidth}" style="width: 200px;">
                <span id="popupWidthValue">${settings.popupWidth}px</span>
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
                Popup Max Height: 
                <input type="range" id="popupHeight" min="200" max="500" value="${settings.popupMaxHeight}" style="width: 200px;">
                <span id="popupHeightValue">${settings.popupMaxHeight}px</span>
            </label>
            
            <div style="text-align: right;">
                <button id="saveSettings" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                <button id="cancelSettings" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('fontSize').addEventListener('input', function() {
        document.getElementById('fontSizeValue').textContent = this.value + 'px';
    });
    
    document.getElementById('popupWidth').addEventListener('input', function() {
        document.getElementById('popupWidthValue').textContent = this.value + 'px';
    });
    
    document.getElementById('popupHeight').addEventListener('input', function() {
        document.getElementById('popupHeightValue').textContent = this.value + 'px';
    });
    
    document.getElementById('saveSettings').addEventListener('click', function() {
        var newSettings = {
            extensionEnabled: document.getElementById('extensionEnabled').checked,
            darkMode: document.getElementById('darkMode').checked,
            popupFontSize: parseInt(document.getElementById('fontSize').value),
            popupWidth: parseInt(document.getElementById('popupWidth').value),
            popupMaxHeight: parseInt(document.getElementById('popupHeight').value)
        };
        
        saveSettings(newSettings);
        document.body.removeChild(panel);
    });
    
    document.getElementById('cancelSettings').addEventListener('click', function() {
        document.body.removeChild(panel);
    });
}


// ==================== Message Listener for Settings ====================
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
    
    if (request.action === 'ping') {
        sendResponse({status: 'alive'});
        return true;
    }
    
    if (request.action === 'openSettings') {
        createSettingsPanel();
        sendResponse({status: 'opened'});
        return true;
    }
    
    if (request.action === 'settingsUpdated') {
        console.log('Settings updated:', request.settings);
        
        // Update settings
        settings = { ...settings, ...request.settings };
        
        // Apply settings immediately
        applySettings();
        
        // Save to storage
        chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.SETTINGS]: settings });
        
        // Show feedback
        showCopyFeedback('Settings applied!');
        
        sendResponse({status: 'applied'});
        return true;
    }
    
    return true;
});

// ==================== Buck2Uni and Transliteration ====================
const buck2uni = {
    "'": "\u0621", "|": "\u0622", ">": "\u0623", "&": "\u0624", "<": "\u0625",
    "}": "\u0626", "A": "\u0627", "b": "\u0628", "p": "\u0629", "t": "\u062A",
    "v": "\u062B", "j": "\u062C", "H": "\u062D", "x": "\u062E", "d": "\u062F",
    "*": "\u0630", "r": "\u0631", "z": "\u0632", "s": "\u0633", "$": "\u0634",
    "S": "\u0635", "D": "\u0636", "T": "\u0637", "Z": "\u0638", "E": "\u0639",
    "g": "\u063A", "_": "\u0640", "f": "\u0641", "q": "\u0642", "k": "\u0643",
    "l": "\u0644", "m": "\u0645", "n": "\u0646", "h": "\u0647", "w": "\u0648",
    "Y": "\u0649", "y": "\u064A", "F": "\u064B", "N": "\u064C", "K": "\u064D",
    "a": "\u064E", "u": "\u064F", "i": "\u0650", "~": "\u0651", "o": "\u0652",
    "`": "\u0670", "{": "\u0671"
};

const harakaat = ['a', 'u', 'i', 'F', 'N', 'K', '~', 'o'];

const diacriticsRegex = new RegExp(`[${harakaat.join('')}]`, 'g');
const buck2uniPatterns = Object.entries(buck2uni).map(([key, value]) => ({
    pattern: new RegExp(key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "g"),
    value
}));

const uni2buck = {};
for (var key in buck2uni) {
    uni2buck[buck2uni[key]] = key;
}

const arabicChars = Object.keys(uni2buck).join('');
const arabicRegex = new RegExp("([" + arabicChars + "]+)", "g");

const isFirefox = typeof InstallTrigger !== 'undefined';
const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

// ==================== Optimized Data Structures ====================
class OptimizedDictArray {
    constructor() {
        this.map = new Map();
    }
    
    get(key) {
        return this.map.get(key) || [];
    }
    
    addItem(key, value) {
        if (!this.map.has(key)) {
            this.map.set(key, []);
        }
        this.map.get(key).push(value);
    }
}

// ==================== File Reading ====================
function readFile(url) {
    return new Promise(function(resolve, reject) {
        var req = new XMLHttpRequest();
        req.open('GET', url);
        req.onload = function() {
            if (req.status == 200 || req.status == 0) {
                resolve(req.responseText);
            } else {
                reject(Error(req.statusText));
            }
        };
        req.onerror = function() {
            reject(Error('Network Error'));
        };
        req.send();
    });
}

function readExtensionFile(path) {
    return readFile(chrome.extension.getURL(path));
}

// ==================== Dictionary Creation ====================
function createMorphTableFromFile(path) {
    return new Promise(function(resolve, reject) {
        readExtensionFile(path).then(function(text) {
            createMorphTableFromText(text).then(function(table) {
                resolve(table);
            });
        });
    });
}

function createMorphTableFromText(text) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            var lines = text.split('\n');
            var table = new OptimizedDictArray();
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line != '' && line[0] != ';') {
                    var elems = line.split(/\s/);
                    table.addItem(elems[0], elems[1]);
                }
            }
            resolve(table);
        }, 0);
    });
}

function createDictTableFromFile(path) {
    return new Promise(function(resolve, reject) {
        readExtensionFile(path).then(function(text) {
            createDictTable(text).then(function(table) {
                resolve(table);
            });
        });
    });
}

function createDictTable(text) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            var lines = text.split('\n');
            var table = new OptimizedDictArray();
            var root = '---';
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line != '' && line[0] != ';') {
                    var def = {};
                    var elems = line.split(/\s/);

                    def.root = root;
                    if (elems[1] == undefined) {
                        console.log('bad elem: ', elems);
                    }
                    def.word = elems[1].trim();
                    def.morph = elems[2].trim();
                    var meta = elems.slice(3).join(' ').split(/ <pos>|<\/pos> /);
                    def.def = meta[0].trim().split(/;/).join(', ');
                    if (meta[1] == undefined) {
                        meta[1] = "";
                    }
                    def.pos = meta[1].trim();
                    table.addItem(elems[0], def);
                } else if (line != '' && line.trim() == ';') {
                    root = '---';
                } else if (line != '' && line.slice(0, 5) == ';--- ') {
                    root = line.split(/\s/)[1];
                }
            }
            resolve(table);
        }, 0);
    });
}

// ==================== Transliteration Functions ====================
function detransliterate(word) {
    if (!word) return word;
    var result = word;
    for (var i = 0; i < buck2uniPatterns.length; i++) {
        var pattern = buck2uniPatterns[i];
        result = result.replace(pattern.pattern, pattern.value);
    }
    return result;
}

function transliterate(word) {
    if (!word) return word;
    var result = word;
    for (var key in buck2uni) {
        result = result.replace(new RegExp(buck2uni[key], "g"), key);
    }
    return result;
}

function removeDiacriticsBuckwalter(word) {
    return word.replace(diacriticsRegex, "");
}

// ==================== Core Lookup with Caching ====================
const lookupCache = new Map();

function lookup(word) {
    if (lookupCache.has(word)) {
        return lookupCache.get(word);
    }
    
    var processedWord = removeDiacriticsBuckwalter(transliterate(word));
    var data = [];

    for (var i = 0; i < processedWord.length; i++) {
        for (var j = i + 1; j <= processedWord.length; j++) {
            var current = lookupPrefStemSuff(
                processedWord.slice(0, i),
                processedWord.slice(i, j),
                processedWord.slice(j)
            );
            data = data.concat(current);
        }
    }
    
    if (lookupCache.size >= CONFIG.CACHE_SIZE) {
        const firstKey = lookupCache.keys().next().value;
        lookupCache.delete(firstKey);
    }
    lookupCache.set(word, data);
    
    return data;
}

// ==================== Core Analysis ====================
function lookupPrefStemSuff(pref, stem, suff) {
    var prefMatches = dictprefs ? dictprefs.get(pref) : [];
    var stemMatches = dictstems ? dictstems.get(stem) : [];
    var suffMatches = dictsuffs ? dictsuffs.get(suff) : [];

    var data = [];

    var bracketify = function(word, space) {
        if (word && word[0] != '[') {
            if (space == 1)
                return ' [' + word + ']';
            else if (space == 2) {
                return '[' + word + '] ';
            } else {
                return '[' + word + ']';
            }
        } else return '';
    };

    for (var p = 0; p < prefMatches.length; p++) {
        var pref = prefMatches[p];
        for (var s = 0; s < stemMatches.length; s++) {
            var stem = stemMatches[s];
            for (var su = 0; su < suffMatches.length; su++) {
                var suff = suffMatches[su];
                if (isObeysGrammar(pref.morph, stem.morph, suff.morph)) {
                    var combine = {};

                    combine.root = detransliterate(stem.root);
                    combine.word = [
                        detransliterate(pref.word),
                        detransliterate(stem.word),
                        detransliterate(suff.word)
                    ].join('');

                    combine.def = [bracketify(pref.def, 2), stem.def, bracketify(suff.def, 1)].join('');

                    combine.pos = [pref.pos, stem.pos, suff.pos].join(', ');
                    combine.morph = [pref.morph, stem.morph, suff.morph].join(', ');
                    data.push(combine);
                }
            }
        }
    }

    return data;
}

function isObeysGrammar(prefMorph, stemMorph, suffMorph) {
    return tableab && tablebc && tableac &&
        tableab.get(prefMorph).indexOf(stemMorph) != -1 &&
        tablebc.get(stemMorph).indexOf(suffMorph) != -1 &&
        tableac.get(prefMorph).indexOf(suffMorph) != -1;
}

// ==================== Lazy Dictionary Loading ====================
var dictstems, dictprefs, dictsuffs, tableab, tablebc, tableac;
var dictDataLoaded = false;
var pendingLookups = [];

function ensureDictLoaded() {
    if (!dictDataLoaded) {
        return loadDictData().then(function() {
            dictDataLoaded = true;
            for (var i = 0; i < pendingLookups.length; i++) {
                var pending = pendingLookups[i];
                pending.resolve(performLookup(pending.word));
            }
            pendingLookups = [];
        });
    }
    return Promise.resolve();
}

function performLookup(word) {
    return lookup(word);
}

function lazyLookup(word) {
    if (!dictDataLoaded) {
        return new Promise(function(resolve) {
            pendingLookups.push({
                word: word,
                resolve: resolve
            });
            ensureDictLoaded();
        });
    }
    return Promise.resolve(performLookup(word));
}

function loadDictData() {
    var f = [];
    f[0] = createDictTableFromFile('data/dictstems');
    f[1] = createDictTableFromFile('data/dictprefixes');
    f[2] = createDictTableFromFile('data/dictsuffixes');
    f[3] = createMorphTableFromFile('data/tableab');
    f[4] = createMorphTableFromFile('data/tablebc');
    f[5] = createMorphTableFromFile('data/tableac');
    
    return Promise.all(f).then(function(values) {
        dictstems = values[0];
        dictprefs = values[1];
        dictsuffs = values[2];
        tableab = values[3];
        tablebc = values[4];
        tableac = values[5];
        dictDataLoaded = true;
    });
}

// ==================== Clipboard Functions ====================
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback(text);
    } catch (err) {
        try {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.top = '0';
            textarea.style.left = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            var success = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (success) {
                showCopyFeedback(text);
            } else {
                prompt('Press Ctrl+C to copy:', text);
            }
        } catch (fallbackErr) {
            prompt('Press Ctrl+C to copy:', text);
        }
    }
}

function showCopyFeedback(text) {
    var preview = text.split('\n')[0];
    if (preview.length > 30) preview = preview.substring(0, 30) + '...';
    
    var notification = document.createElement('div');
    notification.textContent = '✓ Copied: ' + preview;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '1000000001';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(function() {
            document.body.removeChild(notification);
        }, 500);
    }, 2000);
}

function formatAllDefinitions(word, data) {
    var lines = [];
    lines.push(word + ' (' + data.length + ' definitions)');
    lines.push('');
    
    for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        lines.push((i + 1) + '. ' + entry.word + ': ' + entry.def + ' (root: ' + entry.root + ')');
    }
    
    if (settings.historyEnabled) {
        addToHistory(word, data);
    }
    
    return lines.join('\n');
}

function formatSingleDefinition(entry, index) {
    if (settings.historyEnabled) {
        addToHistory(entry.word, [entry], index);
    }
    return index + '. ' + entry.word + ': ' + entry.def + ' (root: ' + entry.root + ')';
}

// ==================== History Functions ====================
function addToHistory(word, data, selectedIndex) {
    if (!settings.historyEnabled) return;
    
    var historyEntry = {
        word: word,
        timestamp: Date.now(),
        definitions: data,
        selectedDefinition: selectedIndex !== undefined ? data[selectedIndex] : null
    };
    
    settings.history.unshift(historyEntry);
    
    if (settings.history.length > 100) {
        settings.history = settings.history.slice(0, 100);
    }
    
    chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.SETTINGS]: settings });
}

// ==================== UI Functions ====================
function createDefinitionsHTML(word, data) {
    if (!settings.extensionEnabled) {
        return "<div></div>";
    }
    
    var str = "";
    str += "<div class='" + CONFIG.CLASS_NAMES.DEFINITION_CONTAINER + "' ";
    str += "style='font-size: " + settings.popupFontSize + "px; ";
    str += "width: " + settings.popupWidth + "px; ";
    str += "max-height: " + settings.popupMaxHeight + "px; ";
    str += "overflow-y: auto;";
    if (settings.darkMode) {
        str += "background-color: #2d2d2d; color: #e0e0e0; border: 1px solid #444;";
    }
    str += "'>";
    
    str += "<div class='" + CONFIG.CLASS_NAMES.KEYBOARD_HINT + "'>Press 1-" + data.length + " to copy</div>";
    
    str += "<table class='" + CONFIG.CLASS_NAMES.DEFINITION_TABLE + "'>";
    
    if (!data.length) {
        str += "<tr><td>No definition found</td></tr>";
    } else {
        str += "<tr><th></th><th>Word</th><th>Definition</th><th>Root</th></tr>";
        
        for (var i = 0; i < data.length; i++) {
            var entry = data[i];
            var rowId = 'def-row-' + i + '-' + Math.random().toString(36).substr(2, 9);
            
            str += "<tr id='" + rowId + "' class='" + CONFIG.CLASS_NAMES.DEFINITION_ROW + "' data-index='" + i + "'>";
            str += "<td class='" + CONFIG.CLASS_NAMES.DEFINITION_NUMBER + "'>" + (i + 1) + ".</td>";
            str += "<td class='" + CONFIG.CLASS_NAMES.ARABIC_TEXT + "'>" + entry.word + "</td>";
            str += "<td>" + entry.def + "</td>";
            str += "<td class='" + CONFIG.CLASS_NAMES.ARABIC_TEXT + "'>" + entry.root + "</td>";
            str += "</tr>";
        }
    }
    str += "</table></div>";
    
    str += "<style>";
    str += "." + CONFIG.CLASS_NAMES.KEYBOARD_HINT + " {";
    str += "  color: " + (settings.darkMode ? '#aaa' : '#888') + ";";
    str += "  font-size: 0.8em;";
    str += "  font-style: italic;";
    str += "  padding: 4px 8px;";
    str += "  text-align: center;";
    str += "  border-bottom: 1px solid " + (settings.darkMode ? '#444' : '#eee') + ";";
    str += "  margin-bottom: 4px;";
    str += "}";
    str += "." + CONFIG.CLASS_NAMES.DEFINITION_NUMBER + " {";
    str += "  color: " + (settings.darkMode ? '#777' : '#999') + ";";
    str += "  font-size: 0.9em;";
    str += "  font-family: monospace;";
    str += "  padding-right: 8px;";
    str += "  text-align: right;";
    str += "  width: 30px;";
    str += "}";
    str += "." + CONFIG.CLASS_NAMES.DEFINITION_TABLE + " th {";
    str += "  color: " + (settings.darkMode ? '#ccc' : '#333') + ";";
    str += "  border-bottom: 1px solid " + (settings.darkMode ? '#444' : '#ddd') + ";";
    str += "}";
    str += "." + CONFIG.CLASS_NAMES.DEFINITION_ROW + ":hover {";
    str += "  background-color: " + (settings.darkMode ? '#3d3d3d' : '#f5f5f5') + ";";
    str += "}";
    str += "." + CONFIG.CLASS_NAMES.DEFINITION_ROW + ".selected {";
    str += "  background-color: " + (settings.darkMode ? '#1e3a5f' : '#e3f2fd') + ";";
    str += "}";
    str += "</style>";
    
    return str;
}

// ==================== Precise Hover Tracking ====================
var currentlyHoveredElement = null;
var hoveredElementData = null;
var activePopups = new Map();

document.addEventListener('mouseover', function(event) {
    if (!settings.extensionEnabled) return;
    
    var target = event.target;
    if (target.classList && target.classList.contains(CONFIG.CLASS_NAMES.WRAPPED)) {
        currentlyHoveredElement = target;
        if (activePopups.has(target)) {
            hoveredElementData = activePopups.get(target);
        }
    }
});

document.addEventListener('mouseout', function(event) {
    var target = event.target;
    if (target.classList && target.classList.contains(CONFIG.CLASS_NAMES.WRAPPED)) {
        var related = event.relatedTarget;
        if (!related || !related.classList || !related.classList.contains(CONFIG.CLASS_NAMES.WRAPPED)) {
            currentlyHoveredElement = null;
            hoveredElementData = null;
        }
    }
});

// ==================== Keyboard Handlers ====================
document.addEventListener('keydown', function(event) {
    if (!settings.extensionEnabled) return;
    
    var key = event.key;
    if (key < '1' || key > '9') return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    if (!currentlyHoveredElement || !hoveredElementData) return;
    
    var index = parseInt(key) - 1;
    var data = hoveredElementData.data;
    
    if (index < data.length) {
        event.preventDefault();
        event.stopPropagation();
        
        var definition = formatSingleDefinition(data[index], index + 1);
        copyToClipboard(definition);
        
        var rows = document.querySelectorAll('.' + CONFIG.CLASS_NAMES.DEFINITION_ROW);
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.remove('selected');
        }
        if (rows[index]) {
            rows[index].classList.add('selected');
            setTimeout(function(selectedRow) {
                return function() {
                    if (selectedRow) selectedRow.classList.remove('selected');
                };
            }(rows[index]), 200);
        }
    }
});

document.addEventListener('keydown', function(event) {
    if (!settings.extensionEnabled) return;
    
    if (!event.ctrlKey || !event.altKey) return;
    
    var key = event.key;
    if (key < '1' || key > '9') return;
    
    if (!currentlyHoveredElement || !hoveredElementData) return;
    
    var index = parseInt(key) - 1;
    var data = hoveredElementData.data;
    
    if (index < data.length) {
        event.preventDefault();
        event.stopPropagation();
        
        var definition = formatSingleDefinition(data[index], index + 1);
        copyToClipboard(definition);
        
        var rows = document.querySelectorAll('.' + CONFIG.CLASS_NAMES.DEFINITION_ROW);
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.remove('selected');
        }
        if (rows[index]) {
            rows[index].classList.add('selected');
            setTimeout(function(selectedRow) {
                return function() {
                    if (selectedRow) selectedRow.classList.remove('selected');
                };
            }(rows[index]), 200);
        }
    }
});

// ==================== DOM Processing ====================
function wrapArabicWords() {
    if (!settings.extensionEnabled) return;
    
    var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (node.parentElement.tagName.match(/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i) || 
                    !node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    var textNodes = [];
    var currentNode;
    while (currentNode = walker.nextNode()) {
        textNodes.push(currentNode);
    }
    
    processTextNodesInChunks(textNodes, 0);
}

function processTextNodesInChunks(nodes, startIndex) {
    var endIndex = Math.min(startIndex + CONFIG.DOM_CHUNK_SIZE, nodes.length);
    
    for (var i = startIndex; i < endIndex; i++) {
        processTextNode(nodes[i]);
    }
    
    if (endIndex < nodes.length) {
        setTimeout(function() {
            processTextNodesInChunks(nodes, endIndex);
        }, 0);
    } else {
        setupTooltipsForWrappedElements();
    }
}

function processTextNode(curElem) {
    var newHTML = curElem.nodeValue.replace(arabicRegex, 
        "<span class='" + CONFIG.CLASS_NAMES.WRAPPED + "' " +
        "style='cursor: pointer;' " +
        "onmouseover='this.style.background = \"#FFFF00\";this.style.color = \"black\"' " +
        "onmouseout='this.style.background = \"transparent\";this.style.color = \"inherit\"'>$1</span>");
    
    if (newHTML == curElem.nodeValue) {
        return;
    }

    var spanElem = document.createElement("span");
    spanElem.innerHTML = newHTML;
    curElem.parentNode.replaceChild(spanElem, curElem);
}

function setupTooltipsForWrappedElements() {
    Opentip.lastZIndex = 1000000000;
    var elems = document.getElementsByClassName(CONFIG.CLASS_NAMES.WRAPPED);
    
    var tooltipObserver = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (entry.isIntersecting) {
                var elem = entry.target;
                if (!elem._tooltipInitialized) {
                    elem._tooltipInitialized = true;
                    createTooltipForElement(elem);
                }
                tooltipObserver.unobserve(elem);
            }
        }
    }, { rootMargin: '50px' });
    
    for (var i = 0; i < elems.length; i++) {
        tooltipObserver.observe(elems[i]);
    }
}

function createTooltipForElement(elem) {
    if (!settings.extensionEnabled) return;
    
    lazyLookup(elem.textContent).then(function(data) {
        var content = createDefinitionsHTML(elem.textContent, data);
        
        elem.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            copyToClipboard(formatAllDefinitions(elem.textContent, data));
        });
        
        elem._opentip = new Opentip(elem, content, { 
            style: 'glass',
            showOn: 'mouseover',
            hideOn: 'mouseout',
            tipJoint: 'top'
        });
        
        activePopups.set(elem, {
            word: elem.textContent,
            data: data
        });
    });
}

// ==================== Initialization ====================
function initialize() {
    loadSettings().then(function() {
        console.log('Running on:', isFirefox ? 'Firefox' : (isChrome ? 'Chrome' : 'Unknown browser'));
        ensureDictLoaded();
        if (settings.extensionEnabled) {
            setTimeout(wrapArabicWords, 0);
        }
    });
}

initialize();
