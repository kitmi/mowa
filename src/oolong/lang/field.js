"use strict";

const inflection = require('inflection');

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
        this.name = inflection.camelize(name, true);

        /**
         * The default name of the field
         * @type {string}
         * @public
         */
        this.defaultName = this.name;

        /**
         * The type of the field
         * @type {string}
         * @public
         */
        this.type = rawInfo.type;

        if (rawInfo.validators) {
            /**
             * Validators of this field
             * @type {array}
             * @public
             */
            this.validators = rawInfo.validators.map(v => (typeof v === 'string') ? v : { type: "FunctionCall", name: v.name, args: v.args });
        }

        if (rawInfo.modifiers) {
            /**
             * Modifiers of this field
             * @type {array}
             * @public
             */
            this.modifiers = rawInfo.modifiers.map(m => (typeof m === 'string') ? v : { type: "FunctionCall", name: m.name, args: m.args });
        }

        if (this.type === 'enum') {
            /**
             * Candidate values of this field
             * @type {array}
             * @public
             */
            this.values = OolUtils.translateOolObj(rawInfo.values);
        }

        Object.assign(this, _.pick(rawInfo, [
            'default', 'auto',
            'digits', 'range', 'unsigned', 'totalDigits', 'decimalDigits',
            'maxLength', 'fixedLength', 'untrim',
            'readOnly', 'writeOnceOnly', 'optional',
            'comment'
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

        OolUtils.deepCloneField(this, cl, 'validators', stack);
        OolUtils.deepCloneField(this, cl, 'modifiers', stack);
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