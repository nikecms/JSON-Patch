var equalsOptions = { strict: true };
var _equals = require('deep-equal');
var areEquals = function (a, b) {
    return _equals(a, b, equalsOptions);
};
var helpers_1 = require('./helpers');
var core_1 = require('./core');
/* export all core functions */
var core_2 = require('./core');
exports.applyOperation = core_2.applyOperation;
exports.applyPatch = core_2.applyPatch;
exports.applyReducer = core_2.applyReducer;
exports.getValueByPointer = core_2.getValueByPointer;
exports.validate = core_2.validate;
exports.validator = core_2.validator;
/* export some helpers */
var helpers_2 = require('./helpers');
exports.JsonPatchError = helpers_2.PatchError;
exports.deepClone = helpers_2._deepClone;
exports.escapePathComponent = helpers_2.escapePathComponent;
exports.unescapePathComponent = helpers_2.unescapePathComponent;
var beforeDict = new WeakMap();
var Mirror = (function () {
    function Mirror(obj) {
        this.observers = new Map();
        this.obj = obj;
    }
    return Mirror;
}());
var ObserverInfo = (function () {
    function ObserverInfo(callback, observer) {
        this.callback = callback;
        this.observer = observer;
    }
    return ObserverInfo;
}());
function getMirror(obj) {
    return beforeDict.get(obj);
}
function getObserverFromMirror(mirror, callback) {
    return mirror.observers.get(callback);
}
function removeObserverFromMirror(mirror, observer) {
    mirror.observers.delete(observer.callback);
}
/**
 * Detach an observer from an object
 */
function unobserve(root, observer) {
    observer.unobserve();
}
exports.unobserve = unobserve;
/**
 * Observes changes made to an object, which can then be retrieved using generate
 */
function observe(obj, callback) {
    var patches = [];
    var observer;
    var mirror = getMirror(obj);
    if (!mirror) {
        mirror = new Mirror(obj);
        beforeDict.set(obj, mirror);
    }
    else {
        var observerInfo = getObserverFromMirror(mirror, callback);
        observer = observerInfo && observerInfo.observer;
    }
    if (observer) {
        return observer;
    }
    observer = {};
    mirror.value = helpers_1._deepClone(obj);
    if (callback) {
        observer.callback = callback;
        observer.next = null;
        var dirtyCheck = function () {
            generate(observer);
        };
        var fastCheck = function () {
            clearTimeout(observer.next);
            observer.next = setTimeout(dirtyCheck);
        };
        if (typeof window !== 'undefined') {
            if (window.addEventListener) {
                window.addEventListener('mouseup', fastCheck);
                window.addEventListener('keyup', fastCheck);
                window.addEventListener('mousedown', fastCheck);
                window.addEventListener('keydown', fastCheck);
                window.addEventListener('change', fastCheck);
            }
            else {
                document.documentElement.attachEvent('onmouseup', fastCheck);
                document.documentElement.attachEvent('onkeyup', fastCheck);
                document.documentElement.attachEvent('onmousedown', fastCheck);
                document.documentElement.attachEvent('onkeydown', fastCheck);
                document.documentElement.attachEvent('onchange', fastCheck);
            }
        }
    }
    observer.patches = patches;
    observer.object = obj;
    observer.unobserve = function () {
        generate(observer);
        clearTimeout(observer.next);
        removeObserverFromMirror(mirror, observer);
        if (typeof window !== 'undefined') {
            if (window.removeEventListener) {
                window.removeEventListener('mouseup', fastCheck);
                window.removeEventListener('keyup', fastCheck);
                window.removeEventListener('mousedown', fastCheck);
                window.removeEventListener('keydown', fastCheck);
            }
            else {
                document.documentElement.detachEvent('onmouseup', fastCheck);
                document.documentElement.detachEvent('onkeyup', fastCheck);
                document.documentElement.detachEvent('onmousedown', fastCheck);
                document.documentElement.detachEvent('onkeydown', fastCheck);
            }
        }
    };
    mirror.observers.set(callback, new ObserverInfo(callback, observer));
    return observer;
}
exports.observe = observe;
/**
 * Generate an array of patches from an observer
 */
function generate(observer) {
    var mirror = beforeDict.get(observer.object);
    _generate(mirror.value, observer.object, observer.patches, "", null);
    if (observer.patches.length) {
        core_1.applyPatch(mirror.value, observer.patches);
    }
    var temp = observer.patches;
    if (temp.length > 0) {
        observer.patches = [];
        if (observer.callback) {
            observer.callback(temp);
        }
    }
    return temp;
}
exports.generate = generate;
function checkArrayPredicate(oldVal, newVal, path, replaceArrayPredicate) {
    if (typeof replaceArrayPredicate !== "function")
        return replaceArrayPredicate || false;
    return replaceArrayPredicate(oldVal, newVal, path);
}
// Dirty check if obj is different from mirror, generate patches and update mirror
function _generate(mirror, obj, patches, path, replaceArrayPredicate) {
    if (obj === mirror) {
        return;
    }
    if (typeof obj.toJSON === "function") {
        obj = obj.toJSON();
    }
    var newKeys = helpers_1._objectKeys(obj);
    var oldKeys = helpers_1._objectKeys(mirror);
    var changed = false;
    var deleted = false;
    //if ever "move" operation is implemented here, make sure this test runs OK: "should not generate the same patch twice (move)"
    for (var t = oldKeys.length - 1; t >= 0; t--) {
        var key = oldKeys[t];
        var newPath = path + "/" + helpers_1.escapePathComponent(key);
        var oldVal = mirror[key];
        if (helpers_1.hasOwnProperty(obj, key) && !(obj[key] === undefined && oldVal !== undefined && Array.isArray(obj) === false)) {
            var newVal = obj[key];
            if (Array.isArray(oldVal) && Array.isArray(newVal) && checkArrayPredicate(oldVal, newVal, newPath, replaceArrayPredicate)) {
                var arrayPatches = [];
                _generate(oldVal, newVal, arrayPatches, '', false);
                if (arrayPatches.length > 0) {
                    patches.push({ op: "replace", path: newPath, value: helpers_1._deepClone(newVal) });
                }
            }
            else if (typeof oldVal == "object" && oldVal != null && typeof newVal == "object" && newVal != null) {
                _generate(oldVal, newVal, patches, newPath, replaceArrayPredicate);
            }
            else {
                if (oldVal !== newVal) {
                    changed = true;
                    patches.push({ op: "replace", path: newPath, value: helpers_1._deepClone(newVal) });
                }
            }
        }
        else {
            patches.push({ op: "remove", path: newPath });
            deleted = true; // property has been deleted
        }
    }
    if (!deleted && newKeys.length == oldKeys.length) {
        return;
    }
    for (var t = 0; t < newKeys.length; t++) {
        var key = newKeys[t];
        if (!helpers_1.hasOwnProperty(mirror, key) && obj[key] !== undefined) {
            patches.push({ op: "add", path: path + "/" + helpers_1.escapePathComponent(key), value: helpers_1._deepClone(obj[key]) });
        }
    }
}
/**
 * Create an array of patches from the differences in two objects
 */
function compare(tree1, tree2, replaceArrayPredicate) {
    var patches = [];
    _generate(tree1, tree2, patches, '', replaceArrayPredicate);
    return patches;
}
exports.compare = compare;
