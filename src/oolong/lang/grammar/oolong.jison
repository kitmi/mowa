/* Oolong Parser for Jison */

/* JS declaration */
%{
    function ParserState () {
        this.indents = [0];
        this.indent = 0;
        this.dedents = 0;
        this.eof = false;
        this.comment = false;
        this.brackets = [];
        this.parsed = {};
    }

    ParserState.prototype = {
        get hasBrackets() {
            return this.brackets.length > 0;
        },

        get lastIndent() {
            return this.indents[this.indents.length - 1]
        },

        get hasIndent() {
            return this.indents.length > 0;
        },

        doIndent() {
            this.indents.push(this.indent);
        },

        doDedent() {
            this.dedents = 0;

            while (this.indents.length) {
                this.dedents++;
                this.indents.pop();
                if (this.lastIndent == this.indent) break;
            }
        },

        dedentAll() {
            this.indent = 0;
            this.dedents = this.indents.length - 1;
            this.indents = [0];
        },

        isTypeExist(type) {
            return this.parsed.type && (type in this.parsed.type);
        },

        use(namespace) {
            if (!this.parsed.namespace) {
                this.parsed.namespace = [];
            }

            this.parsed.namespace.push(namespace);
        },

        defType(type, def) {
            if (!this.parsed.type) {
                this.parsed.type = {};
            }

            this.parsed.type[type] = def;
        },

        addModifier(type, modifier) {
            if (!this.parsed.type[type].modifiers) {
                this.parsed.type[type].modifiers = [];
            }

            this.parsed.type[type].modifiers.push(modifier);
        },

        isEntityExist(entity) {
            return this.parsed.entity && (entity in this.parsed.entity);
        },

        defEntity(entity, def) {
            if (!this.parsed.entity) {
                this.parsed.entity = {};
            }
            this.parsed.entity[entity] = Object.assign({}, this.parsed.entity[entity], def);
        },

        defRelation(relation) {
            if (!this.parsed.relation) {
                this.parsed.relation = [];
            }

            if (Object.prototype.toString.call(relation) === '[object Array]') {
                this.parsed.relation = this.parsed.relation.concat(relation);
            } else {
                this.parsed.relation.push(relation);
            }
        },

        isSchemaExist(schema) {
            return this.parsed.schema && (schema in this.parsed.schema);
        },

        defSchema(schema, def, lineInfo) {
            if (!this.parsed.schema) {
                this.parsed.schema = {};
            }

            this.parsed.schema[schema] = def;
        },

        validate() {
            var errors = [];

            //add validations here

            if (errors.length > 0) {
                throw new Error(errors.join("\n"));
            }

            return this;
        },

        build() {
            return this.parsed;
        }
    };

    var UNITS = new Map([['K', 1024], ['M', 1048576], ['G', 1073741824], ['B', 1099511627776]]);

    function parseSize(size) {
        if (UNITS.has(size.substr(-1))) {
            let unit = size.substr(-1);
            let factor = UNITS[unit];

            size = size.substr(0, size.length - 1);

            return parseInt(size) * factor;
        } else {
            return parseInt(size);
        }
    }

    function unquoteString(str, quotes) {
        return str.substr(quotes, str.length-quotes*2);
    }

    var KEYWORDS = new Set([
        "not", "and", "or", "xor", "mod", "div", "in", "is", "like", //operators
        'int', 'integer', 'number', 'text', 'bool', 'boolean', 'blob', 'binary', 'datetime', 'date', 'time', 'year', 'timestamp', 'json', 'xml', 'enum', 'csv',
        'exact', 'fixed', 'untrim', 'unsigned', "only",
        "use", "type", "entity", "schema", "database", "relation", "default", "auto", "entities", "data",
        "with", "has", "have", "key", "index", "as", "unique", "its", "own", "for",
        "every", "may", "a", "several", "many", "great", "of", "one", "connect", "deploy", "to", "url",
        "optional", "readOnly", "writeOnceOnly",
        "interface", "accept", "do", "select", "where", "return", "exists", "otherwise", "unless", "populate", "by",
        "skip", "limit", "update", "create", "delete", "set",
        "encoding"
    ]);

    var BRACKET_PAIRS = {
        '}': '{',
        ']': '[',
        ')': '('
    };

    var DB_TYPES = new Set([
        "mysql", "mongodb"
    ]);

    var BUILTIN_TYPES = new Set([ 'int', 'float', 'decimal', 'text', 'bool', 'binary', 'datetime', 'json', 'xml', 'enum', 'csv' ]);

    if (typeof exports !== 'undefined') {
        exports.BUILTIN_TYPES = BUILTIN_TYPES;
        exports.KEYWORDS = KEYWORDS;
    }

    var state;
%}

%lex

uppercase               [A-Z]
lowercase               [a-z]
digit                   [0-9]

// identifiers
member_access           {identifier}((\ |\t|\f)*"."{identifier})+
column_range            {variable}(\ |\t|\f)*".""*"
variable                {member_access}|{identifier}
object_reference        "@"{variable}

identifier              ({xid_start})({xid_continue})*
xid_start               "_"|"$"|({uppercase})|({lowercase})
xid_continue            {xid_start}|{digit}

bool_value              ("true")|("false")
null_value              "null"

// numbers
bit_integer             {integer}("K"|"M"|"G"|"B")
integer                 ({decinteger})|({hexinteger})|({octinteger})
decinteger              (([1-9]{digit}*)|"0")
hexinteger              "0"[x|X]{hexdigit}+
octinteger              "0"[o|O]{octdigit}+
bininteger              "0"[b|B]{bindigit}+
hexdigit                {digit}|[a-fA-F]
octdigit                [0-7]
bindigit                [0|1]

floatnumber             {exponentfloat}|{pointfloat}
exponentfloat           ({digit}+|{pointfloat}){exponent}
pointfloat              ({digit}*{fraction})|({digit}+".")
fraction                "."{digit}+
exponent                [e|E][\+|\-]({digit})+

// regexp literal
regexp                  "/"{regexp_item}*"/"{regexp_flag}*
regexp_item             {regexp_char}|{escapeseq}
regexp_char             [^\\\n\/]
regexp_flag             "i"|"g"|"m"|"y"

// reserved
symbol_operators        {syntax_operators}|{relation_operators}|{math_operators}
word_operators          {logical_operators}|{math_operators2}|{relation_operators2}
braket_operators        "("|")"|"["|"]"|"{"|"}"
syntax_operators        "~"|","|":"|"|"|"--"|"->"|"<->"|"<-"
relation_operators      "!="|">="|"<="|">"|"<"|"="
logical_operators       "not"|"and"|"or"|"xor"
math_operators          "+"|"-"|"*"|"/"
math_operators2         "mod"|"div"
relation_operators2     "in"|"is"|"like"

// strings
longstring              {longstring_double}|{longstring_single}
longstring_double       '"""'{longstringitem}*'"""'
longstring_single       "'''"{longstringitem}*"'''"
longstringitem          {longstringchar}|{escapeseq}
longstringchar          [^\\]

shortstring             {shortstring_double}|{shortstring_single}
shortstring_double      '"'{shortstringitem_double}*'"'
shortstring_single      "'"{shortstringitem_single}*"'"
shortstringitem_double  {shortstringchar_double}|{escapeseq}
shortstringitem_single  {shortstringchar_single}|{escapeseq}
shortstringchar_single  [^\\\n\']
shortstringchar_double  [^\\\n\"]
escapeseq               \\.

%s INITIAL EMPTY DEDENTS INLINE

%%

<INITIAL><<EOF>>        %{  return 'EOF';  %}
<INITIAL>.|\n           %{
                            this.unput(yytext);
                            this.begin('EMPTY');

                            state = new ParserState();
                        %}
<EMPTY,INLINE><<EOF>>   %{
                            if (this.topState(0) === 'INLINE' && !state.comment && !state.eof) {
                                this.unput(' ');

                                state.eof = true;
                                this.begin('EMPTY');
                                return 'NEWLINE';

                            } else if (state.indents.length > 1) {
                            //reach end-of-file, but a current block still not in ending state

                                //put back the eof
                                this.unput(' ');

                                //dedent all
                                state.dedentAll();
                                state.eof = true;
                                this.begin('DEDENTS');

                            } else {
                                this.begin('INITIAL');
                                return 'EOF';
                            }
                        %}
<EMPTY>\                %{ state.indent++; %}
<EMPTY>\t               %{ state.indent = (state.indent + 8) & -7; %}
<EMPTY>\n               %{ state.indent = 0; if (state.comment) state.comment = false; %} // blank line
<EMPTY,INLINE>\#.*      %{ state.comment = true; %} /* skip comments */
<EMPTY>.                %{
                            this.unput( yytext )
                            //compare the current indents with the last
                            var last = state.lastIndent;
                            if (state.indent > last) {
                                //new indent
                                state.doIndent();
                                this.begin('INLINE');
                                return 'INDENT';

                            } else if (state.indent < last) {
                                //dedent
                                state.doDedent();
                                if (!state.hasIndent) {
                                    throw new Error("Inconsistent indentation.");
                                }
                                this.begin('DEDENTS');

                            } else {
                                //same indent
                                this.begin('INLINE');
                            }
                        %}
<DEDENTS>.|<<EOF>>      %{
                            if (state.dedents-- > 0) {
                                this.unput(yytext);
                                return 'DEDENT';

                            } else if (state.eof) {
                                this.popState();

                            } else {
                                this.unput(yytext);
                                this.begin('INLINE');
                            }
                        %}
<INLINE>\n              %{
                            // implicit line joining
                            if (!state.hasBrackets) {
                                state.indent = 0;
                                this.begin('EMPTY');

                                if (state.comment) {
                                    state.comment = false;
                                } else {
                                    return 'NEWLINE';
                                }
                            }
                        %}
<INLINE>[\ \t\f]+       /* skip whitespace, separate tokens */
<INLINE>{braket_operators}     %{
                            if (yytext == '{' || yytext == '[' || yytext == '(') {
                                state.brackets.push(yytext);
                            } else if (yytext == '}' || yytext == ']' || yytext == ')') {
                                var paired = BRACKET_PAIRS[yytext];
                                var lastBracket = state.brackets.pop();
                                if (paired !== lastBracket) {
                                    throw new Error("Inconsistent bracket.")
                                }
                            }
                            return yytext;
                        %}
<INLINE>{regexp}        return 'REGEXP';
<INLINE>{floatnumber}   %{
                            yytext = parseFloat(yytext);
                            return 'FLOAT';
                        %}
<INLINE>{integer}       %{
                            yytext = parseInt(yytext);
                            return 'INTEGER';
                        %}
<INLINE>{bit_integer}   %{
                            yytext = parseSize(yytext);
                            return 'INTEGER';
                        %}
<INLINE>{longstring}    %{
                            yytext = unquoteString(yytext, 3);
                            return 'STRING';
                        %}
<INLINE>{shortstring}   %{
                            yytext = unquoteString(yytext, 1);
                            return 'STRING';
                        %}
<INLINE>{member_access}    return 'DOTNAME';
<INLINE>{object_reference} %{
                                yytext = { type: 'ObjectReference', name: yytext.substr(1) };
                                return 'REFERENCE';
                           %}
<INLINE>{column_range}     return 'COLUMNS';
<INLINE>{bool_value}       %{
                                yytext = (yytext === 'true');
                                return 'BOOL';
                           %}
<INLINE>{null_value}       %{
                                yytext = null;
                                return 'NULL';
                           %}
<INLINE>{symbol_operators}  return yytext;
<INLINE>{identifier}    %{
                            return KEYWORDS.has(yytext)
                                ? yytext
                                : 'NAME';
                        %}

/lex

%right "<-"
%left "or"
%left "xor"
%left "and"
%nonassoc "in" "is" "like"
%left "not"
%left "!=" ">=" "<=" ">" "<" "="
%left "+" "-"
%left "*" "/" "mod" "div"
%nonassoc NEG

%start expr

%%

/** grammar **/
expr
    : input
        { var r = state; state = null; return r ? r.validate().build() : ''; }
    ;

input
    : EOF
    | input0 EOF
    ;

input0
    : NEWLINE
    | stmt
    | NEWLINE input0
    | stmt input0
    ;

stmt
    : use_stmt
    | type_stmt
    | entity_stmt
    | schema_stmt
    | relation_stmt
    ;

use_stmt
    : "use" STRING NEWLINE
        { state.use($2); }
    | "use" NEWLINE INDENT use_stmt_blk DEDENT
    ;

use_stmt_blk
    : STRING NEWLINE
        { state.use($1); }
    | STRING NEWLINE use_stmt_blk
        { state.use($1); }
    ;

type_stmt
    : "type" type_stmt_itm NEWLINE
    | "type" NEWLINE INDENT type_stmt_blk DEDENT
    ;

type_stmt_itm
    : identifier type_base_or_not type_qualifiers_or_not
        {
            var n = $1;
            if (state.isTypeExist(n)) throw new Error('Duplicate type definition detected at line ' + @1.first_line + '.');
            if (BUILTIN_TYPES.has(n)) throw new Error('Cannot use built-in type "' + n + '" as a custom type name at line ' + @1.first_line + '.');

            state.defType(n, Object.assign({type: 'text'}, $2, $3));
        }
    ;

type_base_or_not
    :
    | ':' types
        { $$ = $2; }
    ;

types
    : int_keyword unsigned_or_not
        { $$ = Object.assign({ type: 'int' }, $2); }
    | int_keyword '(' INTEGER ')' unsigned_or_not
        { $$ = Object.assign({ type: 'int', digits: parseInt($3) }, $5); }
    | number_type
        { $$ = Object.assign({ type: 'float' }, $1); }
    | number_type 'exact'
        { $$ = Object.assign({ type: 'decimal' }, $1); }
    | text_type untrim_or_not
        { $$ = Object.assign({}, $1, $2); }
    | bool_keyword
        { $$ = { type: 'bool' }; }
    | binary_type
    | 'datetime'
        { $$ = { type: 'datetime', range: 'datetime' }; }
    | 'datetime' 'date' 'only'
        { $$ = { type: 'datetime', range: 'date' }; }
    | 'datetime' 'time' 'only'
        { $$ = { type: 'datetime', range: 'time' }; }
    | 'datetime' 'year' 'only'
        { $$ = { type: 'datetime', range: 'year' }; }
    | 'datetime' 'timestamp'
        { $$ = { type: 'datetime', range: 'timestamp' }; }
    | 'json'
        { $$ = { type: 'json' }; }
    | 'xml'
        { $$ = { type: 'xml' }; }
    | 'csv'
        { $$ = { type: 'csv' }; }
    | identifier_or_str_array
        { $$ = { type: 'enum', values: $1 }; }
    | identifier_or_member_access
        { $$ = { type: $1 }; }
    ;

int_keyword
    : 'int'
    | 'integer'
    ;

unsigned_or_not
    :
    | 'unsigned'
        { $$ = { unsigned: true }; }
    ;

number_type
    : 'number'
        { $$ = {}; }
    | 'number' '(' INTEGER ')'
        { $$ = { totalDigits: parseInt($3) }; }
    | 'number' '(' ',' INTEGER ')'
        { $$ = { decimalDigits: parseInt($4) }; }
    | 'number' '(' INTEGER ',' INTEGER ')'
        { $$ = { totalDigits: parseInt($3), decimalDigits: parseInt($5) }; }
    ;

text_type
    : 'text'
        { $$ = { type: 'text' }; }
    | 'text' '(' INTEGER ')'
        { $$ = { type: 'text', maxLength: parseInt($3) }; }
    | 'text' '(' INTEGER ')' 'fixed'
        { $$ = { type: 'text', fixedLength: parseInt($3) }; }
    ;

untrim_or_not
    :
    | 'untrim'
        { $$ = { untrim: true }; }
    ;

bool_keyword
    : 'bool'
    | 'boolean'
    ;

binary_type
    : binary_keyword
        { $$ = { type: 'binary' }; }
    | binary_keyword '(' INTEGER ')'
        { $$ = { type: 'binary', maxLength: $3 }; }
    | binary_keyword '(' INTEGER ')' 'fixed'
        { $$ = { type: 'binary', fixedLength: $3 }; }
    ;

binary_keyword
    : 'blob'
    | 'binary'
    ;

type_qualifiers_or_not
    :
    | type_validator
    ;

type_validator
    : "~" identifier_function
        { $$ = { validators: [ $2 ] }; }
    | "~" identifier_function_array
        { $$ = { validators: $2 }; }
    ;

type_stmt_blk
    : type_stmt_itm NEWLINE
    | type_stmt_itm NEWLINE type_stmt_blk
    ;

entity_stmt
    : entity_stmt_hd NEWLINE
    | entity_stmt_hd NEWLINE INDENT entity_stmt_blk DEDENT
        {
            state.defEntity($1, $4);
        }
    ;

entity_stmt_hd
    : entity_stmt_hd0
        { state.defEntity($1); $$ = $1; }
    | entity_stmt_hd0 "is" identifier_or_member_access
        { state.defEntity($1, { base: $3 }); $$ = $1; }
    ;

entity_stmt_hd0
    : "entity" identifier
        {
            if (state.isEntityExist($2)) throw new Error('Duplicate entity definition detected at line ' + @1.first_line + '.');
            $$ = $2;
        }
    ;

entity_stmt_blk
    : with_stmt_or_not has_stmt_or_not key_stmt_or_not index_stmt_or_not data_stmt_or_not interface_stmt_or_not
        { $$ = Object.assign({}, $1, $2, $3, $4, $5, $6); }
    ;

with_stmt_or_not
    :
    | with_stmt
    ;

has_stmt_or_not
    :
    | has_stmt
    ;

key_stmt_or_not
    :
    | key_stmt
    ;

index_stmt_or_not
    :
    | index_stmt
    ;

data_stmt_or_not
    :
    | data_stmt
    ;

interface_stmt_or_not
    :
    | interface_stmt
    ;

with_stmt
    : "with" identifier_function NEWLINE
        { $$ = { features: [ $2 ] }; }
    | "with" NEWLINE INDENT with_stmt_blk DEDENT
        { $$ = { features: $4 }; }
    ;

with_stmt_blk
    : identifier_function NEWLINE
        { $$ = [$1]; }
    | identifier_function NEWLINE with_stmt_blk
        { $$ = [$1].concat($3); }
    ;

has_stmt
    : "has" has_stmt_itm NEWLINE
        { $$ = { fields: { [$2[0]]: $2[1] } }; }
    | "has" NEWLINE INDENT has_stmt_blk DEDENT
        { $$ = { fields: $4 }; }
    ;

has_stmt_itm
    : identifier type_base_or_not field_qualifiers_or_not variable_modifier_or_not
        { $$ = [$1, Object.assign({ type: $1 }, $2, $3, $4)]; }
    | identifier field_reference optional_qualifier_or_not
        { $$ = [$1, Object.assign({}, $2, $3) ]; }
    ;

field_default_value
    : "default" "(" "auto" ")"
        { $$ = { auto: true }; }
    | "default" "(" literal ")"
        { $$ = { 'default': $3 }; }
    ;

field_qualifiers_or_not
    :
    | field_qualifiers
    ;

variable_modifier_or_not
    :
    | variable_modifiers
    ;

optional_qualifier_or_not
    :
    | optional_qualifier
    ;

field_qualifiers
    : field_qualifier
    | field_qualifier field_qualifiers
        {
            for (var k in $2) {
                if (k in $1) {
                    throw new Error('Duplicate field qualifier detected at line ' + @1.first_line + '.');
                }
            }
            $$ = Object.assign({}, $1, $2);
        }
    ;

field_restriction
    : "readOnly"
        { $$ = { readOnly: true }; }
    | "writeOnceOnly"
        { $$ = { writeOnceOnly: true }; }
    ;

field_qualifier
    : field_default_value
    | type_validator
    | optional_qualifier
    | field_restriction
    | "--" STRING
        { $$ = { comment: $2 }; }
    ;

optional_qualifier
    : "optional"
        { $$ = { optional: true }; }
    ;

variable_modifiers
    : variable_modifier
        { $$ = { modifiers: [ $1 ] }; }
    | variable_modifier variable_modifiers
        {
            $$ = { modifiers: [ $1 ].concat($2.modifiers) };
        }
    ;

variable_modifier
    : "|" identifier_function
        { $$ = $2; }
    ;

field_reference
    : "->" identifier_or_member_access
        { $$ = { belongTo: $2 }; }
    | "<->" identifier_or_member_access
        { $$ = { bindTo: $2 }; }
    ;

has_stmt_blk
    : has_stmt_itm NEWLINE
        { $$ = { [$1[0]]: $1[1] }; }
    | has_stmt_itm NEWLINE has_stmt_blk
        { $$ = Object.assign({}, { [$1[0]]: $1[1] }, $3); }
    ;

key_stmt
    : "key" identifier NEWLINE
        { $$ = { key: $2 }; }
    ;

index_stmt_itm
    : identifier
        { $$ = { fields: { type: 'Array', value: $1 } }; }
    | identifier_or_str_array
        { $$ = { fields: $1 }; }
    | index_stmt_itm index_qualifiers
        { $$ = Object.assign({}, $1, $2); }
    ;

index_qualifiers
    : "is" "unique"
        { $$ = { unique: true }; }
    ;

index_stmt
    : "index" index_stmt_itm NEWLINE
        { $$ = { indexes: [$2] }; }
    | "index" NEWLINE INDENT index_stmt_blk DEDENT
        { $$ = { indexes: $4 }; }
    ;

index_stmt_blk
    : index_stmt_itm NEWLINE
        { $$ = [$1]; }
    | index_stmt_itm NEWLINE index_stmt_blk
        { $$ = [$1].concat($3); }
    ;

data_stmt
    : "data" inline_object NEWLINE
        { $$ = { data: $2 }; }
    | "data" inline_array NEWLINE
        { $$ = { data: $2 }; }
    ;

interface_stmt
    : "interface" NEWLINE INDENT interface_stmt_blk DEDENT
        { $$ = { interface: $4 }; }
    ;

interface_stmt_blk
    : interface_def
        { $$ = Object.assign({}, $1); }
    | interface_def interface_stmt_blk
        { $$ = Object.assign({}, $1, $2); }
    ;

interface_def
    : identifier NEWLINE INDENT interface_def_body DEDENT
        { $$ = { [$1]: $4 }; }
    ;

interface_def_body
    : accept_or_not implementation return_or_not
        { $$ = Object.assign({}, $1, { implementation: $2 }, $3); }
    ;

accept_or_not
    :
    | "accept" NEWLINE INDENT interface_accept_blk DEDENT
        { $$ = { accept: $4 }; }
    ;

interface_accept_blk
    : interface_accept_param NEWLINE
        { $$ = [ $1 ]; }
    | interface_accept_param NEWLINE interface_accept_blk
        { $$ = [ $1 ].concat($3); }
    ;

interface_accept_param
    : identifier variable_modifier_or_not
        { $$ = Object.assign({ type: 'Variable', name: $1 }, $2); }
    ;

implementation
    : operation
        { $$ = [ $1 ]; }
    | operation implementation
        { $$ = [ $1 ].concat($2); }
    ;

operation
    : populate_operation
    | update_operation
    | create_operation
    | delete_operation
    | coding_block
    | assign_operation
    ;

populate_operation
    : "populate" identifier "by" select_stm NEWLINE
        { $$ = Object.assign({ type: 'populate', output: $2}, $4 ); }
    ;

update_operation
    : "update" identifier_or_string "with" inline_object where_expr NEWLINE
        { $$ = { type: 'update', target: $2, data: $4, filter: $5 }; }
    ;

create_operation
    : "create" identifier_or_string "with" inline_object NEWLINE
        { $$ = { type: 'create', target: $2, data: $4 }; }
    ;

delete_operation
    : "delete" identifier_or_string where_expr NEWLINE
        { $$ = { type: 'delete', target: $2, filter: $3 }; }
    ;

coding_block
    : "do" "{" javascript "}" NEWLINE
        { $$ = { type: 'javascript', script: $3 }; }
    ;

assign_operation
    : "set" identifier_or_member_access "<-" value variable_modifier_or_not NEWLINE
        { $$ = { type: 'assignment', left: $2, right: Object.assign({ argument: $4 }, $5) }; }
    ;

select_stm
    : "select" column_range_list where_expr skip_or_not limit_or_not
        { $$ = Object.assign({ projection: $2, filter: $3 }, $4, $5); }
    ;

skip_or_not
    :
    | "skip" REFERENCE
        { $$ = { 'skip': $2 }; }
    | "skip" INTEGER
        { $$ = { 'skip': $2 }; }
    ;

limit_or_not
    :
    | "limit" REFERENCE
        { $$ = { 'limit': $2 }; }
    | "limit" INTEGER
        { $$ = { 'limit': $2 }; }
    ;

where_expr
    : "where" where_expr_condition
        { $$ = $2; }
    | "where" NEWLINE INDENT where_expr_condition_blk DEDENT
        { $$ = $4; }
    ;

where_expr_condition
    : conditional_expression
    | conditional_where_expr
    ;

where_expr_condition_blk
    : where_expr_condition NEWLINE
        { $$ = $1; }
    | where_expr_condition NEWLINE where_expr_condition_blk
        { $$ = [ $1 ].concat($3); }
    ;

conditional_where_expr
    : conditional_expression "->" conditional_expression
        { $$ = { type: 'ConditionalStatement', test: $1, then: $3 } }
    | conditional_expression "->" conditional_expression "otherwise" conditonal_expression
        { $$ = { type: 'ConditionalStatement', test: $1, then: $3, 'else': $4 } }
    ;

return_or_not
    :
    | "return" value NEWLINE
        { $$ = { 'return': { value: $2 } }; }
    | "return" value "unless" NEWLINE INDENT return_condition_blk DEDENT
        { $$ = { 'return': { value: $2, exceptions: $6 } }; }
    ;

return_condition_blk
    : conditional_expression "->" value NEWLINE
        { $$ = { type: 'ConditionalStatement', test: $1, then: $3 } }
    | conditional_expression "->" value NEWLINE return_condition_blk
        { $$ = [ { type: 'ConditionalStatement', test: $1, then: $3 } ].concat($5); }
    ;

relation_stmt
    : "relation" relation_stmt_itm NEWLINE
        { state.defRelation($2); }
    | "relation" NEWLINE INDENT relation_stmt_blk DEDENT
        { state.defRelation($4); }
    ;

relation_stmt_blk
    : relation_stmt_itm NEWLINE
        { $$ = [ $1 ]; }
    | relation_stmt_itm NEWLINE relation_stmt_blk
        { $$ = [ $1 ].concat($3); }
    ;

relation_stmt_itm
    : relation_stmt_itm1
    | relation_stmt_itm1 "to" related_entity
        {
            if ($1.right === $3.right) {
                throw new Error('Invalid relation declaration at line ' + @1.first_line + '.');
            }
            let right2 = { relationship: $1.relationship, size: $1.size };
            let right1Name = $3.right;
            delete $3.right;

            $$ = Object.assign({}, $1, { right: { [right1Name]: $3, [$1.right]: right2 }, type: 'chain' });
            delete $$.relationship;
            delete $$.size;
        }
    | relation_stmt_itm1 "for" "a" identifier_or_member_access
        {
            let right1Name2 = $1.left;
            let right2Name2 = $4;

            $$ = Object.assign({}, $1, { left: $1.right, right: [ right1Name2, right2Name2 ], type: 'multi' });
        }
    ;

relation_stmt_itm1
    : relation_stmt_itm0
    | relation_stmt_itm0 "of" "its" "own"
        { $$ = Object.assign({}, $1, { relationship: $1.relationship.replace('n:', '1:') }); }
    ;

related_entity
    : relation_qualifier identifier_or_member_access
        { $$ = Object.assign({}, $1, { right: $2 }); }
    ;

relation_stmt_itm0
    : "every" identifier_or_member_access "has" related_entity
        { $$ = Object.assign({ left: $2 }, $4); }
    | "a" identifier_or_member_access "may" "have" related_entity
        { $$ = Object.assign({ left: $2, optional: true }, $5); }
    ;

relation_qualifier
    : "one"
        { $$ = { relationship: 'n:1', size: 'one' }; }
    | "several"
        { $$ = { relationship: 'n:n', size: 'small' }; }
    | "many"
        { $$ = { relationship: 'n:n', size: 'medium' }; }
    | "a" "great" "number" "of"
        { $$ = { relationship: 'n:n', size: 'large' }; }
    ;

schema_stmt
    : "schema" identifier_or_string NEWLINE INDENT schema_stmt_blk DEDENT
        {
            if (state.isSchemaExist($2)) throw new Error('Duplicate schema definition detected at line ' + @1.first_line + '.');
            state.defSchema($2, $5);
        }
    ;

schema_stmt_itm
    : identifier_or_member_access
        { $$ = { entity: $1 }; }
    | schema_stmt_itm entity_qualifier
        { $$ = Object.assign({}, $1, $2); }
    ;

schema_stmt_blk
    : "entities" NEWLINE INDENT schema_entities_blk DEDENT
        { $$ = { entities: $4 }; }
    ;

schema_entities_blk
    : schema_stmt_itm NEWLINE
        { $$ = [ $1 ]; }
    | schema_stmt_itm NEWLINE schema_entities_blk
        { $$ = [ $1 ].concat($3); }
    ;

entity_qualifier
    : "as" identifier
        { $$ = { alias: $2 }; }
    ;

literal
    : INTEGER
    | FLOAT
    | BOOL
    | NULL
    | inline_object
    | inline_array
    | REGEXP
    | STRING
    ;

identifier
    : NAME
    | "exact" | "fixed" | "untrim" | "unsigned" | "only"
    | 'date' | 'time' | 'year' | 'timestamp'
    | "use"
    | "type"
    | "entity"
    | "schema"
    | "database"
    | "relation"
    | "default"
    | "auto"
    | "entities"
    | "data"
    | "with"
    | "has"
    | "have"
    | "key"
    | "index"
    | "as"
    | "unique"
    | "its"
    | "own"
    | "for"
    | "every"
    | "may" | "a" | "several" | "many" | "great" | "of" | "one" | "connect" | "deploy" | "to" | "url"
    | "optional" | "readOnly" | "writeOnceOnly"
    | "interface" | "accept" | "do" | "select" | "where" | "return" | "exists" | "otherwise" | "unless" | "populate" | "by"
    | "skip" | "limit" | "update" | "create" | "delete" | "set"
    | "encoding"
    ;

identifier_or_member_access
    : identifier
    | DOTNAME
    ;

variable
    : identifier_or_member_access
        { $$ = { type: 'Variable', name: $1 }; }
    | REFERENCE
    ;

function_call
    : identifier_or_member_access "(" ")"
        { $$ = { type: 'FunctionCall', name: $1 }; }
    | identifier_or_member_access "(" value_list ")"
        { $$ = { type: 'FunctionCall', name: $1, args: { type: 'Array', value: $3 } }; }
    ;

value
    : literal
    | number_value
    | variable
    | function_call
    ;

identifier_or_string
    : identifier
    | STRING
    ;

identifier_function
    : identifier_or_member_access
    | function_call
    ;

inline_object
    : "{" "}"
        { $$ = { type: 'Object', value: {} }; }
    | "{" kv_pairs "}"
        { $$ = { type: 'Object', value: $2 }; }
    ;

kv_pair_itm
    : identifier_or_string ":" value
        { $$ = {[$1]: $3}; }
    ;

kv_pairs
    : kv_pair_itm
    | kv_pair_itm kv_pairs0
        { $$ = Object.assign({}, $1, $2); }
    ;

kv_pairs0
    : "," kv_pair_itm
        { $$ = $2; }
    | "," kv_pair_itm kv_pairs0
        { $$ = Object.assign({}, $2, $3); }
    ;

inline_array
    : "[" "]"
        { $$ = { type: 'Array', value: [] }; }
    | "[" value_list "]"
        { $$ = { type: 'Array', value: $2 }; }
    ;

value_list
    : value
        { $$ = [ $1 ]; }
    | value value_list0
        { $$ = [ $1 ].concat( $2 ); }
    ;

value_list0
    : ',' value
        { $$ = [ $2 ]; }
    | ',' value value_list0
        { $$ = [ $2 ].concat($3); }
    ;

identifier_or_str_array
    : "[" identifier_or_str_list "]"
        { $$ = { type: 'Array', value: $2 }; }
    ;

identifier_or_str_list
    : identifier_or_string
        { $$ = [ $1 ]; }
    | identifier_or_string identifier_or_str_list0
        { $$ = [ $1 ].concat($2); }
    ;

identifier_or_str_list0
    : ',' identifier_or_string
        { $$ = [ $2 ]; }
    | ',' identifier_or_string identifier_or_str_list0
        { $$ = [ $2 ].concat( $3 ); }
    ;

identifier_function_array
    : "[" identifier_function_list "]"
        { $$ = { type: 'Array', value: $2 }; }
    ;

identifier_function_list
    : identifier_function
        { $$ = [ $1 ]; }
    | identifier_function identifier_function_list0
        { $$ = [ $1 ].concat($2); }
    ;

identifier_function_list0
    : ',' identifier_function
        { $$ = [ $2 ]; }
    | ',' identifier_function identifier_function_list0
        { $$ = [ $2 ].concat( $3 ); }
    ;

conditional_expression
    : logical_expression
    | simple_expression
    ;

simple_expression
    : unary_expression
    | binary_expression
    ;

unary_expression
    : value "exists"
        { $$ = { type: 'UnaryExpression', operator: 'exists', argument: $1 }; }
    | value "not" "exists"
        { $$ = { type: 'UnaryExpression', operator: 'not-exists', argument: $1 }; }
    | value "is" NULL
        { $$ = { type: 'UnaryExpression', operator: 'is-null', argument: $1 }; }
    | value "is" "not" NULL
        { $$ = { type: 'UnaryExpression', operator: 'is-not-null', argument: $1 }; }
    | not "(" binary_expression ")"
        { $$ = { type: 'UnaryExpression', operator: 'not', argument: $3, prefix: true }; }
    ;

binary_expression
    : value ">" value
        { $$ = { type: 'BinaryExpression', operator: '>', left: $1, right: $3 }; }
    | value "<" value
        { $$ = { type: 'BinaryExpression', operator: '<', left: $1, right: $3 }; }
    | value ">=" value
        { $$ = { type: 'BinaryExpression', operator: '>=', left: $1, right: $3 }; }
    | value "<=" value
        { $$ = { type: 'BinaryExpression', operator: '<=', left: $1, right: $3 }; }
    | value "=" value
        { $$ = { type: 'BinaryExpression', operator: '=', left: $1, right: $3 }; }
    | value "!=" value
        { $$ = { type: 'BinaryExpression', operator: '!=', left: $1, right: $3 }; }
    | value "in" value
        { $$ = { type: 'BinaryExpression', operator: 'in', left: $1, right: $3 }; }
    ;

logical_expression
    : simple_expression logical_expression_right
        { $$ = Object.assign({ left: $1 }, $2); }
    | "(" logical_expression ")" logical_expression_right
        { $$ = Object.assign({ left: $2 }, $4); }
    ;

logical_expression_right
    : logical_operators simple_expression
        { $$ = Object.assign({ type: 'BinaryExpression' }, $1, { right: $2 }); }
    | logical_operators "(" logical_expression ")"
        { $$ = Object.assign({ type: 'BinaryExpression' }, $1, { right: $3 }); }
    ;

logical_operators
    : "and"
        { $$ = { operator: 'and' }; }
    | "or"
        { $$ = { operator: 'or' }; }
    ;

column_range_list
    : COLUMNS
        { $$ = [ $1 ]; }
    | COLUMNS column_range_list0
        { $$ = [ $1 ].concat($2); }
    ;

column_range_list0
    : ',' COLUMNS
        { $$ = [ $2 ]; }
    | ',' COLUMNS column_range_list0
        { $$ = [ $2 ].concat( $3 ); }
    ;