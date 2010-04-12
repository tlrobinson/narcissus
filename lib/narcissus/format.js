
var DEFS = require("./defs");
var PARSE = require("./parse");

exports.DEPTH = 0;
exports.INDENTATION = "    ";

var format = exports.format = function(node) {
    exports.DEPTH++;
    try {
        if (!node || node.type === undefined)
            return "";

        var name = PARSE.tokenstr(node.type);

        var formatter = formatters[node.type];
        if (formatter) {
            return formatter(node);
        }
        else {
            print("warning: no formatter for " + name);
            return "";
        }
    } finally {
        exports.DEPTH--;
    }
}

var indent = exports.indent = function(str) {
    // don't indent the top level
    if (exports.DEPTH === 1)
        return str;
    return exports.INDENTATION + str.split("\n").join("\n" + exports.INDENTATION);
}

var mapNodes = exports.mapNodes = function(node, fn) {
    var result = [];
    for (var i = 0; node[i]; i++)
        result.push(fn(node[i]));
    return result;
}

var formatters = exports.formatters = {};

formatters[DEFS.BLOCK] = function(node) {
    return "{\n" + formatters[DEFS.SCRIPT](node) + "}";
}

formatters[DEFS.FUNCTION] = function(node) {
    return "function" + (node.name ? " " + node.name : "") +
        "("+node.params.join(", ")+") {\n" + format(node.body) + "}";
}

formatters[DEFS.SEMICOLON] = function(node) {
    return format(node.expression) + ";";
}

formatters[DEFS.VAR] = function(node) {
    return "var " + mapNodes(node, format).join(", ");
}

formatters[DEFS.CALL] = function(node) {
    return format(node[0]) + "(" + format(node[1]) + ")";
}

formatters[DEFS.NEW_WITH_ARGS] = function(node) {
    return "new " + formatters[DEFS.CALL](node);
}

formatters[DEFS.NEW] = function(node) {
    return "new " + format(node[0]);
}

formatters[DEFS.RETURN] = function(node) {
    return "return" + (node.value && node.value.type !== undefined ? " " + format(node.value) : "");
}

formatters[DEFS.IDENTIFIER] = function(node) {
    var initializer = format(node.initializer);
    return node.value + (initializer ? " = " + initializer : "");
}

formatters[DEFS.LIST] = function(node) {
    return mapNodes(node, format).join(", ");
}

formatters[DEFS.GROUP] = function(node) {
    return "(" + format(node[0]) + ")";
}

formatters[DEFS.DOT] = function(node) {
    return format(node[0]) + "." + format(node[1]);
}

formatters[DEFS.INDEX] = function(node) {
    return format(node[0]) + "[" + format(node[1]) + "]";
}

formatters[DEFS.ARRAY_INIT] = function(node) {
    return "[" + mapNodes(node, format).join(", ") + "]";
}

formatters[DEFS.OBJECT_INIT] = function(node) {
    return "{" + mapNodes(node, format).join(", ") + "}";
}

formatters[DEFS.PROPERTY_INIT] = function(node) {
    return format(node[0]) + " : " + format(node[1]);
}

formatters[DEFS.IF] = function(node) {
    return "if (" + format(node.condition) + ")\n" +
        (node.thenPart.type === DEFS.BLOCK ? format(node.thenPart) : indent(format(node.thenPart))) +
        (node.elsePart ? "\nelse" + (node.elsePart.type === DEFS.IF ? " " : "\n") +
        format(node.elsePart) : "");
}

formatters[DEFS.FOR] = function(node) {
    return node.value + " (" + format(node.setup) + "; " +
        format(node.condition) + "; " +
        format(node.update) + ")\n" +
        format(node.body);
}

formatters[DEFS.FOR_IN] = function(node) {
    return node.value + " (" + (node.varDecl ? "var " : "") + format(node.iterator) + " in " + format(node.object) + ")" +
        format(node.body);
}

formatters[DEFS.WHILE] = function(node) {
    return node.value + " (" + format(node.condition) + ")\n" + format(node.body);
}

formatters[DEFS.DO] = function(node) {
    return node.value + " " + format(node.body) + " while (" + format(node.condition) + ")";
}

formatters[DEFS.SWITCH] = function(node) {
    return node.value + " (" + format(node.discriminant) + ") {\n" +
        indent(mapNodes(node.cases, format).join("\n")) +
        "\n}";
}

formatters[DEFS.CASE] =
formatters[DEFS.DEFAULT] = function(node) {
    return node.value + " " + format(node.caseLabel) + ":\n" + indent(mapNodes(node.statements, format).join("\n"));
}

formatters[DEFS.BREAK] = function(node) {
    return node.value;
}

formatters[DEFS.TRY] = function(node) {
    return "try " + format(node.tryBlock) +
        mapNodes(node.catchClauses, format).join("") +
        (node.finallyBlock ? " finally " + format(node.finallyBlock) : "");
}

formatters[DEFS.CATCH] = function(node) {
    // TODO: warn of non-standard syntax
    var guard = node.guard ? " if " + format(node.guard) : "";
    return " catch(" + node.varName + guard + ") " + format(node.block);
}

formatters[DEFS.THROW] = function(node) {
    return node.value + " " + format(node.exception);
}

formatters[DEFS.LABEL] = function(node) {
    return node.label + " : " + format(node.statement);
}

formatters[DEFS.CONTINUE] = function(node) {
    return node.value + (node.label ? " " + node.label : "");
}

// special case of binary operator
formatters[DEFS.ASSIGN] = function(node) {
    return format(node[0]) + " " + (node.value === "=" ? "=" : node.value + "=") + " " + format(node[1]);
}

formatters[DEFS.INCREMENT] =
formatters[DEFS.DECREMENT] = function(node) {
    return node.postfix ? format(node[0]) +  node.value :  node.value + format(node[0]);
}

var unaryOps = ["DELETE", "VOID", "TYPEOF", "NOT", "BITWISE_NOT", "UNARY_PLUS", "UNARY_MINUS"];
var binaryOps = ["OR", "AND", "BITWISE_OR", "BITWISE_XOR", "BITWISE_AND", "EQ", "NE", "STRICT_EQ", "STRICT_NE", "LT", "LE", "GE", "GT", "IN", "INSTANCEOF", "LSH", "RSH", "URSH", "PLUS", "MINUS", "MUL", "DIV", "MOD"];

unaryOps.forEach(function(op) {
    formatters[DEFS[op]] = function(node) {
        return node.value + " " + format(node[0]);
    }
});

binaryOps.forEach(function(op) {
    formatters[DEFS[op]] = function(node) {
        return format(node[0]) + " " + node.value + " " + format(node[1]);
    }
});

formatters[DEFS.COMMA] = function(node) {
    format(node[0]) + " " + node.value + " " + format(node[1])
}

formatters[DEFS.HOOK] = function(node) {
    return format(node[0]) + " ? " + format(node[1]) + " : " + format(node[2]);
}

formatters[DEFS.REGEXP] = function(node) {
    return node.value;
}

formatters[DEFS.NUMBER] = function(node) {
    return JSON.stringify(node.value);
}

formatters[DEFS.STRING] = function(node) {
    return JSON.stringify(node.value);
}

formatters[DEFS.FALSE] = function(node) {
    return "false";
}

formatters[DEFS.TRUE] = function(node) {
    return "true";
}

formatters[DEFS.NULL] = function(node) {
    return "null";
}

formatters[DEFS.THIS] = function(node) {
    return "this";
}
