'use strict';require('debug')('tracing')(__filename);const path=require('path');const Util=require('../../util.js');const _=Util._;class Entity{constructor(db){this._db=db;this._isNew=true}static find(condition){}static remove(condition){}get identifier(){}save(){if(this._isNew){this._db.insert(this)}else{this._db.update(this)}}erase(){this._db.remove(this)}}module.exports=Entity;