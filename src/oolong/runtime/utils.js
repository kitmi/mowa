"use strict";

const pick = function(obj, keys) { 
    Array.isArray(keys) || (keys = [keys]);
    
    return keys.reduce((r, k) => { if (k in obj) {r[k] = obj[k]} return r; }, {});
};