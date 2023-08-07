/**
 * @file Zig grammar for tree-sitter
 * @author Amaan Qureshi
 * @license MIT
 */

/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  PAREN_DECLARATOR: -10,
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  SIZEOF: 8,
  OFFSETOF: 9,
  SHIFT: 10,
  ADD: 11,
  MULTIPLY: 12,
  CAST: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
  MEMBER: 17,
  EXCEPTION: 17,
};

const builtin_types = [
  'bool',
  'f16',
  'f32',
  'f64',
  'f128',
  'void',
  'type',
  'anyerror',
  'anyframe',
  'anyopaque',
  'noreturn',
  'isize',
  'usize',
  'comptime_int',
  'comptime_float',
  'c_short',
  'c_ushort',
  'c_int',
  'c_uint',
  'c_long',
  'c_ulong',
  'c_longlong',
  'c_ulonglong',
  'c_longdouble',
  /(i|u)[0-9]+/,
];

module.exports = grammar({
  name: 'zig',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  supertypes: $ => [
    $.declaration,
    $.literal,
    $.statement,
  ],

  word: $ => $._identifier,

  rules: {
    source_code: $ => repeat($.declaration),

    declaration: $ => choice(
      $.variable_declaration,
      $.function_declaration,
      $.test_declaration,
    ),

    test_declaration: $ => seq(
      'test',
      optional(choice($.string, $.identifier)),
      $.block,
    ),

    block: $ => seq(
      '{',
      repeat($.statement),
      '}',
    ),

    variable_declaration: $ => seq(
      choice('const', 'var'),
      field('left', $.identifier),
      optional($.type_annotation),
      optional($.byte_alignment),
      optional($.address_space),
      optional($.link_section),
      optional(seq('=', field('right', $._expression))),
      ';',
    ),

    function_declaration: $ => seq(
      optional('pub'),
      'fn',
      optional($.identifier),
      $.parameters,
      optional($.byte_alignment),
      optional($.address_space),
      optional($.link_section),
      optional($.calling_convention),
      field('returns', $.type),
      $.block,
    ),

    parameters: $ => seq('(', commaSep(choice($.parameter, $.variadic_parameter)), ')'),
    parameter: $ => seq(
      optional(choice('noalias', 'comptime')),
      optional(seq($.identifier, ':')),
      $.type,
    ),
    variadic_parameter: _ => '...',

    type_annotation: $ => seq(
      ':',
      $.type,
    ),

    byte_alignment: $ => seq('align', '(', $._expression, ')'),

    address_space: $ => seq('addrspace', '(', $._expression, ')'),

    link_section: $ => seq('linksection', '(', $._expression, ')'),

    calling_convention: $ => seq('callconv', '(', $._expression, ')'),

    type: $ => choice(
      $.identifier,
      $.error_union_type,
      $.array_type,
      $.pointer_type,
      $.nullable_type,
    ),

    error_union_type: $ => seq(
      optional(field('error', $.identifier)),
      '!',
      field('ok', $.identifier),
    ),

    array_type: $ => seq(
      '[',
      field('size', $._expression),
      ']',
      $.type,
    ),

    pointer_type: $ => seq('*', optional('const'), $.type),

    nullable_type: $ => seq('?', $.type),

    statement: $ => prec(1, choice(
      $.variable_declaration,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.switch_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.expression_statement,
    )),

    if_statement: $ => prec.right(seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      optional(seq('|', $.identifier, '|')),
      choice($.block, $.statement),
      optional($.else_clause),
    )),

    else_clause: $ => seq(
      'else',
      optional(seq('|', $.identifier, '|')),
      choice($.block, $.statement),
    ),

    for_statement: $ => seq(
      'for',
      '(',
      field('collection', $._expression),
      optional(field('range', seq(',', $.number, '..'))),
      ')',
      '|',
      field('item', $._expression),
      optional(seq(',', field('index', $.identifier))),
      '|',
      choice($.block, $.statement),
    ),

    while_statement: $ => seq(
      'while',
      '(',
      field('condition', $._expression),
      ')',
      optional(seq(':', '(', $._expression, ')')),
      $.block,
    ),

    switch_statement: $ => seq(
      'switch',
      '(',
      $._expression,
      ')',
      '{',
      optionalCommaSep1($.switch_case),
      optional(seq($.else_case, optional(','))),
      '}',
    ),
    switch_case: $ => seq($._expression, '=>', choice($.block, $._expression)),
    else_case: $ => seq('else', '=>', choice($.block, $._expression)),

    return_statement: $ => seq('return', optional($._expression), ';'),

    break_statement: _ => seq('break', ';'),

    continue_statement: _ => seq('continue', ';'),

    expression_statement: $ => seq($._expression, ';'),

    _expression: $ => choice(
      $.assignment_expression,
      $.unary_expression,
      $.binary_expression,
      $.if_expression,
      $.try_expression,
      $.catch_expression,
      $.defer_expression,
      $.errdefer_expression,
      $.call_expression,
      $.field_expression,
      $.enum_member_expression,
      $.index_expression,
      $.dereference_expression,
      $.null_coercion_expression,
      $.switch_statement,
      $.literal,
    ),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      field('left', $._expression),
      field('operator', choice(
        '=',
        '*=',
        '/=',
        '%=',
        '+=',
        '-=',
        '<<=',
        '>>=',
        '&=',
        '^=',
        '|=',
      )),
      field('right', $._expression),
    )),

    unary_expression: $ => prec.left(PREC.UNARY, seq(
      field('operator', choice('!', '~', '-', '-%', '&')),
      field('argument', $._expression),
    )),

    binary_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['++', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['**', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['^', PREC.EXCLUSIVE_OR],
        ['&', PREC.BITWISE_AND],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
        ['and', PREC.LOGICAL_AND],
        ['or', PREC.LOGICAL_OR],
        ['orelse', PREC.BITWISE_AND],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $._expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $._expression),
        ));
      }));
    },

    if_expression: $ => prec(PREC.CONDITIONAL, seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      $._expression,
      'else',
      $._expression,
    )),

    try_expression: $ => prec.right(PREC.EXCEPTION, seq('try', $._expression)),

    catch_expression: $ => prec.right(PREC.EXCEPTION, seq(
      $._expression,
      'catch',
      choice($._expression, seq('|', $.identifier, '|', $.block)),
    )),

    defer_expression: $ => seq('defer', $._expression),

    errdefer_expression: $ => seq('errdefer', $._expression),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $._expression),
      '(',
      optionalCommaSep($._expression),
      ')',
    )),

    field_expression: $ => prec(PREC.MEMBER, seq(
      field('object', $._expression),
      '.',
      field('member', $.identifier),
    )),

    enum_member_expression: $ => prec(PREC.MEMBER, seq('.', $.identifier)),

    index_expression: $ => prec(PREC.MEMBER, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),

    dereference_expression: $ => prec(PREC.UNARY, seq($._expression, '.*')),

    null_coercion_expression: $ => prec(PREC.UNARY, seq($._expression, '.?')),

    literal: $ => choice(
      $.anonymous_struct,
      $.struct,
      $.struct_literal,
      $.error_union,
      $.enum,
      $.array,
      $.identifier,
      $.builtin_identifier,
      $.multiline_string,
      $.string,
      $.character,
      $.number,
      $.boolean,
      $.float,
      $.unreachable,
    ),

    anonymous_struct: $ => seq(
      '.',
      '{',
      optionalCommaSep($._expression),
      '}',
    ),

    struct: $ => seq(
      'struct',
      '{',
      // optionalCommaSep1($.struct_field),
      // repeat($.function_declaration),
      repeat(choice($.struct_field, $.function_declaration)),
      '}',
    ),
    struct_field: $ => seq($.identifier, ':', $.type, optional(seq('=', $._expression)), ','),

    struct_literal: $ => seq(
      $.identifier,
      '{',
      optionalCommaSep1($.struct_literal_field),
      '}',
    ),
    struct_literal_field: $ => seq('.', $.identifier, '=', $._expression),

    error_union: $ => seq(
      'error',
      '{',
      optionalCommaSep1($.identifier),
      '}',
    ),

    enum: $ => seq(
      'enum',
      optional(seq('(', field('underlying_type', $.builtin_type), ')')),
      '{',
      optionalCommaSep1($.enum_member),
      '}',
    ),
    enum_member: $ => seq(
      $.identifier,
      optional(seq('=', $.literal)),
    ),

    array: $ => seq(
      '[',
      field('size', $._expression),
      ']',
      $.type,
      '{',
      commaSep($._expression),
      '}',
    ),

    multiline_string: _ => repeat1(token(seq('\\\\', /[^\n]*/))),

    string: $ => seq(
      '"',
      repeat(choice(
        alias(token.immediate(prec(1, /[^\\"\n]+/)), $.string_content),
        $.escape_sequence,
      )),
      '"',
    ),

    escape_sequence: _ => token(prec(1, seq(
      '\\',
      choice(
        /[^xuU]/,
        /\d{2,3}/,
        /x[0-9a-fA-F]{2,}/,
        /u[0-9a-fA-F]{4}/,
        /U[0-9a-fA-F]{8}/,
      ),
    ))),

    character: $ => seq('\'', choice(/[^\n]/, $.escape_sequence), '\''),

    number: _ => {
      const separator = '_';
      const hex = /[0-9A-Fa-f]/;
      const oct = /[0-7]/;
      const bin = /[0-1]/;
      const decimal = /[0-9]/;
      const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
      const octDigits = seq(repeat1(oct), repeat(seq(separator, repeat1(oct))));
      const binDigits = seq(repeat1(bin), repeat(seq(separator, repeat1(bin))));
      const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));

      return token(choice(
        seq('0x', hexDigits),
        seq('0o', octDigits),
        seq('0b', binDigits),
        decimalDigits,
      ));
    },

    float: _ => {
      const separator = '_';
      const hex = /[0-9A-Fa-f]/;
      const decimal = /[0-9]/;
      const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
      const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));

      return token(choice(
        seq('0x', hexDigits, '.', hexDigits, optional(seq(/[pP][+-]?/, decimalDigits))),
        seq(decimalDigits, '.', decimalDigits, optional(seq(/[eE][+-]?/, decimalDigits))),
        seq('0x', hexDigits, /[pP][+-]?/, decimalDigits),
        seq(decimalDigits, /[eE][+-]?/, decimalDigits),
      ));
    },

    boolean: _ => choice('true', 'false'),

    unreachable: _ => 'unreachable',

    builtin_type: _ => choice(...builtin_types),

    builtin_identifier: _ => /@[A-Za-z_][A-Za-z0-9_]*/,

    identifier: $ => choice($._identifier, seq('@', alias($.string, $._string))),
    _identifier: _ => token(choice(/[A-Za-z_][A-Za-z0-9_]*/)),

    comment: _ => token(seq('//', /(\\+(.|\r?\n)|[^\\\n])*/)),
  },
});

/**
 * Creates a rule to match optionally match one or more of the rules
 * separated by a comma and optionally ending with a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {ChoiceRule}
 *
 */
function optionalCommaSep(rule) {
  return optional(optionalCommaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * and optionally ending with a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function optionalCommaSep1(rule) {
  return seq(commaSep1(rule), optional(','));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
