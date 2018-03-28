"use strict";

const Util = require('../../util.js');
const _ = Util._;

const OolUtils = require('./ool-utils.js');

class OolongField {
    /**
     * Oolong entity field
     * @constructs OolongField
     * @param {string} name
     * @param {object} rawInfo
     */
    constructor(name, rawInfo) {
        if (!rawInfo) {
            //empty field
            return;
        }

        /**
         * The name of the field
         * @type {string}
         * @public
         */
        this.name = name;

        /**
         * The default name of the field
         * @type {string}
         * @public
         */
        this.displayName = _.upperFirst(this.name);

        /**
         * The type of the field
         * @type {string}
         * @public
         */
        this.type = rawInfo.type;

        if (rawInfo.validators0) {
            /**
             * Stage-0 validators of this field
             * @type {array}
             * @public
             */
            this.validators0 = rawInfo.validators0; //OolongField._transformValidators(rawInfo.validators);
        }

        if (rawInfo.validators1) {
            /**
             * Stage-1 validators of this field
             * @type {array}
             * @public
             */
            this.validators1 = rawInfo.validators1; //OolongField._transformValidators(rawInfo.validators);
        }

        if (rawInfo.modifiers0) {
            /**
             * Stage-0 modifiers of this field
             * @type {array}
             * @public
             */
            this.modifiers0 = rawInfo.modifiers0;
        }

        if (rawInfo.modifiers1) {
            /**
             * Stage-1 modifiers of this field
             * @type {array}
             * @public
             */
            this.modifiers1 = rawInfo.modifiers1;
        }

        Object.assign(this, _.omit(rawInfo, [
            'type', 'subClass', 'validators0', 'validators1', 'modifiers0', 'modifiers1'
        ]));
    }

    /**
     * Clone the field
     * @param {Map} [stack] - Reference stack to avoid recurrence copy
     * @returns {OolongField}
     */
    clone(stack) {
        if (!stack) stack = new Map();
        let cl = new OolongField();
        stack.set(this, cl);

        Object.assign(cl, this);

        OolUtils.deepCloneField(this, cl, 'validators0', stack);
        OolUtils.deepCloneField(this, cl, 'validators1', stack);
        OolUtils.deepCloneField(this, cl, 'modifiers0', stack);
        OolUtils.deepCloneField(this, cl, 'modifiers1', stack);
        OolUtils.deepCloneField(this, cl, 'default', stack);
        OolUtils.deepCloneField(this, cl, 'values', stack);

        return cl;
    }

    /**
     * Translate the field into a plain JSON object
     * @returns {object}
     */
    toJSON() {
        return _.toPlainObject(this);
    }
}

module.exports = OolongField;